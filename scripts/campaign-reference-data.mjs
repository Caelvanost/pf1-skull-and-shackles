import { PIRACY_PREY } from "./piracy-data.mjs";
import { ALLIED_SQUADRONS } from "./fleet-recruitment-data.mjs";

/**
 * Références de campagne. Les profils ne contiennent que les valeurs explicitement
 * utilisées dans la campagne ou déjà présentes dans les sous-systèmes du module.
 * Aucun chiffre manquant n'est inventé.
 */
export const CAMPAIGN_SHIPS = Object.freeze([
  {
    id: "wormwood", name: "L’Absinthe", adventure: "La Mutinerie de l’Absinthe",
    kind: "Grand trois-mâts pirate", profileId: "sailingShip",
    captain: "Barnabas Harrigan", source: "Campagne Skull & Shackles, p. 15-17",
    summary: "Navire de départ de la campagne. Trois-mâts d’environ 30 m de long et 9 m de large ; nécessite au moins 20 membres d’équipage. Pour les caractéristiques navales génériques, utiliser le profil Bateau à voiles sauf lorsqu’un passage de l’aventure donne une valeur spécifique."
  },
  {
    id: "mansPromise", name: "Le Promesse de l’Homme", adventure: "La Mutinerie de l’Absinthe",
    kind: "Navire marchand rahadoumi", profileId: "sailingShip",
    captain: "Capture par l’Absinthe", source: "Campagne Skull & Shackles, p. 35 et suivantes",
    summary: "Navire marchand capturé lors de la première aventure puis confié à M. Plugg et aux PJ. La campagne prévoit sa capture ; utiliser le profil de Bateau à voiles et appliquer les avaries/états décrits par l’aventure."
  },
  ...PIRACY_PREY.map((p) => ({
    id: p.id, name: p.name, adventure: "Les Pillards de la mer de Fièvre",
    kind: p.subtitle, profileId: p.profileId, captain: p.captain,
    source: "Campagne Skull & Shackles — événement répétable « Les loups de mer »",
    fp: p.fp, crew: p.crew, minimumCrew: p.minimumCrew, hp: p.hp, hardness: p.hardness,
    sailsHp: p.sailsHp, publishedAc: p.publishedAc, publishedSave: p.publishedSave,
    publishedCmb: p.publishedCmb, publishedCmd: p.publishedCmd, publishedRam: p.publishedRam,
    weapons: p.weapons, cargoLabel: p.cargoLabel, notes: p.notes,
    summary: `${p.subtitle}. Capitaine : ${p.captain}. Équipage ${p.crew} (minimum ${p.minimumCrew}). ${p.cargoLabel}.`
  })),
  {
    id: "abrogailsFury", name: "Le Fureur d’Abrogail", adventure: "Du Fin Fond des Enfers",
    kind: "Vaisseau amiral chélaxien", profileId: "sailingShip",
    captain: "Amirale Druvalie Thrune", source: "Campagne Skull & Shackles, bataille d’Abendégo / Le Fureur d’Abrogail",
    summary: "Vaisseau de haut bord à coque noire, voiles noires et rouges, vaisseau amiral de l’Armada chélaxienne. Le profil de flotte publié le traite comme vaisseau amiral et non comme un escadron ; les détails tactiques de l’abordage restent ceux de la rencontre correspondante."
  },
  {
    id: "filthyLucre", name: "L’Argent sale", adventure: "Du Fin Fond des Enfers",
    kind: "Vaisseau amiral du Roi de l’ouragan", profileId: "sailingShip",
    captain: "Kerdak Poingd’os", source: "Campagne Skull & Shackles — final de Du Fin Fond des Enfers",
    summary: "Vaisseau personnel du Roi de l’ouragan, notable car équipé de canons. Les caractéristiques exactes de la rencontre doivent être prises dans le profil du scénario ; ce compendium n’invente pas de valeurs absentes des données extraites."
  }
]);

