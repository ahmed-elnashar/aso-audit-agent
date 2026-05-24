import { NextResponse } from 'next/server';
import { mastra } from '../../../../src/mastra';
import { asoAuditWorkflow } from '../../../../src/mastra/workflows/aso-audit-workflow';
import { subscribeProgress, type ProgressEvent } from '../../../../src/mastra/progress-emitter';

// Touch mastra so storage/workflows are attached before we resume the run.
void mastra;

type ServerEvent =
  | { type: 'progress'; stage: ProgressEvent['stage']; detail?: string }
  | { type: 'completed'; report: unknown }
  | { type: 'cancelled' }
  | { type: 'error'; message: string };

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
  const runId = body.runId;
  const approved = body.approved;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (event: ServerEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const unsubscribe = subscribeProgress(runId, (e) => {
        push({ type: 'progress', stage: e.stage, detail: e.detail });
      });

      try {
        const run = await asoAuditWorkflow.createRun({ runId });
        const result = await run.resume({
          step: 'confirm-and-audit',
          resumeData: { approved },
        });
        if (result.status !== 'success') {
          push({ type: 'error', message: `workflow status ${result.status}` });
        } else {
          const out = result.result as { status: 'completed' | 'cancelled'; report: unknown };
          if (out.status === 'cancelled') {
            push({ type: 'cancelled' });
          } else {
            push({ type: 'completed', report: out.report });
          }
        }
      } catch (err) {
        push({ type: 'error', message: err instanceof Error ? err.message : 'unknown error' });
      } finally {
        unsubscribe();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
