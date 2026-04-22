import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowLeft, Search, Star, Download, Layout } from "lucide-react";

const templates = [
  { id: "1", name: "React + Vite Starter", category: "web", stars: 1234, uses: 5678, description: "Modern React app with Vite, TailwindCSS, and TypeScript" },
  { id: "2", name: "Express API", category: "api", stars: 890, uses: 3456, description: "RESTful API with Express, Drizzle ORM, and PostgreSQL" },
  { id: "3", name: "Python Flask", category: "api", stars: 567, uses: 2345, description: "Flask API with SQLAlchemy and JWT authentication" },
  { id: "4", name: "Next.js Full Stack", category: "web", stars: 2345, uses: 8901, description: "Full-stack Next.js with App Router and Prisma" },
  { id: "5", name: "Unity Game", category: "game", stars: 345, uses: 1234, description: "2D platformer game template with Unity" },
  { id: "6", name: "ML Notebook", category: "ai", stars: 678, uses: 2345, description: "Jupyter notebook with PyTorch and data analysis tools" },
];

export default function TemplateStorePage(): React.ReactElement {
  const { theme } = useTheme();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const categories = ["all", "web", "api", "mobile", "game", "ai"];
  const filtered = templates.filter(t =>
    (category === "all" || t.category === category) &&
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      <header className="border-b border-border/50 h-14 flex items-center px-6 gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <Layout className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">Template Store</h1>
      </header>
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search templates..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1">
            {categories.map(cat => (
              <Button key={cat} variant={category === cat ? "default" : "outline"} size="sm" onClick={() => setCategory(cat)} className="capitalize">{cat}</Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(template => (
            <Card key={template.id} className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <CardTitle className="text-sm">{template.name}</CardTitle>
                <CardDescription className="text-xs">{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {template.stars}</span>
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {template.uses}</span>
                  </div>
                  <Button size="sm" variant="outline">Use Template</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
