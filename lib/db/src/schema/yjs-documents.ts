import { pgTable, varchar, timestamp, integer, customType, index } from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

export const yjsDocumentsTable = pgTable(
  "yjs_documents",
  {
    docName: varchar("doc_name", { length: 512 }).primaryKey(),
    state: bytea("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    bytes: integer("bytes").notNull().default(0),
  },
  (table) => [index("idx_yjs_documents_updated").on(table.updatedAt)],
);

export type YjsDocument = typeof yjsDocumentsTable.$inferSelect;
