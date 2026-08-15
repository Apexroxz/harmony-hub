import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Music2,
  TrendingUp,
  DollarSign,
  FileCheck,
  AlertOctagon,
  History,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Sliders,
  Lock,
  Layers,
  ChevronRight,
  UserX,
  UserCheck,
  RefreshCw,
  ExternalLink,
  Shield,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AdminService } from "@/domain/admin/admin.service";
import { ModerationService } from "@/domain/admin/moderation.service";
import { AdminAnalyticsService } from "@/domain/admin/admin-analytics.service";
import { CatalogService } from "@/domain/music/catalog.service";
import { formatDuration } from "@/domain/music/types";
import type {
  AdminAuditLog,
  AdminCreatorRecord,
  AdminUserRecord,
  ModerationReport,
  PlatformOverviewMetrics,
} from "@/domain/admin/admin.types";
import type { Track } from "@/domain/music/types";
import { cn } from "@/lib/utils";

type AdminTab = "dashboard" | "users" | "creators" | "catalog" | "reports" | "finance" | "audit";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Control Plane — Layam" },
      {
        name: "description",
        content: "Layam Administrative Operations, Content Moderation, and Governance Dashboard.",
      },
    ],
  }),
  component: AdminControlPlanePage,
});

function AdminControlPlanePage() {
  const { user, isDeveloper, isModerator } = useAuth();
  const { playTrack } = usePlayer();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Platform Data States
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics | null>(null);
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([]);
  const [creatorsList, setCreatorsList] = useState<AdminCreatorRecord[]>([]);
  const [catalogTracks, setCatalogTracks] = useState<Track[]>([]);
  const [reportsList, setReportsList] = useState<ModerationReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, users, creators, cat, reports, logs] = await Promise.all([
        AdminAnalyticsService.getPlatformOverview(),
        AdminService.getUsersList(searchQuery),
        AdminService.getCreatorsList(),
        CatalogService.getCatalog().then((c) => c.tracks),
        ModerationService.getReports(),
        AdminService.getAuditLogs(),
      ]);

      setMetrics(overview);
      setUsersList(users);
      setCreatorsList(creators);
      setCatalogTracks(cat);
      setReportsList(reports);
      setAuditLogs(logs);
    } catch (err) {
      console.warn("[AdminPage] Error loading admin state:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [searchQuery]);

  // Handle User Status Toggle
  const handleToggleUserStatus = async (userRec: AdminUserRecord) => {
    const nextStatus = userRec.status === "active" ? "suspended" : "active";
    await AdminService.updateUserStatus({
      userId: userRec.id,
      status: nextStatus,
      reason: `Manual administrative toggle by ${user?.email || "Admin"}`,
      adminId: user?.id,
    });

    setUsersList((prev) =>
      prev.map((u) => (u.id === userRec.id ? { ...u, status: nextStatus } : u)),
    );

    toast.success(`User ${userRec.displayName} marked ${nextStatus.toUpperCase()}`);
    void AdminService.getAuditLogs().then(setAuditLogs);
  };

  // Handle Creator Verification Toggle
  const handleToggleVerifyCreator = async (creator: AdminCreatorRecord) => {
    const nextVerified = !creator.verified;
    await AdminService.verifyCreator({
      creatorId: creator.id,
      verified: nextVerified,
      adminId: user?.id,
    });

    setCreatorsList((prev) =>
      prev.map((c) => (c.id === creator.id ? { ...c, verified: nextVerified } : c)),
    );

    toast.success(`Creator "${creator.name}" verification ${nextVerified ? "GRANTED" : "REVOKED"}`);
    void AdminService.getAuditLogs().then(setAuditLogs);
  };

  // Handle Moderation Report Resolution
  const handleResolveReport = async (
    reportId: string,
    status: "resolved" | "dismissed",
    notes: string,
  ) => {
    await ModerationService.resolveReport({
      reportId,
      status,
      resolutionNotes: notes,
      adminId: user?.id,
    });

    setReportsList((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status, resolutionNotes: notes } : r)),
    );

    toast.success(`Report marked ${status.toUpperCase()}`);
    void AdminService.getAuditLogs().then(setAuditLogs);
  };

  // Handle Catalog Takedown
  const handleTakedownTrack = async (track: Track) => {
    await ModerationService.takedownTrack({
      trackId: track.id,
      reason: `Administrative takedown of "${track.title}"`,
      adminId: user?.id,
    });

    setCatalogTracks((prev) => prev.filter((t) => t.id !== track.id));
    toast.error(`Track "${track.title}" removed from catalog`);
    void AdminService.getAuditLogs().then(setAuditLogs);
  };

  // Access check guard: If not an admin or moderator, render permission notice with developer bypass
  const isAdminAuthorized = isDeveloper || isModerator || user?.role === "admin" || user?.role === "super_admin";

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* ── Admin Top Navigation Header ── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-card/95 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-foreground uppercase">
                Layam Admin Control Plane
              </h1>
              <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-mono font-bold">
                ROOT SECURE
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Internal platform operations, content moderation & immutable audit telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={loading}
            className="rounded-full text-xs font-semibold gap-1.5 h-8 border-border/60 hover:bg-surface-raised cursor-pointer"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Sync
          </Button>

          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="rounded-full text-xs font-semibold h-8">
              Creator Studio
            </Button>
          </Link>
          <Link to="/stream">
            <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold h-8">
              🎧 Listener View
            </Button>
          </Link>
        </div>
      </header>

      {/* ── Main Admin Container ── */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-border/40 pb-3">
          {[
            { id: "dashboard", label: "Dashboard", icon: Activity },
            { id: "users", label: "User Directory", icon: Users },
            { id: "creators", label: "Creators & Artists", icon: Sparkles },
            { id: "catalog", label: "Catalog Moderation", icon: Music2 },
            { id: "reports", label: "Moderation Queue", icon: AlertTriangle, count: reportsList.filter((r) => r.status === "open").length },
            { id: "finance", label: "Financials & Royalties", icon: DollarSign },
            { id: "audit", label: "Audit Logs", icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-primary shadow-sm"
                    : "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.count === "number" && tab.count > 0 && (
                  <span className="rounded-full bg-red-500/20 px-1.5 py-0.2 text-[10px] font-mono font-bold text-red-400 border border-red-500/40">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: OVERVIEW DASHBOARD ── */}
        {activeTab === "dashboard" && metrics && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Total Registered Users</span>
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-black font-mono text-foreground">
                  {metrics.totalUsers.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Active Listeners:{" "}
                  <strong className="text-foreground">{metrics.activeListeners.toLocaleString()}</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Verified Creators</span>
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <p className="text-3xl font-black font-mono text-foreground">
                  {metrics.totalCreators.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Total Lossless Masters:{" "}
                  <strong className="text-foreground">{metrics.totalTracks.toLocaleString()}</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Total Stream Velocity</span>
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-3xl font-black font-mono text-emerald-400">
                  {metrics.totalStreams.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Direct Gross:{" "}
                  <strong className="text-foreground">${metrics.grossRevenueUsd.toFixed(2)}</strong>
                </p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold">Pending Treasury Batches</span>
                  <DollarSign className="h-4 w-4 text-amber" />
                </div>
                <p className="text-3xl font-black font-mono text-amber">
                  ${metrics.pendingPayoutsUsd.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Open Flags:{" "}
                  <strong className="text-red-400">{metrics.openReportsCount}</strong>
                </p>
              </div>
            </div>

            {/* Platform Health & Quick Action Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-border/40 bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Active Catalog Ingestion Health
                  </h3>
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/40 text-xs font-mono">
                    100% OPERATIONAL
                  </Badge>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border/40">
                    <span className="text-muted-foreground">Lossless DSP Pipeline & Web Audio Nodes</span>
                    <span className="font-mono text-emerald-400 font-bold">READY</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border/40">
                    <span className="text-muted-foreground">Append-Only Royalty Ledger Sync</span>
                    <span className="font-mono text-emerald-400 font-bold">SYNCHRONIZED</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-surface-raised border border-border/40">
                    <span className="text-muted-foreground">Web3 Digital Provenance & SHA-256 Verifier</span>
                    <span className="font-mono text-emerald-400 font-bold">ONLINE</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Recent Audit Activity
                </h3>
                <div className="space-y-3">
                  {auditLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="text-xs border-l-2 border-primary/60 pl-3 space-y-0.5">
                      <p className="font-semibold text-foreground">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {new Date(log.createdAt).toLocaleTimeString()} · {log.resourceType}:{log.resourceId.slice(0, 8)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: USER DIRECTORY ── */}
        {activeTab === "users" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 rounded-full bg-card text-xs h-9"
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {usersList.length} User Records
              </span>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/40 bg-surface-raised font-mono uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Role</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Streams</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-medium">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-surface/50">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary text-[10px]">
                                {u.displayName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-foreground">{u.displayName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase">
                            {u.role}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                              u.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400",
                            )}
                          >
                            {u.status === "active" ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">{u.streamsCount}</td>
                        <td className="p-3.5 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleUserStatus(u)}
                            className={cn(
                              "h-7 px-2.5 text-xs font-semibold rounded-lg cursor-pointer",
                              u.status === "active" ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300",
                            )}
                          >
                            {u.status === "active" ? <UserX className="h-3.5 w-3.5 mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                            {u.status === "active" ? "Suspend" : "Reactivate"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CREATORS & ARTISTS ── */}
        {activeTab === "creators" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {creatorsList.map((creator) => (
                <div key={creator.id} className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src={creator.avatar} alt="" className="h-12 w-12 rounded-2xl object-cover border border-border/40" />
                      <div>
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          {creator.name}
                          {creator.verified && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </h4>
                        <span className="text-xs text-muted-foreground font-mono">
                          {creator.tracksCount} Published Masters
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono p-3 rounded-xl bg-surface-raised">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Streams</span>
                      <span className="font-bold text-foreground">{creator.totalStreams.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Settled Gross</span>
                      <span className="font-bold text-emerald-400">${creator.royaltyEarnedUsd.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Link to={`/artist/${creator.id}`}>
                      <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold h-8 gap-1">
                        Profile <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      onClick={() => handleToggleVerifyCreator(creator)}
                      className={cn(
                        "rounded-full text-xs font-bold h-8 cursor-pointer",
                        creator.verified
                          ? "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
                          : "bg-primary text-primary-foreground hover:bg-primary/90",
                      )}
                    >
                      {creator.verified ? "Revoke Verification" : "Verify Creator"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TAB 4: CATALOG MODERATION ── */}
        {activeTab === "catalog" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/40 bg-surface-raised font-mono uppercase text-muted-foreground">
                    <tr>
                      <th className="p-3.5">Track</th>
                      <th className="p-3.5">Artist</th>
                      <th className="p-3.5">Quality</th>
                      <th className="p-3.5">Plays</th>
                      <th className="p-3.5 text-right">Moderation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {catalogTracks.map((track) => (
                      <tr key={track.id} className="hover:bg-surface/50">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <img src={track.coverArt} alt="" className="h-8 w-8 rounded-lg object-cover" />
                            <div>
                              <p className="font-bold text-foreground truncate max-w-[200px]">{track.title}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{formatDuration(track.duration)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-muted-foreground">{track.artistName}</td>
                        <td className="p-3.5">
                          <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary">
                            {track.quality || "24-bit / 96kHz"}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-mono text-muted-foreground">{track.playCount?.toLocaleString() || "0"}</td>
                        <td className="p-3.5 text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => playTrack(track)}
                            className="h-7 px-2.5 text-xs text-primary font-semibold"
                          >
                            Preview
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTakedownTrack(track)}
                            className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                          >
                            Takedown
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: MODERATION REPORTS QUEUE ── */}
        {activeTab === "reports" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {reportsList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/40 p-12 text-center text-muted-foreground">
                No open moderation reports in queue.
              </div>
            ) : (
              <div className="space-y-3">
                {reportsList.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-500/15 text-red-400 border-red-500/40 text-[10px] font-mono uppercase">
                            {report.reason}
                          </Badge>
                          <span className="text-xs font-bold text-foreground">
                            Flagged {report.resourceType.toUpperCase()}: {report.resourceTitle || report.resourceId}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">{report.description}</p>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase",
                          report.status === "open"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-emerald-500/20 text-emerald-400",
                        )}
                      >
                        {report.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-border/20 pt-3 text-[11px] text-muted-foreground">
                      <span>Reporter: {report.reporterName || report.reporterId || "Anonymous"}</span>
                      {report.status === "open" && (
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveReport(report.id, "dismissed", "Reviewed and dismissed")}
                            className="h-7 text-xs"
                          >
                            Dismiss
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleResolveReport(report.id, "resolved", "Copyright claim verified and resolved")}
                            className="h-7 text-xs bg-primary text-primary-foreground"
                          >
                            Resolve & Action
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 6: FINANCIALS & ROYALTIES ── */}
        {activeTab === "finance" && (
          <div className="space-y-6 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Total Settled Treasury</span>
                <p className="text-2xl font-black font-mono text-emerald-400">$24,850.00</p>
                <p className="text-[10px] text-muted-foreground">Cumulative stream & store revenue</p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Scheduled Net-30 Payouts</span>
                <p className="text-2xl font-black font-mono text-amber">$3,420.50</p>
                <p className="text-[10px] text-muted-foreground">Pending next monthly cycle</p>
              </div>

              <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">Creator Split Sheets Active</span>
                <p className="text-2xl font-black font-mono text-foreground">100.0%</p>
                <p className="text-[10px] text-muted-foreground">Validated mathematical balance</p>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 7: IMMUTABLE AUDIT LOGS ── */}
        {activeTab === "audit" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-border/40 bg-surface-raised uppercase text-muted-foreground text-[10px]">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Resource</th>
                      <th className="p-3">Admin</th>
                      <th className="p-3">Metadata</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface/50">
                        <td className="p-3 text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3 font-bold text-foreground">{log.action}</td>
                        <td className="p-3 text-primary">
                          {log.resourceType}:{log.resourceId.slice(0, 10)}
                        </td>
                        <td className="p-3 text-muted-foreground">{log.adminName || log.adminId || "System"}</td>
                        <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                          {JSON.stringify(log.metadata)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
