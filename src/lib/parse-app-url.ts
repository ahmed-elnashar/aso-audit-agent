export class InvalidAppStoreUrlError extends Error {
  constructor(input: string, reason: string) {
    super(`Not a valid Apple App Store URL (${reason}): ${input}`);
    this.name = 'InvalidAppStoreUrlError';
  }
}

export interface ParsedAppUrl {
  appId: string;
  country: string;
  slug: string | null;
}

const DEFAULT_COUNTRY = 'us';
const HOST = 'apps.apple.com';
const ID_PATTERN = /^id(\d+)$/;
const COUNTRY_PATTERN = /^[a-z]{2}$/;

export function parseAppStoreUrl(input: string): ParsedAppUrl {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new InvalidAppStoreUrlError(input, 'not a URL');
  }

  if (url.hostname !== HOST) {
    throw new InvalidAppStoreUrlError(input, `host must be ${HOST}`);
  }

  const segments = url.pathname.split('/').filter(Boolean);
  let appId: string | undefined;
  let idSegment: string | undefined;
  for (const s of segments) {
    const m = s.match(ID_PATTERN);
    if (m) {
      appId = m[1];
      idSegment = s;
      break;
    }
  }
  if (!appId || !idSegment) {
    throw new InvalidAppStoreUrlError(input, 'missing app id segment (id12345)');
  }

  const appIdx = segments.indexOf('app');
  const country = segments[0] && COUNTRY_PATTERN.test(segments[0]) ? segments[0] : DEFAULT_COUNTRY;

  let slug: string | null = null;
  if (appIdx >= 0 && segments[appIdx + 1] && segments[appIdx + 1] !== idSegment) {
    slug = segments[appIdx + 1];
  }

  return { appId, country, slug };
}
