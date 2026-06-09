/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { CreditCard, Menu, PanelLeft, User } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import NotificationsDialog from "./NotificationsDialog";
import SideBar from "./SideBar";

interface AppHeaderProps {
  onCreateForm?: () => void;
}

export default function AppHeader({ onCreateForm }: AppHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    const handler = (e: any) => {
      setSidebarCollapsed(e.detail.collapsed);
    };
    window.addEventListener("sidebar-collapse-change", handler);
    return () => window.removeEventListener("sidebar-collapse-change", handler);
  }, []);

  const toggleSidebarCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    window.dispatchEvent(new CustomEvent("sidebar-collapse-change", { detail: { collapsed: next } }));
  };

  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path === "/") {
      return [
        { label: "Home", path: "/", isLast: true }
      ];
    }

    const parts = path.split("/").filter(Boolean);
    const breadcrumbs = [{ label: "Home", path: "/", isLast: false }];

    let currentPath = "";
    parts.forEach((part, index) => {
      currentPath += `/${part}`;
      const isLast = index === parts.length - 1;

      let label = part.charAt(0).toUpperCase() + part.slice(1);
      if (part === "settings") label = "Profile";
      if (part === "bookmark-documents") label = "Documents";

      breadcrumbs.push({
        label,
        path: currentPath,
        isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <>
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between h-14 px-3 sm:px-4">
          {/* Left section: hamburger/resize + logo/breadcrumb */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/60 transition-colors md:hidden"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5 text-foreground/70" />
            </button>

            {/* Desktop Resize Toggle */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:flex w-9 h-9 items-center justify-center transition-colors text-foreground/70"
              aria-label="Toggle sidebar collapse"
            >
              <PanelLeft className="w-[18px] h-[18px]" />
            </button>

            {/* Mobile Logo (hidden on desktop) */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity md:hidden"
            >
              <img
                src="/icons/mini.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </button>

            {/* Desktop Dynamic Breadcrumbs */}
            <div className="hidden md:block ml-1">
              <Breadcrumb>
                <BreadcrumbList>
                  {breadcrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.path}>
                      <BreadcrumbItem>
                        {crumb.isLast ? (
                          <BreadcrumbPage className="font-semibold text-foreground/80">{crumb.label}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link to={crumb.path} className="text-muted-foreground hover:text-foreground">{crumb.label}</Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!crumb.isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  ))}
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>

          {/* Right section: actions */}
          <div className="flex items-center gap-4 sm:gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 px-3 rounded font-semibold text-xs sm:text-sm">
                  {/* <CreditCard className="w-4 h-4" /> */}
                  <span className="hidden sm:inline">
                    <div
                  className="flex h-7 items-stretch justify-between gap-1"
                  role="img"
                  aria-label="Premium plan usage indicator"
                >
                  {Array.from({ length: 20 }, (_, index) => (
                    <span
                      key={index}
                      className="w-0.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          index < 7
                            ? `hsl(${Math.round(index * 6.5)} 95% 52%)`
                            : "hsl(var(--muted-foreground) / 0.18)",
                      }}
                    />
                  ))}
                </div>
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4 rounded">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">Router SNMP Status</p>
                  </div>
                  <span className="rounded bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-500">Online</span>
                </div>
                <div
                  className="mt-4 flex h-7 items-stretch justify-between gap-1"
                  role="img"
                  aria-label="Premium plan usage indicator"
                >
                  {Array.from({ length: 32 }, (_, index) => (
                    <span
                      key={index}
                      className="w-0.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          index < 7
                            ? `hsl(${Math.round(index * 6.5)} 95% 52%)`
                            : "hsl(var(--muted-foreground) / 0.18)",
                      }}
                    />
                  ))}
                </div>
                <p className="mt-4 border-t pt-3 text-[11px] text-muted-foreground">
                  Polling every 60s via SNMP v2c  ·  last polled just now
                </p>
              </PopoverContent>
            </Popover>

            <NotificationsDialog />

            {/* User avatar */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  className="w-9 h-9 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center
                    text-sm font-bold tracking-tight hover:ring-2 hover:ring-primary/30 transition-all
                    focus:outline-none focus:ring-2 focus:ring-primary/40 shrink-0"
                  aria-label="Account menu"
                >
                  {user?.full_name?.[0]?.toUpperCase() || "U"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded p-2 border-border/60 shadow-xl backdrop-blur-md bg-card/95"
              >
                <DropdownMenuLabel className="px-3 py-2">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-bold truncate">
                      {user?.full_name || "My Account"}
                    </p>
                    {user?.email && <p className="text-xs text-muted-foreground truncate">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/40 my-1" />
                {user?.account_type !== "staff" && <DropdownMenuItem
                  onClick={() => navigate("/settings")}
                  className="rounded px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-all gap-3"
                >
                  <User className="w-4 h-4" />
                  <span className="font-semibold text-sm">View Profile</span>
                </DropdownMenuItem>}
                <DropdownMenuItem
                  onClick={() => {
                    logout();
                    navigate("/login", { replace: true });
                  }}
                  className="rounded px-3 py-2 cursor-pointer focus:bg-primary/10 focus:text-primary transition-all gap-3"
                >
                  <span className="font-semibold text-sm">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
