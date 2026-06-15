import {
    pgTable,
    pgEnum,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    numeric,
    jsonb,
    serial,
    timestamp,
    index,
    primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum       = pgEnum('user_role',       ['admin', 'agent']);
export const propertyTagEnum        = pgEnum('property_tag',          ['for_sale', 'new', 'reserved', 'sold']);
export const propertyStatusEnum     = pgEnum('property_status',        ['draft', 'published', 'archived']);
export const visitRequestStatusEnum = pgEnum('visit_request_status',   ['pending', 'contacted', 'closed']);

// ─── Tables ───────────────────────────────────────────────────────────────────

export const countries = pgTable('countries', {
    id:   serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
});

export const zones = pgTable('zones', {
    id:            serial('id').primaryKey(),
    country_id:    integer('country_id').notNull().references(() => countries.id),
    name:          varchar('name', { length: 100 }).notNull(),
    slug:          varchar('slug', { length: 100 }).notNull().unique(),
    image_url:     text('image_url'),
    description:   text('description'),
    tags:          text('tags').array(),
    display_order: integer('display_order').notNull().default(0),
    is_active:     boolean('is_active').notNull().default(true),
});

export const properties = pgTable('properties', {
    id:            uuid('id').defaultRandom().primaryKey(),
    zone_id:       integer('zone_id').notNull().references(() => zones.id),
    agent_id:      uuid('agent_id').notNull().references(() => users.id),
    title:         varchar('title', { length: 200 }).notNull(),
    slug:          varchar('slug',  { length: 200 }).notNull().unique(),
    reference:     varchar('reference', { length: 20 }).notNull().unique(),
    tag:           propertyTagEnum('tag').notNull().default('for_sale'),
    status:        propertyStatusEnum('status').notNull().default('draft'),
    price:         integer('price').notNull(),
    n_beds:        integer('n_beds').notNull(),
    n_baths:       integer('n_baths').notNull(),
    m_built:       integer('m_built').notNull(),
    terrain_space: numeric('terrain_space', { precision: 10, scale: 2 }),
    description:   text('description'),
    features:      text('features').array(),
    latitude:      numeric('latitude',  { precision: 10, scale: 7 }),
    longitude:     numeric('longitude', { precision: 10, scale: 7 }),
    distances:     jsonb('distances'),
    is_featured:   boolean('is_featured').notNull().default(false),
    published_at:  timestamp('published_at', { withTimezone: true }),
    created_at:    timestamp('created_at',   { withTimezone: true }).notNull().defaultNow(),
    updated_at:    timestamp('updated_at',   { withTimezone: true }).notNull().defaultNow(),
});

export const propertyImages = pgTable('property_images', {
    id:            serial('id').primaryKey(),
    property_id:   uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    url:           text('url').notNull(),
    caption:       varchar('caption', { length: 200 }),
    display_order: integer('display_order').notNull().default(0),
    is_cover:      boolean('is_cover').notNull().default(false),
});

export const visitRequests = pgTable('visit_requests', {
    id:             serial('id').primaryKey(),
    property_id:    uuid('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
    name:           varchar('name',    { length: 100 }).notNull(),
    contact:        varchar('contact', { length: 255 }).notNull(),
    preferred_date: varchar('preferred_date', { length: 50 }),
    status:         visitRequestStatusEnum('status').notNull().default('pending'),
    created_at:     timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
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