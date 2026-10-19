-- Lectern — initial schema (Phase 1)
--
-- Implements the sketch data model from ROADMAP.md §2, plus one addition:
-- class_enrollments (a student <-> class roster), which the sketch omitted
-- but which is load-bearing — without it, a teacher's class has no way to
-- know which students belong to it.
--
-- NOT YET APPLIED OR TESTED against a real Postgres instance — there is no
-- live Supabase project yet (see ROADMAP.md §7). Review before running.
-- Apply via the Supabase SQL editor, or `supabase db push` once the project
-- is linked with the Supabase CLI.
--
-- RLS policies here are a reasonable first draft, not a security audit —
-- test against real auth flows before trusting them with real student data.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tenant_key text not null unique,
  region text,
  plan_tier text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  school_id uuid not null references public.schools (id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'hod', 'principal')),
  sso_subject text,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  subject text not null,
  grade text not null,
  teacher_id uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_enrollments (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists public.corpus_documents (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  uploaded_by uuid references public.users (id) on delete set null,
  source_file text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.corpus_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.corpus_documents (id) on delete cascade,
  heading text,
  text text not null,
  citation text not null,
  -- Populated only once whole-school hybrid retrieval is needed — per-class
  -- corpora stay full-context/vectorless (see ROADMAP.md §2). Dimension
  -- matches OpenAI/Voyage-class embedding models; adjust if a different
  -- embedding model is chosen later.
  embedding vector (1536),
  approved_by uuid references public.users (id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  topic_id text not null,
  started_at timestamptz not null default now()
);

create table if not exists public.conversation_turns (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  intent text,
  text text not null,
  cited_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users (id) on delete cascade,
  question_id text not null,
  answer text not null,
  graded_result jsonb not null,
  graded_by text not null check (graded_by in ('rule', 'llm')),
  created_at timestamptz not null default now()
);

-- Single append-only stream powering every dashboard (Teacher AI-transparency,
-- HOD/Principal analytics, and the eval/observability tooling) — one source
-- of truth for "what happened," not separate ad hoc tracking per dashboard.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- Row-Level Security -----------------------------------------------------

alter table public.schools enable row level security;
alter table public.users enable row level security;
alter table public.classes enable row level security;
alter table public.class_enrollments enable row level security;
alter table public.corpus_documents enable row level security;
alter table public.corpus_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_turns enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.events enable row level security;

-- The caller's own row (school_id + role) — read once per statement via a
-- stable function so policies below stay simple and don't repeat the join.
create or replace function public.current_app_user()
returns public.users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.users where id = auth.uid();
$$;

create policy schools_select on public.schools
  for select using (id = (select school_id from public.current_app_user()));

-- Provisioning (inserting a user row) happens server-side with the service
-- role key, which bypasses RLS — no insert policy needed here.
create policy users_select on public.users
  for select using (school_id = (select school_id from public.current_app_user()));

create policy classes_select on public.classes
  for select using (school_id = (select school_id from public.current_app_user()));

create policy class_enrollments_select on public.class_enrollments
  for select using (
    student_id = auth.uid()
    or class_id in (select id from public.classes where teacher_id = auth.uid())
    or (select role from public.current_app_user()) in ('hod', 'principal')
  );

create policy corpus_documents_select on public.corpus_documents
  for select using (
    class_id in (
      select id from public.classes
      where school_id = (select school_id from public.current_app_user())
    )
  );
create policy corpus_documents_insert on public.corpus_documents
  for insert with check (uploaded_by = auth.uid());
create policy corpus_documents_update on public.corpus_documents
  for update using (
    uploaded_by = auth.uid()
    or (select role from public.current_app_user()) in ('hod', 'principal')
  );

create policy corpus_chunks_select on public.corpus_chunks
  for select using (
    document_id in (
      select cd.id from public.corpus_documents cd
      join public.classes c on c.id = cd.class_id
      where c.school_id = (select school_id from public.current_app_user())
    )
  );

-- A student sees only their own conversations; a teacher sees conversations
-- for classes they teach (this is the AI-transparency non-negotiable from
-- ROADMAP.md §4 — every AI chat must be visible to teachers).
create policy conversations_select on public.conversations
  for select using (
    student_id = auth.uid()
    or class_id in (select id from public.classes where teacher_id = auth.uid())
    or (select role from public.current_app_user()) in ('hod', 'principal')
  );
create policy conversations_insert on public.conversations
  for insert with check (student_id = auth.uid());

create policy conversation_turns_select on public.conversation_turns
  for select using (
    conversation_id in (
      select id from public.conversations
      where student_id = auth.uid()
         or class_id in (select id from public.classes where teacher_id = auth.uid())
    )
    or (select role from public.current_app_user()) in ('hod', 'principal')
  );
create policy conversation_turns_insert on public.conversation_turns
  for insert with check (
    conversation_id in (select id from public.conversations where student_id = auth.uid())
  );

create policy practice_attempts_select on public.practice_attempts
  for select using (
    student_id = auth.uid()
    or (select role from public.current_app_user()) in ('teacher', 'hod', 'principal')
  );
create policy practice_attempts_insert on public.practice_attempts
  for insert with check (student_id = auth.uid());

create policy events_select on public.events
  for select using (
    user_id = auth.uid()
    or (select role from public.current_app_user()) in ('teacher', 'hod', 'principal')
  );
create policy events_insert on public.events
  for insert with check (user_id = auth.uid());
