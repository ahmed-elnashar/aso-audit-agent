import { describe, expect, it } from 'vitest';
import { scoreDescription } from './description';
import { makeAuditInput } from '../__fixtures__/build-input';

describe('scoreDescription', () => {
  it('scores 0 for an empty description and recommends adding one', () => {
    const result = scoreDescription(makeAuditInput({ app: { description: '' } }));
    expect(result.score).toBe(0);
    expect(result.recommendations).toHaveLength(1);
  });

  it('boosts score when CTA and social-proof signals are present in a long-enough description', () => {
    const padding = 'It works offline, syncs in the background, and supports markdown, code blocks, tables, and rich embeds. '.repeat(6);
    const richDescription =
      'Download Notes Pro today and join 5 million users worldwide. Featured in The New York Times. ' +
      padding +
      'Capture ideas in one tap, organize with tags, and sync seamlessly across all your devices. ' +
      'Get started free in under a minute, no credit card required. Editor\'s Choice on the App Store. ' +
      'Trusted by teams at Stripe, Figma, and Linear.';
    expect(richDescription.length).toBeGreaterThanOrEqual(800);
    const result = scoreDescription(makeAuditInput({ app: { description: richDescription } }));
    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.recommendations).toEqual([]);
  });

  it('flags missing CTA', () => {
    const noCta = 'Notes Pro is a notes app. It helps you organize information across devices.'.repeat(8);
    const result = scoreDescription(makeAuditInput({ app: { description: noCta } }));
    expect(result.recommendations.some((r) => /call-to-action/i.test(r.evidence))).toBe(true);
  });

  it('flags missing social proof', () => {
    const noProof = 'Try Notes Pro and start organizing. Download it now. Sign up free.'.repeat(8);
    const result = scoreDescription(makeAuditInput({ app: { description: noProof } }));
    expect(result.recommendations.some((r) => /social proof/i.test(r.evidence))).toBe(true);
  });
});
