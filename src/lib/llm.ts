import { createOpenAI } from '@ai-sdk/openai';

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NIM_MODEL = 'meta/llama-3.3-70b-instruct';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface LlmConfig {
  modelId: string;
  provider: 'nvidia-nim' | 'openai';
}

/**
 * Returns a configured AI SDK language model and a label describing where it
 * came from. NVIDIA NIM is the default because the brief offers it as a free
 * tier; OPENAI_API_KEY overrides if set so reviewers can swap with zero code
 * changes.
 */
export function getAuditModel() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const provider = createOpenAI({ apiKey: openaiKey });
    const modelId = process.env.ASO_AUDIT_MODEL ?? DEFAULT_OPENAI_MODEL;
    return { model: provider(modelId), config: { modelId, provider: 'openai' as const } };
  }

  const nimKey = process.env.NVIDIA_API_KEY;
  if (!nimKey) {
    throw new MissingLlmKeyError();
  }
  const provider = createOpenAI({ apiKey: nimKey, baseURL: NIM_BASE_URL });
  const modelId = process.env.ASO_AUDIT_MODEL ?? DEFAULT_NIM_MODEL;
  return { model: provider(modelId), config: { modelId, provider: 'nvidia-nim' as const } };
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY ?? process.env.NVIDIA_API_KEY);
}

export class MissingLlmKeyError extends Error {
  constructor() {
    super(
      'No LLM API key configured. Set NVIDIA_API_KEY (recommended — free tier at build.nvidia.com) or OPENAI_API_KEY.'
    );
    this.name = 'MissingLlmKeyError';
  }
}
