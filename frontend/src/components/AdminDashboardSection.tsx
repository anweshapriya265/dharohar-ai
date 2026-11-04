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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs">
        <div>
          <div className="inline-block text-[11px] font-mono tracking-wider uppercase text-[#814B52] font-semibold mb-0.5">
            Institutional Governance
          </div>
          <h1 className="text-xl sm:text-2xl font-heritage font-bold text-[#642F38] tracking-tight">
            Platform Administration &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#59524E] font-serif mt-0.5">
            Immutable SQLite provenance log, real-time catalog statistics, and idempotent database seeding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={seeding}
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#642F38] hover:bg-[#50252C] text-[#FFFCF5] text-xs font-serif font-medium shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Seed IITGN Landmarks'}</span>
          </button>

          <button
            onClick={loadMetrics}
            className="p-2 rounded-lg border border-[#DED3C2] bg-[#FFFCF5] hover:bg-[#F6F1E7] text-[#393331] transition-colors cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3 rounded-lg bg-[#EDF3EF] border border-[#BCD0C3] text-xs text-[#52745E] font-serif font-medium">
          {seedNotice}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#756D66]">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Total Records</span>
            <Database className="w-4 h-4 text-[#A77C54]" />
          </div>
          <div className="text-2xl font-bold font-heritage text-[#642F38]">
            {data ? data.total_records : '...'}
          </div>
          <span className="text-[11px] text-[#756D66] font-serif">Ingested corpus archives</span>
        </div>

        <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#756D66]">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-[#52745E]" />
          </div>
          <div className="text-2xl font-bold font-heritage text-[#52745E]">
            {data ? data.approved_records : '...'}
          </div>
          <span className="text-[11px] text-[#756D66] font-serif">Human curator verified</span>
        </div>

        <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#756D66]">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">In Review</span>
            <Clock className="w-4 h-4 text-[#A67C3F]" />
          </div>
          <div className="text-2xl font-bold font-heritage text-[#A67C3F]">
            {data ? data.pending_review : '...'}
          </div>
          <span className="text-[11px] text-[#756D66] font-serif">Awaiting expert review</span>
        </div>

        <div className="p-4 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-[#756D66]">
            <span className="text-[10px] font-semibold uppercase tracking-wider font-mono">Geotagged</span>
            <MapPin className="w-4 h-4 text-[#642F38]" />
          </div>
          <div className="text-2xl font-bold font-heritage text-[#642F38]">
            {data ? data.geotagged_sites : '...'}
          </div>
          <span className="text-[11px] text-[#756D66] font-serif">Rendered on Leaflet map</span>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="p-5 rounded-xl border border-[#DED3C2] bg-[#FFFCF5] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#EBE4D8] pb-3">
          <div>
            <h3 className="text-sm font-heritage font-bold text-[#642F38] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#642F38]" />
              <span>Immutable Provenance &amp; Activity Audit Log</span>
            </h3>
            <p className="text-xs text-[#756D66] font-serif mt-0.5">
              Tracks every ingestion, review action, model suggestion, and curation timestamp
            </p>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#EFE8DC] text-[#393331] border border-[#DED3C2]">
            10 Most Recent Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#DED3C2] bg-[#F6F1E7] text-[10px] font-mono text-[#756D66] uppercase tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor &amp; Role</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Entity Ref</th>
                <th className="py-2.5 px-3">Details / Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EBE4D8]">
              {data && data.recent_audit_logs && data.recent_audit_logs.length > 0 ? (
                data.recent_audit_logs.map((log) => {
                  const isApprove = log.action.includes('APPROVED');
                  const isIngest = log.action.includes('INGEST');

                  return (
                    <tr key={log.id} className="hover:bg-[#F6F1E7]/70 transition-colors">
                      <td className="py-3 px-3 font-mono text-[11px] text-[#756D66] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#756D66]" />
                          <span className="font-semibold text-[#393331] font-serif">{log.actor_name}</span>
                          <span className="text-[10px] font-mono text-[#756D66]">({log.actor_role})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isApprove
                              ? 'bg-[#EDF3EF] text-[#52745E] border border-[#BCD0C3]'
                              : isIngest
                              ? 'bg-[#FAF2F3] text-[#642F38] border border-[#642F38]/30'
                              : 'bg-[#EFE8DC] text-[#393331] border border-[#DED3C2]'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#756D66]">
                        {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                      </td>
                      <td className="py-3 px-3 text-[#393331] font-serif max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#756D66] font-serif">
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
