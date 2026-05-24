'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CompareView } from '@/components/audit/CompareView';
import { getRecentAudit, type RecentAuditEntry } from '@/lib/recent-audits-storage';

export default function ComparePage() {
  // useSearchParams() must live under a <Suspense> boundary so Next can
  // statically prerender the outer shell and only hydrate the param-dependent
  // part on the client.
  return (
    <Suspense fallback={<LoadingState />}>
      <CompareBody />
    </Suspense>
  );
}

function CompareBody() {
  const params = useSearchParams();
  const aId = params.get('a');
  const bId = params.get('b');

  const [resolved, setResolved] = useState<{ a: RecentAuditEntry | null; b: RecentAuditEntry | null } | null>(null);

  // localStorage isn't available on the server; resolve after mount.
  useEffect(() => {
    if (!aId || !bId) {
      setResolved({ a: null, b: null });
      return;
    }
    setResolved({ a: getRecentAudit(aId), b: getRecentAudit(bId) });
  }, [aId, bId]);

  if (!aId || !bId) {
    return <ErrorState message="Missing ?a and ?b query params." />;
  }
  if (resolved === null) {
    return <LoadingState />;
  }
  if (!resolved.a || !resolved.b) {
    const which = !resolved.a && !resolved.b ? 'both apps' : !resolved.a ? `app ${aId}` : `app ${bId}`;
    return <ErrorState message={`No cached audit found for ${which}. Run the audit first, then return here.`} />;
  }

  return (
    <main className="mx-auto h-dvh max-w-5xl overflow-y-auto px-6 py-8">
      <CompareView a={resolved.a.report} b={resolved.b.report} />
    </main>
  );
}

function LoadingState() {
  return (
    <main className="mx-auto grid h-dvh max-w-5xl place-items-center px-6">
      <p className="text-xs text-muted-foreground">Loading cached audits…</p>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="mx-auto grid h-dvh max-w-xl place-items-center px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-base font-semibold">Cannot compare</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        <Link href="/" className="inline-block rounded-md border px-3 py-1.5 text-xs hover:bg-muted">
          ← Back to chat
        </Link>
      </div>
    </main>
  );
}
