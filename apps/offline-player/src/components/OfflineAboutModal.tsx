import { useState, useEffect } from "react";
import {
  Info,
  X,
  ShieldCheck,
  Heart,
  MessageSquare,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  DownloadCloud,
} from "lucide-react";
import {
  analytics,
  feedbackService,
  supportService,
  updateService,
} from "../services";
import type { AppUpdateCheckResult, ReleaseChannel } from "../services/updates/update.service";
import type { FeedbackCategory } from "../services/feedback/feedback.service";
import { useLocalVault } from "../providers/LocalVaultProvider";
import { BrandLogo } from "@layam/design-system";
import { OnlineMetadataService } from "@layam/storage-core";

export function OfflineAboutModal() {
  const { isAboutOpen, setIsAboutOpen } = useLocalVault();
  const [activeTab, setActiveTab] = useState<"about" | "updates" | "privacy" | "support" | "feedback">("about");
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => analytics.isTelemetryEnabled());
  const [onlineOptIn, setOnlineOptIn] = useState(() => OnlineMetadataService.isOptInEnabled());

  // Update check states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);
  const [updateResult, setUpdateResult] = useState<AppUpdateCheckResult | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<ReleaseChannel>("stable");
  const [lastChecked, setLastChecked] = useState<string>(() => updateService.getLastCheckedTime());

  // Feedback form
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "submitting" | "sent" | "queued" | "error">("idle");
  const [feedbackResponseMessage, setFeedbackResponseMessage] = useState("");

  // Support / Voluntary Contribution states
  const [contributionAmount, setContributionAmount] = useState("10");
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportStatusMessage, setSupportStatusMessage] = useState("");
  const [supportStatusType, setSupportStatusType] = useState<"idle" | "error" | "success">("idle");

  // ESC key dismiss
  useEffect(() => {
    if (!isAboutOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsAboutOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAboutOpen, setIsAboutOpen]);

  if (!isAboutOpen) return null;

  const handleToggleTelemetry = (enabled: boolean) => {
    setTelemetryEnabled(enabled);
    analytics.setTelemetryEnabled(enabled);
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    const result = await updateService.checkForUpdates(selectedChannel);
    setIsCheckingUpdate(false);
    setUpdateChecked(true);
    setUpdateResult(result);
    setLastChecked(updateService.getLastCheckedTime());
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim() || feedbackState === "submitting") return;

    setFeedbackState("submitting");

    const result = await feedbackService.submitFeedback({
      category: feedbackCategory,
      message: feedbackMessage.trim(),
      email: feedbackEmail.trim() || undefined,
    });

    setFeedbackState(result.status);
    setFeedbackResponseMessage(result.message);

    if (result.success) {
      setFeedbackMessage("");
      setTimeout(() => {
        setFeedbackState("idle");
        setFeedbackResponseMessage("");
      }, 5000);
    }
  };

  const handleInitiateSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(contributionAmount);
    const validation = supportService.validateAmount(parsed);
    if (!validation.valid) {
      setSupportStatusType("error");
      setSupportStatusMessage(validation.error || "Please enter a valid amount.");
      return;
    }

    setIsSubmittingSupport(true);
    setSupportStatusMessage("");

    const res = await supportService.initiateContribution(parsed, "usd", true);
    setIsSubmittingSupport(false);

    if (!res.success) {
      setSupportStatusType("error");
      setSupportStatusMessage(res.error || "An internet connection is required to make a contribution.");
    } else {
      setSupportStatusType("success");
      setSupportStatusMessage("Redirecting to secure Stripe checkout...");
    }
  };

  const isMobilePlatform = supportService.getPlatform() === "ios" || supportService.getPlatform() === "android";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--border-medium,rgba(255,255,255,0.08))] bg-[var(--surface-charcoal,#111216)] shadow-2xl overflow-hidden text-[var(--text-primary,#f2f3f5)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] px-5 py-3.5 bg-[var(--surface-charcoal,#111216)]">
          <BrandLogo variant="compact" size="xs" showBadge badgeText="v1.0.0" />
          <button
            onClick={() => setIsAboutOpen(false)}
            aria-label="Close About"
            className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-[var(--text-tertiary,#6b7280)] hover:bg-[var(--surface-active,#16181e)] hover:text-[var(--text-primary,#f2f3f5)] transition-colors cursor-pointer flex items-center justify-center"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle,rgba(255,255,255,0.07))] px-5 py-2 bg-[var(--surface-sunken,#0c0d10)] overflow-x-auto">
          {[
            { id: "about" as const, label: "About", icon: Info },
            { id: "updates" as const, label: "Updates", icon: RefreshCw },
            { id: "privacy" as const, label: "Privacy & Data", icon: ShieldCheck },
            { id: "support" as const, label: "Support", icon: Heart },
            { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 min-h-[36px] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[var(--surface-active,#16181e)] text-[#e59e38] font-semibold border border-[var(--border-subtle,rgba(255,255,255,0.08))]"
                  : "text-[var(--text-secondary,#9ba1ad)] hover:text-[var(--text-primary,#f2f3f5)]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-[var(--text-secondary,#9ba1ad)] space-y-4">
          {/* Tab 1: About */}
          {activeTab === "about" && (
            <div className="space-y-3.5">
              <div className="rounded-xl border border-[var(--border-subtle,rgba(255,255,255,0.06))] bg-[var(--surface-sunken,#0c0d10)] p-4 flex flex-col gap-3">
                <BrandLogo variant="full" size="sm" showBadge badgeText="BIT-PERFECT" />
                <p className="text-xs leading-relaxed text-[var(--text-secondary,#9ba1ad)]">
                  Engineered for listening to owned lossless music collections.
                  Featuring a 64-bit floating point DSP pipeline, 10-band hardware graphic equalizer,
                  biquad dynamics normalization, and bit-perfect local playback.
                </p>
              </div>

              <div className="space-y-1.5">
                <h5 className="font-tech text-[#6b7280] uppercase text-[9px]">Technical Specifications</h5>
                <div className="grid grid-cols-2 gap-2 font-tech text-[10px]">
                  <div className="rounded-lg border border-white/[0.05] bg-[#0c0d10] p-2">
                    <span className="text-[#6b7280] block text-[9px]">DECODER</span>
                    <span className="text-[#f2f3f5]">FLAC / WAV / ALAC / MP3</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.05] bg-[#0c0d10] p-2">
                    <span className="text-[#6b7280] block text-[9px]">RESOLUTION</span>
                    <span className="text-[#f2f3f5]">Up to 24-bit / 192 kHz PCM</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.05] bg-[#0c0d10] p-2">
                    <span className="text-[#6b7280] block text-[9px]">STORAGE</span>
                    <span className="text-[#f2f3f5]">Local Audio Vault</span>
                  </div>
                  <div className="rounded-lg border border-white/[0.05] bg-[#0c0d10] p-2">
                    <span className="text-[#6b7280] block text-[9px]">EQUALIZER</span>
                    <span className="text-[#f2f3f5]">10-Band Hardware DSP</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Updates */}
          {activeTab === "updates" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#f2f3f5]">Layam Hi-Fi Player</h4>
                    <p className="text-[11px] text-[#9ba1ad] font-mono mt-0.5">
                      Current Version: <span className="text-[#e59e38]">v1.0.0-offline</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-[#16181e] p-1 rounded-lg border border-white/[0.06]">
                    {(["stable", "beta", "dev"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(ch);
                          setUpdateChecked(false);
                          setUpdateResult(null);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                          selectedChannel === ch
                            ? "bg-[#e59e38] text-[#090a0c]"
                            : "text-[#9ba1ad] hover:text-[#f2f3f5]"
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/[0.05]">
                  <span className="text-[11px] text-[#6b7280] font-mono">
                    Last checked: {lastChecked}
                  </span>
                  <button
                    onClick={handleCheckForUpdates}
                    disabled={isCheckingUpdate}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e59e38] text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isCheckingUpdate ? "animate-spin" : ""}`} />
                    {isCheckingUpdate ? "Checking..." : "Check for Updates"}
                  </button>
                </div>

                {updateChecked && updateResult?.status === "up_to_date" && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-center gap-2.5 text-emerald-400">
                    <Check className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-medium">
                      You're running the latest {selectedChannel} version.
                    </span>
                  </div>
                )}

                {updateChecked && updateResult?.status === "update_available" && (
                  <div className="rounded-lg border border-[#e59e38]/30 bg-[#e59e38]/10 p-3 space-y-2 text-[#f2f3f5]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-[#e59e38]">
                        <Sparkles className="h-4 w-4" />
                        <span>Layam Hi-Fi {updateResult.latestVersion} is available.</span>
                      </div>
                      {updateResult.release?.publishedAt && (
                        <span className="text-[10px] text-[#9ba1ad] font-mono">
                          {new Date(updateResult.release.publishedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {updateResult.release?.releaseTitle && (
                      <h6 className="font-semibold text-xs text-[#f2f3f5]">
                        {updateResult.release.releaseTitle}
                      </h6>
                    )}
                    {updateResult.release?.releaseNotes && (
                      <p className="text-[11px] text-[#9ba1ad] leading-relaxed whitespace-pre-line">
                        {updateResult.release.releaseNotes}
                      </p>
                    )}
                    {updateResult.release?.downloadUrl && (
                      <a
                        href={updateResult.release.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#e59e38] hover:underline pt-1"
                      >
                        Download Release Asset <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {updateChecked && updateResult?.status === "update_required" && (
                  <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 space-y-2 text-[#f2f3f5]">
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-400">
                      <X className="h-4 w-4" />
                      <span>Mandatory Update Required: Layam Hi-Fi {updateResult.latestVersion}</span>
                    </div>
                    <p className="text-[11px] text-[#9ba1ad] leading-relaxed">
                      Your current installation ({updateResult.currentVersion}) is below the minimum supported version ({updateResult.release?.minimumSupportedVersion}).
                    </p>
                    {updateResult.release?.downloadUrl && (
                      <a
                        href={updateResult.release.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:underline pt-1"
                      >
                        Download Required Update <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {updateChecked && updateResult?.status === "offline_error" && (
                  <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-3 flex items-center gap-2.5 text-[#9ba1ad]">
                    <X className="h-4 w-4 shrink-0 text-zinc-400" />
                    <span className="text-xs font-medium">
                      Unable to check for updates while offline.
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h5 className="font-tech text-[#6b7280] uppercase text-[9px] tracking-wider">What's New in v1.0.0</h5>
                <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5 space-y-2 text-xs">
                  {[
                    "64-bit Floating Point Web Audio DSP mastering pipeline",
                    "10-Band Parametric Hardware Equalizer with custom preset saving",
                    "Native OS & Bluetooth media key integration (navigator.mediaSession)",
                    "Zero-latency IndexedDB local audio vault persistence",
                    "Multi-column sorting and instant track search",
                    "Synchronized Lyrics line-by-line viewer & .LRC file importer",
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[#9ba1ad]">
                      <Sparkles className="h-3.5 w-3.5 text-[#e59e38] shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Privacy */}
          {activeTab === "privacy" && (
            <div className="space-y-3.5">
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#e59e38]">
                  <ShieldCheck className="h-4 w-4" />
                  Privacy Architecture
                </div>
                <p className="mt-1 text-xs text-[#9ba1ad] leading-relaxed">
                  Layam Hi-Fi Player does <strong>not</strong> upload, scan, or log your audio files, tracks, artists, or listening history.
                  Everything remains strictly on your local device with zero cloud tracking or user profiling.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
                <div>
                  <h5 className="font-semibold text-[#f2f3f5]">Anonymous Crash Reports</h5>
                  <p className="text-[10px] text-[#6b7280] max-w-sm mt-0.5">
                    Optionally shares anonymous hardware audio error codes to assist development.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={telemetryEnabled}
                  onChange={(e) => handleToggleTelemetry(e.target.checked)}
                  className="h-4 w-4 accent-[#e59e38] cursor-pointer"
                />
              </div>

              {/* Opt-In Online Metadata (Artwork & Synced Lyrics) */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
                <div className="max-w-sm">
                  <h5 className="font-semibold text-[#f2f3f5]">Fetch Online Metadata</h5>
                  <p className="text-[10px] text-[#6b7280] mt-0.5 leading-relaxed">
                    Auto-enhances missing high-res cover art (iTunes) and synchronized lyrics (LRCLIB). Cached in IndexedDB for offline use. Disabled by default.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !onlineOptIn;
                    OnlineMetadataService.setOptIn(next);
                    setOnlineOptIn(next);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono font-bold transition-all cursor-pointer border ${
                    onlineOptIn
                      ? "border-[#e59e38]/50 bg-[#e59e38]/15 text-[#e59e38]"
                      : "border-white/[0.1] bg-[#16181e] text-[#9ba1ad] hover:text-[#f2f3f5]"
                  }`}
                >
                  {onlineOptIn ? "OPT-IN ENABLED" : "LOCAL ONLY"}
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Support */}
          {activeTab === "support" && (
            <div className="space-y-3.5">
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f2f3f5]">
                  <Heart className="h-4 w-4 text-[#e59e38]" />
                  SUPPORT LAYAM
                </div>
                <p className="mt-1 text-xs text-[#9ba1ad] leading-relaxed">
                  Choose any amount you'd like. Layam is built as independent audiophile software without advertisements or subscriptions.
                </p>
              </div>

              <form onSubmit={handleInitiateSupport} noValidate className="space-y-3.5">
                <div>
                  <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1.5">
                    Select or Enter Contribution Amount (USD)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {[5, 10, 25, 50, 100].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => {
                          setContributionAmount(String(amt));
                          setSupportStatusMessage("");
                          setSupportStatusType("idle");
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-mono font-bold transition-all cursor-pointer ${
                          contributionAmount === String(amt)
                            ? "bg-[#e59e38] text-[#090a0c]"
                            : "border border-white/[0.08] bg-[#16181e] text-[#9ba1ad] hover:text-[#f2f3f5]"
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-sm text-[#e59e38]">
                      $
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="0.5"
                      max="10000"
                      value={contributionAmount}
                      onChange={(e) => {
                        setContributionAmount(e.target.value);
                        setSupportStatusMessage("");
                        setSupportStatusType("idle");
                      }}
                      placeholder="Enter custom amount"
                      disabled={isSubmittingSupport}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#060708] pl-8 pr-3 py-2.5 text-sm font-mono text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38] focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#6b7280] leading-relaxed">
                  Your contribution is completely voluntary and does not unlock features or content.
                </p>

                {isMobilePlatform ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-400">
                    In-app contribution requires native mobile build packaging for your platform.
                  </div>
                ) : (
                  <>
                    {supportStatusMessage && supportStatusType === "error" && (
                      <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-medium text-rose-400 flex items-center gap-2">
                        <X className="h-4 w-4 shrink-0" />
                        <span>{supportStatusMessage}</span>
                      </div>
                    )}

                    {supportStatusMessage && supportStatusType === "success" && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-400 flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0" />
                        <span>{supportStatusMessage}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingSupport}
                      className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#e59e38] py-2.5 text-xs font-bold text-[#090a0c] hover:bg-[#f0ab4d] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isSubmittingSupport ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Support Layam
                          <ExternalLink className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </form>
            </div>
          )}

          {/* Tab 4: Feedback */}
          {activeTab === "feedback" && (
            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <div>
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1">Feedback Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "general" as const, label: "General" },
                    { id: "audio_dsp" as const, label: "Audio DSP" },
                    { id: "bug" as const, label: "Bug" },
                    { id: "idea" as const, label: "Idea" },
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFeedbackCategory(cat.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        feedbackCategory === cat.id
                          ? "bg-[#e59e38] text-[#090a0c] font-bold shadow-sm"
                          : "border border-white/[0.07] bg-[#16181e] text-[#9ba1ad] hover:text-[#f2f3f5]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1">
                  Email (Optional — for follow-up)
                </label>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(e) => setFeedbackEmail(e.target.value)}
                  placeholder="your.email@example.com (optional)"
                  disabled={feedbackState === "submitting"}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#060708] p-2 text-xs text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1">Message</label>
                <textarea
                  rows={3}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Describe your suggestion or audio issue..."
                  disabled={feedbackState === "submitting"}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#060708] p-2.5 text-xs text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38] focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-[#6b7280] leading-relaxed">
                Email is optional. Feedback is sent to Layam's server only when you click submit. Your local music library, files, and listening history are never attached.
              </p>

              {feedbackState === "sent" && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-xs font-medium text-emerald-400 flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{feedbackResponseMessage || "Feedback sent successfully."}</span>
                </div>
              )}

              {feedbackState === "queued" && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-xs font-medium text-amber-400 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  <span>{feedbackResponseMessage || "You're offline. Feedback will be available when you're connected."}</span>
                </div>
              )}

              {feedbackState === "error" && (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-medium text-rose-400 flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{feedbackResponseMessage || "Unable to send feedback. Please try again."}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!feedbackMessage.trim() || feedbackState === "submitting"}
                className="flex items-center gap-1.5 rounded-lg bg-[#e59e38] px-4 py-1.5 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {feedbackState === "submitting" ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Feedback"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
