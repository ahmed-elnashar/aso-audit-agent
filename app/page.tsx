'use client';

import { useChat } from '@ai-sdk/react';
import { useRef, useState } from 'react';
import { ChatMessage } from '@/components/chat/Message';
import { Composer } from '@/components/chat/Composer';
import { RecentAuditsList } from '@/components/audit/RecentAuditsList';

export default function Page() {
  const { messages, sendMessage, setMessages, status, error } = useChat();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const onSubmit = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage({ text });
  };

  const onNewAudit = () => {
    setMessages([]);
    setInput('');
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const busy = status === 'streaming' || status === 'submitted';
  const hasMessages = messages.length > 0;

  return (
    <main className="mx-auto flex h-dvh max-w-3xl flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight">ASO Audit Agent</h1>
          <p className="text-xs text-muted-foreground">
            Paste an Apple App Store URL to start.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasMessages && (
            <button
              onClick={onNewAudit}
              disabled={busy}
              className="group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
              title="Clear this session and start a new audit"
            >
              <NewAuditIcon />
              New audit
            </button>
          )}
          <span className="rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {status === 'streaming' ? 'thinking…' : status === 'submitted' ? 'queued' : 'ready'}
          </span>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {!hasMessages ? (
          <>
            <EmptyState onPick={(url) => sendMessage({ text: url })} />
            <RecentAuditsList />
          </>
        ) : (
          <div className="space-y-6">
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md border border-bad/40 bg-bad/5 px-3 py-2 text-sm text-bad">
            {error.message}
          </div>
        )}
      </div>

      <Composer value={input} onChange={setInput} onSubmit={onSubmit} disabled={busy} />
    </main>
  );
}

function NewAuditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5">
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66M20 4v5h-5M4 20v-5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SAMPLES = [
  { name: 'Spotify', url: 'https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580' },
  { name: 'Headspace', url: 'https://apps.apple.com/us/app/headspace-sleep-meditation/id493145008' },
  { name: 'Notion', url: 'https://apps.apple.com/us/app/notion-notes-docs-tasks-ai/id1232780281' },
];

function EmptyState({ onPick }: { onPick: (url: string) => void }) {
  return (
    <div className="mx-auto mt-16 max-w-xl text-center">
      <h2 className="text-lg font-semibold tracking-tight">Audit any App Store listing.</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste a URL like <code className="rounded bg-muted px-1.5 py-0.5 text-[12px]">https://apps.apple.com/.../id123456</code> below — or try one of these:
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.url}
            onClick={() => onPick(s.url)}
            className="rounded-full border px-3 py-1.5 text-xs text-foreground transition hover:bg-muted"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
