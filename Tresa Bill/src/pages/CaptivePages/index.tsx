import AppHeader from "@/components/Header/AppHeader";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Fireworks } from "fireworks-js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    ExternalLink,
    FileText,
    Globe,
    Loader2,
    Radio,
    Rocket,
    Save,
    Settings,
    Upload,
    Wifi,
    XCircle
} from "lucide-react";
import { toast } from "sonner";
import { useRouters } from "@/hooks/useRouters";
import { useCaptivePortal, useUpsertCaptivePortal, useDeployCaptivePortalR2 } from "@/hooks/useCaptivePortal";
import { CaptivePortalResponse, CaptivePortalDeployResponse } from "@/api/foreform";

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export default function CaptiveIndex() {
    const [currentStep, setCurrentStep] = useState(0);

    const STEPS = [
        { num: "01", title: "Captive Preview", subtitle: "See your portal live" },
        { num: "02", title: "General Info", subtitle: "Name & description" },
        { num: "03", title: "Branding & Template", subtitle: "Logo, contact & styling" },
        { num: "04", title: "Preview & Deploy", subtitle: "Verify & push to MikroTik" },
    ];
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem("sidebar-collapsed") === "true");

    useEffect(() => {
        const handler = (e: Event) => {
            setSidebarCollapsed(Boolean((e as CustomEvent<{ collapsed?: boolean }>).detail?.collapsed));
        };
        window.addEventListener("sidebar-collapse-change", handler);
        return () => window.removeEventListener("sidebar-collapse-change", handler);
    }, []);

    const fireworksRef = useRef<HTMLDivElement | null>(null);
    const fireworksInstanceRef = useRef<Fireworks | null>(null);

    useEffect(() => {
        if (currentStep === 3 && fireworksRef.current) {
            if (!fireworksInstanceRef.current) {
                fireworksInstanceRef.current = new Fireworks(fireworksRef.current, {
                    gravity: 1.4,
                    opacity: 0.4,
                    autoresize: true,
                    acceleration: 1.00,
                });
            }
            fireworksInstanceRef.current.start();
        } else {
            if (fireworksInstanceRef.current) {
                fireworksInstanceRef.current.stop();
                fireworksInstanceRef.current.clear();
                fireworksInstanceRef.current = null;
            }
        }

        return () => {
            if (fireworksInstanceRef.current) {
                fireworksInstanceRef.current.stop();
                fireworksInstanceRef.current.clear();
                fireworksInstanceRef.current = null;
            }
        };
    }, [currentStep]);

    const branchId = localStorage.getItem("selected-workspace") || "biltra";
    const { data: routers = [], isLoading: isLoadingRouters } = useRouters(branchId);

    // Support selecting among multiple routers
    const [selectedRouterId, setSelectedRouterId] = useState<string>("");

    useEffect(() => {
        if (routers.length > 0 && !selectedRouterId) {
            setSelectedRouterId(routers[0].id);
        }
    }, [routers, selectedRouterId]);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlTemplate = searchParams.get("template");

    const { data: captivePortalData, isLoading: isLoadingPortal } = useCaptivePortal(selectedRouterId);
    const upsertMutation = useUpsertCaptivePortal(selectedRouterId);
    const deployMutation = useDeployCaptivePortalR2(selectedRouterId);

    const [draft, setDraft] = useState<Partial<CaptivePortalResponse> | null>(null);
    const [pushResult, setPushResult] = useState<CaptivePortalDeployResponse | null>(null);
    const [deployState, setDeployState] = useState<"idle" | "saving" | "pushing" | "success" | "error">("idle");
    const [deployError, setDeployError] = useState<string>("");

    useEffect(() => {
        if (captivePortalData) {
            setDraft({
                ...captivePortalData,
                portal_template: urlTemplate || captivePortalData.portal_template || "renault"
            });
        } else if (selectedRouterId) {
            setDraft({
                title: "Renault WIFI",
                description: "High-speed internet access portal",
                phone_one: "+256771234567",
                phone_two: "+256752345678",
                logo_url: "",
                portal_template: urlTemplate || "renault"
            });
        }
    }, [captivePortalData, selectedRouterId, urlTemplate]);

    // Reset deploy state when router changes
    useEffect(() => {
        setDeployState("idle");
        setPushResult(null);
        setDeployError("");
    }, [selectedRouterId]);

    const updateDraft = (updates: Partial<CaptivePortalResponse>) => {
        if (!draft) return;
        setDraft(prev => prev ? { ...prev, ...updates } : null);
        // Reset deploy state when user edits anything
        if (deployState === "success" || deployState === "error") {
            setDeployState("idle");
            setPushResult(null);
        }
    };

    const handleSaveOnly = async () => {
        if (!draft || !selectedRouterId) return;
        try {
            setDeployState("saving");
            await upsertMutation.mutateAsync({
                title: draft.title || "Renault WIFI",
                description: draft.description || "High-speed internet access portal",
                phone_one: draft.phone_one || "",
                phone_two: draft.phone_two || "",
                logo_url: draft.logo_url || "",
                portal_template: draft.portal_template || "renault"
            });
            toast.success("Portal configuration saved to server.");
            setDeployState("idle");
        } catch (err: unknown) {
            toast.error(errorMessage(err, "Failed to save captive portal config"));
            setDeployState("error");
            setDeployError(errorMessage(err, "Save failed"));
        }
    };

    const handleSaveAndPush = async () => {
        if (!draft || !selectedRouterId) return;
        setDeployState("saving");
        setDeployError("");
        setPushResult(null);

        try {
            // Step 1: Save config to backend
            await upsertMutation.mutateAsync({
                title: draft.title || "Renault WIFI",
                description: draft.description || "High-speed internet access portal",
                phone_one: draft.phone_one || "",
                phone_two: draft.phone_two || "",
                logo_url: draft.logo_url || "",
                portal_template: draft.portal_template || "renault"
            });

            // Step 2: Host on cloud and pull onto the MikroTik via /tool fetch
            setDeployState("pushing");
            const result = await deployMutation.mutateAsync();

            if (result.success) {
                setPushResult(result);
                setDeployState("success");
                toast.success("Captive portal deployed to MikroTik successfully!");
            } else {
                setDeployState("error");
                setPushResult(result);
                setDeployError(result.error || "Deployment returned unsuccessful status");
                toast.error(result.error || "Failed to deploy to MikroTik");
            }
        } catch (err: unknown) {
            setDeployState("error");
            setDeployError(errorMessage(err, "Deployment failed"));
            toast.error(errorMessage(err, "Failed to deploy captive portal"));
        }
    };

    const launchLivePreview = () => {
        if (!draft) return;
        localStorage.setItem("foreform_captive_portal_preview", JSON.stringify({
            id: draft.id || "preview-id",
            router_id: selectedRouterId,
            router_name: routers.find(r => r.id === selectedRouterId)?.name || "Router",
            title: draft.title,
            description: draft.description,
            phone_one: draft.phone_one,
            phone_two: draft.phone_two,
            logo_url: draft.logo_url,
            portal_template: draft.portal_template,
            last_pushed_at: draft.last_pushed_at
        }));
        window.open("/captive-portals/preview", "_blank");
    };

    const selectedRouter = routers.find(r => r.id === selectedRouterId);

    return (
        <div className={`min-h-screen bg-background transition-all duration-300 ${sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[280px]"}`}>
            <SEO title="Captive Portals Portal Builder" />
            <AppHeader />

            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate("/captive-portals")}
                            className="p-1.5 hover:bg-muted shrink-0 rounded-full border border-border/40"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">Captive Portal Builder</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Configure landing pages for Wi-Fi users before granting internet access.
                            </p>
                        </div>
                    </div>
                    {/* Router selector */}
                    {routers.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Label htmlFor="routerSelector" className="text-xs font-semibold whitespace-nowrap">Active Router:</Label>
                            <Select
                                value={selectedRouterId}
                                onValueChange={(val) => {
                                    setSelectedRouterId(val);
                                    setCurrentStep(0);
                                }}
                            >
                                <SelectTrigger id="routerSelector" className="w-[240px] bg-background">
                                    <SelectValue placeholder="Select Router" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border border-border">
                                    {routers.map((router) => (
                                        <SelectItem key={router.id} value={router.id}>
                                            {router.name} ({router.host})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                {isLoadingRouters || isLoadingPortal ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    </div>
                ) : !selectedRouterId ? (
                    <Card className="p-10 border border-dashed text-center text-muted-foreground rounded bg-card">
                        <Globe className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="text-sm font-semibold">Please connect a router first to configure Captive Portals.</p>
                    </Card>
                ) : draft ? (
                    <div className="space-y-6">
                        {/* ── Timeline Stepper ── */}
                        <div className="cp-timeline">
                            {STEPS.map((step, i) => (
                                <React.Fragment key={step.num}>
                                    <div
                                        className={`cp-timeline-step ${i === currentStep ? "cp-timeline-step--active" : i < currentStep ? "cp-timeline-step--completed" : "cp-timeline-step--inactive"}`}
                                        onClick={() => setCurrentStep(i)}
                                    >
                                        <div className="cp-timeline-step__circle">
                                            {i < currentStep ? <Check className="w-4 h-4" /> : step.num}
                                        </div>
                                        <div className="cp-timeline-step__text">
                                            <span className="cp-timeline-step__title">{step.title}</span>
                                            <span className="cp-timeline-step__subtitle">{step.subtitle}</span>
                                        </div>
                                    </div>
                                    {i < STEPS.length - 1 && (
                                        <div className={`cp-timeline-connector ${i < currentStep ? "cp-timeline-connector--done" : ""}`} />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={launchLivePreview} className="gap-1.5 text-xs">
                                    <ExternalLink className="w-3.5 h-3.5" /> Live Preview
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                {currentStep > 0 && (
                                    <Button variant="outline" size="sm" className="text-xs" onClick={() => setCurrentStep(s => s - 1)}>
                                        Back <ArrowLeft className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                                {currentStep < STEPS.length - 1 && (
                                    <Button size="sm" className="text-xs gap-1" onClick={() => setCurrentStep(s => s + 1)}>
                                        Next Step <ArrowRight className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="max-w-4xl mx-auto space-y-6">
                            {/* Step 1: Captive Preview */}
                            {currentStep === 0 && (
                                <Card className="border-border/40 shadow-sm rounded overflow-hidden">
                                    <CardHeader className="py-4 px-5 border-b border-border/30">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-primary" /> Live Portal Preview
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            This is exactly what your Wi-Fi users will see when they connect. Proceed to the next steps to customise it.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        <div className="relative w-full" style={{ height: "520px" }}>
                                            <iframe
                                                key={`${selectedRouterId}-${draft.portal_template}`}
                                                src={`/captive-portals/preview?template=${draft.portal_template || "renault"}&preview=1`}
                                                title="Captive Portal Live Preview"
                                                className="w-full h-full border-0"
                                                style={{ background: "#fff" }}
                                                onLoad={(e) => {
                                                    try {
                                                        localStorage.setItem("foreform_captive_portal_preview", JSON.stringify({
                                                            id: draft.id || "preview-id",
                                                            router_id: selectedRouterId,
                                                            router_name: routers.find(r => r.id === selectedRouterId)?.name || "Router",
                                                            title: draft.title,
                                                            description: draft.description,
                                                            phone_one: draft.phone_one,
                                                            phone_two: draft.phone_two,
                                                            logo_url: draft.logo_url,
                                                            portal_template: draft.portal_template,
                                                            last_pushed_at: draft.last_pushed_at
                                                        }));
                                                    } catch (_) {}
                                                }}
                                            />
                                        </div>
                                    </CardContent>
                                    <div className="px-5 py-3 border-t border-border/30 flex items-center justify-between gap-3 bg-muted/30">
                                        <span className="text-[11px] text-muted-foreground">
                                            Template: <strong className="capitalize">{draft.portal_template || "renault"}</strong>
                                        </span>
                                        <Button size="sm" className="text-xs gap-1" onClick={() => setCurrentStep(1)}>
                                            Edit & Customise <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Step 2: General Info */}
                            {currentStep === 1 && (
                                <Card className="border-border/0 shadow-none rounded">
                                    <CardContent className="p-5 space-y-4">
                                        <div>
                                            <Label htmlFor="portalTitle" className="text-xs font-bold mb-1.5 block">Welcome Heading / Title</Label>
                                            <Input
                                                id="portalTitle"
                                                value={draft.title || ""}
                                                onChange={(e) => updateDraft({ title: e.target.value })}
                                                placeholder="e.g. Renault WIFI"
                                            />
                                        </div>
                                        <div className="space-y-4 pt-2 border-t border-border/30">
                                            <div>
                                                <Label htmlFor="welcomeDescription" className="text-xs font-bold mb-1.5 block">Welcome Description / Subtitle</Label>
                                                <Textarea
                                                    id="welcomeDescription"
                                                    rows={3}
                                                    value={draft.description || ""}
                                                    onChange={(e) => updateDraft({ description: e.target.value })}
                                                    placeholder="Enter connection instructions or welcome greeting."
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 3: Branding & Appearance */}
                            {currentStep === 2 && (
                                <Card className="border-border/0 shadow-none rounded">
                                    <CardHeader className="py-4 px-5 border-b border-border/30">
                                        <CardTitle className="text-sm font-bold flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-muted-foreground" /> Branding & Appearance
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Configure the custom logo, support numbers, and theme template.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        <div>
                                            <Label htmlFor="logoUrl" className="text-xs font-bold mb-1.5 block">Logo Image URL / Path (Optional)</Label>
                                            <Input
                                                id="logoUrl"
                                                value={draft.logo_url || ""}
                                                onChange={(e) => updateDraft({ logo_url: e.target.value })}
                                                placeholder="e.g. mm_logo.jpg or https://example.com/logo.png"
                                            />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <Label htmlFor="phoneOne" className="text-xs font-bold mb-1.5 block">Support Phone 1</Label>
                                                <Input
                                                    id="phoneOne"
                                                    value={draft.phone_one || ""}
                                                    onChange={(e) => updateDraft({ phone_one: e.target.value })}
                                                    placeholder="e.g. +256771234567"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="phoneTwo" className="text-xs font-bold mb-1.5 block">Support Phone 2</Label>
                                                <Input
                                                    id="phoneTwo"
                                                    value={draft.phone_two || ""}
                                                    onChange={(e) => updateDraft({ phone_two: e.target.value })}
                                                    placeholder="e.g. +256752345678"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="themeSelector" className="text-xs font-bold mb-1.5 block">Visual Palette Theme</Label>
                                            <Select
                                                value={draft.portal_template || "renault"}
                                                onValueChange={(val) => updateDraft({ portal_template: val })}
                                            >
                                                <SelectTrigger id="themeSelector" className="bg-background">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-popover border border-border">
                                                    <SelectItem value="classic">Classic (Clean & Professional)</SelectItem>
                                                    <SelectItem value="modern">Modern (Sleek & Smooth)</SelectItem>
                                                    <SelectItem value="blue_modern">Blue Modern (Carousel Ads Support)</SelectItem>
                                                    <SelectItem value="brown_cards">Brown Cards (Warm Earth Tones)</SelectItem>
                                                    <SelectItem value="renault">Renault Custom Portal (UGX Mobile Money & Voucher)</SelectItem>
                                                    <SelectItem value="auroaa">Auroraa RouterOS Portal (Full Hotspot Bundle)</SelectItem>
                                                    <SelectItem value="light">Classic Clean (Light)</SelectItem>
                                                    <SelectItem value="dark">Stealth Slate (Dark)</SelectItem>
                                                    <SelectItem value="glassmorphic">Frosted Neon (Glassmorphic)</SelectItem>
                                                    <SelectItem value="sunset">Sunset Glow (Warm Gradient)</SelectItem>
                                                    <SelectItem value="ocean">Ocean Breeze (Teal-Emerald Gradient)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Step 4: Deploy */}
                            {currentStep === 3 && (
                                <div className="space-y-4">
                                    {/* Config Summary Card */}
                                    <Card className="border-border/40 rounded shadow-sm">
                                        <CardHeader className="py-4 px-5 border-b border-border/30">
                                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                                <Radio className="w-4 h-4 text-primary" /> Deployment Summary
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Review your portal configuration before deploying to <strong>{selectedRouter?.name || "router"}</strong> ({selectedRouter?.host || "—"})
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="p-5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Title</span>
                                                    <span className="font-semibold">{draft.title || "—"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Template</span>
                                                    <span className="font-semibold capitalize">{draft.portal_template || "renault"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Description</span>
                                                    <span className="text-muted-foreground">{draft.description || "—"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Logo URL</span>
                                                    <span className="text-muted-foreground truncate block">{draft.logo_url || "Default (mm_logo.jpg)"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Phone 1</span>
                                                    <span>{draft.phone_one || "—"}</span>
                                                </div>
                                                <div>
                                                    <span className="font-bold text-muted-foreground block mb-0.5">Phone 2</span>
                                                    <span>{draft.phone_two || "—"}</span>
                                                </div>
                                                {draft.last_pushed_at && (
                                                    <div className="sm:col-span-2">
                                                        <span className="font-bold text-muted-foreground block mb-0.5">Last Deployed</span>
                                                        <span className="text-emerald-600 font-semibold">{new Date(draft.last_pushed_at).toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Push Result Card */}
                                    {deployState === "success" && pushResult && (
                                        <Card className="border-emerald-500/40 bg-emerald-500/5 rounded shadow-sm">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    <span className="text-sm font-bold">Deployment Successful</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Router: <strong>{pushResult.router_name}</strong> — {pushResult.fetched_files.length} file{pushResult.fetched_files.length !== 1 ? "s" : ""} deployed
                                                </p>
                                                {pushResult.deployed_directory && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Directory: <strong className="font-mono">/{pushResult.deployed_directory}</strong>
                                                        {pushResult.updated_profiles.length > 0 && (
                                                            <> — profile{pushResult.updated_profiles.length !== 1 ? "s" : ""}: <strong>{pushResult.updated_profiles.join(", ")}</strong></>
                                                        )}
                                                    </p>
                                                )}
                                                {pushResult.fetched_files.length > 0 && (
                                                    <div className="space-y-1">
                                                        {pushResult.fetched_files.map((file, i) => (
                                                            <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-700 font-mono bg-emerald-500/10 px-2.5 py-1 rounded">
                                                                <FileText className="w-3 h-3 shrink-0" /> {file}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {deployState === "error" && (
                                        <Card className="border-destructive/40 bg-destructive/5 rounded shadow-sm">
                                            <CardContent className="p-5 flex items-start gap-3">
                                                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                                                <div className="space-y-3">
                                                    <p className="text-sm font-bold text-destructive">Deployment Failed</p>
                                                    <p className="text-xs text-muted-foreground mt-1">{deployError}</p>
                                                    {pushResult?.diagnostics && Object.keys(pushResult.diagnostics).length > 0 && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                                            {Object.entries(pushResult.diagnostics).map(([key, value]) => (
                                                                <div key={key} className="rounded border border-destructive/15 bg-background/60 px-2 py-1">
                                                                    <span className="font-bold text-muted-foreground">{key.replace(/_/g, " ")}: </span>
                                                                    <span className="font-mono">{value}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Action Buttons */}
                                    <Card className="border-border/0 shadow-none rounded max-w-xl mx-auto">
                                        <CardContent className="p-5 space-y-3">
                                            <Button
                                                onClick={launchLivePreview}
                                                variant="outline"
                                                className="w-full gap-2 font-semibold py-5 text-xs"
                                            >
                                                <ExternalLink className="w-4 h-4" /> Open Fullscreen Live Preview
                                            </Button>

                                            <Button
                                                onClick={handleSaveOnly}
                                                variant="outline"
                                                className="w-full gap-2 font-semibold py-5 text-xs"
                                                disabled={deployState === "saving" || deployState === "pushing"}
                                            >
                                                {deployState === "saving" ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4" />
                                                )}
                                                Save Configuration Only
                                            </Button>

                                            <Button
                                                onClick={handleSaveAndPush}
                                                className="w-full gap-2 font-bold py-6 text-sm bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                                                disabled={deployState === "saving" || deployState === "pushing"}
                                            >
                                                {deployState === "saving" ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Saving Configuration...
                                                    </>
                                                ) : deployState === "pushing" ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Deploying to MikroTik Router...
                                                    </>
                                                ) : deployState === "success" ? (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        Re-Deploy to MikroTik
                                                    </>
                                                ) : (
                                                    <>
                                                        <Rocket className="w-4 h-4" />
                                                        Save & Push to MikroTik Gateway
                                                    </>
                                                )}
                                            </Button>

                                            {/* Deploy status indicator */}
                                            {(deployState === "saving" || deployState === "pushing") && (
                                                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground pt-1">
                                                    <Upload className="w-3.5 h-3.5 animate-bounce text-primary" />
                                                    {deployState === "saving"
                                                        ? "Persisting portal settings to backend database..."
                                                        : "Hosting portal on cloud and pulling files onto your router..."
                                                    }
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
            </main>
            <div
                ref={fireworksRef}
                className="fixed inset-0 pointer-events-none z-[9999]"
            />
        </div>
    );
}
