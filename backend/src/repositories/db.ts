import { v4 as uuidv4 } from 'uuid';
import {
  DocumentCategory,
  ProcessingStatus,
  ReviewStatus,
  UserRole,
  ValidationStatus,
  ReconciliationStatus,
  JobStatus,
  JobType,
} from '../shared/index.js';
import { getSupabaseAdminClient } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

// Types mirroring the database schema
export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRecord {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface DocumentDbRecord {
  id: string;
  organization_id: string;
  uploaded_by: string;
  title: string;
  description: string | null;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  category: DocumentCategory;
  processing_status: ProcessingStatus;
  review_status: ReviewStatus;
  extraction_schema_version: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  uploaded_at: string;
  processed_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentPageDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  page_number: number;
  extracted_text: string;
  extraction_method: 'pdf_text' | 'ocr' | 'docx_text' | 'plain_text' | 'other';
  extraction_metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProcessingJobDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  job_type: JobType;
  status: JobStatus;
  stage: string | null;
  attempt_count: number;
  max_attempts: number;
  idempotency_key: string | null;
  error_code: string | null;
  error_message: string | null;
  worker_id: string | null;
  started_at: string | null;
  finished_at: string | null;
  next_retry_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractionResultDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  processing_job_id: string | null;
  schema_version: string;
  extracted_data: Record<string, unknown>;
  classification: Record<string, unknown>;
  extraction_confidence: number | null;
  validation_summary: Record<string, unknown>;
  model_name: string | null;
  prompt_version: string | null;
  created_at: string;
  created_by: string | null;
}

export interface ExtractedFieldDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  extraction_result_id: string;
  field_path: string;
  field_value: unknown;
  normalized_value: unknown;
  confidence: number | null;
  evidence: Array<{ page?: number | null; quote: string; confidence?: number | null; verified?: boolean }>;
  validation_status: ValidationStatus;
  is_manually_edited: boolean;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationIssueDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  extraction_result_id: string | null;
  rule_code: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  field_path: string | null;
  message: string;
  expected_value?: unknown;
  actual_value?: unknown;
  status: 'open' | 'resolved' | 'dismissed';
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface ReconciliationDbRecord {
  id: string;
  organization_id: string;
  invoice_document_id: string;
  purchase_order_document_id: string;
  status: ReconciliationStatus;
  comparison_result: Record<string, unknown>;
  tolerance_config: Record<string, unknown>;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewEventDbRecord {
  id: string;
  organization_id: string;
  document_id: string;
  actor_id: string;
  action: 'field_edited' | 'approved' | 'rejected' | 'reopened' | 'validation_resolved';
  reason: string | null;
  changes: Array<Record<string, unknown>>;
  created_at: string;
}

export interface AuditEventDbRecord {
  id: string;
  organization_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  created_at: string;
}

export interface KnowledgeQueryDbRecord {
  id: string;
  organization_id: string;
  user_id: string;
  question: string;
  answer: string | null;
  source_references: Array<{ document_id: string; document_title?: string; page?: number | null; quote: string }>;
  status: 'pending' | 'completed' | 'failed';
  model_name: string | null;
  prompt_version: string | null;
  error_code: string | null;
  created_at: string;
  completed_at: string | null;
}

// In-memory relational storage seeded with synthetic records
class InMemoryDatabase {
  organizations: OrganizationRecord[] = [];
  members: OrganizationMemberRecord[] = [];
  documents: DocumentDbRecord[] = [];
  pages: DocumentPageDbRecord[] = [];
  jobs: ProcessingJobDbRecord[] = [];
  extractionResults: ExtractionResultDbRecord[] = [];
  extractedFields: ExtractedFieldDbRecord[] = [];
  validationIssues: ValidationIssueDbRecord[] = [];
  reconciliations: ReconciliationDbRecord[] = [];
  reviewEvents: ReviewEventDbRecord[] = [];
  auditEvents: AuditEventDbRecord[] = [];
  knowledgeQueries: KnowledgeQueryDbRecord[] = [];

  constructor() {
    this.seedDemoData();
  }

  private seedDemoData() {
    const orgId = '11111111-1111-1111-1111-111111111111';
    const userId = '00000000-0000-0000-0000-000000000001';
    const docInv1 = '22222222-2222-2222-2222-222222222221';
    const docPo1 = '22222222-2222-2222-2222-222222222222';
    const docInv2 = '22222222-2222-2222-2222-222222222223';
    const docContract = '22222222-2222-2222-2222-222222222224';
    const docReceipt = '22222222-2222-2222-2222-222222222225';
    const extInv1 = '33333333-3333-3333-3333-333333333331';
    const extPo1 = '33333333-3333-3333-3333-333333333332';

    // 1. Organization
    this.organizations.push({
      id: orgId,
      name: 'Apex Logistics & Industrial Corp',
      slug: 'apex-logistics',
      created_by: userId,
      settings: { currency: 'USD', tolerance_amount: 0.05, auto_classify: true },
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 2. Member
    this.members.push({
      id: uuidv4(),
      organization_id: orgId,
      user_id: userId,
      role: 'owner',
      user_email: 'admin@apexlogistics.demo',
      user_name: 'Alex Rivera (Apex Owner)',
      created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Add Reviewer member
    this.members.push({
      id: uuidv4(),
      organization_id: orgId,
      user_id: '00000000-0000-0000-0000-000000000002',
      role: 'reviewer',
      user_email: 'reviewer@apexlogistics.demo',
      user_name: 'Taylor Chen (Senior Reviewer)',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 3. Document 1: Invoice 4401
    this.documents.push({
      id: docInv1,
      organization_id: orgId,
      uploaded_by: userId,
      title: 'TechGear Solutions - Inv 4401',
      description: 'Procurement of 4K displays and quad docks',
      original_filename: 'invoice_4401.pdf',
      storage_path: `${orgId}/${docInv1}/invoice_4401.pdf`,
      mime_type: 'application/pdf',
      file_size_bytes: 145200,
      sha256_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      category: 'invoice',
      processing_status: 'needs_review',
      review_status: 'pending',
      extraction_schema_version: 'invoice.v1',
      tags: ['hardware', 'q3-procurement'],
      metadata: {},
      uploaded_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 2 * 86400000 + 4000).toISOString(),
      approved_at: null,
      approved_by: null,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Page 1 for Inv 4401
    this.pages.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docInv1,
      page_number: 1,
      extracted_text: `TECHGEAR SOLUTIONS INC.
1200 Innovation Way, Austin, TX 78759
Tax ID: US-82-4910291
INVOICE: INV-2026-4401
Date: 2026-09-15 | Due Date: 2026-10-15
PO Reference: PO-8820
Bill To: Apex Logistics & Industrial Corp
Line Items:
1. UltraSharp 27" 4K Monitor (U2723QE) | Qty: 4 | Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Quad Display Dock | Qty: 4 | Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax (0%): $0.00 | Discount: $0.00
Total Due: $2,360.00 USD
Payment Terms: Net 30 days via Wire Transfer`,
      extraction_method: 'pdf_text',
      extraction_metadata: { word_count: 82 },
      created_at: new Date().toISOString(),
    });

    // Extraction result for Inv 4401
    this.extractionResults.push({
      id: extInv1,
      organization_id: orgId,
      document_id: docInv1,
      processing_job_id: null,
      schema_version: 'invoice.v1',
      extracted_data: {
        supplier_name: 'TechGear Solutions Inc.',
        supplier_address: '1200 Innovation Way, Austin, TX 78759',
        supplier_tax_id: 'US-82-4910291',
        invoice_number: 'INV-2026-4401',
        invoice_date: '2026-09-15',
        due_date: '2026-10-15',
        currency: 'USD',
        subtotal: '2360.00',
        tax_amount: '0.00',
        discount: '0.00',
        total_amount: '2360.00',
        payment_terms: 'Net 30 days via Wire Transfer',
        purchase_order_reference: 'PO-8820',
        line_items: [
          { description: 'UltraSharp 27" 4K Monitor (U2723QE)', quantity: '4', unit_price: '450.00', line_total: '1800.00', page: 1 },
          { description: 'Thunderbolt 4 Quad Display Dock', quantity: '4', unit_price: '140.00', line_total: '560.00', page: 1 },
        ],
      },
      classification: {
        category: 'invoice',
        confidence: 0.98,
        reason: 'Contains supplier details, line items, tax ID, and invoice number',
        recommended_schema: 'invoice',
      },
      extraction_confidence: 0.97,
      validation_summary: { issues_count: 0, status: 'valid' },
      model_name: 'gemini-1.5-pro',
      prompt_version: 'v1.0',
      created_at: new Date().toISOString(),
      created_by: userId,
    });

    // Fields for Inv 4401
    this.extractedFields.push(
      {
        id: uuidv4(),
        organization_id: orgId,
        document_id: docInv1,
        extraction_result_id: extInv1,
        field_path: 'invoice_number',
        field_value: 'INV-2026-4401',
        normalized_value: 'INV-2026-4401',
        confidence: 0.99,
        evidence: [{ page: 1, quote: 'INVOICE: INV-2026-4401', verified: true }],
        validation_status: 'valid',
        is_manually_edited: false,
        edited_by: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        organization_id: orgId,
        document_id: docInv1,
        extraction_result_id: extInv1,
        field_path: 'supplier_name',
        field_value: 'TechGear Solutions Inc.',
        normalized_value: 'TechGear Solutions Inc.',
        confidence: 0.98,
        evidence: [{ page: 1, quote: 'TECHGEAR SOLUTIONS INC.', verified: true }],
        validation_status: 'valid',
        is_manually_edited: false,
        edited_by: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        organization_id: orgId,
        document_id: docInv1,
        extraction_result_id: extInv1,
        field_path: 'total_amount',
        field_value: '2360.00',
        normalized_value: 2360.00,
        confidence: 0.99,
        evidence: [{ page: 1, quote: 'Total Due: $2,360.00 USD', verified: true }],
        validation_status: 'valid',
        is_manually_edited: false,
        edited_by: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        organization_id: orgId,
        document_id: docInv1,
        extraction_result_id: extInv1,
        field_path: 'purchase_order_reference',
        field_value: 'PO-8820',
        normalized_value: 'PO-8820',
        confidence: 0.96,
        evidence: [{ page: 1, quote: 'PO Reference: PO-8820', verified: true }],
        validation_status: 'valid',
        is_manually_edited: false,
        edited_by: null,
        edited_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    );

    // 4. Document 2: Purchase Order PO-8820
    this.documents.push({
      id: docPo1,
      organization_id: orgId,
      uploaded_by: userId,
      title: 'Purchase Order PO-8820 - TechGear Solutions',
      description: 'Approved PO for engineering hardware refresh',
      original_filename: 'po_8820.pdf',
      storage_path: `${orgId}/${docPo1}/po_8820.pdf`,
      mime_type: 'application/pdf',
      file_size_bytes: 112400,
      sha256_hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      category: 'purchase_order',
      processing_status: 'approved',
      review_status: 'approved',
      extraction_schema_version: 'purchase_order.v1',
      tags: ['hardware', 'po'],
      metadata: {},
      uploaded_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 4 * 86400000 + 3000).toISOString(),
      approved_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      approved_by: userId,
      created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.pages.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docPo1,
      page_number: 1,
      extracted_text: `PURCHASE ORDER: PO-8820
Buyer: Apex Logistics & Industrial Corp
Supplier: TechGear Solutions Inc.
Issue Date: 2026-09-10
Expected Delivery: 2026-09-22
Currency: USD
Items:
1. UltraSharp 27" 4K Monitor | Qty: 4 | Unit Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Docking Station | Qty: 4 | Unit Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax: $0.00 | Total Amount: $2,360.00 USD
Delivery: 450 Logistics Hub Parkway, Dallas TX 75201`,
      extraction_method: 'pdf_text',
      extraction_metadata: { word_count: 75 },
      created_at: new Date().toISOString(),
    });

    this.extractionResults.push({
      id: extPo1,
      organization_id: orgId,
      document_id: docPo1,
      processing_job_id: null,
      schema_version: 'purchase_order.v1',
      extracted_data: {
        purchase_order_number: 'PO-8820',
        buyer_name: 'Apex Logistics & Industrial Corp',
        supplier_name: 'TechGear Solutions Inc.',
        issue_date: '2026-09-10',
        expected_delivery_date: '2026-09-22',
        currency: 'USD',
        subtotal: '2360.00',
        tax_amount: '0.00',
        total_amount: '2360.00',
        delivery_address: '450 Logistics Hub Parkway, Dallas TX 75201',
        line_items: [
          { description: 'UltraSharp 27" 4K Monitor', quantity: '4', unit_price: '450.00', line_total: '1800.00', page: 1 },
          { description: 'Thunderbolt 4 Docking Station', quantity: '4', unit_price: '140.00', line_total: '560.00', page: 1 },
        ],
      },
      classification: {
        category: 'purchase_order',
        confidence: 0.99,
        reason: 'Explicit purchase order document with items, quantities, and delivery instructions',
        recommended_schema: 'purchase_order',
      },
      extraction_confidence: 0.99,
      validation_summary: { issues_count: 0, status: 'valid' },
      model_name: 'gemini-1.5-pro',
      prompt_version: 'v1.0',
      created_at: new Date().toISOString(),
      created_by: userId,
    });

    // 5. Document 3: Mismatched Invoice
    this.documents.push({
      id: docInv2,
      organization_id: orgId,
      uploaded_by: userId,
      title: 'Global Office Depot - Inv 9912',
      description: 'Furniture and whiteboard supplies',
      original_filename: 'invoice_9912.pdf',
      storage_path: `${orgId}/${docInv2}/invoice_9912.pdf`,
      mime_type: 'application/pdf',
      file_size_bytes: 98300,
      sha256_hash: 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
      category: 'invoice',
      processing_status: 'needs_review',
      review_status: 'pending',
      extraction_schema_version: 'invoice.v1',
      tags: ['furniture', 'facilities'],
      metadata: {},
      uploaded_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 1 * 86400000 + 2000).toISOString(),
      approved_at: null,
      approved_by: null,
      created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Validation issue on docInv2
    this.validationIssues.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docInv2,
      extraction_result_id: null,
      rule_code: 'MISSING_PURCHASE_ORDER_REFERENCE',
      severity: 'warning',
      field_path: 'purchase_order_reference',
      message: 'No purchase order reference found in invoice text.',
      expected_value: 'PO-XXXX',
      actual_value: null,
      status: 'open',
      created_at: new Date().toISOString(),
    });

    // 6. Document 4: MSA Contract
    this.documents.push({
      id: docContract,
      organization_id: orgId,
      uploaded_by: userId,
      title: 'CloudScale Master Services Agreement',
      description: 'Cloud infrastructure terms 2026-2028',
      original_filename: 'msa_cloudscale_2026.pdf',
      storage_path: `${orgId}/${docContract}/msa_cloudscale_2026.pdf`,
      mime_type: 'application/pdf',
      file_size_bytes: 342100,
      sha256_hash: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
      category: 'contract',
      processing_status: 'approved',
      review_status: 'approved',
      extraction_schema_version: 'contract.v1',
      tags: ['legal', 'cloud', 'sla'],
      metadata: {},
      uploaded_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 6 * 86400000 + 5000).toISOString(),
      approved_at: new Date(Date.now() - 5 * 86400000).toISOString(),
      approved_by: userId,
      created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    this.pages.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docContract,
      page_number: 1,
      extracted_text: `MASTER SERVICES AGREEMENT
Parties: CloudScale Infrastructure Inc. ("Provider") and Apex Logistics & Industrial Corp ("Client").
Effective Date: October 1, 2026. Term: 24 Months ending September 30, 2028.
Payment Terms: Monthly billing, net 15 days upon invoice receipt.
Uptime SLA: 99.95% availability for production clusters with 10% credit for breaches.
Governing Law: State of Delaware.`,
      extraction_method: 'pdf_text',
      extraction_metadata: { word_count: 55 },
      created_at: new Date().toISOString(),
    });

    // 7. Document 5: Expense Receipt
    this.documents.push({
      id: docReceipt,
      organization_id: orgId,
      uploaded_by: userId,
      title: 'Airport Shuttle Travel Receipt',
      description: 'Ground transportation for on-site audit',
      original_filename: 'receipt_airport.jpg',
      storage_path: `${orgId}/${docReceipt}/receipt_airport.jpg`,
      mime_type: 'image/jpeg',
      file_size_bytes: 82400,
      sha256_hash: '8f434346648f6b96df89dda901c5176b10e6d05961',
      category: 'receipt',
      processing_status: 'approved',
      review_status: 'approved',
      extraction_schema_version: 'receipt.v1',
      tags: ['travel', 'expenses'],
      metadata: {},
      uploaded_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      processed_at: new Date(Date.now() - 3 * 86400000 + 4000).toISOString(),
      approved_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      approved_by: userId,
      created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 8. Reconciliation between Inv 4401 and PO 8820
    this.reconciliations.push({
      id: uuidv4(),
      organization_id: orgId,
      invoice_document_id: docInv1,
      purchase_order_document_id: docPo1,
      status: 'matched',
      comparison_result: {
        match_status: 'matched',
        supplier_match: { matched: true, invoice_supplier: 'TechGear Solutions Inc.', po_supplier: 'TechGear Solutions Inc.' },
        currency_match: { matched: true, invoice_currency: 'USD', po_currency: 'USD' },
        po_reference_match: { matched: true, expected_po: 'PO-8820', invoice_referenced_po: 'PO-8820' },
        amount_comparison: { invoice_total: 2360.00, po_total: 2360.00, total_diff: 0.00, within_tolerance: true },
        line_item_comparisons: [
          { description: 'UltraSharp 27" 4K Monitor', invoice_quantity: 4, po_quantity: 4, quantity_diff: 0, status: 'matched' },
          { description: 'Thunderbolt 4 Quad Display Dock', invoice_quantity: 4, po_quantity: 4, quantity_diff: 0, status: 'matched' },
        ],
        discrepancies: [],
      },
      tolerance_config: { amount_tolerance: 0.01, percentage_tolerance: 0.5 },
      created_by: userId,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 9. Processing Job record for demonstration
    this.jobs.push({
      id: uuidv4(),
      organization_id: orgId,
      document_id: docInv1,
      job_type: 'full_processing',
      status: 'succeeded',
      stage: 'completed',
      attempt_count: 1,
      max_attempts: 3,
      idempotency_key: `${docInv1}-full`,
      error_code: null,
      error_message: null,
      worker_id: 'worker-primary-1',
      started_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      finished_at: new Date(Date.now() - 2 * 86400000 + 4000).toISOString(),
      next_retry_at: null,
      created_by: userId,
      created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    // 10. Audit Events
    this.auditEvents.push(
      {
        id: uuidv4(),
        organization_id: orgId,
        actor_id: userId,
        action: 'organization_created',
        entity_type: 'organization',
        entity_id: orgId,
        metadata: { name: 'Apex Logistics & Industrial Corp', slug: 'apex-logistics' },
        request_id: 'req-init-1',
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        organization_id: orgId,
        actor_id: userId,
        action: 'document_uploaded',
        entity_type: 'document',
        entity_id: docInv1,
        metadata: { filename: 'invoice_4401.pdf', category: 'invoice' },
        request_id: 'req-upload-1',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        id: uuidv4(),
        organization_id: orgId,
        actor_id: userId,
        action: 'reconciliation_matched',
        entity_type: 'reconciliation',
        entity_id: docInv1,
        metadata: { po: 'PO-8820', status: 'matched' },
        request_id: 'req-recon-1',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
      }
    );
  }
}

export const inMemoryDb = new InMemoryDatabase();
