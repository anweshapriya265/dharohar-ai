'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapPin,
  Compass,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Route,
  Search,
  BookOpen,
} from 'lucide-react';
import { fetchMapRecords, MapRecordItem } from '@/lib/api';

import type { Map as LeafletMap, LayerGroup, Polyline, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  const [baseLayer, setBaseLayer] = useState<'osm' | 'topo'>('osm');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersGroupRef = useRef<LayerGroup | null>(null);
  const routePolylineRef = useRef<Polyline | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);

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

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [20.5937, 74.9629],
          zoom: 5.5,
          zoomControl: false,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // OpenStreetMap Canonical Subdomains Tile Layer (Free, no API key required)
        const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(map);
        tileLayerRef.current = tile;

        markersGroupRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        setTimeout(() => {
          map.invalidateSize();
        }, 150);
      }

      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;
      if (!map || !markersGroup) return;

      // Update tile layer if baseLayer switched
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
        const tileUrl =
          baseLayer === 'topo'
            ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        const tileAttribution =
          baseLayer === 'topo'
            ? 'Tiles &copy; Esri &mdash; Sources: GEBCO, USGS, NOAA, National Geographic'
            : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

        const newTile = L.tileLayer(tileUrl, {
          attribution: tileAttribution,
          maxZoom: baseLayer === 'topo' ? 18 : 19,
          subdomains: ['a', 'b', 'c'],
        }).addTo(map);
        tileLayerRef.current = newTile;
      }

      markersGroup.clearLayers();
      if (routePolylineRef.current) {
        map.removeLayer(routePolylineRef.current);
      }

      const filtered = sites.filter((site) => {
        const matchesType = activeFilter === 'all' || site.heritage_type === activeFilter;
        const matchesRegion = activeRegion === 'all' || site.region === activeRegion;
        return matchesType && matchesRegion;
      });

      const routePoints: [number, number][] = [];

      filtered.forEach((site) => {
        routePoints.push([site.latitude, site.longitude]);

        // Elegant branding marker colors
        let markerColor = '#A77C54'; // bronze
        if (site.heritage_type.includes('Stepwell')) markerColor = '#52745E'; // forest green
        if (site.heritage_type.includes('Monolithic')) markerColor = '#642F38'; // burgundy

        const isCurrent = selectedSite?.id === site.id;

        const iconHtml = `
          <div style="
            background-color: ${markerColor};
            width: ${isCurrent ? '24px' : '18px'};
            height: ${isCurrent ? '24px' : '18px'};
            border-radius: 50%;
            border: 2px solid ${isCurrent ? '#642F38' : '#FFFCF5'};
            box-shadow: 0 2px 6px rgba(57,51,49,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.2s;
          ">
            <div style="width: 5px; height: 5px; border-radius: 50%; background-color: #FFFCF5;"></div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: 'heritage-map-marker',
          iconSize: [isCurrent ? 24 : 18, isCurrent ? 24 : 18],
          iconAnchor: [isCurrent ? 12 : 9, isCurrent ? 12 : 9],
        });

        const marker = L.marker([site.latitude, site.longitude], { icon: customIcon });

        marker.on('click', () => {
          setSelectedSite(site);
          map.setView([site.latitude, site.longitude], Math.max(map.getZoom(), 8), {
            animate: true,
          });
        });

        marker.bindTooltip(
          `<strong>${site.title}</strong><br/><span style="font-size: 10px; color: #756D66;">${site.region} · ${site.heritage_type}</span>`,
          { direction: 'top', offset: [0, -10] }
        );

        markersGroup.addLayer(marker);
      });

      // Connect surveyed sites with an expedition route trail
      if (showRoutes && routePoints.length > 1) {
        const polyline = L.polyline(routePoints, {
          color: '#A77C54',
          weight: 2,
          opacity: 0.7,
          dashArray: '5, 8',
        }).addTo(map);
        routePolylineRef.current = polyline;
      }
    };

    void initMap();
  }, [sites, selectedSite, activeFilter, activeRegion, showRoutes, baseLayer]);

  const handleJumpTo = (coords: number[]) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([coords[0], coords[1]], 9, { animate: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Geospatial Cartography
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Expedition Heritage Map
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Interactive geographical mapping of surveyed stepwells, monolithic shrines, and regional monuments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Base Layer Switcher (OSM Streets vs Topographic Relief) */}
          <button
            type="button"
            onClick={() => setBaseLayer(baseLayer === 'osm' ? 'topo' : 'osm')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-xs font-mono text-[#393331] transition-colors cursor-pointer"
            title="Toggle between OpenStreetMap Streets and Esri Topographic Relief"
          >
            <Compass className="w-3.5 h-3.5 text-[#A77C54]" />
            <span>{baseLayer === 'osm' ? 'OSM Streets' : 'Topo Relief'}</span>
          </button>

          {/* Toggle Route Trail */}
          <button
            type="button"
            onClick={() => setShowRoutes(!showRoutes)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors cursor-pointer ${
              showRoutes
                ? 'bg-[#EFE8DC] border-[#DED3C2] text-[#642F38] font-semibold'
                : 'border-[#DED3C2] bg-[#FFFCF5] text-[#756D66]'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>{showRoutes ? 'Route Visible' : 'Route Hidden'}</span>
          </button>

          <button
            type="button"
            onClick={loadMapData}
            className="p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-[#393331] transition-colors cursor-pointer"
            title="Refresh map coordinates"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar & Quick Jumps */}
      <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-3 text-xs">
        {/* Quick Jump Landmark Coordinates */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#EBE4D8]">
          <span className="text-[#756D66] font-mono mr-1">Quick Coordinates:</span>
          {quickJumpSites.map((site) => (
            <button
              key={site.name}
              type="button"
              onClick={() => handleJumpTo(site.coords)}
              className="px-2.5 py-1 rounded-md border border-[#DED3C2] bg-[#F6F1E7] hover:bg-[#EFE8DC] text-[#393331] text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-serif"
            >
              <MapPin className="w-3 h-3 text-[#A77C54]" />
              <span>{site.name}</span>
              <span className="text-[10px] text-[#756D66] font-mono">({site.desc})</span>
            </button>
          ))}
        </div>

        {/* Region & Typology Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[#756D66] font-mono mr-1">Region:</span>
            {regions.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRegion(r.id)}
                className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                  activeRegion === r.id
                    ? 'bg-[#642F38] text-[#FFFCF5] font-semibold shadow-xs'
                    : 'bg-[#EFE8DC] text-[#393331] border border-[#DED3C2] hover:bg-[#E8E0D2]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#756D66] font-mono">Typology:</span>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-2.5 py-1 rounded-md border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] text-xs font-serif focus:outline-none cursor-pointer"
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
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-[#DED3C2] bg-[#FFFCF5] overflow-hidden shadow-xs relative min-h-[460px] lg:min-h-full">
          <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[460px]" />

          {/* Map Legend Overlay */}
          <div className="p-3 border-t border-[#DED3C2] bg-[#FFFCF5] flex flex-wrap items-center gap-4 text-xs z-10 font-serif">
            <div className="flex items-center gap-1.5 text-[#393331]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#52745E]" />
              <span>Stepwell (Baoli)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#393331]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#642F38]" />
              <span>Monolithic Rock-Cut Temple</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#393331]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A77C54]" />
              <span>Temple / Fort Complex</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#393331]">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#A77C54]" />
              <span>Survey Trail</span>
            </div>
          </div>
        </div>

        {/* Selected Landmark Exhibition Card (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] p-5 shadow-xs space-y-4 flex flex-col justify-between overflow-y-auto">
          {selectedSite ? (
            <div className="space-y-4">
              <div className="space-y-1 pb-3 border-b border-[#EBE4D8]">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#FAF2F3] text-[#642F38] font-semibold border border-[#642F38]/30 font-serif">
                    {selectedSite.heritage_type}
                  </span>
                  <span className="text-[#756D66] font-mono text-[11px]">
                    {selectedSite.region}
                  </span>
                </div>
                <h2 className="text-lg font-heritage font-bold text-[#642F38] pt-1">
                  {selectedSite.title}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-[#756D66] font-mono">
                  <MapPin className="w-3.5 h-3.5 text-[#A77C54]" />
                  <span>
                    {selectedSite.latitude.toFixed(4)}° N, {selectedSite.longitude.toFixed(4)}° E
                  </span>
                </div>
              </div>

              {/* Field Metadata Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
                  <span className="text-[#756D66] block text-[10px] uppercase font-mono">
                    Architectural Period
                  </span>
                  <span className="font-semibold text-[#393331] mt-0.5 block font-serif">
                    {selectedSite.period || 'Medieval (11th–15th C.)'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#F6F1E7] border border-[#DED3C2]">
                  <span className="text-[#756D66] block text-[10px] uppercase font-mono">
                    Survey Status
                  </span>
                  <span className="font-semibold text-[#52745E] mt-0.5 block flex items-center gap-1 font-serif">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Documented Site
                  </span>
                </div>
              </div>

              {/* Curator Field Observations */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-[#756D66] tracking-wider block font-semibold">
                  Archival Field Documentation
                </span>
                <p className="text-xs leading-relaxed text-[#393331] bg-[#F6F1E7] p-3 rounded-lg border border-[#DED3C2] font-serif">
                  {selectedSite.description}
                </p>
              </div>

              {/* Fellowship Provenance */}
              <div className="p-3 rounded-lg bg-[#EDF3EF] border border-[#BCD0C3] space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-[#52745E] font-semibold font-serif">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>IIT Gandhinagar Explorer Fellowship</span>
                </div>
                <p className="text-[11px] text-[#59524E] font-serif">
                  Photogrammetry, architectural elevation notes, and Devanagari epigraph recordings logged during field exploration.
                </p>
              </div>

              {/* Quick Actions */}
              {onSelectRecord && (
                <button
                  type="button"
                  onClick={() => onSelectRecord(selectedSite.id)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Inspect Full Corpus Record</span>
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#756D66] space-y-2 p-6 font-serif">
              <Compass className="w-8 h-8 text-[#A77C54]" />
              <p className="text-xs">Select any marker pin on the map to inspect architectural field records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
