import { pgTable, uuid, varchar, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const collaboratorRoleEnum = pgEnum("collaborator_role", ["viewer", "editor", "admin"]);
export const collaboratorStatusEnum = pgEnum("collaborator_status", ["pending", "active", "revoked"]);

export const collaboratorsTable = pgTable("collaborators", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: collaboratorRoleEnum("role").default("editor").notNull(),
  status: collaboratorStatusEnum("status").default("active").notNull(),
  inviteEmail: varchar("invite_email", { length: 255 }),
  invitedBy: uuid("invited_by").references(() => usersTable.id),
  lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("unique_collab").on(table.projectId, table.userId),
  index("idx_collaborators_project").on(table.projectId),
  index("idx_collaborators_user").on(table.userId),
  index("idx_collaborators_status").on(table.status),
]);

export const insertCollaboratorSchema = createInsertSchema(collaboratorsTable).omit({ id: true, createdAt: true });
export type InsertCollaborator = z.infer<typeof insertCollaboratorSchema>;
export type Collaborator = typeof collaboratorsTable.$inferSelect;
