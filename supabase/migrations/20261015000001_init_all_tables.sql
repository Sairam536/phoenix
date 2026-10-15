-- ==============================================================================
-- DOCUMIND AI — COMPLETE MASTER SUPABASE MIGRATION (SINGLE-RUN ALL-IN-ONE)
-- ==============================================================================
-- Migration: 20261015000001_init_all_tables.sql
-- Description:
--   Complete, 100% idempotent single-run database setup for DocuMind AI:
--   1. Required Extensions (uuid-ossp, pgcrypto)
--   2. Safe Auth Users Seeding (compatible with hosted Supabase & local Postgres)
--   3. All 12 Core Relational Tables with Constraints & Composite Keys
--   4. Performance Indexes (status, foreign keys, timestamps, sorting)
--   5. Automatic Timestamp Triggers
--   6. Security Definer Helper Functions & Atomic Queue RPCs
--   7. Organization-Scoped Row Level Security (RLS) Policies on All Tables
--   8. Supabase Storage Bucket ('documents') & Storage RLS Policies
--   9. Enterprise Demo Seed Dataset (Apex Logistics & Industrial Corp)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ------------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------------------------
-- 2. AUTH SCHEMA COMPATIBILITY & DEMO USERS
-- ------------------------------------------------------------------------------
-- Ensure auth schema exists (default in Supabase, required for local generic postgres)
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid,
  email text unique,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  is_super_admin boolean,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  phone text unique,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean default false,
  deleted_at timestamptz,
  role text default 'authenticated',
  aud text default 'authenticated'
);

-- Safely seed demo accounts (wrapped in exception block so hosted Supabase won't abort if restricted)
do $$
begin
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at
  ) values 
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@apexlogistics.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Alex Rivera (Owner)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'reviewer@apexlogistics.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Taylor Chen (Senior Reviewer)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'member@apexlogistics.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Sam Morgan (Member)"}'::jsonb,
    'authenticated',
    'authenticated',
    now(),
    now()
  )
  on conflict (id) do nothing;
exception when others then
  raise notice 'Direct auth.users insert bypassed (managed by Supabase Auth): %', sqlerrm;
end $$;

-- ------------------------------------------------------------------------------
-- 3. ALL 12 CORE RELATIONAL TABLES
-- ------------------------------------------------------------------------------

-- 3.1 ORGANIZATIONS
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique,
  created_by uuid not null references auth.users(id),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3.2 ORGANIZATION MEMBERSHIPS
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

-- 3.3 DOCUMENTS
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
      'invoice', 'purchase_order', 'contract', 'receipt', 'report', 'correspondence', 'other', 'unknown'
    )),
  processing_status text not null default 'uploaded'
    check (processing_status in (
      'uploaded', 'queued', 'extracting', 'classifying', 'extracting_fields', 'validating',
      'needs_review', 'approved', 'rejected', 'failed'
    )),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected')),
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

-- 3.4 DOCUMENT PAGES
create table if not exists public.document_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  page_number int not null check (page_number > 0),
  text_content text not null default '',
  image_storage_path text,
  width int,
  height int,
  ocr_confidence numeric(4, 3) check (ocr_confidence between 0 and 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade,
  unique (document_id, page_number)
);

create index if not exists document_pages_doc_num_idx
  on public.document_pages(document_id, page_number);

-- 3.5 PROCESSING JOBS (Background Queue)
create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null,
  job_type text not null default 'full_processing'
    check (job_type in ('full_processing', 'ocr_only', 'extraction_only', 'revalidation')),
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'retrying')),
  stage text not null default 'enqueued',
  attempt_count int not null default 0,
  max_attempts int not null default 3,
  idempotency_key text unique,
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

create index if not exists processing_jobs_status_next_idx
  on public.processing_jobs(status, next_retry_at)
  where status in ('queued', 'retrying');

