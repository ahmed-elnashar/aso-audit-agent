import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse, type UIMessageChunk } from 'ai';
import { mastra } from '../../../src/mastra';

const THREAD_ID = 'default-thread';
const RESOURCE_ID = 'aso-audit';

export async function POST(req: Request) {
  const params = await req.json();
  const stream = await handleChatStream({
    mastra,
    agentId: 'aso-audit-agent',
    version: 'v6',
    params: {
      ...params,
      memory: {
        ...(params.memory ?? {}),
        thread: THREAD_ID,
        resource: RESOURCE_ID,
      },
    },
  });
  return createUIMessageStreamResponse({ stream: stream as unknown as ReadableStream<UIMessageChunk> });
}
