import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb } from '../repositories/db.js';
import { validationService } from '../services/validation.service.js';

export class ReviewController {
  async getReviewQueue(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docs = inMemoryDb.documents
      .filter(d => d.organization_id === orgId && (d.processing_status === 'needs_review' || d.review_status === 'pending'))
      .map(doc => {
        const issues = inMemoryDb.validationIssues.filter(i => i.document_id === doc.id && i.status === 'open');
        return {
          ...doc,
          open_issues_count: issues.length,
          critical_issues_count: issues.filter(i => i.severity === 'critical' || i.severity === 'error').length,
        };
      });

    res.json({ success: true, data: docs });
  }

  async approveDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const userId = req.user!.id;

    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    doc.review_status = 'approved';
    doc.processing_status = 'approved';
    doc.approved_at = new Date().toISOString();
    doc.approved_by = userId;
    doc.updated_at = new Date().toISOString();

    // Record review event
    inMemoryDb.reviewEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docId,
      actor_id: userId,
      action: 'approved',
      reason: req.body?.reason || 'Verified and approved by reviewer',
      changes: [],
      created_at: new Date().toISOString(),
    });

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'document_approved',
      entity_type: 'document',
      entity_id: docId,
      metadata: { reason: req.body?.reason },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, data: doc });
  }

  async rejectDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const userId = req.user!.id;
    const { reason } = req.body;

    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    doc.review_status = 'rejected';
    doc.processing_status = 'rejected';
    doc.updated_at = new Date().toISOString();

    inMemoryDb.reviewEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docId,
      actor_id: userId,
      action: 'rejected',
      reason: reason || 'Document rejected by reviewer',
      changes: [],
      created_at: new Date().toISOString(),
    });

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'document_rejected',
      entity_type: 'document',
      entity_id: docId,
      metadata: { reason },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, data: doc });
  }

  async reopenDocument(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const userId = req.user!.id;

    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    doc.review_status = 'pending';
    doc.processing_status = 'needs_review';
    doc.approved_at = null;
    doc.approved_by = null;
    doc.updated_at = new Date().toISOString();

    inMemoryDb.reviewEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docId,
      actor_id: userId,
      action: 'reopened',
      reason: req.body?.reason || 'Reopened for additional review',
      changes: [],
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, data: doc });
  }

  async updateExtractedFields(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docId = req.params.documentId;
    const userId = req.user!.id;
    const { fields } = req.body as { fields: Array<{ field_path: string; field_value: unknown }> };

    const doc = inMemoryDb.documents.find(d => d.id === docId && d.organization_id === orgId);
    if (!doc) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found.' },
      });
      return;
    }

    const changesRecorded: Array<Record<string, unknown>> = [];

    fields.forEach(f => {
      let fieldRecord = inMemoryDb.extractedFields.find(
        ef => ef.document_id === docId && ef.field_path === f.field_path
      );

      const oldValue = fieldRecord ? fieldRecord.field_value : null;

      if (fieldRecord) {
        fieldRecord.field_value = f.field_value;
        fieldRecord.normalized_value = f.field_value;
        fieldRecord.is_manually_edited = true;
        fieldRecord.edited_by = userId;
        fieldRecord.edited_at = new Date().toISOString();
        fieldRecord.validation_status = 'valid';
      } else {
        fieldRecord = {
          id: uuidv4(),
          organization_id: orgId,
          document_id: docId,
          extraction_result_id: inMemoryDb.extractionResults.find(e => e.document_id === docId)?.id || uuidv4(),
          field_path: f.field_path,
          field_value: f.field_value,
          normalized_value: f.field_value,
          confidence: 1.0,
          evidence: [],
          validation_status: 'valid',
          is_manually_edited: true,
          edited_by: userId,
          edited_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        inMemoryDb.extractedFields.push(fieldRecord);
      }

      changesRecorded.push({
        field_path: f.field_path,
        old_value: oldValue,
        new_value: f.field_value,
      });
    });

    // Record review event
    inMemoryDb.reviewEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docId,
      actor_id: userId,
      action: 'field_edited',
      reason: 'Field manually corrected by reviewer',
      changes: changesRecorded,
      created_at: new Date().toISOString(),
    });

    // Re-run validation on invoice if updated
    if (doc.category === 'invoice') {
      const allFields = inMemoryDb.extractedFields.filter(ef => ef.document_id === docId);
      const invoiceData: Record<string, any> = {};
      allFields.forEach(af => {
        invoiceData[af.field_path] = af.field_value;
      });

      const reVal = validationService.validateInvoice(invoiceData as any, orgId, docId);
      // Remove old open issues and replace
      inMemoryDb.validationIssues = inMemoryDb.validationIssues.filter(
        i => !(i.document_id === docId && i.status === 'open')
      );
      reVal.issues.forEach(iss => {
        inMemoryDb.validationIssues.push({
          id: uuidv4(),
          ...iss,
          field_path: iss.field_path ?? null,
          extraction_result_id: null,
          created_at: new Date().toISOString(),
        });
      });
    }

    res.json({
      success: true,
      data: {
        updated_fields_count: fields.length,
        current_fields: inMemoryDb.extractedFields.filter(f => f.document_id === docId),
      },
    });
  }

  async resolveValidationIssue(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const issueId = req.params.issueId;
    const userId = req.user!.id;

    const issue = inMemoryDb.validationIssues.find(i => i.id === issueId && i.organization_id === orgId);
    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Validation issue not found.' },
      });
      return;
    }

    issue.status = 'resolved';
    issue.resolved_by = userId;
    issue.resolved_at = new Date().toISOString();

    res.json({ success: true, data: issue });
  }

  async dismissValidationIssue(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const issueId = req.params.issueId;
    const userId = req.user!.id;

    const issue = inMemoryDb.validationIssues.find(i => i.id === issueId && i.organization_id === orgId);
    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Validation issue not found.' },
      });
      return;
    }

    issue.status = 'dismissed';
    issue.resolved_by = userId;
    issue.resolved_at = new Date().toISOString();

    res.json({ success: true, data: issue });
  }
}

export const reviewController = new ReviewController();
