-- =====================================================================
-- GYM TRACKER — SUPABASE SCHEMA
-- Run this entire script in the Supabase SQL Editor (Project > SQL Editor)
-- =====================================================================

-- Extension needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. workout_plans
-- ---------------------------------------------------------------------
create table if not exists public.workout_plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_workout_plans_user_id on public.workout_plans(user_id);

-- ---------------------------------------------------------------------
-- 2. exercises
-- ---------------------------------------------------------------------
create table if not exists public.exercises (
  id           uuid primary key default gen_random_uuid(),
  plan_id      uuid not null references public.workout_plans(id) on delete cascade,
  name         text not null,
  target_sets  integer not null default 3,
  order_index  integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_exercises_plan_id on public.exercises(plan_id);

-- ---------------------------------------------------------------------
-- 3. workout_logs
-- ---------------------------------------------------------------------
create table if not exists public.workout_logs (
  id           uuid primary key default gen_random_uuid(),
  exercise_id  uuid not null references public.exercises(id) on delete cascade,
  set_number   integer not null,
  weight_kg    numeric(6,2) default 0,
  reps         integer default 0,
  completed    boolean not null default false,
  logged_at    timestamptz not null default now(),
  unique (exercise_id, set_number)
);

create index if not exists idx_workout_logs_exercise_id on public.workout_logs(exercise_id);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Ownership chain: workout_logs -> exercises -> workout_plans -> auth.uid()
-- ---------------------------------------------------------------------
alter table public.workout_plans enable row level security;
alter table public.exercises      enable row level security;
alter table public.workout_logs   enable row level security;

-- workout_plans: user can only see/manage their own plans
create policy "Plans are viewable by owner"
  on public.workout_plans for select
  using (auth.uid() = user_id);

create policy "Plans are insertable by owner"
  on public.workout_plans for insert
  with check (auth.uid() = user_id);

create policy "Plans are updatable by owner"
  on public.workout_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Plans are deletable by owner"
  on public.workout_plans for delete
  using (auth.uid() = user_id);

-- exercises: ownership derived through parent plan
create policy "Exercises are viewable by plan owner"
  on public.exercises for select
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = exercises.plan_id and p.user_id = auth.uid()
    )
  );

create policy "Exercises are insertable by plan owner"
  on public.exercises for insert
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = exercises.plan_id and p.user_id = auth.uid()
    )
  );

create policy "Exercises are updatable by plan owner"
  on public.exercises for update
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = exercises.plan_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = exercises.plan_id and p.user_id = auth.uid()
    )
  );

create policy "Exercises are deletable by plan owner"
  on public.exercises for delete
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = exercises.plan_id and p.user_id = auth.uid()
    )
  );

-- workout_logs: ownership derived through exercise -> plan
create policy "Logs are viewable by owner"
  on public.workout_logs for select
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_plans p on p.id = e.plan_id
      where e.id = workout_logs.exercise_id and p.user_id = auth.uid()
    )
  );

create policy "Logs are insertable by owner"
  on public.workout_logs for insert
  with check (
    exists (
      select 1 from public.exercises e
      join public.workout_plans p on p.id = e.plan_id
      where e.id = workout_logs.exercise_id and p.user_id = auth.uid()
    )
  );

create policy "Logs are updatable by owner"
  on public.workout_logs for update
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_plans p on p.id = e.plan_id
      where e.id = workout_logs.exercise_id and p.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercises e
      join public.workout_plans p on p.id = e.plan_id
      where e.id = workout_logs.exercise_id and p.user_id = auth.uid()
    )
  );

create policy "Logs are deletable by owner"
  on public.workout_logs for delete
  using (
    exists (
      select 1 from public.exercises e
      join public.workout_plans p on p.id = e.plan_id
      where e.id = workout_logs.exercise_id and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- 4. body_weight_logs
-- ---------------------------------------------------------------------
create table if not exists public.body_weight_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  weight_kg   numeric(6,2) not null,
  created_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_body_weight_logs_user_id on public.body_weight_logs(user_id);

-- ---------------------------------------------------------------------
-- 5. body_measurements
-- ---------------------------------------------------------------------
create table if not exists public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  chest_cm    numeric(6,2),
  waist_cm    numeric(6,2),
  hips_cm     numeric(6,2),
  biceps_cm   numeric(6,2),
  thigh_cm    numeric(6,2),
  created_at  timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists idx_body_measurements_user_id on public.body_measurements(user_id);

-- ---------------------------------------------------------------------
-- 6. calorie_profiles (one row per user: BMR/TDEE inputs)
-- ---------------------------------------------------------------------
create table if not exists public.calorie_profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  sex         text not null default 'male',
  age         integer,
  height_cm   numeric(6,2),
  weight_kg   numeric(6,2),
  activity    text not null default 'moderate',
  goal        text not null default 'maintain',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. calorie_entries (daily food log)
-- ---------------------------------------------------------------------
create table if not exists public.calorie_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  log_date    date not null,
  name        text not null,
  calories    integer not null default 0,
  protein_g   numeric(6,2) default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_calorie_entries_user_id_date on public.calorie_entries(user_id, log_date);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY — new tables
-- ---------------------------------------------------------------------
alter table public.body_weight_logs  enable row level security;
alter table public.body_measurements enable row level security;
alter table public.calorie_profiles  enable row level security;
alter table public.calorie_entries   enable row level security;

create policy "Weight logs are owner-only select"
  on public.body_weight_logs for select using (auth.uid() = user_id);
create policy "Weight logs are owner-only insert"
  on public.body_weight_logs for insert with check (auth.uid() = user_id);
create policy "Weight logs are owner-only update"
  on public.body_weight_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Weight logs are owner-only delete"
  on public.body_weight_logs for delete using (auth.uid() = user_id);

create policy "Measurements are owner-only select"
  on public.body_measurements for select using (auth.uid() = user_id);
create policy "Measurements are owner-only insert"
  on public.body_measurements for insert with check (auth.uid() = user_id);
create policy "Measurements are owner-only update"
  on public.body_measurements for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Measurements are owner-only delete"
  on public.body_measurements for delete using (auth.uid() = user_id);

create policy "Calorie profile is owner-only select"
  on public.calorie_profiles for select using (auth.uid() = user_id);
create policy "Calorie profile is owner-only insert"
  on public.calorie_profiles for insert with check (auth.uid() = user_id);
create policy "Calorie profile is owner-only update"
  on public.calorie_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Calorie profile is owner-only delete"
  on public.calorie_profiles for delete using (auth.uid() = user_id);

create policy "Calorie entries are owner-only select"
  on public.calorie_entries for select using (auth.uid() = user_id);
create policy "Calorie entries are owner-only insert"
  on public.calorie_entries for insert with check (auth.uid() = user_id);
create policy "Calorie entries are owner-only update"
  on public.calorie_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Calorie entries are owner-only delete"
  on public.calorie_entries for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- REALTIME: expose tables to Supabase Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.workout_plans;
alter publication supabase_realtime add table public.exercises;
alter publication supabase_realtime add table public.workout_logs;
alter publication supabase_realtime add table public.body_weight_logs;
alter publication supabase_realtime add table public.body_measurements;
alter publication supabase_realtime add table public.calorie_entries;
