# DocuMind AI — REST API Reference

Base URL: `http://localhost:4000/api/v1`

All requests except `/auth/login` require:
- `Authorization: Bearer <jwt_token>`
- `X-Organization-Id: <uuid>`

---

## 1. Authentication & Organization

### `POST /auth/login`
Authenticates a user and returns a session token.

**Request Body:**
```json
{
  "email": "alex.chen@apexlogistics.com",
  "password": "Password123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "token": "demo-jwt-token",
    "user": {
      "id": "11111111-0000-0000-0000-000000000001",
      "email": "alex.chen@apexlogistics.com",
      "name": "Alex Chen",
      "role": "owner",
      "organizationId": "11111111-1111-1111-1111-111111111111"
    }
  }
}
```

---

### `GET /organizations`
Lists organizations accessible to the authenticated user.

---

### `GET /dashboard/summary`
Returns aggregate platform statistics for the current organization.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalDocuments": 42,
    "pendingReview": 5,
    "processedToday": 18,
    "averageProcessingTimeSec": 3.8,
    "accuracyRate": 99.1,
    "reconciliationDiscrepancies": 2
  }
}
```

---

## 2. Document Management

### `GET /documents`
Query documents with pagination, status filters, and search terms.

**Query Parameters:**
- `status` (`uploaded` | `queued` | `processing` | `processed` | `needs_review` | `approved` | `rejected`)
- `type` (`invoice` | `purchase_order` | `contract` | `receipt` | `unknown`)
- `search` (text search in filename and vendor name)
- `page` (default: 1)
- `limit` (default: 20)

---

### `POST /documents/upload`
Uploads a document file for asynchronous processing.

**Headers:**
`Content-Type: multipart/form-data`

**Form Fields:**
- `file`: Document binary (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.tiff`, `.docx`)
- `documentType`: (optional) `invoice`, `purchase_order`, etc.

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "documentId": "33333333-3333-3333-3333-333333333333",
    "jobId": "44444444-4444-4444-4444-444444444444",
    "status": "queued",
    "fileName": "vendor_invoice_1042.pdf"
  }
}
```

---

### `GET /documents/:id`
Retrieves document metadata, page previews, and processing history.

---

### `GET /documents/:id/extractions`
Retrieves extracted header fields, line items, confidence scores, and validation issues.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "documentId": "33333333-3333-3333-3333-333333333333",
    "documentType": "invoice",
    "fields": [
      {
        "id": "fld-1",
        "fieldName": "invoice_number",
        "fieldValue": "INV-2026-9041",
        "confidence": 0.98,
        "isEdited": false,
        "evidence": { "pageNumber": 1, "box": [120, 450, 140, 560] }
      },
      {
        "id": "fld-2",
        "fieldName": "total_amount",
        "fieldValue": "14250.00",
        "confidence": 0.96,
        "isEdited": false,
        "evidence": { "pageNumber": 1, "box": [800, 450, 825, 560] }
      }
    ],
    "lineItems": [
      {
        "id": "item-1",
        "lineNumber": 1,
        "description": "Enterprise Cloud Fleet Telemetry Nodes",
        "quantity": 10,
        "unitPrice": 1200.00,
        "amount": 12000.00
      }
    ],
    "issues": []
  }
}
```

---

### `PATCH /documents/:id/extractions`
Allows human reviewers to modify extracted values.

**Request Body:**
```json
{
  "fieldId": "fld-2",
  "fieldName": "total_amount",
  "newValue": "14250.00",
  "reason": "Corrected OCR trailing character"
}
```

---

### `POST /documents/:id/review`
Submits approval or rejection decision.

**Request Body:**
```json
{
  "decision": "approved",
  "notes": "Verified against PO-88291"
}
```

---

## 3. Reconciliation

### `POST /reconciliations/match`
Executes automated 2-way comparison between an invoice and a purchase order.

**Request Body:**
```json
{
  "invoiceDocumentId": "33333333-3333-3333-3333-333333333333",
  "poDocumentId": "22222222-2222-2222-2222-222222222222",
  "tolerancePercent": 2.0
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "discrepancy",
    "matchedScore": 0.92,
    "headerMatches": { "vendor": true, "currency": true, "poRef": true },
    "discrepancies": [
      {
        "type": "PRICE_MISMATCH",
        "invoiceItem": "Enterprise Fleet Telemetry",
        "invoiceUnitPrice": 1250.00,
        "poUnitPrice": 1200.00,
        "variancePercent": 4.17
      }
    ]
  }
}
```

---

## 4. Knowledge Discovery

### `POST /knowledge/ask`
Answers complex queries across all documents with source citations.

**Request Body:**
```json
{
  "query": "Which vendors have payment terms exceeding Net 30?"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "answer": "Apex Logistics agreements with Pacific Maritime Transport specify Net 45 terms, whereas Standard Fleet Services operates under Net 60.",
    "citations": [
      {
        "documentId": "doc-881",
        "documentTitle": "Pacific Maritime Master Agreement 2026.pdf",
        "pageNumber": 4,
        "snippet": "Section 8.1 Payment Terms: All invoices shall be settled Net 45 days from receipt."
      }
    ]
  }
}
```

---

## 5. Secure Exports

### `POST /exports/csv`
Generates a sanitized CSV export protected against CSV/Formula Injection.

**Request Body:**
```json
{
  "documentIds": ["33333333-3333-3333-3333-333333333333"],
  "includeLineItems": true
}
```

**Response:**
Returns `text/csv` with `Content-Disposition: attachment; filename="documind-export-...csv"`.
Formula indicators (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading `'`.
