import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Mastra storage uses native libsql/duckdb modules — leave them out of the server bundle.
  serverExternalPackages: ['@libsql/client', '@mastra/libsql', '@mastra/duckdb', 'duckdb-async'],
  turbopack: {
    root: here,
  },
};

export default nextConfig;
