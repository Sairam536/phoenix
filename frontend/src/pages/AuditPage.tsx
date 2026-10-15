import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Shield, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export const AuditPage: React.FC = () => {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-events', page, actionFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set('page', String(page));
      p.set('limit', '15');
      if (actionFilter) p.set('action', actionFilter);
      return api.get(`/audit?${p.toString()}`);
    },
  });

  const events = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 15, total_items: 0, total_pages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Audit History & Compliance Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all document operations, user approvals, rejections, and membership events.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Audit Log</span>
        </button>
      </div>

      {/* Events Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Event Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                events.map((ev: any) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(ev.created_at)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-mono">
                        {ev.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 capitalize font-semibold text-slate-700">
                      {ev.entity_type}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {ev.actor_id ? (
                        <span className="font-mono text-[11px]" title={ev.actor_id}>
                          {ev.actor_id.slice(0, 8)}...
                        </span>
                      ) : (
                        <span className="text-slate-400">System</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 max-w-xs truncate">
                      {JSON.stringify(ev.metadata || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing Page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{meta.total_pages || 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= meta.total_pages}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
