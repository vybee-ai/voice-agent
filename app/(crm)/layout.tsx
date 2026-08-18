import AppShell from "@/components/layout/AppShell";

/**
 * CRM layout — wraps all internal dashboard routes with the AppShell
 * (sidebar + header). The (crm) route group is transparent to URLs,
 * so /dashboard, /leads, /calls etc. all work unchanged.
 */
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
