import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowLeft, Github, Upload, FolderArchive } from "lucide-react";

export default function ImportProjectPage(): React.ReactElement {
  const { theme } = useTheme();
  const [repoUrl, setRepoUrl] = useState("");

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      <header className="border-b border-border/50 h-14 flex items-center px-6 gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="font-semibold">Import Project</h1>
      </header>
      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Github className="w-5 h-5" /> Import from GitHub</CardTitle>
            <CardDescription>Clone a GitHub repository into CodeCloud</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="https://github.com/user/repo" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
            <Button className="w-full">Import Repository</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FolderArchive className="w-5 h-5" /> Import from ZIP</CardTitle>
            <CardDescription>Upload a ZIP file containing your project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drag & drop a ZIP file or click to browse</p>
              <Button variant="outline" className="mt-4">Choose File</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
