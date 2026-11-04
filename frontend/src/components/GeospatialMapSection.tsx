'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Compass,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Route,
  Search,
} from 'lucide-react';
import { fetchMapRecords, MapRecordItem } from '@/lib/api';

import type { Map as LeafletMap, LayerGroup, Polyline } from 'leaflet';

interface GeospatialMapSectionProps {
  onSelectRecord?: (recordId: string) => void;
}

export default function GeospatialMapSection({ onSelectRecord }: GeospatialMapSectionProps) {
  const [sites, setSites] = useState<MapRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSite, setSelectedSite] = useState<MapRecordItem | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [showRoutes, setShowRoutes] = useState<boolean>(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersGroupRef = useRef<LayerGroup | null>(null);
  const routePolylineRef = useRef<Polyline | null>(null);

  const regions = [
    { id: 'all', label: 'All Regions' },
    { id: 'Gujarat', label: 'Gujarat' },
    { id: 'Maharashtra', label: 'Maharashtra' },
    { id: 'Karnataka', label: 'Karnataka' },
    { id: 'Rajasthan', label: 'Rajasthan' },
  ];

  const typologies = [
    { id: 'all', label: 'All Typologies' },
    { id: 'Stepwell / Baoli', label: 'Stepwells (Baolis)' },
    { id: 'Temple', label: 'Temples' },
    { id: 'Monolithic Rock-Cut Temple', label: 'Monolithic Rock-Cut' },
    { id: 'Fortified Medieval City', label: 'Medieval Forts & Cities' },
  ];

  const quickJumpSites = [
    { name: 'Adalaj Stepwell', coords: [23.1667, 72.5833], desc: 'Gujarat' },
    { name: 'Rani ki Vav', coords: [23.8589, 72.1017], desc: 'Patan' },
    { name: 'Ellora Kailasa', coords: [20.0268, 75.1793], desc: 'Maharashtra' },
    { name: 'Hampi Vijayanagara', coords: [15.335, 76.46], desc: 'Karnataka' },
    { name: 'Kumbhalgarh Fort', coords: [25.1475, 73.5878], desc: 'Rajasthan' },
  ];

  // Load map records
  const loadMapData = async () => {
    setLoading(true);
    try {
      const res = await fetchMapRecords();
      setSites(res.sites || []);
      if (res.sites && res.sites.length > 0 && !selectedSite) {
        setSelectedSite(res.sites[0]);
      }
    } catch (err) {
      console.error('Error fetching map records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchMapRecords()
      .then((res) => {
        if (!isMounted) return;
        setSites(res.sites || []);
        if (res.sites && res.sites.length > 0) {
          setSelectedSite(res.sites[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching map records:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const initMap = async () => {
      const L = (await import('leaflet')).default;

      // Base map instance
      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [20.5937, 74.9629],
          zoom: 5.5,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // CartoDB Voyager Tile Layer (High legibility for cultural geography)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);

        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;
      if (!map || !markersGroup) return;

      markersGroup.clearLayers();
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
      }

      // Filter sites
      const filtered = sites.filter((site) => {
        const matchesType = activeFilter === 'all' || site.heritage_type === activeFilter;
        const matchesRegion = activeRegion === 'all' || site.region === activeRegion;
        return matchesType && matchesRegion;
      });

      const routePoints: [number, number][] = [];

      filtered.forEach((site) => {
        routePoints.push([site.latitude, site.longitude]);

        // Custom marker colors based on typology
        let markerColor = '#d4af37'; // gold
        if (site.heritage_type.includes('Stepwell')) markerColor = '#2d5e4a'; // patina
        if (site.heritage_type.includes('Monolithic')) markerColor = '#9c381e'; // terracotta

        const isCurrent = selectedSite?.id === site.id;

        const iconHtml = `
          <div style="
            background-color: ${markerColor};
            width: ${isCurrent ? '26px' : '20px'};
            height: ${isCurrent ? '26px' : '20px'};
            border-radius: 50%;
            border: 2px solid ${isCurrent ? '#ffffff' : '#110f0d'};
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ffffff;"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'heritage-map-marker',
          iconSize: [isCurrent ? 26 : 20, isCurrent ? 26 : 20],
          iconAnchor: [isCurrent ? 13 : 10, isCurrent ? 13 : 10],
        });

        const marker = L.marker([site.latitude, site.longitude], { icon: customIcon });

        marker.on('click', () => {
          setSelectedSite(site);
          map.setView([site.latitude, site.longitude], Math.max(map.getZoom(), 8), {
            animate: true,
          });
        });

        marker.bindTooltip(
          `<strong>${site.title}</strong><br/><span style="font-size: 10px;">${site.region} · ${site.heritage_type}</span>`,
          { direction: 'top', offset: [0, -10] }
        );

        markersGroup.addLayer(marker);
      });

      // Connect surveyed sites with an expedition route line
      if (showRoutes && routePoints.length > 1) {
        const polyline = L.polyline(routePoints, {
          color: '#d4af37',
          weight: 2,
          opacity: 0.65,
          dashArray: '6, 8',
        }).addTo(map);
        routePolylineRef.current = polyline;
      }
    };

    void initMap();
  }, [sites, selectedSite, activeFilter, activeRegion, showRoutes]);

  const handleJumpTo = (coords: number[]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([coords[0], coords[1]], 9, { animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1714] text-[#eed27c] border border-[#d4af37]/40 mb-1">
            <Compass className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Geospatial Heritage Intelligence</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Expedition Heritage Map
          </h1>
          <p className="text-xs sm:text-sm text-[#9c9282] mt-0.5">
            Interactive geographical mapping of surveyed stepwells, monolithic shrines, and regional monuments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Route Trail */}
          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-colors ${
              showRoutes
                ? 'bg-[#1c1813] border-[#d4af37]/50 text-[#eed27c]'
                : 'border-[#26221d] bg-[#171512] text-[#9c9282]'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>{showRoutes ? 'Route Visible' : 'Route Hidden'}</span>
          </button>

          <button
            type="button"
            onClick={loadMapData}
            className="p-2 rounded-xl border border-[#26221d] bg-[#171512] hover:bg-[#201d19] text-[#ded6c5] transition-colors"
            title="Refresh map coordinates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Pills & Quick Jumps */}
      <div className="p-4 rounded-xl border border-[#26221d] bg-[#110f0d] shadow-md space-y-3 text-xs">
        {/* Quick Jump Landmark Coordinates */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#201d19]">
          <span className="text-[#9c9282] font-mono mr-1">Quick Coordinates:</span>
          {quickJumpSites.map((site) => (
            <button
              key={site.name}
              type="button"
              onClick={() => handleJumpTo(site.coords)}
              className="px-2.5 py-1 rounded-lg border border-[#26221d] bg-[#141210] hover:bg-[#1a1714] hover:border-[#d4af37]/40 text-[#ded6c5] text-xs transition-colors flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3 text-[#d4af37]" />
              <span>{site.name}</span>
              <span className="text-[10px] text-[#9c9282] font-mono">({site.desc})</span>
            </button>
          ))}
        </div>

        {/* Region & Typology Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#9c9282] font-mono mr-1">Region:</span>
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRegion(r.id)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                  activeRegion === r.id
                    ? 'bg-[#d4af37] text-[#080706] font-bold'
                    : 'bg-[#171512] text-[#ded6c5] border border-[#26221d] hover:bg-[#201d19]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#9c9282] font-mono">Typology:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#26221d] bg-[#171512] text-[#fcf9f2] text-xs font-medium focus:outline-hidden"
            >
              {typologies.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Screen: Leaflet Map (7 cols) + Selected Monument Card (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Interactive Map (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-[#26221d] overflow-hidden shadow-xl relative min-h-[460px] lg:min-h-full">
          <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[460px]" />

          {/* Map Legend Overlay */}
          <div className="p-3 border-t border-[#26221d] bg-[#0c0a08]/95 backdrop-blur-xs flex flex-wrap items-center gap-4 text-xs z-10">
            <div className="flex items-center gap-1.5 text-[#ded6c5]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2d5e4a]" />
              <span>Stepwell (Baoli)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ded6c5]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9c381e]" />
              <span>Monolithic Rock-Cut Temple</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ded6c5]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#d4af37]" />
              <span>Temple / Fort Complex</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#ded6c5]">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#d4af37]" />
              <span>Survey Trail</span>
            </div>
          </div>
        </div>

        {/* Selected Landmark Exhibition Card (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#26221d] bg-[#110f0d] p-5 shadow-xl space-y-4 flex flex-col justify-between overflow-y-auto">
          {selectedSite ? (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-[#201d19]">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1c1813] text-[#eed27c] font-semibold border border-[#d4af37]/35">
                    {selectedSite.heritage_type}
                  </span>
                  <span className="text-[#9c9282] font-mono text-[11px]">
                    {selectedSite.region}
                  </span>
                </div>
                <h2 className="text-lg font-serif font-bold text-[#fcf9f2] font-heritage pt-1">
                  {selectedSite.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#9c9282] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>
                    {selectedSite.latitude.toFixed(4)}° N, {selectedSite.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* Field Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-xl bg-[#171512] border border-[#26221d]">
                  <span className="text-[#9c9282] block text-[10px] uppercase font-mono">
                    Architectural Period
                  </span>
                  <span className="font-semibold text-[#fcf9f2] mt-0.5 block font-serif">
                    {selectedSite.period || 'Medieval (11th–15th C.)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#171512] border border-[#26221d]">
                  <span className="text-[#9c9282] block text-[10px] uppercase font-mono">
                    Survey Status
                  </span>
                  <span className="font-semibold text-[#3ba87e] mt-0.5 block flex items-center gap-1 font-serif">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Documented Site
                  </span>
                </div>
              </div>

              {/* Curator Field Observations */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#9c9282] tracking-wider block">
                  Archival Field Documentation
                </span>
                <p className="text-xs leading-relaxed text-[#ded6c5] bg-[#171512] p-3 rounded-xl border border-[#26221d] font-serif">
                  {selectedSite.description}
                </p>
              </div>

              {/* Fellowship Provenance */}
              <div className="p-3 rounded-xl bg-[#0d1e17] border border-[#3ba87e]/30 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#3ba87e] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>IIT Gandhinagar Explorer Fellowship</span>
                </div>
                <p className="text-[11px] text-[#9c9282] font-serif">
                  Photogrammetry, architectural elevation notes, and Devanagari epigraph recordings logged during field exploration.
                </p>
              </div>

              {/* Quick Actions */}
              {onSelectRecord && (
                <button
                  type="button"
                  onClick={() => onSelectRecord(selectedSite.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-[#080706] text-xs font-semibold shadow-md transition-all cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Full Corpus Record</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#9c9282] space-y-2 p-6">
              <Compass className="w-10 h-10 text-[#d4af37]/60" />
              <p className="text-xs">Click any marker pin on the map to inspect architectural field details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
