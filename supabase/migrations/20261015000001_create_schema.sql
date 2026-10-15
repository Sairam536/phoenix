-- ==============================================================================
-- DOCUMIND AI — PRODUCTION DATABASE MIGRATION
-- Migration: 20261015000001_create_schema.sql
-- Description: Core schema, tables, indexes, constraints, triggers, and functions
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. ORGANIZATIONS
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  created_by uuid not null references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. ORGANIZATION MEMBERSHIPS
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'reviewer', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (id, organization_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id);

create index if not exists organization_members_org_idx
  on public.organization_members(organization_id, role);

-- 4. DOCUMENTS
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  original_filename text not null,
  storage_path text not null unique,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  sha256_hash text not null,
  category text not null default 'unknown'
    check (category in (
      'invoice',
      'purchase_order',
      'contract',
      'receipt',
      'report',
      'correspondence',
      'other',
      'unknown'
    )),
  processing_status text not null default 'uploaded'
    check (processing_status in (
      'uploaded',
      'queued',
      'extracting',
      'classifying',
      'extracting_fields',
      'validating',
      'needs_review',
      'approved',
      'rejected',
      'failed'
    )),
  review_status text not null default 'pending'
    check (review_status in (
      'pending',
      'approved',
      'rejected'
    )),
  extraction_schema_version text,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  processed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index if not exists documents_org_created_idx
  on public.documents(organization_id, created_at desc);

create index if not exists documents_org_status_idx
  on public.documents(organization_id, processing_status);

create index if not exists documents_org_category_idx
  on public.documents(organization_id, category);

create index if not exists documents_hash_idx
  on public.documents(organization_id, sha256_hash);

-- Full text search index on title & description
create index if not exists documents_fts_idx
  on public.documents using gin(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- 5. EXTRACTED PAGE TEXT
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  page_number integer not null check (page_number > 0),
  extracted_text text not null default '',
  extraction_method text not null check (
    extraction_method in (
      'pdf_text',
      'ocr',
      'docx_text',
      'plain_text',
      'other'
    )
  ),
  extraction_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade,
  unique (document_id, page_number)
);

create index if not exists document_pages_document_idx
  on public.document_pages(document_id, page_number);

create index if not exists document_pages_fts_idx
  on public.document_pages using gin(to_tsvector('english', extracted_text));

-- 6. PROCESSING JOBS
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  job_type text not null check (
    job_type in (
      'full_processing',
      'reprocess',
      'reconciliation',
      'knowledge_indexing'
    )
  ),
  status text not null default 'queued'
    check (status in (
      'queued',
      'running',
      'succeeded',
      'failed',
      'cancelled'
    )),
  stage text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  idempotency_key text,
  error_code text,
  error_message text,
  worker_id text,
  started_at timestamptz,
  finished_at timestamptz,
  next_retry_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists processing_jobs_queue_idx
  on public.processing_jobs(status, next_retry_at, created_at);

create index if not exists processing_jobs_org_idx
  on public.processing_jobs(organization_id, created_at desc);

create unique index if not exists processing_jobs_idempotency_idx
  on public.processing_jobs(organization_id, idempotency_key)
  where idempotency_key is not null;

-- 7. EXTRACTION RESULTS
create table if not exists public.extraction_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  processing_job_id uuid references public.processing_jobs(id) on delete set null,
  schema_version text not null,
  extracted_data jsonb not null default '{}'::jsonb,
  classification jsonb not null default '{}'::jsonb,
  extraction_confidence numeric(5,4)
    check (
      extraction_confidence is null
      or extraction_confidence between 0 and 1
    ),
  validation_summary jsonb not null default '{}'::jsonb,
  model_name text,
  prompt_version text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists extraction_results_document_idx
  on public.extraction_results(document_id, created_at desc);

create index if not exists extraction_results_org_idx
  on public.extraction_results(organization_id, created_at desc);

-- 8. EXTRACTED FIELDS AND EVIDENCE
create table if not exists public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  extraction_result_id uuid not null
    references public.extraction_results(id) on delete cascade,
  field_path text not null,
  field_value jsonb,
  normalized_value jsonb,
  confidence numeric(5,4)
    check (
      confidence is null or confidence between 0 and 1
    ),
  evidence jsonb not null default '[]'::jsonb,
  validation_status text not null default 'unverified'
    check (validation_status in (
      'unverified',
      'valid',
      'warning',
      'invalid',
      'not_applicable'
    )),
  is_manually_edited boolean not null default false,
  edited_by uuid references auth.users(id),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists extracted_fields_document_idx
  on public.extracted_fields(document_id, field_path);

create index if not exists extracted_fields_org_idx
  on public.extracted_fields(organization_id, field_path);

-- 9. VALIDATION ISSUES
create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  extraction_result_id uuid references public.extraction_results(id) on delete cascade,
  rule_code text not null,
  severity text not null check (
    severity in ('info', 'warning', 'error', 'critical')
  ),
  field_path text,
  message text not null,
  expected_value jsonb,
  actual_value jsonb,
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists validation_issues_org_status_idx
  on public.validation_issues(
    organization_id,
    status,
    severity,
    created_at desc
  );

-- 10. RECONCILIATIONS (Invoice & Purchase Order)
create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_document_id uuid not null,
  purchase_order_document_id uuid not null,
  status text not null default 'pending_review'
    check (status in (
      'pending_review',
      'matched',
      'mismatched',
      'rejected'
    )),
  comparison_result jsonb not null default '{}'::jsonb,
  tolerance_config jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (invoice_document_id, organization_id)
    references public.documents(id, organization_id),
  foreign key (purchase_order_document_id, organization_id)
    references public.documents(id, organization_id),
  check (invoice_document_id <> purchase_order_document_id)
);

create index if not exists reconciliations_org_created_idx
  on public.reconciliations(organization_id, created_at desc);

-- 11. REVIEW EVENTS
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null check (
    action in (
      'field_edited',
      'approved',
      'rejected',
      'reopened',
      'validation_resolved'
    )
  ),
  reason text,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists review_events_document_idx
  on public.review_events(document_id, created_at desc);

-- 12. AUDIT EVENTS
create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_org_created_idx
  on public.audit_events(organization_id, created_at desc);

create index if not exists audit_events_entity_idx
  on public.audit_events(entity_type, entity_id);

-- 13. KNOWLEDGE QUERIES
create table if not exists public.knowledge_queries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  question text not null check (char_length(question) between 1 and 2000),
  answer text,
  source_references jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  model_name text,
  prompt_version text,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists knowledge_queries_org_created_idx
  on public.knowledge_queries(organization_id, created_at desc);

-- 14. UPDATED_AT TRIGGER FUNCTION
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger update_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create or replace trigger update_organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

create or replace trigger update_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create or replace trigger update_processing_jobs_updated_at
  before update on public.processing_jobs
  for each row execute function public.set_updated_at();

create or replace trigger update_extracted_fields_updated_at
  before update on public.extracted_fields
  for each row execute function public.set_updated_at();

create or replace trigger update_reconciliations_updated_at
  before update on public.reconciliations
  for each row execute function public.set_updated_at();
