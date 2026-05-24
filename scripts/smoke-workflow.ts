/**
 * End-to-end test of the Mastra workflow: identify candidate, suspend, resume
 * with approved=true, verify the audit report comes back with sensible shape.
 *
 * Run with: npx tsx scripts/smoke-workflow.ts [appStoreUrl]
 */
import { mastra } from '../src/mastra';
import { asoAuditWorkflow } from '../src/mastra/workflows/aso-audit-workflow';
// touch mastra so its workflows/storage get registered before we use the workflow
void mastra;

const URL = process.argv[2] ?? 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580';

async function main() {
  const run = await asoAuditWorkflow.createRun();
  console.log('--- runId:', run.runId);

  const started = await run.start({ inputData: { url: URL } });
  console.log('--- after start: status =', started.status);
  if (started.status !== 'suspended') {
    throw new Error(`expected suspended, got ${started.status}`);
  }
  const candidate = started.suspendPayload?.['confirm-and-audit']?.candidate;
  if (!candidate) throw new Error('no candidate in suspend payload');
  console.log('--- candidate:', {
    name: candidate.name,
    developer: candidate.developer,
    category: candidate.category,
  });

  const resumed = await run.resume({
    step: 'confirm-and-audit',
    resumeData: { approved: true },
  });
  console.log('--- after resume: status =', resumed.status);
  if (resumed.status !== 'success') {
    console.log('full result:', JSON.stringify(resumed, null, 2));
    throw new Error(`expected success after resume, got ${resumed.status}`);
  }

  const out = resumed.result as { status: string; report: { overallScore: number; dimensions: { dimension: string; score: number | null }[] } | null };
  if (out.status !== 'completed' || !out.report) {
    throw new Error(`expected completed report, got ${JSON.stringify(out)}`);
  }
  console.log(`\n--- AUDIT for ${candidate.name} ---`);
  console.log(`overall: ${out.report.overallScore}/100`);
  for (const d of out.report.dimensions) {
    const s = d.score === null ? 'N/A' : `${d.score}/10`;
    console.log(`  ${d.dimension.padEnd(14)} ${s}`);
  }
}

main().catch((err) => {
  console.error('workflow smoke failed:', err);
  process.exit(1);
});
