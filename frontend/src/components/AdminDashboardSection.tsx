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
      setSeedNotice(res.status === 'already_seeded' ? 'Corpus is already populated with authentic sites.' : 'Successfully seeded IITGN Explorer Fellowship landmarks!');
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
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold font-serif text-stone-900 dark:text-stone-100">
              Platform Administration &amp; Audit Trail
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Section 7.8 SRS: Verification queue metrics, provenance logs, and system audit trail
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={seeding}
            onClick={handleSeed}
            className="text-xs px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            Seed IITGN Corpus
          </button>

          <button
            onClick={loadMetrics}
            className="p-1.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {seedNotice && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600" />
          <span>{seedNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs">Total Records</span>
            <Database className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-stone-900 dark:text-stone-100">
            {data?.total_records ?? '—'}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">Cultural assets catalogued</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-serif text-amber-600 dark:text-amber-400">
            {data?.pending_review ?? '—'}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">Requires human curator check</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs">Approved &amp; Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-emerald-600 dark:text-emerald-400">
            {data?.approved_records ?? '—'}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">Verified with exact citations</div>
        </div>

        <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs">Geotagged Sites</span>
            <MapPin className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold font-serif text-sky-600 dark:text-sky-400">
            {data?.geotagged_sites ?? '—'}
          </div>
          <div className="text-[10px] text-stone-400 mt-1">Mapped on Leaflet canvas</div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-2">
          <h2 className="text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-700" />
            Provenance &amp; Security Audit Trail
          </h2>
          <span className="text-[11px] text-stone-400">Recent 10 Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-stone-400 border-b border-stone-100 dark:border-stone-800 text-[11px]">
                <th className="py-2 font-medium">Timestamp</th>
                <th className="py-2 font-medium">Actor</th>
                <th className="py-2 font-medium">Action</th>
                <th className="py-2 font-medium">Entity</th>
                <th className="py-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {data?.recent_audit_logs && data.recent_audit_logs.length > 0 ? (
                data.recent_audit_logs.map((log) => (
                  <tr key={log.id} className="text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-850">
                    <td className="py-2.5 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {log.actor_name}
                      <span className="block text-[10px] font-normal text-stone-400">{log.actor_role}</span>
                    </td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-stone-500">
                      {log.entity_type}
                    </td>
                    <td className="py-2.5 text-stone-600 dark:text-stone-400 max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-stone-400">
                    No audit records logged yet.
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

