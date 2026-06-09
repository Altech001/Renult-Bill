import { renultApi } from "@/api/foreform";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MikrotikIcon, SettingsIcon } from "@/constants/Icons";
import { useAuth } from "@/lib/auth";
import {
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  CircleUser,
  Globe,
  Home,
  Megaphone,
  MessagesSquare,
  MoreHorizontal,
  Network,
  PackageSearchIcon,
  PanelLeft,
  PhoneIncomingIcon,
  Plus,
  Settings,
  Ticket,
  Wallet2Icon,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface SideBarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  iconColor?: string;
  hasSubmenu?: boolean;
}

const primaryNavItems: NavItem[] = [
  {
    label: "Home",
    icon: <Home className="w-5 h-5" />,
    path: "/",
  },
  {
    label: "Mikrotiks",
    icon: <MikrotikIcon className="w-5 h-5" />, //Mikrotiks Router
    path: "/router",
    hasSubmenu: true, // Here i gonna add the count for available routers
  },
  {
    label: "Vouchers & Users",
    icon: <Ticket className="w-5 h-5" />,
    path: "/vouchers",
  },
  {
    label: "Revenue Sales",
    icon: <CircleDollarSign className="w-5 h-5" />,
    path: "/sales",
  },
];

const supportNavItems: NavItem[] = [
  {
    label: "Withdrawals",
    icon: <Wallet2Icon className="w-5 h-5" />,
    path: "/withdrawals",
  },
  {
    label: "Support",
    icon: <PhoneIncomingIcon className="w-5 h-5" />,
    path: "/voucher-support",
  },
  {
    label: "Network Tree",
    icon: <Network className="w-5 h-5" />,
    path: "/network",
  },
  {
    label: "Captive Portals",
    icon: <PackageSearchIcon className="w-5 h-5" />,
    path: "/captive-portals",
  },
];

const secondaryNavItems: NavItem[] = [
  {
    label: "Remote Access",
    icon: <Globe className="w-5 h-5" />,
    path: "/remote-access",
  },
  {
    label: "Branches & Staff",
    icon: <Megaphone className="w-5 h-5" />,
    path: "/branches",
  },
  {
    label: "Messages",
    icon: <MessagesSquare className="w-5 h-5" />,
    path: "/messages",
  },
  {
    label: "My Settings",
    icon: <SettingsIcon className="w-5 h-5" />,
    path: "/settings",
    hasSubmenu: true,
  },
];

interface Workspace {
  id: string;
  name: string;
  avatar_url?: string;
}

