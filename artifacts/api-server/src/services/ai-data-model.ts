export interface Entity {
  id: string;
  name: string;
  fields: Field[];
  position: { x: number; y: number };
}

export interface Field {
  name: string;
  type: string;
  primary?: boolean;
  nullable?: boolean;
  unique?: boolean;
  default?: string;
  foreignKey?: { entity: string; field: string };
}

export interface Relationship {
  id: string;
  from: string;
  fromField: string;
  to: string;
  toField: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
}

export interface DataModel {
  entities: Entity[];
  relationships: Relationship[];
}

export interface Migration {
  sql: string;
  description: string;
}

const FIELD_TYPES = ["serial", "integer", "varchar", "text", "boolean", "timestamp", "jsonb", "uuid", "float", "decimal"];

function generateFromDescription(description: string): DataModel {
  const desc = description.toLowerCase();
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];

  if (desc.includes("blog") || desc.includes("post") || desc.includes("article")) {
    entities.push(
      { id: "e1", name: "users", position: { x: 50, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "email", type: "varchar", unique: true },
        { name: "name", type: "varchar" },
        { name: "avatar_url", type: "text", nullable: true },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e2", name: "posts", position: { x: 350, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "title", type: "varchar" },
        { name: "content", type: "text" },
        { name: "slug", type: "varchar", unique: true },
        { name: "published", type: "boolean", default: "false" },
        { name: "author_id", type: "integer", foreignKey: { entity: "users", field: "id" } },
        { name: "created_at", type: "timestamp", default: "now()" },
        { name: "updated_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e3", name: "comments", position: { x: 650, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "body", type: "text" },
        { name: "post_id", type: "integer", foreignKey: { entity: "posts", field: "id" } },
        { name: "user_id", type: "integer", foreignKey: { entity: "users", field: "id" } },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e4", name: "tags", position: { x: 350, y: 300 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "name", type: "varchar", unique: true },
        { name: "slug", type: "varchar", unique: true },
      ]},
      { id: "e5", name: "post_tags", position: { x: 550, y: 300 }, fields: [
        { name: "post_id", type: "integer", foreignKey: { entity: "posts", field: "id" } },
        { name: "tag_id", type: "integer", foreignKey: { entity: "tags", field: "id" } },
      ]},
    );
    relationships.push(
      { id: "r1", from: "users", fromField: "id", to: "posts", toField: "author_id", type: "one-to-many" },
      { id: "r2", from: "posts", fromField: "id", to: "comments", toField: "post_id", type: "one-to-many" },
      { id: "r3", from: "users", fromField: "id", to: "comments", toField: "user_id", type: "one-to-many" },
      { id: "r4", from: "posts", fromField: "id", to: "post_tags", toField: "post_id", type: "one-to-many" },
      { id: "r5", from: "tags", fromField: "id", to: "post_tags", toField: "tag_id", type: "one-to-many" },
    );
  } else if (desc.includes("ecommerce") || desc.includes("shop") || desc.includes("product") || desc.includes("order")) {
    entities.push(
      { id: "e1", name: "customers", position: { x: 50, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "email", type: "varchar", unique: true },
        { name: "name", type: "varchar" },
        { name: "address", type: "jsonb", nullable: true },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e2", name: "products", position: { x: 350, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "name", type: "varchar" },
        { name: "description", type: "text" },
        { name: "price", type: "decimal" },
        { name: "stock", type: "integer", default: "0" },
        { name: "category_id", type: "integer", foreignKey: { entity: "categories", field: "id" } },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e3", name: "categories", position: { x: 350, y: 300 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "name", type: "varchar" },
        { name: "slug", type: "varchar", unique: true },
      ]},
      { id: "e4", name: "orders", position: { x: 650, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "customer_id", type: "integer", foreignKey: { entity: "customers", field: "id" } },
        { name: "status", type: "varchar", default: "'pending'" },
        { name: "total", type: "decimal" },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e5", name: "order_items", position: { x: 650, y: 300 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "order_id", type: "integer", foreignKey: { entity: "orders", field: "id" } },
        { name: "product_id", type: "integer", foreignKey: { entity: "products", field: "id" } },
        { name: "quantity", type: "integer" },
        { name: "price", type: "decimal" },
      ]},
    );
    relationships.push(
      { id: "r1", from: "customers", fromField: "id", to: "orders", toField: "customer_id", type: "one-to-many" },
      { id: "r2", from: "orders", fromField: "id", to: "order_items", toField: "order_id", type: "one-to-many" },
      { id: "r3", from: "products", fromField: "id", to: "order_items", toField: "product_id", type: "one-to-many" },
      { id: "r4", from: "categories", fromField: "id", to: "products", toField: "category_id", type: "one-to-many" },
    );
  } else {
    entities.push(
      { id: "e1", name: "users", position: { x: 50, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "email", type: "varchar", unique: true },
        { name: "name", type: "varchar" },
        { name: "role", type: "varchar", default: "'user'" },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e2", name: "projects", position: { x: 350, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "name", type: "varchar" },
        { name: "description", type: "text", nullable: true },
        { name: "owner_id", type: "integer", foreignKey: { entity: "users", field: "id" } },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
      { id: "e3", name: "tasks", position: { x: 650, y: 50 }, fields: [
        { name: "id", type: "serial", primary: true },
        { name: "title", type: "varchar" },
        { name: "status", type: "varchar", default: "'todo'" },
        { name: "project_id", type: "integer", foreignKey: { entity: "projects", field: "id" } },
        { name: "assignee_id", type: "integer", nullable: true, foreignKey: { entity: "users", field: "id" } },
        { name: "created_at", type: "timestamp", default: "now()" },
      ]},
    );
    relationships.push(
      { id: "r1", from: "users", fromField: "id", to: "projects", toField: "owner_id", type: "one-to-many" },
      { id: "r2", from: "projects", fromField: "id", to: "tasks", toField: "project_id", type: "one-to-many" },
      { id: "r3", from: "users", fromField: "id", to: "tasks", toField: "assignee_id", type: "one-to-many" },
    );
  }

  return { entities, relationships };
}

function generateMigration(model: DataModel): Migration {
  const lines: string[] = [];
  for (const entity of model.entities) {
    lines.push(`CREATE TABLE IF NOT EXISTS ${entity.name} (`);
    const fieldLines = entity.fields.map(f => {
      let col = `  ${f.name} ${f.type.toUpperCase()}`;
      if (f.primary) col += " PRIMARY KEY";
      if (f.unique) col += " UNIQUE";
      if (!f.nullable && !f.primary) col += " NOT NULL";
      if (f.default) col += ` DEFAULT ${f.default}`;
      return col;
    });
    const fks = entity.fields.filter(f => f.foreignKey).map(f =>
      `  FOREIGN KEY (${f.name}) REFERENCES ${f.foreignKey!.entity}(${f.foreignKey!.field})`
    );
    lines.push([...fieldLines, ...fks].join(",\n"));
    lines.push(");\n");
  }
  return { sql: lines.join("\n"), description: `Create ${model.entities.length} tables with ${model.relationships.length} relationships` };
}

export function designModel(description: string): { model: DataModel; migration: Migration } {
  const model = generateFromDescription(description);
  const migration = generateMigration(model);
  return { model, migration };
}
