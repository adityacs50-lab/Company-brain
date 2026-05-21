import { google } from 'googleapis';
import { WebClient } from '@slack/web-api';
import { Client as NotionClient } from '@notionhq/client';
import { supabase } from './db';
import { extractSkillsFromText, ExtractedSkill } from './groq';

// Global, in-memory sweep status state to support dashboard polling
export interface SweepStatus {
  orgId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalEmployees: number;
  employeesProcessed: number;
  emailsProcessed: number;
  slackMessagesAnalyzed: number;
  driveFilesParsed: number;
  notionPagesScanned: number;
  rawSkillsExtracted: number;
  duplicatesFound: number;
  logs: string[];
  startedAt: string;
  completedAt?: string;
}

export const activeSweeps = new Map<string, SweepStatus>();

const searchKeywords = "refund OR policy OR approval OR exception OR decision OR rule OR process OR escalat*";

/**
 * Gets or initializes the oauth client for Google Gmail & Drive
 */
function getGoogleAuth(tokenString: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  try {
    const tokens = JSON.parse(tokenString);
    oauth2Client.setCredentials(tokens);
  } catch (e) {
    // If it's a raw refresh token string
    oauth2Client.setCredentials({ refresh_token: tokenString });
  }

  return oauth2Client;
}

/**
 * Helper to log sweep messages and keep active status updated
 */
function logStatus(orgId: string, message: string) {
  const current = activeSweeps.get(orgId);
  const timestamp = new Date().toLocaleTimeString();
  const logLine = `[${timestamp}] ${message}`;
  console.log(`[Sweep ${orgId}] ${logLine}`);
  if (current) {
    current.logs.push(logLine);
    activeSweeps.set(orgId, { ...current });
  }
}

/**
 * Orchestrates a complete live org sweep
 */
