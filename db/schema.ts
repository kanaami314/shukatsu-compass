// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable,text,index,integer } from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),owner:text('owner').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1),deleted:integer('deleted').notNull().default(0),deletedAt:text('deleted_at')},t=>[index('records_owner').on(t.owner)]);
export const recordHistory=sqliteTable('record_history',{id:text('id').primaryKey(),recordId:text('record_id').notNull(),owner:text('owner').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),revision:integer('revision').notNull(),savedAt:text('saved_at').notNull()},t=>[index('history_owner_record').on(t.owner,t.recordId)]);
export const drafts=sqliteTable('drafts',{id:text('id').primaryKey(),owner:text('owner').notNull(),payload:text('payload').notNull(),sequence:integer('sequence').notNull(),archived:integer('archived').notNull().default(0),updatedAt:text('updated_at').notNull()},t=>[index('drafts_owner').on(t.owner)]);
export const draftHistory=sqliteTable('draft_history',{id:text('id').primaryKey(),owner:text('owner').notNull(),payload:text('payload').notNull(),savedAt:text('saved_at').notNull()},t=>[index('draft_history_owner').on(t.owner,t.savedAt)]);
export const aiAccessSettings=sqliteTable('ai_access_settings',{owner:text('owner').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(1)});

export const widgetAccess=sqliteTable('widget_access',{owner:text('owner').primaryKey(),tokenHash:text('token_hash'),enabled:integer('enabled').notNull().default(0),revision:integer('revision').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[index('widget_token_hash').on(t.tokenHash)]);
