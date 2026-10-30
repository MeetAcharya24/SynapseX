alter table projects
  add column user_id text not null references "user" (id) on delete cascade;

create index projects_user_id_idx on projects (user_id);
