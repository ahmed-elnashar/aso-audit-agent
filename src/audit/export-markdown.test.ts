import { describe, expect, it } from 'vitest';
import { reportToMarkdown } from './export-markdown';
import type { AuditReport, DimensionResult, Recommendation } from './types';

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    dimension: 'title',
    category: 'quick-win',
    evidence: 'Title is "Notes Pro" (9/30 chars)',
    before: 'Notes Pro',
    after: 'Notes Pro — capture every idea',
    reasoning: 'Using the remaining 21 chars to integrate a primary keyword phrase will improve discoverability.',
    ...overrides,
  };
}

function makeDimension(overrides: Partial<DimensionResult> = {}): DimensionResult {
  return {
    dimension: 'title',
    weight: 20,
    score: 7,
    evidence: ['Title is 9/30 chars'],
    recommendations: [],
    status: 'assessed',
    ...overrides,
  };
}

function makeReport(overrides: Partial<AuditReport> = {}): AuditReport {
  return {
    app: {
      appId: '1',
      name: 'Notes Pro',
      developer: 'Acme',
      category: 'Productivity',
      country: 'us',
      iconUrl: 'https://cdn/x.png',
      appStoreUrl: 'https://apps.apple.com/us/app/notes-pro/id1',
      version: '1.0',
      currentVersionReleaseDate: null,
      screenshotUrls: [],
      ipadScreenshotUrls: [],
      averageRating: null,
      ratingCount: null,
    },
    overallScore: 72,
    dimensions: [makeDimension()],
    competitors: [],
    quickWins: [],
    highImpact: [],
    strategic: [],
    generatedAt: '2026-05-25T12:00:00.000Z',
    ...overrides,
  };
}

describe('reportToMarkdown', () => {
  it('renders the header with app name, score, and store link', () => {
    const md = reportToMarkdown(makeReport());
    expect(md).toContain('# ASO Audit — Notes Pro');
    expect(md).toContain('**Overall score:** 72 / 100');
    expect(md).toContain('<https://apps.apple.com/us/app/notes-pro/id1>');
  });

  it('renders every dimension in the summary table including unavailable ones', () => {
    const md = reportToMarkdown(
      makeReport({
        dimensions: [
          makeDimension({ dimension: 'title', score: 8 }),
          makeDimension({ dimension: 'ratings', score: null, status: 'unavailable', unavailableReason: 'no reviews fetched' }),
        ],
      })
    );
    expect(md).toContain('| Title | 20% | 8.0 / 10 |');
    expect(md).toContain('| Ratings & reviews | 20% | Not detected _(no reviews fetched)_ |');
  });

  it('renders each recommendation bucket header even when empty', () => {
    const md = reportToMarkdown(makeReport());
    expect(md).toContain('## Quick Wins (0)');
    expect(md).toContain('## High Impact (0)');
    expect(md).toContain('## Strategic (0)');
    expect(md).toMatch(/_None.*everything looks good/);
  });

  it('renders before/after blocks for text recommendations', () => {
    const rec = makeRecommendation();
    const md = reportToMarkdown(makeReport({ quickWins: [rec] }));
    expect(md).toContain('**Before:**');
    expect(md).toContain('Notes Pro');
    expect(md).toContain('**After:**');
    expect(md).toContain('Notes Pro — capture every idea');
  });

  it('omits the before/after block when the rec has no text change', () => {
    const rec = makeRecommendation({ before: null, after: null });
    const md = reportToMarkdown(makeReport({ quickWins: [rec] }));
    expect(md).not.toContain('**Before:**');
    expect(md).not.toContain('**After:**');
    expect(md).toContain('**Why:**');
  });

  it('skips the competitor section entirely when there are no competitors', () => {
    const md = reportToMarkdown(makeReport({ competitors: [] }));
    expect(md).not.toContain('## Competitors');
  });

  it('renders competitors as a markdown table, escaping pipe characters', () => {
    const md = reportToMarkdown(
      makeReport({
        competitors: [
          {
            appId: '2',
            name: 'Notable Notes',
            developer: 'Other Co | Inc',
            rank: 1,
            averageRating: 4.6,
            ratingCount: 100000,
            subtitle: 'Take notes faster',
            iconUrl: null,
          },
        ],
      })
    );
    expect(md).toContain('## Competitors in this category');
    expect(md).toContain('| 1 | Notable Notes | Other Co \\| Inc | 4.60 | 100,000 | Take notes faster |');
  });

  it('is deterministic for identical inputs', () => {
    const report = makeReport({ quickWins: [makeRecommendation()] });
    expect(reportToMarkdown(report)).toBe(reportToMarkdown(report));
  });
});
