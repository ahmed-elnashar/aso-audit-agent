/**
 * Manual smoke test: hits real iTunes APIs against the Spotify URL and prints
 * a compact summary so we can eyeball that the shapes match expectations.
 * Run with: npx tsx scripts/smoke-data-layer.ts
 */
import { parseAppStoreUrl } from '../src/lib/parse-app-url';
import { lookupApp } from '../src/lib/itunes/lookup';
import { fetchReviews } from '../src/lib/itunes/reviews';
import { fetchTopCharts } from '../src/lib/itunes/top-charts';
import { scrapeListing } from '../src/lib/scrape/listing';

const SPOTIFY = 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580';

async function main() {
  const parsed = parseAppStoreUrl(SPOTIFY);
  console.log('parsed:', parsed);

  const app = await lookupApp({ appId: parsed.appId, country: parsed.country });
  console.log('lookup:', {
    name: app.trackName,
    developer: app.artistName,
    category: app.primaryGenreName,
    genreId: app.primaryGenreId,
    rating: app.averageUserRating,
    ratingCount: app.userRatingCount,
    descriptionLen: app.description.length,
    screenshots: app.screenshotUrls.length,
    icon: app.artworkUrl512,
    version: app.version,
    releaseNotesLen: app.releaseNotes?.length ?? 0,
  });

  const reviews = await fetchReviews({ appId: parsed.appId, country: parsed.country, pages: 1 });
  console.log('reviews:', { count: reviews.length, first: reviews[0]?.title });

  const top = await fetchTopCharts({ genreId: app.primaryGenreId, country: parsed.country, limit: 10 });
  console.log('topCharts:', top.map((t) => `${t.rank}. ${t.name} (${t.appId})`));

  const scraped = await scrapeListing({
    appId: parsed.appId,
    country: parsed.country,
    slug: parsed.slug,
  });
  console.log('scraped:', scraped);
}

main().catch((err) => {
  console.error('smoke failed:', err);
  process.exit(1);
});
