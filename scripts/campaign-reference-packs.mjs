import { CAMPAIGN_SHIPS, CAMPAIGN_FLEETS } from "./campaign-reference-data.mjs";

const PACKS = Object.freeze([
  { name: "ss-navires-campagne", label: "S&S — Navires de campagne", type: "JournalEntry" },
  { name: "ss-flottes-campagne", label: "S&S — Flottes de campagne", type: "JournalEntry" }
]);

function esc(v) {
  const div = document.createElement("div");
  div.textContent = String(v ?? "");
  return div.innerHTML;
}
function journalData(name, html) {
  return { name, pages: [{ name: "Référence", type: "text", text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1 } }] };
}
async function ensurePack(meta) {
  const collection = `world.${meta.name}`;
  let pack = game.packs.get(collection);
  if (pack) return pack;
  if (!game.user?.isGM) throw new Error("Seul un MJ peut créer les compendiums de campagne.");
  const C = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  await C.createCompendium({ name: meta.name, label: meta.label, type: meta.type, package: "world" });
  return game.packs.get(collection);
}
async function createMissing(pack, docs) {
  if (pack.locked) await pack.configure({ locked: false });
  const idx = await pack.getIndex({ fields: ["name"] });
  const names = new Set(idx.map((e) => e.name));
  const missing = docs.filter((d) => !names.has(d.name));
  if (missing.length) await pack.documentClass.createDocuments(missing, { pack: pack.collection });
  return missing.length;
}
function shipHtml(s) {
  const rows = [];
  if (s.fp != null) rows.push(`<li><strong>FP :</strong> ${s.fp}</li>`);
  if (s.crew != null) rows.push(`<li><strong>Équipage :</strong> ${s.crew}${s.minimumCrew != null ? ` (minimum ${s.minimumCrew})` : ""}</li>`);
  if (s.hp != null) rows.push(`<li><strong>Structure :</strong> ${s.hp} PV ; solidité ${s.hardness ?? "—"}</li>`);
  if (s.publishedAc != null) rows.push(`<li><strong>CA / Sauvegarde / BMO / DMD :</strong> ${s.publishedAc} / +${s.publishedSave} / +${s.publishedCmb} / ${s.publishedCmd}</li>`);
  if (s.publishedRam) rows.push(`<li><strong>Éperonnage :</strong> ${esc(s.publishedRam)}</li>`);
  if (s.weapons) rows.push(`<li><strong>Armement :</strong> ${esc(s.weapons)}</li>`);
  if (s.cargoLabel) rows.push(`<li><strong>Cargaison :</strong> ${esc(s.cargoLabel)}</li>`);
  return `<h2>${esc(s.name)}</h2><p><strong>Aventure :</strong> ${esc(s.adventure)}<br><strong>Type :</strong> ${esc(s.kind)}<br><strong>Capitaine :</strong> ${esc(s.captain)}<br><strong>Profil de base :</strong> ${esc(s.profileId ?? "—")}<br><strong>Source :</strong> ${esc(s.source)}</p>${rows.length ? `<ul>${rows.join("")}</ul>` : ""}<p>${esc(s.summary)}</p>${s.notes ? `<p><em>${esc(s.notes)}</em></p>` : ""}`;
}
function squadronHtml(q) {
  return `<li><strong>${esc(q.name)}</strong> — ${q.shipCount} × ${esc(q.shipType)} ; contre-amiral ${esc(q.viceAdmiralName)} (Profession (marin) +${q.profession}, Cha ${q.cha >= 0 ? "+" : ""}${q.cha}) ; moral ${q.morale} ; VD ${q.defense} ; VA +${q.attack} ; dégâts ${esc(q.damage)} ; moral ${q.moraleTest >= 0 ? "+" : ""}${q.moraleTest}</li>`;
}
function fleetHtml(f) {
  const important = (f.importantCharacters ?? []).map(([name, place, advantage]) => `<li>${esc(name)} — ${esc(place)} : ${esc(advantage)}</li>`).join("");
  const squadrons = (f.squadrons ?? []).map(squadronHtml).join("");
  return `<h2>${esc(f.name)}</h2><p><strong>Aventure :</strong> ${esc(f.adventure)}<br><strong>Source :</strong> ${esc(f.source)}${f.xp ? `<br><strong>PX :</strong> ${f.xp}` : ""}<br><strong>Commandement :</strong> ${esc(f.admiral)}${f.admiralProfession != null ? ` — Profession (marin) +${f.admiralProfession}, Cha +${f.admiralCha}, initiative +${f.initiative}` : ""}<br><strong>Vaisseau amiral :</strong> ${esc(f.flagship)}<br><strong>Nombre de bâtiments :</strong> ${f.totalShips ?? "—"}</p><p>${esc(f.summary)}</p>${important ? `<h3>Personnages importants</h3><ul>${important}</ul>` : ""}<h3>Escadrons</h3><ul>${squadrons}</ul>`;
}

export async function installCampaignReferencePacks() {
  if (!game.user?.isGM) { ui.notifications.warn("Seul un MJ peut installer les compendiums de campagne."); return null; }
  const ships = await ensurePack(PACKS[0]);
  const fleets = await ensurePack(PACKS[1]);
  const created = {
    ships: await createMissing(ships, CAMPAIGN_SHIPS.map((s) => journalData(s.name, shipHtml(s)))),
    fleets: await createMissing(fleets, CAMPAIGN_FLEETS.map((f) => journalData(f.name, fleetHtml(f))))
  };
  return { ships, fleets, created };
}
