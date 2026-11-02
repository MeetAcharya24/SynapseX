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
