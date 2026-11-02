import { sql } from "@/lib/db";

/** How many recent exchanges a memory-enabled node keeps as context. */
export const MEMORY_EXCHANGE_LIMIT = 10;

export type MemoryExchange = { task: string; response: string };

/** Oldest-first, so it can be fed straight in as prior conversation turns. */
export async function loadNodeMemory(
  projectId: string,
  nodeId: string
): Promise<MemoryExchange[]> {
  const rows = await sql`
    select task, response from node_memory
    where project_id = ${projectId} and node_id = ${nodeId}
    order by created_at desc
    limit ${MEMORY_EXCHANGE_LIMIT}
  `;
  return (rows as { task: string; response: string }[]).reverse();
}

export async function appendNodeMemory(
  projectId: string,
  nodeId: string,
  task: string,
  response: string
): Promise<void> {
  await sql`
    insert into node_memory (project_id, node_id, task, response)
    values (${projectId}, ${nodeId}, ${task}, ${response})
  `;
  await sql`
    delete from node_memory
    where project_id = ${projectId} and node_id = ${nodeId}
      and id not in (
        select id from node_memory
        where project_id = ${projectId} and node_id = ${nodeId}
        order by created_at desc
        limit ${MEMORY_EXCHANGE_LIMIT}
      )
  `;
}
