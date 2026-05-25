import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ASO Audit Agent',
  description: 'Paste an Apple App Store URL, get back a prioritized ASO audit.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning lets browser extensions (e.g. Grammarly) inject data-* attrs on <body> without triggering a hydration mismatch in dev. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