const armadaSquadrons = [
  ["Escadron de Belzébuth", "warship", 4, "Arandor Tauranos", 14, 1, 3, 24, 15, "1d6+4", 2],
  ["Escadron de Barbatos", "galley", 5, "Narovie Wintour", 14, 2, 3, 24, 15, "1d6+5", 3],
  ["Escadron de Bélial", "galley", 6, "Davo Eximandre", 16, 3, 3, 26, 19, "1d6+8", 6],
  ["Escadron de Dispater", "sailingShip", 7, "« Acier » Lurco Solamar", 15, 4, 3, 25, 16, "1d6+7", 5],
  ["Escadron de Géryon", "sailingShip", 7, "Raule Gallonique", 20, 4, 3, 30, 21, "1d6+7", 5],
  ["Escadron de Mammon", "sailingShip", 8, "Lavénie Jeggare", 15, 5, 3, 25, 18, "1d6+10", 8],
  ["Escadron de Méphistophélès", "sailingShip", 6, "Korva Leroung", 13, 3, 3, 23, 16, "1d6+8", 6],
  ["Escadron de Moloch", "warship", 5, "Ursion Quintillus", 18, 2, 3, 28, 21, "1d6+7", 5]
].map(([name, shipType, shipCount, viceAdmiralName, profession, cha, morale, defense, attack, damage, moraleTest]) => ({
  name, shipType, shipCount, viceAdmiralName, profession, cha, morale, defense, attack, damage, moraleTest
}));

export const CAMPAIGN_FLEETS = Object.freeze([
  {
    id: "chelaxianArmada", name: "L’Armada chélaxienne", adventure: "Du Fin Fond des Enfers",
    source: "Campagne Skull & Shackles, bataille d’Abendégo",
    xp: 25600, admiral: "Druvalie Thrune", admiralProfession: 26, admiralCha: 1, initiative: 26,
    flagship: "Fureur d’Abrogail", totalShips: 47,
    importantCharacters: [
      ["Alsus Agrimant", "Fureur d’Abrogail", "Artillerie magique"],
      ["Davo Eximandre", "Escadron de Bélial", "Grand nombre"],
      ["Druvalie Thrune", "Fureur d’Abrogail", "Tactique évoluée"],
      ["Jarian Randeloric", "Fureur d’Abrogail", "Réparations rapides"],
      ["Korva Leroung", "Escadron de Méphistophélès", "Grand nombre"],
      ["Lavénie Jeggare", "Escadron de Mammon", "Grand nombre"],
      ["Ursion Quintillus", "Escadron de Moloch", "Grand nombre"],
      ["Valéria Asperixus", "Fureur d’Abrogail", "Avance impitoyable"]
    ],
    squadrons: armadaSquadrons,
    summary: "Armada de 47 bâtiments répartis en huit escadrons nommés d’après des archidiables. Quatre avantages Grand nombre permettent à Druvalie Thrune de dépasser la limite normale d’escadrons."
  },
  {
    id: "fairWindChance", name: "Chance de Bonvent", adventure: "Du Fin Fond des Enfers",
    source: "Campagne Skull & Shackles — alliés contre l’Armada chélaxienne",
    admiral: "Tessa Bonvent", flagship: "—", totalShips: 7,
    squadrons: [{ name: "Chance de Bonvent", shipType: "sailingShip", shipCount: 7, viceAdmiralName: "Tessa Bonvent", profession: 15, cha: 4, morale: 5, defense: 25, attack: 17, damage: "1d6+9", moraleTest: 6 }],
    summary: "Escadron personnel de Tessa Bonvent. Sa présence comme contre-amiral porte son moral de départ à 5 et compte comme personnage important donnant Manœuvre téméraire."
  },
  ...Object.values(ALLIED_SQUADRONS).map((a, index) => ({
    id: `recruitmentAlly${index + 1}`, name: a.name, adventure: "Le Prix de l’Infamie / Du Fin Fond des Enfers",
    source: "Campagne Skull & Shackles — alliés recrutables",
    admiral: a.viceAdmiralName, flagship: "—", totalShips: a.shipCount,
    squadrons: [{
      name: a.name, shipType: a.shipType, shipCount: a.shipCount, viceAdmiralName: a.viceAdmiralName,
      profession: a.viceAdmiralProfession, cha: a.viceAdmiralCha, morale: a.morale,
      defense: 10 + a.viceAdmiralProfession, attack: a.viceAdmiralProfession + (a.counterAdmiralImportant ? 2 : 0),
      damage: `1d6+${a.shipCount + (a.counterAdmiralImportant ? 2 : 0)}`,
      moraleTest: a.viceAdmiralCha + Number(a.manualMorale ?? 0) + (a.counterAdmiralImportant ? 2 : 0)
    }],
    summary: `${a.location}. ${a.note}`
  }))
]);
