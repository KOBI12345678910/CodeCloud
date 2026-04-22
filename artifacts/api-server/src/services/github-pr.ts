const GITHUB_API = "https://api.github.com";

interface GHHeaders {
  Authorization: string;
  Accept: string;
  "Content-Type"?: string;
  "X-GitHub-Api-Version": string;
}

function headers(token: string): GHHeaders {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function ghFetch(url: string, token: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    ...opts,
    headers: { ...headers(token), ...(opts?.headers || {}) },
  });
  if (!res.ok) {
    const body: any = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || `GitHub API ${res.status}`);
  }
  return res.json();
}

export interface PRCreateInput {
  owner: string;
  repo: string;
  title: string;
  body?: string;
  head: string;
  base: string;
  draft?: boolean;
}

export async function createPullRequest(token: string, input: PRCreateInput) {
  return ghFetch(`${GITHUB_API}/repos/${input.owner}/${input.repo}/pulls`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title,
      body: input.body || "",
      head: input.head,
      base: input.base,
      draft: input.draft || false,
    }),
  });
}

export async function listPullRequests(token: string, owner: string, repo: string, state: string = "open") {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls?state=${state}&per_page=25&sort=updated&direction=desc`, token);
}

export async function getPullRequest(token: string, owner: string, repo: string, prNumber: number) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`, token);
}

export async function mergePullRequest(token: string, owner: string, repo: string, prNumber: number, mergeMethod: string = "merge") {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/merge`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ merge_method: mergeMethod }),
  });
}

export async function closePullRequest(token: string, owner: string, repo: string, prNumber: number) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "closed" }),
  });
}

export async function getPRComments(token: string, owner: string, repo: string, prNumber: number) {
  const [issueComments, reviewComments] = await Promise.all([
    ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`, token),
    ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`, token),
  ]);
  const all = [
    ...issueComments.map((c: any) => ({ ...c, comment_type: "issue" })),
    ...reviewComments.map((c: any) => ({ ...c, comment_type: "review" })),
  ];
  all.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return all;
}

export async function getPRReviews(token: string, owner: string, repo: string, prNumber: number) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/reviews`, token);
}

export async function getPRFiles(token: string, owner: string, repo: string, prNumber: number) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`, token);
}

export async function getCIStatus(token: string, owner: string, repo: string, ref: string) {
  const [checkRuns, commitStatus] = await Promise.all([
    ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=50`, token),
    ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${ref}/status`, token),
  ]);
  return {
    checkRuns: checkRuns.check_runs || [],
    commitStatus: commitStatus.statuses || [],
    overallState: commitStatus.state || "unknown",
  };
}

export async function listBranches(token: string, owner: string, repo: string) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=100`, token);
}

export async function addPRComment(token: string, owner: string, repo: string, prNumber: number, body: string) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${prNumber}/comments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
}

export async function requestReview(token: string, owner: string, repo: string, prNumber: number, reviewers: string[]) {
  return ghFetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${prNumber}/requested_reviewers`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewers }),
  });
}
