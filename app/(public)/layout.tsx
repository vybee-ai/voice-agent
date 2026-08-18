import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Talk to Sofia | OneX",
  description: "Have a live voice conversation with Sofia, your AI Property Consultant from OneX.",
};

/**
 * Public layout — no CRM shell (no sidebar, no header).
 * Used for client-facing pages like /talk-to-sofia.
 * The (public) route group is transparent to Next.js routing.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
