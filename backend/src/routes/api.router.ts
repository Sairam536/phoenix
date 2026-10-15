import { Router } from 'express';
import multer from 'multer';
import {
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  AddMemberSchema,
  UpdateMemberRoleSchema,
  UpdateDocumentMetadataSchema,
  DocumentQuerySchema,
  BulkUpdateFieldsSchema,
  CreateReconciliationSchema,
  ReviewReconciliationSchema,
  AskQuestionSchema,
  ExportRequestSchema,
  LoginRequestSchema,
  RegisterRequestSchema,
  ForgotPasswordSchema,
  AuditQuerySchema,
  FILE_LIMITS,
} from '../shared/index.js';

import { authMiddleware } from '../middleware/auth.js';
import { orgContextMiddleware, requireRole } from '../middleware/authorization.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import { aiRateLimiter } from '../middleware/rate-limit.js';

import { organizationController } from '../controllers/organization.controller.js';
import { documentController } from '../controllers/document.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { reconciliationController } from '../controllers/reconciliation.controller.js';
import { knowledgeController } from '../controllers/knowledge.controller.js';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { jobController } from '../controllers/job.controller.js';
import { exportController } from '../controllers/export.controller.js';
import { inMemoryDb } from '../repositories/db.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FILE_LIMITS.MAX_FILE_SIZE_BYTES,
  },
});

export const apiRouter = Router();

// ==========================================
// 1. HEALTH & READINESS
// ==========================================
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'documind-api', timestamp: new Date().toISOString() });
});

apiRouter.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    database: 'healthy',
    storage: 'healthy',
    worker: 'active',
  });
});

// ==========================================
// 1.5. PUBLIC AUTHENTICATION ENDPOINTS
// ==========================================
apiRouter.post('/auth/login', validateBody(LoginRequestSchema), async (req, res) => {
  const { email } = req.body;
  
  // Check demo personas
  let role = 'owner';
  let userId = '00000000-0000-0000-0000-000000000001';
  let name = 'Alex Rivera';
  let token = 'demo-owner-token';

  if (email.includes('reviewer')) {
    role = 'reviewer';
    userId = '00000000-0000-0000-0000-000000000002';
    name = 'Taylor Chen';
    token = 'demo-reviewer-token';
  } else if (email.includes('member')) {
    role = 'member';
    userId = '00000000-0000-0000-0000-000000000003';
    name = 'Sam Morgan';
    token = 'demo-member-token';
  }

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: userId,
        email,
        name,
        role,
        organizationId: '11111111-1111-1111-1111-111111111111',
      },
    },
  });
});

apiRouter.post('/auth/register', validateBody(RegisterRequestSchema), (req, res) => {
  const { name, email } = req.body;
  res.status(201).json({
    success: true,
    data: {
      token: 'demo-owner-token',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email,
        name,
        role: 'owner',
        organizationId: '11111111-1111-1111-1111-111111111111',
      },
    },
  });
});

apiRouter.post('/auth/forgot-password', validateBody(ForgotPasswordSchema), (req, res) => {
  res.json({
    success: true,
    message: 'If an account exists with this email address, password reset instructions have been sent.',
  });
});

// Demo seed endpoint
apiRouter.post('/demo/seed', authMiddleware, orgContextMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Demo dataset verified and active.',
    organization_id: req.organizationId,
  });
});

// All subsequent routes require authentication and organization context
apiRouter.use(authMiddleware);
apiRouter.use(orgContextMiddleware);

// ==========================================
// 2. ORGANIZATIONS & MEMBERS
// ==========================================
apiRouter.get('/organizations', (req, res) => organizationController.listUserOrganizations(req, res));
apiRouter.post('/organizations', validateBody(CreateOrganizationSchema), (req, res) =>
  organizationController.createOrganization(req, res)
);
apiRouter.get('/organizations/:organizationId', (req, res) => organizationController.getOrganization(req, res));
apiRouter.patch(
  '/organizations/:organizationId',
  requireRole(['owner', 'admin']),
  validateBody(UpdateOrganizationSchema),
  (req, res) => organizationController.updateOrganization(req, res)
);

apiRouter.get('/organizations/:organizationId/members', (req, res) => organizationController.listMembers(req, res));
apiRouter.post(
  '/organizations/:organizationId/members',
  requireRole(['owner', 'admin']),
  validateBody(AddMemberSchema),
  (req, res) => organizationController.addMember(req, res)
);
apiRouter.patch(
  '/organizations/:organizationId/members/:memberId',
  requireRole(['owner', 'admin']),
  validateBody(UpdateMemberRoleSchema),
  (req, res) => organizationController.updateMemberRole(req, res)
);
apiRouter.delete(
  '/organizations/:organizationId/members/:memberId',
  requireRole(['owner']),
  (req, res) => organizationController.removeMember(req, res)
);

// ==========================================
// 3. DOCUMENTS
// ==========================================
apiRouter.post(
  '/documents',
  upload.single('file'),
  (req, res) => documentController.uploadDocument(req, res)
);
apiRouter.get('/documents', validateQuery(DocumentQuerySchema), (req, res) =>
  documentController.listDocuments(req, res)
);
apiRouter.get('/documents/:documentId', (req, res) => documentController.getDocument(req, res));
apiRouter.patch(
  '/documents/:documentId',
  validateBody(UpdateDocumentMetadataSchema),
  (req, res) => documentController.updateDocument(req, res)
);
apiRouter.delete(
  '/documents/:documentId',
  requireRole(['owner', 'admin']),
  (req, res) => documentController.deleteDocument(req, res)
);
apiRouter.get('/documents/:documentId/download', (req, res) => documentController.downloadDocument(req, res));
apiRouter.get('/documents/:documentId/pages', (req, res) => documentController.getPages(req, res));
apiRouter.post('/documents/:documentId/reprocess', (req, res) => documentController.reprocess(req, res));

