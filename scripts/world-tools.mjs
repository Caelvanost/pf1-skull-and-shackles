import { MODULE_ID } from "./ship-data.mjs";
import { installReferencePacks } from "./reference-packs.mjs";

const JOURNAL_KEY = "quick-reference";

const WORLD_MACROS = Object.freeze([
  {
    key: "dashboard",
    name: "S&S — Passerelle",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedDashboard();'
  },
  {
    key: "controller",
    name: "S&S — Contrôleur du navire",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedShip();'
  },
  {
    key: "naval-map",
    name: "S&S — Carte navale",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedNavalMap();'
  },
  {
    key: "hazards",
    name: "S&S — Dangers & Régate",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedHazards();'
  },
  {
    key: "improvements",
    name: "S&S — Améliorations du navire",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedImprovements();'
  },
  {
    key: "voyage",
    name: "S&S — Voyages & Poursuites",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedVoyage();'
  },
  {
    key: "piracy",
    name: "S&S — Piraterie & Prises",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedPiracy();'
  },
  {
    key: "siege",
    name: "S&S — Artillerie",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedSiege();'
  },
  {
    key: "reputation",
    name: "S&S — Réputation pirate",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedReputation();'
  },
  {
    key: "fleet",
    name: "S&S — Flotte",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedFleet();'
  },
  {
    key: "fleet-recruitment",
    name: "S&S — Recrutement de flotte",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedFleetRecruitment();'
  },
  {
    key: "life",
    name: "S&S — Vie à bord",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedLife();'
  },
  {
    key: "entertainment",
    name: "S&S — Divertissements",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedEntertainment();'
  },
  {
    key: "disguise",
    name: "S&S — Pétardage & identité",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedDisguise();'
  },
  {
    key: "crew-development",
    name: "S&S — Équipage & cohésion",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewDevelopment();'
  },
  {
    key: "crew-relations",
    name: "S&S — Relations d’équipage",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewRelations();'
  },
  {
    key: "crew-roster",
    name: "S&S — Registre d’équipage",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewRoster();'
  },
  {
    key: "crew-watch",
    name: "S&S — Quarts & fatigue",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewWatch();'
  },
  {
    key: "boarding",
    name: "S&S — Abordage",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedBoarding();'
  },
  {
    key: "library",
    name: "S&S — Bibliothèque",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedLibrary();'
  },
  {
    key: "wizard",
    name: "S&S — Assistant de navire",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedShipWizard();'
  },
  {
    key: "quick-reference",
    name: "S&S — Aide rapide",
    icon: "icons/svg/d20-black.svg",
    command: 'game.modules.get("pf1-skull-and-shackles")?.api?.openQuickReference();'
  }
]);

function page(name, html) {
  return {
    name,
    type: "text",
    text: {
      content: html,
      format: CONST.JOURNAL_ENTRY_PAGE_FORMATS?.HTML ?? 1
    }
  };
}

