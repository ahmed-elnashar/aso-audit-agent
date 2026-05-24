'use client';

import { useRef, useEffect } from 'react';

interface ComposerProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export function Composer({ value, onChange, onSubmit, disabled }: ComposerProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
      className="border-t bg-background px-6 py-4"
    >
      <div className="flex items-end gap-3 rounded-xl border bg-card px-3 py-2 shadow-sm focus-within:border-accent/60">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!disabled) onSubmit();
            }
          }}
          rows={1}
          placeholder="Paste an Apple App Store URL…"
          disabled={disabled}
          className="flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm leading-6 outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          Send
        </button>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Enter to send · Shift+Enter for newline
      </p>
    </form>
  );
}