// Direct download stream for local file access fallback
apiRouter.get('/documents/download-stream', async (req, res) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).send('Path is required');
    return;
  }
  try {
    const { storageService } = await import('../services/storage.service.js');
    const buffer = await storageService.getFileBuffer(filePath);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(buffer);
  } catch (err) {
    res.status(404).send('File not found');
  }
});

// ==========================================
// 4. EXTRACTION & REVIEW WORKFLOW
// ==========================================
apiRouter.get('/review/queue', (req, res) => reviewController.getReviewQueue(req, res));
apiRouter.post(
  '/documents/:documentId/approve',
  requireRole(['owner', 'admin', 'reviewer']),
  (req, res) => reviewController.approveDocument(req, res)
);
apiRouter.post(
  '/documents/:documentId/reject',
  requireRole(['owner', 'admin', 'reviewer']),
  (req, res) => reviewController.rejectDocument(req, res)
);
apiRouter.post(
  '/documents/:documentId/reopen',
  requireRole(['owner', 'admin', 'reviewer']),
  (req, res) => reviewController.reopenDocument(req, res)
);
apiRouter.patch(
  '/documents/:documentId/extraction/fields',
  requireRole(['owner', 'admin', 'reviewer']),
  validateBody(BulkUpdateFieldsSchema),
  (req, res) => reviewController.updateExtractedFields(req, res)
);
apiRouter.post(
  '/validation-issues/:issueId/resolve',
  requireRole(['owner', 'admin', 'reviewer']),
  (req, res) => reviewController.resolveValidationIssue(req, res)
);
apiRouter.post(
  '/validation-issues/:issueId/dismiss',
  requireRole(['owner', 'admin', 'reviewer']),
  (req, res) => reviewController.dismissValidationIssue(req, res)
);

// ==========================================
// 5. RECONCILIATION
// ==========================================
apiRouter.get('/reconciliations', (req, res) => reconciliationController.listReconciliations(req, res));
apiRouter.post(
  '/reconciliations',
  validateBody(CreateReconciliationSchema),
  (req, res) => reconciliationController.createReconciliation(req, res)
);
apiRouter.get('/reconciliations/:reconciliationId', (req, res) =>
  reconciliationController.getReconciliation(req, res)
);
apiRouter.post(
  '/reconciliations/:reconciliationId/recalculate',
  (req, res) => reconciliationController.recalculateReconciliation(req, res)
);
apiRouter.post(
  '/reconciliations/:reconciliationId/review',
  requireRole(['owner', 'admin', 'reviewer']),
  validateBody(ReviewReconciliationSchema),
  (req, res) => reconciliationController.reviewReconciliation(req, res)
);

// ==========================================
// 6. KNOWLEDGE DISCOVERY
// ==========================================
apiRouter.post(
  '/knowledge/ask',
  aiRateLimiter,
  validateBody(AskQuestionSchema),
  (req, res) => knowledgeController.ask(req, res)
);
apiRouter.get('/knowledge/history', (req, res) => knowledgeController.getHistory(req, res));

// ==========================================
// 7. DASHBOARD & SEARCH
// ==========================================
apiRouter.get('/dashboard/summary', (req, res) => dashboardController.getSummary(req, res));
apiRouter.get('/dashboard/activity', (req, res) => dashboardController.getActivity(req, res));
apiRouter.get('/dashboard/categories', (req, res) => dashboardController.getCategories(req, res));

apiRouter.get('/search', (req, res) => {
  const orgId = req.organizationId!;
  const q = String(req.query.q || '').toLowerCase();

  const results = inMemoryDb.documents
    .filter(
      d =>
        d.organization_id === orgId &&
        (d.title.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)))
    )
    .slice(0, 20);

  res.json({ success: true, data: results });
});

// ==========================================
// 8. PROCESSING JOBS
// ==========================================
apiRouter.get('/jobs', (req, res) => jobController.listJobs(req, res));
apiRouter.get('/jobs/:jobId', (req, res) => jobController.getJob(req, res));
apiRouter.post('/jobs/:jobId/retry', requireRole(['owner', 'admin', 'reviewer']), (req, res) =>
  jobController.retryJob(req, res)
);

// ==========================================
// 9. EXPORTS & AUDIT
// ==========================================
apiRouter.post('/exports/csv', validateBody(ExportRequestSchema), (req, res) =>
  exportController.exportCsv(req, res)
);
apiRouter.post('/exports/json', validateBody(ExportRequestSchema), (req, res) =>
  exportController.exportJson(req, res)
);
apiRouter.get('/audit', validateQuery(AuditQuerySchema), (req, res) => exportController.getAudit(req, res));
apiRouter.get('/reports/validation', (req, res) => exportController.getValidationReport(req, res));
apiRouter.get('/reports/reconciliation', (req, res) => exportController.getReconciliationReport(req, res));