-- 3.6 EXTRACTION RESULTS
create table if not exists public.extraction_results (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  schema_version text not null,
  extracted_data jsonb not null default '{}'::jsonb,
  raw_ai_response jsonb not null default '{}'::jsonb,
  confidence_score numeric(4, 3) check (confidence_score between 0 and 1),
  model_name text,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists extraction_results_doc_idx
  on public.extraction_results(document_id, is_current);

-- 3.7 EXTRACTED FIELDS (Structured field provenance with bounding box evidence)
create table if not exists public.extracted_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  extraction_result_id uuid references public.extraction_results(id) on delete cascade,
  field_path text not null,
  field_value jsonb,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  page_number int,
  bounding_box jsonb,
  source_text text,
  is_user_edited boolean not null default false,
  edited_by uuid references auth.users(id),
  edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade,
  unique (extraction_result_id, field_path)
);

create index if not exists extracted_fields_document_idx
  on public.extracted_fields(document_id, field_path);

-- 3.8 VALIDATION ISSUES
create table if not exists public.validation_issues (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  extraction_result_id uuid references public.extraction_results(id) on delete cascade,
  rule_code text not null,
  severity text not null check (severity in ('info', 'warning', 'error', 'critical')),
  field_path text,
  message text not null,
  expected_value jsonb,
  actual_value jsonb,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade,
  unique (extraction_result_id, rule_code, field_path)
);

create index if not exists validation_issues_org_status_idx
  on public.validation_issues(organization_id, status, severity, created_at desc);

-- 3.9 RECONCILIATIONS (2-Way Matching)
create table if not exists public.reconciliations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  invoice_document_id uuid not null,
  purchase_order_document_id uuid not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'matched', 'mismatched', 'rejected')),
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
  check (invoice_document_id <> purchase_order_document_id),
  unique (invoice_document_id, purchase_order_document_id)
);

create index if not exists reconciliations_org_created_idx
  on public.reconciliations(organization_id, created_at desc);

-- 3.10 REVIEW EVENTS
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  document_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null check (
    action in ('field_edited', 'approved', 'rejected', 'reopened', 'validation_resolved')
  ),
  reason text,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents(id, organization_id)
    on delete cascade
);

create index if not exists review_events_doc_idx
  on public.review_events(document_id, created_at desc);

-- 3.11 AUDIT EVENTS
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

-- 3.12 KNOWLEDGE QUERIES
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

-- ------------------------------------------------------------------------------
-- 4. AUTOMATIC TIMESTAMP TRIGGERS
-- ------------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_organizations_updated_at on public.organizations;
create trigger update_organizations_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

drop trigger if exists update_organization_members_updated_at on public.organization_members;
create trigger update_organization_members_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

drop trigger if exists update_documents_updated_at on public.documents;
create trigger update_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

drop trigger if exists update_processing_jobs_updated_at on public.processing_jobs;
create trigger update_processing_jobs_updated_at
  before update on public.processing_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists update_extracted_fields_updated_at on public.extracted_fields;
create trigger update_extracted_fields_updated_at
  before update on public.extracted_fields
  for each row execute function public.set_updated_at();

drop trigger if exists update_reconciliations_updated_at on public.reconciliations;
create trigger update_reconciliations_updated_at
  before update on public.reconciliations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------------------
-- 5. SECURITY DEFINER HELPER FUNCTIONS & ATOMIC QUEUE RPCs
-- ------------------------------------------------------------------------------

-- 5.1 Helper: Check organization membership
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

-- 5.2 Helper: Check organization role authorization
create or replace function public.has_org_role(target_org_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

-- 5.3 Onboarding: Create organization with owner role
create or replace function public.create_organization_with_owner(
  p_name text,
  p_slug text,
  p_settings jsonb default '{}'::jsonb
)
returns public.organizations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_org public.organizations;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthenticated. User must be logged in to create an organization.';
  end if;

  insert into public.organizations (name, slug, created_by, settings)
  values (p_name, p_slug, v_user_id, p_settings)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org.id, v_user_id, 'owner');

  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_org.id, v_user_id, 'organization_created', 'organization', v_org.id, jsonb_build_object('name', p_name, 'slug', p_slug));

  return v_org;
