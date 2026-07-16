import { env } from "cloudflare:workers";

export interface RuntimeEnv {
  DB: D1Database;
  APP_ENV?: string;
  APP_URL?: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  SESSION_SECRET?: string;
}

type BindValue = string | number | null;
let schemaPromise: Promise<void> | undefined;

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS authentication_codes (id TEXT PRIMARY KEY NOT NULL, email TEXT NOT NULL, code_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS authentication_codes_email_created_idx ON authentication_codes (email, created_at)`,
  `CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY NOT NULL, token_hash TEXT NOT NULL UNIQUE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id)`,
  `CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS memberships (org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK(role IN ('admin','assessor','viewer')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (org_id, user_id))`,
  `CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships (user_id)`,
  `CREATE TABLE IF NOT EXISTS invitations (id TEXT PRIMARY KEY NOT NULL, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, email TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','assessor','viewer')), token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, accepted_at TEXT, invited_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS invitations_email_idx ON invitations (email)`,
  `CREATE INDEX IF NOT EXISTS invitations_org_idx ON invitations (org_id)`,
  `CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY NOT NULL, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', goal_statement TEXT NOT NULL DEFAULT '', decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('go','fix','pause','pending')), created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS projects_org_updated_idx ON projects (org_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS dimensions (id TEXT PRIMARY KEY NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, code TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL, prompt TEXT NOT NULL, position INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('green','yellow','red','pending')), UNIQUE(project_id, code))`,
  `CREATE TABLE IF NOT EXISTS issues (id TEXT PRIMARY KEY NOT NULL, dimension_id TEXT NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100), status TEXT NOT NULL CHECK(status IN ('green','yellow','red')), created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS issues_dimension_idx ON issues (dimension_id)`,
  `CREATE TABLE IF NOT EXISTS mitigations (id TEXT PRIMARY KEY NOT NULL, issue_id TEXT NOT NULL REFERENCES issues(id) ON DELETE CASCADE, description TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', deadline TEXT, completed INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL REFERENCES users(id), updated_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS mitigations_issue_idx ON mitigations (issue_id)`,
];

export function getRuntimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

export function getD1(): D1Database {
  const db = getRuntimeEnv().DB;
  if (!db) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return db;
}

export async function ensureSchema(): Promise<void> {
  schemaPromise ??= getD1().batch(schemaStatements.map((statement) => getD1().prepare(statement))).then(() => undefined);
  return schemaPromise;
}

export async function first<T>(sql: string, ...values: BindValue[]): Promise<T | null> {
  await ensureSchema();
  return (await getD1().prepare(sql).bind(...values).first<T>()) ?? null;
}

export async function all<T>(sql: string, ...values: BindValue[]): Promise<T[]> {
  await ensureSchema();
  const result = await getD1().prepare(sql).bind(...values).all<T>();
  return result.results;
}

export async function run(sql: string, ...values: BindValue[]): Promise<D1Result<unknown>> {
  await ensureSchema();
  return getD1().prepare(sql).bind(...values).run();
}

export async function batch(statements: Array<{ sql: string; values?: BindValue[] }>): Promise<D1Result<unknown>[]> {
  await ensureSchema();
  return getD1().batch(statements.map(({ sql, values = [] }) => getD1().prepare(sql).bind(...values)));
}
