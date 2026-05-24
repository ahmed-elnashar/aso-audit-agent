import { describe, expect, it } from 'vitest';
import { openaiModelSupportsVision } from './llm';

describe('openaiModelSupportsVision', () => {
  it('returns true for known multimodal model families', () => {
    for (const id of ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o1-preview', 'o3-mini', 'gpt-5', 'chatgpt-4o-latest']) {
      expect(openaiModelSupportsVision(id), id).toBe(true);
    }
  });

  it('returns false for text-only model families', () => {
    for (const id of ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'text-davinci-003']) {
      expect(openaiModelSupportsVision(id), id).toBe(false);
    }
  });

  it('is case-insensitive', () => {
    expect(openaiModelSupportsVision('GPT-4O-MINI')).toBe(true);
  });
});
