import React, { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Layam Hi-Fi ErrorBoundary caught error]:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#090a0c] text-[#f2f3f5] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-white/[0.08] bg-[#111216] p-8 text-center shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-[#e59e38] mx-auto border border-[#e59e38]/30">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold tracking-tight">Audio Interface Recovered</h2>
            <p className="text-xs text-[#9ba1ad] leading-relaxed">
              An unexpected UI render condition was safely captured. Your offline audio vault remains completely intact.
            </p>
            {this.state.error && (
              <pre className="p-3 rounded-lg bg-[#060708] border border-white/[0.05] text-[10px] font-mono text-[#6b7280] text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#e59e38] px-4 py-2 text-xs font-semibold text-[#090a0c] hover:bg-[#f0ab4d] cursor-pointer shadow-sm transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload Audio Engine
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
