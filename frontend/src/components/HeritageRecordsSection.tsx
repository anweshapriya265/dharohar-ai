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
} from 'lucide-react';
import { fetchHeritageRecords, HeritageRecordItem } from '@/lib/api';

interface HeritageRecordsSectionProps {
  onInspectRecord?: (recordId: string) => void;
  onOpenUpload?: () => void;
}

export default function HeritageRecordsSection({
  onInspectRecord,
  onOpenUpload,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbeee9] text-[#9c381e] mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Digital Revitalisation Corpus</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
            Heritage Archive &amp; Field Records Catalog
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Ingested architectural monographs, colonial gazetteers, and IITGN Explorer field documentation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Contribute New Record</span>
            </button>
          )}

          <button
            onClick={loadRecords}
            className="p-2 rounded-xl border border-[#e5dfd5] hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-[#e5dfd5] bg-white shadow-2xs space-y-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Keyword search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by monument name, architecture keywords, or period..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0]/60 text-stone-900 placeholder-stone-400 text-xs focus:outline-hidden focus:ring-1 focus:ring-[#9c381e]"
            />
          </div>

          {/* Region selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-stone-400 font-medium">Region:</span>
            <select
              value={activeRegion}
              onChange={(e) => setActiveRegion(e.target.value)}
              className="px-2.5 py-2 rounded-lg border border-[#e5dfd5] bg-[#f7f5f0] text-stone-800 font-medium focus:outline-hidden"
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
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-stone-100">
          <span className="text-stone-400 font-medium mr-1">Typology:</span>
          {typologies.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeType === t.id
                  ? 'bg-[#9c381e] text-[#f7f5f0] shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Records Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-stone-500 rounded-2xl border border-[#e5dfd5] bg-white">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#9c381e] mb-2" />
          <p className="text-xs">Loading archival records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="p-12 text-center text-stone-500 rounded-2xl border border-[#e5dfd5] bg-white space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-stone-400" />
          <h3 className="text-sm font-semibold text-stone-800">No Records Found</h3>
          <p className="text-xs text-stone-500">
            No heritage records matched the selected filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((rec) => {
            const isApproved = rec.status === 'approved';
            const isPending = rec.status === 'pending_review' || rec.status === 'pending';

            return (
              <div
                key={rec.id}
                className="rounded-2xl border border-[#e5dfd5] bg-white p-5 shadow-heritage hover:border-[#9c381e]/60 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[#fbeee9] text-[#9c381e] font-semibold text-[11px] border border-[#f0d4ca]">
                      {rec.heritage_type}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold ${
                        isApproved
                          ? 'bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]'
                          : isPending
                          ? 'bg-[#fbf5eb] text-[#b67322] border border-[#f0dec3]'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3" />}
                      {isPending && <Clock className="w-3 h-3" />}
                      <span className="capitalize">{rec.status.replace('_', ' ')}</span>
                    </span>
                  </div>

                  <h3 className="text-base font-serif font-bold text-stone-900 font-heritage line-clamp-2">
                    {rec.title}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#9c381e]" />
                      {rec.region}
                    </span>
                    {rec.period && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {rec.period}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed font-serif">
                    {rec.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-400 font-mono text-[10px]">
                    Lat: {rec.latitude ? rec.latitude.toFixed(2) : 'N/A'}°
                  </span>

                  {onInspectRecord && (
                    <button
                      onClick={() => onInspectRecord(rec.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#f7f5f0] hover:bg-[#fbeee9] text-stone-700 hover:text-[#9c381e] font-semibold text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Search Evidence</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
