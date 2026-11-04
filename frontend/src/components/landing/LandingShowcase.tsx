'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Compass, Sparkles, MapPin, ExternalLink } from 'lucide-react';

export default function LandingShowcase() {
  const monuments = [
    {
      id: 'kailasa',
      name: 'Kailasa Temple (Cave 16)',
      location: 'Ellora Caves, Aurangabad District, Maharashtra',
      period: '8th Century CE · Rashtrakuta Dynasty (King Krishna I)',
      architecture: 'Monolithic Rock-Cut Dravidian Temple',
      dimensions: 'Courtyard: 276 × 154 ft · Vimana: 96 ft high',
      description:
        'Carved entirely top-down from a vertical volcanic basalt cliff face by excavating over 200,000 tonnes of rock. Features a two-storey gateway, Nandi mandapa, life-size elephant friezes, and multi-pillared sabhamandapa.',
      image: '/heritage/kailasa_3d.png',
      badge: '3D Monolith Model',
      attribution: 'James Fergusson & James Burgess (1880), The Cave Temples of India',
      ctaText: 'Launch Monolith 3D Explorer',
      ctaLink: '/platform?tab=heritage-3d',
    },
    {
      id: 'adalaj',
      name: 'Adalaj Stepwell (Rudabai ni Vav)',
      location: 'Adalaj, Gandhinagar District, Gujarat',
      period: '1498 CE · Vaghela Dynasty (Queen Rudabai)',
      architecture: 'Solanki-Vaghela Subterranean Hydraulic Monument',
      dimensions: 'Five storeys subterranean depth · Octagonal well shaft',
      description:
        'Subterranean water-harvesting architecture designed to buffer arid seasonal temperatures. Features three entrance stairs meeting at a first-floor subterranean platform, carved sandstone columns, and bilingual Sanskrit & Persian epigraphs.',
      image: '/heritage/adalaj_3d.png',
      badge: 'WebGL Digital Twin',
      attribution: 'IIT Gandhinagar Explorer Fellowship Architectural Survey',
      ctaText: 'Explore Stepwell Digital Twin',
      ctaLink: '/platform?tab=3d-viewer',
    },
    {
      id: 'ranikivav',
      name: "Rani ki Vav (Queen's Stepwell)",
      location: 'Patan, Gujarat (Saraswati River Basin)',
      period: '1063 CE · Chaulukya / Solanki Dynasty (Queen Udayamati)',
      architecture: 'Inverted Temple Hydraulic Architecture · UNESCO World Heritage',
      dimensions: 'Seven stepped terraces · Over 500 principal sculptures',
      description:
        'Built as a memorial monument designed in the Maru-Gurjara architectural style. Inverted subterranean temple featuring panels of the Dasavatara (ten incarnations of Vishnu), celestial maidens (apsaras), and sophisticated hydraulic engineering.',
      image: '/heritage/expedition_map.png',
      badge: 'Geospatial Record',
      attribution: 'Archaeological Survey of India & IITGN Explorer Archive',
      ctaText: 'Locate on Expedition Map',
      ctaLink: '/platform?tab=cartography',
    },
  ];

  return (
    <section id="showcase" className="py-16 md:py-24 bg-[#FFFCF5] border-t border-[#DED3C2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="px-3 py-1 rounded-full text-xs font-serif font-medium bg-[#A77C54]/15 text-[#A77C54] border border-[#A77C54]/30 uppercase tracking-wider">
            Curated Monument Monographs
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#642F38] tracking-tight">
            Featured Architectural Heritage
          </h2>
          <p className="text-sm sm:text-base font-sans text-[#756D66] leading-relaxed">
            Historical monuments documented through authentic colonial folios, grassroots fellowship measurements, and interactive digital models.
          </p>
        </div>

        {/* Monument Cards List */}
        <div className="space-y-8">
          {monuments.map((m, idx) => (
            <div
              key={m.id}
              className="rounded-2xl border border-[#DED3C2] bg-[#F6F1E7] p-6 sm:p-8 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Visual Plate (5 cols) */}
                <div className={`lg:col-span-5 ${idx % 2 === 1 ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="relative w-full h-[260px] sm:h-[320px] rounded-xl overflow-hidden border border-[#DED3C2] bg-[#EFE8DC] group">
                    <Image
                      src={m.image}
                      alt={m.name}
                      fill
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-103"
                    />
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#FFFCF5]/90 backdrop-blur-xs text-[#642F38] font-mono text-[11px] font-semibold border border-[#DED3C2]">
                      {m.badge}
                    </div>
                  </div>
                  <div className="pt-2 px-1 text-[11px] font-mono text-[#756D66] truncate">
                    Source: {m.attribution}
                  </div>
                </div>

                {/* Details (7 cols) */}
                <div className={`lg:col-span-7 space-y-4 ${idx % 2 === 1 ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#A77C54] font-medium font-serif">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{m.location}</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#642F38] tracking-tight">
                      {m.name}
                    </h3>
                    <p className="text-xs font-mono text-[#756D66]">
                      {m.period}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 py-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#FFFCF5] border border-[#DED3C2]">
                      <span className="text-[10px] font-mono uppercase text-[#756D66] block">Typology</span>
                      <span className="font-serif font-medium text-[#393331]">{m.architecture}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#FFFCF5] border border-[#DED3C2]">
                      <span className="text-[10px] font-mono uppercase text-[#756D66] block">Recorded Scale</span>
                      <span className="font-serif font-medium text-[#393331]">{m.dimensions}</span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-sans text-[#756D66] leading-relaxed">
                    {m.description}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={m.ctaLink}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] font-serif text-xs sm:text-sm font-medium shadow-xs transition-colors"
                    >
                      <span>{m.ctaText}</span>
                      <ArrowRight className="w-4 h-4 text-[#C8AD8D]" />
                    </Link>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

