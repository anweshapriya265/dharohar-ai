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

      // Ensure leaflet styles are injected
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Center on Western India / Gujarat (IIT Gandhinagar area)
        const map = L.map(mapContainerRef.current, {
          center: [22.5, 74.0], // Centered across western Indian heritage corridor
          zoom: 6,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // 100% Free OpenStreetMap raster tiles (Zero API key required, no watermarks)
        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }
        ).addTo(map);

        const markersGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = markersGroup;
        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;

      if (!map || !markersGroup) return;

      markersGroup.clearLayers();

      // Filter sites
      const filtered = sites.filter((site) => {
        const typeMatch = activeFilter === 'all' || site.heritage_type === activeFilter;
        const regionMatch = activeRegion === 'all' || site.region === activeRegion;
        return typeMatch && regionMatch;
      });

      // Pin icon generator
      filtered.forEach((site) => {
        const isSelected = selectedSite?.id === site.id;
        const isStepwell = site.heritage_type.toLowerCase().includes('stepwell');
        const isCave = site.heritage_type.toLowerCase().includes('rock-cut');
        const isFort = site.heritage_type.toLowerCase().includes('fort');

        const pinColor = isSelected ? '#832e17' : isStepwell ? '#9c381e' : isCave ? '#59443b' : isFort ? '#785b34' : '#b67322';
        const symbol = isStepwell ? '💧' : isCave ? '🗿' : isFort ? '🏰' : '🏛️';

        const markerHtml = `
          <div style="
            position: relative;
            cursor: pointer;
            width: ${isSelected ? '42px' : '36px'};
            height: ${isSelected ? '42px' : '36px'};
            background: ${pinColor};
            border: 2.5px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 10px rgba(28,25,23,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: ${isSelected ? '18px' : '15px'};
            transform: ${isSelected ? 'scale(1.15)' : 'scale(1.0)'};
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          ">
            <span>${symbol}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-heritage-pin',
          iconSize: [isSelected ? 42 : 36, isSelected ? 42 : 36],
          iconAnchor: [isSelected ? 21 : 18, isSelected ? 21 : 18],
        });

        const marker = L.marker([site.latitude, site.longitude], { icon }).addTo(markersGroup);

        marker.on('click', () => {
          setSelectedSite(site);
          map.panTo([site.latitude, site.longitude], { animate: true, duration: 0.8 });
        });
      });

      // IIT Gandhinagar Explorer Fellowship Route
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }

      if (showRoutes) {
        // Route: IITGN Gandhinagar -> Adalaj -> Modhera -> Patan -> Kumbhalgarh -> Ellora -> Hampi
        const iitgnRouteCoords: [number, number][] = [
          [23.2156, 72.684], // IIT Gandhinagar Campus (Palaj)
          [23.1667, 72.5833], // Adalaj Stepwell
          [23.5835, 72.1331], // Modhera Sun Temple
          [23.8589, 72.1017], // Rani ki Vav (Patan)
          [25.1475, 73.5878], // Kumbhalgarh Fort (Rajasthan)
          [20.0268, 75.1793], // Ellora Kailasa Temple (Maharashtra)
          [15.335, 76.46], // Hampi Vijayanagara (Karnataka)
        ];

        const polyline = L.polyline(iitgnRouteCoords, {
          color: '#9c381e',
          weight: 3.5,
          opacity: 0.85,
          dashArray: '8, 8',
          lineJoin: 'round',
        }).addTo(map);

        routePolylineRef.current = polyline;
      }
    };

    void initMap();
  }, [sites, activeFilter, activeRegion, selectedSite, showRoutes]);

  const handleQuickJump = (coords: number[]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([coords[0], coords[1]], 10, { animate: true });
    }
    const matched = sites.find(
      (s) => Math.abs(s.latitude - coords[0]) < 0.1 && Math.abs(s.longitude - coords[1]) < 0.1
    );
    if (matched) {
      setSelectedSite(matched);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbeee9] text-[#9c381e] mb-1">
            <Route className="w-3.5 h-3.5" />
            <span>Pathway 3: Geospatial Cartography</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
            IIT Gandhinagar Explorer Fellowship Heritage Trail
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Dynamic spatial mapping of field expedition routes, subterranean stepwells, and epigraphical landmarks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showRoutes
                ? 'border-[#f0d4ca] bg-[#fbeee9] text-[#9c381e]'
                : 'border-stone-200 bg-stone-100 text-stone-600'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>{showRoutes ? 'Expedition Trail Active' : 'Trail Hidden'}</span>
          </button>

          <button
            onClick={loadMapData}
            className="p-2 rounded-lg border border-[#e5dfd5] hover:bg-stone-50 text-stone-600 transition-colors"
            title="Refresh map markers"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Quick Jump Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-stone-500 font-medium whitespace-nowrap pl-1">Jump to Landmark:</span>
        {quickJumpSites.map((item) => (
          <button
            key={item.name}
            onClick={() => handleQuickJump(item.coords)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#e5dfd5] bg-white hover:bg-[#fbeee9] hover:border-[#f0d4ca] text-stone-700 hover:text-[#9c381e] transition-colors whitespace-nowrap font-medium shadow-2xs"
          >
            <MapPin className="w-3.5 h-3.5 text-[#9c381e]" />
            <span>{item.name}</span>
            <span className="text-[10px] text-stone-400">({item.desc})</span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-[#e5dfd5] bg-white shadow-2xs text-xs">
        {/* Typology Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-stone-400 font-medium mr-1">Typology:</span>
          {typologies.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveFilter(t.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeFilter === t.id
                  ? 'bg-[#9c381e] text-[#f7f5f0] shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Region Select */}
        <div className="flex items-center gap-1.5">
          <span className="text-stone-400 font-medium">Region:</span>
          <select
            value={activeRegion}
            onChange={(e) => setActiveRegion(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0] text-stone-800 font-medium focus:outline-hidden"
          >
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Map + Side Details Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-2 relative rounded-2xl border border-[#e5dfd5] overflow-hidden bg-[#e8e4dc] shadow-heritage">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* Map Legend Overlay */}
          <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-sm border border-[#e5dfd5] rounded-xl p-3 shadow-heritage text-[11px] space-y-1.5 pointer-events-auto">
            <div className="font-semibold text-stone-900 border-b border-stone-100 pb-1">
              Explorer Expedition Legend
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <span className="w-3 h-3 rounded-full bg-[#9c381e]" />
              <span>Stepwell / Baoli (Water Table)</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <span className="w-3 h-3 rounded-full bg-[#59443b]" />
              <span>Monolithic Rock-Cut Temple</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <span className="w-3 h-3 rounded-full bg-[#b67322]" />
              <span>Temple / Sacred Complex</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#9c381e]" />
              <span>IITGN Expedition Trail</span>
            </div>
          </div>
        </div>

        {/* Selected Landmark Exhibition Card */}
        <div className="h-full overflow-y-auto rounded-2xl border border-[#e5dfd5] bg-white p-5 shadow-heritage space-y-4">
          {selectedSite ? (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-stone-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#fbeee9] text-[#9c381e] font-semibold border border-[#f0d4ca]">
                    {selectedSite.heritage_type}
                  </span>
                  <span className="text-stone-400 font-mono text-[11px]">
                    {selectedSite.region}
                  </span>
                </div>
                <h3 className="text-lg font-serif font-bold text-stone-900 font-heritage pt-1">
                  {selectedSite.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#9c381e]" />
                  <span>
                    {selectedSite.latitude.toFixed(4)}° N, {selectedSite.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* Field Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                    Architectural Period
                  </span>
                  <span className="font-semibold text-stone-800 mt-0.5 block">
                    {selectedSite.period || 'Medieval (11th-15th C.)'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#f7f5f0] border border-[#e5dfd5]">
                  <span className="text-stone-400 block text-[10px] uppercase font-semibold">
                    Expedition Status
                  </span>
                  <span className="font-semibold text-[#2d5e4a] mt-0.5 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified by IITGN
                  </span>
                </div>
              </div>

              {/* Curator Field Observations */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Archival Field Documentation
                </h4>
                <p className="text-xs leading-relaxed text-stone-700 bg-[#f7f5f0]/60 p-3 rounded-xl border border-[#e5dfd5] font-serif">
                  {selectedSite.description}
                </p>
              </div>

              {/* Fellowship Provenance */}
              <div className="p-3 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#2d5e4a] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>IIT Gandhinagar Explorer Fellowship</span>
                </div>
                <p className="text-[11px] text-[#2d5e4a]/90">
                  Photogrammetry, architectural elevation notes, and Devanagari epigraph recordings logged during field exploration.
                </p>
              </div>

              {/* Quick Actions */}
              {onSelectRecord && (
                <button
                  type="button"
                  onClick={() => onSelectRecord(selectedSite.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Full Corpus Record</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-400 space-y-2 p-6">
              <Compass className="w-10 h-10 stroke-1" />
              <p className="text-xs">Click any marker pin on the map to inspect architectural field details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
