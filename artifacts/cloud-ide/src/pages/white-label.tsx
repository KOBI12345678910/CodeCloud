import { useState } from "react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const api = (p: string) => `${basePath}/api${p}`;

export default function WhiteLabelPage() {
  const [orgId] = useState("demo-org");
  const [config, setConfig] = useState<any>(null);
  const [tab, setTab] = useState<"branding" | "domain" | "emails" | "features" | "seo">("branding");
  const [form, setForm] = useState({
    appName: "CodeCloud", tagline: "Build anything with AI",
    primaryColor: "#6366f1", accentColor: "#8b5cf6",
    backgroundColor: "#0f172a", textColor: "#f8fafc",
    fontFamily: "Inter", customDomain: "", hidePoweredBy: false,
  });

  const load = async () => {
    const r = await fetch(api(`/white-label/${orgId}`));
    const d = await r.json();
    if (d.configured) { setConfig(d.config); }
  };

  const save = async () => {
    const method = config ? "PATCH" : "POST";
    const r = await fetch(api(`/white-label/${orgId}`), {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        branding: { appName: form.appName, tagline: form.tagline, primaryColor: form.primaryColor, accentColor: form.accentColor, backgroundColor: form.backgroundColor, textColor: form.textColor, fontFamily: form.fontFamily },
        domain: { customDomain: form.customDomain || undefined },
        features: { hidePoweredBy: form.hidePoweredBy },
      }),
    });
    setConfig(await r.json());
  };

  const tabs = ["branding", "domain", "emails", "features", "seo"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">White Label</h1>
          <p className="text-muted-foreground mt-1">Enterprise custom branding — make the platform completely yours</p>
          <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded mt-2 inline-block">Enterprise Only</span>
        </div>

        <div className="flex gap-2 border-b border-border pb-2">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm capitalize ${tab === t ? "bg-primary text-primary-foreground rounded" : "text-muted-foreground"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "branding" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Brand Settings</h2>
              {[
                { label: "App Name", key: "appName" },
                { label: "Tagline", key: "tagline" },
                { label: "Font Family", key: "fontFamily" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm text-muted-foreground">{f.label}</label>
                  <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm mt-1" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
              {[
                { label: "Primary Color", key: "primaryColor" },
                { label: "Accent Color", key: "accentColor" },
                { label: "Background", key: "backgroundColor" },
                { label: "Text Color", key: "textColor" },
              ].map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <input type="color" className="w-8 h-8 rounded border-0 cursor-pointer" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
                  <div>
                    <div className="text-sm">{f.label}</div>
                    <div className="text-xs text-muted-foreground font-mono">{(form as any)[f.key]}</div>
                  </div>
                </div>
              ))}
              <button onClick={save} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm w-full">Save Branding</button>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Preview</h2>
              <div className="rounded-lg overflow-hidden border border-border" style={{ backgroundColor: form.backgroundColor }}>
                <div className="p-4 border-b" style={{ borderColor: form.primaryColor + "40" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: form.primaryColor }} />
                    <span className="font-bold" style={{ color: form.textColor, fontFamily: form.fontFamily }}>{form.appName}</span>
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <h3 className="text-xl font-bold" style={{ color: form.textColor, fontFamily: form.fontFamily }}>{form.tagline}</h3>
                  <button className="px-4 py-2 rounded text-sm text-white" style={{ backgroundColor: form.primaryColor }}>Get Started</button>
                  <button className="px-4 py-2 rounded text-sm ml-2" style={{ color: form.accentColor, border: `1px solid ${form.accentColor}` }}>Learn More</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "domain" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Custom Domain</h2>
            <input className="w-full bg-background border border-border rounded px-3 py-2 text-sm" placeholder="ide.yourcompany.com" value={form.customDomain} onChange={e => setForm({ ...form, customDomain: e.target.value })} />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>CNAME: {orgId}.codecloud.app</p>
              <p>SSL: Auto-provisioned via Let's Encrypt</p>
            </div>
            <button onClick={save} className="bg-primary text-primary-foreground rounded px-4 py-2 text-sm">Save Domain</button>
          </div>
        )}

        {tab === "features" && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-semibold">Feature Controls</h2>
            {[
              { label: 'Hide "Powered by CodeCloud" badge', key: "hidePoweredBy" },
            ].map(f => (
              <label key={f.key} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.checked })} className="rounded" />
                <span className="text-sm">{f.label}</span>
              </label>
            ))}
            <button onClick={() => { load(); }} className="border border-border rounded px-4 py-2 text-sm">Load Config</button>
          </div>
        )}

        {["emails", "seo"].includes(tab) && (
          <div className="bg-card border border-border rounded-lg p-6 text-center space-y-3">
            <div className="text-4xl">{tab === "emails" ? "📧" : "🔍"}</div>
            <h2 className="text-lg font-semibold">{tab === "emails" ? "Custom Email Templates" : "SEO & Social"}</h2>
            <p className="text-muted-foreground text-sm">Configure custom {tab === "emails" ? "email sender, templates, and SMTP" : "page titles, descriptions, and OG images"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
