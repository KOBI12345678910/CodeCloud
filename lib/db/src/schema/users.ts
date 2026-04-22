import { pgTable, text, uuid, varchar, bigint, timestamp, pgEnum, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planEnum = pgEnum("user_plan", ["free", "pro", "team"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const authProviderEnum = pgEnum("auth_provider", ["local", "clerk", "google", "github"]);

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  displayName: varchar("display_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  passwordHash: text("password_hash"),
  authProvider: authProviderEnum("auth_provider").default("local").notNull(),
  googleId: varchar("google_id", { length: 255 }).unique(),
  githubId: varchar("github_id", { length: 255 }).unique(),
  githubUsername: varchar("github_username", { length: 100 }),
  githubAccessToken: text("github_access_token"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationToken: varchar("verification_token", { length: 255 }),
  resetPasswordToken: varchar("reset_password_token", { length: 255 }),
  resetPasswordExpires: timestamp("reset_password_expires", { withTimezone: true }),
  preferences: jsonb("preferences").default({
    theme: "dark",
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    minimap: true,
    fontFamily: "monospace",
    autoSave: true,
    autoSaveDelay: 1000,
    terminalFontSize: 14,
    locale: "en",
  }).notNull(),
  plan: planEnum("plan").default("free").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  storageUsedBytes: bigint("storage_used_bytes", { mode: "number" }).default(0).notNull(),
  projectCount: integer("project_count").default(0).notNull(),
  failedLoginAttempts: integer("failed_login_attempts").default(0).notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
}, (table) => [
  index("idx_users_email").on(table.email),
  index("idx_users_username").on(table.username),
  index("idx_users_github_id").on(table.githubId),
  index("idx_users_google_id").on(table.googleId),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
