import fs from 'fs/promises';
const DB = new URL('../data/leads.json', import.meta.url);

async function readDb() {
  try { return JSON.parse(await fs.readFile(DB, 'utf8')); }
  catch { return []; }
}
export async function listLeads() { return readDb(); }
export async function saveLead(item) {
  const db = await readDb();
  db.unshift(item);
  await fs.writeFile(DB, JSON.stringify(db.slice(0, 500), null, 2));
}