function quickReferencePages() {
  return [
    page("Commencer", `
      <h1>Skull &amp; Shackles — Aide rapide</h1>
      <p>Cette aide résume les automatismes du module. Pour les détails complets, utilise la <strong>Bibliothèque S&amp;S</strong> et les ouvrages de campagne.</p>
      <h2>Routine conseillée</h2>
      <ol>
        <li>Sélectionner le token <strong>Vehicle PF1</strong> du navire.</li>
        <li>Ouvrir <strong>S&amp;S — Passerelle</strong>.</li>
        <li>Définir le pilote, la propulsion, le cap et le vent.</li>
        <li>Utiliser le contrôleur spécialisé adapté : navigation, artillerie, réputation, flotte ou vie à bord.</li>
      </ol>
      <p><strong>Échelle navale :</strong> 1 case = 9 m (30 ft).</p>
    `),
    page("Navigation", `
      <h1>Navigation</h1>
      <ul>
        <li>DD normal hors combat : <strong>5</strong>.</li>
        <li>DD normal en combat : <strong>20</strong>.</li>
        <li>Équipage incomplet mais au moins égal à la moitié : <strong>−10</strong>.</li>
        <li>Deux formes de propulsion utilisées ensemble : <strong>−5</strong>.</li>
        <li>Aider le pilote : test de navigation DD 10, puis <strong>+2</strong> au pilote en cas de réussite.</li>
        <li>Dispositif de pilotage brisé : <strong>−10</strong>. Détruit : pilotage impossible.</li>
      </ul>
      <h2>Ascendant</h2>
      <p>Tests de navigation opposés au début du round. Le vainqueur reçoit 1 case de déplacement libre et 90° de rotation, puis 1 case et 90° supplémentaires par tranche complète de 5 points d’écart. Être au vent donne +2.</p>
    `),
    page("Carte navale", `
      <h1>Carte navale</h1>
      <ul>
        <li>Une case navale vaut toujours <strong>9 m / 30 ft</strong>, quelle que soit l'échelle normale de la scène.</li>
        <li>Le déplacement normal avance d'une case vers l'avant, l'avant-bâbord ou l'avant-tribord.</li>
        <li>Le budget de mouvement normal correspond à la <strong>vitesse actuelle</strong> du navire.</li>
        <li>Le déplacement gratuit d'<strong>ascendant</strong> est suivi séparément et chaque case peut être déplacée dans la direction de son choix.</li>
        <li>Les rotations gratuites de l'ascendant sont consommées par tranches de <strong>90°</strong>.</li>
        <li>Les aides visuelles peuvent montrer les secteurs proue/poupe/bâbord/tribord et les cases atteignables directement sur le Canvas.</li>
        <li>Le planificateur de <strong>cisaillement</strong> vérifie le départ à la proue/poupe puis compte les nouveaux segments adjacents longés jusqu'à la longueur de la cible.</li>
        <li>Le bouton de configuration de scène peut faire représenter directement <strong>1 case navale par case Foundry</strong>, mais cette conversion reste optionnelle.</li>
      </ul>
      <p>Les boutons de déplacement exécutent le mouvement obtenu après les tests de navigation ; ils ne remplacent pas les tests eux-mêmes.</p>
    `),
    page("Dangers & Régate", `
      <h1>Dangers de navigation &amp; Régate</h1>
      <h2>Météo des Chaînes</h2>
      <p>Le contrôleur lance le d100 de météo, applique le modificateur de proximité avec l’Œil d’Abendégo, puis soustrait un test de Profession (marin) ou de Survie. Les tempêtes utilisent ensuite leur fréquence et leur modificateur propres.</p>
      <h2>Dangers des tempêtes</h2>
      <p>Quand la météo l’exige, le module résout d100 + modificateur de tempête − test de Profession (marin)/Survie et interprète la table : pont glissant, gouvernail bloqué, vitesse réduite, voile arrachée, homme à la mer, voie d’eau, etc.</p>
      <h2>Récifs éventreurs</h2>
      <p>Le repérage utilise Perception et calcule la distance selon le DD 5 +1 par tranche de 3 m. L’évitement tient compte de la vitesse et des malus de virage. Un échec sévère peut infliger 8d8, échouer le navire et réduire le score de course.</p>
      <h2>Régate des Capitaines libres</h2>
      <p>Le score commence à 0. Pour les tests de navigation destinés au score, chaque tranche complète de 5 points au-dessus du DD ajoute +1 ; chaque tranche complète de 5 en dessous retire −1. Trois aides réussies au maximum peuvent apporter +2 chacune.</p>
      <p>Le contrôleur suit les étapes D à M et propose des raccourcis pour les récifs, la foudre dans l’ouragan, l’Atoll du pinacle et les rounds incontrôlés.</p>
    `),
    page("Améliorations du navire", `
      <h1>Améliorations du navire</h1>
      <p>Le contrôleur <strong>Améliorations</strong> suit le constructeur, le DD, le prix et les effets des modifications du Guide du Joueur.</p>
      <ul>
        <li>Un test raté dépense la moitié du prix et ce constructeur ne peut pas terminer cette modification.</li>
        <li>Si un autre constructeur a déjà modifié le navire, le nouveau test reçoit <strong>+2 au DD</strong>.</li>
        <li>Les modifications de coque recalculent PV et solidité sans effacer les dégâts déjà subis.</li>
        <li>Le blindage, la coque effilée, la quille rallongée, le safran élargi et les voiles à déploiement rapide modifient automatiquement les tests de navigation.</li>
        <li>Les voiles de soie donnent <strong>+1</strong> uniquement aux tests opposés pour prendre l’ascendant.</li>
        <li>Les traitements magiques peuvent doubler coque, voiles, rames ou dispositif de pilotage selon la modification.</li>
      </ul>
      <p>La coque effilée et la quille rallongée sont marquées comme modifications de construction initiale.</p>
    `),
    page("Voyages & poursuites", `
      <h1>Voyages, poursuites et rencontres en mer</h1>
      <h2>Déplacement sur longue distance</h2>
      <ul>
        <li>Les voyages se mesurent en kilomètres par heure ou par jour.</li>
        <li>Pour un navire propulsé par les muscles, une journée correspond à <strong>10 h de rame</strong>.</li>
        <li>Pour un navire à voiles, une journée correspond à <strong>24 h</strong>.</li>
        <li>Le contrôleur applique automatiquement les modificateurs de voyage des améliorations de navire ; les conditions particulières restent réglables par le MJ.</li>
      </ul>
      <p>Les vitesses publiées explicitement pour le <strong>Canot</strong> (3 km/h, 30 km/jour) et la <strong>Jonque</strong> (3 km/h, 72 km/jour) peuvent être appliquées d’un clic. Les autres profils restent manuels lorsqu’aucune valeur de voyage n’est donnée directement dans la source utilisée.</p>
      <h2>Fuite et poursuite</h2>
      <p>Chaque pilote effectue <strong>trois tests de navigation opposés</strong>. Le pilote qui en remporte au moins deux gagne la poursuite. Si le poursuivant gagne, le combat naval commence ; si le fuyard gagne, il s’échappe. Une poursuite longue peut durer <strong>1d4 jours</strong> à l’appréciation du MJ.</p>
      <h2>Rencontres aléatoires</h2>
      <p>Le contrôleur contient les tables de rencontres en mer de bas niveau, de niveau intermédiaire et de haut niveau de la campagne. La fréquence et la probabilité de vérification restent choisies par le MJ.</p>
    `),
    page("Piraterie & prises", `
      <h1>Piraterie, cargaisons et prises</h1>
      <p>Le contrôleur <strong>Piraterie &amp; Prises</strong> accompagne les rencontres de l'évènement répétable « Les loups de mer » des <em>Pillards de la mer de Fièvre</em>.</p>
      <ul>
        <li>Il peut tirer l'une des cinq proies publiées et créer un Vehicle PF1 correspondant pour le suivi de la rencontre.</li>
        <li>Une proie marchande cherche normalement à fuir. Après que le navire des PJ a subi au moins une attaque, le pilote peut effectuer un test de <strong>Bluff opposé à Psychologie</strong> pour tenter de la retenir.</li>
        <li><strong>1 point de Butin occupe 10 tonnes</strong> de cargaison ; le module vérifie la place libre avant de transférer la cargaison.</li>
        <li>Lorsqu'un lot de Butin est vendu, le bouton <strong>Verser la part de l'équipage</strong> retire 1 point de Butin pour représenter la part des marins.</li>
        <li>Après une prise, les survivants peuvent remplacer les pertes d'équipage. Un recrutement normal prend une journée et utilise Bluff, Diplomatie ou Intimidation <strong>DD 20</strong> ; en cas de réussite, <strong>1d4+2</strong> recrues rejoignent le bord.</li>
        <li>Pour ramener un navire capturé au port, il faut lui affecter son équipage minimum et un officier de confiance.</li>
        <li>Les drakkars et bateaux à voiles capturés dans cette séquence ont généralement une valeur de prise de <strong>5 Butin</strong>. La revente rapporte la moitié de cette valeur, ou le quart si le navire a perdu plus de la moitié de ses PV.</li>
      </ul>
      <p>Le Vehicle d'une prise vendue est seulement marqué comme vendu : il n'est jamais supprimé automatiquement.</p>
    `),
    page("Pétardage & identité", `
      <h1>Pétardage aux Pétards du Frêle</h1>
      <ul>
        <li>Le pétardage change la silhouette et le profil visuel sans modifier la taille, les caractéristiques ni la disposition du pont.</li>
        <li>Prix : <strong>20 % du prix d'achat</strong> du navire ; durée : <strong>1d4+4 jours</strong>.</li>
        <li>Frêle Colin effectue Artisanat (bateaux) <strong>DD 15</strong> avec +14.</li>
        <li>Après réussite, reconnaître le navire demande <strong>Perception DD 20</strong> après au moins 2 minutes d'observation attentive.</li>
        <li>Cachettes de 1,50 m : <strong>500 po chacune</strong>, Perception DD 20, sans rallonger le chantier.</li>
        <li>Si Frêle devient indifférent, ses prix augmentent de <strong>10 %</strong>.</li>
      </ul>
      <p>Le module ajoute aussi le suivi du nom, du pavillon, des notes de silhouette et de l'historique des identités.</p>
    `),
    page("Combat naval", `
      <h1>Combat naval</h1>
      <ul>
        <li><strong>Éperonnage :</strong> BMO contre DMD, vitesse minimale d’une case navale. Les dégâts augmentent avec la marge et peuvent immobiliser/agripper les navires.</li>
        <li><strong>Agrippement :</strong> BMO contre DMD à portée d’une case navale. Un agrippement mutuel peut être résolu automatiquement.</li>
        <li><strong>Se libérer :</strong> le module applique le malus de −4.</li>
        <li><strong>Abordage :</strong> le combat revient ensuite aux règles PF1 normales sur le pont.</li>
        <li><strong>Cisaillement :</strong> permet d’endommager directement les rames. La Carte navale peut désormais préparer et valider visuellement le trajet le long de la cible.</li>
      </ul>
    `),
    page("Dégâts, feu et naufrage", `
      <h1>Dégâts, feu et naufrage</h1>
      <ul>
        <li>Les composants suivis sont la structure, les voiles, les rames et le dispositif de pilotage.</li>
        <li>Un navire sous la moitié de ses PV de structure devient <strong>Brisé</strong> : pénalités de combat/navigation et vitesse maximale réduite.</li>
        <li>À 0 PV de structure, il entre <strong>en plein naufrage</strong> et dispose normalement de 10 rounds avant de sombrer.</li>
        <li>Un incendie inflige <strong>2d6 dégâts de feu par round</strong> à la coque sans solidité.</li>
        <li>Pour éteindre : sauvegarde appropriée contre <strong>DD 15 + rounds d’incendie</strong>.</li>
      </ul>
    `),
    page("Artillerie", `
      <h1>Artillerie</h1>
      <p>Le contrôleur Artillerie suit séparément l’équipage, la visée, le chargement, les munitions, l’état de l’engin et les tirs directs/indirects.</p>
      <ul>
        <li>Une équipe insuffisante ralentit la préparation.</li>
        <li>Un tir indirect raté peut dévier ; le module lance la direction et la distance.</li>
        <li>Les munitions spéciales disponibles incluent notamment feu grégeois, fumée, glace liquide et tir de chaîne.</li>
        <li>Une <strong>bordée</strong> regroupe les engins identiques prêts à tirer en un seul jet.</li>
      </ul>
    `),
    page("Réputation pirate", `
      <h1>Butin, Infamie et Déshonneur</h1>
      <ul>
        <li>1 point de Butin représente approximativement 1 000 po de cargaison.</li>
        <li>L’Infamie maximale est calculée à partir du niveau moyen du groupe.</li>
        <li>Les tests d’Infamie utilisent Bluff, Intimidation ou Représentation et peuvent être améliorés en dépensant du Butin.</li>
        <li>Le Déshonneur sert de ressource pour les impositions débloquées par les seuils d’Infamie.</li>
        <li>La valeur de revente du Butin dépend de la taille de la communauté et du résultat du test.</li>
      </ul>
    `),
    page("Vie à bord", `
      <h1>Vie à bord</h1>
      <p>Le contrôleur suit les tâches quotidiennes, les actions diurnes et nocturnes, l’influence, le rhum et les punitions.</p>
      <ul>
        <li>Une action de bord est normalement disponible le jour et une autre la nuit.</li>
        <li>Deux actions nocturnes supplémentaires sont possibles avec des tests de Constitution croissants.</li>
        <li>Les échecs répétés aux tâches et les refus de travailler alimentent automatiquement la file des châtiments.</li>
        <li>Les divertissements pirates disposent de leur propre contrôleur.</li>
        <li><strong>v1.9 :</strong> les joueurs propriétaires d’un personnage voient leur tâche et leurs actions dans le HUD et lancent eux-mêmes leurs dés. Le MJ suit l’avancement Tâche/Jour/Nuit/Rhum dans la fiche Vie à bord.</li>
      </ul>
    `),
    page("Relations d’équipage", `
      <h1>Relations, attitudes et mutinerie</h1>
      <p>Le contrôleur <strong>Relations d’équipage</strong> suit les PNJ nommés auxquels les PJ se lient au cours de la campagne.</p>
      <ul>
        <li>Attitudes officielles : <strong>hostile, inamical, indifférent, amical, serviable</strong>.</li>
        <li>Un PNJ <strong>amical</strong> peut fournir +2 à une tâche de jour s’il possède des rangs dans la compétence appropriée.</li>
        <li>Un PNJ <strong>serviable</strong> peut aussi aider de nuit et fournir +2 aux tests pour influencer d’autres PNJ ou dans les jeux/divertissements, ainsi que prêter argent ou équipement selon le MJ.</li>
        <li>Lors de la mutinerie de la première aventure : amicaux/serviables avec les PJ, indifférents neutres, inamicaux/hostiles dans l’opposition, sauf exception de scénario.</li>
      </ul>
      <p>Le « lien privilégié » est un repère narratif maison sans bonus automatique.</p>
    `),
    page("Registre d’équipage", `
      <h1>Registre d’équipage</h1>
      <p>Le registre rassemble dans une seule vue les personnages nommés déjà utilisés par <strong>Vie à bord</strong>, <strong>Abordage</strong>, <strong>Relations d’équipage</strong> et les postes d’officiers.</p>
      <ul>
        <li>Affiche fonction quotidienne, poste d’officier, attitude, lien avec un PJ, camp probable en mutinerie, état de santé et blessure permanente.</li>
        <li>Un personnage ajouté manuellement peut recevoir une fonction libre, un quart, une marque « Important » et des notes.</li>
        <li>Les boutons de synchronisation permettent d’ajouter rapidement un personnage au suivi des relations ou aux PNJ nommés d’Abordage sans le dupliquer.</li>
        <li>Retirer l’entrée manuelle n’efface jamais les données des autres sous-systèmes : le personnage reste visible tant qu’il est encore utilisé ailleurs.</li>
        <li>Le bouton <strong>Publier</strong> envoie au chat un résumé des personnages importants, officiers, blessés et relations suivies.</li>
      </ul>
      <p>Le registre est un outil d’organisation : il n’ajoute pas de bonus mécanique automatique.</p>
    `),
    page("Quarts & fatigue", `
      <h1>Quarts, relève et fatigue</h1>
      <p>Ce contrôleur est un <strong>sous-système maison</strong> destiné à donner un poids mécanique léger aux relèves et à la fatigue sans gérer individuellement tout l’équipage.</p>
      <ul>
        <li>Les personnages nommés peuvent être affectés à un groupe de quart depuis ce contrôleur ou depuis le Registre d’équipage.</li>
        <li>Le <strong>quart actif</strong> permet d’identifier rapidement les personnages déjà de service lorsqu’un événement survient.</li>
        <li>La fatigue générale possède quatre niveaux : Reposé (0), Fatigué (−1), Épuisé (−2), Hors service (−4).</li>
        <li>Ce modificateur s’applique automatiquement uniquement au <strong>combat d’équipage maison</strong> de l’assistant Abordage. Il ne modifie pas les jets PF1 normaux ni les tests de navigation officiels.</li>
        <li>Le <strong>branle-bas de combat</strong> augmente la fatigue générale et la fatigue abstraite des personnages nommés rappelés hors de leur quart.</li>
        <li>Un <strong>cycle de repos</strong> réduit la fatigue générale et celle des personnages hors quart.</li>
        <li>La fatigue signalée par Vie à bord peut être importée sans écraser des niveaux déjà plus élevés.</li>
      </ul>
      <p>La fatigue individuelle suivie ici influe aussi sur le jet maison de survie des PNJ nommés lors d’un abordage ; elle ne pose aucune condition PF1 automatiquement.</p>
    `),
    page("Flottes", `
      <h1>Affrontements entre flottes</h1>
      <ul>
        <li>Chaque escadron possède une VA, une VD, des dégâts, un moral et plusieurs navires suivis individuellement.</li>
        <li>Les amiraux effectuent un test opposé pour prendre l’ascendant lors de la phase.</li>
        <li>Les pertes de navires affectent les dégâts et le moral.</li>
        <li>La phase de déroute teste le moral de chaque escadron survivant.</li>
        <li>Les avantages du vaisseau amiral sont sélectionnables dans le contrôleur de bataille.</li>
      </ul>
    `),
    page("Recrutement de flotte", `
      <h1>Constituer une flotte</h1>
      <p><strong>v1.10 :</strong> le contrôleur Recrutement gère les mercenaires et les alliés de campagne.</p>
      <ul>
        <li>Mercenaires : 1d4 jours dans Portnoyé, Port-Enfer, Ollo, Port-Péril ou Quent, puis Bluff/Diplomatie/Intimidation DD 30.</li>
        <li>Coût : 40 000 po ou 40 Butin. Chaque Déshonneur dépensé économise 5 Butin, minimum 25 Butin.</li>
        <li>Après un recrutement réussi dans un port, un nouvel escadron n'y est disponible qu'après 1d4+4 semaines.</li>
        <li>Profil mercenaire : 3 voiliers ou 3 drakkars, Profession (marin) +10, moral 3, −2 aux tests de moral.</li>
        <li>Les alliés ne coûtent rien et n'exigent pas de test, mais un escadron allié détruit n'est pas remplaçable.</li>
      </ul>
    `),

    page("HUD & jeux multijoueurs", `
      <h1>HUD de campagne</h1>
      <p>Le module affiche en haut à droite le <strong>Butin</strong>, l'<strong>Infamie</strong> et le <strong>Déshonneur</strong> du navire de campagne. Le MJ peut lier le Vehicle sélectionné avec l'icône de chaîne du HUD.</p>
      <h2>Jeux multijoueurs</h2>
      <p>Dans <strong>Divertissements</strong>, le MJ ouvre les inscriptions au bras de fer, au lancer de cochon ou à Haut les cœurs. Chaque joueur choisit alors son personnage dans le HUD, décide de participer ou non et lance lui-même ses dés.</p>
      <h2>Vie quotidienne multijoueur</h2>
      <p>Lorsqu’un personnage est ajouté dans <strong>Vie à bord</strong>, son propriétaire voit sa tâche du jour dans le HUD. Il peut choisir son action diurne/nocturne, lancer sa tâche, résoudre les actions discrètes et gérer sa ration de rhum lui-même.</p>
    `),
    page("Équipage & cohésion", `
      <h1>Progression, loyauté et mutinerie</h1>
      <p>La v1.17 ajoute un <strong>sous-système maison optionnel</strong> pour faire évoluer l’équipage sans suivre individuellement tous les matelots.</p>
      <h2>Expérience et qualité</h2>
      <p>L’équipage gagne des points d’expérience à la discrétion du MJ. Les seuils maison sont : Recrues 0, Aguerris 3, Vétérans 8, Élite 15, Exceptionnels 24. Atteindre un seuil supérieur augmente automatiquement la qualité utilisée dans le combat d’équipage ; la qualité n’est jamais rétrogradée automatiquement.</p>
      <p>Une victoire significative peut être enregistrée en un clic (+1 XP, +1 loyauté). Un entraînement quotidien peut être conduit par le maître d’armes ou le bosco : DD 15, +1 XP en réussite, +2 à 25+.</p>
      <h2>Loyauté et agitation</h2>
      <p>La loyauté varie de −5 à +5 et l’agitation de 0 à 10. Le MJ dispose d’un ajustement libre pour refléter partage du butin, pénuries, punitions, victoires, pertes, décisions impopulaires ou autres événements de campagne.</p>
      <h2>Risque de mutinerie</h2>
      <p>Le test maison utilise le meilleur de Diplomatie, Intimidation ou Profession (marin) du capitaine, le moral de l’équipage et un soutien de +1 chacun si un bosco et/ou un quartier-maître sont affectés. Le DD augmente avec l’agitation et un mauvais moral.</p>
      <p>Une réussite peut calmer l’équipage ; un échec augmente les tensions. Un échec sévère place l’équipage en <strong>mutinerie ouverte</strong>. À ce stade le module ne résout pas le combat : la mutinerie devient une scène narrative ou un combat PF1 normal géré par le MJ.</p>
    `),
    page("Abordage", `
      <h1>Abordage</h1>
      <p>Un abordage exige d'abord que les navires soient agrippés. L'assistant compare l'initiative des pilotes quand elle existe dans le Combat Tracker et rappelle la règle du premier round.</p>
      <p>La règle officielle reste inchangée : le combat principal est un <strong>combat PF1 normal sur le pont</strong> entre les PJ et les personnages importants. La v1.13 ajoute en parallèle un <strong>sous-système maison optionnel</strong> pour donner des conséquences concrètes au combat des matelots.</p>
      <h2>Combat d'équipage maison</h2>
      <p>Chaque phase oppose <strong>1d20 + qualité + moral + rapport numérique + maître d'armes + commandement + circonstances + événements</strong>. La marge produit une mêlée indécise (0–4), un avantage (5–9), une domination (10–14) ou un effondrement (15+).</p>
      <p>Les pertes sont réparties entre blessés légers, blessés graves, morts et disparus/capturés. Elles réduisent automatiquement l'équipage disponible du Vehicle et peuvent donc avoir des conséquences sur la navigation.</p>
      <h2>PNJ nommés</h2>
      <p>Les PNJ marqués <strong>Exposés</strong> font après chaque phase un jet de survie : <strong>1d20 + moitié du niveau + modificateur de Constitution</strong>. Le DD dépend de la situation (10 favorable, 12 disputée, 15 lourdes pertes, 18 effondrement). Une blessure grave déclenche la table optionnelle « Jambe de bois et cache-œil ».</p>
      <h2>Officiers et moral</h2>
      <p>Le capitaine peut effectuer un test de commandement DD 15 avec le meilleur de Diplomatie, Intimidation ou Profession (marin), pour un bonus de −1 à +3. Le maître d'armes apporte +1 à +4 selon son BBA. Des événements visibles du combat (capitaine vaincu, pavillon abattu, navire en feu, renforts, etc.) modifient la mêlée et parfois le moral.</p>
      <p>Le bouton <strong>Importer Vie à bord</strong> permet de reprendre automatiquement les Actors déjà suivis dans la fiche de vie quotidienne du navire.</p>
      <h2>Après l'abordage (règle maison)</h2>
      <p>Le charpentier/chirurgien peut effectuer un <strong>triage DD 15</strong> avec Premiers secours/Heal (Sagesse en repli). Un succès stabilise des blessés graves et donne +2 à +4 aux tests de récupération de la prochaine journée.</p>
      <p>Chaque journée, les blessés légers testent DD 10 pour reprendre le service et les blessés graves DD 15 pour devenir légers. Les retours au service remontent automatiquement l'effectif du Vehicle, sans dépasser son effectif complet. Les PNJ nommés peuvent aussi améliorer leur état sans perdre une éventuelle mutilation permanente.</p>
      <p>Le bouton <strong>Reporter les pertes permanentes</strong> copie morts + disparus/capturés vers <strong>Piraterie & Prises → Pertes à remplacer</strong>.</p>
      <h2>Reddition, prisonniers et survivants</h2>
      <p>Après avoir déclaré le vainqueur principal, la section <strong>Suites immédiates</strong> permet d’enregistrer une reddition, un repli ou une fuite. En cas de reddition, les survivants ordinaires sont séparés en aptes et blessés.</p>
      <p>Les survivants aptes peuvent remplacer les pertes permanentes du vainqueur. Le reste peut être transféré directement vers <strong>Piraterie & Prises → Prisonniers & rançons</strong> ou libéré.</p>
      <p>Les PNJ nommés ne sont jamais capturés automatiquement : le MJ marque individuellement ceux qui deviennent prisonniers. Leurs niveaux de classe sont alors ajoutés au calcul de rançon des personnages importants.</p>
    `),
  ];
}

