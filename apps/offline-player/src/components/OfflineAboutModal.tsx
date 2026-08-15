import { useState } from "react";
import {
  Info,
  X,
  ShieldCheck,
  Heart,
  MessageSquare,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  AnonymousDeviceService,
  analytics,
  feedbackService,
  supportService,
  OFFLINE_SUPPORTER_TIERS,
} from "../services";
import { useLocalVault } from "../providers/LocalVaultProvider";
import { BrandLogo } from "@layam/design-system";
import { useEffect } from "react";

export function OfflineAboutModal() {
  const { isAboutOpen, setIsAboutOpen } = useLocalVault();
  const [activeTab, setActiveTab] = useState<"about" | "privacy" | "support" | "feedback">("about");
  const [copied, setCopied] = useState(false);
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => analytics.isTelemetryEnabled());

  // Feedback form
  const [feedbackCategory, setFeedbackCategory] = useState<"bug" | "feature_request" | "audio_quality" | "general">("general");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

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

  const deviceId = AnonymousDeviceService.getDeviceId();

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleTelemetry = (enabled: boolean) => {
    setTelemetryEnabled(enabled);
    analytics.setTelemetryEnabled(enabled);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    await feedbackService.submitFeedback({
      category: feedbackCategory,
      message: feedbackMessage,
      includeDiagnostics: true,
    });

    setFeedbackSubmitted(true);
    setFeedbackMessage("");
    setTimeout(() => setFeedbackSubmitted(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-white/[0.08] bg-[#111216] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <BrandLogo variant="compact" size="xs" showBadge badgeText="v1.0" />
          <button
            onClick={() => setIsAboutOpen(false)}
            className="rounded-lg p-1 text-[#6b7280] hover:bg-[#16181e] hover:text-[#f2f3f5] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.07] px-5 py-2 bg-[#0c0d10]">
          {[
            { id: "about" as const, label: "About", icon: Info },
            { id: "privacy" as const, label: "Privacy & Data", icon: ShieldCheck },
            { id: "support" as const, label: "Support", icon: Heart },
            { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#16181e] text-[#e59e38] font-semibold border border-white/[0.08]"
                  : "text-[#9ba1ad] hover:text-[#f2f3f5]"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 text-xs text-[#9ba1ad] space-y-4">
          {/* Tab 1: About */}
          {activeTab === "about" && (
            <div className="space-y-3.5">
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-4 flex flex-col gap-3">
                <BrandLogo variant="full" size="sm" showBadge badgeText="BIT-PERFECT" />
                <p className="text-xs leading-relaxed text-[#9ba1ad]">
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
                  Everything remains strictly on your local device.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block">Privacy Identifier</label>
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#060708] p-2">
                  <span className="font-tech text-xs text-[#f2f3f5] truncate flex-1">{deviceId}</span>
                  <button
                    onClick={handleCopyDeviceId}
                    className="flex items-center gap-1 rounded bg-[#16181e] px-2 py-1 text-[10px] font-tech text-[#f2f3f5] hover:bg-[#1e2027] cursor-pointer"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
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
            </div>
          )}

          {/* Tab 3: Support */}
          {activeTab === "support" && (
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3.5">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-[#f2f3f5]">
                  <Heart className="h-4 w-4 text-[#e59e38]" />
                  Independent Audio Software
                </div>
                <p className="mt-1 text-xs text-[#9ba1ad] leading-relaxed">
                  Layam is built without advertisements or subscriptions. Voluntary contributions support codec research and room impulse profiling.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {OFFLINE_SUPPORTER_TIERS.map((tier) => (
                  <div key={tier.id} className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-[#f2f3f5] text-xs">{tier.name}</h5>
                        <span className="font-tech font-bold text-[#e59e38] text-xs">${tier.amountUsd}</span>
                      </div>
                      <p className="text-[10px] text-[#6b7280] mt-1 mb-2">{tier.description}</p>
                    </div>

                    <button
                      onClick={() => supportService.initiateSupport(tier.id)}
                      className="mt-2 flex items-center justify-center gap-1 rounded-md bg-[#e59e38] py-1.5 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer"
                    >
                      Support <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Feedback */}
          {activeTab === "feedback" && (
            <form onSubmit={handleSubmitFeedback} className="space-y-3">
              <div>
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1">Feedback Type</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "general" as const, label: "General" },
                    { id: "audio_quality" as const, label: "Audio DSP" },
                    { id: "bug" as const, label: "Bug" },
                    { id: "feature_request" as const, label: "Idea" },
                  ].map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setFeedbackCategory(cat.id)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                        feedbackCategory === cat.id
                          ? "bg-[#e59e38] text-[#090a0c] font-bold"
                          : "border border-white/[0.07] bg-[#16181e] text-[#9ba1ad]"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-tech uppercase text-[#6b7280] block mb-1">Message</label>
                <textarea
                  rows={3}
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Describe your suggestion or audio bug..."
                  className="w-full rounded-lg border border-white/[0.08] bg-[#060708] p-2.5 text-xs text-[#f2f3f5] placeholder-[#6b7280] focus:border-[#e59e38] focus:outline-none"
                />
              </div>

              {feedbackSubmitted && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-xs font-medium text-emerald-400">
                  Feedback recorded. Thank you for helping improve Layam!
                </div>
              )}

              <button
                type="submit"
                disabled={!feedbackMessage.trim()}
                className="rounded-lg bg-[#e59e38] px-4 py-1.5 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] disabled:opacity-50 cursor-pointer"
              >
                Send Feedback
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
