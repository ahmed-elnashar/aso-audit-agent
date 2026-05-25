import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  Observability,
  MastraStorageExporter,
  SensitiveDataFilter,
} from '@mastra/observability';
import { asoAuditWorkflow } from './workflows/aso-audit-workflow';
import { asoAuditAgent } from './agents/aso-audit-agent';

/**
 * Builds the primary store. On Vercel / any env that sets TURSO_DATABASE_URL
 * we use the remote Turso libsql endpoint (serverless-safe — survives cold
 * starts and is shared across instances). Local dev falls back to a SQLite
 * file under the project root.
 */
function buildPrimaryStore() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) {
    return new LibSQLStore({
      id: 'mastra-storage',
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  // Vercel's filesystem is read-only outside /tmp, and workflow suspend/resume
  // crosses invocations — neither a read-only fs nor per-instance /tmp can hold
  // that state. Fail fast with a readable message instead of an opaque LibSQL
  // write error deep in the workflow runner.
  if (process.env.VERCEL) {
    throw new Error(
      'TURSO_DATABASE_URL is required on Vercel. Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) in the project env — local SQLite cannot persist workflow state across the suspend/resume boundary on serverless.'
    );
  }
  return new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  });
}

/**
 * DuckDB has native bindings (`libduckdb.so`) that aren't shipped to Vercel's
 * Node runtime. A static import would force module resolution even on the code
 * paths that don't use it, so we dynamic-import inside the non-Vercel branch
 * to keep DuckDB completely out of the production bundle's runtime graph.
 * Observability traces are pure dev ergonomics — only useful in the Mastra
 * Playground, which isn't deployed.
 */
async function buildCompositeStore() {
  const primary = buildPrimaryStore();
  const skipObservabilityStore =
    Boolean(process.env.VERCEL) || process.env.DISABLE_OBSERVABILITY_STORE === '1';
  if (skipObservabilityStore) {
    return new MastraCompositeStore({ id: 'composite-storage', default: primary });
  }
  const { DuckDBStore } = await import('@mastra/duckdb');
  return new MastraCompositeStore({
    id: 'composite-storage',
    default: primary,
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  });
}

export const mastra = new Mastra({
  workflows: { asoAuditWorkflow },
  agents: { asoAuditAgent },
  storage: await buildCompositeStore(),
  logger: new PinoLogger({
    name: 'aso-audit',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'aso-audit',
        exporters: [new MastraStorageExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
