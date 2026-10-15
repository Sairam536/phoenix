# DocuMind AI — Interactive Evaluator Demo Walkthrough

This guide provides a rapid, step-by-step walkthrough of DocuMind AI to evaluate all core features.

---

## 🏁 Step 0: Initial Launch

1. Start both servers:
   ```bash
   npm run dev
   ```
2. Open your browser at **`http://localhost:5173`**.

---

## 🎯 Step 1: Landing Page & ROI Calculator

1. View the modern dark-themed landing page.
2. Scroll to the **Interactive ROI Calculator**:
   - Slide document volume to `5,000 documents/month`.
   - Adjust manual processing cost.
   - Observe real-time dynamic computation of annual hours saved ($4,800+$ hours) and net financial savings ($120,000+).
3. Click **"Launch Demo Workspace"** or **"Sign In"** in the navigation header.

---

## 🔑 Step 2: Authentication & Instant Demo Login

1. On the Login screen, click any of the **Quick Demo Persona** buttons:
   - **"Log in as Owner (Alex Chen)"** — Full privileges.
   - **"Log in as Reviewer (Elena Rostova)"** — Human review workflows.
2. The application logs in instantly, setting the tenant context to **Apex Global Logistics**.

---

## 📊 Step 3: Executive Dashboard

1. Review the high-density metrics bar: Total Documents (42), Processing Success Rate (99.1%), Avg Latency (3.8s), Discrepancies (2).
2. Inspect the **Document Flow Chart** and **Recent Activity Feed**.
3. Click on any document in the table to drill down.

---

## 📤 Step 4: Intelligent Ingestion & Synthetic Test Generator

1. Navigate to **Upload** (`/upload`).
2. Notice the drag-and-drop zone with accepted formats (`.pdf`, `.png`, `.jpg`, `.docx`).
3. Click **"Generate Synthetic Test Invoice"**:
   - Creates a realistic AP invoice with intentional price variance.
4. Watch the document transition through queue states: `uploaded` $\to$ `queued` $\to$ `processing` $\to$ `needs_review`.

---

## ✏️ Step 5: Human-in-the-Loop Review Workspace

1. Navigate to **Review Workspace** (`/review`).
2. Select an invoice flagged with `needs_review` (e.g., `INV-2026-9041`).
3. **Synchronized Split Screen:**
   - Left side: Document visual viewport with clickable bounding-box annotations.
   - Right side: Structured extracted fields categorized into Header, Line Items, and Validation Issues.
4. **Interactive Provenance:**
   - Hover or click on the **Total Amount** field: the exact bounding box lights up in green on the document canvas.
5. **Field Correction:**
   - Edit a low-confidence field value.
   - Enter an audit reason and click **"Save Correction"**.
   - Note the immediate badge change to "Edited by User".
6. Click **"Approve Document"** to sign off.

---

## ⚖️ Step 6: 2-Way Invoice vs PO Reconciliation

1. Navigate to **Reconciliation** (`/reconciliation`).
2. Select **Apex Freight Invoice #9041** and **Purchase Order PO-88219**.
3. Click **"Execute 2-Way Match"**:
   - The engine compares header metadata and maps line items.
   - Visual comparison table shows:
     - Item description match
     - Invoiced Unit Price ($1,250.00) vs PO Unit Price ($1,200.00)
     - Flagged with `PRICE_MISMATCH (+4.17%)`
4. Reviewer can resolve the variance with an approval override or dispute flag.

---

## 🔍 Step 7: Grounded Cross-Document Knowledge Discovery

1. Navigate to **Knowledge Discovery** (`/knowledge`).
2. Try a sample query or type:
   - *"Which contracts contain auto-renewal cancellation notice requirements?"*
3. Click **"Ask DocuMind AI"**:
   - View the synthesized response.
   - Notice the precise citations linking to document titles and page numbers.
   - Click a citation snippet to open the corresponding document.

---

## 📥 Step 8: Safe Export & Formula Injection Verification

1. Navigate to **Reports & Export** (`/reports`).
2. Select **Export to CSV**.
3. Open the downloaded CSV file in any text editor:
   - Observe that any formula-sensitive characters (`=`, `+`, `-`, `@`) are safely prefixed with an apostrophe `'`, preventing arbitrary code execution in Excel.

---

## 📜 Step 9: Immutable Audit Trail

1. Navigate to **Audit Logs** (`/audit`).
2. Verify that every action taken during this walkthrough (file upload, field correction, approval, reconciliation) has been chronologically logged with user identity, timestamp, and metadata diff.