end;
$$;

-- 5.4 Queue: Atomic background job claim with SKIP LOCKED
create or replace function public.claim_next_processing_job(
  p_worker_id text,
  p_max_attempts int default 3
)
returns public.processing_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.processing_jobs;
begin
  select *
  into v_job
  from public.processing_jobs
  where status = 'queued'
    and attempt_count < p_max_attempts
    and (next_retry_at is null or next_retry_at <= now())
  order by created_at asc
  for update skip locked
  limit 1;

  if v_job.id is not null then
    update public.processing_jobs
    set
      status = 'processing',
      attempt_count = attempt_count + 1,
      worker_id = p_worker_id,
      started_at = now(),
      updated_at = now()
    where id = v_job.id
    returning * into v_job;
  end if;

  return v_job;
end;
$$;

-- ------------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_pages enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.extraction_results enable row level security;
alter table public.extracted_fields enable row level security;
alter table public.validation_issues enable row level security;
alter table public.reconciliations enable row level security;
alter table public.review_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.knowledge_queries enable row level security;

-- 6.1 Organizations Policies
drop policy if exists "org_select_members" on public.organizations;
create policy "org_select_members" on public.organizations
  for select using (public.is_org_member(id));

drop policy if exists "org_update_owners" on public.organizations;
create policy "org_update_owners" on public.organizations
  for update using (public.has_org_role(id, array['owner']));

-- 6.2 Organization Members Policies
drop policy if exists "org_members_select" on public.organization_members;
create policy "org_members_select" on public.organization_members
  for select using (public.is_org_member(organization_id));

drop policy if exists "org_members_manage_admins" on public.organization_members;
create policy "org_members_manage_admins" on public.organization_members
  for all using (public.has_org_role(organization_id, array['owner', 'admin']));

-- 6.3 Documents Policies
drop policy if exists "docs_select_members" on public.documents;
create policy "docs_select_members" on public.documents
  for select using (public.is_org_member(organization_id));

drop policy if exists "docs_insert_reviewers" on public.documents;
create policy "docs_insert_reviewers" on public.documents
  for insert with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'reviewer'])
    and auth.uid() = uploaded_by
  );

drop policy if exists "docs_update_reviewers" on public.documents;
create policy "docs_update_reviewers" on public.documents
  for update using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

drop policy if exists "docs_delete_admins" on public.documents;
create policy "docs_delete_admins" on public.documents
  for delete using (public.has_org_role(organization_id, array['owner', 'admin']));

-- 6.4 Document Pages Policies
drop policy if exists "pages_select_members" on public.document_pages;
create policy "pages_select_members" on public.document_pages
  for select using (public.is_org_member(organization_id));

-- 6.5 Processing Jobs Policies
drop policy if exists "jobs_select_members" on public.processing_jobs;
create policy "jobs_select_members" on public.processing_jobs
  for select using (public.is_org_member(organization_id));

-- 6.6 Extraction Results Policies
drop policy if exists "extraction_select_members" on public.extraction_results;
create policy "extraction_select_members" on public.extraction_results
  for select using (public.is_org_member(organization_id));

-- 6.7 Extracted Fields Policies
drop policy if exists "fields_select_members" on public.extracted_fields;
create policy "fields_select_members" on public.extracted_fields
  for select using (public.is_org_member(organization_id));

drop policy if exists "fields_update_reviewers" on public.extracted_fields;
create policy "fields_update_reviewers" on public.extracted_fields
  for update using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 6.8 Validation Issues Policies
drop policy if exists "issues_select_members" on public.validation_issues;
create policy "issues_select_members" on public.validation_issues
  for select using (public.is_org_member(organization_id));

drop policy if exists "issues_update_reviewers" on public.validation_issues;
create policy "issues_update_reviewers" on public.validation_issues
  for update using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 6.9 Reconciliations Policies
