import { ExportRequest } from '../shared/index.js';
import { inMemoryDb } from '../repositories/db.js';

export class ExportService {
  /**
   * Sanitizes cell string to prevent spreadsheet formula injection attacks
   * e.g. Excel / Google Sheets executing =CMD(), +..., -..., @..., \t, \r
   */
  sanitizeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    let str = typeof value === 'object' ? JSON.stringify(value) : String(value);

    // If starts with dangerous character, prefix with single quote
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }

    // Escape double quotes and enclose in quotes if contains comma, quote, or newline
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }

    return str;
  }

  generateCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
    const headerRow = headers.map(h => this.sanitizeCsvCell(h)).join(',');
    const dataRows = rows.map(row => row.map(cell => this.sanitizeCsvCell(cell)).join(','));
    return [headerRow, ...dataRows].join('\r\n');
  }

  async exportData(orgId: string, options: ExportRequest): Promise<{ contentType: string; data: string; filename: string }> {
    const { data_type, category, limit } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (data_type === 'documents') {
      let docs = inMemoryDb.documents.filter(d => d.organization_id === orgId);
      if (category) {
        docs = docs.filter(d => d.category === category);
      }
      docs = docs.slice(0, limit);

      const headers = ['ID', 'Title', 'Category', 'Status', 'Review Status', 'Filename', 'File Size (Bytes)', 'Created At'];
      const rows = docs.map(d => [
        d.id,
        d.title,
        d.category,
        d.processing_status,
        d.review_status,
        d.original_filename,
        d.file_size_bytes,
        d.created_at,
      ]);

      return {
        contentType: 'text/csv; charset=utf-8',
        data: this.generateCsv(headers, rows),
        filename: `documind-documents-${timestamp}.csv`,
      };
    }

    if (data_type === 'reconciliations') {
      const recons = inMemoryDb.reconciliations.filter(r => r.organization_id === orgId).slice(0, limit);
      const headers = ['ID', 'Status', 'Invoice Doc ID', 'PO Doc ID', 'Discrepancies', 'Created At'];
      const rows = recons.map(r => [
        r.id,
        r.status,
        r.invoice_document_id,
        r.purchase_order_document_id,
        Array.isArray((r.comparison_result as any)?.discrepancies) ? (r.comparison_result as any).discrepancies.join('; ') : '',
        r.created_at,
      ]);

      return {
        contentType: 'text/csv; charset=utf-8',
        data: this.generateCsv(headers, rows),
        filename: `documind-reconciliations-${timestamp}.csv`,
      };
    }

    if (data_type === 'validation_issues') {
      const issues = inMemoryDb.validationIssues.filter(i => i.organization_id === orgId).slice(0, limit);
      const headers = ['ID', 'Document ID', 'Rule Code', 'Severity', 'Field Path', 'Message', 'Status', 'Created At'];
      const rows = issues.map(i => [
        i.id,
        i.document_id,
        i.rule_code,
        i.severity,
        i.field_path || '',
        i.message,
        i.status,
        i.created_at,
      ]);

      return {
        contentType: 'text/csv; charset=utf-8',
        data: this.generateCsv(headers, rows),
        filename: `documind-validation-issues-${timestamp}.csv`,
      };
    }

    // Default: audit_events
    const audits = inMemoryDb.auditEvents.filter(a => a.organization_id === orgId).slice(0, limit);
    const headers = ['ID', 'Actor ID', 'Action', 'Entity Type', 'Entity ID', 'Created At'];
    const rows = audits.map(a => [
      a.id,
      a.actor_id || 'System',
      a.action,
      a.entity_type,
      a.entity_id || '',
      a.created_at,
    ]);

    return {
      contentType: 'text/csv; charset=utf-8',
      data: this.generateCsv(headers, rows),
      filename: `documind-audit-${timestamp}.csv`,
    };
  }
}

export const exportService = new ExportService();
