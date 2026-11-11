# PF1 — Skull & Shackles

Module complémentaire pour **Foundry VTT v13** et **Pathfinder 1 (PF1) v11.11**, consacré à la campagne **Skull & Shackles**.

Le module s'appuie notamment sur les Actors `Vehicle` de PF1 et centralise la navigation, le combat naval, la réputation pirate, les prises, la vie à bord, les divertissements multijoueurs, les flottes et plusieurs outils spécifiques à la campagne.

## Version actuelle

**v1.12.0**

## Prérequis

- **Foundry Virtual Tabletop v13**
- **Pathfinder 1 (PF1) v11.11**
- Un monde utilisant le système PF1

## Installation

Dans Foundry VTT :

1. Ouvrir **Modules complémentaires**.
2. Cliquer sur **Installer un module**.
3. Coller l'URL suivante dans le champ **URL du manifeste** :

```text
https://raw.githubusercontent.com/Caelvanost/pf1-skull-and-shackles/main/module.json
```

4. Installer le module.
5. Activer **PF1 — Skull & Shackles** dans le monde PF1 concerné.

### Mise à jour

Le manifeste reste volontairement stable sur `main/module.json`.

À chaque nouvelle version du module :

- le numéro de version est incrémenté ;
- le `module.json` est mis à jour ;
- le ZIP installable est généré ;
- une release GitHub `vX.Y.Z` est créée ;
- le champ `download` du manifeste pointe vers le ZIP de cette release.

Foundry peut donc détecter les nouvelles versions sans changer l'URL du manifeste.

## Fonctionnalités principales

### HUD de campagne

HUD permanent affichant :

- **Butin**
- **Infamie**
- **Déshonneur**

Le HUD peut être **déplacé par glisser-déposer**. Sa position est enregistrée localement pour chaque utilisateur et peut être réinitialisée.

Le MJ peut lier le navire principal de la campagne directement depuis le HUD.

### Navigation et carte navale

- gestion du pilote et de l'équipage ;
- vent et ascendant ;
- manœuvres navales ;
- déplacement réel des tokens ;
- cases navales de **9 m / 30 ft** ;
- synchronisation du cap avec la rotation du token ;
- secteurs **proue / poupe / bâbord / tribord** ;
- indicateur de vent ;
- positions atteignables ;
- planificateur de cisaillement ;
- aide au placement pour l'éperonnage, l'agrippement et les bordées.

### Combat naval

- éperonnage ;
- agrippement ;
- abordage ;
- cisaillement des rames ;
- dégâts par composant ;
- incendies ;
- réparations ;
- naufrage ;
- engins de siège ;
- équipes d'artillerie ;
- chargement et visée ;
- munitions spéciales ;
- bordées.

L'assistant d'abordage conserve le principe PF1 utilisé par la campagne : lorsque les PJ passent réellement sur le pont adverse, le combat redevient un **combat tactique PF1 normal**, tandis que les équipages ordinaires peuvent être suivis séparément.

### Dangers de navigation et Régate

- météo aléatoire des Chaînes ;
- influence de l'Œil d'Abendégo ;
- dangers des tempêtes ;
- gouvernail bloqué ;
- vitesse réduite ;
- échouage ;
- voies d'eau ;
- Récifs éventreurs ;
- moteur de la **Régate des Capitaines libres** ;
- score de course ;
- tests d'étape ;
- raccourcis pour plusieurs événements de la campagne.

### Voyages et poursuites

- navigation longue distance ;
- vitesse effective ;
- distance journalière ;
- distance restante ;
- estimation de durée ;
- modificateurs liés aux améliorations du navire ;
- résolution des poursuites par tests opposés ;
- rencontres aléatoires en mer ;
- fréquence des rencontres configurable par le MJ.

### Améliorations de navire

Catalogue des principales modifications publiées pour les navires de Skull & Shackles, notamment :

- blindage ;
- cargaison supplémentaire ;
- compartiments de contrebande ;
- coque effilée ;
- coque renforcée ;
- coque magique ;
- pilotage magique ;
- éperon ;
- figure de proue ;
- fond vitré ;
- pont mobile ;
- quartiers supplémentaires ;
- quille rallongée ;
- rames magiques ;
- renforts en bois ;
- sabords dissimulés ;
- safran élargi ;
- voiles à déploiement rapide ;
- voiles de soie ;
- voiles magiques.

Le module suit également les **DD**, les coûts, le constructeur, les échecs de chantier et les effets sur les caractéristiques du navire.

### Piraterie et prises

Le contrôleur **Piraterie & Prises** permet notamment de gérer :

