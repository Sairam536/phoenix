import { Request, Response } from 'express';
import { inMemoryDb } from '../repositories/db.js';

export class DashboardController {
  async getSummary(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);
    const issues = inMemoryDb.validationIssues.filter(i => i.organization_id === orgId && i.status === 'open');

    const total = docs.length;
    const awaitingReview = docs.filter(
      d => d.processing_status === 'needs_review' || d.review_status === 'pending'
    ).length;
    const approved = docs.filter(d => d.review_status === 'approved').length;
    const failed = docs.filter(d => d.processing_status === 'failed').length;
    const processedSuccess = docs.filter(d => d.processing_status !== 'failed' && d.processing_status !== 'queued' && d.processing_status !== 'uploaded').length;

    const successRate = total > 0 ? Math.round(((total - failed) / total) * 100) : 100;

    res.json({
      success: true,
      data: {
        total_documents: total,
        awaiting_review: awaitingReview,
        approved_documents: approved,
        failed_documents: failed,
        validation_warnings: issues.length,
        processed_success: processedSuccess,
        processing_success_rate: successRate,
      },
    });
  }

  async getActivity(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);

    // Group by date (last 7 days)
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = 0;
    }

    docs.forEach(doc => {
      const dateKey = doc.created_at.split('T')[0];
      if (daysMap[dateKey] !== undefined) {
        daysMap[dateKey]++;
      }
    });

    const activity = Object.entries(daysMap).map(([date, count]) => ({
      date,
      count,
    }));

    res.json({ success: true, data: activity });
  }

  async getCategories(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);

    const counts: Record<string, number> = {};
    docs.forEach(doc => {
      counts[doc.category] = (counts[doc.category] || 0) + 1;
    });

    const categories = Object.entries(counts).map(([category, count]) => ({
      category,
      count,
      percentage: docs.length > 0 ? Math.round((count / docs.length) * 100) : 0,
    }));

    res.json({ success: true, data: categories });
  }
}

export const dashboardController = new DashboardController();
