"use client";

import React, { useState, useEffect, useCallback } from "react";

interface EdgeNode {
  node_id: string;
  hostname: string;
  region: string;
  ip_address: string;
  ebpf_probes_loaded: number;
  active_kprobes: string[];
  cpu_usage_pct: number;
  memory_mb: number;
  status: string;
}

export default function EdgeMeshTopologyView() {
  const [nodes, setNodes] = useState<EdgeNode[]>([
    {
      node_id: "edge-node-frankfurt",
      hostname: "fra-ksec-01",
      region: "eu-central-1",
      ip_address: "10.120.0.4",
      ebpf_probes_loaded: 4,
      active_kprobes: ["tcp_v4_connect", "sys_enter_execve"],
      cpu_usage_pct: 1.2,
      memory_mb: 240,
      status: "ONLINE",
    },
    {
      node_id: "edge-node-tokyo",
      hostname: "nrt-ksec-02",
      region: "ap-northeast-1",
      ip_address: "10.140.2.19",
      ebpf_probes_loaded: 4,
      active_kprobes: ["tcp_v4_connect", "cgroup_freeze"],
      cpu_usage_pct: 0.8,
      memory_mb: 215,
      status: "ONLINE",
    },
    {
      node_id: "edge-node-useast",
      hostname: "iad-ksec-03",
      region: "us-east-1",
      ip_address: "10.100.8.82",
      ebpf_probes_loaded: 4,
      active_kprobes: ["tcp_v4_connect", "sys_enter_execve"],
      cpu_usage_pct: 1.9,
      memory_mb: 280,
      status: "ONLINE",
    },
  ]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.ksec.space";

  const fetchNodes = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/mesh/nodes`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNodes(data);
        }
      }
    } catch (err) {
      console.error("Failed to fetch mesh nodes", err);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchNodes();
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, [fetchNodes]);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-6 shadow-2xl backdrop-blur font-mono text-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
        <div>
          <h2 className="text-xs sm:text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
            <span>🌐</span> Distributed Multi-Node Telemetry Mesh
          </h2>
          <p className="text-zinc-500 text-[11px] mt-0.5">
            mTLS / gRPC agent orchestration across multi-region edge clusters.
          </p>
        </div>
        <span className="w-fit text-[10px] sm:text-xs px-2 py-0.5 rounded border border-cyan-800 bg-cyan-950/40 text-cyan-400 font-semibold">
          MESH STATUS: SYNCHRONIZED
        </span>
      </div>

      {/* Node Cards Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {nodes.map((node) => (
          <div
            key={node.node_id}
            className="p-3 sm:p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 truncate">{node.node_id}</span>
              <span className="text-emerald-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800">
                ● {node.status}
              </span>
            </div>
            <div className="text-zinc-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Region:</span>
                <span className="text-zinc-200">{node.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Host:</span>
                <span className="text-zinc-200">{node.hostname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Probes:</span>
                <span className="text-cyan-300 font-bold">{node.ebpf_probes_loaded} loaded</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">CPU / RAM:</span>
                <span className="text-amber-300">{node.cpu_usage_pct}% / {node.memory_mb} MB</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
