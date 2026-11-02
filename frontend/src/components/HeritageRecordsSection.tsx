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

  const categories = [
    { id: 'all', label: 'All Typologies' },
    { id: 'Stepwell / Baoli', label: '💧 Stepwells (Baolis)' },
    { id: 'Temple', label: '🛕 Temples & Kunds' },
    { id: 'Fort', label: '🏰 Hill Forts' },
    { id: 'Monolithic Rock-Cut Temple', label: '🗿 Rock-Cut Caves' },
  ];

  const regions = ['all', 'Gujarat', 'Maharashtra', 'Karnataka', 'Rajasthan'];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              Heritage Archive Corpus &amp; Field Records
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Section 7.4 SRS: Peer-reviewed architectural gazetteers, subterranean stepwells, and epigraphical reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadRecords}
            title="Refresh records"
            className="p-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="text-xs px-3 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-medium flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <span>+ Ingest New Field Asset</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search records by title, architectural features, inscriptions, or keywords..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-hidden focus:ring-1 focus:ring-amber-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100 dark:border-stone-800 text-xs">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveType(c.id)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  activeType === c.id
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Region selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-stone-400">Region:</span>
            <select
              value={activeRegion}
              onChange={(e) => setActiveRegion(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-medium focus:outline-hidden"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? 'All India' : r}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Records Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-stone-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
          <span className="text-xs">Loading heritage records...</span>
        </div>
      ) : records.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => {
            const isApproved = r.status === 'approved';

            return (
              <div
                key={r.id}
                className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col justify-between space-y-3 hover:border-amber-600/50 dark:hover:border-amber-500/50 transition-all shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
                      {r.heritage_type}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${
                        isApproved
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Approved
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" /> Pending Review
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold font-serif text-stone-900 dark:text-stone-100 line-clamp-2">
                    {r.title}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                    {r.description}
                  </p>

                  <div className="space-y-1.5 pt-2 border-t border-stone-100 dark:border-stone-800 text-[11px] text-stone-500 dark:text-stone-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span className="truncate">{r.location_name || `${r.region}, India`}</span>
                    </div>

                    {r.period && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="truncate font-medium text-stone-700 dark:text-stone-300">
                          {r.period}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[10px] text-stone-400 font-mono">
                    {r.latitude ? `${r.latitude.toFixed(2)}°N, ${r.longitude?.toFixed(2)}°E` : 'No GPS'}
                  </span>

                  {onInspectRecord && (
                    <button
                      onClick={() => onInspectRecord(r.id)}
                      className="text-xs px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-medium flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center text-stone-400 border border-dashed border-stone-200 dark:border-stone-800 rounded-xl">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No records matched your active filters or search term.</p>
        </div>
      )}
    </div>
  );
}

