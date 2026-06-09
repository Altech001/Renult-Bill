import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouterLogs, useRouters } from "@/hooks/useRouters";
import { cn } from "@/lib/utils";
import { CirclePause, CirclePlay, Loader2, RefreshCw, Router } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SettingsLayout from "./SettingsLayout";

export default function RouterLogsPage() {
  const [branchId, setBranchId] = useState(() => localStorage.getItem("selected-workspace") || "");
  const { data: routers = [], isLoading: routersLoading } = useRouters(branchId);
  const [routerId, setRouterId] = useState("");
  const [live, setLive] = useState(true);
  const { data, isFetching, refetch } = useRouterLogs(routerId, live);

  useEffect(() => {
    const handler = (event: Event) => setBranchId((event as CustomEvent<{ id: string }>).detail.id);
    window.addEventListener("renult-branch-change", handler);
    return () => window.removeEventListener("renult-branch-change", handler);
  }, []);

  useEffect(() => {
    if (!routerId && routers.length > 0) setRouterId(routers[0].id);
    if (routerId && !routers.some((router) => router.id === routerId)) {
      setRouterId(routers[0]?.id || "");
    }
  }, [routerId, routers]);

  const logs = useMemo(() => [...(data?.logs || [])].reverse(), [data?.logs]);

  return (
    <SettingsLayout title="Router Logs">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-8 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-bold">Router Logs</h1>
            <p className="text-xs text-muted-foreground mt-1">Live RouterOS events, warnings, authentication, and system messages.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={routerId} onValueChange={setRouterId} disabled={routersLoading || routers.length === 0}>
              <SelectTrigger className="w-[220px] h-9 text-xs">
                <SelectValue placeholder="Select router" />
              </SelectTrigger>
              <SelectContent>
                {routers.map((router) => <SelectItem key={router.id} value={router.id}>{router.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setLive((value) => !value)} className="h-9 gap-2 text-xs">
              {live ? <CirclePause className="w-4 h-4" /> : <CirclePlay className="w-4 h-4" />}
              {live ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={!routerId || isFetching} className="h-9 w-9">
              <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        <Card className="border-border/50 rounded shadow-sm">
          <CardHeader className="py-4 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Router className="w-4 h-4 text-primary" /> RouterOS Event Stream</CardTitle>
            <Badge className={cn("border-none", data?.connected ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600")}>
              {data?.connected ? "Connected" : "Offline"}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[calc(100vh-250px)] min-h-[420px] overflow-auto bg-black text-slate-200 font-mono text-[11px]">
              {!routerId && <div className="p-8 text-center text-slate-500">No router is configured for this branch.</div>}
              {routerId && !data && <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>}
              {data?.error && <div className="p-4 text-rose-400">Connection error: {data.error}</div>}
              {logs.map((log, index) => (
                <div key={`${String(log.time || "")}-${index}`} className="grid grid-cols-[90px_180px_1fr] gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/5">
                  <span className="text-slate-500">{String(log.time || "--")}</span>
                  <span className={cn("truncate", String(log.topics || "").includes("error") ? "text-rose-400" : "text-amber-300")}>{String(log.topics || "system")}</span>
                  <span className="break-words">{String(log.message || "")}</span>
                </div>
              ))}
              {data?.connected && logs.length === 0 && <div className="p-8 text-center text-slate-500">No RouterOS log entries returned.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}
