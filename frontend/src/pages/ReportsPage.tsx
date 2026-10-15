import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileSpreadsheet,
  Download,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api.js';

export const ReportsPage: React.FC = () => {
  const [dataType, setDataType] = useState<'documents' | 'reconciliations' | 'validation_issues' | 'audit_events'>('documents');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const { data: valReport } = useQuery({
    queryKey: ['report-validation'],
    queryFn: () => api.get('/reports/validation'),
  });

  const { data: reconReport } = useQuery({
    queryKey: ['report-reconciliation'],
    queryFn: () => api.get('/reports/reconciliation'),
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const csvData = await api.post('/exports/csv', {
        data_type: dataType,
        category: categoryFilter || undefined,
      });

      // Trigger browser download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documind-${dataType}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setIsExporting(true);
      const jsonData = await api.post('/exports/json', {
        data_type: dataType,
        category: categoryFilter || undefined,
      });

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `documind-${dataType}-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
          <span>Reports & Safe Data Exports</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Export organization records safely into sanitized CSV or JSON with formula-injection defenses.
        </p>
      </div>

      {/* Export Builder Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Export Structured Records
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Select Dataset</label>
            <select
              value={dataType}
              onChange={e => setDataType(e.target.value as any)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="documents">Processed Documents Library</option>
              <option value="reconciliations">Reconciliation Comparisons</option>
              <option value="validation_issues">Validation Issues Log</option>
              <option value="audit_events">Audit Trail Events</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Category Filter (Optional)</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">All Categories</option>
              <option value="invoice">Invoices only</option>
              <option value="purchase_order">Purchase Orders only</option>
              <option value="contract">Contracts only</option>
              <option value="receipt">Receipts only</option>
            </select>
          </div>
        </div>

        {/* Security Formula Protection Note */}
        <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Formula-Injection Defense Enabled: Cell values beginning with '=', '+', '-', '@', '\t' are sanitized to prevent Excel spreadsheet execution.
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV Spreadsheet</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download Structured JSON</span>
          </button>
        </div>
      </div>

      {/* Reports Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Validation Report */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Validation Integrity Summary</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500">
              {valReport?.total_issues ?? 0} total issues
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Open Discrepancies</span>
              <span className="text-lg font-bold text-rose-600">{valReport?.open_issues ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Resolved by Humans</span>
              <span className="text-lg font-bold text-emerald-600">{valReport?.resolved_issues ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Reconciliation Report */}
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>2-Way Reconciliation Performance</span>
            </h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {reconReport?.match_rate ?? 100}% Clean Match
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Matched</span>
              <span className="text-base font-bold text-emerald-600">{reconReport?.matched ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Mismatched</span>
              <span className="text-base font-bold text-rose-600">{reconReport?.mismatched ?? 0}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Rejected</span>
              <span className="text-base font-bold text-slate-600">{reconReport?.rejected ?? 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
