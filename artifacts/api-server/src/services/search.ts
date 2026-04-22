import { db, projectsTable, filesTable, usersTable } from "@workspace/db";
import { sql, eq, and, or, ilike, desc, asc } from "drizzle-orm";

export interface SearchOptions {
  query: string;
  userId?: string;
  scope?: "all" | "own" | "public";
  language?: string;
  type?: "projects" | "files" | "all";
  sort?: "relevance" | "recent" | "name";
  limit?: number;
  offset?: number;
}

export interface SearchHighlight {
  field: string;
  snippet: string;
}

export interface ProjectSearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  language: string;
  isPublic: boolean;
  ownerName: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  highlights: SearchHighlight[];
  rank: number;
}

export interface FileSearchResult {
  id: string;
  projectId: string;
  projectName: string;
  path: string;
  name: string;
  highlights: SearchHighlight[];
  rank: number;
}

export interface SearchResponse {
  projects: ProjectSearchResult[];
  files: FileSearchResult[];
  totalProjects: number;
  totalFiles: number;
  facets: {
    languages: { value: string; count: number }[];
    visibility: { value: string; count: number }[];
  };
  query: string;
  took: number;
}

export interface AutocompleteResult {
  type: "project" | "file" | "language";
  text: string;
  detail?: string;
  id?: string;
}

function sanitizeTsQuery(input: string): string {
  const cleaned = input.replace(/[^\w\s-]/g, " ").trim();
  if (!cleaned) return "";
  const terms = cleaned.split(/\s+/).filter(Boolean);
  return terms.map((t) => `${t}:*`).join(" & ");
}

function buildAccessConditions(userId?: string, scope?: string) {
  if (scope === "own" && userId) {
    return and(
      eq(projectsTable.ownerId, userId),
      eq(projectsTable.isArchived, false)
    );
  }
  if (scope === "public") {
    return and(
      eq(projectsTable.isPublic, true),
      eq(projectsTable.isArchived, false)
    );
  }
  if (userId) {
    return and(
      or(
        eq(projectsTable.isPublic, true),
        eq(projectsTable.ownerId, userId)
      ),
      eq(projectsTable.isArchived, false)
    );
  }
  return and(
    eq(projectsTable.isPublic, true),
    eq(projectsTable.isArchived, false)
  );
}

export async function searchProjects(opts: SearchOptions): Promise<{
  results: ProjectSearchResult[];
  total: number;
}> {
  const limit = Math.min(opts.limit || 20, 100);
  const offset = opts.offset || 0;
  const tsQuery = sanitizeTsQuery(opts.query);

  if (!tsQuery) return { results: [], total: 0 };

  const accessCondition = buildAccessConditions(opts.userId, opts.scope);

  const languageFilter = opts.language
    ? eq(projectsTable.language, opts.language)
    : undefined;

  const whereConditions = languageFilter
    ? and(accessCondition, languageFilter)
    : accessCondition;

  const results = await db.execute(sql`
    SELECT
      p.id,
      p.name,
      p.slug,
      p.description,
      p.language,
      p.is_public,
      p.owner_id,
      u.username AS owner_name,
      p.created_at,
      p.updated_at,
      ts_rank(
        setweight(to_tsvector('english', coalesce(p.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(p.slug, '')), 'C'),
        to_tsquery('english', ${tsQuery})
      ) AS rank,
      ts_headline('english', coalesce(p.name, ''), to_tsquery('english', ${tsQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=5') AS name_highlight,
      ts_headline('english', coalesce(p.description, ''), to_tsquery('english', ${tsQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=10') AS desc_highlight
    FROM projects p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE (
      to_tsvector('english', coalesce(p.name, '')) ||
      to_tsvector('english', coalesce(p.description, '')) ||
      to_tsvector('english', coalesce(p.slug, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${opts.scope === "public" ? sql`AND p.is_public = true` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    ${opts.language ? sql`AND p.language = ${opts.language}` : sql``}
    ORDER BY ${opts.sort === "recent" ? sql`p.updated_at DESC` : opts.sort === "name" ? sql`p.name ASC` : sql`rank DESC`}
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT count(*)::int AS total
    FROM projects p
    WHERE (
      to_tsvector('english', coalesce(p.name, '')) ||
      to_tsvector('english', coalesce(p.description, '')) ||
      to_tsvector('english', coalesce(p.slug, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${opts.scope === "public" ? sql`AND p.is_public = true` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    ${opts.language ? sql`AND p.language = ${opts.language}` : sql``}
  `);

  const rows = results.rows as any[];
  const total = (countResult.rows[0] as any)?.total || 0;

  return {
    results: rows.map((row) => {
      const highlights: SearchHighlight[] = [];
      if (row.name_highlight && row.name_highlight.includes("<mark>")) {
        highlights.push({ field: "name", snippet: row.name_highlight });
      }
      if (row.desc_highlight && row.desc_highlight.includes("<mark>")) {
        highlights.push({ field: "description", snippet: row.desc_highlight });
      }
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        language: row.language,
        isPublic: row.is_public,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        highlights,
        rank: parseFloat(row.rank),
      };
    }),
    total,
  };
}

