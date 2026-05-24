/**
 * Offline eval harness. Runs the full audit pipeline against a small fixture
 * suite of real App Store listings, then scores each generated recommendation
 * with three Mastra-evals scorers (faithfulness, answer-relevancy,
 * keyword-coverage). Prints a per-app/per-dimension table and exits with a
 * non-zero code if any LLM-judged score falls below MIN_LLM_SCORE.
 *
 * NOT wired into CI — runs cost real LLM tokens (faithfulness + relevancy are
 * each one extra LLM call per recommendation). Treat as a local quality gate
 * to run before tagging a release or shipping a prompt change.
 */
import { parseAppStoreUrl } from '../src/lib/parse-app-url';
import { lookupApp, lookupApps } from '../src/lib/itunes/lookup';
import { fetchReviews } from '../src/lib/itunes/reviews';
import { fetchTopCharts } from '../src/lib/itunes/top-charts';
import { scrapeListing } from '../src/lib/scrape/listing';
import { buildAuditAppInput, buildAuditCompetitorInput, type AuditInput } from '../src/audit/inputs';
import { runAudit } from '../src/audit/run';
import type { AuditReport } from '../src/audit/types';
import { scoreRecommendation, type RecommendationScores } from '../src/audit/eval/scorers';

const FIXTURES: { label: string; url: string }[] = [
  { label: 'Spotify (large, US, free)', url: 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580' },
  { label: 'Notion (productivity, US)', url: 'https://apps.apple.com/us/app/notion-notes-docs-tasks-ai/id1232780281' },
  { label: 'Headspace (wellness, US)', url: 'https://apps.apple.com/us/app/headspace-sleep-meditation/id493145008' },
];

const MIN_LLM_SCORE = 0.5;
const MAX_RECS_PER_APP = 5;

interface Row {
  app: string;
  dimension: string;
  category: string;
  scores: RecommendationScores;
}

async function main() {
  console.log(`Running eval over ${FIXTURES.length} fixtures (max ${MAX_RECS_PER_APP} recs per app)…\n`);

  const rows: Row[] = [];
  for (const fixture of FIXTURES) {
    console.log(`▸ ${fixture.label}`);
    const { report, input } = await runFixture(fixture.url);
    const allRecs = [...report.quickWins, ...report.highImpact, ...report.strategic].slice(0, MAX_RECS_PER_APP);
    console.log(`  audit complete · scoring ${allRecs.length} recs…`);

    for (const rec of allRecs) {
      const dimension = report.dimensions.find((d) => d.dimension === rec.dimension);
      if (!dimension) continue;
      try {
        const scores = await scoreRecommendation(rec, dimension, input);
        rows.push({ app: report.app.name, dimension: rec.dimension, category: rec.category, scores });
      } catch (err) {
        console.warn(`    skipped ${rec.dimension} (${rec.category}): ${err instanceof Error ? err.message : err}`);
      }
    }
    console.log();
  }

  printTable(rows);
  const failed = rows.filter((r) => r.scores.faithfulness < MIN_LLM_SCORE || r.scores.relevancy < MIN_LLM_SCORE);
  if (failed.length > 0) {
    console.error(`\n✗ ${failed.length} of ${rows.length} recommendations fell below the ${MIN_LLM_SCORE} bar on faithfulness or relevancy.`);
    process.exit(1);
  }
  console.log(`\n✓ All ${rows.length} recommendations cleared the ${MIN_LLM_SCORE} bar.`);
}

async function runFixture(url: string): Promise<{ report: AuditReport; input: AuditInput }> {
  const parsed = parseAppStoreUrl(url);
  const [lookup, scraped, reviews] = await Promise.all([
    lookupApp({ appId: parsed.appId, country: parsed.country }),
    scrapeListing({ appId: parsed.appId, country: parsed.country, slug: parsed.slug }),
    fetchReviews({ appId: parsed.appId, country: parsed.country, pages: 1 }),
  ]);
  const charts = await fetchTopCharts({ genreId: lookup.primaryGenreId, country: parsed.country, limit: 11 });
  const competitorIds = charts.filter((c) => c.appId !== parsed.appId).slice(0, 3).map((c) => c.appId);
  const competitorLookups = competitorIds.length ? await lookupApps({ appIds: competitorIds, country: parsed.country }) : [];
  const competitors = competitorLookups.map((l, i) => buildAuditCompetitorInput({ rank: i + 1, lookup: l }));
  const input: AuditInput = {
    app: buildAuditAppInput({ appId: parsed.appId, country: parsed.country, lookup, scraped, reviews }),
    competitors,
  };
  const report = await runAudit(input);
  return { report, input };
}

function printTable(rows: Row[]) {
  console.log('App                  Dimension      Category       Faithful  Relev  KwCov');
  console.log('─────────────────────────────────────────────────────────────────────────');
  for (const r of rows) {
    console.log(
      [
        truncate(r.app, 20).padEnd(20),
        r.dimension.padEnd(14),
        r.category.padEnd(14),
        fmt(r.scores.faithfulness).padStart(8),
        fmt(r.scores.relevancy).padStart(6),
        fmt(r.scores.keywordCoverage).padStart(6),
      ].join(' ')
    );
  }
  if (rows.length > 0) {
    const avg = (k: keyof RecommendationScores) =>
      rows.reduce((acc, r) => acc + r.scores[k], 0) / rows.length;
    console.log('─────────────────────────────────────────────────────────────────────────');
    console.log(
      [
        'AVERAGE'.padEnd(20),
        ''.padEnd(14),
        ''.padEnd(14),
        fmt(avg('faithfulness')).padStart(8),
        fmt(avg('relevancy')).padStart(6),
        fmt(avg('keywordCoverage')).padStart(6),
      ].join(' ')
    );
  }
}

function fmt(n: number): string {
  return n.toFixed(2);
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

main().catch((err) => {
  console.error('eval harness failed:', err);
  process.exit(1);
});
