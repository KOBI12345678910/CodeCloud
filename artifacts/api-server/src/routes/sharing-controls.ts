import { Router } from "express";
const r = Router();

interface ProjectVisibility {
  projectId: string;
  visibility: "public" | "internal" | "private" | "unlisted";
  shareLink: string | null;
  shareLinkEnabled: boolean;
  shareLinkExpiry: string | null;
  embedEnabled: boolean;
  embedAllowedDomains: string[];
  forkingAllowed: boolean;
  downloadAllowed: boolean;
  commentingAllowed: boolean;
  indexable: boolean;
  showInExplore: boolean;
  requireApproval: boolean;
  accessControl: {
    viewers: string[];
    editors: string[];
    admins: string[];
    teams: string[];
    orgWide: boolean;
  };
  socialSharing: {
    title: string;
    description: string;
    image: string | null;
  };
  updatedAt: string;
}

const visibilities = new Map<string, ProjectVisibility>();

r.get("/sharing/:projectId", (req, res) => {
  const v = visibilities.get(req.params.projectId);
  if (!v) {
    return res.json({
      projectId: req.params.projectId,
      visibility: "private",
      shareLink: null,
      shareLinkEnabled: false,
      shareLinkExpiry: null,
      embedEnabled: false,
      embedAllowedDomains: [],
      forkingAllowed: false,
      downloadAllowed: false,
      commentingAllowed: true,
      indexable: false,
      showInExplore: false,
      requireApproval: false,
      accessControl: { viewers: [], editors: [], admins: [], teams: [], orgWide: false },
      socialSharing: { title: "", description: "", image: null },
      updatedAt: new Date().toISOString(),
    });
  }
  res.json(v);
});

r.patch("/sharing/:projectId", (req, res) => {
  const { projectId } = req.params;
  let v = visibilities.get(projectId);
  if (!v) {
    v = {
      projectId, visibility: "private", shareLink: null, shareLinkEnabled: false, shareLinkExpiry: null,
      embedEnabled: false, embedAllowedDomains: [], forkingAllowed: false, downloadAllowed: false,
      commentingAllowed: true, indexable: false, showInExplore: false, requireApproval: false,
      accessControl: { viewers: [], editors: [], admins: [], teams: [], orgWide: false },
      socialSharing: { title: "", description: "", image: null },
      updatedAt: new Date().toISOString(),
    };
  }
  const fields = ["visibility", "shareLinkEnabled", "shareLinkExpiry", "embedEnabled", "embedAllowedDomains", "forkingAllowed", "downloadAllowed", "commentingAllowed", "indexable", "showInExplore", "requireApproval"];
  for (const f of fields) if (req.body[f] !== undefined) (v as any)[f] = req.body[f];
  if (req.body.accessControl) Object.assign(v.accessControl, req.body.accessControl);
  if (req.body.socialSharing) Object.assign(v.socialSharing, req.body.socialSharing);

  if (req.body.visibility === "public") {
    v.indexable = true;
    v.showInExplore = true;
    v.forkingAllowed = true;
  } else if (req.body.visibility === "private") {
    v.indexable = false;
    v.showInExplore = false;
  }

  v.updatedAt = new Date().toISOString();
  visibilities.set(projectId, v);
  res.json(v);
});

r.post("/sharing/:projectId/generate-link", (req, res) => {
  const { projectId } = req.params;
  let v = visibilities.get(projectId);
  if (!v) return res.status(404).json({ error: "set visibility first" });
  const token = Buffer.from(`${projectId}_${Date.now()}`).toString("base64url");
  v.shareLink = `https://codecloud.app/shared/${token}`;
  v.shareLinkEnabled = true;
  v.updatedAt = new Date().toISOString();
  res.json({ shareLink: v.shareLink });
});

r.post("/sharing/:projectId/revoke-link", (req, res) => {
  const v = visibilities.get(req.params.projectId);
  if (!v) return res.status(404).json({ error: "not found" });
  v.shareLink = null;
  v.shareLinkEnabled = false;
  v.updatedAt = new Date().toISOString();
  res.json({ revoked: true });
});

r.get("/sharing/:projectId/embed-code", (req, res) => {
  const v = visibilities.get(req.params.projectId);
  if (!v || !v.embedEnabled) return res.status(403).json({ error: "embedding not enabled" });
  res.json({
    iframe: `<iframe src="https://codecloud.app/embed/${req.params.projectId}" width="100%" height="600" frameborder="0" allow="clipboard-write"></iframe>`,
    react: `<CodeCloudEmbed projectId="${req.params.projectId}" height={600} />`,
    script: `<div id="codecloud-embed" data-project="${req.params.projectId}"></div><script src="https://codecloud.app/embed.js"></script>`,
  });
});

export default r;
