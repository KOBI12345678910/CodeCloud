import SnippetLibrary from "@/components/SnippetLibrary";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SnippetsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Snippet Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse, save, and share reusable code snippets
            </p>
          </div>
          <div className="border border-border/30 rounded-lg overflow-hidden h-[calc(100vh-220px)]">
            <SnippetLibrary />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
