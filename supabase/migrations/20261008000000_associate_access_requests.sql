create table if not exists public.associate_access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  email text not null check (char_length(email) between 3 and 320),
  phone text,
  department text,
  year integer check (year is null or year between 1 and 8),
  section text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'processing', 'approved', 'rejected', 'cancelled')),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  rejection_reason text,
  approved_auth_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists associate_access_requests_pending_email_idx
  on public.associate_access_requests (lower(email))
  where status = 'pending';

alter table public.associate_access_requests enable row level security;

alter table public.associate_access_requests drop constraint if exists associate_access_requests_status_check;
alter table public.associate_access_requests
  add constraint associate_access_requests_status_check
  check (status in ('pending', 'processing', 'approved', 'rejected', 'cancelled'));

drop policy if exists "public_can_submit_associate_access_request" on public.associate_access_requests;
create policy "public_can_submit_associate_access_request"
  on public.associate_access_requests for insert to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
    and approved_auth_user_id is null
  );

drop policy if exists "admins_can_read_associate_access_requests" on public.associate_access_requests;
create policy "admins_can_read_associate_access_requests"
  on public.associate_access_requests for select to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

drop policy if exists "admins_can_update_associate_access_requests" on public.associate_access_requests;
create policy "admins_can_update_associate_access_requests"
  on public.associate_access_requests for update to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin' and is_active = true
    )
  );

create or replace function public.submit_associate_access_request(
  p_full_name text,
  p_email text,
  p_phone text default null,
  p_department text default null,
  p_year integer default null,
  p_section text default null,
  p_reason text default null
) returns public.associate_access_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(p_email));
  result public.associate_access_requests;
begin
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'A valid email address is required.';
  end if;
  if exists (select 1 from public.user_profiles where lower(email) = normalized_email and is_active = true) then
    raise exception 'An active account already exists for this email.';
  end if;
  if exists (select 1 from public.associates where lower(email) = normalized_email and is_active = true) then
    raise exception 'An active Associate already exists for this email.';
  end if;
  insert into public.associate_access_requests
    (full_name, email, phone, department, year, section, reason)
  values
    (trim(p_full_name), normalized_email, nullif(trim(p_phone), ''), nullif(trim(p_department), ''),
     p_year, nullif(trim(p_section), ''), nullif(trim(p_reason), ''))
  returning * into result;
  return result;
exception
  when unique_violation then
    raise exception 'An access request for this email is already pending.';
end;
$$;

revoke all on function public.submit_associate_access_request(text, text, text, text, integer, text, text) from public;
grant execute on function public.submit_associate_access_request(text, text, text, text, integer, text, text) to anon, authenticated;
