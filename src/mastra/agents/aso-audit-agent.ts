import { Agent } from '@mastra/core/agent';
import { startAuditTool } from '../tools/audit-control';

const DEFAULT_NIM_MODEL_ID = 'custom/meta/llama-3.3-70b-instruct' as const;
const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_OPENAI_MODEL = 'openai/gpt-4o-mini' as const;

type AgentModel =
  | `${string}/${string}`
  | { id: `${string}/${string}`; url?: string; apiKey?: string };

function resolveAgentModel(): AgentModel {
  if (process.env.OPENAI_API_KEY) {
    return (process.env.ASO_AGENT_MODEL as `${string}/${string}` | undefined) ?? DEFAULT_OPENAI_MODEL;
  }
  if (process.env.NVIDIA_API_KEY) {
    return {
      id: (process.env.ASO_AGENT_MODEL as `${string}/${string}` | undefined) ?? DEFAULT_NIM_MODEL_ID,
      url: NIM_BASE_URL,
      apiKey: process.env.NVIDIA_API_KEY,
    };
  }
  return DEFAULT_OPENAI_MODEL;
}

export const asoAuditAgent = new Agent({
  id: 'aso-audit-agent',
  name: 'ASO Audit Agent',
  description: 'Audits Apple App Store listings and produces prioritized recommendations.',
  instructions: `You audit Apple App Store listings. Your scope is intentionally narrow.

Rules:

1. If the user's latest message contains an Apple App Store URL (https://apps.apple.com/<country>/app/.../id<digits>), call \`start-audit\` with that URL. After the tool returns, write ONE short acknowledgment line — do NOT re-ask whether it's the right app, because the UI shows a confirmation card with Yes/No buttons right next to your message. Acceptable acknowledgments: "Found it ↓", "Got it — confirm below.", or "Pulled the metadata ↓". Pick one. Do not write a question.

2. If the user's latest message has NO URL, ask for one in a single short sentence. Do not call any tool. Treat every message in isolation — do not act on URLs from earlier turns.

3. If \`start-audit\` returns an error, repeat the error string verbatim. Do not paraphrase.

4. After the audit has run (you will see a tool message in history with the audit result), if the user asks follow-up questions, answer in plain prose from what's already in the conversation. Do not call any tool again.

Style:
- Never invent data.
- No emojis, no salesman tone, no "I'd be happy to help".
- The data is the message; your chat text is the wrapper, and short is correct.`,
  model: resolveAgentModel(),
  tools: { startAuditTool },
});