- les cinq proies de l'événement répétable **Les loups de mer** ;
- la création ou l'association d'un Vehicle PF1 pour une proie ;
- la cargaison ;
- le transfert en Butin ;
- la capacité des cales ;
- la part de l'équipage ;
- les survivants ;
- le recrutement ;
- les équipages de prise ;
- la conservation ou la revente d'un navire capturé ;
- les prisonniers et rançons ;
- la préparation d'un navire à maquiller.

### Pétardage et identité

Le contrôleur **Pétardage & identité** gère notamment :

- le chantier des **Pétards du Frêle** ;
- le coût et le délai ;
- le test d'Artisanat (bateaux) ;
- la difficulté de reconnaissance ;
- le nom du navire ;
- le pavillon ;
- le maquillage de la silhouette ;
- l'historique des identités.

### Vie à bord multijoueur

Chaque joueur propriétaire d'un personnage affecté à l'équipage peut gérer directement depuis son client :

- sa tâche quotidienne ;
- son action diurne ;
- son action nocturne ;
- ses propres jets ;
- sa ration de rhum ;
- certaines actions discrètes.

Le MJ dispose d'un récapitulatif de l'avancement de chaque personnage.

### Divertissements multijoueurs

Les joueurs peuvent choisir individuellement s'ils participent ou non aux jeux ouverts par le MJ.

Ils peuvent sélectionner un personnage qu'ils possèdent et lancer eux-mêmes leurs dés.

Sont notamment pris en charge :

- **Haut les cœurs !**
- **Lancer de cochon**
- **Bras de fer**

Les inscriptions et résultats sont synchronisés entre les clients.

### Réputation pirate

- Butin ;
- Infamie ;
- Déshonneur ;
- ventes ;
- impositions ;
- historique et contrôles associés.

### Flottes

- affrontements entre flottes ;
- escadrons ;
- moral ;
- recrutement de flotte ;
- mercenaires ;
- ports de recrutement ;
- délais ;
- coûts ;
- influence du Déshonneur ;
- alliés de campagne.

### Assistant de création de navire

Assistant permettant de préparer rapidement des Vehicles PF1 compatibles avec les outils S&S à partir de plusieurs profils de navires.

### Bibliothèque et compendiums

Le module peut installer ou mettre à jour des outils de référence dans le monde :

- macros S&S ;
- journal **S&S — Aide rapide** ;
- compendiums mécaniques ;
- **S&S — Navires de campagne** ;
- **S&S — Flottes de campagne**.

Les profils de campagne évitent volontairement d'inventer des valeurs lorsqu'elles ne sont pas explicitement disponibles dans les sources utilisées par le module.

## Nouveautés v1.12.0

- ajout du compendium **S&S — Navires de campagne** ;
- ajout du compendium **S&S — Flottes de campagne** ;
- références pour l'Absinthe, le Promesse de l'Homme, les cinq proies des *Pillards de la mer de Fièvre*, le Fureur d'Abrogail et l'Argent sale ;
- profil de l'Armada chélaxienne ;
- Chance de Bonvent et plusieurs escadrons alliés ;
- installation/mise à jour des nouveaux packs sans doublons.

Voir également [CHANGELOG.md](CHANGELOG.md).

## Accès rapide

Sélectionner le token `Vehicle` du navire puis utiliser la Passerelle, les boutons ajoutés par le module ou l'une des macros fournies.

Principales macros :

- `open-dashboard.js`
- `open-controller.js`
- `open-naval-map.js`
- `open-hazards.js`
- `open-improvements.js`
- `open-voyage.js`
- `open-piracy.js`
- `open-boarding.js`
- `open-siege.js`
- `open-reputation.js`
- `open-fleet.js`
- `open-fleet-recruitment.js`
- `open-life.js`
- `open-entertainment.js`
- `open-disguise.js`
- `open-library.js`
- `ship-wizard.js`
- `open-quick-reference.js`
- `install-world-tools.js`

## API

Exemples :

```js
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedDashboard();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedShip();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedNavalMap();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedHazards();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedImprovements();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedVoyage();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedPiracy();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedLibrary();
game.modules.get("pf1-skull-and-shackles")?.api?.openQuickReference();
game.modules.get("pf1-skull-and-shackles")?.api?.installWorldTools();
```

## Dépôt et releases

Dépôt :

https://github.com/Caelvanost/pf1-skull-and-shackles

Releases :

https://github.com/Caelvanost/pf1-skull-and-shackles/releases

Manifeste Foundry stable :

```text
https://raw.githubusercontent.com/Caelvanost/pf1-skull-and-shackles/main/module.json
```

## Développement

Le développement cible spécifiquement :

- **Foundry VTT v13**
- **PF1 v11.11**
- les règles **Pathfinder 1re édition**

Les automatisations propres à PF1 utilisent les mécanismes et structures du système PF1 v11.11.
