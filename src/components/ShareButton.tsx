import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { Share2, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ShareComponentProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The URL to share. Defaults to window.location.href */
  url?: string;
  /** Title used for Web Share dialog. Defaults to document.title */
  title?: string;
  /** Optional summary or description text for Web Share */
  text?: string;
  /** Visual variant of the button */
  variant?: "default" | "outline" | "secondary" | "ghost" | "icon" | "pill";
  /** Size modifier */
  size?: "default" | "sm" | "lg" | "icon";
  /** Whether to show a text label alongside the icon */
  showLabel?: boolean;
  /** Custom label when not copied. Defaults to "Share" */
  label?: string;
  /** Custom label when copied. Defaults to "Copied!" */
  copiedLabel?: string;
  /** Custom message for toast */
  toastMessage?: string;
  /** Optional callback fired when shared via Web Share API */
  onShareSuccess?: () => void;
  /** Optional callback fired when copied to clipboard */
  onCopySuccess?: () => void;
}

/**
 * Modern, accessible Share component for mobile and desktop web.
 * - Uses Web Share API when supported (e.g. mobile Safari, Chrome).
 * - Gracefully falls back to navigator.clipboard.writeText with legacy execCommand backup.
 * - Features clean Tailwind CSS visual indicators (animated check icon, pulse border, floating badge).
 * - Fully accessible with aria-live="polite", dynamic aria-labels, and touch-target compliance.
 */
export const Share = React.forwardRef<HTMLButtonElement, ShareComponentProps>(
  (
    {
      url,
      title,
      text,
      variant = "outline",
      size = "default",
      showLabel = true,
      label = "Share",
      copiedLabel = "Copied!",
      toastMessage = "Link copied to clipboard!",
      className,
      onClick,
      onShareSuccess,
      onCopySuccess,
      ...props
    },
    ref,
  ) => {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clean up timeout on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const getShareUrl = (): string => {
      if (url) return url;
      if (typeof window !== "undefined") return window.location.href;
      return "";
    };

    const getShareTitle = (): string => {
      if (title) return title;
      if (typeof document !== "undefined") return document.title;
      return "Layam";
    };

    const triggerCopiedState = () => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2400);

      const isLocalhost =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1");

      if (toastMessage) {
        toast.success(toastMessage, {
          description: isLocalhost
            ? "Note: 'localhost' only works on this Mac. To open on other devices, connect to the same Wi-Fi and use your Mac's IP (e.g. 192.168.1.40)."
            : "Ready to paste and share anywhere.",
          duration: 4500,
        });
      }
      onCopySuccess?.();
    };

    const copyToClipboard = async (targetUrl: string) => {
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(targetUrl);
          triggerCopiedState();
          return;
        }
        throw new Error("Clipboard API unavailable");
      } catch (err) {
        // Fallback for older browsers or restricted permissions
        try {
          const textArea = document.createElement("textarea");
          textArea.value = targetUrl;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          textArea.style.top = "0";
          textArea.setAttribute("readonly", "");
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textArea);
          if (successful) {
            triggerCopiedState();
            return;
          }
        } catch {
          // Both failed
        }
        toast.error("Unable to copy link automatically. Please copy the URL from your address bar.");
      }
    };

    const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      if (e.defaultPrevented) return;

      const targetUrl = getShareUrl();
      const targetTitle = getShareTitle();
      const shareData: ShareData = {
        title: targetTitle,
        url: targetUrl,
        ...(text ? { text } : {}),
      };

      // Check if Web Share API is available and can share the target payload
      const canWebShare =
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function" &&
        (!navigator.canShare || navigator.canShare(shareData));

      if (canWebShare) {
        setIsSharing(true);
        try {
          await navigator.share(shareData);
          onShareSuccess?.();
        } catch (err: unknown) {
          // User aborted/cancelled the native share sheet
          if (err instanceof DOMException && err.name === "AbortError") {
            // User closed the share menu, no fallback or error needed
            return;
          }
          // On other errors (e.g. system permissions or network), gracefully fall back to clipboard copy
          await copyToClipboard(targetUrl);
        } finally {
          setIsSharing(false);
        }
      } else {
        // Fallback directly to clipboard
        await copyToClipboard(targetUrl);
      }
    };

    // Styling configurations based on variant and state
    const variantStyles = {
      default:
        "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20",
      outline:
        "border border-border/60 bg-surface-raised/70 text-foreground hover:text-primary hover:border-primary/50 hover:bg-surface-raised backdrop-blur-sm",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      ghost:
        "text-muted-foreground hover:text-foreground hover:bg-white/5",
      icon:
        "rounded-full border border-border/60 bg-surface-raised/80 text-muted-foreground hover:text-foreground hover:border-primary/50 shadow-sm",
      pill:
        "rounded-full border border-border/60 bg-surface-raised/90 text-foreground hover:border-primary/60 hover:text-primary backdrop-blur-md px-4 py-2",
    };

    const sizeStyles = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-8 px-3 text-xs gap-1.5",
      lg: "h-12 px-6 text-base gap-2.5",
      icon: "h-10 w-10 p-0 flex items-center justify-center aspect-square",
    };

    const isIconOnly = !showLabel || size === "icon" || variant === "icon";

    return (
      <div className="relative inline-flex items-center">
        <button
          ref={ref}
          type="button"
          onClick={handleShare}
          disabled={isSharing || props.disabled}
          aria-label={
            copied
              ? "Link copied to clipboard"
              : props["aria-label"] || `Share ${getShareTitle()}`
          }
          className={cn(
            "group relative inline-flex items-center justify-center font-medium cursor-pointer rounded-xl transition-all duration-300 select-none",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
            sizeStyles[size],
            variantStyles[variant],
            copied &&
              "border-emerald-500/60 bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/30 hover:border-emerald-500/80 hover:text-emerald-300",
            className,
          )}
          {...props}
        >
          {/* Animated Icons */}
          <div className="relative flex items-center justify-center">
            {copied ? (
              <Check
                className={cn(
                  "h-4 w-4 text-emerald-400 stroke-[2.5] transition-all duration-300 animate-in zoom-in-75",
                  size === "sm" && "h-3.5 w-3.5",
                  size === "lg" && "h-5 w-5",
                )}
                aria-hidden="true"
              />
            ) : (
              <Share2
                className={cn(
                  "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                  size === "sm" && "h-3.5 w-3.5",
                  size === "lg" && "h-5 w-5",
                )}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Label Text */}
          {!isIconOnly && (
            <span
              className={cn(
                "ml-2 transition-all duration-200 font-medium",
                copied ? "text-emerald-400 font-semibold" : "",
              )}
            >
              {copied ? copiedLabel : label}
            </span>
          )}

          {/* Accessible announcement for screen readers */}
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? "Link copied to clipboard!" : ""}
          </span>
        </button>

        {/* Clean floating 'Copied!' pill indicator for icon-only variant */}
        {isIconOnly && copied && (
          <div
            role="status"
            aria-live="polite"
            className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 pointer-events-none whitespace-nowrap rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-black shadow-lg shadow-emerald-500/20 animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-200 flex items-center gap-1"
          >
            <Check className="h-3 w-3 stroke-[3]" />
            <span>Copied!</span>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-emerald-500" />
          </div>
        )}
      </div>
    );
  },
);

Share.displayName = "Share";

export const ShareButton = Share;
export default Share;
