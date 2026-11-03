'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Database,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  Sparkles,
  UserCheck,
  Activity,
} from 'lucide-react';
import { fetchAdminDashboard, seedHeritageRecords, AdminDashboardResponse } from '@/lib/api';

export default function AdminDashboardSection() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedNotice, setSeedNotice] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetchAdminDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetchAdminDashboard()
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load admin metrics:', err);
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const res = await seedHeritageRecords();
      setSeedNotice(
        res.status === 'already_seeded'
          ? 'Corpus is already populated with authentic sites.'
          : 'Successfully seeded IITGN Explorer Fellowship landmarks!'
      );
      await loadMetrics();
    } catch (err) {
      console.error('Seeding error:', err);
      setSeedNotice('Failed to seed records.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbeee9] text-[#9c381e] mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-900 font-heritage tracking-tight">
            Platform Administration &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            Immutable SQLite provenance log, real-time catalog statistics, and idempotent database seeding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={seeding}
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9c381e] hover:bg-[#832e17] text-[#f7f5f0] text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Seed IITGN Landmarks'}</span>
          </button>

          <button
            onClick={loadMetrics}
            className="p-2 rounded-xl border border-[#e5dfd5] hover:bg-stone-50 text-stone-600 transition-colors shadow-2xs"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3 rounded-xl bg-[#edf5f1] border border-[#c3dcd0] text-xs text-[#2d5e4a] font-medium">
          {seedNotice}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Records</span>
            <Database className="w-4 h-4 text-[#9c381e]" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-900 font-heritage">
            {data ? data.total_records : '...'}
          </div>
          <span className="text-[11px] text-stone-500">Ingested corpus archives</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-[#2d5e4a]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#2d5e4a] font-heritage">
            {data ? data.approved_records : '...'}
          </div>
          <span className="text-[11px] text-stone-500">Human curator verified</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">In Review</span>
            <Clock className="w-4 h-4 text-[#b67322]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#b67322] font-heritage">
            {data ? data.pending_review : '...'}
          </div>
          <span className="text-[11px] text-stone-500">Awaiting expert review</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-1">
          <div className="flex items-center justify-between text-stone-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Geotagged</span>
            <MapPin className="w-4 h-4 text-[#9c381e]" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-900 font-heritage">
            {data ? data.geotagged_sites : '...'}
          </div>
          <span className="text-[11px] text-stone-500">Rendered on Leaflet map</span>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="p-5 rounded-2xl border border-[#e5dfd5] bg-white shadow-heritage space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <h3 className="text-sm font-serif font-bold text-stone-900 font-heritage flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#9c381e]" />
              <span>Immutable Provenance &amp; Activity Audit Log</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Tracks every ingestion, review action, model suggestion, and curation timestamp
            </p>
          </div>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-stone-100 text-stone-600">
            10 Most Recent Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-stone-100 text-[10px] font-mono text-stone-400 uppercase tracking-wider">
                <th className="py-2 pr-3">Timestamp</th>
                <th className="py-2 px-3">Actor &amp; Role</th>
                <th className="py-2 px-3">Action Type</th>
                <th className="py-2 px-3">Entity Ref</th>
                <th className="py-2 pl-3">Details / Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {data && data.recent_audit_logs && data.recent_audit_logs.length > 0 ? (
                data.recent_audit_logs.map((log) => {
                  const isApprove = log.action.includes('APPROVED');
                  const isIngest = log.action.includes('INGEST');

                  return (
                    <tr key={log.id} className="hover:bg-[#f7f5f0]/50 transition-colors">
                      <td className="py-2.5 pr-3 font-mono text-[11px] text-stone-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                          <span className="font-semibold text-stone-800">{log.actor_name}</span>
                          <span className="text-[10px] text-stone-400">({log.actor_role})</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isApprove
                              ? 'bg-[#edf5f1] text-[#2d5e4a] border border-[#c3dcd0]'
                              : isIngest
                              ? 'bg-[#fbeee9] text-[#9c381e] border border-[#f0d4ca]'
                              : 'bg-stone-100 text-stone-600'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500">
                        {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-stone-700 font-serif max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">
                    No recent audit events logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
