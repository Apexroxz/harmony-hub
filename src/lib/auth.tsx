import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserRole = "listener" | "artist";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  isArtist: boolean;
  isListener: boolean;
  loginWithGoogle: (role: UserRole) => Promise<void>;
  loginWithFacebook: (role: UserRole) => Promise<void>;
  loginAsGuest: (role?: UserRole) => void;
  signUpWithEmail: (email: string, pass: string, role: UserRole, name?: string) => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  demoLogin: (role: UserRole) => void;
  logout: () => Promise<void>;
  upgradeToArtist: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "layam_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  // Sync Supabase real session on mount
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const su = data.session.user;
        setUser({
          id: su.id,
          name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
          email: su.email ?? "",
          role: (su.user_metadata?.["role"] as UserRole) ?? "listener",
          avatarUrl: su.user_metadata?.["avatar_url"] as string | undefined,
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const su = session.user;
        const authUser: AuthUser = {
          id: su.id,
          name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
          email: su.email ?? "",
          role: (su.user_metadata?.["role"] as UserRole) ?? "listener",
          avatarUrl: su.user_metadata?.["avatar_url"] as string | undefined,
        };
        setUser(authUser);
      } else {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Persist user to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const loginAsGuest = useCallback((role: UserRole = "listener") => {
    const guestUser: AuthUser = {
      id: "guest",
      name: "Guest User",
      email: "guest@layam.app",
      role,
    };
    setUser(guestUser);
  }, []);

  const loginWithGoogle = useCallback(async (role: UserRole) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
          queryParams: { role },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.warn("Google OAuth notice:", err);
      toast.info("OAuth Notice", {
        description: "OAuth unconfigured. Logging in as Guest.",
      });
      loginAsGuest(role);
    }
  }, [loginAsGuest]);

  const loginWithFacebook = useCallback(async (role: UserRole) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: window.location.origin,
          queryParams: { role },
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      console.warn("Facebook OAuth notice:", err);
      toast.info("OAuth Notice", {
        description: "OAuth unconfigured. Logging in as Guest.",
      });
      loginAsGuest(role);
    }
  }, [loginAsGuest]);

  const signUpWithEmail = useCallback(async (email: string, pass: string, role: UserRole, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: { full_name: name ?? email.split("@")[0], role } },
      });
      if (error) throw error;
      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          name: name ?? email.split("@")[0] ?? "User",
          email,
          role,
        };
        setUser(authUser);
        toast.success("Account created! Welcome to Layam.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign up failed.";
      toast.error(msg);
      throw err;
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (data.user) {
        const su = data.user;
        const authUser: AuthUser = {
          id: su.id,
          name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
          email: su.email ?? email,
          role: (su.user_metadata?.["role"] as UserRole) ?? "listener",
          avatarUrl: su.user_metadata?.["avatar_url"] as string | undefined,
        };
        setUser(authUser);
        toast.success(`Welcome back, ${authUser.name}!`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign in failed.";
      toast.error(msg);
      throw err;
    }
  }, []);

  const demoLogin = useCallback((role: UserRole) => {
    const demoUser: AuthUser = {
      id: `demo-${role}`,
      name: role === "artist" ? "Demo Artist" : "Demo Listener",
      email: `demo-${role}@layam.app`,
      role,
    };
    setUser(demoUser);
    toast.success(`Demo ${role === "artist" ? "Artist" : "Listener"} mode activated.`);
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    toast.info("Signed out.");
  }, []);

  const upgradeToArtist = useCallback(async () => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated: AuthUser = {
        ...prev,
        role: "artist",
        name: prev.name.includes("Listener") ? "Artist Creator" : prev.name,
      };
      return updated;
    });

    try {
      await supabase.auth.updateUser({ data: { role: "artist" } });
    } catch {
      // ignore
    }

    toast.success("Account Upgraded to Artist Creator!", {
      description: "Song Uploads and Artist Portal Analytics unlocked.",
    });
  }, []);

  const isArtist = user?.role === "artist";
  const isListener = !user || user.role === "listener";
  const role: UserRole = user?.role ?? "listener";

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      role,
      isArtist,
      isListener,
      loginWithGoogle,
      loginWithFacebook,
      loginAsGuest,
      signUpWithEmail,
      signInWithEmail,
      demoLogin,
      logout,
      upgradeToArtist,
    }),
    [
      user,
      loading,
      role,
      isArtist,
      isListener,
      loginWithGoogle,
      loginWithFacebook,
      loginAsGuest,
      signUpWithEmail,
      signInWithEmail,
      demoLogin,
      logout,
      upgradeToArtist,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
