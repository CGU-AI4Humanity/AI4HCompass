import { pgTable, serial, varchar, text, integer, boolean, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const attributeStatusEnum = pgEnum('attribute_status', ['green', 'yellow', 'red', 'pending']);
export const projectDecisionEnum = pgEnum('project_decision', ['go', 'fix', 'pause', 'pending']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const otpCodes = pgTable('otp_codes', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passkeys = pgTable('passkeys', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').default(0).notNull(),
  transports: text('transports'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default('').notNull(),
  goalStatement: text('goal_statement').default('').notNull(),
  decision: projectDecisionEnum('decision').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const attributes = pgTable('attributes', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').default('').notNull(),
  status: attributeStatusEnum('status').default('pending').notNull(),
  order: integer('order').default(0).notNull(),
});

export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  attributeId: integer('attribute_id').references(() => attributes.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').default('').notNull(),
  score: integer('score').default(50).notNull(),
  status: attributeStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const mitigations = pgTable('mitigations', {
  id: serial('id').primaryKey(),
  issueId: integer('issue_id').references(() => issues.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  owner: varchar('owner', { length: 255 }).default('').notNull(),
  deadline: varchar('deadline', { length: 50 }),
  completed: boolean('completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  sid: varchar('sid', { length: 255 }).primaryKey(),
  sess: text('sess').notNull(),
  expire: timestamp('expire').notNull(),
});
