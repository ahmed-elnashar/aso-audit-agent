import * as cheerio from 'cheerio';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

export interface ScrapedListing {
  subtitle: string | null;
  promotionalText: string | null;
  previewVideoUrl: string | null;
}

export interface ScrapeListingOptions {
  appId: string;
  country?: string;
  slug?: string | null;
  signal?: AbortSignal;
}

export async function scrapeListing({
  appId,
  country = 'us',
  slug,
  signal,
}: ScrapeListingOptions): Promise<ScrapedListing> {
  const slugSegment = slug ? `${slug}/` : '';
  const url = `https://apps.apple.com/${encodeURIComponent(country)}/app/${slugSegment}id${encodeURIComponent(appId)}`;
  const res = await fetch(url, {
    signal,
    headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
  });
  if (!res.ok) {
    return { subtitle: null, promotionalText: null, previewVideoUrl: null };
  }
  const html = await res.text();
  return parseListingHtml(html);
}

export function parseListingHtml(html: string): ScrapedListing {
  const $ = cheerio.load(html);
  const shoebox = readShoebox($);

  const subtitle =
    pickText($, '.product-header__subtitle') ??
    findString(shoebox, ['subtitle', 'subTitle']);

  const previewVideoUrl =
    $('video source[type^="video/"]').first().attr('src') ??
    $('video').first().attr('src') ??
    pickShoeboxPreviewUrl(shoebox) ??
    null;

  const promotionalText = findString(shoebox, ['promotionalText', 'promotional_text']);

  return { subtitle, promotionalText, previewVideoUrl };
}

function pickText($: cheerio.CheerioAPI, selector: string): string | null {
  const text = $(selector).first().text().trim();
  return text.length > 0 ? text : null;
}

function readShoebox($: cheerio.CheerioAPI): unknown[] {
  const blocks: unknown[] = [];
  $('script[type^="fastboot/shoebox"], script[type="application/json"]').each((_, el) => {
    const raw = $(el).text();
    if (!raw) return;
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      // ignore malformed shoebox entries
    }
  });
  return blocks;
}

/** Filters the candidate URL down to actual video formats — listings sometimes
 *  expose image thumbnails under the same `previewUrl` key. */
function pickShoeboxPreviewUrl(shoebox: unknown[]): string | null {
  const value = findString(shoebox, ['previewUrl', 'preview_url']);
  return value && /\.(mp4|m3u8|mov)/i.test(value) ? value : null;
}

function findString(roots: unknown[], keys: string[]): string | null {
  const seen = new WeakSet<object>();
  const stack: unknown[] = [...roots];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== 'object') continue;
    if (seen.has(node as object)) continue;
    seen.add(node as object);
    if (Array.isArray(node)) {
      stack.push(...node);
      continue;
    }
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (keys.includes(k) && typeof v === 'string' && v.trim().length > 0) {
        return v.trim();
      }
      if (v && typeof v === 'object') stack.push(v);
    }
  }
  return null;
}
