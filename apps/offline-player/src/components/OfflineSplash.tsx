import React from "react";
import { BrandLogo } from "./BrandLogo";

export interface OfflineSplashProps {
  message?: string;
}

export const OfflineSplash: React.FC<OfflineSplashProps> = ({
  message = "Initializing bit-perfect audio engine...",
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090a0c] text-[#f2f3f5]">
      <div className="flex flex-col items-center gap-6">
        <BrandLogo variant="mark" size="xl" />
        
        <div className="text-center space-y-1.5">
          <h1 className="text-xl font-black tracking-widest text-[#f2f3f5]">
            LAYAM
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#e59e38]">
            Offline Player
          </p>
        </div>

        <div className="w-48 h-0.5 bg-[#16181e] rounded-full overflow-hidden mt-4">
          <div className="h-full bg-[#e59e38] w-1/3 rounded-full animate-pulse" />
        </div>

        <p className="text-[10px] font-tech text-[#6b7280] tracking-wider uppercase">
          {message}
        </p>
      </div>
    </div>
  );
};

export default OfflineSplash;