function findManagedMacro(key) {
  return game.macros?.find((macro) => macro.getFlag(MODULE_ID, "worldToolKey") === key) ?? null;
}

export function getQuickReferenceJournal() {
  return game.journal?.find((journal) => journal.getFlag(MODULE_ID, "worldToolKey") === JOURNAL_KEY) ?? null;
}

async function ensureMacro(def) {
  const existing = findManagedMacro(def.key);
  const data = {
    name: def.name,
    type: "script",
    scope: "global",
    command: def.command,
    img: def.icon,
    flags: { [MODULE_ID]: { worldToolKey: def.key, managed: true } }
  };
  if (existing) {
    const update = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "flags") continue;
      if (existing[key] !== value) update[key] = value;
    }
    if (Object.keys(update).length) await existing.update(update);
    return { doc: existing, created: false };
  }
  const doc = await Macro.create(data);
  return { doc, created: true };
}

export async function ensureQuickReferenceJournal() {
  const existing = getQuickReferenceJournal();
  const pages = quickReferencePages();
  if (existing) {
    const byName = new Map((existing.pages ?? []).map((p) => [p.name, p]));
    const missing = [];
    let updatedPages = 0;
    for (const desired of pages) {
      const current = byName.get(desired.name);
      if (!current) {
        missing.push(desired);
        continue;
      }
      const currentContent = current.text?.content ?? "";
      if (currentContent !== desired.text.content) {
        await current.update({ "text.content": desired.text.content, "text.format": desired.text.format });
        updatedPages += 1;
      }
    }
    if (missing.length) await existing.createEmbeddedDocuments("JournalEntryPage", missing);
    return { doc: existing, created: false, addedPages: missing.length, updatedPages };
  }
  if (!game.user?.isGM) throw new Error("Seul un MJ peut créer l’aide rapide de monde.");
  const doc = await JournalEntry.create({
    name: "S&S — Aide rapide",
    pages,
    flags: { [MODULE_ID]: { worldToolKey: JOURNAL_KEY, managed: true } }
  });
  return { doc, created: true, addedPages: pages.length };
}

