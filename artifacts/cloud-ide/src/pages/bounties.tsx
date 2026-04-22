import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useUser } from "@clerk/react";
import {
  Award, DollarSign, Tag, Users as UsersIcon, Plus, ArrowLeft, Star, Send, Search,
} from "lucide-react";
import MarketingHeader from "@/components/MarketingHeader";
import MarketingFooter from "@/components/MarketingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const API = `${import.meta.env.VITE_API_URL || ""}/api`;

type Bounty = {
  id: string;
  title: string;
  description: string;
  category: string;
  budgetUsd: number;
  difficulty: "easy" | "medium" | "hard" | "expert";
  status: "open" | "in_progress" | "completed" | "cancelled";
  posterName: string;
  assigneeName?: string;
  tags: string[];
  createdAt: string;
  applications: { id: string; applicantName: string; message: string; createdAt: string }[];
  reviews: { id: string; reviewerName: string; rating: number; comment: string }[];
  averageRating?: number;
};

const STATUS_COLOR: Record<string, string> = {
  open: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  in_progress: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: "text-emerald-400",
  medium: "text-amber-400",
  hard: "text-orange-400",
  expert: "text-red-400",
};

function BountyDetailView({ id }: { id: string }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const res = await fetch(`${API}/bounties/${id}`);
    if (res.ok) setBounty(await res.json());
  };

  useEffect(() => { reload(); }, [id]);

  const apply = async () => {
    if (!user) { toast({ title: "Sign in to apply", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/bounties/${id}/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: applyMessage }),
      });
      if (res.ok) { toast({ title: "Application submitted" }); setApplyMessage(""); reload(); }
      else toast({ title: "Failed to apply", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const submitReview = async () => {
    if (!user) { toast({ title: "Sign in to review", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/bounties/${id}/reviews`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      if (res.ok) { toast({ title: "Review posted" }); setReviewComment(""); reload(); }
      else toast({ title: "Failed to review", variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (!bounty) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10" data-testid="bounty-detail">
      <Link href="/bounties">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5"><ArrowLeft className="w-3.5 h-3.5" /> All bounties</Button>
      </Link>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h1 className="text-3xl font-bold">{bounty.title}</h1>
        <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLOR[bounty.status]}`}>{bounty.status.replace("_", " ")}</span>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> ${bounty.budgetUsd.toLocaleString()}</span>
        <span className={`flex items-center gap-1 ${DIFFICULTY_COLOR[bounty.difficulty]}`}>{bounty.difficulty}</span>
        <span>by {bounty.posterName}</span>
        {bounty.averageRating ? (
          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" /> {bounty.averageRating.toFixed(1)}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1 mb-6">
        {bounty.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
      </div>
      <p className="whitespace-pre-line leading-relaxed text-foreground/90 mb-8">{bounty.description}</p>

      {bounty.status === "open" && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Send className="w-4 h-4" /> Apply</h2>
            <Textarea
              value={applyMessage} onChange={(e) => setApplyMessage(e.target.value)}
              placeholder="Tell the poster why you're a good fit..."
              data-testid="bounty-apply-message"
              className="mb-3"
            />
            <Button onClick={apply} disabled={busy || applyMessage.length < 5} data-testid="bounty-apply-submit">Submit application</Button>
          </CardContent>
        </Card>
      )}

      {bounty.status === "completed" && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4" /> Leave a review</h2>
            <div className="flex gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setReviewRating(n)} className="p-1">
                  <Star className={`w-5 h-5 ${n <= reviewRating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`} />
                </button>
              ))}
            </div>
            <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." className="mb-3" />
            <Button onClick={submitReview} disabled={busy || reviewComment.length < 3}>Post review</Button>
          </CardContent>
        </Card>
      )}

      {bounty.applications.length > 0 && (
        <section className="mb-8">
          <h3 className="font-semibold mb-3">{bounty.applications.length} applications</h3>
          <div className="space-y-2">
            {bounty.applications.map((a) => (
              <div key={a.id} className="p-3 rounded border border-border/50 text-sm">
                <div className="font-medium">{a.applicantName}</div>
                <div className="text-muted-foreground mt-1">{a.message}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {bounty.reviews.length > 0 && (
        <section>
          <h3 className="font-semibold mb-3">Reviews</h3>
          <div className="space-y-2">
            {bounty.reviews.map((r) => (
              <div key={r.id} className="p-3 rounded border border-border/50 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{r.reviewerName}</span>
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-3 h-3 ${n <= r.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`} />
                    ))}
                  </span>
                </div>
                <p className="text-muted-foreground">{r.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PostBountyForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "backend", budgetUsd: 500, difficulty: "medium" as const, tags: "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user) { toast({ title: "Sign in to post a bounty", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await fetch(`${API}/bounties`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budgetUsd: Number(form.budgetUsd),
          tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        toast({ title: "Bounty posted" });
        setForm({ title: "", description: "", category: "backend", budgetUsd: 500, difficulty: "medium", tags: "" });
        setOpen(false);
        onCreated();
      } else toast({ title: "Failed", variant: "destructive" });
    } finally { setBusy(false); }
  };

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-1.5" data-testid="bounty-post-open">
        <Plus className="w-4 h-4" /> Post a bounty
      </Button>
    );
  }

  return (
    <Card className="mb-6" data-testid="bounty-post-form">
      <CardContent className="p-5 space-y-3">
        <Input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="bounty-form-title" />
        <Textarea placeholder="Describe the work, deliverables, and acceptance criteria..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} data-testid="bounty-form-description" />
        <div className="grid grid-cols-3 gap-3">
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="backend">Backend</SelectItem>
              <SelectItem value="frontend">Frontend</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="devops">DevOps</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="tools">Tools</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" min={10} placeholder="Budget USD" value={form.budgetUsd} onChange={(e) => setForm({ ...form, budgetUsd: Number(e.target.value) })} data-testid="bounty-form-budget" />
          <Select value={form.difficulty} onValueChange={(v: any) => setForm({ ...form, difficulty: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="expert">Expert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input placeholder="Tags (comma separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <div className="flex gap-2">
          <Button onClick={submit} disabled={busy || form.title.length < 3 || form.description.length < 10} data-testid="bounty-form-submit">Post bounty</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BountiesPage() {
  const [matchDetail, params] = useRoute("/bounties/:id");
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [filters, setFilters] = useState({ q: "", category: "all", difficulty: "all", status: "all", maxBudget: "" });

  const reload = () => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.difficulty !== "all") params.set("difficulty", filters.difficulty);
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.maxBudget) params.set("maxBudget", filters.maxBudget);
    fetch(`${API}/bounties?${params}`).then((r) => r.json()).then((d) => setBounties(d.bounties || []));
  };

  useEffect(() => { reload(); }, [filters.category, filters.difficulty, filters.status, filters.maxBudget]);
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="bounties-page">
      <MarketingHeader />
      {matchDetail && params?.id ? (
        <main><BountyDetailView id={params.id} /></main>
      ) : (
        <main className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-2"><Award className="w-8 h-8 text-primary" /> Bounties</h1>
              <p className="text-muted-foreground mt-1">Get paid to ship code, design, and ops for the community.</p>
            </div>
            <PostBountyForm onCreated={reload} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search bounties..." className="pl-9" data-testid="bounty-filter-q" />
            </div>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger data-testid="bounty-filter-category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "backend", "frontend", "design", "devops", "database", "testing", "tools"].map((c) => <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.difficulty} onValueChange={(v) => setFilters({ ...filters, difficulty: v })}>
              <SelectTrigger data-testid="bounty-filter-difficulty"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "easy", "medium", "hard", "expert"].map((d) => <SelectItem key={d} value={d}>{d === "all" ? "Any difficulty" : d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger data-testid="bounty-filter-status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {bounties.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No bounties match those filters.</div>
          ) : (
            <div className="space-y-3">
              {bounties.map((b) => (
                <Link key={b.id} href={`/bounties/${b.id}`}>
                  <Card className="hover:border-primary/40 transition-colors cursor-pointer" data-testid={`bounty-card-${b.id}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{b.title}</h3>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLOR[b.status]}`}>{b.status.replace("_", " ")}</span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{b.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {b.category}</span>
                            <span className={`${DIFFICULTY_COLOR[b.difficulty]}`}>{b.difficulty}</span>
                            <span className="flex items-center gap-1"><UsersIcon className="w-3 h-3" /> {b.applications.length} applicants</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold text-primary flex items-center gap-1"><DollarSign className="w-4 h-4" />{b.budgetUsd.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">USD</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </main>
      )}
      <MarketingFooter />
    </div>
  );
}
