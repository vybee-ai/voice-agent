import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Talk to Sofia | OneX",
  description:
    "Have a live voice conversation with Sofia, your AI Property Consultant from OneX. Discover Dubai real estate opportunities instantly.",
};

/**
 * SofiaWebCall is loaded with ssr:false because @vapi-ai/web depends on
 * @daily-co/daily-js which uses browser-only APIs (MediaDevices, AudioContext,
 * DailyIframe etc.) that do not exist in the Node.js SSR environment.
 * ssr:false prevents the component from being rendered server-side at all.
 */
const SofiaWebCall = dynamic(() => import("@/components/voice/SofiaWebCall"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        background: "#080F1A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ color: "rgba(255,255,255,0.3)", fontFamily: "Inter, sans-serif", fontSize: "0.875rem" }}>
        Loading…
      </div>
    </div>
  ),
});

/**
 * /talk-to-sofia
 *
 * Public client-facing page — no CRM auth required.
 * Reads NEXT_PUBLIC_ env vars server-side so we can validate them before
 * rendering the client component, giving a clean unconfigured state rather
 * than an SDK crash.
 *
 * Environment variables required:
 *   NEXT_PUBLIC_VAPI_PUBLIC_KEY   — Vapi public key (browser-safe)
 *   NEXT_PUBLIC_VAPI_ASSISTANT_ID — Sofia assistant UUID from Vapi dashboard
 */
export default function TalkToSofiaPage() {
  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID ?? "";

  return (
    <SofiaWebCall
      publicKey={publicKey}
      assistantId={assistantId}
    />
  );
}
