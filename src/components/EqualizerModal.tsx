import { useState } from "react";
import { SlidersHorizontal, Gauge, Volume2, Flame, Waves, Shuffle } from "lucide-react";
import { usePlayer, EQ_FREQUENCIES, EQ_PRESETS, PLAYBACK_RATES } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export function EqualizerModal() {
  const [open, setOpen] = useState(false);
  const {
    eqEnabled,
    eqGains,
    eqPreset,
    bassBoostLevel,
    normalizerEnabled,
    crossfadeDuration,
    playbackRate,
    setEqGain,
    setEqPreset,
    toggleEq,
    setBassBoostLevel,
    toggleNormalizer,
    setCrossfadeDuration,
    setPlaybackRate,
  } = usePlayer();

  const labels = ["32Hz", "64Hz", "125Hz", "250Hz", "500Hz", "1kHz", "2kHz", "4kHz", "8kHz", "16kHz"];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>DSP & 10-Band EQ</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <span>WebAudio DSP & 10-Band Equalizer</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            10-Band Biquad EQ, Bass Boost, Dynamic Range Normalizer & Crossfade transitions.
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* EQ Toggle & Presets */}
          <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-surface-raised p-4">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">10-Band Equalizer</p>
                <p className="text-xs text-muted-foreground">
                  {eqEnabled ? `Active (${eqPreset})` : "Bypassed"}
                </p>
              </div>
            </div>
            <Switch checked={eqEnabled} onCheckedChange={toggleEq} />
          </div>

          {/* Presets */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Equalizer Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(EQ_PRESETS).map((preset) => (
                <Button
                  key={preset}
                  size="sm"
                  variant={eqPreset === preset ? "default" : "outline"}
                  onClick={() => setEqPreset(preset)}
                  disabled={!eqEnabled}
                  className={
                    eqPreset === preset
                      ? "bg-primary text-primary-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  }
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          {/* 10-Band Sliders */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 text-center">
              {EQ_FREQUENCIES.map((freq, index) => (
                <div key={freq} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] font-mono font-semibold text-primary">
                    {(eqGains[index] ?? 0) > 0 ? `+${eqGains[index] ?? 0}` : (eqGains[index] ?? 0)}
                  </span>

                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    disabled={!eqEnabled}
                    value={eqGains[index] ?? 0}
                    onChange={(e) => setEqGain(index, parseFloat(e.target.value))}
                    className="h-28 w-2 cursor-pointer appearance-none rounded-lg bg-surface-raised accent-primary disabled:opacity-40 [writing-mode:vertical-lr] [direction:rtl]"
                  />

                  <span className="text-[9px] font-mono text-muted-foreground">
                    {labels[index]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bass Boost & Normalizer Controls */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Bass Boost */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-bold">Bass Boost</span>
                </div>
                <span className="font-mono text-xs font-bold text-amber-300">
                  +{bassBoostLevel} dB
                </span>
              </div>
              <Slider
                value={[bassBoostLevel]}
                min={0}
                max={12}
                step={1}
                onValueChange={(val) => {
                  if (typeof val[0] === "number") setBassBoostLevel(val[0]);
                }}
                className="accent-amber-500"
              />
            </div>

            {/* Audio Normalizer */}
            <div className="flex items-center justify-between rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2.5">
                <Waves className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-foreground">Audio Normalizer</p>
                  <p className="text-[11px] text-muted-foreground">Dynamic compressor to even volume</p>
                </div>
              </div>
              <Switch checked={normalizerEnabled} onCheckedChange={toggleNormalizer} />
            </div>
          </div>

          {/* Crossfade & Gapless Playback */}
          <div className="rounded-2xl border border-border/60 bg-surface-raised p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary">
                <Shuffle className="h-4 w-4" />
                <span className="text-sm font-bold text-foreground">Crossfade & Gapless</span>
              </div>
              <span className="font-mono text-xs font-bold text-primary">
                {crossfadeDuration === 0 ? "0s (Gapless)" : `${crossfadeDuration}s Crossfade`}
              </span>
            </div>
            <Slider
              value={[crossfadeDuration]}
              min={0}
              max={12}
              step={1}
              onValueChange={(val) => {
                if (typeof val[0] === "number") setCrossfadeDuration(val[0]);
              }}
            />
          </div>

          {/* Speed Selector */}
          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Playback Speed</span>
              <span className="ml-auto text-xs font-semibold text-primary">{playbackRate}x</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PLAYBACK_RATES.map((rate) => (
                <Button
                  key={rate}
                  size="sm"
                  variant={playbackRate === rate ? "default" : "outline"}
                  onClick={() => setPlaybackRate(rate)}
                  className={
                    playbackRate === rate
                      ? "bg-primary text-primary-foreground"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  }
                >
                  {rate}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
