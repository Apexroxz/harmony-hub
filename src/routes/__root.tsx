import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, Component, type ReactNode, type ErrorInfo } from "react";
import { toast } from "sonner";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth";
import { WalletProvider } from "../lib/wallet";
import { PlayerProvider } from "../lib/player";
import { LibraryProvider } from "../lib/library";
import { ModeProvider } from "../lib/mode";
import { I18nProvider } from "../lib/i18n";

import { Header } from "../components/Header";
import { PlayerBar } from "../components/PlayerBar";
import { AudioConsoleModal } from "../components/AudioConsoleModal";
import { FullscreenAudiophilePlayer } from "../components/FullscreenAudiophilePlayer";
import { usePlayer } from "../lib/player";
import { useGlobalHotkeys } from "../lib/useGlobalHotkeys";

function RootPlayerShell() {
  const { isConsoleOpen, closeConsole, isExpanded, collapsePlayer } = usePlayer();
  useGlobalHotkeys();
  return (
    <>
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1 pb-32 sm:pb-36">
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </main>
        <PlayerBar />
      </div>
      <AudioConsoleModal open={isConsoleOpen} onClose={closeConsole} />
      <FullscreenAudiophilePlayer open={isExpanded} onClose={collapsePlayer} />
    </>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error("[RootErrorComponent]", error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error?.message || "Something went wrong on our end. You can try refreshing or head back home."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

// ── React ErrorBoundary ────────────────────────────────────────────────────────
interface EBProps {
  children: ReactNode;
}
interface EBState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    reportLovableError(error, { boundary: "react_error_boundary" });
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.state.error?.message ?? "An unexpected error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Layam — Music, without boundaries." },
      { name: "description", content: "Stream, upload, and discover music without boundaries." },
      { name: "author", content: "Layam" },
      { property: "og:title", content: "Layam — Web3 Music Streaming" },
      {
        property: "og:description",
        content: "Stream, upload, and discover music without boundaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Layam" },
      { name: "twitter:title", content: "Layam — Web3 Music Streaming" },
      {
        name: "twitter:description",
        content: "Stream, upload, and discover music without boundaries.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5c4cdd89-eeb5-4c4b-992e-d18481599686/id-preview-e0dfcf83--39543f6f-cddc-4a65-b58c-bd036d69ae54.lovable.app-1785930626231.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/5c4cdd89-eeb5-4c4b-992e-d18481599686/id-preview-e0dfcf83--39543f6f-cddc-4a65-b58c-bd036d69ae54.lovable.app-1785930626231.png",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/logo.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/logo.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration fallback
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <WalletProvider>
            <ModeProvider>
              <LibraryProvider>
                <PlayerProvider>
                  <Toaster
                    position="bottom-right"
                    richColors
                    toastOptions={{
                      className: "bg-card text-foreground border-border",
                    }}
                  />
                  <RootPlayerShell />
                </PlayerProvider>
              </LibraryProvider>
            </ModeProvider>
          </WalletProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
