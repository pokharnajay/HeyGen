// lib/heygen-kb.ts
let kbCache: Record<string, string> = {};       // in-memory for dev; switch to Redis in prod

export async function getKnowledgeText(id: string): Promise<string> {
  if (kbCache[id]) return kbCache[id];          // hit

  const res = await fetch(
    `https://api.heygen.com/v1/knowledge-bases/${id}`
  );

  if (!res.ok) throw new Error(`KB ${id} fetch failed`);

  const { data } = await res.json();            // API returns { data: { content: "…" } }
  kbCache[id] = data.content;                   // store text
  return data.content;
}