export async function searchFiles(opts: SearchOptions): Promise<{
  results: FileSearchResult[];
  total: number;
}> {
  const limit = Math.min(opts.limit || 20, 100);
  const offset = opts.offset || 0;
  const tsQuery = sanitizeTsQuery(opts.query);

  if (!tsQuery) return { results: [], total: 0 };

  const results = await db.execute(sql`
    SELECT
      f.id,
      f.project_id,
      p.name AS project_name,
      f.path,
      f.name,
      ts_rank(
        setweight(to_tsvector('english', coalesce(f.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(f.content, '')), 'B'),
        to_tsquery('english', ${tsQuery})
      ) AS rank,
      ts_headline('english', coalesce(f.content, ''), to_tsquery('english', ${tsQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=30, MinWords=8, MaxFragments=3, FragmentDelimiter= ... ') AS content_highlight,
      ts_headline('english', coalesce(f.name, ''), to_tsquery('english', ${tsQuery}),
        'StartSel=<mark>, StopSel=</mark>, MaxWords=10, MinWords=3') AS name_highlight
    FROM files f
    JOIN projects p ON f.project_id = p.id
    WHERE f.is_directory = false
    AND f.content IS NOT NULL
    AND (
      to_tsvector('english', coalesce(f.name, '')) ||
      to_tsvector('english', coalesce(f.content, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${opts.scope === "public" ? sql`AND p.is_public = true` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    ${opts.language ? sql`AND p.language = ${opts.language}` : sql``}
    ORDER BY ${opts.sort === "recent" ? sql`f.updated_at DESC` : opts.sort === "name" ? sql`f.name ASC` : sql`rank DESC`}
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const countResult = await db.execute(sql`
    SELECT count(*)::int AS total
    FROM files f
    JOIN projects p ON f.project_id = p.id
    WHERE f.is_directory = false
    AND f.content IS NOT NULL
    AND (
      to_tsvector('english', coalesce(f.name, '')) ||
      to_tsvector('english', coalesce(f.content, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${opts.scope === "public" ? sql`AND p.is_public = true` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    ${opts.language ? sql`AND p.language = ${opts.language}` : sql``}
  `);

  const rows = results.rows as any[];
  const total = (countResult.rows[0] as any)?.total || 0;

  return {
    results: rows.map((row) => {
      const highlights: SearchHighlight[] = [];
      if (row.name_highlight && row.name_highlight.includes("<mark>")) {
        highlights.push({ field: "name", snippet: row.name_highlight });
      }
      if (row.content_highlight && row.content_highlight.includes("<mark>")) {
        highlights.push({ field: "content", snippet: row.content_highlight });
      }
      return {
        id: row.id,
        projectId: row.project_id,
        projectName: row.project_name,
        path: row.path,
        name: row.name,
        highlights,
        rank: parseFloat(row.rank),
      };
    }),
    total,
  };
}

export async function getSearchFacets(opts: {
  query: string;
  userId?: string;
  scope?: string;
}): Promise<{
  languages: { value: string; count: number }[];
  visibility: { value: string; count: number }[];
}> {
  const tsQuery = sanitizeTsQuery(opts.query);
  if (!tsQuery) {
    return { languages: [], visibility: [] };
  }

  const languageResults = await db.execute(sql`
    SELECT p.language AS value, count(*)::int AS count
    FROM projects p
    WHERE (
      to_tsvector('english', coalesce(p.name, '')) ||
      to_tsvector('english', coalesce(p.description, '')) ||
      to_tsvector('english', coalesce(p.slug, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    GROUP BY p.language
    ORDER BY count DESC
  `);

  const visibilityResults = await db.execute(sql`
    SELECT
      CASE WHEN p.is_public THEN 'public' ELSE 'private' END AS value,
      count(*)::int AS count
    FROM projects p
    WHERE (
      to_tsvector('english', coalesce(p.name, '')) ||
      to_tsvector('english', coalesce(p.description, '')) ||
      to_tsvector('english', coalesce(p.slug, ''))
    ) @@ to_tsquery('english', ${tsQuery})
    AND p.is_archived = false
    ${opts.scope === "own" && opts.userId ? sql`AND p.owner_id = ${opts.userId}` : sql``}
    ${!opts.scope || opts.scope === "all" ? (opts.userId ? sql`AND (p.is_public = true OR p.owner_id = ${opts.userId})` : sql`AND p.is_public = true`) : sql``}
    GROUP BY p.is_public
  `);

  return {
    languages: languageResults.rows as { value: string; count: number }[],
    visibility: visibilityResults.rows as { value: string; count: number }[],
  };
}

export async function getAutocomplete(opts: {
  query: string;
  userId?: string;
  limit?: number;
}): Promise<AutocompleteResult[]> {
  const limit = Math.min(opts.limit || 8, 20);
  const q = opts.query.trim();
  if (!q) return [];

  const suggestions: AutocompleteResult[] = [];

  const languages = [
    "javascript", "typescript", "python", "html", "css", "go",
    "rust", "java", "ruby", "php", "c", "cpp", "swift", "kotlin",
  ];
  const matchingLangs = languages.filter((l) =>
    l.startsWith(q.toLowerCase())
  );
  for (const lang of matchingLangs.slice(0, 2)) {
    suggestions.push({ type: "language", text: lang, detail: "Language filter" });
  }

  const projectResults = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      language: projectsTable.language,
    })
    .from(projectsTable)
    .where(
      and(
        ilike(projectsTable.name, `%${q}%`),
        eq(projectsTable.isArchived, false),
        opts.userId
          ? or(eq(projectsTable.isPublic, true), eq(projectsTable.ownerId, opts.userId))
          : eq(projectsTable.isPublic, true)
      )
    )
    .orderBy(
      sql`CASE WHEN lower(${projectsTable.name}) LIKE ${q.toLowerCase() + "%"} THEN 0 ELSE 1 END`,
      asc(projectsTable.name)
    )
    .limit(limit - suggestions.length);

  for (const p of projectResults) {
    suggestions.push({
      type: "project",
      text: p.name,
      detail: p.language,
      id: p.id,
    });
  }

  if (suggestions.length < limit) {
    const fileResults = await db
      .select({
        id: filesTable.id,
        name: filesTable.name,
        path: filesTable.path,
        projectId: filesTable.projectId,
      })
      .from(filesTable)
      .innerJoin(projectsTable, eq(filesTable.projectId, projectsTable.id))
      .where(
        and(
          ilike(filesTable.name, `%${q}%`),
          eq(filesTable.isDirectory, false),
          eq(projectsTable.isArchived, false),
          opts.userId
            ? or(eq(projectsTable.isPublic, true), eq(projectsTable.ownerId, opts.userId))
            : eq(projectsTable.isPublic, true)
        )
      )
      .orderBy(asc(filesTable.name))
      .limit(limit - suggestions.length);

    for (const f of fileResults) {
      suggestions.push({
        type: "file",
        text: f.name,
        detail: f.path,
        id: f.id,
      });
    }
  }

  return suggestions.slice(0, limit);
}

export async function fullSearch(opts: SearchOptions): Promise<SearchResponse> {
  const start = Date.now();
  const searchType = opts.type || "all";

  const [projectData, fileData, facets] = await Promise.all([
    searchType === "files"
      ? Promise.resolve({ results: [], total: 0 })
      : searchProjects(opts),
    searchType === "projects"
      ? Promise.resolve({ results: [], total: 0 })
      : searchFiles(opts),
    getSearchFacets({
      query: opts.query,
      userId: opts.userId,
      scope: opts.scope,
    }),
  ]);

  return {
    projects: projectData.results,
    files: fileData.results,
    totalProjects: projectData.total,
    totalFiles: fileData.total,
    facets,
    query: opts.query,
    took: Date.now() - start,
  };
}
