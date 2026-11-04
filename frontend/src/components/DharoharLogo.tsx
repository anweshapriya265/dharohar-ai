'use client';

import React from 'react';

interface DharoharLogoProps {
  className?: string;
  size?: number;
}

export default function DharoharLogo({ className = '', size = 38 }: DharoharLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      aria-label="DHAROHAR AI Logo"
    >
      <defs>
        <linearGradient id="burgundyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#642F38" />
          <stop offset="100%" stopColor="#4A1E25" />
        </linearGradient>
        <linearGradient id="bronzeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8AD8D" />
          <stop offset="100%" stopColor="#A77C54" />
        </linearGradient>
      </defs>

      {/* Outer Rounded Architectural Seal */}
      <rect x="6" y="6" width="108" height="108" rx="22" fill="url(#burgundyGrad)" />
      <rect x="8" y="8" width="104" height="104" rx="20" stroke="url(#bronzeGrad)" strokeWidth="1.5" strokeOpacity="0.8" />

      {/* Stepped Geometric Pavilion Terraces (Stepwell Plan) */}
      <rect x="22" y="22" width="76" height="76" rx="8" stroke="url(#bronzeGrad)" strokeWidth="2" strokeOpacity="0.9" />
      <rect x="33" y="33" width="54" height="54" rx="5" stroke="#FFFCF5" strokeWidth="1.8" strokeOpacity="0.9" />
      <rect x="42" y="42" width="36" height="36" rx="3" fill="#3D181E" stroke="url(#bronzeGrad)" strokeWidth="1.5" />

      {/* Carved Torana Gateway Arch */}
      <path d="M48 68V54C48 49 53 46 60 46C67 46 72 49 72 54V68" stroke="#FFFCF5" strokeWidth="2" strokeLinecap="round" />
      <path d="M53 68V56C53 52 56 50 60 50C64 50 67 52 67 56V68" stroke="url(#bronzeGrad)" strokeWidth="1.5" />

      {/* Digital Intelligence Star */}
      <path d="M60 38L62.5 43.5L68 46L62.5 48.5L60 54L57.5 48.5L52 46L57.5 43.5L60 38Z" fill="url(#bronzeGrad)" />

      {/* Sacred Water Table Reservoir */}
      <circle cx="60" cy="62" r="2.8" fill="#A77C54" />
    </svg>
  );
}