export default function SideBar({ isOpen, onClose }: SideBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace>();

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    localStorage.setItem("selected-workspace", workspace.id);
    window.dispatchEvent(
      new CustomEvent("renult-branch-change", {
        detail: { id: workspace.id, name: workspace.name },
      }),
    );
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ collapsed: boolean }>).detail;
      setIsCollapsed(detail.collapsed);
    };
    window.addEventListener("sidebar-collapse-change", handler);
    return () => window.removeEventListener("sidebar-collapse-change", handler);
  }, []);

  useEffect(() => {
    let mounted = true;
    renultApi.branches
      .list()
      .then((branches) => {
        if (!mounted || branches.length === 0) return;
        const nextWorkspaces = branches.map((branch) => ({
          id: branch.id,
          name: branch.name,
          avatar_url: branch.avatar_url,
        }));
        setWorkspaces(nextWorkspaces);
        const saved = localStorage.getItem("selected-workspace");
        const selected =
          nextWorkspaces.find((workspace) => workspace.id === saved) ||
          nextWorkspaces[0];
        setSelectedWorkspace(selected);
        localStorage.setItem("selected-workspace", selected.id);
        window.dispatchEvent(
          new CustomEvent("renult-branch-change", {
            detail: {
              id: selected.id,
              name: selected.name,
              avatar_url: selected.avatar_url,
            },
          }),
        );
      })
      .catch(() => undefined);
    const branchHandler = (event: Event) => {
      const branch = (
        event as CustomEvent<{
          id?: string;
          name?: string;
          avatar_url?: string;
        }>
      ).detail;
      if (!branch?.id) return;
      const workspace = {
        id: branch.id,
        name: branch.name || "Branch",
        avatar_url: branch.avatar_url,
      };
      setWorkspaces((prev) => {
        const exists = prev.some((item) => item.id === workspace.id);
        return exists
          ? prev.map((item) =>
              item.id === workspace.id ? { ...item, ...workspace } : item,
            )
          : [workspace, ...prev];
      });
      setSelectedWorkspace(workspace);
    };
    window.addEventListener("renult-branch-change", branchHandler);
    return () => {
      mounted = false;
      window.removeEventListener("renult-branch-change", branchHandler);
    };
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
    window.dispatchEvent(
      new CustomEvent("sidebar-collapse-change", {
        detail: { collapsed: next },
      }),
    );
  };

  const handleNavigate = (path: string) => {
    if (path === "/#templates") {
      navigate("/");
      // Trigger templates open via a custom event
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-templates"));
      }, 100);
    } else {
      navigate(path);
    }
    onClose();
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const selectedWorkspaceName = selectedWorkspace?.name || "Select branch";
  const selectedWorkspaceInitials = selectedWorkspace?.name
    ? selectedWorkspace.name.slice(0, 2).toUpperCase()
    : "BR";

  const renderNavItem = (item: NavItem) => {
    if (user?.account_type === "staff") {
      const permissions = new Set(user.staff_permissions || []);
      const permissionByPath: Record<string, string> = {
        "/router": "routers",
        "/sales": "sales",
        "/vouchers": "vouchers",
        "/voucher-support": "support",
        "/messages": "support",
        "/network": "network",
        "/remote-access": "network",
        "/captive-portals": "captive",
        "/campaigns": "support",
      };
      if (["/withdrawals", "/settings"].includes(item.path)) return null;
      const required = permissionByPath[item.path];
      if (required && !permissions.has(required)) return null;
    }
    const active = isActive(item.path);
    const buttonContent = (
      <button
        key={item.label}
        onClick={() => handleNavigate(item.path)}
        className={`
          flex items-center rounded text-sm font-medium
          transition-all duration-150 ease-in-out group
          ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full justify-between px-4 py-2.5"}
          ${
            active
              ? "bg-primary/10 text-primary font-semibold"
              : "text-foreground/80 hover:bg-muted/60"
          }
        `}
      >
        {isCollapsed ? (
          <span
            className={`shrink-0 ${active ? "text-primary" : item.iconColor || "text-muted-foreground"}`}
          >
            {item.icon}
          </span>
        ) : (
          <>
            <div className="flex items-center gap-4 overflow-hidden">
              <span
                className={`shrink-0 ${active ? "text-primary" : item.iconColor || "text-muted-foreground"}`}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </div>
            {item.hasSubmenu && (
              <MoreHorizontal className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0 transition-colors" />
            )}
          </>
        )}
      </button>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.label}>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-semibold text-xs bg-slate-900 text-white border-slate-900 rounded py-1 px-2.5"
          >
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  };

  return (
    <TooltipProvider>
      {/* Backdrop overlay */}
      <div
        className={`
          fixed inset-0 z-40 bg-black/30 backdrop-blur-[5px]
          transition-opacity duration-300 shadow-md md:hidden
          ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}
        `}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white
          border-r border-border/30 shadow-2xl md:shadow-none md:z-20
          flex flex-col custom-scrollbar
          transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
          md:translate-x-0
          ${isCollapsed ? "w-[72px]" : "w-[280px]"}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex items-center justify-center p-3">
          {isCollapsed === false ? (
            <img src="/icons/logo_2.png" alt="Logo" className="h-12" />
          ) : (
            <img src="/icons/mini.png" alt="Logo" className="" />
          )}
        </div>

        {/* Sidebar header (Workspace Selector) */}
        <div className={`p-3 ${isCollapsed ? "flex justify-center" : ""}`}>
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={`flex items-center border border-border/60 rounded bg-card/50 transition-all duration-150 hover:bg-muted/40 ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full justify-between px-3 py-2"}`}
                aria-label="Select workspace"
              >
                {isCollapsed ? (
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarImage src={selectedWorkspace?.avatar_url} />
                    <AvatarFallback className="text-[10px] font-bold">
                      {selectedWorkspaceInitials}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <Avatar className="w-6 h-6 shrink-0">
                        <AvatarImage src={selectedWorkspace?.avatar_url} />
                        <AvatarFallback className="text-[10px] font-bold">
                          {selectedWorkspaceInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-semibold text-foreground/80 tracking-tight whitespace-nowrap">
                        {selectedWorkspaceName}
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  </>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent
              side={isCollapsed ? "right" : "bottom"}
              align="start"
              className="w-64 p-2 bg-popover border border-border/60 shadow rounded"
            >
              <div className="px-2 py-1.5 text-xs font-mono text-muted-foreground">
                Locations
              </div>
              <div className="space-y-0.5 my-1">
                {workspaces.map((workspace) => {
                  const isActive = workspace.id === selectedWorkspace?.id;
                  return (
                    <button
                      key={workspace.id}
                      onClick={() => handleSelectWorkspace(workspace)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-sm transition-colors text-left ${
                        isActive
                          ? "bg-primary/10 text-primary font-semibold"
                          : "hover:bg-muted/60 text-foreground/80"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-5 h-5 shrink-0">
                          <AvatarImage src={workspace.avatar_url} />
                          <AvatarFallback className="text-[9px] font-bold">
                            {workspace.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{workspace.name}</span>
                      </div>
                      {isActive && (
                        <Check className="w-4 h-4 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="border-t border-border/40 mt-1.5 pt-1.5">
                <button
                  onClick={() => handleNavigate("/branches")}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm text-foreground/80 hover:bg-muted/60 transition-colors text-left"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Manage Branches</span>
                </button>
                <button
                  onClick={() => handleNavigate("/branches?new=branch")}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm text-foreground/80 hover:bg-muted/60 transition-colors text-left"
                >
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Create New Branch</span>
                </button>
                <button
                  onClick={() => handleNavigate("/branches?new=staff")}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-sm text-foreground/80 hover:bg-muted/60 transition-colors text-left"
                >
                  <CircleUser className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Create New Staff/Agent</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Navigation Groups Container */}
        <div className="flex-1 overflow-y-auto min-h-0 no-scrollbar">
          {/* Primary nav */}
          <nav className="py-3 px-2">
            <div className="space-y-0.5">
              {primaryNavItems.map(renderNavItem)}
            </div>
          </nav>

          <nav className="border-t border-border/40 py-3 px-2">
            <div className="space-y-0.5">
              {supportNavItems.map(renderNavItem)}
            </div>
          </nav>

          <nav className="py-3 px-2 border-t border-border/40">
            <div className="space-y-0.5">
              {secondaryNavItems.map(renderNavItem)}
            </div>
          </nav>
        </div>

        {/* Collapse / Expand Toggle at the bottom */}
        <div className="hidden md:flex border-t border-border/30 p-3 justify-center">
          <button
            onClick={toggleCollapse}
            className={`flex items-center rounded text-sm font-medium text-foreground/80 hover:bg-muted/60 transition-all duration-150 ${isCollapsed ? "justify-center w-10 h-10 mx-auto" : "w-full gap-3 px-3 py-2"}`}
            aria-label="Toggle sidebar collapse"
          >
            <PanelLeft className="w-5 h-5 text-foreground/70 shrink-0" />
            {!isCollapsed && <span className="truncate">Collapse Menu</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
