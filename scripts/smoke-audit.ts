/**
 * Run the deterministic audit pipeline against the Spotify URL and pretty-print
 * the scores. No LLM in the loop — pure deterministic signal only.
 */
import { parseAppStoreUrl } from '../src/lib/parse-app-url';
import { lookupApp, lookupApps } from '../src/lib/itunes/lookup';
import { fetchReviews } from '../src/lib/itunes/reviews';
import { fetchTopCharts } from '../src/lib/itunes/top-charts';
import { scrapeListing } from '../src/lib/scrape/listing';
import { buildAuditAppInput, buildAuditCompetitorInput } from '../src/audit/inputs';
import { runAudit } from '../src/audit/run';

const TARGET = process.argv[2] ?? 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580';

async function main() {
  const parsed = parseAppStoreUrl(TARGET);
  const [lookup, scraped, reviews] = await Promise.all([
    lookupApp({ appId: parsed.appId, country: parsed.country }),
    scrapeListing({ appId: parsed.appId, country: parsed.country, slug: parsed.slug }),
    fetchReviews({ appId: parsed.appId, country: parsed.country, pages: 1 }),
  ]);

  const charts = await fetchTopCharts({ genreId: lookup.primaryGenreId, country: parsed.country, limit: 11 });
  const competitorIds = charts.filter((c) => c.appId !== parsed.appId).slice(0, 3).map((c) => c.appId);
  const competitorLookups = await lookupApps({ appIds: competitorIds, country: parsed.country });
  const competitors = competitorLookups.map((l, i) => buildAuditCompetitorInput({ rank: i + 1, lookup: l }));

  const input = {
    app: buildAuditAppInput({ appId: parsed.appId, country: parsed.country, lookup, scraped, reviews }),
    competitors,
  };

  const report = await runAudit(input, {
    onProgress: (e) => console.log('  …', e.stage, 'reason' in e ? `(${e.reason})` : ''),
  });

  console.log(`\n=== ${report.app.name} (${report.app.developer}) — ${report.app.category} ===`);
  console.log(`Overall: ${report.overallScore}/100\n`);
  for (const d of report.dimensions) {
    const scoreStr = d.score === null ? 'N/A' : `${d.score}/10`;
    console.log(`  ${d.dimension.padEnd(14)} ${scoreStr.padEnd(7)} (${d.weight}%) ${d.status === 'unavailable' ? '[' + (d.unavailableReason ?? 'unavailable') + ']' : ''}`);
  }
  console.log(`\nQuick wins:    ${report.quickWins.length}`);
  console.log(`High impact:   ${report.highImpact.length}`);
  console.log(`Strategic:     ${report.strategic.length}`);

  for (const [label, list] of [['QUICK WINS', report.quickWins], ['HIGH IMPACT', report.highImpact], ['STRATEGIC', report.strategic]] as const) {
    if (list.length === 0) continue;
    console.log(`\n--- ${label} ---`);
    for (const r of list.slice(0, 3)) {
      console.log(`[${r.dimension}] ${r.evidence}`);
      if (r.before) console.log(`  before: ${r.before}`);
      if (r.after) console.log(`  after:  ${r.after}`);
      console.log(`  why: ${r.reasoning}`);
    }
  }
}

main().catch((err) => {
  console.error('audit smoke failed:', err);
  process.exit(1);
});
