"use client";

import React, { useState, useEffect } from "react";

const TELEMETRY_LOGS = [
  "INITIALIZING RING-0 eBPF SUBSTRATE...",
  "ATTACHING LSM HOOK: lsm/socket_connect (sub-35µs)",
  "LOADING ZERO-TOCTOU ED25519 CRYPTOGRAPHIC LEASES...",
  "XDP LINE-RATE FASTPATH BOUND (1.42 Mpps CAPACITY)...",
  "TRI-KERNEL DELTA ACTIVE: [AI ↔ LSM ↔ OS KERNEL]",
  "DETERMINISTIC DEFENSE OPERATIONAL [VERIFIED]"
];

export default function KsecPreloader() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(15);
  const [logIndex, setLogIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return 95;
        return prev + Math.floor(Math.random() * 18) + 8;
      });
      setLogIndex((prev) => (prev + 1) % TELEMETRY_LOGS.length);
    }, 160);

    const handleComplete = () => {
      setProgress(100);
      clearInterval(progressInterval);
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => setLoading(false), 500);
      }, 300);
    };

    if (document.readyState === "complete") {
      handleComplete();
    } else {
      window.addEventListener("load", handleComplete);
      const fallbackTimer = setTimeout(handleComplete, 2200);
      return () => {
        window.removeEventListener("load", handleComplete);
        clearInterval(progressInterval);
        clearTimeout(fallbackTimer);
      };
    }
  }, []);

  if (!loading) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#050706] text-white select-none transition-opacity duration-500 ease-out ${
        fadeOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background Cybernetic Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,255,102,0.12),transparent_70%)] pointer-events-none" />

      {/* 60 FPS SVG Animated Emblem */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#00FF66]/15 blur-3xl animate-pulse" />
        <img
          src="/assets/ksec_loader_animation.svg"
          alt="KSEC Ring-0 Engine Loading"
          className="w-full h-full relative z-10 drop-shadow-[0_0_24px_rgba(0,255,102,0.45)]"
        />
      </div>

      {/* Telemetry Progress & Status Box */}
      <div className="mt-6 flex flex-col items-center gap-2.5 font-mono text-center px-4 max-w-md w-full relative z-10">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-[#00F59B] tracking-widest uppercase">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF66] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF66]"></span>
          </span>
          <span>SAYFA YÜKLENİYOR... // {progress}%</span>
        </div>

        {/* Laser Progress Bar */}
        <div className="w-full bg-[#0E1712] h-1.5 rounded-full overflow-hidden border border-[#00F59B]/30 my-1">
          <div
            className="h-full bg-gradient-to-r from-[#00FF66] via-[#00F59B] to-[#00F0FF] transition-all duration-150 ease-out shadow-[0_0_10px_#00FF66]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Live Kernel Feed Terminal */}
        <div className="w-full bg-[#070D0A]/90 border border-[#00F59B]/20 rounded-lg p-2 font-mono text-[11px] text-left shadow-inner">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-[#00F59B]/15 text-[#7E9389] text-[10px]">
            <span>RING-0 TELEMETRY FEED</span>
            <span className="text-[#00FF66]">SUB-35µs SLA</span>
          </div>
          <div className="text-[#00FF66] truncate flex items-center gap-1.5">
            <span className="text-[#00F0FF]">&gt;</span>
            <span>{TELEMETRY_LOGS[logIndex]}</span>
          </div>
        </div>

        <div className="text-[10px] text-[#7E9389] tracking-wider uppercase">
          eBPF LSM SUBSTRATE // ZERO-TOCTOU ACTIVE
        </div>
      </div>
    </div>
  );
}
