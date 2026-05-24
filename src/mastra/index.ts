import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
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
  return new LibSQLStore({
    id: 'mastra-storage',
    url: 'file:./mastra.db',
  });
}

/**
 * DuckDB has native bindings that don't bundle on Vercel's Node runtime. It's
 * also pure dev ergonomics — observability traces are only useful when you're
 * looking at them in the Mastra Playground, which isn't deployed. So on Vercel
 * (or anywhere `DISABLE_OBSERVABILITY_STORE=1`) we fall back to the primary
 * store for observability traces too.
 */
async function buildCompositeStore() {
  const primary = buildPrimaryStore();
  const onVercel = Boolean(process.env.VERCEL) || process.env.DISABLE_OBSERVABILITY_STORE === '1';
  if (onVercel) {
    return new MastraCompositeStore({ id: 'composite-storage', default: primary });
  }
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
