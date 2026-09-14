do $$
begin
  if exists (
    select 1
    from public.invoices
    where quote_id is not null
    group by organization_id, quote_id
    having count(*) > 1
  ) then
    raise exception 'duplicate_invoices_for_quote';
  end if;
end
$$;

create unique index if not exists invoices_organization_quote_unique
  on public.invoices(organization_id, quote_id)
  where quote_id is not null;

create or replace function public.convert_quote_to_invoice_atomic(
  p_organization_id uuid,
  p_quote_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quote public.quotes%rowtype;
  v_invoice public.invoices%rowtype;
  v_year integer := extract(year from current_date)::integer;
  v_sequence integer;
  v_payment_terms integer := 30;
  v_terms_match text[];
begin
  -- Serialise invoice number allocation for one tenant while allowing other
  -- organizations to convert quotes independently.
  perform 1
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  select *
  into v_quote
  from public.quotes
  where organization_id = p_organization_id
    and id = p_quote_id
  for update;

  if not found then
    raise exception 'quote_not_found' using errcode = 'P0002';
  end if;

  if v_quote.client_id is null then
    raise exception 'quote_client_required' using errcode = 'P0001';
  end if;

  if v_quote.status not in ('sent', 'accepted') then
    raise exception 'quote_not_convertible' using errcode = 'P0001';
  end if;

  select *
  into v_invoice
  from public.invoices
  where organization_id = p_organization_id
    and quote_id = p_quote_id;

  if found then
    return jsonb_build_object(
      'created', false,
      'invoice', to_jsonb(v_invoice)
    );
  end if;

  v_terms_match := regexp_match(
    coalesce(v_quote.notes, ''),
    'Paiement\s*:\s*([0-9]{1,3})\s*jours',
    'i'
  );
  if v_terms_match is not null
    and v_terms_match[1]::integer between 0 and 365 then
    v_payment_terms := v_terms_match[1]::integer;
  end if;

  select coalesce(max(
    substring(number from ('^FAC-' || v_year::text || '-([0-9]+)$'))::integer
  ), 0) + 1
  into v_sequence
  from public.invoices
  where organization_id = p_organization_id
    and number ~ ('^FAC-' || v_year::text || '-[0-9]+$');

  insert into public.invoices (
    organization_id,
    client_id,
    project_id,
    quote_id,
    number,
    amount_cents,
    subtotal_cents,
    tax_cents,
    total_cents,
    currency,
    status,
    issued_at,
    due_at,
    notes,
    payment_reference_type,
    payment_reference
  ) values (
    p_organization_id,
    v_quote.client_id,
    v_quote.project_id,
    v_quote.id,
    format('FAC-%s-%s', v_year, lpad(v_sequence::text, 4, '0')),
    v_quote.amount_cents,
    v_quote.subtotal_cents,
    v_quote.tax_cents,
    v_quote.total_cents,
    v_quote.currency,
    'draft',
    current_date,
    current_date + v_payment_terms,
    format('Facture créée depuis le devis %s.', v_quote.number),
    'NON',
    null
  )
  returning * into v_invoice;

  insert into public.invoice_items (
    organization_id,
    invoice_id,
    position,
    label,
    description,
    quantity,
    unit_price_cents,
    tax_rate,
    total_cents
  )
  select
    p_organization_id,
    v_invoice.id,
    position,
    label,
    description,
    quantity,
    unit_price_cents,
    tax_rate,
    total_cents
  from public.quote_items
  where organization_id = p_organization_id
    and quote_id = p_quote_id
  order by position, id;

  update public.quotes
  set status = 'accepted'
  where organization_id = p_organization_id
    and id = p_quote_id;

  return jsonb_build_object(
    'created', true,
    'invoice', to_jsonb(v_invoice)
  );
end;
$$;

revoke all on function public.convert_quote_to_invoice_atomic(uuid, bigint)
  from public, anon, authenticated;
grant execute on function public.convert_quote_to_invoice_atomic(uuid, bigint)
  to service_role;

comment on function public.convert_quote_to_invoice_atomic(uuid, bigint) is
  'Atomically locks one tenant quote, returns its existing invoice or creates the invoice and lines before accepting the quote. Service-role only.';
