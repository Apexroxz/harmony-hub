/**
 * User Feedback & Bug Diagnostics Service Boundary
 *
 * Securely transmits user feedback, bug reports, and audio feature suggestions
 * to the Supabase backend via the submit-feedback Edge Function.
 *
 * OFFLINE-FIRST:
 * - If offline or network unreachable, securely queues feedback in localStorage.
 * - Automatically flushes queued feedback when connectivity is restored.
 * - Strictly zero track, library, playback, or audio file information is ever attached.
 */

export type FeedbackCategory = "general" | "audio_dsp" | "bug" | "idea";

export interface FeedbackSubmission {
  category: FeedbackCategory;
  message: string;
  email?: string;
  app_version?: string;
  platform?: string;
  os_version?: string;
}

export interface FeedbackResult {
  success: boolean;
  status: "sent" | "queued" | "error";
  message: string;
}

interface QueuedFeedbackItem extends FeedbackSubmission {
  queuedAt: string;
}

const FEEDBACK_QUEUE_KEY = "layam_offline_queued_feedback";
const DEFAULT_SUPABASE_URL = "https://baofrcldcymrpbsxyooy.supabase.co";

export class FeedbackService {
  private isFlushingQueue = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.flushQueue().catch((err) =>
          console.warn("[FeedbackService] Auto-flush queue error:", err),
        );
      });
      // Initial queue flush check on startup if online
      if (navigator.onLine) {
        setTimeout(() => {
          this.flushQueue().catch(() => {});
        }, 3000);
      }
    }
  }

  private getEndpointUrl(): string {
    const baseUrl =
      (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
      DEFAULT_SUPABASE_URL;
    return `${baseUrl.replace(/\/$/, "")}/functions/v1/submit-feedback`;
  }

  private getApiKey(): string {
    return (
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)) ||
      ""
    );
  }

  public getQueuedItems(): QueuedFeedbackItem[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(FEEDBACK_QUEUE_KEY);
      return stored ? (JSON.parse(stored) as QueuedFeedbackItem[]) : [];
    } catch {
      return [];
    }
  }

  private enqueue(submission: FeedbackSubmission): void {
    if (typeof window === "undefined") return;
    try {
      const current = this.getQueuedItems();
      const item: QueuedFeedbackItem = {
        ...submission,
        queuedAt: new Date().toISOString(),
      };
      // Keep queue bounded to last 20 items max
      const updated = [...current.slice(-19), item];
      localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("[FeedbackService] Failed to queue feedback:", e);
    }
  }

  public async flushQueue(): Promise<number> {
    if (typeof window === "undefined" || !navigator.onLine || this.isFlushingQueue) {
      return 0;
    }

    const items = this.getQueuedItems();
    if (items.length === 0) return 0;

    this.isFlushingQueue = true;
    const remaining: QueuedFeedbackItem[] = [];
    let sentCount = 0;

    try {
      for (const item of items) {
        try {
          const res = await this.sendDirect(item);
          if (res.success) {
            sentCount++;
          } else {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem(FEEDBACK_QUEUE_KEY, JSON.stringify(remaining));
    } finally {
      this.isFlushingQueue = false;
    }

    return sentCount;
  }

  private async sendDirect(submission: FeedbackSubmission): Promise<FeedbackResult> {
    const endpoint = this.getEndpointUrl();
    const apiKey = this.getApiKey();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["apikey"] = apiKey;
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const payload = {
      category: submission.category,
      message: submission.message.trim(),
      email: submission.email ? submission.email.trim() : undefined,
      app_version: submission.app_version || "1.0.0-offline",
      platform: submission.platform || (typeof navigator !== "undefined" ? navigator.platform : "web"),
      os_version: submission.os_version,
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.success) {
      return {
        success: true,
        status: "sent",
        message: "Feedback sent successfully.",
      };
    }

    return {
      success: false,
      status: "error",
      message: data.error || "Unable to send feedback. Please try again.",
    };
  }

  public async submitFeedback(submission: FeedbackSubmission): Promise<FeedbackResult> {
    // 1. Client-Side Input Validation
    if (!submission.message || submission.message.trim().length === 0) {
      return {
        success: false,
        status: "error",
        message: "Feedback message cannot be empty.",
      };
    }

    if (submission.email && submission.email.trim().length > 0) {
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(submission.email.trim())) {
        return {
          success: false,
          status: "error",
          message: "Please enter a valid email address.",
        };
      }
    }

    // 2. Offline Detection & Local Queueing
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.enqueue(submission);
      return {
        success: true,
        status: "queued",
        message: "You're offline. Feedback will be available when you're connected.",
      };
    }

    // 3. Online Direct Submission with Network Failure Fallback
    try {
      return await this.sendDirect(submission);
    } catch (networkError) {
      console.warn("[FeedbackService] Network error during submit, queueing locally:", networkError);
      this.enqueue(submission);
      return {
        success: true,
        status: "queued",
        message: "You're offline. Feedback will be available when you're connected.",
      };
    }
  }
}

export const feedbackService = new FeedbackService();

