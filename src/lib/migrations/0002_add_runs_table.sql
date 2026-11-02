create table if not exists runs (
  id uuid primary key,
  project_id uuid not null references projects (id) on delete cascade,
  user_id text not null references "user" (id) on delete cascade,
  task text not null,
  status text not null,
  trace jsonb not null,
  final_output text,
  error text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists runs_project_id_idx on runs (project_id);
create index if not exists runs_user_id_idx on runs (user_id);
