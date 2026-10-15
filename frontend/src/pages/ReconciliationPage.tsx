import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  RefreshCw,
  Download,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/ui/Badge.js';
import { formatDate } from '../lib/utils.js';

export const ReconciliationPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedPoId, setSelectedPoId] = useState('');
  const [activeRecon, setActiveRecon] = useState<any>(null);

  // Load invoices and POs
  const { data: invoices = [] } = useQuery({
    queryKey: ['documents-invoices'],
    queryFn: async () => {
      const res = await api.get('/documents?category=invoice');
      return res?.data || [];
    },
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['documents-pos'],
    queryFn: async () => {
      const res = await api.get('/documents?category=purchase_order');
      return res?.data || [];
    },
  });

  // Load past reconciliations
  const { data: reconciliations = [], isLoading: isReconListLoading } = useQuery({
    queryKey: ['reconciliations'],
    queryFn: async () => {
      const res = await api.get('/reconciliations');
      return res || [];
    },
  });

  const createReconMutation = useMutation({
    mutationFn: () =>
      api.post('/reconciliations', {
        invoice_document_id: selectedInvoiceId,
        purchase_order_document_id: selectedPoId,
      }),
    onSuccess: (data: any) => {
      setActiveRecon(data);
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });

  const reviewReconMutation = useMutation({
    mutationFn: ({ reconId, status }: { reconId: string; status: 'matched' | 'mismatched' | 'rejected' }) =>
      api.post(`/reconciliations/${reconId}/review`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] });
    },
  });

  const currentComparison = activeRecon?.comparison_result || reconciliations[0]?.comparison_result;
  const activeRecord = activeRecon || reconciliations[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Invoice & Purchase Order Reconciliation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic 2-way comparison engine detecting quantity, pricing, and currency discrepancies.
          </p>
        </div>
      </div>

      {/* New Reconciliation Selector Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Scale className="w-4 h-4 text-indigo-600" />
          Select Documents for Comparison
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Select Supplier Invoice</label>
            <select
              value={selectedInvoiceId}
              onChange={e => setSelectedInvoiceId(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Choose an invoice...</option>
              {invoices.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.title} ({inv.original_filename})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Select Purchase Order</label>
            <select
              value={selectedPoId}
              onChange={e => setSelectedPoId(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">Choose a purchase order...</option>
              {purchaseOrders.map((po: any) => (
                <option key={po.id} value={po.id}>
                  {po.title} ({po.original_filename})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => createReconMutation.mutate()}
          disabled={!selectedInvoiceId || !selectedPoId || createReconMutation.isPending}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
        >
          {createReconMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Comparing Line Items...</span>
            </>
          ) : (
            <>
              <Scale className="w-4 h-4" />
              <span>Run Automated 2-Way Reconciliation</span>
            </>
          )}
        </button>
      </div>

      {/* Active Reconciliation Results Display */}
      {currentComparison && activeRecord && (
        <div className="space-y-6">
          {/* Status & Overview Bar */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                    currentComparison.match_status === 'matched' ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                >
                  {currentComparison.match_status === 'matched' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900">
                      Reconciliation Result:{' '}
                      <span className="capitalize">{currentComparison.match_status}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        currentComparison.match_status === 'matched'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {currentComparison.match_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Compared on {formatDate(activeRecord.created_at)}
                  </p>
                </div>
              </div>

              {/* Review Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => reviewReconMutation.mutate({ reconId: activeRecord.id, status: 'matched' })}
                  className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                >
                  Mark Approved
                </button>
                <button
                  onClick={() => reviewReconMutation.mutate({ reconId: activeRecord.id, status: 'rejected' })}
                  className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-semibold transition"
                >
                  Mark Rejected
                </button>
              </div>
            </div>

            {/* Verification Check Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  currentComparison.supplier_match?.matched
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {currentComparison.supplier_match?.matched ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div className="truncate">
                  <span className="font-bold block">Supplier Match</span>
                  <span className="text-[11px] truncate block opacity-80">
                    {currentComparison.supplier_match?.invoice_supplier || 'Unknown'}
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  currentComparison.currency_match?.matched
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {currentComparison.currency_match?.matched ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">Currency Match</span>
                  <span className="text-[11px] opacity-80">
                    {currentComparison.currency_match?.invoice_currency || 'N/A'} vs{' '}
                    {currentComparison.currency_match?.po_currency || 'N/A'}
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  currentComparison.po_reference_match?.matched
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {currentComparison.po_reference_match?.matched ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold block">PO Reference</span>
                  <span className="text-[11px] opacity-80">
                    {currentComparison.po_reference_match?.invoice_referenced_po || 'No reference'}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Amounts Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                  Invoice Total
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  ${currentComparison.amount_comparison?.invoice_total?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                  Purchase Order Total
                </span>
                <span className="text-base font-extrabold text-slate-900">
                  ${currentComparison.amount_comparison?.po_total?.toFixed(2) || '0.00'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">
                  Variance
                </span>
                <span
                  className={`text-base font-extrabold ${
                    currentComparison.amount_comparison?.within_tolerance
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  ${Math.abs(currentComparison.amount_comparison?.total_diff || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Discrepancies Alert */}
            {currentComparison.discrepancies?.length > 0 && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-rose-800 block">Identified Discrepancies:</span>
                <ul className="list-disc list-inside text-xs text-rose-700 space-y-0.5">
                  {currentComparison.discrepancies.map((disc: string, idx: number) => (
                    <li key={idx}>{disc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Line Item Comparison Table */}
          <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Line Item Comparison Breakdown
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Invoice Qty</th>
                    <th className="py-2.5 px-3">PO Qty</th>
                    <th className="py-2.5 px-3">Invoice Price</th>
                    <th className="py-2.5 px-3">PO Price</th>
                    <th className="py-2.5 px-3">Line Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentComparison.line_item_comparisons?.map((line: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs truncate">
                        {line.description}
                      </td>
                      <td className="py-3 px-3">{line.invoice_quantity ?? '—'}</td>
                      <td className="py-3 px-3">{line.po_quantity ?? '—'}</td>
                      <td className="py-3 px-3">${line.invoice_price?.toFixed(2) ?? '—'}</td>
                      <td className="py-3 px-3">${line.po_price?.toFixed(2) ?? '—'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            line.status === 'matched'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {line.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
