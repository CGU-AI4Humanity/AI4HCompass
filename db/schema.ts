import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("users_email_idx").on(table.email)]);

export const authenticationCodes = sqliteTable("authentication_codes", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  codeHash: text("code_hash").notNull(),
  ipHash: text("ip_hash").notNull(),
  attempts: integer("attempts").notNull().default(0),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("authentication_codes_email_created_idx").on(table.email, table.createdAt)]);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [uniqueIndex("sessions_token_idx").on(table.tokenHash), index("sessions_user_idx").on(table.userId)]);

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)]);

export const memberships = sqliteTable("memberships", {
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin", "assessor", "viewer"] }).notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [primaryKey({ columns: [table.orgId, table.userId] }), index("memberships_user_idx").on(table.userId)]);

export const invitations = sqliteTable("invitations", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "assessor", "viewer"] }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  acceptedAt: text("accepted_at"),
  invitedBy: text("invited_by").notNull().references(() => users.id),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("invitations_email_idx").on(table.email), index("invitations_org_idx").on(table.orgId)]);

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  orgId: text("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  goalStatement: text("goal_statement").notNull().default(""),
  decision: text("decision", { enum: ["go", "fix", "pause", "pending"] }).notNull().default("pending"),
  createdBy: text("created_by").notNull().references(() => users.id),
  updatedBy: text("updated_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("projects_org_updated_idx").on(table.orgId, table.updatedAt)]);

export const dimensions = sqliteTable("dimensions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  position: integer("position").notNull(),
  status: text("status", { enum: ["green", "yellow", "red", "pending"] }).notNull().default("pending"),
}, (table) => [uniqueIndex("dimensions_project_code_idx").on(table.projectId, table.code)]);

export const issues = sqliteTable("issues", {
  id: text("id").primaryKey(),
  dimensionId: text("dimension_id").notNull().references(() => dimensions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  score: integer("score").notNull(),
  status: text("status", { enum: ["green", "yellow", "red"] }).notNull(),
  createdBy: text("created_by").notNull().references(() => users.id),
  updatedBy: text("updated_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("issues_dimension_idx").on(table.dimensionId)]);

export const mitigations = sqliteTable("mitigations", {
  id: text("id").primaryKey(),
  issueId: text("issue_id").notNull().references(() => issues.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  owner: text("owner").notNull().default(""),
  deadline: text("deadline"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").notNull().references(() => users.id),
  updatedBy: text("updated_by").notNull().references(() => users.id),
  ...timestamps,
}, (table) => [index("mitigations_issue_idx").on(table.issueId)]);
