import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneX Lead Management",
  description: "Dubai property lead management and sales-operations platform.",
};

/**
 * Root layout — provides the HTML shell only.
 * AppShell (sidebar + header) is applied only to CRM routes via app/(crm)/layout.tsx.
 * Public routes like /talk-to-sofia use app/(public)/layout.tsx with no chrome.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
