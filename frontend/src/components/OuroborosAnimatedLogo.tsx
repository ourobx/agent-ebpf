"use client";

import React from "react";

interface OuroborosAnimatedLogoProps {
  size?: string;
  className?: string;
  imageSrc?: string;
  showAura?: boolean;
}

export default function OuroborosAnimatedLogo({
  size = "w-48 h-48",
  className = "",
  imageSrc,
  showAura = true,
}: OuroborosAnimatedLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-4 group select-none ${className}`}
      style={{
        filter: "drop-shadow(0 0 12px rgba(0, 255, 170, 0.45)) drop-shadow(0 0 25px rgba(0, 245, 212, 0.25))",
      }}
    >
      {/* Cyber Neon Pulse Glow Aura */}
      {showAura && (
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30 bg-gradient-to-tr from-[#00ffaa] via-[#00f5d4] to-[#06b6d4] animate-pulse pointer-events-none group-hover:opacity-60 transition-opacity duration-500" />
      )}

      {/* Rotating Ring Layer */}
      <div className="relative animate-[spin_35s_linear_infinite] hover:[animation-play-state:paused] transition-transform duration-500 will-change-transform">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Ouroboros Cyber Logo"
            className={`${size} drop-shadow-[0_0_15px_rgba(0,255,170,0.5)] transition-all duration-500 group-hover:drop-shadow-[0_0_30px_rgba(0,245,212,0.9)] object-contain`}
          />
        ) : (
          /* Native High-Definition Cyberpunk Ouroboros SVG Vector */
          <svg
            viewBox="0 0 200 200"
            className={`${size} drop-shadow-[0_0_15px_rgba(0,255,170,0.6)] transition-all duration-500 group-hover:drop-shadow-[0_0_35px_rgba(0,245,212,0.95)]`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="cyberOuroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00ffaa" />
                <stop offset="50%" stopColor="#00f5d4" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Outer Tech Orbit Track */}
            <circle
              cx="100"
              cy="100"
              r="84"
              stroke="url(#cyberOuroGrad)"
              strokeWidth="2"
              strokeDasharray="6 4 12 4"
              opacity="0.5"
            />

            {/* Main Ouroboros Serpent Arc */}
            <path
              d="M 100,18 A 82,82 0 1,1 98,18.02"
              stroke="url(#cyberOuroGrad)"
              strokeWidth="9"
              strokeLinecap="round"
              filter="url(#neonGlow)"
            />

            {/* Inner Ring Circuit */}
            <circle
              cx="100"
              cy="100"
              r="66"
              stroke="#00ffaa"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              opacity="0.7"
            />

            {/* Serpent Head / Eclipse Node */}
            <circle cx="100" cy="18" r="6.5" fill="#00ffaa" />
            <circle cx="100" cy="18" r="3" fill="#000000" />

            {/* Core Cyber Eye / Singularity Center */}
            <circle
              cx="100"
              cy="100"
              r="14"
              fill="#000000"
              stroke="url(#cyberOuroGrad)"
              strokeWidth="2"
            />
            <circle cx="100" cy="100" r="4.5" fill="#00f5d4" className="animate-ping" />
            <circle cx="100" cy="100" r="3.5" fill="#00ffaa" />
          </svg>
        )}
      </div>
    </div>
  );
}
