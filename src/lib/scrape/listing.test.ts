import { describe, expect, it } from 'vitest';
import { parseListingHtml } from './listing';

const HTML_WITH_SUBTITLE_AND_VIDEO = `
<!doctype html>
<html><head></head><body>
  <h2 class="product-header__subtitle">Songs &amp; Playlists For You</h2>
  <video><source src="https://video.example.com/preview.mp4" type="video/mp4" /></video>
  <script type="fastboot/shoebox" id="x">
    {"data":{"attributes":{"platformAttributes":{"ios":{"promotionalText":"Now with AI summaries!"}}}}}
  </script>
</body></html>
`;

const HTML_NO_EXTRAS = `
<!doctype html><html><body><h1>Some App</h1></body></html>
`;

describe('parseListingHtml', () => {
  it('extracts subtitle from the header element', () => {
    const result = parseListingHtml(HTML_WITH_SUBTITLE_AND_VIDEO);
    expect(result.subtitle).toBe('Songs & Playlists For You');
  });

  it('extracts preview video URL from a <video><source> tag', () => {
    const result = parseListingHtml(HTML_WITH_SUBTITLE_AND_VIDEO);
    expect(result.previewVideoUrl).toBe('https://video.example.com/preview.mp4');
  });

  it('extracts promotionalText from embedded shoebox JSON', () => {
    const result = parseListingHtml(HTML_WITH_SUBTITLE_AND_VIDEO);
    expect(result.promotionalText).toBe('Now with AI summaries!');
  });

  it('returns nulls for all fields when the page has no extractable signals', () => {
    expect(parseListingHtml(HTML_NO_EXTRAS)).toEqual({
      subtitle: null,
      promotionalText: null,
      previewVideoUrl: null,
    });
  });

  it('does not pick up a non-video URL as preview video', () => {
    const html = `<script type="application/json">{"previewUrl":"https://example.com/image.jpg"}</script>`;
    expect(parseListingHtml(html).previewVideoUrl).toBe(null);
  });
});
