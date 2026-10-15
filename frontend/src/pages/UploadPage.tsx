import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  FilePlus,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatBytes } from '../lib/utils.js';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('unknown');
  const [tags, setTags] = useState('');

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successDoc, setSuccessDoc] = useState<any>(null);

  const handleFileChange = (file: File) => {
    setError(null);
    if (file.size > 20 * 1024 * 1024) {
      setError('File exceeds 20MB limit.');
      return;
    }

    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt'];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setError('Unsupported file type. Please upload a PDF, PNG, JPG, DOCX, or TXT file.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(30);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title || selectedFile.name);
      if (description) formData.append('description', description);
      if (category !== 'unknown') formData.append('category', category);
      if (tags) formData.append('tags', tags);

      setUploadProgress(65);

      const result = await api.post('/documents', formData);

      setUploadProgress(100);
      setSuccessDoc(result.document);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Helper to create synthetic demo files on the fly
  const loadSyntheticDemoFile = (type: 'invoice' | 'po' | 'contract' | 'receipt') => {
    let content = '';
    let name = '';
    let autoCategory = type;

    if (type === 'invoice') {
      name = 'TechGear_Invoice_INV4401.txt';
      content = `TECHGEAR SOLUTIONS INC.
1200 Innovation Way, Austin, TX 78759
Tax ID: US-82-4910291
INVOICE: INV-2026-4401
Date: 2026-09-15 | Due Date: 2026-10-15
PO Reference: PO-8820
Bill To: Apex Logistics & Industrial Corp
Line Items:
1. UltraSharp 27" 4K Monitor | Qty: 4 | Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Quad Display Dock | Qty: 4 | Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax (0%): $0.00 | Discount: $0.00
Total Due: $2,360.00 USD
Payment Terms: Net 30 days via Wire Transfer`;
    } else if (type === 'po') {
      name = 'Apex_Purchase_Order_PO8820.txt';
      content = `PURCHASE ORDER: PO-8820
Buyer: Apex Logistics & Industrial Corp
Supplier: TechGear Solutions Inc.
Issue Date: 2026-09-10
Expected Delivery: 2026-09-22
Currency: USD
Items:
1. UltraSharp 27" 4K Monitor | Qty: 4 | Unit Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Docking Station | Qty: 4 | Unit Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax: $0.00 | Total Amount: $2,360.00 USD
Delivery Address: 450 Logistics Hub Parkway, Dallas TX 75201`;
    } else if (type === 'contract') {
      name = 'CloudScale_Master_Services_Agreement.txt';
      content = `MASTER SERVICES AGREEMENT
Parties: CloudScale Infrastructure Inc. ("Provider") and Apex Logistics & Industrial Corp ("Client").
Effective Date: October 1, 2026. Term: 24 Months ending September 30, 2028.
Payment Terms: Monthly billing, net 15 days upon invoice receipt.
Uptime SLA: 99.95% availability for production clusters with 10% credit for breaches.
Governing Law: State of Delaware.`;
    } else {
      name = 'Airport_Taxi_Travel_Receipt.txt';
      content = `AIRPORT EXPRESS SHUTTLE
Date: 2026-10-10
Merchant: Metro Airport Express LLC
Fare: $65.00
Tolls: $7.50
Tip: $12.00
Total: $84.50 USD
Payment Method: Corporate Visa ending 4123
Category: Ground Travel`;
    }

    const uniqueContent = `${content}\n\n# Generated Sample Ref: ${Date.now()}`;
    const file = new File([uniqueContent], name, { type: 'text/plain' });
    setSelectedFile(file);
    setTitle(`${name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ')} (${new Date().toLocaleTimeString()})`);
    setCategory(autoCategory);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Documents</h1>
        <p className="text-xs text-slate-500 mt-1">
          Ingest business files into the autonomous AI extraction and validation pipeline.
        </p>
      </div>

      {/* Pre-canned synthetic sample document chips for instant testing */}
      <div className="p-4 bg-gradient-to-r from-indigo-50 to-teal-50 border border-indigo-100/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-900">Instant Demo Documents:</span>
          <span className="text-[10px] text-slate-500">(Click to load verified sample test files)</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadSyntheticDemoFile('invoice')}
            className="text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            📄 Sample Invoice (TechGear 4401)
          </button>
          <button
            type="button"
            onClick={() => loadSyntheticDemoFile('po')}
            className="text-[11px] font-semibold bg-white border border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            📋 Sample Purchase Order (PO-8820)
          </button>
          <button
            type="button"
            onClick={() => loadSyntheticDemoFile('contract')}
            className="text-[11px] font-semibold bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            📑 Sample MSA Agreement
          </button>
          <button
            type="button"
            onClick={() => loadSyntheticDemoFile('receipt')}
            className="text-[11px] font-semibold bg-white border border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white px-3 py-1.5 rounded-lg shadow-2xs transition"
          >
            🧾 Sample Expense Receipt
          </button>
        </div>
      </div>

      {/* Upload Success Banner */}
      {successDoc && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                Document Ingested & Processing Queued!
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                "{successDoc.title}" is passing through OCR, Gemini structured extraction, and math validation.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => navigate(`/app/documents/${successDoc.id}`)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              View Document Details &rarr;
            </button>
            <button
              onClick={() => navigate(`/app/documents/${successDoc.id}/review`)}
              className="px-3.5 py-1.5 bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
            >
              Open Review Workspace
            </button>
            <button
              onClick={() => {
                setSuccessDoc(null);
                setSelectedFile(null);
                setTitle('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto"
            >
              Upload another
            </button>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-6">
        {/* Dropzone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
            selectedFile
              ? 'border-indigo-400 bg-indigo-50/30'
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
            onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />

          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <span className="font-bold text-sm text-slate-900 block">{selectedFile.name}</span>
              <span className="text-xs text-slate-400 block font-medium">
                {formatBytes(selectedFile.size)} • Click or drop another to replace
              </span>
            </div>
          ) : (
            <div>
              <span className="font-bold text-sm text-slate-800 block mb-1">
                Drag and drop your document here, or <span className="text-indigo-600">browse</span>
              </span>
              <span className="text-xs text-slate-400 block font-medium">
                Supports PDF, scanned images (PNG, JPG), DOCX, and TXT up to 20MB
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Metadata Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Document Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Q3 Invoice - TechGear Solutions"
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Category Override</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="unknown">Auto-Classify with Gemini AI</option>
              <option value="invoice">Supplier Invoice</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="contract">Contract / Agreement</option>
              <option value="receipt">Expense Receipt</option>
              <option value="report">Business Report</option>
              <option value="other">Other Document</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief context or notes regarding this document..."
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-700 block mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="hardware, q3, facilities, urgent"
              className="w-full text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Ingesting and computing SHA-256 hash...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                style={{ width: `${uploadProgress}%` }}
                className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Uploading & Queuing Processing...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Document & Trigger Pipeline</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
