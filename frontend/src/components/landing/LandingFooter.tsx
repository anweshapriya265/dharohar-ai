'use client';

import React from 'react';
import Link from 'next/link';
import DharoharLogo from '@/components/DharoharLogo';
import { ShieldCheck, Compass, BookOpen, ExternalLink, ArrowRight } from 'lucide-react';

export default function LandingFooter() {
  return (
    <footer className="border-t border-[#DED3C2] bg-[#F6F1E7] text-[#393331] pt-14 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          
          {/* Col 1 & 2: Brand & Mission (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#642F38] text-[#FFFCF5] flex items-center justify-center shadow-xs">
                <DharoharLogo className="w-5 h-5 text-[#FFFCF5]" />
              </div>
              <div>
                <span className="font-serif font-bold text-lg text-[#642F38] tracking-tight block">
                  DHAROHAR AI (धरोहर)
                </span>
                <span className="text-[11px] font-sans text-[#756D66]">
                  Digital Heritage Intelligence Platform
                </span>
              </div>
            </div>

            <p className="text-xs font-sans text-[#756D66] leading-relaxed max-w-sm">
              An evidence-grounded research platform connecting historical architectural monographs, subterranean hydraulic stepwells, and rock-cut cave temples with interactive 3D digital twins, geospatial trails, and server-validated citations.
            </p>

            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFFCF5] border border-[#DED3C2] text-xs font-mono text-[#642F38]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#52745E]" />
                <span>Blithchron &apos;27 · IIT Gandhinagar</span>
              </div>
            </div>
          </div>

          {/* Col 3: Exploration Destinations */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#642F38]">
              Platform Modules
            </h4>
            <ul className="space-y-2 text-xs font-sans text-[#756D66]">
              <li>
                <Link href="/platform?tab=assistant" className="hover:text-[#642F38] transition-colors">
                  Research Assistant
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=heritage-3d" className="hover:text-[#642F38] transition-colors">
                  3D Heritage Explorer
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=3d-viewer" className="hover:text-[#642F38] transition-colors">
                  Stepwell Digital Twin
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=cartography" className="hover:text-[#642F38] transition-colors">
                  Expedition Map
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=search" className="hover:text-[#642F38] transition-colors">
                  Hybrid Archival Search
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=records" className="hover:text-[#642F38] transition-colors">
                  Heritage Corpus
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Archival Collections */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#642F38]">
              Archival Provenance
            </h4>
            <ul className="space-y-2 text-xs font-sans text-[#756D66]">
              <li>
                <Link href="/platform?tab=archive" className="hover:text-[#642F38] transition-colors">
                  Cave Temples of India (1880)
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=archive" className="hover:text-[#642F38] transition-colors">
                  Archaeological Survey Folios
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=archive" className="hover:text-[#642F38] transition-colors">
                  Sanskrit &amp; Persian Epigraphs
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=review-queue" className="hover:text-[#642F38] transition-colors">
                  Curator Review Queue
                </Link>
              </li>
              <li>
                <Link href="/platform?tab=admin" className="hover:text-[#642F38] transition-colors">
                  Provenance Audit Trail
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Institutional Attribution */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-xs uppercase tracking-wider text-[#642F38]">
              Academic Context
            </h4>
            <p className="text-xs font-sans text-[#756D66] leading-relaxed">
              Developed for national hackathon evaluation under Problem Statement <span className="font-mono text-[#642F38] font-bold">HC26-CULT01</span>: Digital Revitalisation of Unstructured Cultural &amp; Architectural Heritage Archives.
            </p>
            <p className="text-xs font-sans text-[#756D66] leading-relaxed">
              Inspired by fieldwork from the IIT Gandhinagar Explorer Fellowship across Western Indian subterranean stepwells and rock-cut monuments.
            </p>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Source Notes */}
        <div className="pt-8 border-t border-[#DED3C2] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-sans text-[#756D66]">
          <div suppressHydrationWarning>
            &copy; 2025 DHAROHAR AI. All research rights and citations preserved.
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span>Dual-Pagination Architecture</span>
            <span>·</span>
            <span>RRF k=60 Hybrid Retrieval</span>
            <span>·</span>
            <span>Local Sovereign Inference</span>
          </div>
        </div>

      </div>
    </footer>
  );
}

