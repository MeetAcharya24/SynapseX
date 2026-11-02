create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  name text not null,
  graph jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects (user_id);

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

create table if not exists node_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  node_id text not null,
  task text not null,
  response text not null,
  created_at timestamptz not null default now()
);

create index if not exists node_memory_project_node_idx
  on node_memory (project_id, node_id, created_at);
