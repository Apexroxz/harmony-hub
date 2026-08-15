import { useState, useEffect } from "react";
import { toast } from "sonner";

export interface OctalysisBadge {
  id: string;
  title: string;
  description: string;
  coreDrive: string;
  iconName: string;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
}

export type PlayerJourneyPhase = "Discovery" | "Onboarding" | "Scaffolding" | "Endgame";

export interface GamificationState {
  xp: number;
  level: number;
  title: string;
  dailyStreak: number;
  lastActiveDate: string;
  streakShields: number;
  blindTestScore: number;
  totalLosslessMinutes: number;
  creatorsSupportedCount: number;
  stemsRemixedCount: number;
  currentPhase: PlayerJourneyPhase;
  complexityToleranceScore: number; // 0 - 100
  badges: OctalysisBadge[];
  octalysisScores: {
    epicMeaning: number; // Core Drive 1
    accomplishment: number; // Core Drive 2
    creativity: number; // Core Drive 3
    ownership: number; // Core Drive 4
    socialInfluence: number; // Core Drive 5
    scarcity: number; // Core Drive 6
    unpredictability: number; // Core Drive 7
    lossAvoidance: number; // Core Drive 8
  };
}

const INITIAL_BADGES: OctalysisBadge[] = [
  {
    id: "golden-ear",
    title: "Golden Ear Master",
    description: "Identified 24-bit/96kHz Lossless vs 128kbps in the Blind Ear Test with 100% accuracy.",
    coreDrive: "Accomplishment & Curiosity",
    iconName: "Ear",
    unlocked: false,
    xpReward: 500,
  },
  {
    id: "lossless-purist",
    title: "Lossless Purist",
    description: "Streamed over 60 minutes of uncompressed 24-bit studio masters.",
    coreDrive: "Epic Meaning & Calling",
    iconName: "Disc3",
    unlocked: true,
    unlockedAt: new Date().toISOString(),
    xpReward: 300,
  },
  {
    id: "acoustic-artisan",
    title: "Acoustic Artisan",
    description: "Auto-calibrated gear profile and custom tuned 10-band parametric EQ.",
    coreDrive: "Empowerment of Creativity",
    iconName: "Sliders",
    unlocked: true,
    unlockedAt: new Date().toISOString(),
    xpReward: 250,
  },
  {
    id: "patron-saint",
    title: "Patron of the Arts",
    description: "Tipped or purchased master tracks directly from independent creators.",
    coreDrive: "Social Influence & Ownership",
    iconName: "Crown",
    unlocked: false,
    xpReward: 400,
  },
  {
    id: "stem-alchemist",
    title: "Stem Alchemist",
    description: "Mixed and isolated vocals, bass, drums, and synths on the Live Remix Deck.",
    coreDrive: "Empowerment of Creativity",
    iconName: "Layers",
    unlocked: false,
    xpReward: 350,
  },
  {
    id: "master-broadcaster",
    title: "Master Broadcaster",
    description: "Hosted a synchronized live listening room with community listeners.",
    coreDrive: "Social Influence & Relatedness",
    iconName: "Radio",
    unlocked: false,
    xpReward: 450,
  },
  {
    id: "streak-guardian",
    title: "Sonic Ritual Guardian",
    description: "Maintained a 7-day pure audio listening streak.",
    coreDrive: "Loss & Avoidance",
    iconName: "Flame",
    unlocked: false,
    xpReward: 600,
  },
  {
    id: "vip-vault-insider",
    title: "VIP Backstage Insider",
    description: "Unlocked an exclusive artist voice-note drop in the VIP Vault.",
    coreDrive: "Scarcity & Exclusivity",
    iconName: "Sparkles",
    unlocked: false,
    xpReward: 300,
  },
];

const INITIAL_STATE: GamificationState = {
  xp: 850,
  level: 3,
  title: "Acoustic Connoisseur",
  dailyStreak: 4,
  lastActiveDate: new Date().toISOString().slice(0, 10),
  streakShields: 2,
  blindTestScore: 80,
  totalLosslessMinutes: 142,
  creatorsSupportedCount: 2,
  stemsRemixedCount: 5,
  currentPhase: "Scaffolding",
  complexityToleranceScore: 78,
  badges: INITIAL_BADGES,
  octalysisScores: {
    epicMeaning: 78,
    accomplishment: 65,
    creativity: 85,
    ownership: 72,
    socialInfluence: 60,
    scarcity: 55,
    unpredictability: 70,
    lossAvoidance: 80,
  },
};

const STORAGE_KEY = "layam_octalysis_gamification";

export function getGamificationState(): GamificationState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveGamificationState(state: GamificationState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save gamification state", e);
  }
}

