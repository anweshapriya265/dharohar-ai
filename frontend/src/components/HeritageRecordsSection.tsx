'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  MapPin,
  Calendar,
  Search,
  RefreshCw,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { fetchHeritageRecords, HeritageRecordItem } from '@/lib/api';

interface HeritageRecordsSectionProps {
  onInspectRecord?: (recordId: string) => void;
  onOpenUpload?: () => void;
  currentRole?: string;
}

export default function HeritageRecordsSection({
  onInspectRecord,
  onOpenUpload,
  currentRole = 'archivist',
}: HeritageRecordsSectionProps) {
  const [records, setRecords] = useState<HeritageRecordItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeType, setActiveType] = useState<string>('all');
  const [activeRegion, setActiveRegion] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const typologies = [
    { id: 'all', label: 'All Typologies' },
    { id: 'Stepwell / Baoli', label: 'Stepwells (Baolis)' },
    { id: 'Temple', label: 'Temples' },
    { id: 'Monolithic Rock-Cut Temple', label: 'Monolithic Rock-Cut' },
    { id: 'Fortified Medieval City', label: 'Medieval Forts & Cities' },
  ];

  const regions = [
    { id: 'all', label: 'All Regions' },
    { id: 'Gujarat', label: 'Gujarat' },
    { id: 'Maharashtra', label: 'Maharashtra' },
    { id: 'Karnataka', label: 'Karnataka' },
    { id: 'Rajasthan', label: 'Rajasthan' },
  ];

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await fetchHeritageRecords(activeType, activeRegion, 'all', searchTerm);
      setRecords(res.records || []);
    } catch (err) {
      console.error('Failed to load heritage records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchHeritageRecords(activeType, activeRegion, 'all', searchTerm)
      .then((res) => {
        if (isMounted) {
          setRecords(res.records || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load heritage records:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeType, activeRegion, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Documented Field Corpus
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Heritage Archive &amp; Field Records Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Archival records, photogrammetry notes, and historical gazetteer entries in the SQLite database
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Contribute Record</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadRecords}
            className="p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-[#393331] transition-colors cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#756D66]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by monument name, architecture keywords, or historical period..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] placeholder:text-[#9E958D] text-xs font-serif focus:outline-none focus:border-[#642F38] transition-colors"
            />
          </div>

          {/* Region selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#756D66] font-mono">Region:</span>
            <select
              value={activeRegion}
              onChange={(e) => setActiveRegion(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] text-[#393331] font-serif text-xs focus:outline-none cursor-pointer"
            >
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Typology Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#EBE4D8]">
          <span className="text-[#756D66] font-mono mr-1">Typology:</span>
          {typologies.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id)}
              className={`px-2.5 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer ${
                activeType === t.id
                  ? 'bg-[#642F38] text-[#FFFCF5] font-semibold shadow-xs'
                  : 'bg-[#EFE8DC] text-[#393331] border border-[#DED3C2] hover:bg-[#E8E0D2]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#756D66] bg-[#FFFCF5] rounded-xl border border-[#DED3C2]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#642F38] mb-2" />
          <p className="text-xs font-serif">Loading documented heritage records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center text-[#756D66] bg-[#FFFCF5] rounded-xl border border-[#DED3C2] space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-[#A77C54]" />
          <p className="text-xs font-serif text-[#393331]">No heritage records match the current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] hover:border-[#642F38]/50 shadow-xs flex flex-col justify-between space-y-3 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#FAF2F3] text-[#642F38] font-mono text-[10px] border border-[#642F38]/30">
                    {record.heritage_type}
                  </span>
                  <span className="text-[#756D66] font-mono text-[11px]">
                    {record.region}
                  </span>
                </div>

                <h3 className="text-base font-heritage font-bold text-[#393331] leading-snug">
                  {record.title}
                </h3>

                <p className="text-xs text-[#59524E] line-clamp-3 leading-relaxed font-serif">
                  {record.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#EBE4D8] text-xs">
                <div className="flex items-center justify-between text-[#756D66] text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#A77C54]" />
                    <span>{record.period || 'Medieval Era'}</span>
                  </div>
                  {record.latitude && record.longitude && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#52745E]" />
                      <span>{record.latitude.toFixed(2)}°, {record.longitude.toFixed(2)}°</span>
                    </div>
                  )}
                </div>

                {onInspectRecord && (
                  <button
                    type="button"
                    onClick={() => onInspectRecord(record.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-md bg-[#EFE8DC] hover:bg-[#642F38] text-[#393331] hover:text-[#FFFCF5] border border-[#DED3C2] text-xs transition-colors font-serif cursor-pointer"
                  >
                    <span>Search Supporting Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
