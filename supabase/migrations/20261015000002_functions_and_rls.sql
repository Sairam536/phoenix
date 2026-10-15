-- ==============================================================================
-- DOCUMIND AI — FUNCTIONS AND ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 20261015000002_functions_and_rls.sql
-- Description: Security helpers, atomic job claiming, and organization-scoped RLS
-- ==============================================================================

-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- Helper: Checks whether current authenticated user is a member of the organization
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

-- Helper: Checks whether current authenticated user has an allowed role in the organization
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

-- 2. TRANSACTIONAL ORGANIZATION ONBOARDING FUNCTION
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

-- 3. ATOMIC PROCESSING JOB CLAIM FUNCTION (FOR WORKERS)
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
      status = 'running',
      worker_id = p_worker_id,
      attempt_count = attempt_count + 1,
      started_at = now(),
      updated_at = now()
    where id = v_job.id
    returning * into v_job;
  end if;

  return v_job;
end;
$$;

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
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

-- 4.1 ORGANIZATIONS
create policy "org_select_members"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "org_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "org_update_owners_admins"
  on public.organizations for update
  using (public.has_org_role(id, array['owner', 'admin']))
  with check (public.has_org_role(id, array['owner', 'admin']));

-- 4.2 ORGANIZATION MEMBERS
create policy "member_select"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "member_insert_owners_admins"
  on public.organization_members for insert
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "member_update_owners_admins"
  on public.organization_members for update
  using (public.has_org_role(organization_id, array['owner', 'admin']))
  with check (public.has_org_role(organization_id, array['owner', 'admin']));

create policy "member_delete_owners"
  on public.organization_members for delete
  using (public.has_org_role(organization_id, array['owner']));

-- 4.3 DOCUMENTS
create policy "doc_select_members"
  on public.documents for select
  using (public.is_org_member(organization_id));

create policy "doc_insert_members"
  on public.documents for insert
  with check (
    public.is_org_member(organization_id)
    and auth.uid() = uploaded_by
  );

create policy "doc_update_reviewers"
  on public.documents for update
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

create policy "doc_delete_admins"
  on public.documents for delete
  using (public.has_org_role(organization_id, array['owner', 'admin']));

-- 4.4 DOCUMENT PAGES
create policy "pages_select_members"
  on public.document_pages for select
  using (public.is_org_member(organization_id));

create policy "pages_all_admins"
  on public.document_pages for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.5 PROCESSING JOBS
create policy "jobs_select_members"
  on public.processing_jobs for select
  using (public.is_org_member(organization_id));

create policy "jobs_manage_admins"
  on public.processing_jobs for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.6 EXTRACTION RESULTS
create policy "extraction_select_members"
  on public.extraction_results for select
  using (public.is_org_member(organization_id));

create policy "extraction_manage_reviewers"
  on public.extraction_results for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.7 EXTRACTED FIELDS
create policy "fields_select_members"
  on public.extracted_fields for select
  using (public.is_org_member(organization_id));

create policy "fields_update_reviewers"
  on public.extracted_fields for update
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']))
  with check (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

create policy "fields_manage_reviewers"
  on public.extracted_fields for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.8 VALIDATION ISSUES
create policy "issues_select_members"
  on public.validation_issues for select
  using (public.is_org_member(organization_id));

create policy "issues_manage_reviewers"
  on public.validation_issues for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.9 RECONCILIATIONS
create policy "recon_select_members"
  on public.reconciliations for select
  using (public.is_org_member(organization_id));

create policy "recon_manage_reviewers"
  on public.reconciliations for all
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

-- 4.10 REVIEW EVENTS
create policy "review_events_select_members"
  on public.review_events for select
  using (public.is_org_member(organization_id));

create policy "review_events_insert_reviewers"
  on public.review_events for insert
  with check (
    public.has_org_role(organization_id, array['owner', 'admin', 'reviewer'])
    and auth.uid() = actor_id
  );

-- 4.11 AUDIT EVENTS (Append-only for users)
create policy "audit_select_admins"
  on public.audit_events for select
  using (public.has_org_role(organization_id, array['owner', 'admin', 'reviewer']));

create policy "audit_insert_members"
  on public.audit_events for insert
  with check (public.is_org_member(organization_id));

-- 4.12 KNOWLEDGE QUERIES
create policy "knowledge_select_members"
  on public.knowledge_queries for select
  using (public.is_org_member(organization_id));

create policy "knowledge_insert_members"
  on public.knowledge_queries for insert
  with check (
    public.is_org_member(organization_id)
    and auth.uid() = user_id
  );

-- ==============================================================================
-- 5. STORAGE POLICIES FOR PRIVATE BUCKET 'documents'
-- ==============================================================================
-- Note: Buckets are created in Supabase storage schema.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "storage_org_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "storage_org_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and public.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "storage_org_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and public.has_org_role((storage.foldername(name))[1]::uuid, array['owner', 'admin'])
  );
