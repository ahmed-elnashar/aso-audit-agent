'use client';

import type { UIMessage } from 'ai';
import { AppConfirmationCard } from '@/components/audit/AppConfirmationCard';

interface ChatMessageProps {
  message: UIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'flex justify-end' : 'flex justify-start'}>
      <div className={isUser ? 'max-w-[80%]' : 'w-full max-w-[92%]'}>
        {!isUser && <RoleLabel role="agent" />}
        {isUser && <RoleLabel role="you" />}
        <div className={isUser ? 'rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-foreground' : 'space-y-3 text-sm'}>
          {orderForDisplay(message.parts).map((part, i) => renderPart(part, i))}
        </div>
      </div>
    </div>
  );
}

/**
 * The AI SDK streams tool parts first (step 1: tool call+result) and the
 * model's text in step 2 — but in the chat UI we want the agent's text
 * acknowledgement ("Got it — confirm below.") to appear *above* the
 * confirmation card it refers to. Stable-partition: text parts first, then
 * everything else, preserving relative order within each group.
 */
function orderForDisplay(parts: UIMessage['parts']): UIMessage['parts'] {
  const texts: UIMessage['parts'] = [];
  const rest: UIMessage['parts'] = [];
  for (const p of parts) {
    if (p.type === 'text') texts.push(p);
    else rest.push(p);
  }
  return [...texts, ...rest];
}

function renderPart(part: UIMessage['parts'][number], i: number) {
  if (part.type === 'text') {
    return (
      <p key={i} className="whitespace-pre-wrap leading-6">
        {(part as { text: string }).text}
      </p>
    );
  }

  if (typeof part.type === 'string' && part.type.startsWith('tool-')) {
    return <ToolPart key={i} part={part as unknown as ToolPart} />;
  }

  return null;
}

interface ToolPart {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

function ToolPart({ part }: { part: ToolPart }) {
  // Tool name comes through as `tool-<id>` per AI SDK v6's UIMessage spec.
  const toolName = part.type.replace(/^tool-/, '');
  const ready = part.state === 'output-available';
  const errored = part.state === 'output-error';

  // We only have one agent-callable tool: start-audit. Render its three states.
  if (toolName === 'start-audit') {
    if (errored) {
      return <ToolErrorBubble label="Could not look up that app" detail={part.errorText} />;
    }
    if (!ready) {
      return <ToolPendingBubble label="Looking up app metadata…" />;
    }
    const out = part.output as {
      runId: string;
      status: string;
      candidate: { name: string; developer: string; category: string; iconUrl: string | null; appStoreUrl: string } | null;
      error: string | null;
    };
    if (out.status !== 'needs-confirmation' || !out.candidate) {
      return <ToolErrorBubble label="App lookup failed" detail={out.error ?? undefined} />;
    }
    return <AppConfirmationCard runId={out.runId} candidate={out.candidate} />;
  }

  return null;
}

function RoleLabel({ role }: { role: 'agent' | 'you' }) {
  return (
    <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      {role}
    </div>
  );
}

function ToolPendingBubble({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs text-muted-foreground">
      <span className="inline-block size-2 animate-pulse rounded-full bg-accent" />
      {label}
    </div>
  );
}

function ToolErrorBubble({ label, detail }: { label: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-bad/40 bg-bad/5 px-3 py-2 text-xs">
      <div className="font-medium text-bad">{label}</div>
      {detail && <div className="mt-0.5 text-muted-foreground">{detail}</div>}
    </div>
  );
}

