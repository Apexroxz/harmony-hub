import React from "react";
import officialLogoPng from "../../assets/brand/logo.png";

export type LogoVariant = "full" | "mark" | "compact";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface BrandLogoProps {
  variant?: LogoVariant;
  size?: LogoSize;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  className?: string;
  onClick?: () => void;
}

const sizeConfig = {
  xs: {
    mark: "h-5 w-5 rounded-md",
    text: "text-xs tracking-tight",
    badge: "text-[8px] px-1 py-0.2",
    subtitle: "text-[8px]",
    containerGap: "gap-1.5",
  },
  sm: {
    mark: "h-7 w-7 rounded-lg",
    text: "text-sm font-semibold tracking-tight",
    badge: "text-[9px] px-1.5 py-0.5",
    subtitle: "text-[10px]",
    containerGap: "gap-2.5",
  },
  md: {
    mark: "h-9 w-9 rounded-xl",
    text: "text-base font-bold tracking-tight",
    badge: "text-[10px] px-2 py-0.5",
    subtitle: "text-xs",
    containerGap: "gap-3",
  },
  lg: {
    mark: "h-12 w-12 rounded-xl",
    text: "text-xl font-extrabold tracking-tight",
    badge: "text-xs px-2.5 py-0.5",
    subtitle: "text-xs",
    containerGap: "gap-3.5",
  },
  xl: {
    mark: "h-16 w-16 rounded-2xl",
    text: "text-2xl font-black tracking-wider",
    badge: "text-xs px-3 py-1",
    subtitle: "text-sm",
    containerGap: "gap-4",
  },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = "full",
  size = "sm",
  showBadge = false,
  badgeText = "BIT-PERFECT",
  subtitle = "BIT-PERFECT LOCAL AUDIO ENGINE",
  className = "",
  onClick,
}) => {
  const currentSize = sizeConfig[size] || sizeConfig.sm;

  if (variant === "mark") {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 ${className} ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
        role="img"
        aria-label="Layam Hi-Fi Player"
      >
        <img
          src={officialLogoPng}
          alt="Layam"
          className={`${currentSize.mark} select-none object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.35)] transition-transform hover:scale-105`}
        />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={`inline-flex items-center ${currentSize.containerGap} shrink-0 select-none ${className} ${onClick ? "cursor-pointer" : ""}`}
        onClick={onClick}
        role="img"
        aria-label="Layam Hi-Fi Player"
      >
        <img
          src={officialLogoPng}
          alt="Layam"
          className={`${currentSize.mark} shrink-0 object-contain drop-shadow-[0_0_10px_rgba(249,115,22,0.3)] transition-transform hover:scale-105`}
        />
        <div className="flex items-baseline gap-1.5">
          <span className={`${currentSize.text} font-black text-[#f2f3f5]`}>
            LAYAM <span className="text-[#e59e38] font-bold">Hi-Fi</span>
          </span>
          {showBadge && (
            <span className={`${currentSize.badge} font-tech uppercase font-bold text-[#e59e38] bg-[#e59e38]/10 border border-[#e59e38]/25 rounded`}>
              {badgeText}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full Variant
  return (
    <div
      className={`inline-flex items-center ${currentSize.containerGap} select-none ${className} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
      role="img"
      aria-label="Layam Hi-Fi Player"
    >
      <img
        src={officialLogoPng}
        alt="Layam"
        className={`${currentSize.mark} shrink-0 object-contain drop-shadow-[0_0_14px_rgba(249,115,22,0.35)] transition-transform hover:scale-105`}
      />
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-2">
          <span className={`${currentSize.text} font-black tracking-wide text-[#f2f3f5]`}>
            LAYAM <span className="text-[#e59e38] font-bold">Hi-Fi Player</span>
          </span>
          {showBadge && (
            <span className={`${currentSize.badge} font-tech uppercase font-semibold text-[#e59e38] bg-[#e59e38]/10 border border-[#e59e38]/25 rounded hidden sm:inline-block`}>
              {badgeText}
            </span>
          )}
        </div>
        {subtitle && (
          <p className={`${currentSize.subtitle} font-tech uppercase tracking-wider text-[#6b7280]`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
