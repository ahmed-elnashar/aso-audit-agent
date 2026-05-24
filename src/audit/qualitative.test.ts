import { describe, expect, it } from 'vitest';
import { buildMessages, mergeQualitative } from './qualitative';
import { makeAuditInput } from './__fixtures__/build-input';
import { runDeterministicChecks } from './deterministic';
import type { DimensionResult } from './types';

describe('buildMessages', () => {
  const input = makeAuditInput({
    app: {
      iconUrl: 'https://cdn.example.com/icon.png',
      screenshotUrls: ['https://cdn.example.com/s1.png', 'https://cdn.example.com/s2.png', 'https://cdn.example.com/s3.png', 'https://cdn.example.com/s4.png', 'https://cdn.example.com/s5.png'],
    },
  });
  const deterministic = runDeterministicChecks(input);

  it('attaches icon + first 3 screenshots as image parts when vision is supported', () => {
    const messages = buildMessages(input, deterministic, true);
    expect(messages).toHaveLength(1);
    const content = messages[0].content as Array<{ type: string; image?: string }>;
    const images = content.filter((p) => p.type === 'image');
    expect(images.map((p) => p.image)).toEqual([
      'https://cdn.example.com/icon.png',
      'https://cdn.example.com/s1.png',
      'https://cdn.example.com/s2.png',
      'https://cdn.example.com/s3.png',
    ]);
  });

  it('sends text-only content when vision is not supported', () => {
    const messages = buildMessages(input, deterministic, false);
    const content = messages[0].content as Array<{ type: string }>;
    expect(content.every((p) => p.type === 'text')).toBe(true);
    expect(content).toHaveLength(1);
  });

  it('skips the icon part when iconUrl is null even with vision on', () => {
    const noIcon = makeAuditInput({ app: { iconUrl: null, screenshotUrls: ['https://cdn.example.com/s1.png'] } });
    const messages = buildMessages(noIcon, runDeterministicChecks(noIcon), true);
    const content = messages[0].content as Array<{ type: string; image?: string }>;
    const images = content.filter((p) => p.type === 'image');
    expect(images.map((p) => p.image)).toEqual(['https://cdn.example.com/s1.png']);
  });
});

describe('mergeQualitative', () => {
  const baseDeterministic: DimensionResult[] = [
    { dimension: 'icon', weight: 5, score: 7, evidence: ['Icon URL present'], recommendations: [], status: 'assessed' },
    { dimension: 'screenshots', weight: 15, score: 6, evidence: ['5 iPhone screenshots'], recommendations: [], status: 'assessed' },
    { dimension: 'previewVideo', weight: 5, score: 0, evidence: ['No preview video'], recommendations: [], status: 'assessed' },
  ];

  it('merges visual scores from the qualitative output into the matching dimensions', () => {
    const merged = mergeQualitative(baseDeterministic, {
      qualitativeScores: {
        icon: { score: 9, reasoning: 'Distinctive teal mark, readable at 60pt' },
        screenshots: { score: 8, reasoning: 'Strong value-prop captions on the first 3' },
        previewVideo: null,
      },
      reviewThemes: null,
      additionalRecommendations: [],
    });

    expect(merged.find((d) => d.dimension === 'icon')?.score).toBe(9);
    expect(merged.find((d) => d.dimension === 'screenshots')?.score).toBe(8);
    expect(merged.find((d) => d.dimension === 'previewVideo')?.score).toBe(0);
    expect(merged.find((d) => d.dimension === 'icon')?.evidence.some((e) => /teal mark/.test(e))).toBe(true);
  });

  it('preserves the deterministic score when the qualitative pass declares vision was skipped', () => {
    const merged = mergeQualitative(baseDeterministic, {
      qualitativeScores: {
        icon: { score: null, reasoning: 'vision skipped: model does not support image input' },
        screenshots: { score: null, reasoning: 'vision skipped: model does not support image input' },
        previewVideo: null,
      },
      reviewThemes: null,
      additionalRecommendations: [],
    });

    // Scores are unchanged from deterministic — we did not blank them out.
    expect(merged.find((d) => d.dimension === 'icon')?.score).toBe(7);
    expect(merged.find((d) => d.dimension === 'screenshots')?.score).toBe(6);
    // But the evidence explains the absence of a qualitative judgement.
    expect(merged.find((d) => d.dimension === 'icon')?.evidence.some((e) => /vision skipped/.test(e))).toBe(true);
  });
});
