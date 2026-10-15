import { Request, Response } from 'express';
import { inMemoryDb } from '../repositories/db.js';
import { jobProcessor } from '../workers/job-processor.js';

export class JobController {
  async listJobs(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const { page = 1, limit = 20, status } = req.query as any;

    let jobs = inMemoryDb.jobs.filter(j => j.organization_id === orgId);

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    const total = jobs.length;
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginated = jobs.slice(startIndex, startIndex + Number(limit));

    // Enrich with document title
    const enriched = paginated.map(j => {
      const doc = inMemoryDb.documents.find(d => d.id === j.document_id);
      return {
        ...j,
        document_title: doc?.title || 'Unknown Document',
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

  async getJob(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const jobId = req.params.jobId;

    const job = inMemoryDb.jobs.find(j => j.id === jobId && j.organization_id === orgId);
    if (!job) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found.' },
      });
      return;
    }

    const doc = inMemoryDb.documents.find(d => d.id === job.document_id);
    res.json({
      success: true,
      data: {
        ...job,
        document_title: doc?.title,
      },
    });
  }

  async retryJob(req: Request, res: Response): Promise<void> {
    const orgId = req.organizationId!;
    const jobId = req.params.jobId;

    const job = inMemoryDb.jobs.find(j => j.id === jobId && j.organization_id === orgId);
    if (!job) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found.' },
      });
      return;
    }

    job.status = 'queued';
    job.stage = 'retry_queued';
    job.error_code = null;
    job.error_message = null;
    job.updated_at = new Date().toISOString();

    const doc = inMemoryDb.documents.find(d => d.id === job.document_id);
    if (doc) {
      doc.processing_status = 'queued';
    }

    // Trigger worker tick
    setTimeout(() => jobProcessor.tick(), 100);

    res.json({ success: true, data: job });
  }
}

export const jobController = new JobController();
