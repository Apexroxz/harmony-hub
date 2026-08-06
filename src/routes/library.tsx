import { createFileRoute, Link } from "@tanstack/react-router";
import { Library, Music2, Headphones, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your Library — Layam" },
      { name: "description", content: "Your liked songs, playlists, and offline music in one place." },
      { property: "og:title", content: "Your Library — Layam" },
      { property: "og:description", content: "Your liked songs, playlists, and offline music in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 pb-32 pt-24 sm:px-6 lg:px-8">
      <div className="w-full rounded-3xl border border-border/60 bg-surface-raised/70 p-8 shadow-sm sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Library className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Your Library</p>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Your Library</h1>
          </div>
        </div>

        <p className="max-w-2xl text-lg text-muted-foreground">
          Your liked songs, playlists and offline music will appear here.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Music2 className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground">Keep your favorites close</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Save tracks you love and pick up right where you left off.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-background/50 p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Headphones className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-foreground">Offline listening ready</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Access your downloaded and saved music even when you are offline.
            </p>
          </div>
        </div>

        <Button asChild size="lg" className="mt-8 bg-gradient-to-r from-violet to-cyan text-primary-foreground hover:opacity-90">
          <Link to="/browse">
            Browse Music
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
