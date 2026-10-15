import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Save,
  ArrowLeft,
  FileText,
  AlertTriangle,
  Quote,
  Sparkles,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { SeverityBadge, CategoryBadge, StatusBadge } from '../components/ui/Badge.js';
import { useAuth } from '../context/AuthContext.js';

export const ReviewPage: React.FC = () => {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [editableFields, setEditableFields] = useState<Record<string, string>>({});
  const [selectedPageNum, setSelectedPageNum] = useState(1);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const { data: queue = [] } = useQuery({
    queryKey: ['review-queue'],
    queryFn: () => api.get('/review/queue'),
    enabled: !documentId,
  });

  const effectiveDocId = documentId || (queue.length > 0 ? queue[0].id : null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document-review', effectiveDocId],
    queryFn: async () => {
      if (!effectiveDocId) return null;
      const res = await api.get(`/documents/${effectiveDocId}`);
      // Initialize editable fields from current values
      const initial: Record<string, string> = {};
      if (res?.fields) {
        res.fields.forEach((f: any) => {
          initial[f.field_path] = typeof f.field_value === 'object' ? JSON.stringify(f.field_value) : String(f.field_value ?? '');
        });
      }
      setEditableFields(initial);
      return res;
    },
    enabled: !!effectiveDocId,
  });

  const saveFieldsMutation = useMutation({
    mutationFn: () => {
      if (!effectiveDocId) return Promise.resolve();
      const payload = Object.entries(editableFields).map(([field_path, field_value]) => ({
        field_path,
        field_value,
      }));
      return api.patch(`/documents/${effectiveDocId}/extraction/fields`, { fields: payload });
    },
    onSuccess: () => {
      setSuccessToast('Field changes saved & validation re-calculated!');
      queryClient.invalidateQueries({ queryKey: ['document-review', effectiveDocId] });
      setTimeout(() => setSuccessToast(null), 3000);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      if (!effectiveDocId) return Promise.resolve();
      return api.post(`/documents/${effectiveDocId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', effectiveDocId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      navigate('/app/documents');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => {
      if (!effectiveDocId) return Promise.resolve();
      return api.post(`/documents/${effectiveDocId}/reject`, { reason: rejectReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', effectiveDocId] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['review-queue'] });
      setIsRejectModalOpen(false);
      navigate('/app/documents');
    },
  });

  const resolveIssueMutation = useMutation({
    mutationFn: (issueId: string) => api.post(`/validation-issues/${issueId}/resolve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-review', effectiveDocId] });
    },
  });

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <span className="text-xs text-slate-500">Loading review workspace...</span>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="text-center py-16">
        <h2 className="text-base font-bold text-slate-900 mb-2">Document not found</h2>
        <button onClick={() => navigate('/app/documents')} className="text-xs font-semibold text-indigo-600 hover:underline">
          &larr; Back to documents
        </button>
      </div>
    );
  }

  const pages = doc.pages || [];
  const selectedPage = pages.find((p: any) => p.page_number === selectedPageNum) || pages[0];
  const fields = doc.fields || [];
  const issues = doc.validation_issues || [];

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 p-4 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Decision Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/app/documents/${doc.id}`)}
            className="p-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{doc.title}</span>
              <CategoryBadge category={doc.category} />
              <StatusBadge status={doc.processing_status} />
            </div>
            <p className="text-xs text-slate-400">Reviewing extracted business values with source evidence verification</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => saveFieldsMutation.mutate()}
            disabled={saveFieldsMutation.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Edits</span>
          </button>

          <button
            onClick={() => setIsRejectModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-semibold transition border border-rose-200/60"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Approve document? This signs off the extracted data for organizational records and export.')) {
                approveMutation.mutate();
              }
            }}
            disabled={approveMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Approve Document</span>
          </button>
        </div>
      </div>

      {/* Side-by-Side Split Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-210px)]">
        {/* Left Column (5 Cols): Source Document Text Viewer */}
        <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              Source Text Extracted
            </span>
            {pages.length > 1 && (
              <div className="flex items-center gap-1">
                {pages.map((p: any) => (
                  <button
                    key={p.page_number}
                    onClick={() => setSelectedPageNum(p.page_number)}
                    className={`px-2 py-0.5 text-[11px] rounded font-semibold ${
                      selectedPageNum === p.page_number ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'
                    }`}
                  >
                    P{p.page_number}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-slate-50/30">
            {selectedPage?.extracted_text ? (
              <pre className="font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text p-2">
                {selectedPage.extracted_text}
              </pre>
            ) : (
              <div className="text-center py-24 text-xs text-slate-400">
                No text extracted for this page.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Editable Fields & Validation Warnings */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Extracted Fields & Grounded Evidence
            </span>
            <span className="text-[11px] text-slate-400">Edit fields directly to correct OCR/AI inaccuracies</span>
          </div>

          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* Active Validation Issues Alert List */}
            {issues.filter((i: any) => i.status === 'open').length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Active Validation Discrepancies:
                </span>
                {issues
                  .filter((i: any) => i.status === 'open')
                  .map((iss: any) => (
                    <div
                      key={iss.id}
                      className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <SeverityBadge severity={iss.severity} />
                          <span className="font-bold text-slate-900">{iss.rule_code}</span>
                        </div>
                        <p className="text-slate-700 font-medium">{iss.message}</p>
                      </div>
                      <button
                        onClick={() => resolveIssueMutation.mutate(iss.id)}
                        className="px-2 py-1 bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 font-semibold rounded text-[11px] shrink-0"
                      >
                        Resolve
                      </button>
                    </div>
                  ))}
              </div>
            )}

            {/* Dynamic Field Inputs */}
            <div className="space-y-4">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Category Schema Fields ({doc.category}):
              </span>

              {fields.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-400">
                  No fields extracted for this document.
                </div>
              ) : (
                fields.map((field: any) => {
                  const ev = field.evidence?.[0];
                  return (
                    <div
                      key={field.id}
                      className="p-3.5 bg-slate-50/60 border border-slate-200/80 rounded-xl space-y-2 hover:border-indigo-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 font-mono">
                          {field.field_path}
                        </label>
                        <div className="flex items-center gap-2">
                          {field.is_manually_edited && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                              Edited
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">
                            {field.confidence ? `${Math.round(field.confidence * 100)}% conf` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Field Value Input */}
                      <input
                        type="text"
                        value={editableFields[field.field_path] ?? ''}
                        onChange={e =>
                          setEditableFields({
                            ...editableFields,
                            [field.field_path]: e.target.value,
                          })
                        }
                        className="w-full text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs transition"
                      />

                      {/* Evidence Quote Bar */}
                      {ev && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1">
                          <Quote className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate italic">
                            Page {ev.page || 1}: "{ev.quote}"
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Reject Document</h3>
            <p className="text-xs text-slate-500">
              Please specify the business reason for rejecting this document (e.g. incorrect supplier, missing tax registration, fraudulent invoice).
            </p>
            <textarea
              rows={3}
              required
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Provide reason for audit log..."
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() => rejectMutation.mutate()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
