create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user" (id) on delete cascade,
  name text not null,
  graph jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects (user_id);
