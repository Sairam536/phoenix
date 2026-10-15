import { DOCUMENT_CATEGORIES } from '../../shared/index.js';

export function buildClassificationPrompt(text: string): string {
  return `Analyze the supplied document text. Select the best supported category from the allowed list:
${JSON.stringify(DOCUMENT_CATEGORIES)}

Return a JSON object conforming strictly to this format:
{
  "category": "invoice", // one of: invoice, purchase_order, contract, receipt, report, correspondence, other, unknown
  "confidence": 0.95, // number between 0.0 and 1.0
  "reason": "Brief explanation of why this category was chosen",
  "evidence": [
    {
      "page": 1,
      "quote": "Direct quote from the text supporting this classification"
    }
  ],
  "recommended_schema": "invoice",
  "requires_review": false
}

DOCUMENT TEXT:
"""
${text.slice(0, 30000)}
"""`;
}

export function buildInvoiceExtractionPrompt(text: string): string {
  return `Extract invoice information from the supplied document text without making unsupported assumptions.
Return a JSON object conforming strictly to this structure:
{
  "schema_version": "invoice.v1",
  "supplier_name": "Supplier Company Name or null",
  "supplier_address": "Supplier Address or null",
  "supplier_tax_id": "Tax ID / GSTIN / EIN or null",
  "invoice_number": "Invoice Number or null",
  "invoice_date": "YYYY-MM-DD or null",
  "due_date": "YYYY-MM-DD or null",
  "currency": "3-letter currency code e.g. USD, EUR, INR or null",
  "subtotal": "Decimal string e.g. 1000.00 or null",
  "tax_amount": "Decimal string e.g. 180.00 or null",
  "discount": "Decimal string e.g. 0.00 or null",
  "total_amount": "Decimal string e.g. 1180.00 or null",
  "payment_terms": "e.g. Net 30 days or null",
  "purchase_order_reference": "Associated PO Number or null",
  "line_items": [
    {
      "description": "Item description",
      "quantity": "Decimal string or null",
      "unit_price": "Decimal string or null",
      "line_total": "Decimal string or null",
      "page": 1,
      "evidence_quote": "Direct quote from source showing line item"
    }
  ],
  "field_evidence": [
    {
      "field_path": "invoice_number",
      "page": 1,
      "quote": "Exact quote from document",
      "confidence": 0.98,
      "verified": false
    }
  ],
  "uncertainties": [],
  "warnings": []
}

DOCUMENT TEXT:
"""
${text.slice(0, 35000)}
"""`;
}

export function buildPurchaseOrderExtractionPrompt(text: string): string {
  return `Extract purchase order information from the supplied document text.
Return a JSON object conforming strictly to this structure:
{
  "schema_version": "purchase_order.v1",
  "purchase_order_number": "PO Number or null",
  "buyer_name": "Buyer organization name or null",
  "supplier_name": "Supplier organization name or null",
  "issue_date": "YYYY-MM-DD or null",
  "expected_delivery_date": "YYYY-MM-DD or null",
  "currency": "3-letter currency code or null",
  "subtotal": "Decimal string or null",
  "tax_amount": "Decimal string or null",
  "total_amount": "Decimal string or null",
  "delivery_address": "Delivery address or null",
  "line_items": [
    {
      "description": "Item description",
      "quantity": "Decimal string or null",
      "unit_price": "Decimal string or null",
      "line_total": "Decimal string or null",
      "page": 1,
      "evidence_quote": "Quote"
    }
  ],
  "field_evidence": [
    {
      "field_path": "purchase_order_number",
      "page": 1,
      "quote": "Quote",
      "confidence": 0.98,
      "verified": false
    }
  ],
  "uncertainties": [],
  "warnings": []
}

DOCUMENT TEXT:
"""
${text.slice(0, 35000)}
"""`;
}

