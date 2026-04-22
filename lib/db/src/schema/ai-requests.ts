import { pgTable, uuid, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const aiRequestsTable = pgTable("ai_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpoint: varchar("endpoint", { length: 32 }).notNull(),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("idx_ai_requests_user_created").on(table.userId, table.createdAt),
]);

export type AiRequest = typeof aiRequestsTable.$inferSelect;
