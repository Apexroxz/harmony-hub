import { useState } from "react";
import {
  Trophy,
  Flame,
  Zap,
  Ear,
  Disc3,
  Sliders,
  Crown,
  Layers,
  Radio,
  X,
  Target,
  Sparkles,
  Compass,
  CheckCircle2,
  Lock,
  Workflow,
} from "lucide-react";
import { useGamification } from "@/lib/gamification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface OctalysisGamificationModalProps {
  open: boolean;
  onClose: () => void;
  onOpenBlindTest?: () => void;
}

export function OctalysisGamificationModal({
  open,
  onClose,
  onOpenBlindTest,
}: OctalysisGamificationModalProps) {
  const { state, levelInfo, journeyInfo } = useGamification();
  const [activeTab, setActiveTab] = useState<"overview" | "journey" | "radar" | "badges" | "quests">("overview");

  if (!open) return null;

  const coreDrives = [
    { name: "1. Epic Meaning", key: "epicMeaning" as const, score: state.octalysisScores.epicMeaning, desc: "Sovereign lossless preservation & creator patronage." },
    { name: "2. Accomplishment", key: "accomplishment" as const, score: state.octalysisScores.accomplishment, desc: "Levels, XP, and Audiophile certifications." },
    { name: "3. Creativity", key: "creativity" as const, score: state.octalysisScores.creativity, desc: "10-band EQ mastering & stem remix alchemy." },
    { name: "4. Ownership", key: "ownership" as const, score: state.octalysisScores.ownership, desc: "Collecting DRM-free masters & custom gear curves." },
    { name: "5. Social Influence", key: "socialInfluence" as const, score: state.octalysisScores.socialInfluence, desc: "Synchronized listening rooms & community tipping." },
    { name: "6. Scarcity", key: "scarcity" as const, score: state.octalysisScores.scarcity, desc: "VIP Backstage tokens & limited master drops." },
    { name: "7. Unpredictability", key: "unpredictability" as const, score: state.octalysisScores.unpredictability, desc: "Blind A/B ear tests & randomized sonic crates." },
    { name: "8. Loss Avoidance", key: "lossAvoidance" as const, score: state.octalysisScores.lossAvoidance, desc: "Daily listening streaks & lossless fidelity shields." },
  ];

  const journeyPhases = [
    {
      phase: "Discovery",
      levelRange: "Level 1",
      focus: "Why play? Zero friction, 1-click lossless playback.",
      unlocked: ["FLAC Lossless Playback", "Dynamic Waveform", "Volume Control"],
      active: journeyInfo.phase === "Discovery",
      passed: state.level > 1,
    },
    {
      phase: "Onboarding",
      levelRange: "Level 2–3",
      focus: "First wins: exploring DSP bass boost, synced lyrics, and artist tipping.",
      unlocked: ["DSP Bass Boost", "Synced Karaoke Lyrics", "Master Queue", "Artist Tipping"],
      active: journeyInfo.phase === "Onboarding",
      passed: state.level > 3,
    },
    {
      phase: "Scaffolding",
      levelRange: "Level 4–5",
      focus: "Habit loop: daily streaks, 10-band parametric EQ, and offline bit-perfect vault.",
      unlocked: ["10-Band Parametric EQ", "Multi-Mode Visualizer", "Offline Bit-Perfect Vault", "Streak Shields"],
      active: journeyInfo.phase === "Scaffolding",
      passed: state.level > 5,
    },
    {
      phase: "Endgame",
      levelRange: "Level 6+",
      focus: "Mastery & challenge: Gear impulse calibration, Stem remixing, and Blind Ear Test.",
      unlocked: ["Hardware Impulse Calibration", "Live Stem Mixer", "Blind Lossless Ear Test", "Live DJ Broadcasting"],
      active: journeyInfo.phase === "Endgame",
      passed: false,
    },
  ];

  const getBadgeIcon = (name: string) => {
    switch (name) {
      case "Ear": return <Ear className="h-4 w-4" />;
      case "Disc3": return <Disc3 className="h-4 w-4" />;
      case "Sliders": return <Sliders className="h-4 w-4" />;
      case "Crown": return <Crown className="h-4 w-4" />;
      case "Layers": return <Layers className="h-4 w-4" />;
      case "Radio": return <Radio className="h-4 w-4" />;
      case "Flame": return <Flame className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c0d10] shadow-2xl overflow-hidden text-foreground">
        {/* ── Minimalist Modal Header ── */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Acoustic Mastery & Octalysis
                </h2>
                <span className="text-[10px] font-mono text-muted-foreground/80">
                  Level {levelInfo.level} · {levelInfo.title}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Navigation Tabs ── */}
        <div className="flex items-center gap-1 border-b border-white/[0.06] px-6 py-2 bg-black/30 text-xs font-mono">
          {[
            { id: "overview" as const, label: "Overview", icon: Zap },
            { id: "journey" as const, label: "Player Journey", icon: Workflow },
            { id: "radar" as const, label: "8-Core Drives", icon: Compass },
            { id: "badges" as const, label: "Badges", icon: Trophy },
            { id: "quests" as const, label: "Daily Quests", icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs",
                  activeTab === tab.id
                    ? "bg-white/10 text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Level Progress */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-primary font-medium tracking-wide uppercase">
                      Current Rank
                    </span>
                    <h3 className="text-xl font-bold text-foreground">
                      Level {levelInfo.level}: {levelInfo.title}
                    </h3>
                  </div>
                  <div className="text-right font-mono text-xs text-muted-foreground">
                    <span>{state.xp} / {levelInfo.nextLevelXp} XP</span>
                  </div>
                </div>

                <Progress value={levelInfo.progress} className="h-1.5 bg-white/[0.06]" />

                <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground/70 pt-1">
                  <span>Current Phase: <strong className="text-foreground">{journeyInfo.phase}</strong></span>
                  <span>{Math.round(levelInfo.nextLevelXp - state.xp)} XP to Next Rank</span>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-amber-400">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs font-mono font-medium uppercase">Daily Streak</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">{state.dailyStreak} Days</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{state.streakShields} Shields Active</p>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Ear className="h-4 w-4" />
                    <span className="text-xs font-mono font-medium uppercase">Ear Accuracy</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">{state.blindTestScore}%</p>
                  <button onClick={onOpenBlindTest} className="text-[10px] font-mono text-primary hover:underline mt-1 cursor-pointer">
                    Retest Lossless →
                  </button>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Disc3 className="h-4 w-4" />
                    <span className="text-xs font-mono font-medium uppercase">Lossless Time</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground mt-2">{state.totalLosslessMinutes}m</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">24-bit / 96kHz</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLAYER JOURNEY & COMPLEXITY THRESHOLD */}
          {activeTab === "journey" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 mb-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                  The Complexity Threshold Principle (Yu-kai Chou)
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Layam starts ultra-minimal to eliminate cognitive friction, then progressively unlocks studio audio tools as you gain mastery across the 4 Player Journey Phases.
                </p>
              </div>

              <div className="space-y-3">
                {journeyPhases.map((phaseItem, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "p-4 rounded-xl border transition-colors space-y-2",
                      phaseItem.active
                        ? "border-primary/40 bg-primary/5"
                        : phaseItem.passed
                          ? "border-white/[0.06] bg-white/[0.02]"
                          : "border-white/[0.04] opacity-50 bg-black/40",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {idx + 1}. {phaseItem.phase}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground">({phaseItem.levelRange})</span>
                      </div>
                      {phaseItem.active && (
                        <Badge variant="outline" className="text-[9px] font-mono border-primary/40 text-primary">
                          CURRENT STAGE
                        </Badge>
                      )}
                      {phaseItem.passed && (
                        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Mastered
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{phaseItem.focus}</p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {phaseItem.unlocked.map((tool, i) => (
                        <span
                          key={i}
                          className="font-mono text-[9px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-muted-foreground"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: 8-CORE DRIVES */}
          {activeTab === "radar" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {coreDrives.map((drive) => (
                <div key={drive.key} className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{drive.name}</span>
                    <span className="font-mono text-muted-foreground">{drive.score}%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{drive.desc}</p>
                  <Progress value={drive.score} className="h-1 bg-white/[0.04]" />
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: BADGES */}
          {activeTab === "badges" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "p-3.5 rounded-xl border transition-colors flex items-start gap-3",
                    badge.unlocked
                      ? "border-white/[0.1] bg-white/[0.03] text-foreground"
                      : "border-white/[0.04] bg-black/40 opacity-50 text-muted-foreground",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] border border-white/[0.06]">
                    {getBadgeIcon(badge.iconName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-foreground truncate">{badge.title}</h4>
                      <span className="font-mono text-[9px] text-muted-foreground">
                        {badge.unlocked ? "UNLOCKED" : `+${badge.xpReward} XP`}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{badge.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 5: DAILY QUESTS */}
          {activeTab === "quests" && (
            <div className="space-y-2.5">
              {[
                { title: "Calibrate Parametric EQ", desc: "Tweak 10-band EQ to match room acoustics.", xp: 150, action: "Tune", core: "Creativity" },
                { title: "Pass Blind Ear Test", desc: "Pick Lossless vs 128kbps in blind test.", xp: 200, action: "Test", core: "Accomplishment", onAction: onOpenBlindTest },
                { title: "Creator Patronage", desc: "Send a micro-tip to an independent musician.", xp: 250, action: "Explore", core: "Social" },
                { title: "Maintain Sonic Streak", desc: "Listen to at least 1 full master today.", xp: 100, action: "Done", core: "Loss Avoidance", completed: true },
              ].map((quest, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-medium text-foreground">{quest.title}</h4>
                      <span className="font-mono text-[9px] text-primary">+{quest.xp} XP</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{quest.desc}</p>
                  </div>

                  <Button
                    size="sm"
                    variant={quest.completed ? "ghost" : "outline"}
                    onClick={quest.onAction}
                    disabled={quest.completed}
                    className="h-7 text-xs px-3 rounded-lg cursor-pointer"
                  >
                    {quest.completed ? "Done" : quest.action}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
