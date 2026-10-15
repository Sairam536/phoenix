import { Request, Response } from 'express';
import { exportService } from '../services/export.service.js';
import { inMemoryDb } from '../repositories/db.js';

export class ExportController {
  async exportCsv(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const result = await exportService.exportData(orgId, req.body);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  async exportJson(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const { data_type, category, limit = 1000 } = req.body;

    let payload: unknown = [];

    if (data_type === 'documents') {
      let docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);
      if (category) docs = docs.filter(d => d.category === category);
      payload = docs.slice(0, limit);
    } else if (data_type === 'reconciliations') {
      payload = inMemoryDb.reconciliations.filter(r => r.organization_id === orgId).slice(0, limit);
    } else if (data_type === 'validation_issues') {
      payload = inMemoryDb.validationIssues.filter(i => i.organization_id === orgId).slice(0, limit);
    } else {
      payload = inMemoryDb.auditEvents.filter(a => a.organization_id === orgId).slice(0, limit);
    }

    res.json({
      success: true,
      data: payload,
    });
  }

  async getAudit(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const { page = 1, limit = 20, action } = req.query as any;

    let events = inMemoryDb.auditEvents.filter(e => e.organization_id === orgId);
    if (action) {
      events = events.filter(e => e.action === action);
    }

    const total = events.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = events.slice(startIndex, startIndex + Number(limit));

    res.json({
      success: true,
      data: paginated,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total_items: total,
        total_pages: Math.ceil(total / Number(limit)) || 1,
      },
    });
  }

  async getValidationReport(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const issues = inMemoryDb.validationIssues.filter(i => i.organization_id === orgId);

    const severityCounts: Record<string, number> = { critical: 0, error: 0, warning: 0, info: 0 };
    const ruleCounts: Record<string, number> = {};

    issues.forEach(i => {
      severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
      ruleCounts[i.rule_code] = (ruleCounts[i.rule_code] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total_issues: issues.length,
        open_issues: issues.filter(i => i.status === 'open').length,
        resolved_issues: issues.filter(i => i.status === 'resolved').length,
        severity_breakdown: severityCounts,
        rule_breakdown: ruleCounts,
        issues: issues.slice(0, 50),
      },
    });
  }

  async getReconciliationReport(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const recons = inMemoryDb.reconciliations.filter(r => r.organization_id === orgId);

    const matched = recons.filter(r => r.status === 'matched').length;
    const mismatched = recons.filter(r => r.status === 'mismatched').length;
    const rejected = recons.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      data: {
        total_reconciliations: recons.length,
        matched,
        mismatched,
        rejected,
        match_rate: recons.length > 0 ? Math.round((matched / recons.length) * 100) : 100,
        reconciliations: recons.slice(0, 20),
      },
    });
  }
}

export const exportController = new ExportController();
