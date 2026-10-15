-- ==============================================================================
-- DOCUMIND AI — SYNTHETIC SEED DATA
-- Purpose: Demo and local testing dataset with fully populated relational records
-- ==============================================================================

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_org_id uuid := '11111111-1111-1111-1111-111111111111';
  v_doc_inv1 uuid := '22222222-2222-2222-2222-222222222221';
  v_doc_po1 uuid := '22222222-2222-2222-2222-222222222222';
  v_doc_inv2 uuid := '22222222-2222-2222-2222-222222222223';
  v_doc_contract uuid := '22222222-2222-2222-2222-222222222224';
  v_doc_receipt uuid := '22222222-2222-2222-2222-222222222225';
  v_ext_inv1 uuid := '33333333-3333-3333-3333-333333333331';
  v_ext_po1 uuid := '33333333-3333-3333-3333-333333333332';
begin
  -- 0. Insert demo users into auth.users so foreign keys and logins succeed
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
  values 
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@apexlogistics.demo', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Alex Rivera (Owner)"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'reviewer@apexlogistics.demo', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Taylor Chen (Reviewer)"}'::jsonb, now(), now(), 'authenticated', 'authenticated'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'member@apexlogistics.demo', crypt('Password123!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{"full_name":"Sam Morgan (Member)"}'::jsonb, now(), now(), 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  -- 1. Organization
  insert into public.organizations (id, name, slug, created_by, settings)
  values (
    v_org_id,
    'Apex Logistics & Industrial Corp',
    'apex-logistics',
    v_user_id,
    jsonb_build_object('currency', 'USD', 'tolerance_amount', 0.05, 'auto_classify', true)
  ) on conflict (id) do nothing;

  -- 2. Organization Member
  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  -- 3. Document 1: Invoice INV-2026-4401
  insert into public.documents (
    id, organization_id, uploaded_by, title, description,
    original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
    category, processing_status, review_status, extraction_schema_version, tags
  ) values (
    v_doc_inv1, v_org_id, v_user_id, 'TechGear Solutions - Inv 4401',
    'Hardware procurement for engineering workstations',
    'invoice_4401.pdf', v_org_id || '/' || v_doc_inv1 || '/invoice_4401.pdf',
    'application/pdf', 145200, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    'invoice', 'needs_review', 'pending', 'invoice.v1', array['hardware', 'q3-procurement']
  ) on conflict (id) do nothing;

  -- 4. Document 2: Purchase Order PO-8820
  insert into public.documents (
    id, organization_id, uploaded_by, title, description,
    original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
    category, processing_status, review_status, extraction_schema_version, tags
  ) values (
    v_doc_po1, v_org_id, v_user_id, 'Purchase Order PO-8820 - TechGear Solutions',
    'Approved purchase order for 4x Dell 27-inch 4K Displays and 4x Thunderbolt Docks',
    'po_8820.pdf', v_org_id || '/' || v_doc_po1 || '/po_8820.pdf',
    'application/pdf', 112400, 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    'purchase_order', 'approved', 'approved', 'purchase_order.v1', array['hardware', 'po']
  ) on conflict (id) do nothing;

  -- 5. Document 3: Mismatched Invoice INV-2026-9912
  insert into public.documents (
    id, organization_id, uploaded_by, title, description,
    original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
    category, processing_status, review_status, extraction_schema_version, tags
  ) values (
    v_doc_inv2, v_org_id, v_user_id, 'Global Office Depot - Inv 9912',
    'Office ergonomic chairs and whiteboard supplies',
    'invoice_9912.pdf', v_org_id || '/' || v_doc_inv2 || '/invoice_9912.pdf',
    'application/pdf', 98300, 'f2ca1bb6c7e907d06dafe4687e579fce76b37e4e93b7605022da52e6ccc26fd2',
    'invoice', 'needs_review', 'pending', 'invoice.v1', array['furniture', 'facilities']
  ) on conflict (id) do nothing;

  -- 6. Document 4: MSA Contract
  insert into public.documents (
    id, organization_id, uploaded_by, title, description,
    original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
    category, processing_status, review_status, extraction_schema_version, tags
  ) values (
    v_doc_contract, v_org_id, v_user_id, 'CloudScale Master Services Agreement',
    'Cloud infrastructure and SLA terms for calendar years 2026-2028',
    'msa_cloudscale_2026.pdf', v_org_id || '/' || v_doc_contract || '/msa_cloudscale_2026.pdf',
    'application/pdf', 342100, '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
    'contract', 'approved', 'approved', 'contract.v1', array['legal', 'cloud', 'sla']
  ) on conflict (id) do nothing;

  -- 7. Document 5: Expense Receipt
  insert into public.documents (
    id, organization_id, uploaded_by, title, description,
    original_filename, storage_path, mime_type, file_size_bytes, sha256_hash,
    category, processing_status, review_status, extraction_schema_version, tags
  ) values (
    v_doc_receipt, v_org_id, v_user_id, 'Airport Shuttle Travel Receipt',
    'Executive ground transportation expense for client audit',
    'receipt_airport.jpg', v_org_id || '/' || v_doc_receipt || '/receipt_airport.jpg',
    'image/jpeg', 82400, '8f434346648f6b96df89dda901c5176b10e6d05961',
    'receipt', 'approved', 'approved', 'receipt.v1', array['travel', 'expenses']
  ) on conflict (id) do nothing;

  -- Extracted Pages for INV-4401
  insert into public.document_pages (document_id, organization_id, page_number, extracted_text, extraction_method)
  values (
    v_doc_inv1, v_org_id, 1,
    'TECHGEAR SOLUTIONS INC.
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
Payment Terms: Net 30 days via Wire Transfer',
    'pdf_text'
  ) on conflict (document_id, page_number) do nothing;

  -- Extracted Pages for PO-8820
  insert into public.document_pages (document_id, organization_id, page_number, extracted_text, extraction_method)
  values (
    v_doc_po1, v_org_id, 1,
    'PURCHASE ORDER: PO-8820
Buyer: Apex Logistics & Industrial Corp
Supplier: TechGear Solutions Inc.
Issue Date: 2026-09-10
Expected Delivery: 2026-09-22
Currency: USD
Items:
1. UltraSharp 27" 4K Monitor | Qty: 4 | Unit Price: $450.00 | Total: $1,800.00
2. Thunderbolt 4 Docking Station | Qty: 4 | Unit Price: $140.00 | Total: $560.00
Subtotal: $2,360.00 | Tax: $0.00 | Total Amount: $2,360.00 USD
Delivery: 450 Logistics Hub Parkway, Dallas TX 75201',
    'pdf_text'
  ) on conflict (document_id, page_number) do nothing;

  -- Extraction Results for INV-4401
  insert into public.extraction_results (
    id, organization_id, document_id, schema_version,
    extracted_data, classification, extraction_confidence, model_name
  ) values (
    v_ext_inv1, v_org_id, v_doc_inv1, 'invoice.v1',
    jsonb_build_object(
      'supplier_name', 'TechGear Solutions Inc.',
      'invoice_number', 'INV-2026-4401',
      'invoice_date', '2026-09-15',
      'due_date', '2026-10-15',
      'currency', 'USD',
      'subtotal', '2360.00',
      'tax_amount', '0.00',
      'discount', '0.00',
      'total_amount', '2360.00',
      'purchase_order_reference', 'PO-8820',
      'line_items', jsonb_build_array(
        jsonb_build_object('description', 'UltraSharp 27" 4K Monitor (U2723QE)', 'quantity', '4', 'unit_price', '450.00', 'line_total', '1800.00', 'page', 1),
        jsonb_build_object('description', 'Thunderbolt 4 Quad Display Dock', 'quantity', '4', 'unit_price', '140.00', 'line_total', '560.00', 'page', 1)
      )
    ),
    jsonb_build_object('category', 'invoice', 'confidence', 0.98, 'reason', 'Contains clear supplier details, tax ID, line items, and payable total'),
    0.97, 'gemini-1.5-pro'
  ) on conflict (id) do nothing;

  -- Extracted Fields for INV-4401
  insert into public.extracted_fields (organization_id, document_id, extraction_result_id, field_path, field_value, normalized_value, confidence, evidence, validation_status)
  values
    (v_org_id, v_doc_inv1, v_ext_inv1, 'invoice_number', '"INV-2026-4401"', '"INV-2026-4401"', 0.99, jsonb_build_array(jsonb_build_object('page', 1, 'quote', 'INVOICE: INV-2026-4401', 'verified', true)), 'valid'),
    (v_org_id, v_doc_inv1, v_ext_inv1, 'supplier_name', '"TechGear Solutions Inc."', '"TechGear Solutions Inc."', 0.98, jsonb_build_array(jsonb_build_object('page', 1, 'quote', 'TECHGEAR SOLUTIONS INC.', 'verified', true)), 'valid'),
    (v_org_id, v_doc_inv1, v_ext_inv1, 'total_amount', '"2360.00"', '2360.00', 0.99, jsonb_build_array(jsonb_build_object('page', 1, 'quote', 'Total Due: $2,360.00 USD', 'verified', true)), 'valid'),
    (v_org_id, v_doc_inv1, v_ext_inv1, 'purchase_order_reference', '"PO-8820"', '"PO-8820"', 0.96, jsonb_build_array(jsonb_build_object('page', 1, 'quote', 'PO Reference: PO-8820', 'verified', true)), 'valid');

  -- Reconciliation between INV-4401 and PO-8820
  insert into public.reconciliations (
    organization_id, invoice_document_id, purchase_order_document_id,
    status, comparison_result, created_by
  ) values (
    v_org_id, v_doc_inv1, v_doc_po1, 'matched',
    jsonb_build_object(
      'match_status', 'matched',
      'supplier_match', jsonb_build_object('matched', true, 'invoice_supplier', 'TechGear Solutions Inc.', 'po_supplier', 'TechGear Solutions Inc.'),
      'currency_match', jsonb_build_object('matched', true, 'invoice_currency', 'USD', 'po_currency', 'USD'),
      'po_reference_match', jsonb_build_object('matched', true, 'expected_po', 'PO-8820', 'invoice_referenced_po', 'PO-8820'),
      'amount_comparison', jsonb_build_object('invoice_total', 2360.00, 'po_total', 2360.00, 'total_diff', 0.00, 'within_tolerance', true),
      'line_item_comparisons', jsonb_build_array(
        jsonb_build_object('description', 'UltraSharp 27" 4K Monitor', 'invoice_quantity', 4, 'po_quantity', 4, 'quantity_diff', 0, 'status', 'matched'),
        jsonb_build_object('description', 'Thunderbolt 4 Dock', 'invoice_quantity', 4, 'po_quantity', 4, 'quantity_diff', 0, 'status', 'matched')
      ),
      'discrepancies', jsonb_build_array()
    ),
    v_user_id
  );

  -- Audit event
  insert into public.audit_events (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_org_id, v_user_id, 'seed_data_created', 'system', v_org_id, jsonb_build_object('environment', 'synthetic_demo'));

end $$;