export function buildContractExtractionPrompt(text: string): string {
  return `Extract contract information from the supplied text.
Return a JSON object conforming strictly to this structure:
{
  "schema_version": "contract.v1",
  "contract_title": "Title or null",
  "parties": ["Party A", "Party B"],
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "renewal_terms": "Terms or null",
  "termination_terms": "Terms or null",
  "payment_terms": "Terms or null",
  "obligations": ["Obligation 1"],
  "deadlines": ["Deadline 1"],
  "important_clauses": ["Clause 1"],
  "field_evidence": [],
  "uncertainties": [],
  "warnings": []
}

DOCUMENT TEXT:
"""
${text.slice(0, 35000)}
"""`;
}

export function buildReceiptExtractionPrompt(text: string): string {
  return `Extract expense receipt information from the supplied text.
Return a JSON object conforming strictly to this structure:
{
  "schema_version": "receipt.v1",
  "merchant": "Merchant name or null",
  "transaction_date": "YYYY-MM-DD or null",
  "currency": "3-letter currency code or null",
  "subtotal": "Decimal string or null",
  "tax_amount": "Decimal string or null",
  "total_amount": "Decimal string or null",
  "expense_category": "e.g. Travel, Meals, Supplies or null",
  "payment_method": "e.g. Visa ending 4123 or null",
  "field_evidence": [],
  "uncertainties": [],
  "warnings": []
}

DOCUMENT TEXT:
"""
${text.slice(0, 25000)}
"""`;
}

export function buildBusinessDocExtractionPrompt(text: string): string {
  return `Extract business document / report information from the supplied text.
Return a JSON object conforming strictly to this structure:
{
  "schema_version": "business_document.v1",
  "title": "Title or null",
  "document_type": "report", // report, correspondence, other, unknown
  "author_or_sender": "Author or null",
  "document_date": "YYYY-MM-DD or null",
  "summary": "Executive summary of contents",
  "topics": ["Topic 1"],
  "entities": ["Entity 1"],
  "key_findings": ["Finding 1"],
  "action_items": ["Action item 1"],
  "deadlines": ["Deadline 1"],
  "field_evidence": [],
  "uncertainties": [],
  "warnings": []
}

DOCUMENT TEXT:
"""
${text.slice(0, 35000)}
"""`;
}

export function buildKnowledgePrompt(
  question: string,
  sources: Array<{ document_id: string; title: string; page: number; text: string }>
): string {
  return `Answer the user question strictly using ONLY the retrieved document excerpts provided below.
If the excerpts do not contain enough evidence to answer reliably, set "supported": false and explain the limitation.
Do NOT fabricate citations, document IDs, or facts.

USER QUESTION:
"${question}"

RETRIEVED DOCUMENT EXCERPTS:
${sources
  .map(
    (s, idx) => `[Source ${idx + 1}] Document ID: ${s.document_id} | Document Title: "${s.title}" | Page: ${s.page}
Content: """${s.text}"""`
  )
  .join('\n\n')}

Return a JSON object conforming strictly to this format:
{
  "answer": "Grounded answer text",
  "supported": true, // or false if evidence is insufficient
  "sources": [
    {
      "document_id": "exact-document-id-from-retrieved-source",
      "document_title": "exact title",
      "page": 1,
      "quote": "exact quote from source content that supports the answer"
    }
  ],
  "limitations": []
}`;
}

export function buildSemanticMatchingPrompt(
  invoiceLines: Array<{ description: string; quantity?: string | null; unit_price?: string | null }>,
  poLines: Array<{ description: string; quantity?: string | null; unit_price?: string | null }>
): string {
  return `Assist with matching invoice line items to purchase order line items based on description similarity.

Invoice Lines:
${JSON.stringify(invoiceLines, null, 2)}

Purchase Order Lines:
${JSON.stringify(poLines, null, 2)}

Return a JSON object conforming strictly to:
{
  "matches": [
    {
      "invoice_line_index": 0,
      "purchase_order_line_index": 0,
      "semantic_similarity": 0.95,
      "reason": "Both descriptions clearly refer to the same item",
      "requires_review": false
    }
  ],
  "unmatched_invoice_lines": [],
  "unmatched_purchase_order_lines": []
}`;
}
