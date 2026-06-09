/* eslint-disable @typescript-eslint/no-explicit-any */
import AppHeader from "@/components/Header/AppHeader";
import SEO from "@/components/SEO";
import dagre from "@dagrejs/dagre";
import {
    Activity,
    ArrowRight,
    ChevronDown,
    Cpu,
    HardDrive,
    Layers,
    Loader2,
    Maximize2,
    Network,
    Play,
    RefreshCw,
    Router as RouterIcon,
    Square,
    TrendingUp,
    Wifi,
    WifiOff,
    X
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
    Background,
    Controls,
    Edge,
    Handle,
    MarkerType,
    MiniMap,
    Node,
    Position,
    useEdgesState,
    useNodesState
} from "reactflow";
import "reactflow/dist/style.css";
import { RouterStatusResponse } from "@/api/foreform";
import { useRouters, useRouterStatus } from "@/hooks/useRouters";

// Define TypeScript interfaces for properties
export interface NetworkInterface {
    name: string;
    type: "ether" | "wlan" | "bridge";
    bridge?: string;
    status: "connected" | "unplugged" | "disabled";
    ip?: string;
    mac: string;
    ssid?: string;
    band?: "2.4GHz" | "5GHz";
    running: boolean;
    disabled: boolean;
    mtu?: number;
    txRate?: string;
    rxRate?: string;
    comment?: string;
}

export interface RouterInfo {
    name: string;
    model: string;
    ip: string;
    serialNumber: string;
    firmware: string;
    uptime: string;
    cpuUsage: number;
    memoryUsage: number;
}

// ----------------------------------------------------
// Custom Node Components
// ----------------------------------------------------

// 1. Router Node (Center/Root Device)
const RouterNodeComponent = ({ data }: { data: any }) => {
    const isDimmed = data.isDimmed;
    const isSelected = data.isSelected;
    const isConnected = data.isConnected;
    const isLoading = data.isLoading;
    const statusLabel = isLoading ? "Connecting" : isConnected ? "Connected" : "Offline";
    const statusColor = isLoading ? "text-amber-500" : isConnected ? "text-emerald-500" : "text-rose-500";
    const indicatorColor = isLoading ? "bg-amber-500" : isConnected ? "bg-emerald-500" : "bg-rose-500";

    return (
        <div
            className={`transition-all duration-300 w-72 rounded-xl bg-card border text-card-foreground shadow-2xl p-4 relative ${isSelected
                ? "border-primary ring-2 ring-primary/30 scale-105"
                : "border-black/60 hover:border-primary/80"
                } ${isDimmed ? "opacity-35 scale-95" : "opacity-100"}`}
        >
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                    {(isLoading || isConnected) && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${indicatorColor} opacity-75`} />
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${indicatorColor}`} />
                </span>
                <span className={`text-[10px] font-mono font-medium ${statusColor}`}>{statusLabel}</span>
            </div>

            <div className="flex items-center gap-3 border-b border-border/10 pb-3 mb-3">
                <div className="p-2 text-primary ">
                    <RouterIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-sm tracking-tight text-foreground">{data.label}</h3>
                    <p className="text-[10px] font-mono text-muted-foreground">{data.model}</p>
                </div>
            </div>

            <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-medium">IP Address</span>
                    <span className="font-mono font-semibold text-foreground">{data.ip}</span>
                </div>
            </div>

            <Handle
                type="source"
                position={data.direction === "LR" ? Position.Right : Position.Bottom}
                id="router-source"
                className="!w-3 !h-3 !bg-primary !border-2 !border-card hover:!scale-125 transition-transform"
            />
        </div>
    );
};

// 2. Bridge Node (Logical Grouping Bridge)
const BridgeNodeComponent = ({ data }: { data: any }) => {
    const isDimmed = data.isDimmed;
    const isSelected = data.isSelected;
    const iface = data.interface as NetworkInterface;

    return (
        <div
            className={`transition-all duration-300 w-60 rounded-xl bg-card/80 border p-3.5 backdrop-blur-md relative ${isSelected
                ? "border-indigo-500 ring-2 ring-indigo-500/30 scale-105"
                : "border-indigo-500/30 hover:border-indigo-400"
                } ${isDimmed ? "opacity-35 scale-95" : "opacity-100"}`}
        >
            <div className="flex items-center gap-2.5 border-b border-border pb-2 mb-2.5">
                <div className="p-1.5 text-indigo-555 text-indigo-500 ">
                    <Layers className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="font-semibold text-xs tracking-tight text-foreground">{iface.name}</h4>
                    <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-500  px-1.5 py-0.5 mt-0.5 inline-block">
                        Bridge
                    </span>
                </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">IP Subnet</span>
                    <span className="font-mono text-foreground font-medium">
                        {iface.ip || "No IP Address"}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">MAC Addr</span>
                    <span className="font-mono text-foreground text-[10px]">
                        {iface.mac.substring(0, 8)}...
                    </span>
                </div>
            </div>

            <Handle
                type="target"
                position={data.direction === "LR" ? Position.Left : Position.Top}
                id="bridge-target"
                className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-card"
            />
            <Handle
                type="source"
                position={data.direction === "LR" ? Position.Right : Position.Bottom}
                id="bridge-source"
                className="!w-2.5 !h-2.5 !bg-indigo-500 !border-2 !border-card"
            />
        </div>
    );
};

