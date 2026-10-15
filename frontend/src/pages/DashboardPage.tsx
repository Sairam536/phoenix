import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  UploadCloud,
  Scale,
  BrainCircuit,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusBadge, CategoryBadge } from '../components/ui/Badge.js';
import { formatDate } from '../lib/utils.js';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: () => api.get('/dashboard/categories'),
  });

  const { data: activity = [] } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/dashboard/activity'),
  });

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get('/review/queue'),
  });

  const { data: recentDocs = [] } = useQuery({
    queryKey: ['recent-documents'],
    queryFn: () => api.get('/documents?limit=5'),
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Intelligence Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time document operations, validation health, and knowledge status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchSummary()}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition"
            title="Refresh statistics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/app/upload')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm shadow-indigo-100 transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload New Files</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Documents</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {isSummaryLoading ? '—' : summary?.total_documents ?? 0}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">In organization repository</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Awaiting Review</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600">
            {isSummaryLoading ? '—' : summary?.awaiting_review ?? 0}
          </div>
          <span className="text-[10px] text-amber-600/80 font-medium">Requires human sign-off</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Approved</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {isSummaryLoading ? '—' : summary?.approved_documents ?? 0}
          </div>
          <span className="text-[10px] text-emerald-600/80 font-medium">Ready for export / ERP</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Validation Issues</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600">
            {isSummaryLoading ? '—' : summary?.validation_warnings ?? 0}
          </div>
          <span className="text-[10px] text-rose-600/80 font-medium">Discrepancies flagged</span>
        </div>

        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Extraction Success</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {isSummaryLoading ? '—' : `${summary?.processing_success_rate ?? 100}%`}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">OCR & AI model completion</span>
        </div>
      </div>

      {/* Main Grid: Activity & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Processing Activity Bar Visualizer */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ingestion & Processing Activity</h2>
              <p className="text-xs text-slate-400 mt-0.5">Documents uploaded and processed over the last 7 days</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              7-Day Trend
            </span>
          </div>

          <div className="h-44 flex items-end justify-between gap-3 pt-6 border-b border-slate-100">
            {activity.map((item: any) => {
              const heightPct = Math.max(15, Math.min(100, item.count * 25));
              return (
                <div key={item.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="text-[11px] font-bold text-slate-600 group-hover:text-indigo-600 transition">
                    {item.count}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[42px] bg-indigo-100 group-hover:bg-indigo-600 rounded-t-lg transition-all duration-300 shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 font-medium">
                    {item.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Category Distribution</h2>
          <p className="text-xs text-slate-400 mb-5">Classification breakdown across repository</p>

          <div className="space-y-4 flex-1">
            {categories.map((cat: any) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 capitalize">{cat.category.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400 font-medium">{cat.count} files ({cat.percentage}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${cat.percentage}%` }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Review Queue & Fast Action Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Queue Table Widget */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Review Queue Priority</h2>
              <p className="text-xs text-slate-400 mt-0.5">Documents awaiting validation and human verification</p>
            </div>
            <Link
              to="/app/documents?review_status=pending"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Issues</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                      All documents in this organization are verified and approved! 🎉
                    </td>
                  </tr>
                ) : (
                  reviewQueue.slice(0, 4).map((doc: any) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800 max-w-[200px] truncate">
                        {doc.title}
                      </td>
                      <td className="py-3 px-3">
                        <CategoryBadge category={doc.category} />
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={doc.processing_status} />
                      </td>
                      <td className="py-3 px-3">
                        {doc.open_issues_count > 0 ? (
                          <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                            {doc.open_issues_count} flagged
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600">Clean</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/app/documents/${doc.id}/review`)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                        >
                          Review &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl text-white shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold mb-3 border border-indigo-400/20">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>AI Operations Tools</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mb-1">Accelerate IDP Workflows</h3>
            <p className="text-xs text-indigo-200/80 leading-relaxed">
              Execute cross-document purchase order matching or query documents using natural language.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => navigate('/app/reconciliation')}
              className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-between transition text-left"
            >
              <span className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-indigo-400" />
                <span>PO Reconciliation</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
            </button>

            <button
              onClick={() => navigate('/app/knowledge')}
              className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-between transition text-left"
            >
              <span className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-teal-400" />
                <span>Knowledge Discovery</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
