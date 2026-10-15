import React from 'react';
import { ProcessingStatus, ReviewStatus, DocumentCategory, ValidationSeverity } from '../../shared/index.js';

export const StatusBadge: React.FC<{ status: ProcessingStatus | string }> = ({ status }) => {
  const styles: Record<string, string> = {
    uploaded: 'bg-slate-100 text-slate-700 border-slate-200',
    queued: 'bg-blue-50 text-blue-700 border-blue-200',
    extracting: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse',
    classifying: 'bg-indigo-50 text-indigo-700 border-indigo-200 animate-pulse',
    extracting_fields: 'bg-purple-50 text-purple-700 border-purple-200 animate-pulse',
    validating: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
    needs_review: 'bg-amber-50 text-amber-700 border-amber-200 font-semibold',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
    failed: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  };

  const labels: Record<string, string> = {
    needs_review: 'Needs Review',
    extracting_fields: 'Extracting Fields',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed',
    queued: 'Queued',
    uploaded: 'Uploaded',
  };

  const style = styles[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = labels[status] || status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border ${style}`}>
      <span className="capitalize">{label}</span>
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: DocumentCategory | string }> = ({ category }) => {
  const styles: Record<string, string> = {
    invoice: 'bg-blue-50 text-blue-700 border-blue-200',
    purchase_order: 'bg-purple-50 text-purple-700 border-purple-200',
    contract: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    receipt: 'bg-amber-50 text-amber-700 border-amber-200',
    report: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    correspondence: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    other: 'bg-slate-100 text-slate-700 border-slate-200',
    unknown: 'bg-slate-100 text-slate-500 border-slate-200',
  };

  const labels: Record<string, string> = {
    invoice: 'Invoice',
    purchase_order: 'Purchase Order',
    contract: 'Contract',
    receipt: 'Receipt',
    report: 'Report',
    correspondence: 'Correspondence',
    other: 'Other',
    unknown: 'Unknown',
  };

  const style = styles[category] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = labels[category] || category.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border ${style}`}>
      {label}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: ValidationSeverity | string }> = ({ severity }) => {
  const styles: Record<string, string> = {
    critical: 'bg-rose-100 text-rose-800 border-rose-300 font-bold',
    error: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    warning: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
    info: 'bg-blue-50 text-blue-700 border-blue-200 font-medium',
  };

  const style = styles[severity] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={`inline-flex items-center text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${style}`}>
      {severity}
    </span>
  );
};
