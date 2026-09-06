"use client";

import React from "react";

interface OuroborosAnimatedLogoProps {
  size?: string;
  className?: string;
  imageSrc?: string;
  showAura?: boolean;
}

export default function OuroborosAnimatedLogo({
  size = "w-48 h-48 sm:w-56 sm:h-56 lg:w-60 lg:h-60",
  className = "",
  imageSrc = "/assets/ksec_enterprise_ouroboros.svg",
  showAura = true,
}: OuroborosAnimatedLogoProps) {
  return (
    <div
      className={`relative inline-flex items-center justify-center p-4 group select-none ${className}`}
      style={{
        filter: "drop-shadow(0 0 16px rgba(0, 245, 155, 0.25)) drop-shadow(0 12px 28px rgba(4, 6, 5, 0.8))",
      }}
    >
      {/* Precision Kinetic Aura (Laser Emerald to Mint Core) */}
      {showAura && (
        <div className="absolute inset-0 rounded-full blur-3xl opacity-20 bg-gradient-to-tr from-[#00F59B] via-[#00D27F] to-[#0B1310] animate-pulse pointer-events-none group-hover:opacity-45 transition-opacity duration-700" />
      )}

      {/* Parametric Kinetic Torus Layer */}
      <div className="relative transition-transform duration-500 will-change-transform group-hover:scale-105">
        <img
          src={imageSrc}
          alt="KSEC Sovereign Infrastructure Mark"
          className={`${size} object-contain drop-shadow-[0_0_20px_rgba(0,245,155,0.35)] transition-all duration-700 group-hover:drop-shadow-[0_0_35px_rgba(0,245,155,0.65)]`}
        />
      </div>
    </div>
  );
}
