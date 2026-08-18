import { getAdapter, getAppMode } from "./dataSource";
import { marketConfig } from "@/lib/marketConfig";
import type { AppSettings } from "@/lib/types";

export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    const mode = getAppMode();
    const adapter = getAdapter();
    const recordCount = await adapter.getRecordCount();
    const lastSync = await adapter.getLastSync();

    const googleConnected = mode === "live" && !!process.env.GOOGLE_SHEET_ID && !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const whatsappConnected = !!process.env.TWILIO_ACCOUNT_SID || !!process.env.META_WHATSAPP_TOKEN;
    const voiceConnected = !!process.env.VOICE_PHONE_NUMBER;

    return {
      company: {
        name: "OneX Properties",
        country: marketConfig.country,
        city: marketConfig.city,
        currency: marketConfig.currency,
        timezone: marketConfig.timezone,
      },
      whatsapp: {
        provider: process.env.WHATSAPP_PROVIDER === "meta" ? "Meta WhatsApp Cloud API" : "Twilio",
        number: process.env.WHATSAPP_NUMBER ?? null,
        connected: whatsappConnected,
      },
      voice: {
        provider: process.env.VOICE_PROVIDER ?? "Twilio",
        number: process.env.VOICE_PHONE_NUMBER ?? null,
        agentName: process.env.VOICE_AGENT_NAME ?? "Sofia",
        recordingEnabled: (process.env.VOICE_RECORDING_ENABLED ?? "true") === "true",
        transcriptEnabled: (process.env.VOICE_TRANSCRIPT_ENABLED ?? "true") === "true",
        connected: voiceConnected,
      },
      aiAgent: {
        name: process.env.VOICE_AGENT_NAME ?? "Sofia",
        role: "AI Qualification Agent",
        qualificationThreshold: 60,
      },
      integrations: {
        googleSheets: {
          connected: mode === "live" ? googleConnected : true,
          label: mode === "live" ? (googleConnected ? "Connected" : "Not connected") : "Demo data",
          detail: mode === "live" ? "OneX Lead Data" : "Realistic Dubai demo dataset",
          lastSync,
          recordCount,
        },
        whatsapp: {
          connected: whatsappConnected,
          label: whatsappConnected ? "Connected" : "Not connected",
        },
        voice: {
          connected: voiceConnected,
          label: voiceConnected ? "Connected" : "Not connected",
        },
      },
      appMode: mode,
    };
  },
};