export async function openQuickReference() {
  let journal = getQuickReferenceJournal();
  if (!journal) {
    if (!game.user?.isGM) {
      ui.notifications.warn("L’aide rapide S&S n’est pas encore installée. Demande au MJ d’installer les outils de monde.");
      return null;
    }
    journal = (await ensureQuickReferenceJournal()).doc;
  }
  journal.sheet?.render(true);
  return journal;
}

export function getWorldToolsStatus() {
  const installedMacros = WORLD_MACROS.filter((m) => Boolean(findManagedMacro(m.key))).length;
  const journal = getQuickReferenceJournal();
  return {
    macroCount: WORLD_MACROS.length,
    installedMacros,
    macrosReady: installedMacros === WORLD_MACROS.length,
    journalReady: Boolean(journal),
    journalName: journal?.name ?? "S&S — Aide rapide"
  };
}

export async function installWorldTools({ installPacks = true } = {}) {
  if (!game.user?.isGM) {
    ui.notifications.warn("Seul un MJ peut installer les outils de monde Skull & Shackles.");
    return null;
  }

  let createdMacros = 0;
  for (const def of WORLD_MACROS) {
    const result = await ensureMacro(def);
    if (result.created) createdMacros += 1;
  }

  const journal = await ensureQuickReferenceJournal();
  let packs = null;
  if (installPacks) packs = await installReferencePacks();

  ui.notifications.info(`Outils S&S prêts : ${createdMacros} nouvelle(s) macro(s), aide rapide ${journal.created ? "créée" : "à jour"}.`);
  return { createdMacros, journal, packs };
}