drop policy if exists "recon_select_members" on public.reconciliations;
create policy "recon_select_members" on public.reconciliations
  for select using (public.is_org_member(organization_id));

drop policy if exists "recon_insert_reviewers" on public.reconciliations;
create policy "recon_insert_reviewers" on public.reconciliations
  for insert with check (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

drop policy if exists "recon_update_reviewers" on public.reconciliations;
create policy "recon_update_reviewers" on public.reconciliations
  for update using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 6.10 Review Events Policies
drop policy if exists "reviews_select_members" on public.review_events;
create policy "reviews_select_members" on public.review_events
  for select using (public.is_org_member(organization_id));

drop policy if exists "reviews_insert_members" on public.review_events;
create policy "reviews_insert_members" on public.review_events
  for insert with check (public.is_org_member(organization_id) and auth.uid() = actor_id);

-- 6.11 Audit Events Policies
drop policy if exists "audit_select_admins" on public.audit_events;
create policy "audit_select_admins" on public.audit_events
  for select using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

drop policy if exists "audit_insert_members" on public.audit_events;
create policy "audit_insert_members" on public.audit_events
  for insert with check (public.is_org_member(organization_id));

-- 6.12 Knowledge Queries Policies
drop policy if exists "knowledge_select_members" on public.knowledge_queries;
create policy "knowledge_select_members" on public.knowledge_queries
  for select using (public.is_org_member(organization_id));

drop policy if exists "knowledge_insert_members" on public.knowledge_queries;
create policy "knowledge_insert_members" on public.knowledge_queries
  for insert with check (public.is_org_member(organization_id) and auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 7. SUPABASE STORAGE BUCKET & STORAGE RLS POLICIES
-- ------------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public)
    values ('documents', 'documents', false)
    on conflict (id) do nothing;
  end if;

  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'objects') then
    drop policy if exists "storage_org_read" on storage.objects;
    create policy "storage_org_read" on storage.objects
      for select using (
        bucket_id = 'documents'
        and auth.role() = 'authenticated'
        and public.is_org_member((storage.foldername(name))[1]::uuid)
      );

    drop policy if exists "storage_org_insert" on storage.objects;
    create policy "storage_org_insert" on storage.objects
      for insert with check (
        bucket_id = 'documents'
        and auth.role() = 'authenticated'
        and public.is_org_member((storage.foldername(name))[1]::uuid)
      );

    drop policy if exists "storage_org_delete" on storage.objects;
    create policy "storage_org_delete" on storage.objects
      for delete using (
        bucket_id = 'documents'
        and auth.role() = 'authenticated'
        and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin'])
      );
  end if;
exception when others then
  raise notice 'Storage configuration note: %', sqlerrm;
end $$;

-- ------------------------------------------------------------------------------
-- 8. ENTERPRISE SEED DATA (Apex Global Logistics Corp)
-- ------------------------------------------------------------------------------
do $$
declare
  v_user_owner uuid := '00000000-0000-0000-0000-000000000001';
  v_user_rev uuid := '00000000-0000-0000-0000-000000000002';
  v_org_id uuid := '11111111-1111-1111-1111-111111111111';
  v_doc_inv1 uuid := '22222222-2222-2222-2222-222222222221';
  v_doc_po1 uuid := '22222222-2222-2222-2222-222222222222';
  v_doc_inv2 uuid := '22222222-2222-2222-2222-222222222223';
  v_doc_contract uuid := '22222222-2222-2222-2222-222222222224';
  v_doc_receipt uuid := '22222222-2222-2222-2222-222222222225';
  v_ext_inv1 uuid := '33333333-3333-3333-3333-333333333331';
  v_ext_po1 uuid := '33333333-3333-3333-3333-333333333332';
