import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

const errors = [
  { id: "1", message: "TypeError: Cannot read properties of undefined", count: 23, status: "open", lastSeen: "2 min ago", file: "src/utils.ts:45" },
  { id: "2", message: "NetworkError: Failed to fetch", count: 12, status: "open", lastSeen: "15 min ago", file: "src/api.ts:112" },
  { id: "3", message: "RangeError: Maximum call stack exceeded", count: 5, status: "resolved", lastSeen: "2 hours ago", file: "src/parser.ts:78" },
];

export default function ErrorTrackingPage(): React.ReactElement {
  const { theme } = useTheme();
  const [filter, setFilter] = useState("all");

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      <header className="border-b border-border/50 h-14 flex items-center px-6 gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h1 className="font-semibold">Error Tracking</h1>
        <div className="flex-1" />
        <div className="flex gap-1">
          {["all", "open", "resolved"].map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-6 space-y-4">
        {errors.filter(e => filter === "all" || e.status === filter).map(error => (
          <Card key={error.id}>
            <CardContent className="flex items-center gap-4 py-4">
              {error.status === "open" ? <XCircle className="w-5 h-5 text-destructive shrink-0" /> : <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm truncate">{error.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{error.file}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium">{error.count}x</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{error.lastSeen}</p>
              </div>
              <Button variant="outline" size="sm">{error.status === "open" ? "Resolve" : "Reopen"}</Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
