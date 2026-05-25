import { createOpenAI } from '@ai-sdk/openai';

const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_NIM_MODEL = 'meta/llama-3.3-70b-instruct';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

export interface LlmConfig {
  modelId: string;
  provider: 'nvidia-nim' | 'openai';
  supportsVision: boolean;
}

/** `supportsVision` is true only for known multimodal OpenAI models — the
 *  qualitative audit reads it to decide whether to attach screenshot images. */
export function getAuditModel() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const provider = createOpenAI({ apiKey: openaiKey });
    const modelId = process.env.ASO_AUDIT_MODEL ?? DEFAULT_OPENAI_MODEL;
    return {
      model: provider(modelId),
      config: { modelId, provider: 'openai', supportsVision: openaiModelSupportsVision(modelId) },
    };
  }

  const nimKey = process.env.NVIDIA_API_KEY;
  if (!nimKey) {
    throw new MissingLlmKeyError();
  }
  const provider = createOpenAI({ apiKey: nimKey, baseURL: NIM_BASE_URL });
  const modelId = process.env.ASO_AUDIT_MODEL ?? DEFAULT_NIM_MODEL;
  // NIM hosts both text-only and vision-capable models; we don't try to enumerate
  // them. Reviewers who want vision should use an OpenAI key.
  return {
    model: provider(modelId),
    config: { modelId, provider: 'nvidia-nim', supportsVision: false },
  };
}

/**
 * Vision-capable OpenAI models as of writing. Conservative on purpose — false
 * negatives just downgrade to text-only, false positives waste an API call.
 */
export function openaiModelSupportsVision(modelId: string): boolean {
  const id = modelId.toLowerCase();
  return (
    id.startsWith('gpt-4o') ||
    id.startsWith('gpt-4.1') ||
    id.startsWith('gpt-5') ||
    id.startsWith('o1') ||
    id.startsWith('o3') ||
    id.startsWith('chatgpt-4o')
  );
}

export function hasLlmKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY ?? process.env.NVIDIA_API_KEY);
}

export class MissingLlmKeyError extends Error {
  constructor() {
    super(
      'No LLM API key configured. Set OPENAI_API_KEY (recommended) or NVIDIA_API_KEY (free tier at build.nvidia.com).'
    );
    this.name = 'MissingLlmKeyError';
  }
}
