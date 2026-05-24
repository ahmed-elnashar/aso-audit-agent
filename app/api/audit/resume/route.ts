import { NextResponse } from 'next/server';
import { mastra } from '../../../../src/mastra';
import { asoAuditWorkflow } from '../../../../src/mastra/workflows/aso-audit-workflow';

// Touch mastra so storage/workflows are attached before we resume the run.
void mastra;

export async function POST(req: Request) {
  let body: { runId?: unknown; approved?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }
  if (typeof body.runId !== 'string' || typeof body.approved !== 'boolean') {
    return NextResponse.json({ error: 'runId (string) and approved (boolean) required' }, { status: 400 });
  }

  try {
    const run = await asoAuditWorkflow.createRun({ runId: body.runId });
    const result = await run.resume({
      step: 'confirm-and-audit',
      resumeData: { approved: body.approved },
    });
    if (result.status !== 'success') {
      return NextResponse.json(
        { error: `workflow status ${result.status}` },
        { status: 500 }
      );
    }
    const out = result.result as { status: 'completed' | 'cancelled'; report: unknown };
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 }
    );
  }
}