export async function runOrgSweep(orgId: string, employeeIdsToInclude: string[]) {
  const sweep: SweepStatus = {
    orgId,
    status: 'running',
    totalEmployees: employeeIdsToInclude.length,
    employeesProcessed: 0,
    emailsProcessed: 0,
    slackMessagesAnalyzed: 0,
    driveFilesParsed: 0,
    notionPagesScanned: 0,
    rawSkillsExtracted: 0,
    duplicatesFound: 0,
    logs: [],
    startedAt: new Date().toISOString(),
  };
  activeSweeps.set(orgId, sweep);

  logStatus(orgId, `Starting Org-Wide sweep. Target employees: ${employeeIdsToInclude.length}`);

  try {
    // 1. Load targeted employees from Supabase
    const { data: employees, error: fetchError } = await supabase
      .from('brain_employees')
      .select('*')
      .in('employee_id', employeeIdsToInclude);

    if (fetchError || !employees || employees.length === 0) {
      throw new Error(`Failed to load target employees from Supabase: ${fetchError?.message || 'No records'}`);
    }

    logStatus(orgId, `Successfully fetched ${employees.length} employee records from Supabase.`);

    // 2. Loop through each employee and sweep their data sources
    for (const employee of employees) {
      const empId = employee.employee_id;
      const empName = employee.name || employee.email || empId;
      logStatus(orgId, `>>> Starting Ingestion for employee: ${empName} (${employee.department || 'No Dept'})`);

      let parsedSourcesCount = 0;

      // --- A. GMAIL SWEEP ---
      if (employee.gmail_token) {
        logStatus(orgId, `Connecting to Gmail API for ${empName}...`);
        try {
          const auth = getGoogleAuth(employee.gmail_token);
          const gmail = google.gmail({ version: 'v1', auth });

          const threadRes = await gmail.users.threads.list({
            userId: 'me',
            q: searchKeywords,
            maxResults: 50,
          });

          const threads = threadRes.data.threads || [];
          logStatus(orgId, `Gmail: Found ${threads.length} threads matching operational keywords.`);

          for (const t of threads) {
            if (!t.id) continue;
            const threadData = await gmail.users.threads.get({ userId: 'me', id: t.id });
            const messages = threadData.data.messages || [];
            
            if (messages.length === 0) continue;
            
            // Extract snippet, subject and headers to build document content
            const subject = messages[0].payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
            const body = messages.map(m => m.snippet || '').join('\n---\n');

            // Save to raw sources database
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'gmail',
              external_id: t.id,
              title: `Email Thread: ${subject}`,
              content: body,
            });

            if (!insertErr) {
              parsedSourcesCount++;
              sweep.emailsProcessed++;
              activeSweeps.set(orgId, { ...sweep });
            }
          }
          logStatus(orgId, `Gmail integration completed for ${empName}.`);
        } catch (err: any) {
          logStatus(orgId, `Gmail Error for ${empName}: ${err.message || err}`);
        }
      }

      // --- B. SLACK SWEEP ---
      if (employee.slack_token) {
        logStatus(orgId, `Connecting to Slack API for ${empName}...`);
        try {
          const slackClient = new WebClient(employee.slack_token);
          logStatus(orgId, `Slack: Searching channel logs for operational keywords...`);

          // Attempt search API first (requires search:read scope)
          let matches: any[] = [];
          try {
            const searchRes = await slackClient.search.messages({
              query: searchKeywords,
              count: 50,
            });
            matches = searchRes.messages?.matches || [];
            logStatus(orgId, `Slack: Search API retrieved ${matches.length} matching messages.`);
          } catch (searchErr) {
            logStatus(orgId, `Slack Search API not available (scope missing). Falling back to channel histories...`);
            // Fallback: list public channels and fetch history
            const channelsRes = await slackClient.conversations.list({ exclude_archived: true, types: 'public_channel' });
            const channels = channelsRes.channels || [];
            
            // Loop through top channels
            for (const channel of channels.slice(0, 5)) { // limit channels to prevent timeouts
              if (!channel.id) continue;
              const history = await slackClient.conversations.history({
                channel: channel.id,
                limit: 100,
              });
              
              const messages = history.messages || [];
              const keywordRegex = /refund|policy|approval|exception|decision|rule|process|escalat/i;
              
              for (const msg of messages) {
                if (msg.text && keywordRegex.test(msg.text)) {
                  matches.push({
                    text: msg.text,
                    iid: msg.ts,
                    channel: { id: channel.id, name: channel.name },
                    username: msg.username || msg.user || 'Unknown User',
                  });
                }
              }
            }
          }

          for (const match of matches) {
            const content = match.text || '';
            const extId = match.iid || match.ts || Math.random().toString();
            const channelName = match.channel?.name ? `#${match.channel.name}` : 'Slack Thread';

            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'slack',
              external_id: extId,
              title: `Slack Message (${channelName})`,
              content: content,
            });

            if (!insertErr) {
              parsedSourcesCount++;
              sweep.slackMessagesAnalyzed++;
              activeSweeps.set(orgId, { ...sweep });
            }
          }
          logStatus(orgId, `Slack integration completed for ${empName}.`);
        } catch (err: any) {
          logStatus(orgId, `Slack Error for ${empName}: ${err.message || err}`);
        }
      }

      // --- C. GOOGLE DRIVE SWEEP ---
      if (employee.gmail_token) { // Using same Google OAuth credentials
        logStatus(orgId, `Connecting to Google Drive API for ${empName}...`);
        try {
          const auth = getGoogleAuth(employee.gmail_token);
          const drive = google.drive({ version: 'v3', auth });

          const fileList = await drive.files.list({
            q: "mimeType = 'application/vnd.google-apps.document'",
            pageSize: 10,
            fields: 'files(id, name)',
          });

          const files = fileList.data.files || [];
          logStatus(orgId, `Drive: Found ${files.length} Google Documents to scan.`);

          for (const file of files) {
            if (!file.id || !file.name) continue;
            
            // Export document content as plain text
            const docRes = await drive.files.export({
              fileId: file.id,
              mimeType: 'text/plain',
            });

            const content = docRes.data as string;
            
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'gdrive',
              external_id: file.id,
              title: `Google Doc: ${file.name}`,
              content: content,
            });

            if (!insertErr) {
              parsedSourcesCount++;
              sweep.driveFilesParsed++;
              activeSweeps.set(orgId, { ...sweep });
            }
          }
          logStatus(orgId, `Google Drive integration completed for ${empName}.`);
        } catch (err: any) {
          logStatus(orgId, `Google Drive Error for ${empName}: ${err.message || err}`);
        }
      }

      // --- D. NOTION SWEEP ---
      if (employee.notion_token) {
        logStatus(orgId, `Connecting to Notion API for ${empName}...`);
        try {
          const notion = new NotionClient({ auth: employee.notion_token });
          logStatus(orgId, `Notion: Querying workspace block content for keywords...`);

          const searchRes = await notion.search({
            query: 'refund OR policy OR approval OR exception OR decision',
            page_size: 15,
          });

          const pages = searchRes.results || [];
          logStatus(orgId, `Notion: Retrieved ${pages.length} matched database pages.`);

          for (const page of pages) {
            if (page.object !== 'page') continue;
            
            // Retrieve page details and properties
            let pageTitle = 'Untitled Notion Page';
            const pageData = page as any;
            
            if (pageData.properties) {
              // Notion title extraction based on standard structures
              const titleProp = Object.values(pageData.properties).find((p: any) => p.type === 'title') as any;
              if (titleProp?.title?.[0]?.plain_text) {
                pageTitle = titleProp.title[0].plain_text;
              }
            }

            // Read child block content
            const blocks = await notion.blocks.children.list({
              block_id: page.id,
            });

            const textBlocks = blocks.results
              .map((b: any) => {
                const type = b.type;
                if (b[type]?.rich_text) {
                  return b[type].rich_text.map((t: any) => t.plain_text).join('');
                }
                return '';
              })
              .filter(Boolean)
              .join('\n');

            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'notion',
              external_id: page.id,
              title: `Notion Page: ${pageTitle}`,
              content: textBlocks || `Empty content properties. Ref: ${(page as any).url || page.id}`,
            });

            if (!insertErr) {
              parsedSourcesCount++;
              sweep.notionPagesScanned++;
              activeSweeps.set(orgId, { ...sweep });
            }
          }
          logStatus(orgId, `Notion integration completed for ${empName}.`);
        } catch (err: any) {
          logStatus(orgId, `Notion Error for ${empName}: ${err.message || err}`);
        }
      }

      logStatus(orgId, `Ingested ${parsedSourcesCount} raw communications sources for ${empName}.`);

      // 3. Extract skills from the sources just saved for this employee
      if (parsedSourcesCount > 0) {
        logStatus(orgId, `Calling Groq API (llama-3.3-70b-versatile) to extract skills from ${empName}'s communications...`);
        
        const { data: sources, error: sourceErr } = await supabase
          .from('brain_sources')
          .select('*')
          .eq('employee_id', empId)
          .eq('org_id', orgId);

        if (sourceErr || !sources) {
          logStatus(orgId, `Error loading sources for extraction: ${sourceErr?.message}`);
          continue;
        }

        let employeeSkillsExtractedCount = 0;

        for (const src of sources) {
          const skillsList = await extractSkillsFromText(src.content);
          
          for (const s of skillsList) {
            // Save skills directly to the brain_skills table
            const { error: insertSkillErr } = await supabase.from('brain_skills').insert({
              org_id: orgId,
              skill_name: s.skill_name,
              trigger: s.trigger,
              steps: s.steps,
              source_employees: {
                employee_ids: [empId],
                frequency: 1,
              },
              confidence: parseFloat((1 / sweep.totalEmployees).toFixed(2)),
              verified_by_human: false,
            });

            if (!insertSkillErr) {
              employeeSkillsExtractedCount++;
              sweep.rawSkillsExtracted++;
              activeSweeps.set(orgId, { ...sweep });
            }
          }
        }
        
        logStatus(orgId, `Extracted ${employeeSkillsExtractedCount} raw skills for ${empName}.`);
      }

      sweep.employeesProcessed++;
      activeSweeps.set(orgId, { ...sweep });
    }

    logStatus(orgId, `Knowledge sweep fully completed! Processed: ${sweep.employeesProcessed}/${sweep.totalEmployees} employees.`);
    logStatus(orgId, `Totals - Emails: ${sweep.emailsProcessed}, Slack: ${sweep.slackMessagesAnalyzed}, Docs: ${sweep.driveFilesParsed}, Notion: ${sweep.notionPagesScanned}.`);
    logStatus(orgId, `Extracted ${sweep.rawSkillsExtracted} raw procedural skills total. Ready for Admin Deduplication.`);

    sweep.status = 'completed';
    sweep.completedAt = new Date().toISOString();
    activeSweeps.set(orgId, { ...sweep });
  } catch (err: any) {
    logStatus(orgId, `SWEEP CRITICAL FAILURE: ${err.message || err}`);
    sweep.status = 'failed';
    sweep.completedAt = new Date().toISOString();
    activeSweeps.set(orgId, { ...sweep });
  }
}
