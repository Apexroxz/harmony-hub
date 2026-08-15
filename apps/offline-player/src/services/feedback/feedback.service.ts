/**
 * User Feedback & Bug Diagnostics Service Boundary
 */

import { AnonymousDeviceService } from "../identity/anonymous-device.service";

export interface FeedbackSubmission {
  category: "bug" | "feature_request" | "audio_quality" | "general";
  message: string;
  contactEmail?: string;
  includeDiagnostics?: boolean;
}

export interface IFeedbackService {
  submitFeedback(submission: FeedbackSubmission): Promise<{ success: boolean; message: string }>;
}

export class FeedbackService implements IFeedbackService {
  public async submitFeedback(submission: FeedbackSubmission): Promise<{ success: boolean; message: string }> {
    const payload = {
      ...submission,
      deviceId: AnonymousDeviceService.getDeviceId(),
      deviceInfo: submission.includeDiagnostics ? AnonymousDeviceService.getDeviceInfo() : undefined,
      timestamp: new Date().toISOString(),
    };

    if (process.env.NODE_ENV === "development") {
      console.info("[Feedback:StagingPayload]", payload);
    }

    return {
      success: true,
      message: "Feedback submitted locally. Thank you for making Layam better!",
    };
  }
}

export const feedbackService = new FeedbackService();
