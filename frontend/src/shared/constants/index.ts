export const DOCUMENT_CATEGORIES = [
  'invoice',
  'purchase_order',
  'contract',
  'receipt',
  'report',
  'correspondence',
  'other',
  'unknown',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  invoice: 'Supplier Invoice',
  purchase_order: 'Purchase Order',
  contract: 'Contract or Agreement',
  receipt: 'Expense Receipt',
  report: 'Business Report',
  correspondence: 'Correspondence / Letter',
  other: 'Other Document',
  unknown: 'Unknown Category',
};

export const PROCESSING_STATUSES = [
  'uploaded',
  'queued',
  'extracting',
  'classifying',
  'extracting_fields',
  'validating',
  'needs_review',
  'approved',
  'rejected',
  'failed',
] as const;

export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const EXTRACTION_METHODS = [
  'pdf_text',
  'ocr',
  'docx_text',
  'plain_text',
  'other',
] as const;
export type ExtractionMethod = (typeof EXTRACTION_METHODS)[number];

export const USER_ROLES = ['owner', 'admin', 'reviewer', 'member'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_PERMISSIONS = {
  owner: ['org:manage', 'members:manage', 'docs:upload', 'docs:view', 'docs:review', 'docs:delete', 'settings:manage', 'export:all'],
  admin: ['members:manage', 'docs:upload', 'docs:view', 'docs:review', 'docs:delete', 'settings:view', 'export:all'],
  reviewer: ['docs:upload', 'docs:view', 'docs:review', 'export:standard'],
  member: ['docs:upload', 'docs:view', 'knowledge:ask'],
} as const;

export const VALIDATION_SEVERITY = ['info', 'warning', 'error', 'critical'] as const;
export type ValidationSeverity = (typeof VALIDATION_SEVERITY)[number];

export const VALIDATION_STATUSES = [
  'unverified',
  'valid',
  'warning',
  'invalid',
  'not_applicable',
] as const;
export type ValidationStatus = (typeof VALIDATION_STATUSES)[number];

export const ISSUE_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const RECONCILIATION_STATUSES = [
  'pending_review',
  'matched',
  'mismatched',
  'rejected',
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export const JOB_TYPES = [
  'full_processing',
  'reprocess',
  'reconciliation',
  'knowledge_indexing',
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = [
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

export const SUPPORTED_FILE_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.docx', '.txt'] as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20 MB
  MAX_PDF_PAGES: 100,
  MAX_BATCH_UPLOAD_FILES: 20,
  MAX_AI_INPUT_CHARS: 50000,
} as const;

export const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'SGD',
  'AED',
  'CHF',
] as const;
