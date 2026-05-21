import { google } from 'googleapis';
import { WebClient } from '@slack/web-api';
import { Client as NotionClient } from '@notionhq/client';
import { supabase } from './db';
import { extractSkillsFromSources } from './groq';

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
const EXTRACTION_BATCH_SIZE = 8;
const GOOGLE_DOC_MIME_TYPE = 'application/vnd.google-apps.document';
const GOOGLE_SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
const GOOGLE_SLIDES_MIME_TYPE = 'application/vnd.google-apps.presentation';
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'text/html',
  'application/json',
  'application/xml',
  'text/xml',
]);
const EXPORTABLE_TEXT_MIME_TYPES = new Set([
  GOOGLE_DOC_MIME_TYPE,
  GOOGLE_SHEET_MIME_TYPE,
  GOOGLE_SLIDES_MIME_TYPE,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

type IngestedSource = {
  title: string;
  content: string;
  url?: string;
};

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function isDriveTextCandidate(file: { name?: string | null; mimeType?: string | null }) {
  const mimeType = file.mimeType || '';
  const name = (file.name || '').toLowerCase();

  return (
    EXPORTABLE_TEXT_MIME_TYPES.has(mimeType) ||
    TEXT_MIME_TYPES.has(mimeType) ||
    /\.(txt|md|csv|tsv|json|html|xml|doc|docx|ppt|pptx|xls|xlsx)$/i.test(name)
  );
}

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
      const ingestedSources: IngestedSource[] = [];

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
            const title = `Email Thread: ${subject}`;
            const sourceUrl = `https://mail.google.com/mail/u/0/#all/${t.id}`;
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'gmail',
              external_id: t.id,
              title,
              content: body,
            });

            if (!insertErr) {
              ingestedSources.push({ title, content: body, url: sourceUrl });
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
              let history;
              try {
                await slackClient.conversations.join({ channel: channel.id });
              } catch (joinErr) {
                // Some channels cannot be joined by the bot; try reading anyway.
              }

              try {
                history = await slackClient.conversations.history({
                  channel: channel.id,
                  limit: 100,
                });
              } catch (historyErr: any) {
                logStatus(orgId, `Slack: Skipping #${channel.name || channel.id} (${historyErr.data?.error || historyErr.message || 'could not read channel'}).`);
                continue;
              }
              
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

            const title = `Slack Message (${channelName})`;
            const sourceUrl = match.channel?.id && extId
              ? `https://slack.com/app_redirect?channel=${match.channel.id}&message_ts=${extId}`
              : undefined;
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'slack',
              external_id: extId,
              title,
              content: content,
            });

            if (!insertErr) {
              ingestedSources.push({ title, content, url: sourceUrl });
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
            q: 'trashed = false',
            pageSize: 50,
            fields: 'files(id, name, mimeType, webViewLink)',
            orderBy: 'modifiedTime desc',
          });

          const files = (fileList.data.files || []).filter(isDriveTextCandidate);
          const googleDocCount = files.filter(file => file.mimeType === GOOGLE_DOC_MIME_TYPE).length;
          const otherDocCount = files.length - googleDocCount;
          logStatus(orgId, `Drive: Found ${googleDocCount} Google Docs and ${otherDocCount} other readable files to scan.`);

          for (const file of files) {
            if (!file.id || !file.name) continue;

            let content = '';
            let title = '';
            let sourceUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;

            try {
              if (file.mimeType === GOOGLE_DOC_MIME_TYPE) {
                const docRes = await drive.files.export({
                  fileId: file.id,
                  mimeType: 'text/plain',
                });

                content = docRes.data as string;
                title = `Google Doc: ${file.name}`;
                sourceUrl = file.webViewLink || `https://docs.google.com/document/d/${file.id}/edit`;
              } else if (EXPORTABLE_TEXT_MIME_TYPES.has(file.mimeType || '')) {
                const exportRes = await drive.files.export({
                  fileId: file.id,
                  mimeType: 'text/plain',
                });
                content = exportRes.data as string;
                title = `Drive File: ${file.name}`;
              } else if (TEXT_MIME_TYPES.has(file.mimeType || '') || /\.(txt|md|csv|tsv|json|html|xml)$/i.test(file.name || '')) {
                const textRes = await drive.files.get(
                  { fileId: file.id, alt: 'media' },
                  { responseType: 'text' }
                );
                content = String(textRes.data);
                title = `Drive File: ${file.name}`;
              } else {
                logStatus(orgId, `Drive: Skipping ${file.name} because this file type cannot be converted to text yet.`);
                continue;
              }
            } catch (fileErr: any) {
              logStatus(orgId, `Drive: Could not read ${file.name}: ${fileErr.message || fileErr}`);
              continue;
            }

            if (!content || content.trim().length < 20) {
              logStatus(orgId, `Drive: Skipping ${file.name} because no readable text was found.`);
              continue;
            }
            
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'gdrive',
              external_id: file.id,
              title,
              content: content,
            });

            if (!insertErr) {
              ingestedSources.push({ title, content, url: sourceUrl });
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

            const title = `Notion Page: ${pageTitle}`;
            const sourceUrl = pageData.url;
            const content = textBlocks || `Empty content properties. Ref: ${(page as any).url || page.id}`;
            const { error: insertErr } = await supabase.from('brain_sources').insert({
              org_id: orgId,
              employee_id: empId,
              source_type: 'notion',
              external_id: page.id,
              title,
              content,
            });

            if (!insertErr) {
              ingestedSources.push({ title, content, url: sourceUrl });
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
      if (ingestedSources.length > 0) {
        const sourceBatches = chunkArray(ingestedSources, EXTRACTION_BATCH_SIZE);
        logStatus(orgId, `Calling Groq API (llama-3.3-70b-versatile) in ${sourceBatches.length} batches to extract skills from ${empName}'s communications...`);

        let employeeSkillsExtractedCount = 0;

        for (let batchIndex = 0; batchIndex < sourceBatches.length; batchIndex++) {
          logStatus(orgId, `Groq extraction batch ${batchIndex + 1}/${sourceBatches.length} for ${empName}...`);
          const sourceBatch = sourceBatches[batchIndex];
          const skillsList = await extractSkillsFromSources(sourceBatch);
          
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
                sources: sourceBatch.map((source) => ({
                  title: source.title,
                  url: source.url,
                })),
              },
              confidence: parseFloat((1 / sweep.totalEmployees).toFixed(2)),
              verified_by_human: false,
            });

            if (!insertSkillErr) {
              employeeSkillsExtractedCount++;
              sweep.rawSkillsExtracted++;
              activeSweeps.set(orgId, { ...sweep });
            } else {
              logStatus(orgId, `Could not save skill "${s.skill_name}": ${insertSkillErr.message}`);
            }
          }
        }

        if (employeeSkillsExtractedCount === 0 && ingestedSources.length > 0) {
          const fallbackCandidates = ingestedSources.filter(source => {
            const text = `${source.title}\n${source.content}`.toLowerCase();
            const isRejected = /study guide|syllabus|exam|crash course|career|job-ready|internships?|newsletter|altman|musk|openai|anthropic|mathematics|calculus|linear algebra|probability/.test(text);
            const isWorkflow = /faq|tasks? in detail|process|steps?|requirements?|must submit|how to|support|approval|policy|form|certificate|screenshot|participants?|presentation|proposal|problem statement/.test(text);
            return isWorkflow && !isRejected;
          });
          const strongestSource = [...fallbackCandidates].sort((a, b) => b.content.length - a.content.length)[0];
          const fallbackSteps = strongestSource?.content
            .split(/\r?\n/)
            .map(line => line.trim())
            .map(line => line.replace(/^(\d+[\).\s]|[-*•]\s*)/i, '').trim())
            .filter(line => line.length >= 20 && line.length <= 220)
            .filter(line => !/^(no|your task|requirements?|important points to remember|definition of|fundamentals and classification)\b/i.test(line))
            .slice(0, 5);

          if (strongestSource && fallbackSteps.length >= 2) {
            const { error: fallbackErr } = await supabase.from('brain_skills').insert({
              org_id: orgId,
              skill_name: `review_${strongestSource.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 45) || 'scanned_workflow'}`,
              trigger: `Review the process described in ${strongestSource.title}`,
              steps: fallbackSteps,
              source_employees: {
                employee_ids: [empId],
                frequency: 1,
                sources: [{
                  title: strongestSource.title,
                  url: strongestSource.url,
                }],
              },
              confidence: parseFloat((1 / sweep.totalEmployees).toFixed(2)),
              verified_by_human: false,
            });

            if (fallbackErr) {
              logStatus(orgId, `No workflows were saved from ${ingestedSources.length} scanned sources. Fallback save also failed: ${fallbackErr.message}`);
            } else {
              employeeSkillsExtractedCount++;
              sweep.rawSkillsExtracted++;
              activeSweeps.set(orgId, { ...sweep });
              logStatus(orgId, `Saved 1 review-ready fallback skill so the scan has a visible result.`);
            }
          } else {
            logStatus(orgId, `No workflows were saved from ${ingestedSources.length} scanned sources because the scanned text did not contain enough usable step-by-step content.`);
          }
        }
        
        logStatus(orgId, `Extracted ${employeeSkillsExtractedCount} raw skills for ${empName}.`);

        const { count: storedSkillCount, error: countErr } = await supabase
          .from('brain_skills')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId);

        if (countErr) {
          logStatus(orgId, `Warning: Could not verify stored skill count: ${countErr.message}`);
        } else {
          logStatus(orgId, `Verified ${storedSkillCount || 0} skills currently stored in Supabase for this org.`);
        }
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
