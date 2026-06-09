import { NotificationPreferenceResponse, NotificationResponse, renultApi } from "@/api/foreform";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { CheckCheck, Loader2, Mail, MessageSquareText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SettingsLayout from "./SettingsLayout";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function timeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);
  const [alertPreferences, setAlertPreferences] = useState<NotificationPreferenceResponse | null>(null);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const data = await renultApi.notifications.list({ limit: 5 });
      setItems(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to load notifications"));
    } finally {
      setIsLoading(false);
    }
  };

  const loadAlertPreferences = async () => {
    try {
      setAlertPreferences(await renultApi.monitoring.preferences());
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to load router alert settings"));
    }
  };

  useEffect(() => {
    loadNotifications();
    loadAlertPreferences();
  }, []);

  const markAllRead = async () => {
    try {
      await renultApi.notifications.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      toast.success("Notifications marked as read");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to update notifications"));
    }
  };

  const saveAlertPreferences = async () => {
    if (!alertPreferences) return;
    setIsSavingAlerts(true);
    try {
      const saved = await renultApi.monitoring.updatePreferences({
        email_router_alerts: alertPreferences.email_router_alerts,
        sms_router_alerts: alertPreferences.sms_router_alerts,
        sms_phone_number: alertPreferences.sms_phone_number,
      });
      setAlertPreferences(saved);
      toast.success("Router alert settings saved");
    } catch (error: unknown) {
      toast.error(errorMessage(error, "Failed to save router alert settings"));
    } finally {
      setIsSavingAlerts(false);
    }
  };

  return (
    <SettingsLayout title="Notification Settings">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground mb-1">Notifications</h1>
            <p className="text-sm text-muted-foreground">Manage alerts and review recent account updates</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded">{unreadCount} unread</Badge>
            <Button onClick={markAllRead} className="h-9 text-xs gap-1.5">
              <CheckCheck className="w-4 h-4" />
              Mark read
            </Button>
          </div>
        </div>
        <Separator className="mb-5 bg-border/20" />

        <div className="mb-8 border border-border/10 bg-card">
          <div className="border-b border-border/30 px-5 py-4">
            <h2 className="text-sm font-semibold">Router status alerts</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Get notified when SNMP monitoring detects a router going offline or coming back online.
            </p>
          </div>
          {alertPreferences ? (
            <div className="space-y-5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div>
                    <Label htmlFor="email-router-alerts" className="text-sm font-medium">Email alerts</Label>
                    <p className="text-xs text-muted-foreground">Send status changes to your account email.</p>
                  </div>
                </div>
                <Switch
                  id="email-router-alerts"
                  checked={alertPreferences.email_router_alerts}
                  onCheckedChange={(checked) => setAlertPreferences((current) => current && ({
                    ...current,
                    email_router_alerts: checked,
                  }))}
                />
              </div>

              <Separator className="bg-border/30" />

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div>
                    <Label htmlFor="sms-router-alerts" className="text-sm font-medium">SMS alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      {alertPreferences.sms_cost_ugx} UGX is deducted from the router branch wallet per accepted SMS.
                    </p>
                  </div>
                </div>
                <Switch
                  id="sms-router-alerts"
                  checked={alertPreferences.sms_router_alerts}
                  onCheckedChange={(checked) => setAlertPreferences((current) => current && ({
                    ...current,
                    sms_router_alerts: checked,
                  }))}
                />
              </div>

              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor="router-alert-phone" className="text-xs">SMS phone number</Label>
                <Input
                  id="router-alert-phone"
                  type="tel"
                  placeholder="+256 7XX XXX XXX"
                  value={alertPreferences.sms_phone_number || ""}
                  onChange={(event) => setAlertPreferences((current) => current && ({
                    ...current,
                    sms_phone_number: event.target.value,
                  }))}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveAlertPreferences} disabled={isSavingAlerts}>
                  {isSavingAlerts && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save alert settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading alert settings...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8">
          <aside className="border border-border/10 rounded-none bg-card/50 overflow-hidden h-fit">
            <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Recent Notifications</span>
              </div>
              <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => navigate("/notifications")}>
                View all
              </Button>
            </div>
            {isLoading ? (
              <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              <div>
                {items.map((item) => (
                  <div key={item.id} className="px-4 py-3 border-b border-border/30 last:border-b-0">
                    <div className="flex items-start gap-2">
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${item.is_read ? "bg-muted" : "bg-primary"}`} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{timeLabel(item.created_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>
    </SettingsLayout>
  );
}