export function getPlayerJourneyPhase(level: number): {
  phase: PlayerJourneyPhase;
  description: string;
  unlockedFeatures: string[];
  complexityThresholdRatio: number;
} {
  if (level <= 1) {
    return {
      phase: "Discovery",
      description: "Immediate lossless gratification with zero cognitive friction. Simple 1-click playback.",
      unlockedFeatures: ["FLAC Lossless Playback", "Dynamic Waveform", "Volume Control"],
      complexityThresholdRatio: 25,
    };
  }
  if (level <= 3) {
    return {
      phase: "Onboarding",
      description: "Discovering acoustic enhancement tools and building initial listening habits.",
      unlockedFeatures: ["DSP Bass Boost", "Synced Karaoke Lyrics", "Master Queue", "Artist Tipping"],
      complexityThresholdRatio: 50,
    };
  }
  if (level <= 5) {
    return {
      phase: "Scaffolding",
      description: "Habit mastery: daily listening streaks, custom EQ tuning, and DRM-free offline crates.",
      unlockedFeatures: ["10-Band Parametric EQ", "Multi-Mode Visualizer", "Offline Bit-Perfect Vault", "Streak Shields"],
      complexityThresholdRatio: 75,
    };
  }
  return {
    phase: "Endgame",
    description: "Peak Audiophile Mastery: Gear impulse calibration, Stem isolation alchemy, and Blind Ear Test challenges.",
    unlockedFeatures: ["Hardware Impulse Calibration", "Live Multi-Track Stem Mixer", "Blind Lossless Ear Test", "Live DJ Broadcasting"],
    complexityThresholdRatio: 100,
  };
}

export function calculateLevel(xp: number): {
  level: number;
  title: string;
  nextLevelXp: number;
  progress: number;
} {
  const levels = [
    { lvl: 1, xp: 0, title: "Acoustic Novice" },
    { lvl: 2, xp: 400, title: "Hi-Fi Explorer" },
    { lvl: 3, xp: 800, title: "Acoustic Connoisseur" },
    { lvl: 4, xp: 1400, title: "Studio Sound Engineer" },
    { lvl: 5, xp: 2200, title: "Sonic Alchemist" },
    { lvl: 6, xp: 3200, title: "Golden Ear Master" },
    { lvl: 7, xp: 4500, title: "Mastering Legend" },
    { lvl: 8, xp: 6000, title: "Grand Acoustic Sovereign" },
  ];

  let current = levels[0]!;
  let next = levels[1]!;

  for (let i = 0; i < levels.length; i++) {
    if (xp >= levels[i]!.xp) {
      current = levels[i]!;
      next = levels[i + 1] || { lvl: current.lvl + 1, xp: current.xp + 2000, title: "Immortal Master" };
    }
  }

  const currentLevelBase = current.xp;
  const nextLevelTarget = next.xp;
  const progress = Math.min(100, Math.max(0, ((xp - currentLevelBase) / (nextLevelTarget - currentLevelBase)) * 100));

  return {
    level: current.lvl,
    title: current.title,
    nextLevelXp: nextLevelTarget,
    progress,
  };
}

export function useGamification() {
  const [state, setState] = useState<GamificationState>(getGamificationState);

  useEffect(() => {
    saveGamificationState(state);
  }, [state]);

  const addXp = (amount: number, reason: string) => {
    setState((prev) => {
      const newXp = prev.xp + amount;
      const { level, title } = calculateLevel(newXp);
      const journey = getPlayerJourneyPhase(level);
      const leveledUp = level > prev.level;

      if (leveledUp) {
        toast.success(`🎉 LEVEL UP! You reached Level ${level}: ${title}`, {
          description: `Journey Phase: ${journey.phase} (+${amount} XP from: ${reason})`,
        });
      } else {
        toast.success(`+${amount} XP: ${reason}`);
      }

      return {
        ...prev,
        xp: newXp,
        level,
        title,
        currentPhase: journey.phase,
        complexityToleranceScore: journey.complexityThresholdRatio,
        octalysisScores: {
          ...prev.octalysisScores,
          accomplishment: Math.min(100, prev.octalysisScores.accomplishment + 2),
        },
      };
    });
  };

  const unlockBadge = (badgeId: string) => {
    setState((prev) => {
      const badge = prev.badges.find((b) => b.id === badgeId);
      if (!badge || badge.unlocked) return prev;

      const updatedBadges = prev.badges.map((b) =>
        b.id === badgeId ? { ...b, unlocked: true, unlockedAt: new Date().toISOString() } : b,
      );

      toast.success(`🏆 Master Badge Unlocked: "${badge.title}"!`, {
        description: `${badge.description} (+${badge.xpReward} XP)`,
      });

      const newXp = prev.xp + badge.xpReward;
      const { level, title } = calculateLevel(newXp);
      const journey = getPlayerJourneyPhase(level);

      return {
        ...prev,
        xp: newXp,
        level,
        title,
        currentPhase: journey.phase,
        badges: updatedBadges,
      };
    });
  };

  return {
    state,
    addXp,
    unlockBadge,
    levelInfo: calculateLevel(state.xp),
    journeyInfo: getPlayerJourneyPhase(state.level),
  };
}