begin
  -- Resolve valid creator user ID
  if not exists (select 1 from auth.users where id = v_user_owner) then
    select id into v_user_owner from auth.users limit 1;
    v_user_rev := v_user_owner;
  end if;

  if v_user_owner is not null then
    -- 8.1 Organization
    insert into public.organizations (id, name, slug, created_by, settings)
    values (
      v_org_id,
      'Apex Logistics & Industrial Corp',
      'apex-logistics',
      v_user_owner,
      jsonb_build_object('currency', 'USD', 'tolerance_amount', 0.05, 'auto_classify', true)
    ) on conflict (id) do nothing;

    -- 8.2 Organization Memberships
    insert into public.organization_members (organization_id, user_id, role)
    values 
      (v_org_id, v_user_owner, 'owner'),
      (v_org_id, coalesce(v_user_rev, v_user_owner), 'reviewer')
    on conflict (organization_id, user_id) do nothing;

    -- 8.3 Documents
    insert into public.documents (
      id, organization_id, uploaded_by, title, description,
      original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
      category, processing_status, review_status, extraction_schema_version, tags
    ) values 
    (
      v_doc_inv1, v_org_id, v_user_owner, 'TechGear Solutions - Inv 4401',
      'Hardware procurement for engineering workstations',
      'invoice_4401.pdf', v_org_id || '/' || v_doc_inv1 || '/invoice_4401.pdf',
      'application/pdf', 145200, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      'invoice', 'needs_review', 'pending', 'invoice.v1', array['hardware', 'q3-procurement']
    ),
    (
      v_doc_po1, v_org_id, v_user_owner, 'Purchase Order PO-8820 - TechGear Solutions',
      'Approved purchase order matching invoice 4401',
      'po_8820.pdf', v_org_id || '/' || v_doc_po1 || '/po_8820.pdf',
      'application/pdf', 112400, 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      'purchase_order', 'approved', 'approved', 'purchase_order.v1', array['po', 'approved']
    ),
    (
      v_doc_inv2, v_org_id, v_user_owner, 'Global Office Depot - Inv 9912',
      'Office ergonomic supplies and whiteboards',
      'invoice_9912.pdf', v_org_id || '/' || v_doc_inv2 || '/invoice_9912.pdf',
      'application/pdf', 98300, 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
      'invoice', 'needs_review', 'pending', 'invoice.v1', array['facilities']
    ),
    (
      v_doc_contract, v_org_id, v_user_owner, 'CloudScale Master Services Agreement',
      'SaaS cloud telemetry agreement 2026-2028',
      'msa_cloudscale_2026.pdf', v_org_id || '/' || v_doc_contract || '/msa_cloudscale_2026.pdf',
      'application/pdf', 342100, '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
      'contract', 'approved', 'approved', 'contract.v1', array['legal', 'cloud']
    ),
    (
      v_doc_receipt, v_org_id, v_user_owner, 'Airport Shuttle Travel Receipt',
      'Executive logistics on-site travel',
      'receipt_airport.jpg', v_org_id || '/' || v_doc_receipt || '/receipt_airport.jpg',
      'image/jpeg', 82400, '8f434346648f6b96df89dda901c5176b10e6d05961',
      'receipt', 'approved', 'approved', 'receipt.v1', array['travel', 'operations']
    )
    on conflict (id) do nothing;

    -- 8.4 Document Pages
    insert into public.document_pages (organization_id, document_id, page_number, text_content, ocr_confidence)
    values (
      v_org_id, v_doc_inv1, 1,
      'TECHGEAR SOLUTIONS INC.
Tax ID: US-82-4910291
INVOICE: INV-2026-4401
Date: 2026-09-15 | Due Date: 2026-10-15
PO Reference: PO-8820
Bill To: Apex Logistics & Industrial Corp
Line Items:
1. UltraSharp 27" 4K Monitor | Qty: 4 | Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Quad Display Dock | Qty: 4 | Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax (0%): $0.00 | Discount: $0.00
Total Due: $2,360.00 USD
Payment Terms: Net 30 days via Wire Transfer',
      0.985
    ) on conflict (document_id, page_number) do nothing;

    -- 8.5 Extraction Result
    insert into public.extraction_results (
      id, organization_id, document_id, schema_version, confidence_score, model_name, extracted_data
    ) values (
      v_ext_inv1, v_org_id, v_doc_inv1, 'invoice.v1', 0.965, 'gemini-1.5-flash',
      jsonb_build_object(
        'invoice_number', 'INV-2026-4401',
        'po_reference', 'PO-8820',
        'vendor_name', 'TechGear Solutions Inc.',
        'customer_name', 'Apex Logistics & Industrial Corp',
        'currency', 'USD',
        'subtotal', 2360.00,
        'total_amount', 2360.00
      )
    ) on conflict (id) do nothing;

    -- 8.6 Extracted Fields with Evidence Bounding Boxes
    insert into public.extracted_fields (
      organization_id, document_id, extraction_result_id, field_path, field_value, confidence, page_number, bounding_box, source_text
    ) values 
    (
      v_org_id, v_doc_inv1, v_ext_inv1, 'invoice_number', to_jsonb('INV-2026-4401'::text), 0.99, 1,
      jsonb_build_object('box_2d', array[145, 680, 168, 880]), 'INVOICE: INV-2026-4401'
    ),
    (
      v_org_id, v_doc_inv1, v_ext_inv1, 'total_amount', to_jsonb(2360.00::numeric), 0.98, 1,
      jsonb_build_object('box_2d', array[550, 750, 580, 920]), 'Total Due: $2,360.00 USD'
    ),
    (
      v_org_id, v_doc_inv1, v_ext_inv1, 'vendor_name', to_jsonb('TechGear Solutions Inc.'::text), 0.96, 1,
      jsonb_build_object('box_2d', array[80, 80, 110, 420]), 'TECHGEAR SOLUTIONS INC.'
    ),
    (
      v_org_id, v_doc_inv1, v_ext_inv1, 'po_reference', to_jsonb('PO-8820'::text), 0.97, 1,
      jsonb_build_object('box_2d', array[175, 680, 195, 820]), 'PO Reference: PO-8820'
    )
    on conflict (extraction_result_id, field_path) do nothing;

    -- 8.7 2-Way Match Reconciliation
    insert into public.reconciliations (
      organization_id, invoice_document_id, purchase_order_document_id, status, comparison_result, tolerance_config, created_by
    ) values (
      v_org_id, v_doc_inv1, v_doc_po1, 'matched',
      jsonb_build_object(
        'match_status', 'matched',
        'supplier_match', jsonb_build_object('matched', true, 'invoice_supplier', 'TechGear Solutions Inc.', 'po_supplier', 'TechGear Solutions Inc.'),
        'currency_match', jsonb_build_object('matched', true, 'invoice_currency', 'USD', 'po_currency', 'USD'),
        'po_reference_match', jsonb_build_object('matched', true, 'expected_po', 'PO-8820', 'invoice_referenced_po', 'PO-8820'),
        'amount_comparison', jsonb_build_object('invoice_total', 2360, 'po_total', 2360, 'total_diff', 0, 'within_tolerance', true),
        'line_item_comparisons', jsonb_build_array(
          jsonb_build_object('description', 'UltraSharp 27" 4K Monitor', 'invoice_quantity', 4, 'po_quantity', 4, 'invoice_price', 450, 'po_price', 450, 'status', 'matched'),
          jsonb_build_object('description', 'Thunderbolt 4 Quad Display Dock', 'invoice_quantity', 4, 'po_quantity', 4, 'invoice_price', 140, 'po_price', 140, 'status', 'matched')
        ),
        'discrepancies', '[]'::jsonb
      ),
      jsonb_build_object('amount_tolerance', 0.01, 'percentage_tolerance', 0.5),
      v_user_owner
    ) on conflict (invoice_document_id, purchase_order_document_id) do nothing;

  end if;
exception when others then
  raise notice 'Enterprise demo seed data skipped or partially populated: %', sqlerrm;
end $$;

-- ==============================================================================
-- SETUP COMPLETE
-- All 12 tables, indexes, triggers, functions, and RLS policies are active.
-- ==============================================================================
