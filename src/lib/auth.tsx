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
import {
  type UserRole,
  type Permission,
  normalizeRole,
  hasPermission,
  isCreatorRole,
  isAdminRole,
  isSuperAdminRole,
} from "@/lib/permissions";

export type { UserRole, Permission };

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null | undefined;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  role: UserRole;
  isArtist: boolean;
  isCreator: boolean;
  isListener: boolean;
  isDeveloper: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  can: (permission: Permission) => boolean;
  setRole: (role: UserRole) => void;
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
      if (!stored) return null;
      const parsed = JSON.parse(stored) as AuthUser;
      // Sanitize stored role - ensure invalid roles fallback to listener
      return {
        ...parsed,
        role: parsed.role ? (normalizeRole(parsed.role) as UserRole) : "listener",
      };
    } catch {
      return null;
    }
  });

  // Sync Supabase real session on mount
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          const su = data.session.user;
          const rawRole = (su.user_metadata?.["role"] as string | undefined) ?? "listener";
          setUser({
            id: su.id,
            name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
            email: su.email ?? "",
            role: normalizeRole(rawRole),
            avatarUrl: su.user_metadata?.["avatar_url"] as string | undefined,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const su = session.user;
        const rawRole = (su.user_metadata?.["role"] as string | undefined) ?? "listener";
        const authUser: AuthUser = {
          id: su.id,
          name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
          email: su.email ?? "",
          role: normalizeRole(rawRole),
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

  const loginAsGuest = useCallback((roleInput: UserRole = "listener") => {
    // In production, guests cannot self-assign admin roles
    const safeRole: UserRole =
      import.meta.env.DEV
        ? roleInput
        : roleInput === "admin" || roleInput === "super_admin" || (roleInput as string) === "developer"
        ? "listener"
        : roleInput;

    const guestUser: AuthUser = {
      id: "guest",
      name: "Guest User",
      email: "guest@layam.app",
      role: safeRole,
    };
    setUser(guestUser);
  }, []);

  const loginWithGoogle = useCallback(
    async (role: UserRole) => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            queryParams: { role: normalizeRole(role) },
          },
        });
        if (error) throw error;
      } catch (err: unknown) {
        console.warn("Google OAuth notice:", err);
        toast.info("OAuth Notice", {
          description: "OAuth unconfigured in environment. Logging in as Guest.",
        });
        loginAsGuest(role);
      }
    },
    [loginAsGuest],
  );

  const loginWithFacebook = useCallback(
    async (role: UserRole) => {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "facebook",
          options: {
            redirectTo: window.location.origin,
            queryParams: { role: normalizeRole(role) },
          },
        });
        if (error) throw error;
      } catch (err: unknown) {
        console.warn("Facebook OAuth notice:", err);
        toast.info("OAuth Notice", {
          description: "OAuth unconfigured in environment. Logging in as Guest.",
        });
        loginAsGuest(role);
      }
    },
    [loginAsGuest],
  );

  const signUpWithEmail = useCallback(
    async (email: string, pass: string, roleInput: UserRole, name?: string) => {
      // Protect against privilege escalation during registration
      const safeRole: UserRole =
        roleInput === "admin" || roleInput === "super_admin" || (roleInput as string) === "developer"
          ? "listener"
          : roleInput;

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: { data: { full_name: name ?? email.split("@")[0], role: safeRole } },
        });
        if (error) throw error;
        if (data.user) {
          const authUser: AuthUser = {
            id: data.user.id,
            name: name ?? email.split("@")[0] ?? "User",
            email,
            role: safeRole,
          };
          setUser(authUser);
          toast.success("Account created! Welcome to Layam.");
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Sign up failed.";
        toast.error(msg);
        throw err;
      }
    },
    [],
  );

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      if (data.user) {
        const su = data.user;
        const rawRole = (su.user_metadata?.["role"] as string | undefined) ?? "listener";
        const authUser: AuthUser = {
          id: su.id,
          name: su.user_metadata?.["full_name"] ?? su.email?.split("@")[0] ?? "User",
          email: su.email ?? email,
          role: normalizeRole(rawRole),
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

  /**
   * Demo login for prototyping - isolated in development or controlled testing environments.
   */
  const demoLogin = useCallback((roleInput: UserRole) => {
    const isDev = import.meta.env.DEV;
    const isPrivileged =
      roleInput === "admin" || roleInput === "super_admin" || (roleInput as string) === "developer";

    if (!isDev && isPrivileged) {
      toast.error("Privileged role escalation blocked outside development mode.");
      return;
    }

    const normalized = normalizeRole(roleInput);
    const demoUser: AuthUser = {
      id: `demo-${normalized}`,
      name:
        normalized === "super_admin"
          ? "Master Developer (Dev Simulation)"
          : normalized === "admin"
          ? "Platform Admin"
          : normalized === "creator"
          ? "Demo Creator"
          : "Demo Listener",
      email: `demo-${normalized}@layam.app`,
      role: roleInput,
    };
    setUser(demoUser);
    toast.success(`Active Persona: ${demoUser.name}`);
  }, []);

  /**
   * Safe role switcher for UI previewing.
   * Prevents granting real administrative permissions outside dev environments.
   */
  const setRole = useCallback((newRole: UserRole) => {
    const isDev = import.meta.env.DEV;
    const isPrivileged =
      newRole === "admin" || newRole === "super_admin" || (newRole as string) === "developer";

    if (!isDev && isPrivileged) {
      toast.error("Administrative roles cannot be assigned client-side.");
      return;
    }

    setUser((prev) => {
      const base: AuthUser = prev || {
        id: "demo-user",
        name: "Layam User",
        email: "user@layam.app",
        role: newRole,
      };
      return {
        ...base,
        role: newRole,
        name:
          newRole === "developer" || newRole === "super_admin"
            ? "Master Developer (Dev Mode)"
            : newRole === "admin"
            ? "Platform Admin"
            : newRole === "artist" || newRole === "creator"
            ? "Artist Creator"
            : "Audiophile Listener",
      };
    });
    toast.success(
      `Access Mode: ${
        newRole === "developer" || newRole === "super_admin"
          ? "👑 Master Developer (Dev Simulation)"
          : newRole === "artist" || newRole === "creator"
          ? "🎨 Artist Creator"
          : "🎧 Listener"
      }`,
    );
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
        role: "creator",
        name: prev.name.includes("Listener") ? "Artist Creator" : prev.name,
      };
      return updated;
    });

    try {
      await supabase.auth.updateUser({ data: { role: "creator" } });
    } catch {
      // ignore
    }

    toast.success("Account Upgraded to Artist Creator!", {
      description: "Lossless Master Ingestion and Studio Analytics unlocked.",
    });
  }, []);

  // Standardized RBAC checks
  const role: UserRole = user?.role ?? "listener";
  const isListener = role === "listener";
  const isArtist = isCreatorRole(role);
  const isCreator = isCreatorRole(role);
  const isAdmin = isAdminRole(role);
  const isSuperAdmin = isSuperAdminRole(role);
  const isDeveloper = isSuperAdminRole(role) || (role as string) === "developer";

  const can = useCallback(
    (permission: Permission) => {
      return hasPermission(role, permission);
    },
    [role],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      role,
      isArtist,
      isCreator,
      isListener,
      isDeveloper,
      isAdmin,
      isSuperAdmin,
      can,
      setRole,
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
      isCreator,
      isListener,
      isDeveloper,
      isAdmin,
      isSuperAdmin,
      can,
      setRole,
      loginWithGoogle,
      loginWithFacebook,
      loginAsGuest,
      signUpWithEmail,
      signInWithEmail,
      demoLogin,
      logout,
      upgradeToArtist,
    ],
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

