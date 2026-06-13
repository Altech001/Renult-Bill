import {
  PortalAdUpsert,
  renultApi,
} from "@/api/foreform";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePortalAd, useSavePortalAd } from "@/hooks/usePortalAds";
import { useRouters } from "@/hooks/useRouters";
import {
  ExternalLink,
  Image,
  Loader2,
  Megaphone,
  MonitorPlay,
  Save,
  Upload,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import SettingsLayout from "./SettingsLayout";

const DEFAULT_AD: PortalAdUpsert = {
  enabled: true,
  placement: "banner",
  media_type: "image",
  title: "Sponsored",
  description: "Discover this offer while you connect.",
  media_url: null,
  target_url: null,
  duration_seconds: 5,
};

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function AdsMobPage() {
  const [branchId, setBranchId] = useState(
    () => localStorage.getItem("selected-workspace") || "",
  );
  const { data: routers = [], isLoading: routersLoading } = useRouters(branchId);
  const [routerId, setRouterId] = useState("");
  const { data: savedAd, isLoading: adLoading } = usePortalAd(routerId);
  const saveAd = useSavePortalAd(routerId);
  const [draft, setDraft] = useState<PortalAdUpsert>(DEFAULT_AD);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      setBranchId(
        (event as CustomEvent<{ id: string }>).detail.id,
      );
    };
    window.addEventListener("renult-branch-change", handler);
    return () => window.removeEventListener("renult-branch-change", handler);
  }, []);

  useEffect(() => {
    if (!routerId && routers.length > 0) setRouterId(routers[0].id);
    if (routerId && !routers.some((router) => router.id === routerId)) {
      setRouterId(routers[0]?.id || "");
    }
  }, [routerId, routers]);

  useEffect(() => {
    if (!savedAd) return;
    setDraft({
      enabled: savedAd.enabled,
      placement: savedAd.placement,
      media_type: savedAd.media_type,
      title: savedAd.title,
      description: savedAd.description,
      media_url: savedAd.media_url,
      target_url: savedAd.target_url,
      duration_seconds: savedAd.duration_seconds,
    });
  }, [savedAd]);

  const updateDraft = (updates: Partial<PortalAdUpsert>) => {
    setDraft((current) => ({ ...current, ...updates }));
  };

  const handleMediaUpload = async (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast.error("Choose an image or video file.");
      return;
    }

    setUploading(true);
    try {
      const uploaded = await renultApi.uploads.upload(file, "portal-ads");
      updateDraft({
        media_url: uploaded.url,
        media_type: isVideo ? "video" : "image",
      });
      toast.success("Ad media uploaded to Cloudflare R2.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not upload the ad media."));
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!routerId) return;
    try {
      await saveAd.mutateAsync(draft);
      toast.success("Ad settings saved.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not save ad settings."));
    }
  };

  const publish = async () => {
    if (!routerId) return;
    setPublishing(true);
    try {
      await saveAd.mutateAsync(draft);
      const captive = await renultApi.captivePortal.get(routerId);
      await renultApi.captivePortal.upsert(routerId, {
        title: captive.title,
        description: captive.description,
        phone_one: captive.phone_one,
        phone_two: captive.phone_two,
        logo_url: captive.logo_url,
        portal_template: "adsmob",
      });
      const result = await renultApi.captivePortal.deployR2(routerId);
      if (!result.success) throw new Error(result.error || "Deployment failed.");
      toast.success("Ad captive published to the router.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not publish the ad captive."));
    } finally {
      setPublishing(false);
    }
  };

  const isBusy = saveAd.isPending || publishing;

  return (
    <SettingsLayout title="AdsMob">
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8 sm:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Megaphone className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Captive advertising
              </span>
            </div>
            <h1 className="text-2xl font-bold">AdsMob</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Show a banner or full-screen ad before customers use the WiFi portal.
            </p>
          </div>
          <Select
            value={routerId}
            onValueChange={setRouterId}
            disabled={routersLoading || routers.length === 0}
          >
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Select router" />
            </SelectTrigger>
            <SelectContent>
              {routers.map((router) => (
                <SelectItem key={router.id} value={router.id}>
                  {router.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!routerId ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Add or select a router to configure captive ads.
            </CardContent>
          </Card>
        ) : adLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Ad settings</CardTitle>
                <CardDescription>
                  Videos and images are uploaded through the existing Cloudflare R2 storage service.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded border p-4">
                  <div>
                    <Label htmlFor="ads-enabled">Enable captive ad</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Disabled ads are hidden without deleting the campaign.
                    </p>
                  </div>
                  <Switch
                    id="ads-enabled"
                    checked={draft.enabled}
                    onCheckedChange={(enabled) => updateDraft({ enabled })}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Placement</Label>
                    <Select
                      value={draft.placement}
                      onValueChange={(placement: "banner" | "flash") =>
                        updateDraft({ placement })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="banner">Banner ad</SelectItem>
                        <SelectItem value="flash">Flash / full screen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Media type</Label>
                    <Select
                      value={draft.media_type}
                      onValueChange={(media_type: "image" | "video") =>
                        updateDraft({ media_type })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Ad media</Label>
                  <input
                    ref={mediaInputRef}
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleMediaUpload(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={draft.media_url || ""}
                      onChange={(event) => updateDraft({ media_url: event.target.value })}
                      placeholder="Cloudflare URL or direct media URL"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => mediaInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Upload</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-title">Headline</Label>
                  <Input
                    id="ad-title"
                    value={draft.title}
                    onChange={(event) => updateDraft({ title: event.target.value })}
                    placeholder="Sponsored offer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-description">Description</Label>
                  <Textarea
                    id="ad-description"
                    value={draft.description}
                    onChange={(event) => updateDraft({ description: event.target.value })}
                    placeholder="Tell WiFi customers about this offer."
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="target-url">Click-through URL</Label>
                    <Input
                      id="target-url"
                      value={draft.target_url || ""}
                      onChange={(event) => updateDraft({ target_url: event.target.value })}
                      placeholder="https://advertiser.example"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Flash duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min={1}
                      max={60}
                      value={draft.duration_seconds}
                      onChange={(event) =>
                        updateDraft({
                          duration_seconds: Math.min(
                            60,
                            Math.max(1, Number(event.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                  <Button variant="outline" onClick={() => void save()} disabled={isBusy}>
                    {saveAd.isPending && !publishing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save
                  </Button>
                  <Button onClick={() => void publish()} disabled={isBusy}>
                    {publishing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MonitorPlay className="mr-2 h-4 w-4" />
                    )}
                    Save & publish captive
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="h-fit border-border/60 shadow-sm lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle className="text-base">Live preview</CardTitle>
                <CardDescription>
                  This approximates how the ad appears on the hosted captive page.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mx-auto max-w-[360px] overflow-hidden rounded-[28px] border-[8px] border-slate-900 bg-slate-50 shadow-xl">
                  <div className="bg-slate-950 px-5 py-7 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                      WiFi Portal
                    </p>
                    <h2 className="mt-2 text-xl font-bold">Connect to the internet</h2>
                  </div>
                  <div className="space-y-4 p-4">
                    {draft.enabled && (
                      <div
                        className={
                          draft.placement === "flash"
                            ? "relative min-h-[300px] overflow-hidden rounded bg-slate-950 text-white"
                            : "overflow-hidden rounded border bg-white"
                        }
                      >
                        <div className={draft.placement === "flash" ? "h-52" : "h-32"}>
                          {draft.media_url ? (
                            draft.media_type === "video" ? (
                              <video
                                src={draft.media_url}
                                className="h-full w-full object-cover"
                                controls
                                muted
                              />
                            ) : (
                              <img
                                src={draft.media_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            )
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-500 to-amber-300 text-white">
                              {draft.media_type === "video" ? (
                                <Video className="h-10 w-10" />
                              ) : (
                                <Image className="h-10 w-10" />
                              )}
                            </div>
                          )}
                        </div>
                        <div className="space-y-1 p-3">
                          <p className="font-bold">{draft.title || "Sponsored"}</p>
                          <p className="text-xs opacity-75">{draft.description}</p>
                          {draft.target_url && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-500">
                              Learn more <ExternalLink className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 rounded border bg-white p-4">
                      <div className="h-9 rounded bg-slate-100" />
                      <div className="h-9 rounded bg-slate-100" />
                      <div className="h-10 rounded bg-orange-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SettingsLayout>
  );
}
