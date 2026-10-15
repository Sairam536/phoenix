import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Settings, Save, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useOrg } from '../context/OrgContext.js';
import { api } from '../lib/api.js';

export const SettingsPage: React.FC = () => {
  const { currentOrg, refreshOrgs } = useOrg();

  const [name, setName] = useState(currentOrg?.name || 'Apex Logistics & Industrial Corp');
  const [currency, setCurrency] = useState('USD');
  const [tolerance, setTolerance] = useState('0.05');
  const [autoClassify, setAutoClassify] = useState(true);
  const [savedToast, setSavedToast] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.patch(`/organizations/${currentOrg?.id}`, {
        name,
        settings: {
          currency,
          tolerance_amount: parseFloat(tolerance),
          auto_classify: autoClassify,
        },
      }),
    onSuccess: () => {
      refreshOrgs();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          <span>Organization & Processing Settings</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure default currency, reconciliation tolerances, and automated pipeline rules.
        </p>
      </div>

      {savedToast && (
        <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Organization preferences saved successfully!</span>
        </div>
      )}

      {/* Settings Form */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Organization Identity
          </h2>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Organization Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Organization Identifier (Slug)</label>
            <input
              type="text"
              disabled
              value={currentOrg?.slug || 'apex-logistics'}
              className="w-full text-xs text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-mono cursor-not-allowed"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Reconciliation & Validation Parameters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Default Base Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="CAD">CAD — Canadian Dollar ($)</option>
                <option value="AUD">AUD — Australian Dollar ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reconciliation Amount Tolerance ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={tolerance}
                onChange={e => setTolerance(e.target.value)}
                className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Allowable rounding difference before triggering variance alerts.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="autoClassify"
              checked={autoClassify}
              onChange={e => setAutoClassify(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <label htmlFor="autoClassify" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Auto-Classify documents using Gemini AI when category is unspecified
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{updateMutation.isPending ? 'Saving...' : 'Save Preferences'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
