import {
    pgTable,
    pgEnum,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    serial,
    timestamp,
    index,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent']);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const countries = pgTable('countries', {
    id:   serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
});

export const users = pgTable('users', {
    id:            uuid('id').defaultRandom().primaryKey(),
    name:          varchar('name', { length: 100 }).notNull(),
    email:         varchar('email', { length: 255 }).notNull().unique(),
    password:      varchar('password', { length: 255 }).notNull(),
    role:          userRoleEnum('role').notNull().default('agent'),
    phone:         varchar('phone', { length: 20 }),
    avatar_url:    text('avatar_url'),
    is_active:     boolean('is_active').notNull().default(true),
    created_at:    timestamp('created_at',     { withTimezone: true }).notNull().defaultNow(),
    updated_at:    timestamp('updated_at',     { withTimezone: true }).notNull().defaultNow(),
    last_login_at: timestamp('last_login_at',  { withTimezone: true }),
});