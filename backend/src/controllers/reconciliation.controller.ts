import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { inMemoryDb } from '../repositories/db.js';
import { reconciliationService } from '../services/reconciliation.service.js';

export class ReconciliationController {
  async listReconciliations(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const recons = inMemoryDb.reconciliations.filter(r => r.organization_id === orgId);

    // Join document titles
    const enriched = recons.map(r => {
      const invDoc = inMemoryDb.documents.find(d => d.id === r.invoice_document_id);
      const poDoc = inMemoryDb.documents.find(d => d.id === r.purchase_order_document_id);
      return {
        ...r,
        invoice_document: invDoc ? { id: invDoc.id, title: invDoc.title, category: invDoc.category } : null,
        purchase_order_document: poDoc ? { id: poDoc.id, title: poDoc.title, category: poDoc.category } : null,
      };
    });

    res.json({ success: true, data: enriched });
  }

  async createReconciliation(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const userId = req.user!.id;
    const { invoice_document_id, purchase_order_document_id, tolerance_config } = req.body;

    // Both documents must belong to the current organization
    const invDoc = inMemoryDb.documents.find(d => d.id === invoice_document_id && d.organization_id === orgId);
    const poDoc = inMemoryDb.documents.find(d => d.id === purchase_order_document_id && d.organization_id === orgId);

    if (!invDoc || !poDoc) {
      res.status(404).json({
        success: false,
        error: { code: 'DOCUMENTS_NOT_FOUND', message: 'One or both documents not found in organization.' },
      });
      return;
    }

    if (invDoc.category !== 'invoice' && invDoc.category !== 'unknown') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'First document must be an Invoice.' },
      });
      return;
    }

    if (poDoc.category !== 'purchase_order' && poDoc.category !== 'unknown') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Second document must be a Purchase Order.' },
      });
      return;
    }

    // Get extraction results
    const invExt = inMemoryDb.extractionResults.find(e => e.document_id === invoice_document_id);
    const poExt = inMemoryDb.extractionResults.find(e => e.document_id === purchase_order_document_id);

    const invData = (invExt?.extracted_data || {}) as any;
    const poData = (poExt?.extracted_data || {}) as any;

    const tolerance = tolerance_config || { amount_tolerance: 0.01, percentage_tolerance: 0.5 };
    const comparison = reconciliationService.reconcile(invData, poData, tolerance);

    const reconId = uuidv4();
    const reconRecord = {
      id: reconId,
      organization_id: orgId,
      invoice_document_id,
      purchase_order_document_id,
      status: comparison.match_status,
      comparison_result: comparison as unknown as Record<string, unknown>,
      tolerance_config: tolerance,
      created_by: userId,
      reviewed_by: null,
      reviewed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    inMemoryDb.reconciliations.unshift(reconRecord);

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'reconciliation_created',
      entity_type: 'reconciliation',
      entity_id: reconId,
      metadata: { status: comparison.match_status },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        ...reconRecord,
        invoice_document: { id: invDoc.id, title: invDoc.title },
        purchase_order_document: { id: poDoc.id, title: poDoc.title },
      },
    });
  }

  async getReconciliation(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const reconId = req.params.reconciliationId;

    const recon = inMemoryDb.reconciliations.find(r => r.id === reconId && r.organization_id === orgId);
    if (!recon) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reconciliation record not found.' },
      });
      return;
    }

    const invDoc = inMemoryDb.documents.find(d => d.id === recon.invoice_document_id);
    const poDoc = inMemoryDb.documents.find(d => d.id === recon.purchase_order_document_id);

    res.json({
      success: true,
      data: {
        ...recon,
        invoice_document: invDoc ? { id: invDoc.id, title: invDoc.title, category: invDoc.category } : null,
        purchase_order_document: poDoc ? { id: poDoc.id, title: poDoc.title, category: poDoc.category } : null,
      },
    });
  }

  async recalculateReconciliation(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const reconId = req.params.reconciliationId;
    const { tolerance_config } = req.body;

    const recon = inMemoryDb.reconciliations.find(r => r.id === reconId && r.organization_id === orgId);
    if (!recon) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reconciliation record not found.' },
      });
      return;
    }

    const invExt = inMemoryDb.extractionResults.find(e => e.document_id === recon.invoice_document_id);
    const poExt = inMemoryDb.extractionResults.find(e => e.document_id === recon.purchase_order_document_id);

    const invData = (invExt?.extracted_data || {}) as any;
    const poData = (poExt?.extracted_data || {}) as any;

    const tolerance = tolerance_config || recon.tolerance_config;
    const comparison = reconciliationService.reconcile(invData, poData, tolerance);

    recon.comparison_result = comparison as unknown as Record<string, unknown>;
    recon.tolerance_config = tolerance;
    recon.status = comparison.match_status;
    recon.updated_at = new Date().toISOString();

    res.json({ success: true, data: recon });
  }

  async reviewReconciliation(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const reconId = req.params.reconciliationId;
    const userId = req.user!.id;
    const { status, review_note } = req.body;

    const recon = inMemoryDb.reconciliations.find(r => r.id === reconId && r.organization_id === orgId);
    if (!recon) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Reconciliation record not found.' },
      });
      return;
    }

    recon.status = status;
    recon.reviewed_by = userId;
    recon.reviewed_at = new Date().toISOString();
    recon.updated_at = new Date().toISOString();

    inMemoryDb.auditEvents.push({
      id: uuidv4(),
      organization_id: orgId,
      actor_id: userId,
      action: 'reconciliation_reviewed',
      entity_type: 'reconciliation',
      entity_id: reconId,
      metadata: { status, review_note },
      request_id: req.id ? String(req.id) : null,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, data: recon });
  }
}

export const reconciliationController = new ReconciliationController();
