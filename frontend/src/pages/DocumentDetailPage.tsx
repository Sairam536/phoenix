import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  CheckSquare,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Layers,
  Fingerprint,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Code2,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusBadge, CategoryBadge, SeverityBadge } from '../components/ui/Badge.js';
import { formatBytes, formatDate } from '../lib/utils.js';

export const DocumentDetailPage: React.FC = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'text' | 'fields' | 'issues' | 'json'>('text');
  const [selectedPageNum, setSelectedPageNum] = useState(1);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => api.get(`/documents/${documentId}`),
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500">Loading document details...</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16">
        <h2 className="text-base font-bold text-slate-900 mb-2">Document not found</h2>
        <button
          onClick={() => navigate('/app/documents')}
          className="text-xs font-semibold text-indigo-600 hover:underline"
        >
          &larr; Back to document library
        </button>
      </div>
    );
  }

  const pages = doc.pages || [];
  const selectedPage = pages.find((p: any) => p.page_number === selectedPageNum) || pages[0];
  const fields = doc.fields || [];
  const issues = doc.validation_issues || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/documents')}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{doc.title}</h1>
              <CategoryBadge category={doc.category} />
              <StatusBadge status={doc.processing_status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{doc.original_filename} • {formatBytes(doc.file_size_bytes)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {doc.processing_status === 'needs_review' && (
            <button
              onClick={() => navigate(`/app/documents/${doc.id}/review`)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Open Review Workspace</span>
            </button>
          )}

          <button
            onClick={async () => {
              const res = await api.get(`/documents/${doc.id}/download`);
              if (res?.url) window.open(res.url, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Overview Metadata Bar */}
      <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">SHA-256 Hash</span>
          <span className="font-mono text-[11px] text-slate-700 truncate block" title={doc.sha256_hash}>
            {doc.sha256_hash}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Schema Version</span>
          <span className="font-medium text-slate-800">{doc.extraction_schema_version || 'None'}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Uploaded</span>
          <span className="text-slate-600">{formatDate(doc.created_at)}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block mb-0.5">Review Decision</span>
          <span className="capitalize font-semibold text-slate-800">{doc.review_status}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveTab('text')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'text'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Extracted Pages ({pages.length})
        </button>
        <button
          onClick={() => setActiveTab('fields')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'fields'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Extracted Fields & Evidence ({fields.length})
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'issues'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Validation Issues</span>
          {issues.length > 0 && (
            <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {issues.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('json')}
          className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'json'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Raw AI JSON
        </button>
      </div>

      {/* Tab 1: Extracted Pages */}
      {activeTab === 'text' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          {pages.length > 1 && (
            <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <span className="text-xs font-semibold text-slate-500">Select Page:</span>
              {pages.map((p: any) => (
                <button
                  key={p.page_number}
                  onClick={() => setSelectedPageNum(p.page_number)}
                  className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                    selectedPageNum === p.page_number
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Page {p.page_number}
                </button>
              ))}
            </div>
          )}

          <div className="p-6">
            {selectedPage?.extracted_text ? (
              <pre className="font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/70 p-4 rounded-xl border border-slate-200/60 max-h-[500px] overflow-y-auto">
                {selectedPage.extracted_text}
              </pre>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No text extracted for this page yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Fields & Provenance Evidence */}
      {activeTab === 'fields' && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">Field Path</th>
                <th className="py-3 px-4">Extracted Value</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Evidence Quote</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No structured fields recorded yet.
                  </td>
                </tr>
              ) : (
                fields.map((field: any) => {
                  const ev = field.evidence?.[0];
                  return (
                    <tr key={field.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                        {field.field_path}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {typeof field.field_value === 'object'
                          ? JSON.stringify(field.field_value)
                          : String(field.field_value ?? '—')}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {field.confidence ? `${Math.round(field.confidence * 100)}%` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs">
                        {ev ? (
                          <div className="italic text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                            "{ev.quote}"
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No quote attached</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize font-semibold text-[11px] text-emerald-600">
                          {field.validation_status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Validation Issues */}
      {activeTab === 'issues' && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <div className="p-8 bg-white border border-slate-200/80 rounded-2xl text-center shadow-xs">
              <CheckSquare className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Zero Validation Issues</h3>
              <p className="text-xs text-slate-400 mt-1">All mathematical and structural constraints passed successfully.</p>
            </div>
          ) : (
            issues.map((iss: any) => (
              <div key={iss.id} className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={iss.severity} />
                    <span className="font-mono text-xs font-bold text-slate-900">{iss.rule_code}</span>
                  </div>
                  <span className="capitalize text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Status: {iss.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">{iss.message}</p>
                {iss.expected_value && (
                  <div className="text-[11px] text-slate-500 flex gap-4 pt-1 font-mono">
                    <span>Expected: {String(iss.expected_value)}</span>
                    {iss.actual_value !== undefined && <span>Actual: {String(iss.actual_value)}</span>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 4: Raw JSON */}
      {activeTab === 'json' && (
        <div className="p-4 bg-slate-900 rounded-2xl text-slate-100 font-mono text-xs overflow-x-auto shadow-md">
          <pre>{JSON.stringify(doc.extraction_result?.extracted_data || {}, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};
