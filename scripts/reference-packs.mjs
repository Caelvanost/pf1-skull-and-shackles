import { MODULE_ID } from "./ship-data.mjs";
import { SHIP_PROFILES, PIRATE_WEAPONS, CAMPAIGN_TRAITS, CRITICAL_WOUNDS, formatGp } from "./library-data.mjs";
import { installCampaignReferencePacks } from "./campaign-reference-packs.mjs";

const PACKS = Object.freeze([
  { name: "ss-navires", label: "S&S — Navires", type: "JournalEntry" },
  { name: "ss-armes-pirates", label: "S&S — Armes pirates", type: "JournalEntry" },
  { name: "ss-traits-campagne", label: "S&S — Traits de campagne", type: "JournalEntry" },
  { name: "ss-tables", label: "S&S — Tables", type: "RollTable" }
]);

function htmlEscape(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function journalData(name, html) {
  return {
    name,
    pages: [{
      name: "Règles",
      type: "text",
      text: { content: html, format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1 }
    }]
  };
}

function shipHtml(p) {
  return `<h2>${htmlEscape(p.name)}</h2>
  <p><strong>Source :</strong> Guide du Joueur Skull & Shackles, p. ${p.sourcePage}.</p>
  <p><strong>Taille :</strong> ${htmlEscape(p.size)} · <strong>Cases navales :</strong> ${p.navalSquares} · <strong>Dimensions :</strong> ${htmlEscape(p.dimensions)} · <strong>Coût :</strong> ${htmlEscape(formatGp(p.cost))}</p>
  <p><strong>Défense :</strong> ${p.hp} PV, solidité ${p.hardness}, sauvegarde de base +${p.save}.</p>
  <p><strong>Attaque :</strong> éperonnage ${htmlEscape(p.ram)} · accélération ${Math.round(p.acceleration * 0.3048)} m.</p>
  <p><strong>Propulsion :</strong> ${htmlEscape(p.propulsionLabel)} · <strong>Navigation :</strong> ${htmlEscape(p.navigation)} · <strong>Dispositif :</strong> ${htmlEscape(p.steering)}.</p>
  <p><strong>Équipage :</strong> ${p.crew} · <strong>Passagers :</strong> ${p.passengers} · <strong>Cargaison :</strong> ${htmlEscape(p.cargo)}.</p>
  <p>${htmlEscape(p.notes)}</p>`;
}

function weaponHtml(w) {
  return `<h2>${htmlEscape(w.name)}</h2><p><strong>Source :</strong> Guide du Joueur Skull & Shackles, p. ${w.sourcePage}.</p>
  <p>${htmlEscape(w.category)} · ${htmlEscape(w.price)} · dégâts P ${htmlEscape(w.small)} / M ${htmlEscape(w.medium)} · critique ${htmlEscape(w.crit)} · portée ${htmlEscape(w.range)} · poids ${htmlEscape(w.weight)} · type ${htmlEscape(w.damageType)} · spécial ${htmlEscape(w.special)}.</p>`;
}

function traitHtml(t) {
  return `<h2>${htmlEscape(t.name)}</h2><p><strong>Source :</strong> Guide du Joueur Skull & Shackles, p. ${t.sourcePage}.</p><p>${htmlEscape(t.mechanics)}</p>`;
}

async function ensurePack(meta) {
  const collection = `world.${meta.name}`;
  let pack = game.packs.get(collection);
  if (pack) return pack;
  if (!game.user?.isGM) throw new Error("Seul un MJ peut créer des compendiums de monde.");
  const CompendiumClass = foundry.documents?.collections?.CompendiumCollection ?? globalThis.CompendiumCollection;
  if (!CompendiumClass?.createCompendium) throw new Error("API de compendium Foundry indisponible.");
  await CompendiumClass.createCompendium({
    name: meta.name,
    label: meta.label,
    type: meta.type,
    package: "world"
  });
  pack = game.packs.get(collection);
  if (!pack) throw new Error(`Impossible de créer le compendium ${meta.label}.`);
  return pack;
}

async function createMissing(pack, docs) {
  if (pack.locked) await pack.configure({ locked: false });
  const index = await pack.getIndex({ fields: ["name"] });
  const names = new Set(index.map((e) => e.name));
  const missing = docs.filter((d) => !names.has(d.name));
  if (!missing.length) return 0;
  await pack.documentClass.createDocuments(missing, { pack: pack.collection });
  return missing.length;
}

export async function installReferencePacks() {
  if (!game.user?.isGM) {
    ui.notifications.warn("Seul un MJ peut installer les compendiums de référence Skull & Shackles.");
    return null;
  }

  const navires = await ensurePack(PACKS[0]);
  const armes = await ensurePack(PACKS[1]);
  const traits = await ensurePack(PACKS[2]);
  const tables = await ensurePack(PACKS[3]);

  const created = { navires: 0, armes: 0, traits: 0, tables: 0 };
  created.navires = await createMissing(navires, SHIP_PROFILES.map((p) => journalData(p.name, shipHtml(p))));
  created.armes = await createMissing(armes, PIRATE_WEAPONS.map((w) => journalData(w.name, weaponHtml(w))));
  created.traits = await createMissing(traits, CAMPAIGN_TRAITS.map((t) => journalData(t.name, traitHtml(t))));

  const woundResults = CRITICAL_WOUNDS.map((w) => ({
    type: CONST.TABLE_RESULT_TYPES?.TEXT ?? "text",
    range: [w.min, w.max],
    text: `${w.label} — ${w.effect}`,
    weight: w.max - w.min + 1,
    drawn: false
  }));
  created.tables = await createMissing(tables, [{
    name: "Jambe de bois et cache-œil",
    formula: "1d20",
    replacement: true,
    displayRoll: true,
    results: woundResults
  }]);

  const campaign = await installCampaignReferencePacks();
  const campaignCreated = Number(campaign?.created?.ships ?? 0) + Number(campaign?.created?.fleets ?? 0);
  ui.notifications.info(`Compendiums S&S prêts. Nouveaux documents : ${created.navires + created.armes + created.traits + created.tables + campaignCreated}.`);
  return { navires, armes, traits, tables, campaign, created };
}
