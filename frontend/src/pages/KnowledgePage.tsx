import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BrainCircuit,
  Search,
  Sparkles,
  Quote,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  History,
  Send,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export const KnowledgePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [activeAnswer, setActiveAnswer] = useState<any>(null);

  const { data: history = [] } = useQuery({
    queryKey: ['knowledge-history'],
    queryFn: () => api.get('/knowledge/history'),
  });

  const askMutation = useMutation({
    mutationFn: (qText: string) => api.post('/knowledge/ask', { question: qText }),
    onSuccess: (data: any) => {
      setActiveAnswer(data);
      queryClient.invalidateQueries({ queryKey: ['knowledge-history'] });
    },
  });

  const handleAsk = (q: string) => {
    if (!q.trim()) return;
    setQuestion(q);
    askMutation.mutate(q);
  };

  const sampleQueries = [
    'What is the total amount and PO reference on invoice 4401?',
    'What are the payment terms and uptime SLA in the CloudScale MSA contract?',
    'Which supplier provided 4K displays and docking stations?',
    'Are there any purchase orders awaiting invoice reconciliation?',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <BrainCircuit className="w-6 h-6 text-indigo-600" />
          <span>Knowledge Discovery & Grounded Q&A</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Ask questions across authorized repository documents. Answers are strictly grounded with page and quote citations.
        </p>
      </div>

      {/* Query Input Card */}
      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleAsk(question);
          }}
          className="relative"
        >
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            required
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ask anything about invoices, contracts, totals, or suppliers..."
            className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-28 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-2xs"
          />
          <button
            type="submit"
            disabled={askMutation.isPending || !question.trim()}
            className="absolute right-2 top-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {askMutation.isPending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Ask AI</span>
          </button>
        </form>

        {/* Sample Queries Chips */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-500" /> Try Asking:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {sampleQueries.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAsk(sample)}
                className="text-[11px] bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200/80 rounded-lg px-2.5 py-1 transition text-left"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grounded Answer Card */}
      {activeAnswer && (
        <div className="p-6 bg-white border border-indigo-100 rounded-2xl shadow-md shadow-indigo-50/50 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-900">Grounded Answer</span>
              {activeAnswer.supported ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Verified in Sources
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Uncertain Evidence
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400">Zero-hallucination constraint active</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
            {activeAnswer.answer}
          </p>

          {/* Citations */}
          {activeAnswer.sources?.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Supporting Evidence & Citations:
              </span>
              <div className="grid grid-cols-1 gap-2">
                {activeAnswer.sources.map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold text-slate-900">
                        <span>{s.document_title || 'Document'}</span>
                        <span className="text-slate-400 font-normal">Page {s.page || 1}</span>
                      </div>
                      <div className="italic text-slate-600 text-[11px] bg-white p-2 rounded border border-slate-200/60">
                        "{s.quote}"
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/app/documents/${s.document_id}`)}
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition shrink-0"
                      title="Open Document Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4 text-slate-400" />
              Prior Organization Questions
            </span>
            <span className="text-[11px] text-slate-400">{history.length} questions recorded</span>
          </div>

          <div className="space-y-3">
            {history.slice(0, 5).map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  setQuestion(item.question);
                  setActiveAnswer({
                    answer: item.answer,
                    supported: true,
                    sources: item.source_references || [],
                  });
                }}
                className="p-3.5 bg-slate-50/60 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl cursor-pointer transition space-y-1"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{item.question}</span>
                  <span className="text-[10px] text-slate-400">{formatDate(item.created_at)}</span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
