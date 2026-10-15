import { v4 as uuidv4 } from 'uuid';
import {
  ClassificationResultSchema,
  InvoiceExtractionSchema,
  PurchaseOrderExtractionSchema,
  ContractExtractionSchema,
  ReceiptExtractionSchema,
  BusinessDocumentExtractionSchema,
  DocumentCategory,
} from '../shared/index.js';
import { inMemoryDb, ProcessingJobDbRecord } from '../repositories/db.js';
import { storageService } from '../services/storage.service.js';
import { extractionService } from '../services/extraction.service.js';
import { geminiService } from '../ai/gemini-client.js';
import {
  buildClassificationPrompt,
  buildInvoiceExtractionPrompt,
  buildPurchaseOrderExtractionPrompt,
  buildContractExtractionPrompt,
  buildReceiptExtractionPrompt,
  buildBusinessDocExtractionPrompt,
} from '../ai/prompts/index.js';
import { validationService } from '../services/validation.service.js';
import { logger } from '../utils/logger.js';

export class JobProcessor {
  private isProcessing = false;
  private workerId = `worker-${process.pid}-${Date.now().toString(36)}`;

  /**
   * Process a single job through the complete IDP pipeline
   */
  async processJob(job: ProcessingJobDbRecord): Promise<void> {
    const doc = inMemoryDb.documents.find(d => d.id === job.document_id);
    if (!doc) {
      job.status = 'failed';
      job.error_code = 'DOCUMENT_NOT_FOUND';
      job.error_message = 'Referenced document record does not exist';
      return;
    }

    try {
      logger.info({ jobId: job.id, docId: doc.id }, 'Beginning document processing pipeline');

      // 1. Stage: Extracting
      job.stage = 'extracting';
      doc.processing_status = 'extracting';

      const fileBuffer = await storageService.getFileBuffer(doc.storage_path);
      const extraction = await extractionService.extractContent(fileBuffer, doc.mime_type, doc.original_filename);

      // Save extracted pages
      extraction.pages.forEach(p => {
        const existingPageIdx = inMemoryDb.pages.findIndex(
          pg => pg.document_id === doc.id && pg.page_number === p.page_number
        );
        const pageRecord = {
          id: uuidv4(),
          organization_id: doc.organization_id,
          document_id: doc.id,
          page_number: p.page_number,
          extracted_text: p.extracted_text,
          extraction_method: p.extraction_method,
          extraction_metadata: p.extraction_metadata,
          created_at: new Date().toISOString(),
        };

        if (existingPageIdx >= 0) {
          inMemoryDb.pages[existingPageIdx] = pageRecord;
        } else {
          inMemoryDb.pages.push(pageRecord);
        }
      });

      // 2. Stage: Classifying (if category is unknown or auto-classify requested)
      job.stage = 'classifying';
      doc.processing_status = 'classifying';

      let detectedCategory: DocumentCategory = doc.category;
      let classificationData: Record<string, unknown> = {};

      if (doc.category === 'unknown' || !doc.category) {
        const classPrompt = buildClassificationPrompt(extraction.fullText);
        const classResult = await geminiService.generateStructured(
          classPrompt,
          ClassificationResultSchema,
          'classification'
        );

        detectedCategory = classResult.category;
        classificationData = classResult as unknown as Record<string, unknown>;
        doc.category = detectedCategory;
      }

      // 3. Stage: Extracting Fields
      job.stage = 'extracting_fields';
      doc.processing_status = 'extracting_fields';

      let extractedData: Record<string, unknown> = {};
      let schemaVersion = `${detectedCategory}.v1`;
      let confidence = 0.95;

      if (detectedCategory === 'invoice') {
        schemaVersion = 'invoice.v1';
        const invPrompt = buildInvoiceExtractionPrompt(extraction.fullText);
        const invData = await geminiService.generateStructured(
          invPrompt,
          InvoiceExtractionSchema,
          'invoice'
        );
        extractedData = invData as unknown as Record<string, unknown>;
      } else if (detectedCategory === 'purchase_order') {
        schemaVersion = 'purchase_order.v1';
        const poPrompt = buildPurchaseOrderExtractionPrompt(extraction.fullText);
        const poData = await geminiService.generateStructured(
          poPrompt,
          PurchaseOrderExtractionSchema,
          'purchase_order'
        );
        extractedData = poData as unknown as Record<string, unknown>;
      } else if (detectedCategory === 'contract') {
        schemaVersion = 'contract.v1';
        const contractPrompt = buildContractExtractionPrompt(extraction.fullText);
        const contractData = await geminiService.generateStructured(
          contractPrompt,
          ContractExtractionSchema,
          'contract'
        );
        extractedData = contractData as unknown as Record<string, unknown>;
      } else if (detectedCategory === 'receipt') {
        schemaVersion = 'receipt.v1';
        const receiptPrompt = buildReceiptExtractionPrompt(extraction.fullText);
        const receiptData = await geminiService.generateStructured(
          receiptPrompt,
          ReceiptExtractionSchema,
          'receipt'
        );
        extractedData = receiptData as unknown as Record<string, unknown>;
      } else {
        schemaVersion = 'business_document.v1';
        const docPrompt = buildBusinessDocExtractionPrompt(extraction.fullText);
        const reportData = await geminiService.generateStructured(
          docPrompt,
          BusinessDocumentExtractionSchema,
          'business_document'
        );
        extractedData = reportData as unknown as Record<string, unknown>;
      }

      doc.extraction_schema_version = schemaVersion;

      // 4. Save Extraction Result Record
      const extractionResultId = uuidv4();
      const extResultRecord = {
        id: extractionResultId,
        organization_id: doc.organization_id,
        document_id: doc.id,
        processing_job_id: job.id,
        schema_version: schemaVersion,
        extracted_data: extractedData,
        classification: classificationData,
        extraction_confidence: confidence,
        validation_summary: {},
        model_name: 'gemini',
        prompt_version: 'v1.0',
        created_at: new Date().toISOString(),
        created_by: job.created_by,
      };
      inMemoryDb.extractionResults.push(extResultRecord);

      // Save individual extracted fields with provenance
      for (const [key, value] of Object.entries(extractedData)) {
        if (key === 'line_items' || key === 'field_evidence' || key === 'uncertainties' || key === 'warnings') {
          continue;
        }

        // Locate evidence quote if available
        const evidenceArr = Array.isArray((extractedData as any).field_evidence)
          ? (extractedData as any).field_evidence.filter((e: any) => e.field_path === key)
          : [];

        inMemoryDb.extractedFields.push({
          id: uuidv4(),
          organization_id: doc.organization_id,
          document_id: doc.id,
          extraction_result_id: extractionResultId,
          field_path: key,
          field_value: value,
          normalized_value: value,
          confidence: 0.95,
          evidence: evidenceArr,
          validation_status: 'valid',
          is_manually_edited: false,
          edited_by: null,
          edited_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // 5. Stage: Validating
      job.stage = 'validating';
      doc.processing_status = 'validating';

      if (detectedCategory === 'invoice') {
        const valResult = validationService.validateInvoice(
          extractedData as any,
          doc.organization_id,
          doc.id
        );

        valResult.issues.forEach(iss => {
          inMemoryDb.validationIssues.push({
            id: uuidv4(),
            ...iss,
            field_path: iss.field_path ?? null,
            extraction_result_id: extractionResultId,
            created_at: new Date().toISOString(),
          });
        });
      }

      // 6. Complete Job
      job.status = 'succeeded';
      job.stage = 'completed';
      job.finished_at = new Date().toISOString();
      doc.processing_status = 'needs_review';
      doc.processed_at = new Date().toISOString();

      // Record audit event
      inMemoryDb.auditEvents.push({
        id: uuidv4(),
        organization_id: doc.organization_id,
        actor_id: job.created_by,
        action: 'document_processed',
        entity_type: 'document',
        entity_id: doc.id,
        metadata: { category: detectedCategory, schema: schemaVersion },
        request_id: null,
        created_at: new Date().toISOString(),
      });

      logger.info({ jobId: job.id, docId: doc.id, status: doc.processing_status }, 'Document processing pipeline completed successfully');
    } catch (err) {
      logger.error({ err, jobId: job.id, docId: doc.id }, 'Processing pipeline stage failed');
      job.status = 'failed';
      job.error_code = 'PROCESSING_ERROR';
      job.error_message = (err as Error).message;
      job.finished_at = new Date().toISOString();
      doc.processing_status = 'failed';
    }
  }

  /**
   * Worker polling tick
   */
  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find queued jobs
      const queuedJob = inMemoryDb.jobs.find(
        j => j.status === 'queued' && j.attempt_count < j.max_attempts
      );

      if (queuedJob) {
        queuedJob.status = 'running';
        queuedJob.worker_id = this.workerId;
        queuedJob.attempt_count += 1;
        queuedJob.started_at = new Date().toISOString();

        await this.processJob(queuedJob);
      }
    } catch (err) {
      logger.error({ err }, 'Job worker tick error');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start worker loop
   */
  startWorker(intervalMs = 2000): NodeJS.Timeout {
    logger.info({ workerId: this.workerId, intervalMs }, 'Starting background processing worker');
    return setInterval(() => this.tick(), intervalMs);
  }
}

export const jobProcessor = new JobProcessor();