// 3. Ethernet Port Node (Physical RJ45 panel style)
const EtherNodeComponent = ({ data }: { data: any }) => {
    const isDimmed = data.isDimmed;
    const isSelected = data.isSelected;
    const iface = data.interface as NetworkInterface;

    // Color mappings based on status
    let borderClass = "";
    let ledClass = " shadow-none";
    let statusLabel = "Unplugged";
    let statusColor = "text-muted-foreground";

    if (iface.disabled) {
        borderClass = "";
        ledClass = "";
        statusLabel = "Disabled";
        statusColor = "text-red-500";
    } else if (iface.status === "connected") {
        borderClass = "";
        ledClass = "";
        statusLabel = "Connected";
        statusColor = "text-emerald-500";
    }

    // Derive port number
    const portNumber = iface.name.replace(/\D/g, "");

    return (
        <div
            className={`transition-all duration-300 w-44 rounded-lg bg-card border p-2 flex items-center gap-3 relative ${isSelected
                ? "border-primary ring-2 ring-primary/20 scale-105 z-10"
                : `${borderClass} hover:border-muted-foreground/60`
                } ${isDimmed ? "opacity-35 scale-95" : "opacity-100"}`}
        >
            {/* Port index badge mimicking physical port metal cage */}
            <div className="w-9 h-9 flex flex-col items-center justify-center relative shrink-0">
                <span className="text-[10px] font-mono font-bold text-foreground leading-none">
                    {portNumber || "P"}
                </span>
                {/* LED dot inside port cage */}
                <div className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${ledClass}`} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <span className="font-semibold text-xs text-foreground truncate">{iface.name}</span>
                </div>
                <div className="flex flex-col mt-0.5">
                    <span className={`text-[9px] font-medium leading-none ${statusColor}`}>
                        {statusLabel}
                    </span>
                    {iface.bridge ? (
                        <span className="text-[8px] text-muted-foreground font-mono mt-0.5 truncate">
                            slave ({iface.bridge})
                        </span>
                    ) : (
                        <span className="text-[8px] text-primary/80 font-semibold font-mono mt-0.5">
                            {iface.name === "ether1" ? "WAN (standalone)" : "Free"}
                        </span>
                    )}
                </div>
            </div>

            <Handle
                type="target"
                position={data.direction === "LR" ? Position.Left : Position.Top}
                id="ether-target"
                className={`!w-2.5 !h-2.5 !border-2 !border-card ${iface.status === "connected" ? "!bg-emerald-500" : "!bg-muted"
                    }`}
            />
        </div>
    );
};

// 4. WiFi / Wireless Node (SSID + signal status)
const WlanNodeComponent = ({ data }: { data: any }) => {
    const isDimmed = data.isDimmed;
    const isSelected = data.isSelected;
    const iface = data.interface as NetworkInterface;

    let borderClass = "border-border";
    let badgeColor = "bg-amber-500/10 text-amber-505 text-amber-500 border-amber-500/20";

    if (iface.disabled) {
        borderClass = "border-red-500/30";
        badgeColor = "bg-red-500/10 text-red-555 text-red-500 border-red-500/20";
    } else if (iface.status === "connected") {
        borderClass = "border-amber-500/30";
    }

    return (
        <div
            className={`transition-all duration-300 w-52 rounded-lg bg-card border p-2.5 relative ${isSelected
                ? "border-amber-500 ring-2 ring-amber-500/20 scale-105 z-10"
                : `${borderClass} hover:border-muted-foreground/60`
                } ${isDimmed ? "opacity-35 scale-95" : "opacity-100"}`}
        >
            <div className="flex items-center gap-2 mb-1.5">
                <div
                    className={`p-1 rounded-md text-amber-500`}
                >
                    {iface.disabled ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-foreground truncate leading-none mb-0.5">
                        {iface.name}
                    </h4>
                    <span className="text-[8px] text-muted-foreground font-mono block truncate">
                        {iface.mac}
                    </span>
                </div>
            </div>

            <div className="flex justify-between items-center text-[10px] mt-1 border-t border-border pt-1.5">
                <span className="text-muted-foreground font-medium truncate">
                    SSID: <span className="text-foreground">{iface.ssid || "N/A"}</span>
                </span>
                {iface.band && (
                    <span className={`text-[8px] font-bold border px-1.5 py-0.5 rounded ${badgeColor}`}>
                        {iface.band}
                    </span>
                )}
            </div>

            <Handle
                type="target"
                position={data.direction === "LR" ? Position.Left : Position.Top}
                id="wlan-target"
                className="!w-2.5 !h-2.5 !bg-amber-500 !border-2 !border-card"
            />
        </div>
    );
};

// ----------------------------------------------------
// ReactFlow Custom Node Registry
// ----------------------------------------------------
const nodeTypes = {
    routerNode: RouterNodeComponent,
    bridgeNode: BridgeNodeComponent,
    etherNode: EtherNodeComponent,
    wlanNode: WlanNodeComponent,
};

// ----------------------------------------------------
// Helpers: Map API status response → local types
// ----------------------------------------------------
function formatBytesRate(bytes: number | undefined): string {
    if (!bytes || bytes === 0) return "0 bps";
    if (bytes < 1000) return `${bytes} bps`;
    if (bytes < 1000000) return `${(bytes / 1000).toFixed(1)} Kbps`;
    return `${(bytes / 1000000).toFixed(1)} Mbps`;
}

function parseBool(val: any): boolean {
    if (val === undefined || val === null) return false;
    if (typeof val === "boolean") return val;
    if (typeof val === "string") {
        const lower = val.toLowerCase().trim();
        return lower === "true" || lower === "yes" || lower === "y";
    }
    return !!val;
}

function mapStatusToInterfaces(
    statusData: RouterStatusResponse | undefined
): NetworkInterface[] {
    if (!statusData?.interfaces?.length) return [];

    // Log interfaces to help developer inspect exact fields in browser console
    console.log("Networks Page - Active Router Interfaces:", statusData.interfaces);

    // Build IP lookup from ip_addresses
    const ipMap: Record<string, string> = {};
    (statusData.ip_addresses || []).forEach((addr: any) => {
        const iface = addr.interface || addr['actual-interface'];
        if (iface && addr.address) ipMap[iface] = addr.address;
    });

    return statusData.interfaces.map((intf: any): NetworkInterface => {
        const name: string = intf.name || "unknown";
        const rawType: string = intf.type || "";
        let type: "ether" | "wlan" | "bridge" = "ether";
        if (rawType.includes("wlan") || rawType.includes("wireless") || name.startsWith("wlan")) type = "wlan";
        else if (rawType.includes("bridge") || name.startsWith("bridge")) type = "bridge";

        const isRunning = parseBool(intf.running);
        const isDisabled = parseBool(intf.disabled);
        let status: "connected" | "unplugged" | "disabled" = "unplugged";
        if (isDisabled) status = "disabled";
        else if (isRunning) status = "connected";

        const bandStr = intf.band || intf['frequency'] || "";
        let band: "2.4GHz" | "5GHz" | undefined;
        if (typeof bandStr === "string") {
            if (bandStr.includes("5") || bandStr.includes("5ghz")) band = "5GHz";
            else if (bandStr.includes("2") || bandStr.includes("2.4")) band = "2.4GHz";
        }

        return {
            name,
            type,
            bridge: intf.bridge || intf['slave-of'] || intf.master || undefined,
            status,
            ip: ipMap[name] || undefined,
            mac: intf['mac-address'] || intf.mac || "00:00:00:00:00:00",
            ssid: intf.ssid || intf['default-name'] || undefined,
            band,
            running: isRunning,
            disabled: isDisabled,
            mtu: intf.mtu || 1500,
            txRate: formatBytesRate(intf.tx_rate ?? intf['tx-byte']),
            rxRate: formatBytesRate(intf.rx_rate ?? intf['rx-byte']),
            comment: intf.comment || undefined,
        };
    });
}

function mapStatusToRouterInfo(
    statusData: RouterStatusResponse | undefined,
    routerName: string
): RouterInfo {
    const res = statusData?.system_resource;
    const totalMem = res?.['total-memory'] || 0;
    const freeMem = res?.['free-memory'] || 0;
    return {
        name: statusData?.router_name || routerName,
        model: res?.['board-name'] || "MikroTik",
        ip: statusData?.ip_addresses?.[0]?.address || "–",
        serialNumber: res?.['serial-number'] || "–",
        firmware: res?.version ? `RouterOS ${res.version}` : "–",
        uptime: res?.uptime || "Offline",
        cpuUsage: res?.['cpu-load'] ?? 0,
        memoryUsage: totalMem ? Math.round(((totalMem - freeMem) / totalMem) * 100) : 0,
    };
}

// Helper to compute node & edge highlighting on hover (BFS traversal)
const getConnectedElements = (nodeId: string, edges: Edge[], nodes: Node[]) => {
    const connectedNodeIds = new Set<string>([nodeId]);
    const connectedEdgeIds = new Set<string>();

    const queue = [nodeId];
    while (queue.length > 0) {
        const current = queue.shift()!;
        edges.forEach((edge) => {
            if (edge.source === current && !connectedNodeIds.has(edge.target)) {
                connectedNodeIds.add(edge.target);
                connectedEdgeIds.add(edge.id);
                queue.push(edge.target);
            }
            if (edge.target === current && !connectedNodeIds.has(edge.source)) {
                connectedNodeIds.add(edge.source);
                connectedEdgeIds.add(edge.id);
                queue.push(edge.source);
            }
        });
    }

    return { connectedNodeIds, connectedEdgeIds };
};

// Dagre position calculator
const getLayoutedElements = (
    nodes: Node[],
    edges: Edge[],
    direction: "TB" | "LR"
) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    const isHorizontal = direction === "LR";
    // Increased spacing for clean, overlap-free card layouts
    dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });

    nodes.forEach((node) => {
        let width = 200;
        let height = 90;
        if (node.type === "routerNode") {
            width = 300;
            height = 180;
        } else if (node.type === "bridgeNode") {
            width = 250;
            height = 120;
        } else if (node.type === "etherNode") {
            width = 190;
            height = 70;
        } else if (node.type === "wlanNode") {
            width = 220;
            height = 90;
        }
        dagreGraph.setNode(node.id, { width, height });
    });

    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);

        node.targetPosition = isHorizontal ? Position.Left : Position.Top;
        node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

        let width = 200;
        let height = 90;
        if (node.type === "routerNode") {
            width = 300;
            height = 180;
        } else if (node.type === "bridgeNode") {
            width = 250;
            height = 120;
        } else if (node.type === "etherNode") {
            width = 190;
            height = 70;
        } else if (node.type === "wlanNode") {
            width = 220;
            height = 90;
        }

        return {
            ...node,
            position: {
                // Shift node position so layout corresponds to the top-left of the node box
                x: nodeWithPosition.x - width / 2,
                y: nodeWithPosition.y - height / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
};

// ----------------------------------------------------
// Main Component
// ----------------------------------------------------
export default function Networks() {
    // Sidebar state
    const [sidebarCollapsed, setSidebarCollapsed] = useState(
        () => localStorage.getItem("sidebar-collapsed") === "true"
    );

    useEffect(() => {
        const handler = (e: any) => {
            setSidebarCollapsed(e.detail.collapsed);
        };
        window.addEventListener("sidebar-collapse-change", handler);
        return () => window.removeEventListener("sidebar-collapse-change", handler);
    }, []);

    // ── Real API: fetch routers list, select one, then fetch its status ──
    const [branchId, setBranchId] = useState(() => localStorage.getItem("selected-workspace") || "");
    useEffect(() => {
        const handler = (event: Event) => setBranchId((event as CustomEvent<{ id: string }>).detail.id);
        window.addEventListener("renult-branch-change", handler);
        return () => window.removeEventListener("renult-branch-change", handler);
    }, []);
    const { data: routers = [], isLoading: isRoutersLoading, isError: routersError } = useRouters(branchId);
    const [selectedRouterId, setSelectedRouterId] = useState<string>("");
    const [routerDropdownOpen, setRouterDropdownOpen] = useState(false);

    // Auto-select first router
    useEffect(() => {
        if (selectedRouterId && !routers.some((router) => router.id === selectedRouterId)) {
            setSelectedRouterId("");
            setInterfacesData([]);
        }
        if (!selectedRouterId && routers.length > 0) {
            setSelectedRouterId(routers[0].id);
        }
    }, [routers, selectedRouterId]);

    const { data: statusData, isLoading: isStatusLoading, refetch: refetchStatus } = useRouterStatus(selectedRouterId);
    const selectedRouterObj = routers.find(r => r.id === selectedRouterId);
    const isTopologyLoading = isRoutersLoading || (!!selectedRouterId && isStatusLoading && !statusData);

    // Map API data into component types
    const routerData = useMemo(
        () => mapStatusToRouterInfo(statusData, selectedRouterObj?.name || "Router"),
        [statusData, selectedRouterObj]
    );
    const [interfacesData, setInterfacesData] = useState<NetworkInterface[]>([]);

    // Sync API interfaces into local state (allows local toggling)
    useEffect(() => {
        const mapped = mapStatusToInterfaces(statusData);
        setInterfacesData(statusData?.connected ? mapped : []);
    }, [statusData]);

    const [layoutDirection, setLayoutDirection] = useState<"TB" | "LR">("LR");
    const [selectedNode, setSelectedNode] = useState<any | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    // Derive base nodes and edges lists from dynamic data
    const { baseNodes, baseEdges } = useMemo(() => {
        const nodesList: Node[] = [];
        const edgesList: Edge[] = [];

        if (!selectedRouterObj) {
            return { baseNodes: nodesList, baseEdges: edgesList };
        }

        // 1. Root Router Node
        nodesList.push({
            id: "router",
            type: "routerNode",
            data: {
                label: routerData.name,
                model: routerData.model,
                ip: routerData.ip,
                serialNumber: routerData.serialNumber,
                firmware: routerData.firmware,
                uptime: routerData.uptime,
                cpuUsage: routerData.cpuUsage,
                memoryUsage: routerData.memoryUsage,
                isConnected: statusData?.connected === true,
                isLoading: isStatusLoading && !statusData,
                direction: layoutDirection,
            },
            position: { x: 0, y: 0 },
        });

        const bridgeNames = new Set<string>();

        // 2. Bridges
        interfacesData.forEach((iface) => {
            if (iface.type === "bridge") {
                bridgeNames.add(iface.name);
                nodesList.push({
                    id: `node-${iface.name}`,
                    type: "bridgeNode",
                    data: {
                        interface: iface,
                        direction: layoutDirection,
                    },
                    position: { x: 0, y: 0 },
                });

                // Router -> Bridge Edge (solid Indigo)
                edgesList.push({
                    id: `edge-router-${iface.name}`,
                    source: "router",
                    target: `node-${iface.name}`,
                    type: "smoothstep",
                    animated: iface.running,
                    style: { stroke: "#6366f1", strokeWidth: 2.5 },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: "#6366f1",
                    },
                });
            }
        });

        // 3. Ports & WiFi
        interfacesData.forEach((iface) => {
            if (iface.type === "bridge") return;

            const isBridged = iface.bridge && bridgeNames.has(iface.bridge);
            const parentId = isBridged ? `node-${iface.bridge}` : "router";
            const nodeId = `node-${iface.name}`;

            nodesList.push({
                id: nodeId,
                type: iface.type === "ether" ? "etherNode" : "wlanNode",
                data: {
                    interface: iface,
                    direction: layoutDirection,
                },
                position: { x: 0, y: 0 },
            });

            // Edge settings
            let edgeColor = "#475569"; // slate-600 (unplugged)
            let isAnimated = false;
            let isDashed = false;

            if (iface.disabled) {
                edgeColor = "#ef4444"; // red
            } else if (iface.status === "connected") {
                isAnimated = iface.running;
                if (iface.type === "wlan") {
                    edgeColor = "#f59e0b"; // amber for wireless
                } else {
                    edgeColor = isBridged ? "#4f46e5" : "#10b981"; // indigo for bridged, emerald green for standalone WAN/lan
                }
            }

            if (isBridged) {
                isDashed = true; // logical group slave port is dashed
            }

            edgesList.push({
                id: `edge-${parentId}-${nodeId}`,
                source: parentId,
                target: nodeId,
                type: "smoothstep",
                animated: isAnimated,
                style: {
                    stroke: edgeColor,
                    strokeWidth: iface.status === "connected" ? 2 : 1.5,
                    strokeDasharray: isDashed ? "5,5" : undefined,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
                },
            });
        });

        return { baseNodes: nodesList, baseEdges: edgesList };
    }, [interfacesData, routerData, layoutDirection, selectedRouterObj, statusData, isStatusLoading]);

    // Set up ReactFlow node/edge states
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // Compute Layout (re-computes dynamically on direction/nodes/edges changes)
    useEffect(() => {
        if (baseNodes.length > 0) {
            const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                JSON.parse(JSON.stringify(baseNodes)),
                JSON.parse(JSON.stringify(baseEdges)),
                layoutDirection
            );
            setNodes(layoutedNodes);
            setEdges(layoutedEdges);
        }
    }, [baseNodes, baseEdges, layoutDirection, setNodes, setEdges]);

    // Hover connections highlight calculator
    const activeElements = useMemo(() => {
        if (!hoveredNode) return null;
        return getConnectedElements(hoveredNode, edges, nodes);
    }, [hoveredNode, edges, nodes]);

    // Process nodes to inject highlight/dim/select state parameters dynamically
    const processedNodes = useMemo(() => {
        return nodes.map((node) => {
            const isSelected = selectedNode && selectedNode.id === node.id;
            const isHighlighted = activeElements
                ? activeElements.connectedNodeIds.has(node.id)
                : false;
            const isDimmed = activeElements ? !isHighlighted : false;

            return {
                ...node,
                data: {
                    ...node.data,
                    isHighlighted,
                    isDimmed,
                    isSelected,
                    direction: layoutDirection,
                },
            };
        });
    }, [nodes, selectedNode, activeElements, layoutDirection]);

    // Process edges to inject hover highlight/dim styling dynamically
    const processedEdges = useMemo(() => {
        return edges.map((edge) => {
            const isHighlighted = activeElements
                ? activeElements.connectedEdgeIds.has(edge.id)
                : false;
            const isDimmed = activeElements ? !isHighlighted : false;

            const baseStroke = edge.style?.stroke || "#475569";

            return {
                ...edge,
                animated: isHighlighted ? true : edge.animated,
                style: {
                    ...edge.style,
                    stroke: isHighlighted ? "hsl(var(--primary))" : baseStroke,
                    strokeWidth: isHighlighted ? 3 : edge.style?.strokeWidth || 1.5,
                    opacity: isDimmed ? 0.2 : 1,
                    transition: "opacity 0.25s ease, stroke 0.25s ease, stroke-width 0.25s ease",
                },
                markerEnd: {
                    ...(edge.markerEnd as any),
                    color: isHighlighted ? "hsl(var(--primary))" : baseStroke,
                },
            };
        });
    }, [edges, activeElements]);

    // ReactFlow Handlers
    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setSelectedNode(node);
        },
        [setSelectedNode]
    );

    const onNodeMouseEnter = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setHoveredNode(node.id);
        },
        [setHoveredNode]
    );

    const onNodeMouseLeave = useCallback(() => {
        setHoveredNode(null);
    }, [setHoveredNode]);

    // Simulated interface enable/disable trigger
    const handleToggleInterface = (ifaceName: string) => {
        setInterfacesData((prev) =>
            prev.map((iface) => {
                if (iface.name === ifaceName) {
                    const nextDisabled = !iface.disabled;
                    const nextStatus: "connected" | "unplugged" | "disabled" = nextDisabled
                        ? "disabled"
                        : ifaceName === "ether4" || ifaceName === "ether6"
                            ? "unplugged"
                            : "connected";

                    const updated: NetworkInterface = {
                        ...iface,
                        disabled: nextDisabled,
                        running: !nextDisabled && nextStatus === "connected",
                        status: nextStatus,
                    };

                    // Update detail panel state instantly
                    if (selectedNode && selectedNode.data.interface?.name === ifaceName) {
                        setSelectedNode((curr: any) => ({
                            ...curr,
                            data: {
                                ...curr.data,
                                interface: updated,
                            },
                        }));
                    }

                    return updated;
                }
                return iface;
            })
        );
    };

    // Render detail statistics for side drawer
    const selectedInterface: NetworkInterface | null = useMemo(() => {
        if (!selectedNode || selectedNode.id === "router") return null;
        return selectedNode.data.interface as NetworkInterface;
    }, [selectedNode]);

    return (
        <div
            className={`min-h-screen bg-background transition-all duration-300 ${sidebarCollapsed ? "md:pl-[72px]" : "md:pl-[280px]"
                }`}
        >
            <SEO title="Network Topology Map" />
            <AppHeader />

            <main className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
                {/* Topology Header Panel */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-border/40 bg-card/40 backdrop-blur-md px-6 py-4 shrink-0 gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Interactive visualization of RouterOS bridge and hardware interface attachments.
                        </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Layout Direction Selector */}
                        <div className="flex items-center gap-1 bg-muted/65 p-1 rounded border border-border/30 text-xs shrink-0">
                            <button
                                onClick={() => setLayoutDirection("TB")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-all ${layoutDirection === "TB"
                                    ? "bg-background text-primary shadow-sm border border-border/30"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <Maximize2 className="w-3.5 h-3.5 rotate-90" /> Top-Down
                            </button>
                            <button
                                onClick={() => setLayoutDirection("LR")}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-semibold transition-all ${layoutDirection === "LR"
                                    ? "bg-background text-primary shadow-sm border border-border/30"
                                    : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                <ArrowRight className="w-3.5 h-3.5" /> Left-to-Right
                            </button>
                        </div>

                        {/* Router Selector Dropdown */}
                        <div className="relative shrink-0">
                            <button
                                onClick={() => setRouterDropdownOpen(!routerDropdownOpen)}
                                className="flex items-center gap-1.5 px-3 py-2 rounded bg-card border border-border/80 hover:bg-muted/40 transition-colors text-xs font-semibold"
                            >
                                <RouterIcon className="w-3.5 h-3.5 text-primary" />
                                <span className="truncate max-w-[120px]">{selectedRouterObj?.name || "Select Router"}</span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>
                            {routerDropdownOpen && (
                                <div className="absolute top-full right-0 mt-1 w-56 bg-card border border-border rounded shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                                    {routers.map(r => (
                                        <button
                                            key={r.id}
                                            onClick={() => { setSelectedRouterId(r.id); setRouterDropdownOpen(false); setSelectedNode(null); }}
                                            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/60 transition-colors flex items-center gap-2 ${
                                                r.id === selectedRouterId ? "bg-primary/10 text-primary font-bold" : "text-foreground"
                                            }`}
                                        >
                                            <RouterIcon className="w-3 h-3 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="block truncate font-semibold">{r.name}</span>
                                                <span className="block text-[10px] text-muted-foreground font-mono">{r.host}</span>
                                            </div>
                                        </button>
                                    ))}
                                    {routers.length === 0 && (
                                        <div className="px-3 py-4 text-xs text-muted-foreground text-center">No routers found</div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={() => {
                                refetchStatus();
                                setSelectedNode(null);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded bg-card border border-border/80 hover:bg-muted/40 transition-colors text-xs font-semibold shrink-0"
                            title="Refresh from router"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isStatusLoading ? 'animate-spin' : ''}`} /> Refresh
                        </button>
                    </div>
                </div>

                {/* Loading / Empty States */}
                {isTopologyLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs font-medium">Loading network topology…</span>
                        </div>
                    </div>
                )}

                {!isTopologyLoading && !routersError && routers.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground border border-dashed border-border rounded p-10">
                            <RouterIcon className="w-10 h-10 text-muted-foreground/40" />
                            <span className="text-sm font-semibold">No routers configured</span>
                            <span className="text-xs">Add a router from the Routers page to visualize its network topology.</span>
                        </div>
                    </div>
                )}

                {routersError && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="border border-rose-500/30 bg-rose-500/5 rounded-lg p-8 text-center">
                            <span className="text-sm font-semibold text-rose-600">Could not load configured routers</span>
                            <p className="text-xs text-muted-foreground mt-1">Check the API connection and active workspace, then refresh.</p>
                        </div>
                    </div>
                )}

                {!isTopologyLoading && selectedRouterId && statusData && !statusData.connected && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 rounded border border-rose-500/30 bg-background px-4 py-2 shadow text-xs">
                        <span className="font-bold text-rose-600">{selectedRouterObj?.name} is offline.</span>
                        <span className="text-muted-foreground ml-2">{statusData.error || "RouterOS API is unreachable."}</span>
                    </div>
                )}

                {/* Canvas & Sidebar Main Container */}
                {!isTopologyLoading && !routersError && routers.length > 0 && selectedRouterObj && (
                <div className="flex-1 flex min-h-0 relative">

                    {/* ReactFlow Canvas container */}
                    <div className="flex-1 h-full min-w-0 bg-muted/30 relative">
                        <ReactFlow
                            key={`${selectedRouterId}-${layoutDirection}-${baseNodes.length}`}
                            nodes={processedNodes}
                            edges={processedEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onNodeClick={onNodeClick}
                            onNodeMouseEnter={onNodeMouseEnter}
                            onNodeMouseLeave={onNodeMouseLeave}
                            nodeTypes={nodeTypes}
                            fitView
                            fitViewOptions={{ padding: baseNodes.length > 12 ? 0.08 : 0.18, minZoom: 0.1, maxZoom: 1 }}
                            minZoom={0.08}
                            maxZoom={1.25}
                        >
                            <Background color="hsl(var(--border))" gap={16} size={1} />
                            <Controls className="!bg-card !border-border !text-foreground [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-foreground [&_button:hover]:!bg-muted" />
                            <MiniMap
                                nodeColor={(node) => {
                                    if (node.type === "routerNode") return "hsl(var(--primary))";
                                    if (node.type === "bridgeNode") return "#6366f1";
                                    if (node.type === "etherNode") {
                                        const iface = node.data.interface as NetworkInterface;
                                        return iface.disabled ? "#ef4444" : iface.status === "connected" ? "#10b981" : "#475569";
                                    }
                                    if (node.type === "wlanNode") return "#f59e0b";
                                    return "#94a3b8";
                                }}
                                maskColor="hsla(var(--background) / 0.7)"
                                className="!bg-card !border-border rounded-lg overflow-hidden border"
                            />

                        </ReactFlow>
                    </div>

                    {/* Slide-out Sidebar Drawer for detailed specs */}
                    <div
                        className={`absolute top-0 right-0 h-full w-96 bg-card border-l border-border shadow-2xl z-20 flex flex-col transition-transform duration-300 ease-in-out ${selectedNode ? "translate-x-0" : "translate-x-full"
                            }`}
                    >
                        {selectedNode && (
                            <>
                                {/* Header */}
                                <div className="p-4 border-b border-border flex items-center justify-between bg-muted/10">
                                    <div className="flex items-center gap-2">
                                        {selectedNode.id === "router" ? (
                                            <RouterIcon className="w-4 h-4 text-primary" />
                                        ) : selectedInterface?.type === "bridge" ? (
                                            <Layers className="w-4 h-4 text-indigo-500" />
                                        ) : selectedInterface?.type === "wlan" ? (
                                            <Wifi className="w-4 h-4 text-amber-500" />
                                        ) : (
                                            <Network className="w-4 h-4 text-emerald-500" />
                                        )}
                                        <h3 className="font-bold text-sm text-foreground truncate">
                                            {selectedNode.id === "router" ? "Router Configuration" : selectedNode.data.interface?.name}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNode(null)}
                                        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar text-foreground">

                                    {/* Overview Card */}
                                    {selectedNode.id === "router" ? (
                                        // Router Overview
                                        <div className="space-y-4">
                                            <div className="bg-muted/50 p-4">

                                                <h4 className="text-base font-bold text-foreground mb-0.5">{routerData.name}</h4>
                                                <p className="text-xs text-primary font-mono">{routerData.model}</p>

                                                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border text-xs">
                                                    <div>
                                                        <span className="text-muted-foreground block mb-0.5">Firmware</span>
                                                        <span className="text-foreground font-semibold">{routerData.firmware}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground block mb-0.5">Serial Code</span>
                                                        <span className="text-foreground font-mono font-semibold">{routerData.serialNumber}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Performance charts mock */}
                                            <div className="space-y-3">
                                                <div className="bg-muted/30 p-3.5 rounded flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Cpu className="w-4 h-4 text-primary" />
                                                        <div>
                                                            <span className="text-xs font-semibold block text-foreground">CPU Load</span>
                                                            <span className="text-[10px] text-muted-foreground">4 cores @ 1.4GHz</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono font-bold text-foreground">{routerData.cpuUsage}%</span>
                                                </div>

                                                <div className="bg-muted/30 p-3.5 rounded flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <HardDrive className="w-4 h-4 text-cyan-500" />
                                                        <div>
                                                            <span className="text-xs font-semibold block text-foreground">Memory</span>
                                                            <span className="text-[10px] text-muted-foreground">Total size: 512 MB</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono font-bold text-foreground">{routerData.memoryUsage}%</span>
                                                </div>

                                                <div className="bg-muted/30 p-3.5 rounded flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Activity className="w-4 h-4 text-emerald-505" />
                                                        <div>
                                                            <span className="text-xs font-semibold block text-foreground">System Uptime</span>
                                                            <span className="text-[10px] text-muted-foreground">Last boot: clear</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs text-foreground">{routerData.uptime}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Interface Overview
                                        selectedInterface && (
                                            <div className="space-y-5">

                                                {/* Status Card */}
                                                <div className="bg-muted/50 p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="text-[10px] text-muted-foreground font-bold block mb-1">
                                                                {selectedInterface.type}
                                                            </span>
                                                            <h4 className="text-lg font-bold text-foreground ">
                                                                {selectedInterface.name}
                                                            </h4>
                                                        </div>
                                                        <span
                                                            className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${selectedInterface.disabled
                                                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                                : selectedInterface.status === "connected"
                                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                    : "bg-muted text-muted-foreground border-border"
                                                                }`}
                                                        >
                                                            {selectedInterface.status}
                                                        </span>
                                                    </div>

                                                </div>

                                                {/* Real-time rates simulated */}
                                                {selectedInterface.status === "connected" && (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-muted/30 p-3  relative overflow-hidden">
                                                                <TrendingUp className="w-8 h-8 text-primary absolute bottom-1 right-1 opacity-5" />
                                                                <span className="text-[10px] text-muted-foreground block mb-1">TX RATE</span>
                                                                <span className="font-mono font-bold text-sm text-foreground">
                                                                    {selectedInterface.txRate || "0 bps"}
                                                                </span>
                                                            </div>
                                                            <div className="bg-muted/30 p-3  relative overflow-hidden">
                                                                <TrendingUp className="w-8 h-8 text-emerald-555 absolute bottom-1 right-1 opacity-5" />
                                                                <span className="text-[10px] text-muted-foreground block mb-1">RX RATE</span>
                                                                <span className="font-mono font-bold text-sm text-foreground">
                                                                    {selectedInterface.rxRate || "0 bps"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Status Flags */}
                                                <div className="space-y-3">
                                                    <h4 className="text-xs font-bold text-muted-foreground tracking-wider">Status</h4>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span
                                                            className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-xl border ${!selectedInterface.disabled
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25"
                                                                : "bg-muted text-muted-foreground/40 border-border"
                                                                }`}
                                                        >
                                                            R (RUNNING)
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-xl border ${selectedInterface.disabled
                                                                ? "bg-red-500/10 text-red-500 border-red-500/25"
                                                                : "bg-muted text-muted-foreground/40 border-border"
                                                                }`}
                                                        >
                                                            D (DISABLED)
                                                        </span>
                                                        <span
                                                            className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-xl border ${selectedInterface.bridge
                                                                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/25"
                                                                : "bg-muted text-muted-foreground/40 border-border"
                                                                }`}
                                                        >
                                                            S (SLAVE)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Admin Action triggers */}
                                                <div className="pt-4">
                                                    <button
                                                        onClick={() => handleToggleInterface(selectedInterface.name)}
                                                        className={`w-full py-2.5 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2 ${selectedInterface.disabled
                                                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                            : "bg-red-600 hover:bg-red-500 text-white"
                                                            }`}
                                                    >
                                                        {selectedInterface.disabled ? (
                                                            <>
                                                                <Play className="w-3.5 h-3.5" /> Enable Interface (Set UP)
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Square className="w-3.5 h-3.5" /> Disable Interface (Set DOWN)
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                </div>
                )}
            </main>
        </div>
    );
}
