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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-xl">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#241712] text-[#e06d53] border border-[#e06d53]/30 mb-1">
            <Activity className="w-3.5 h-3.5" />
            <span>Institutional Governance</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf9f2] font-heritage tracking-tight">
            Platform Administration &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-[#9c9282] mt-0.5">
            Immutable SQLite provenance log, real-time catalog statistics, and idempotent database seeding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={seeding}
            onClick={handleSeed}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e06d53] hover:bg-[#c9593f] text-[#080706] text-xs font-serif font-semibold shadow-md transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{seeding ? 'Seeding...' : 'Seed IITGN Landmarks'}</span>
          </button>

          <button
            onClick={loadMetrics}
            className="p-2 rounded-xl border border-[#26221d] bg-[#161411] hover:bg-[#201c18] text-[#9c9282] hover:text-[#fcf9f2] transition-colors shadow-sm cursor-pointer"
            title="Refresh metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3 rounded-xl bg-[#0d1e17] border border-[#3ba87e]/40 text-xs text-[#3ba87e] font-serif font-medium">
          {seedNotice}
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#8e8577]">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Total Records</span>
            <Database className="w-4 h-4 text-[#e06d53]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#fcf9f2] font-heritage">
            {data ? data.total_records : '...'}
          </div>
          <span className="text-[11px] text-[#8e8577]">Ingested corpus archives</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#8e8577]">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-[#3ba87e]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#3ba87e] font-heritage">
            {data ? data.approved_records : '...'}
          </div>
          <span className="text-[11px] text-[#8e8577]">Human curator verified</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#8e8577]">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">In Review</span>
            <Clock className="w-4 h-4 text-[#eed27c]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#eed27c] font-heritage">
            {data ? data.pending_review : '...'}
          </div>
          <span className="text-[11px] text-[#8e8577]">Awaiting expert review</span>
        </div>

        <div className="p-4 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-lg space-y-1">
          <div className="flex items-center justify-between text-[#8e8577]">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono">Geotagged</span>
            <MapPin className="w-4 h-4 text-[#e06d53]" />
          </div>
          <div className="text-2xl font-bold font-serif text-[#fcf9f2] font-heritage">
            {data ? data.geotagged_sites : '...'}
          </div>
          <span className="text-[11px] text-[#8e8577]">Rendered on Leaflet map</span>
        </div>
      </div>

      {/* Immutable Audit Log Table */}
      <div className="p-5 rounded-2xl border border-[#26221d] bg-[#110f0d] shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-[#26221d] pb-3">
          <div>
            <h3 className="text-sm font-serif font-bold text-[#fcf9f2] font-heritage flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#e06d53]" />
              <span>Immutable Provenance &amp; Activity Audit Log</span>
            </h3>
            <p className="text-xs text-[#8e8577] mt-0.5">
              Tracks every ingestion, review action, model suggestion, and curation timestamp
            </p>
          </div>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-[#161411] text-[#ded6c5] border border-[#26221d]">
            10 Most Recent Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#26221d] text-[10px] font-mono text-[#8e8577] uppercase tracking-wider">
                <th className="py-2.5 pr-3">Timestamp</th>
                <th className="py-2.5 px-3">Actor &amp; Role</th>
                <th className="py-2.5 px-3">Action Type</th>
                <th className="py-2.5 px-3">Entity Ref</th>
                <th className="py-2.5 pl-3">Details / Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26221d]">
              {data && data.recent_audit_logs && data.recent_audit_logs.length > 0 ? (
                data.recent_audit_logs.map((log) => {
                  const isApprove = log.action.includes('APPROVED');
                  const isIngest = log.action.includes('INGEST');

                  return (
                    <tr key={log.id} className="hover:bg-[#181512]/60 transition-colors">
                      <td className="py-3 pr-3 font-mono text-[11px] text-[#8e8577] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#8e8577]" />
                          <span className="font-semibold text-[#fcf9f2] font-serif">{log.actor_name}</span>
                          <span className="text-[10px] font-mono text-[#8e8577]">({log.actor_role})</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            isApprove
                              ? 'bg-[#0d1e17] text-[#3ba87e] border border-[#3ba87e]/40'
                              : isIngest
                              ? 'bg-[#241712] text-[#e06d53] border border-[#e06d53]/40'
                              : 'bg-[#181512] text-[#ded6c5] border border-[#26221d]'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#8e8577]">
                        {log.entity_id ? log.entity_id.slice(0, 12) + '...' : '—'}
                      </td>
                      <td className="py-3 pl-3 text-[#ded6c5] font-serif max-w-xs truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#8e8577]">
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
