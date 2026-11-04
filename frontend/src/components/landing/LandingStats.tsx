'use client';

import React from 'react';
import { BookOpen, FileText, MapPin, Database, CheckCircle2 } from 'lucide-react';

export default function LandingStats() {
  const stats = [
    {
      label: 'Archival Monographs',
      value: '3 Volumes',
      sub: 'Colonial & Regional Surveys (1880–1920)',
      icon: BookOpen,
    },
    {
      label: 'Documented Folios',
      value: '1,188 Pages',
      sub: 'Dual-paginated with original printed labels',
      icon: FileText,
    },
    {
      label: 'Indexed Evidence Chunks',
      value: '685 Passages',
      sub: 'Hybrid dense embeddings & FTS5 BM25',
      icon: Database,
    },
    {
      label: 'Geocoded Heritage Sites',
      value: '5 Field Landmarks',
      sub: 'GPS coordinates, epigraphs & 3D twins',
      icon: MapPin,
    },
    {
      label: 'Evidence Grounding',
      value: '100% Verified',
      sub: 'Strict server-controlled citation integrity',
      icon: CheckCircle2,
    },
  ];

  return (
    <section className="border-y border-[#DED3C2] bg-[#FFFCF5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-[#DED3C2]">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`flex flex-col space-y-1.5 ${
                  idx > 0 ? 'pt-4 md:pt-0 md:pl-6' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs text-[#A77C54] font-medium font-serif">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{stat.label}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-serif font-bold text-[#642F38] tracking-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] font-sans text-[#756D66] leading-tight">
                  {stat.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

