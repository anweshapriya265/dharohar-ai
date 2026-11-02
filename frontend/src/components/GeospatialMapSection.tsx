'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Layers,
  Compass,
  Navigation,
  ExternalLink,
  Info,
  Calendar,
  CheckCircle2,
  RefreshCw,
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
          center: [23.2156, 72.684], // Gandhinagar
          zoom: 7,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // OpenStreetMap CartoDB Positron tiles for heritage aesthetic
        L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          {
            attribution: '&copy; <a href="https://carto.com/">CARTO</a> OpenStreetMap contributors',
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

        const markerHtml = `
          <div style="
            position: relative;
            cursor: pointer;
            width: 38px;
            height: 38px;
            background: ${isSelected ? '#92400e' : isStepwell ? '#0284c7' : '#b45309'};
            border: 3px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 16px;
            transform: ${isSelected ? 'scale(1.2)' : 'scale(1.0)'};
            transition: all 0.2s ease-in-out;
          ">
            <span>${isStepwell ? '💧' : '🏛️'}</span>
          </div>
        `;

        const icon = L.divIcon({
          html: markerHtml,
          className: 'custom-heritage-pin',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
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
        // Route: IIT Gandhinagar -> Adalaj -> Modhera -> Patan (Rani ki Vav)
        const iitgnRouteCoords: [number, number][] = [
          [23.2156, 72.684], // IIT Gandhinagar Campus (Palaj)
          [23.1667, 72.5833], // Adalaj Stepwell
          [23.5835, 72.1331], // Modhera Sun Temple
          [23.8589, 72.1017], // Rani ki Vav (Patan)
        ];

        const routeLine = L.polyline(iitgnRouteCoords, {
          color: '#0284c7',
          weight: 3.5,
          dashArray: '8, 8',
          opacity: 0.85,
        }).addTo(map);

        routePolylineRef.current = routeLine;
      }
    };

    void initMap();
  }, [sites, selectedSite, activeFilter, activeRegion, showRoutes]);

  const uniqueTypes = ['all', ...Array.from(new Set(sites.map((s) => s.heritage_type)))];
  const uniqueRegions = ['all', ...Array.from(new Set(sites.map((s) => s.region)))];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <Compass className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              IIT Gandhinagar Explorer Fellowship Geospatial Archive
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Spatial revitalization of grassroots field expeditions, subterranean baolis, and architectural discoveries across India
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Heritage Type Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium focus:outline-hidden"
          >
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Typologies' : t}
              </option>
            ))}
          </select>

          {/* Region Filter */}
          <select
            value={activeRegion}
            onChange={(e) => setActiveRegion(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 font-medium focus:outline-hidden"
          >
            {uniqueRegions.map((r) => (
              <option key={r} value={r}>
                {r === 'all' ? 'All Regions' : r}
              </option>
            ))}
          </select>

          {/* Route toggle */}
          <button
            onClick={() => setShowRoutes(!showRoutes)}
            className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-colors font-medium ${
              showRoutes
                ? 'border-sky-300 bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300'
                : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-500'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            IITGN Expedition Trail
          </button>

          <button
            onClick={loadMapData}
            title="Refresh map points"
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Map + Site Inspector Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map Canvas */}
        <div className="lg:col-span-2 relative h-[520px] rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 shadow-xs">
          <div ref={mapContainerRef} className="w-full h-full z-0 bg-[#e5e3df]" />

          {/* Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 p-2.5 rounded-lg bg-white/90 dark:bg-stone-900/90 backdrop-blur-xs border border-stone-200/80 dark:border-stone-800 text-[11px] space-y-1.5 shadow-sm">
            <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-700" />
              Legend
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="w-3 h-3 rounded-full bg-sky-600 inline-block"></span>
              <span>Subterranean Stepwells (Baolis)</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="w-3 h-3 rounded-full bg-amber-700 inline-block"></span>
              <span>Rock-Cut Caves &amp; Hill Forts</span>
            </div>
            <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-sky-600 inline-block"></span>
              <span>Explorer Fellowship Route</span>
            </div>
          </div>
        </div>

        {/* Selected Landmark Inspector Card */}
        <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between space-y-4">
          {selectedSite ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                    {selectedSite.heritage_type}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" /> GPS Verified
                  </span>
                </div>
                <h3 className="text-base font-bold font-serif text-stone-900 dark:text-stone-100 mt-2">
                  {selectedSite.title}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-amber-700" />
                  {selectedSite.location_name}
                </p>
              </div>

              {/* Coordinates Pill */}
              <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-500">Coordinates:</span>
                <span className="font-mono text-stone-800 dark:text-stone-200">
                  {selectedSite.latitude.toFixed(4)}° N, {selectedSite.longitude.toFixed(4)}° E
                </span>
              </div>

              {/* Historical Period */}
              {selectedSite.period && (
                <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center gap-2 text-xs">
                  <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                  <div>
                    <div className="text-[10px] text-stone-400 uppercase tracking-wide">Historical Era</div>
                    <div className="font-medium text-stone-800 dark:text-stone-200">{selectedSite.period}</div>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Field Documentation
                </h4>
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-5">
                  {selectedSite.description}
                </p>
              </div>

              {/* Tags */}
              {selectedSite.tags && (
                <div className="flex flex-wrap gap-1">
                  {selectedSite.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
              <MapPin className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Click on any map marker to view field records and architectural observations</p>
            </div>
          )}

          {selectedSite && onSelectRecord && (
            <button
              onClick={() => onSelectRecord(selectedSite.id)}
              className="w-full py-2 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <span>Inspect Full Archaeological Dossier</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

