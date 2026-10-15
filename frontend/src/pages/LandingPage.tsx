import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  FileCheck2,
  ShieldCheck,
  Scale,
  Sparkles,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Lock,
  Layers,
  Search,
  FileSpreadsheet,
  Cpu,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">DocuMind</span>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-200/50">
                AI
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/app')}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition flex items-center gap-1.5"
            >
              <span>Open Platform</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-16 px-6 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Next-Generation Intelligent Document Processing (IDP)</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-950 tracking-tight leading-[1.1] mb-6">
          Turn Unstructured Business Documents into{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-teal-500">
            Validated, Actionable Intelligence
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          DocuMind AI combines official Google Gemini GenAI with deterministic math reconciliation,
          automated OCR, and an audit-grade human review workspace. Eliminate manual data entry for
          invoices, purchase orders, contracts, and receipts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <button
            onClick={() => navigate('/app')}
            className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
          >
            <span>Launch Live Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/app/upload')}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold shadow-xs transition"
          >
            Upload Demo Document
          </button>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-500 pt-4 border-t border-slate-200/60">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero Hallucination Tolerance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Deterministic Math Reconciliation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Multi-Tenant Supabase RLS</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Formula-Injection Safe CSV</span>
          </div>
        </div>
      </section>

      {/* Interactive IDP Pipeline Section */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            The Autonomous 8-Stage Processing Pipeline
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Every document passes through strict validation, provenance tracking, and deterministic integrity checks.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs mb-3">
              01
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Upload & Magic Bytes</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              SHA-256 hash duplication check and byte inspection for PDF, PNG, JPEG, DOCX.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs mb-3">
              02
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">OCR & Text Parsing</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tesseract.js OCR and PDF page boundary extraction preserve layout and word positions.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs mb-3">
              03
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Gemini AI Extraction</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Official `@google/genai` SDK extracts typed fields mapped to category Zod schemas.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs mb-3">
              04
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Deterministic Rules</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pure math verifies line arithmetic (qty * price) and subtotal + tax = total.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs mb-3">
              05
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Evidence Provenance</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every value is connected to its source page number and verifiable text quote.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xs mb-3">
              06
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Invoice - PO Matching</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automated 2-way matching flags quantity variances and unit-price discrepancies.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs mb-3">
              07
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Human Review</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Reviewers verify warnings, edit fields with audit tracking, and approve.
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xs mb-3">
              08
            </div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Knowledge Discovery</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Natural language cross-document Q&A with grounded document citations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800">DocuMind AI</span>
            <span>— Intelligent Document Processing Platform</span>
          </div>
          <div>Built with React, Express, Supabase PostgreSQL & Google Gemini GenAI SDK</div>
        </div>
      </footer>
    </div>
  );
};
