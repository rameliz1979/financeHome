create table if not exists public.household_budgets (
    household_id uuid primary key references public.households(id) on delete cascade,
    monthly_budget numeric(14, 2) not null check (monthly_budget > 0),
    updated_at timestamptz not null default now()
);

alter table public.household_budgets enable row level security;

drop policy if exists household_budgets_member_read on public.household_budgets;
create policy household_budgets_member_read
    on public.household_budgets for select to authenticated
    using (exists (
        select 1
        from public.household_members member
        where member.household_id = household_budgets.household_id
          and member.user_id = auth.uid()
    ));

drop policy if exists household_budgets_admin_write on public.household_budgets;
create policy household_budgets_admin_write
    on public.household_budgets for all to authenticated
    using (exists (
        select 1
        from public.household_members member
        where member.household_id = household_budgets.household_id
          and member.user_id = auth.uid()
                    and member.role = 'admin'
    ))
    with check (exists (
        select 1
        from public.household_members member
        where member.household_id = household_budgets.household_id
          and member.user_id = auth.uid()
                    and member.role = 'admin'
    ));

grant select, insert, update, delete on public.household_budgets to authenticated;

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references auth.users(id) on delete cascade,
    household_id uuid not null references public.households(id) on delete cascade,
    period_start date not null,
    threshold_percent smallint not null check (threshold_percent in (80, 90, 100)),
    title text not null,
    message text not null,
    is_active boolean not null default true,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    unique (recipient_id, household_id, period_start, threshold_percent)
);

create index if not exists notifications_recipient_household_created_idx
    on public.notifications (recipient_id, household_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_member_read on public.notifications;
create policy notifications_member_read
    on public.notifications for select to authenticated
    using (
        recipient_id = auth.uid()
        and exists (
            select 1
            from public.household_members member
            where member.household_id = notifications.household_id
              and member.user_id = auth.uid()
        )
    );

drop policy if exists notifications_member_mark_read on public.notifications;
create policy notifications_member_mark_read
    on public.notifications for update to authenticated
    using (
        recipient_id = auth.uid()
        and exists (
            select 1
            from public.household_members member
            where member.household_id = notifications.household_id
              and member.user_id = auth.uid()
        )
    )
    with check (
        recipient_id = auth.uid()
        and exists (
            select 1
            from public.household_members member
            where member.household_id = notifications.household_id
              and member.user_id = auth.uid()
        )
    );

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.refresh_household_budget_alerts(
    p_household_id uuid,
    p_period_start date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_period_start date := date_trunc('month', coalesce(p_period_start, current_date)::timestamp)::date;
    v_budget numeric(14, 2);
    v_spent numeric(14, 2);
    v_threshold smallint;
    v_is_active boolean;
begin
    select monthly_budget
    into v_budget
    from public.household_budgets
    where household_id = p_household_id;

    select coalesce(sum(amount), 0)
    into v_spent
    from public.transactions
    where household_id = p_household_id
      and type = 'expense'
      and transaction_date >= v_period_start
      and transaction_date < (v_period_start + interval '1 month')::date;

    foreach v_threshold in array array[80, 90, 100]::smallint[] loop
        v_is_active := v_budget is not null
            and v_budget > 0
            and v_spent * 100 >= v_budget * v_threshold;

        if not v_is_active then
            update public.notifications
            set is_active = false,
                read_at = coalesce(read_at, now())
            where household_id = p_household_id
              and period_start = v_period_start
              and threshold_percent = v_threshold
              and is_active;
            continue;
        end if;

        insert into public.notifications (
            recipient_id,
            household_id,
            period_start,
            threshold_percent,
            title,
            message,
            is_active,
            read_at,
            created_at
        )
        select
            member.user_id,
            p_household_id,
            v_period_start,
            v_threshold,
            format('Presupuesto mensual al %s%%', v_threshold),
            format(
                'Los gastos del hogar alcanzaron el %s%% del presupuesto: %s de %s.',
                v_threshold,
                to_char(v_spent, 'FM999G999G999G990D00'),
                to_char(v_budget, 'FM999G999G999G990D00')
            ),
            true,
            null,
            now()
        from public.household_members member
        where member.household_id = p_household_id
          and member.user_id is not null
        on conflict (recipient_id, household_id, period_start, threshold_percent)
        do update set
            title = excluded.title,
            message = excluded.message,
            is_active = true,
            read_at = null,
            created_at = now()
        where public.notifications.is_active = false;
    end loop;
end;
$$;

revoke all on function public.refresh_household_budget_alerts(uuid, date) from public, anon, authenticated;

create or replace function public.handle_expense_budget_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op = 'INSERT' then
        if new.type = 'expense' then
            perform public.refresh_household_budget_alerts(new.household_id, new.transaction_date);
        end if;
        return new;
    elsif tg_op = 'UPDATE' then
        if old.type = 'expense' then
            perform public.refresh_household_budget_alerts(old.household_id, old.transaction_date);
        end if;
        if new.type = 'expense' then
            perform public.refresh_household_budget_alerts(new.household_id, new.transaction_date);
        end if;
        return new;
    elsif tg_op = 'DELETE' then
        if old.type = 'expense' then
            perform public.refresh_household_budget_alerts(old.household_id, old.transaction_date);
        end if;
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists transactions_budget_alerts on public.transactions;
create trigger transactions_budget_alerts
    after insert or update or delete on public.transactions
    for each row execute function public.handle_expense_budget_alerts();

create or replace function public.handle_household_budget_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if tg_op in ('UPDATE', 'DELETE') then
        perform public.refresh_household_budget_alerts(old.household_id, current_date);
    end if;

    if tg_op in ('INSERT', 'UPDATE') then
        perform public.refresh_household_budget_alerts(new.household_id, current_date);
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists household_budgets_alerts on public.household_budgets;
create trigger household_budgets_alerts
    after insert or update or delete on public.household_budgets
    for each row execute function public.handle_household_budget_alerts();

create or replace function public.handle_new_household_member_budget_alerts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    perform public.refresh_household_budget_alerts(new.household_id, current_date);
    return new;
end;
$$;

drop trigger if exists household_members_budget_alerts on public.household_members;
create trigger household_members_budget_alerts
    after insert on public.household_members
    for each row execute function public.handle_new_household_member_budget_alerts();

do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
           select 1
           from pg_publication_tables
           where pubname = 'supabase_realtime'
             and schemaname = 'public'
             and tablename = 'notifications'
       ) then
        execute 'alter publication supabase_realtime add table public.notifications';
    end if;
end;
$$;