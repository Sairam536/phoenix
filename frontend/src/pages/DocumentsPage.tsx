import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  CheckSquare,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusBadge, CategoryBadge } from '../components/ui/Badge.js';
import { formatBytes, formatDate } from '../lib/utils.js';

export const DocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [processingStatus, setProcessingStatus] = useState(searchParams.get('processing_status') || '');
  const [reviewStatus, setReviewStatus] = useState(searchParams.get('review_status') || '');
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', '10');
  if (search) queryParams.set('search', search);
  if (category) queryParams.set('category', category);
  if (processingStatus) queryParams.set('processing_status', processingStatus);
  if (reviewStatus) queryParams.set('review_status', reviewStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['documents', queryParams.toString()],
    queryFn: () => api.get(`/documents?${queryParams.toString()}`),
  });

  const docs: any[] = Array.isArray(data) ? data : (data?.data || []);
  const meta = data?.meta || { page: 1, limit: 10, total_items: docs.length, total_pages: 1 };

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => api.delete(`/documents/${docId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
  });

  const reprocessMutation = useMutation({
    mutationFn: (docId: string) => api.post(`/documents/${docId}/reprocess`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleDownload = async (docId: string) => {
    try {
      const res = await api.get(`/documents/${docId}/download`);
      if (res?.url) {
        window.open(res.url, '_blank');
      }
    } catch (err) {
      alert('Could not download file: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Library</h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse, inspect provenance, and manage all organization files.
          </p>
        </div>

        <button
          onClick={() => navigate('/app/upload')}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Document</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search filename or title..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Category Filter */}
          <select
            value={category}
            onChange={e => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">All Categories</option>
            <option value="invoice">Supplier Invoices</option>
            <option value="purchase_order">Purchase Orders</option>
            <option value="contract">Contracts & Agreements</option>
            <option value="receipt">Expense Receipts</option>
            <option value="report">Reports</option>
            <option value="other">Other</option>
          </select>

          {/* Processing Status Filter */}
          <select
            value={processingStatus}
            onChange={e => {
              setProcessingStatus(e.target.value);
              setPage(1);
            }}
            className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">All Processing States</option>
            <option value="needs_review">Needs Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="queued">Queued / Processing</option>
            <option value="failed">Failed</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={() => {
              setSearch('');
              setCategory('');
              setProcessingStatus('');
              setReviewStatus('');
              setPage(1);
            }}
            className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl py-2 px-3 transition flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Filters
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Size & Pages</th>
                <th className="py-3 px-4">Uploaded</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading documents...
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                docs.map((doc: any) => (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="max-w-[220px]">
                          <div className="font-bold text-slate-900 truncate">{doc.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">{doc.original_filename}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <CategoryBadge category={doc.category} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={doc.processing_status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div>{formatBytes(doc.file_size_bytes)}</div>
                      <div className="text-[10px] text-slate-400">{doc.pages_count || 1} page(s)</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {formatDate(doc.created_at)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.processing_status === 'needs_review' && (
                          <button
                            onClick={() => navigate(`/app/documents/${doc.id}/review`)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition"
                            title="Open Human Review Workspace"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/app/documents/${doc.id}`)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                          title="View Details & Extracted Pages"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition"
                          title="Download File"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Reprocess ${doc.title}?`)) {
                              reprocessMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition"
                          title="Reprocess Pipeline"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${doc.title}?`)) {
                              deleteMutation.mutate(doc.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                          title="Delete Document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold">{docs.length}</span> of{' '}
            <span className="font-semibold">{meta.total_items}</span> documents
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium">
              Page {page} of {meta.total_pages || 1}
            </span>
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
