import React, { useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowLeft, Users, Link2, Copy, Video } from "lucide-react";

export default function LiveSharePage(): React.ReactElement {
  const { theme } = useTheme();
  const [sessions] = useState([
    { id: "ls_1", name: "Pair Programming", participants: 2, status: "active" },
    { id: "ls_2", name: "Code Review", participants: 3, status: "active" },
  ]);

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-background text-foreground" : "bg-gray-50 text-gray-900"}`}>
      <header className="border-b border-border/50 h-14 flex items-center px-6 gap-4">
        <Link href="/dashboard"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <Users className="w-5 h-5 text-primary" />
        <h1 className="font-semibold">Live Share</h1>
        <div className="flex-1" />
        <Button size="sm" className="gap-1.5"><Video className="w-3.5 h-3.5" /> New Session</Button>
      </header>
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Join a Session</CardTitle></CardHeader>
          <CardContent className="flex gap-3">
            <Input placeholder="Enter session code..." className="flex-1" />
            <Button>Join</Button>
          </CardContent>
        </Card>
        <h2 className="text-sm font-medium text-muted-foreground">Active Sessions</h2>
        {sessions.map(session => (
          <Card key={session.id}>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium text-sm">{session.name}</p>
                <p className="text-xs text-muted-foreground">{session.participants} participants</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1"><Copy className="w-3 h-3" /> Copy Link</Button>
                <Button size="sm" className="gap-1"><Link2 className="w-3 h-3" /> Join</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
