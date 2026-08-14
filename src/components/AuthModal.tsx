import { useState, useEffect } from "react";
import {
  Disc3,
  Mail,
  Lock,
  User,
  Sparkles,
  LogIn,
  UserPlus,
  Check,
  ArrowRight,
} from "lucide-react";
import { useAuth, type UserRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AuthModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultTab?: "signin" | "signup";
  trigger?: React.ReactNode;
}

export function AuthModal({
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  defaultTab = "signin",
  trigger,
}: AuthModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? externalOnOpenChange! : setInternalOpen;

  const { signInWithEmail, signUpWithEmail, loginWithGoogle, loginWithFacebook, demoLogin } =
    useAuth();

  const [mode, setMode] = useState<"signin" | "signup">(defaultTab);

  // Sync mode whenever defaultTab changes
  useEffect(() => {
    if (defaultTab) setMode(defaultTab);
  }, [defaultTab, open]);
  const [role, setRole] = useState<UserRole>("listener");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await signInWithEmail(email, password);
    setLoading(false);
    setOpen(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    await signUpWithEmail(email, password, role, name);
    setLoading(false);
    setOpen(false);
  };

  const handleDemo = (selectedRole: UserRole) => {
    demoLogin(selectedRole);
    setOpen(false);
  };

  const handleTriggerClick = () => {
    setOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild onClick={handleTriggerClick}>
          {trigger}
        </DialogTrigger>
      )}

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg">
        <DialogHeader className="mb-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Disc3 className="h-7 w-7" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">Welcome to Layam</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Stream high-resolution music or publish your own tracks.
          </p>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "signin" | "signup")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-surface-raised p-1 mb-5">
            <TabsTrigger value="signin" className="rounded-xl text-xs font-semibold">
              Log In
            </TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl text-xs font-semibold">
              Create Account
            </TabsTrigger>
          </TabsList>

          {/* LOG IN TAB */}
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-surface-raised pl-10 text-xs text-foreground"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-surface-raised pl-10 text-xs text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 cursor-pointer"
              >
                <LogIn className="mr-1.5 h-4 w-4" />
                Log In
              </Button>
            </form>

            <div className="relative my-4 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <span className="relative bg-background px-3 text-[10px] uppercase font-bold text-muted-foreground">
                Or Continue With Social
              </span>
            </div>

            {/* Social OAuth Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await loginWithGoogle(role);
                }}
                className="h-10 rounded-xl border-border/60 bg-surface-raised text-xs font-semibold hover:bg-card cursor-pointer gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.76-2.11-6.71-4.96H1.27v3.14C3.26 21.3 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.27C.46 8.23 0 10.06 0 12s.46 3.77 1.27 5.38l4.02-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.7 1.27 6.62l4.02 3.14c.95-2.85 3.59-4.96 6.71-4.96z"
                  />
                </svg>
                <span>Google</span>
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  await loginWithFacebook(role);
                }}
                className="h-10 rounded-xl border-border/60 bg-surface-raised text-xs font-semibold hover:bg-card cursor-pointer gap-2"
              >
                <svg className="h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </Button>
            </div>

            {/* Demo Quick Login Options */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 mt-3 space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-primary text-center">
                Instant Demo Quick Login
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemo("listener")}
                  className="h-8 text-xs font-semibold border-border/60 bg-surface-raised hover:bg-card cursor-pointer"
                >
                  🎧 Quick Listener
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemo("artist")}
                  className="h-8 text-xs font-bold border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 cursor-pointer"
                >
                  🎨 Quick Artist
                </Button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Don't have an account? <span className="font-bold underline">Create one now</span>
              </button>
            </div>
          </TabsContent>

          {/* CREATE ACCOUNT TAB */}
          <TabsContent value="signup" className="space-y-4">
            {/* Account Role Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Account Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("listener")}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    role === "listener"
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>🎧 Listener</span>
                    {role === "listener" && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Stream & play music
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("artist")}
                  className={cn(
                    "p-3 rounded-2xl border text-left transition-all cursor-pointer",
                    role === "artist"
                      ? "border-primary bg-primary/10 text-primary font-bold"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  <div className="text-xs font-bold flex items-center justify-between">
                    <span>🎨 Artist Creator</span>
                    {role === "artist" && <Check className="h-3.5 w-3.5" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">Upload & analytics</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Full Name / Stage Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-surface-raised pl-10 text-xs text-foreground"
                />
              </div>

              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-surface-raised pl-10 text-xs text-foreground"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-surface-raised pl-10 text-xs text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:bg-primary/90 cursor-pointer"
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Create {role === "artist" ? "Artist Creator" : "Listener"} Account
              </Button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Already have an account? <span className="font-bold underline">Log In</span>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
