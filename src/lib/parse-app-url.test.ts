import { describe, expect, it } from 'vitest';
import { InvalidAppStoreUrlError, parseAppStoreUrl } from './parse-app-url';

describe('parseAppStoreUrl', () => {
  it('parses a full URL with country and slug', () => {
    expect(
      parseAppStoreUrl('https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580')
    ).toEqual({ appId: '324684580', country: 'us', slug: 'spotify-music-and-podcasts' });
  });

  it('parses a non-US storefront', () => {
    expect(parseAppStoreUrl('https://apps.apple.com/gb/app/headspace/id493145008')).toEqual({
      appId: '493145008',
      country: 'gb',
      slug: 'headspace',
    });
  });

  it('parses a URL without a slug', () => {
    expect(parseAppStoreUrl('https://apps.apple.com/us/app/id324684580')).toEqual({
      appId: '324684580',
      country: 'us',
      slug: null,
    });
  });

  it('tolerates trailing query strings and fragments', () => {
    expect(
      parseAppStoreUrl('https://apps.apple.com/us/app/spotify/id324684580?mt=8&ign-mpt=foo#x')
    ).toEqual({ appId: '324684580', country: 'us', slug: 'spotify' });
  });

  it('rejects a non-App-Store host', () => {
    expect(() => parseAppStoreUrl('https://example.com/us/app/x/id1')).toThrow(
      InvalidAppStoreUrlError
    );
  });

  it('rejects a URL with no id segment', () => {
    expect(() => parseAppStoreUrl('https://apps.apple.com/us/app/spotify')).toThrow(
      InvalidAppStoreUrlError
    );
  });

  it('rejects non-URL input', () => {
    expect(() => parseAppStoreUrl('not a url')).toThrow(InvalidAppStoreUrlError);
  });
});
