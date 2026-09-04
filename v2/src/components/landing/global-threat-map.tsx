import { useState, useEffect } from "react";
import { Globe, Shield, Zap, Radio, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NodeLocation {
  id: string;
  name: string;
  region: string;
  lat: number; // Normalized %
  lon: number; // Normalized %
  status: "active" | "interception" | "protecting";
  latency: string;
  blockedCount: number;
}

const INITIAL_NODES: NodeLocation[] = [
  { id: "iad", name: "Northern Virginia (IAD)", region: "us-east-1", lat: 36, lon: 26, status: "protecting", latency: "7.12 µs", blockedCount: 14829 },
  { id: "sfo", name: "Silicon Valley (SFO)", region: "us-west-1", lat: 38, lon: 17, status: "interception", latency: "8.46 µs", blockedCount: 28941 },
  { id: "fra", name: "Frankfurt (FRA)", region: "eu-central-1", lat: 30, lon: 51, status: "protecting", latency: "6.98 µs", blockedCount: 19402 },
  { id: "lhr", name: "London (LHR)", region: "eu-west-1", lat: 28, lon: 47, status: "protecting", latency: "7.84 µs", blockedCount: 22105 },
  { id: "nrt", name: "Tokyo (NRT)", region: "ap-northeast-1", lat: 36, lon: 86, status: "interception", latency: "8.15 µs", blockedCount: 31804 },
  { id: "sin", name: "Singapore (SIN)", region: "ap-southeast-1", lat: 58, lon: 78, status: "protecting", latency: "9.02 µs", blockedCount: 16750 },
  { id: "gru", name: "São Paulo (GRU)", region: "sa-east-1", lat: 72, lon: 33, status: "protecting", latency: "11.20 µs", blockedCount: 9420 },
  { id: "syd", name: "Sydney (SYD)", region: "ap-southeast-2", lat: 76, lon: 90, status: "protecting", latency: "10.45 µs", blockedCount: 12630 },
];

export function GlobalThreatMap() {
  const [nodes, setNodes] = useState<NodeLocation[]>(INITIAL_NODES);
  const [activeNode, setActiveNode] = useState<NodeLocation>(INITIAL_NODES[1]);
  const [totalIntercepted, setTotalIntercepted] = useState(155881);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalIntercepted((prev) => prev + Math.floor(Math.random() * 4) + 1);
      
      setNodes((current) =>
        current.map((node) => {
          if (Math.random() > 0.6) {
            const jitter = (Math.random() * 1.5 - 0.75).toFixed(2);
            const baseLat = parseFloat(node.latency);
            const newLat = Math.max(5.2, baseLat + parseFloat(jitter)).toFixed(2);
            return {
              ...node,
              latency: `${newLat} µs`,
              blockedCount: node.blockedCount + (Math.random() > 0.5 ? 1 : 0),
              status: Math.random() > 0.75 ? "interception" : "protecting",
            };
          }
          return node;
        })
      );
    }, 2200);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="scroll-mt-24 border-t border-border py-20 sm:py-24 relative overflow-hidden bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-mono text-primary mb-3">
              <Radio className="size-3 animate-pulse text-primary" />
              GLOBAL MESH · 8 EDGE RING-0 REGIONS
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl text-foreground">
              Real-Time Global Interception Mesh
            </h2>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              Autonomous eBPF filter fabrics deployed across global cloud PoPs. Sub-15µs deterministic verdict execution everywhere your agents run.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-card border border-border px-4 py-3 rounded-2xl shadow-sm">
            <div className="size-3 rounded-full bg-ok animate-pulse-dot" />
            <div>
              <p className="font-mono text-xs text-muted-foreground uppercase">Threats Neutralized Today</p>
              <p className="font-mono text-2xl font-bold text-foreground tabular-nums">
                {totalIntercepted.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Global World Map Container */}
        <div className="mt-12 rounded-3xl bg-card p-4 sm:p-8 shadow-[0_0_0_1px_rgb(255_255_255_/_0.08)] relative overflow-hidden card-hover-lift">
          <div className="relative w-full aspect-[16/9] max-h-[520px] rounded-2xl bg-black/60 border border-border/80 overflow-hidden flex items-center justify-center">
            {/* World Map SVG Grid Background */}
            <svg
              className="absolute inset-0 w-full h-full opacity-25 object-cover pointer-events-none"
              viewBox="0 0 1000 500"
              fill="none"
              stroke="#00ff66"
              strokeWidth="0.5"
            >
              {/* Grid Lines */}
              {Array.from({ length: 20 }).map((_, i) => (
                <line key={`h-${i}`} x1="0" y1={i * 25} x2="1000" y2={i * 25} stroke="#00ff66" strokeOpacity="0.1" />
              ))}
              {Array.from({ length: 40 }).map((_, i) => (
                <line key={`v-${i}`} x1={i * 25} y1="0" x2={i * 25} y2="500" stroke="#00ff66" strokeOpacity="0.1" />
              ))}
              
              {/* Stylized Continents Outlines */}
              {/* North America */}
              <path d="M 120 120 Q 200 80 320 120 T 360 220 Q 280 280 200 240 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />
              {/* South America */}
              <path d="M 280 260 Q 380 320 340 440 T 260 380 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />
              {/* Europe */}
              <path d="M 440 100 Q 560 90 560 180 T 460 200 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />
              {/* Africa */}
              <path d="M 460 210 Q 580 220 540 380 T 450 300 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />
              {/* Asia */}
              <path d="M 570 90 Q 820 80 840 220 T 640 260 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />
              {/* Australia */}
              <path d="M 780 340 Q 890 330 870 420 T 770 410 Z" fill="rgba(0, 255, 102, 0.04)" stroke="rgba(0, 255, 102, 0.3)" />

              {/* Connecting mesh lines between major data hubs */}
              <path d="M 170 190 Q 215 150 260 180" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <path d="M 260 180 Q 365 140 470 140" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <path d="M 470 140 Q 490 145 510 150" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <path d="M 510 150 Q 685 135 860 180" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <path d="M 860 180 Q 820 235 780 290" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
              <path d="M 780 290 Q 840 335 900 380" stroke="#00ff66" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
            </svg>

            {/* Interactive Node Markers */}
            {nodes.map((node) => {
              const isSelected = activeNode.id === node.id;
              const isIntercepting = node.status === "interception";

              return (
                <div
                  key={node.id}
                  style={{ top: `${node.lat}%`, left: `${node.lon}%` }}
                  onClick={() => setActiveNode(node)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                >
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring */}
                    <span
                      className={`absolute inline-flex size-6 rounded-full opacity-75 ${
                        isIntercepting
                          ? "bg-destructive animate-ping"
                          : "bg-primary animate-ping-slow"
                      }`}
                    />
                    {/* Node Core */}
                    <div
                      className={`relative size-3.5 rounded-full border-2 border-background transition-transform duration-200 group-hover:scale-150 ${
                        isIntercepting ? "bg-destructive" : "bg-primary"
                      } ${isSelected ? "scale-125 ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    />
                  </div>

                  {/* Node Hover/Active Tooltip */}
                  <div
                    className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none transition-all duration-200 z-20 ${
                      isSelected
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100"
                    }`}
                  >
                    <div className="rounded-lg bg-card/95 backdrop-blur-md border border-border px-2.5 py-1.5 shadow-xl font-mono text-[11px] whitespace-nowrap">
                      <p className="font-semibold text-foreground">{node.name}</p>
                      <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <Zap className="size-3 text-primary" /> SLA: {node.latency}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Selected Node Real-time Telemetry Card Overlay */}
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 rounded-xl bg-card/90 backdrop-blur-lg border border-border p-4 shadow-2xl z-20 font-mono">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="size-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">{activeNode.name}</span>
                </div>
                <Badge
                  variant={activeNode.status === "interception" ? "danger" : "ok"}
                  className="text-[10px] px-1.5 py-0 uppercase"
                >
                  {activeNode.status === "interception" ? "Intercepting" : "Ring-0 Active"}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background/80 rounded-md p-2 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Kernel Latency</span>
                  <span className="text-sm font-bold text-primary tabular-nums">{activeNode.latency}</span>
                </div>
                <div className="bg-background/80 rounded-md p-2 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Blocked Threats</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {activeNode.blockedCount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
