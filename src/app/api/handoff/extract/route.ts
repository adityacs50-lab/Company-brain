import { NextResponse } from 'next/server';
import { extractHandoffBriefFromSources } from '@/lib/groq';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customer,
      dealValue,
      ae,
      csm,
      sourceTitle,
      sourceText,
      sources,
    } = body || {};

    const normalizedSources = Array.isArray(sources)
      ? sources
          .map((source) => ({
            title: String(source?.title || 'Pasted source'),
            content: String(source?.content || ''),
          }))
          .filter((source) => source.content.trim().length >= 20)
      : [{
          title: String(sourceTitle || 'Pasted sales context'),
          content: String(sourceText || ''),
        }].filter((source) => source.content.trim().length >= 20);

    if (normalizedSources.length === 0) {
      return NextResponse.json(
        { error: 'Paste at least 20 characters of sales context or provide sources.' },
        { status: 400 }
      );
    }

    const brief = await extractHandoffBriefFromSources(normalizedSources, {
      customer: String(customer || ''),
      dealValue: String(dealValue || ''),
      ae: String(ae || ''),
      csm: String(csm || ''),
    });

    return NextResponse.json({
      success: true,
      brief,
      sourceCount: normalizedSources.length,
    });
  } catch (error: any) {
    console.error('Handoff extraction failed:', error);
    return NextResponse.json(
      { error: error.message || 'Could not generate handoff brief.' },
      { status: 500 }
    );
  }
}
