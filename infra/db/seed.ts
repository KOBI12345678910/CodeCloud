import pg from "pg";

/**
 * Seed two demo tenants and one user each so RLS tests have data to exercise.
 * Run via:  pnpm --filter @platform/db exec tsx infra/db/seed.ts
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query(`
    INSERT INTO tenants (id, name, slug, data_residency)
    VALUES
      ('00000000-0000-0000-0000-00000000aaaa', 'Acme', 'acme', 'us'),
      ('00000000-0000-0000-0000-00000000bbbb', 'Globex', 'globex', 'eu')
    ON CONFLICT (slug) DO NOTHING;
  `);
  await client.query(`
    INSERT INTO users (id, tenant_id, email, display_name, locale)
    VALUES
      ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000aaaa', 'alice@acme.test', 'Alice', 'en'),
      ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000bbbb', 'bob@globex.test',  'Bob', 'es')
    ON CONFLICT DO NOTHING;
  `);
  await client.query(`
    INSERT INTO data_residency (region, description) VALUES
      ('us', 'United States'),
      ('eu', 'European Union'),
      ('ap', 'Asia-Pacific')
    ON CONFLICT (region) DO NOTHING;
  `);
  await client.end();
  console.log("Seeded demo tenants and users.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
