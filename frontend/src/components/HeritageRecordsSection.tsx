'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Eye,
  RefreshCw,
  Plus,
  Compass,
  ArrowRight,
  ShieldCheck,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#1a1714] text-[#eed27c] border border-[#d4af37]/40 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>Documented Field Corpus</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Heritage Archive &amp; Field Records Catalog
          </h1>
          <p className="text-xs sm:text-sm text-[#9c9282] mt-0.5">
            Archival records, photogrammetry notes, and historical gazetteer entries in the SQLite database
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUpload && (
            <button
              type="button"
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c158] text-[#080706] text-xs font-semibold shadow-sm transition-all focus:outline-hidden"
            >
              <Plus className="w-4 h-4" />
              <span>Contribute New Record</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadRecords}
            className="p-2 rounded-xl border border-[#26221d] bg-[#171512] hover:bg-[#201d19] text-[#ded6c5] transition-colors"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#26221d] bg-[#110f0d] shadow-md space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9c9282]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by monument name, architecture keywords, or historical period..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#26221d] bg-[#171512] text-[#fcf9f2] placeholder-[#6e6659] text-xs focus:outline-hidden focus:border-[#d4af37] transition-colors"
            />
          </div>

          {/* Region selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[#9c9282] font-mono">Region:</span>
            <select
              value={activeRegion}
              onChange={(e) => setActiveRegion(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#26221d] bg-[#171512] text-[#fcf9f2] font-medium text-xs focus:outline-hidden"
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
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#201d19]">
          <span className="text-[#9c9282] font-mono mr-1">Typology:</span>
          {typologies.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveType(t.id)}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-colors ${
                activeType === t.id
                  ? 'bg-[#d4af37] text-[#080706] font-bold'
                  : 'bg-[#171512] text-[#ded6c5] border border-[#26221d] hover:bg-[#201d19]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div className="p-12 text-center text-[#9c9282] bg-[#110f0d] rounded-2xl border border-[#26221d]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#d4af37] mb-2" />
          <p className="text-xs font-mono">Loading documented heritage records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center text-[#9c9282] bg-[#110f0d] rounded-2xl border border-[#26221d] space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-[#d4af37]/60" />
          <p className="text-xs font-serif text-[#ded6c5]">No heritage records match the current filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((record) => (
            <div
              key={record.id}
              className="p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] hover:bg-[#171512] hover:border-[#363028] shadow-md flex flex-col justify-between space-y-3 transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-[#1c1813] text-[#eed27c] font-mono text-[10px] border border-[#d4af37]/35">
                    {record.heritage_type}
                  </span>
                  <span className="text-[#9c9282] font-mono text-[11px]">
                    {record.region}
                  </span>
                </div>

                <h3 className="text-base font-serif font-bold text-[#fcf9f2] font-heritage leading-snug">
                  {record.title}
                </h3>

                <p className="text-xs text-[#ded6c5] line-clamp-3 leading-relaxed font-serif">
                  {record.description}
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#201d19] text-xs">
                <div className="flex items-center justify-between text-[#9c9282] text-[11px] font-mono">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#d4af37]" />
                    <span>{record.period || 'Medieval Era'}</span>
                  </div>
                  {record.latitude && record.longitude && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#3ba87e]" />
                      <span>{record.latitude.toFixed(2)}°, {record.longitude.toFixed(2)}°</span>
                    </div>
                  )}
                </div>

                {onInspectRecord && (
                  <button
                    type="button"
                    onClick={() => onInspectRecord(record.id)}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#171512] hover:bg-[#201d19] text-[#eed27c] hover:text-[#fcf9f2] border border-[#26221d] text-xs transition-colors"
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
