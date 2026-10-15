import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb } from '../repositories/db.js';
import { storageService } from '../services/storage.service.js';
import { jobProcessor } from '../workers/job-processor.js';
import { computeSha256 } from '../utils/file-signature.js';

export class DocumentController {
  async uploadDocument(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({
        success: false,
        error: { code: 'FILE_REQUIRED', message: 'No file was uploaded in the request.' },
      });
      return;
    }

    const orgId = req.organizationId!;
    const userId = req.user!.id;
    const { title, description, category, tags } = req.body;

    const sha256 = computeSha256(file.buffer);

    // Duplicate check
    const existing = inMemoryDb.documents.find(
      d => d.organization_id === orgId && d.sha256_hash === sha256
    );

    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_FILE',
          message: `This exact file was already uploaded under title "${existing.title}".`,
          details: [{ field: 'sha256_hash', message: existing.id }],
        },
      });
      return;
    }

    const docId = uuidv4();

    // Save to storage
    const stored = await storageService.saveFile(
      orgId,
      docId,
      file.originalname,
      file.buffer,
      file.mimetype
    );

    // Parse tags array
    let tagsList: string[] = [];
    if (Array.isArray(tags)) {
      tagsList = tags;
    } else if (typeof tags === 'string') {
      tagsList = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const docRecord = {
      id: docId,
      organization_id: orgId,
      uploaded_by: userId,
      title: title || file.originalname,
      description: description || null,
      original_filename: file.originalname,
      storage_path: stored.storagePath,
      mime_type: stored.mimeType,
      file_size_bytes: stored.fileSizeBytes,
      sha256_hash: stored.sha256Hash,
      category: (category as any) || 'unknown',
      processing_status: 'queued' as const,
      review_status: 'pending' as const,
      extraction_schema_version: null,
      tags: tagsList,
      metadata: {},
      uploaded_at: new Date().toISOString(),
      processed_at: null,
      approved_at: null,
      approved_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.documents.unshift(docRecord);

    // Queue processing job
    const jobId = uuidv4();
    const jobRecord = {
      id: jobId,
      organization_id: orgId,
      document_id: docId,
      job_type: 'full_processing' as const,
      status: 'queued' as const,
      stage: 'enqueued',
      attempt_count: 0,
      max_attempts: 3,
      idempotency_key: `${docId}-full`,
      error_code: null,
      error_message: null,
      worker_id: null,
      started_at: null,
      finished_at: null,
      next_retry_at: null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.jobs.unshift(jobRecord);

    // Record audit event
    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'document_uploaded',
      entity_type: 'document',
      entity_id: docId,
      metadata: { original_filename: file.originalname, size: stored.fileSizeBytes },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    // Proactively trigger processing in background
    setTimeout(() => jobProcessor.tick(), 100);

    res.status(201).json({
      success: true,
      data: {
        document: docRecord,
        job_id: jobId,
      },
    });
  }

  async listDocuments(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const { page = 1, limit = 10, search, category, processing_status, review_status, sort_by = 'created_at', sort_order = 'desc' } = req.query as any;

    let docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);

    if (category) {
      docs = docs.filter(d => d.category === category);
    }
    if (processing_status) {
      docs = docs.filter(d => d.processing_status === processing_status);
    }
    if (review_status) {
      docs = docs.filter(d => d.review_status === review_status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      docs = docs.filter(
        d =>
          d.title.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)) ||
          d.original_filename.toLowerCase().includes(q)
      );
    }

    // Sort
    docs.sort((a, b) => {
      let valA = (a as any)[sort_by] ?? '';
      let valB = (b as any)[sort_by] ?? '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return sort_order === 'asc' ? -1 : 1;
      if (valA > valB) return sort_order === 'asc' ? 1 : -1;
      return 0;
    });

    const total = docs.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = docs.slice(startIndex, startIndex + Number(limit));

    // Enrich with counts
    const enriched = paginated.map(doc => {
      const pageCount = inMemoryDb.pages.filter(p => p.document_id === doc.id).length;
      const issues = inMemoryDb.validationIssues.filter(i => i.document_id === doc.id && i.status === 'open');
      return {
        ...doc,
        pages_count: pageCount,
        validation_issues_count: issues.length,
      };
    });

    res.json({
      success: true,
      data: enriched,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total_items: total,
        total_pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  }

  async getDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;

    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found or access denied.' },
      });
      return;
    }

    const pages = inMemoryDb.pages.filter(p => p.document_id === docId);
    const extractionResult = inMemoryDb.extractionResults.find(e => e.document_id === docId) || null;
    const fields = inMemoryDb.extractedFields.filter(f => f.document_id === docId);
    const issues = inMemoryDb.validationIssues.filter(i => i.document_id === docId);

    res.json({
      success: true,
      data: {
        ...doc,
        pages_count: pages.length,
        pages,
        extraction_result: extractionResult,
        fields,
        validation_issues: issues,
      },
    });
  }

  async updateDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);

    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    const { title, description, category, tags } = req.body;
    if (title !== undefined) doc.title = title;
    if (description !== undefined) doc.description = description;
    if (category !== undefined) doc.category = category;
    if (tags !== undefined) doc.tags = tags;
    doc.updated_at = new Date().toISOString();

    res.json({ success: true, data: doc });
  }

  async deleteDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;

    const index = inMemoryDb.documents.findIndex(d => d.id === docId && d.organization_id === orgId);
    if (index === -1) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    const doc = inMemoryDb.documents[index];

    // Cleanup storage
    try {
      await storageService.deleteFile(doc.storage_path);
    } catch {
      // Ignore if file already removed
    }

    // Remove from in-memory DB
    inMemoryDb.documents.splice(index, 1);
    inMemoryDb.pages = inMemoryDb.pages.filter(p => p.document_id !== docId);
    inMemoryDb.extractionResults = inMemoryDb.extractionResults.filter(e => e.document_id !== docId);
    inMemoryDb.extractedFields = inMemoryDb.extractedFields.filter(f => f.document_id !== docId);
    inMemoryDb.validationIssues = inMemoryDb.validationIssues.filter(i => i.document_id !== docId);

    res.json({ success: true, data: { deleted: true } });
  }

  async downloadDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);

    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    const signedUrl = await storageService.getSignedUrl(doc.storage_path, 300);
    res.json({
      success: true,
      data: {
        url: signedUrl,
        filename: doc.original_filename,
        expiresInSeconds: 300,
      },
    });
  }

  async getPages(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);

    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    const pages = inMemoryDb.pages
      .filter(p => p.document_id === docId)
      .sort((a, b) => a.page_number - b.page_number);

    res.json({ success: true, data: pages });
  }

  async reprocess(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);

    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    doc.processing_status = 'queued';

    const jobId = uuidv4();
    const jobRecord = {
      id: jobId,
      organization_id: orgId,
      document_id: docId,
      job_type: 'reprocess' as const,
      status: 'queued' as const,
      stage: 'enqueued',
      attempt_count: 0,
      max_attempts: 3,
      idempotency_key: `${docId}-reprocess-${Date.now()}`,
      error_code: null,
      error_message: null,
      worker_id: null,
      started_at: null,
      finished_at: null,
      next_retry_at: null,
      created_by: req.user!.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.jobs.unshift(jobRecord);
    setTimeout(() => jobProcessor.tick(), 100);

    res.json({ success: true, data: { job_id: jobId, status: 'queued' } });
  }
}

export const documentController = new DocumentController();
