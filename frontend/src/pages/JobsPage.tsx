import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ListTodo, RefreshCw, AlertCircle, CheckCircle2, Clock, Play } from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { formatDate } from '../lib/utils.js';

export const JobsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['processing-jobs'],
    queryFn: () => api.get('/jobs'),
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => api.post(`/jobs/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processing-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const jobs = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ListTodo className="w-6 h-6 text-indigo-600" />
            <span>Processing Jobs & Background Queue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time execution queue, worker concurrency, and pipeline stage tracking.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Jobs Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Document / Job ID</th>
                <th className="py-3 px-4">Job Type</th>
                <th className="py-3 px-4">Pipeline Stage</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Started / Finished</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading job queue...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No processing jobs recorded.
                  </td>
                </tr>
              ) : (
                jobs.map((job: any) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 max-w-xs truncate">
                        {job.document_title || job.document_id}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{job.id}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-semibold text-slate-700">
                      {job.job_type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                        {job.stage || 'queued'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {job.attempt_count} / {job.max_attempts}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {job.started_at ? formatDate(job.started_at) : 'Not started'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(job.status === 'failed' || job.status === 'succeeded') && (
                        <button
                          onClick={() => retryMutation.mutate(job.id)}
                          disabled={retryMutation.isPending}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition inline-flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
