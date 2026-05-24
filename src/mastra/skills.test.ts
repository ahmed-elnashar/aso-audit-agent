import { describe, expect, it } from 'vitest';
import { loadAsoAuditRubric } from './skills';

describe('loadAsoAuditRubric', () => {
  it('loads the rubric markdown and strips frontmatter', () => {
    const rubric = loadAsoAuditRubric();
    // First line of the markdown body (after frontmatter) is the H1 heading.
    expect(rubric.startsWith('# Apple App Store Optimization')).toBe(true);
    expect(rubric).not.toContain('---\nname:');
  });

  it('contains the dimension scoring table the qualitative prompt depends on', () => {
    const rubric = loadAsoAuditRubric();
    for (const dim of ['Title', 'Subtitle', 'Keyword field', 'Description', 'Screenshots', 'Ratings & reviews', 'Icon']) {
      expect(rubric).toContain(dim);
    }
  });

  it('returns the same content on repeat calls (cached)', () => {
    expect(loadAsoAuditRubric()).toBe(loadAsoAuditRubric());
  });
});
