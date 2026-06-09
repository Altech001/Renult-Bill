import AppHeader from "@/components/Header/AppHeader";
import SEO from "@/components/SEO";
import {
  Bell,
  Building2,
  CreditCard,
  Key,
  Megaphone,
  User,
  Wallet,
  ScrollText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/* ─── sidebar nav config ─── */
interface SettingsNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
}

const navItems: SettingsNavItem[] = [
  {
    id: "router-logs",
    label: "Router Logs",
    icon: <ScrollText className="w-4 h-4" />,
    path: "/settings/router-logs",
  },
  {
    id: "my-details",
    label: "My Profile",
    icon: <User className="w-4 h-4" />,
    path: "/settings",
  },
  {
    id: "password",
    label: "Password",
    icon: <Key className="w-4 h-4" />,
    path: "/settings/password",
  },
  {
    id: "wallet-mgmt",
    label: "Wallet Mgmt",
    icon: <Wallet className="w-4 h-4" />,
    path: "/settings/wallet",
  },
  {
    id: "billing",
    label: "Transactions",
    icon: <CreditCard className="w-4 h-4" />,
    path: "/settings/billing",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <Bell className="w-4 h-4" />,
    path: "/settings/notifications",
  },
  {
    id: "campaigns",
    label: "Campaigns",
    icon: <Megaphone className="w-4 h-4" />,
    path: "/campaigns",
  },
];

interface SettingsLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function SettingsLayout({
  children,
  title = "Settings",
}: SettingsLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    localStorage.getItem("sidebar-collapsed") === "true"
  );

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed: boolean }>).detail;
      setSidebarCollapsed(detail.collapsed);
    };
    window.addEventListener("sidebar-collapse-change", handler);
    return () =>
      window.removeEventListener("sidebar-collapse-change", handler);
  }, []);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div
      className={`min-h-screen bg-background transition-all duration-300 ${sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[280px]"
        }`}
    >
      <SEO title={title} />
      <AppHeader />

      <div className="flex min-h-[calc(100vh-57px)]">
        {/* ── settings sidebar ── */}
        <aside className="hidden lg:flex flex-col w-[250px] shrink-0 border-r border-border/50 bg-white">
          <div className="px-4 pt-6 pb-2">
            <span className="text-lg font-semibold text-black">
              Settings
            </span>
          </div>

          <nav className="flex-1 px-2 pb-4 pt-1">
            <div className="flex flex-col gap-px">
              {navItems.map((item) => {
                const active = isActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`
                      group flex items-center gap-2.5 px-3 py-2 m-0.5 rounded  text-sm font-medium
                      transition-all duration-150 cursor-pointer w-full text-left
                      ${active
                        ? "bg-primary text-white border border-border/10 "
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground "
                      }
                    `}
                  >
                    <span
                      className={`transition-colors duration-150 ${active
                        ? "text-white"
                        : "text-muted-foreground/70 group-hover:text-foreground/60"
                        }`}
                    >
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span
                        className={`
                          text-xs font-semibold px-1.5 py-0.5 rounded-full leading-none
                          ${active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                          }
                        `}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        </aside>

        {/* ── main content ── */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
