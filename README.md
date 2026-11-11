# PF1 — Skull & Shackles v1.12.0



## Nouveautés v1.9 — Vie à bord multijoueur

- Le HUD affiche désormais la **tâche journalière** du personnage possédé par le joueur.
- Le joueur choisit directement **Travail assidu, Influence, Sournoiserie, Réserve ou Dérobade** pour son action diurne.
- Il choisit également son action nocturne : **Repos, Jeu, Amusement, Influence, Sournoiserie ou Larcin**.
- Le joueur lance lui-même les dés de sa tâche et de ses actions discrètes ; les résultats sont visibles dans le chat et synchronisés sur le navire.
- La ration de rhum peut être **bue ou jetée discrètement** depuis le HUD par le joueur concerné.
- La fiche MJ affiche l’avancement de chacun : **Tâche / Jour / Nuit / Rhum**.

## Nouveautés v1.8

- **HUD de campagne** en haut à droite avec Butin, Infamie et Déshonneur.
- Le MJ peut lier le navire principal via l’icône de chaîne du HUD.
- **Divertissements multijoueurs** : le MJ ouvre les inscriptions, chaque joueur choisit un personnage qu’il possède, participe ou se retire puis lance lui-même ses dés.
- **Haut les cœurs !** : le MJ ouvre chaque rasade ; les joueurs lancent leur Vigueur et les effets de rhum depuis leur propre client.
- **Lancer de cochon** et **bras de fer** : les résultats peuvent être lancés directement par les joueurs et sont synchronisés vers le navire.
- **Assistant d’abordage** : le module conserve la règle officielle selon laquelle le combat redevient un combat PF1 normal sur le pont et que les équipages ordinaires se battent à l’arrière-plan.

Module complémentaire pour **Foundry VTT v13** et le système **Pathfinder 1 (PF1)**. Il s’appuie sur les Actors `Vehicle` de PF1 et ajoute les mécaniques spécifiques de Skull & Shackles.

## Installation

1. Décompresser le dossier `pf1-skull-and-shackles` dans `Data/modules/`.
2. Vérifier que `Data/modules/pf1-skull-and-shackles/module.json` existe directement.
3. Activer **PF1 — Skull & Shackles** dans un monde PF1.
4. Recharger le monde.



## Nouveau en v1.6 — Voyages, poursuites et rencontres en mer

- Nouveau contrôleur **Voyages & Poursuites** accessible depuis la Passerelle et le contrôleur naval.
- Planificateur de **déplacement sur longue distance** en km/h et km/jour, avec progression, distance restante et estimation du temps de voyage.
- Règle des journées de navigation : **10 h** pour la propulsion par muscles et **24 h** pour les navires à voiles.
- Préréglages uniquement lorsque le Guide du Joueur donne explicitement une valeur exploitable : **Canot 3 km/h / 30 km par jour** et **Jonque 3 km/h / 72 km par jour**.
- Les améliorations de v1.5 modifient automatiquement l’allure de voyage : blindage, renforts en bois et voiles de soie.
- Résolution de **Fuite et poursuite** avec les trois tests de navigation opposés, victoire à 2 tests sur 3, issue automatique et durée optionnelle de **1d4 jours**.
- Tables complètes de **rencontres aléatoires en mer** de bas niveau, niveau intermédiaire et haut niveau, avec quantité tirée automatiquement.
- Chance de rencontre et nombre de vérifications par jour configurables par le MJ ; l’avancement d’une journée peut effectuer ces vérifications automatiquement.
- Test de navigation hors combat avec DD 5 par défaut et rappel que ces jets ne sont normalement nécessaires que dans les situations particulières.
- Nouvelle macro **S&S — Voyages & Poursuites** et nouvelle page de l’Aide rapide.

## Nouveau en v1.5 — Améliorations de navire

- Nouveau contrôleur **Améliorations** accessible depuis la Passerelle et le contrôleur naval.
- Catalogue des 20 modifications du Guide du Joueur : blindage, cargaison, compartiments de contrebande, coque effilée/renforcée/magique, pilotage magique, éperon, figure de proue, fond vitré, pont mobile, quartiers supplémentaires, quille rallongée, rames magiques, renforts en bois, sabords dissimulés, safran élargi, voiles à déploiement rapide, voiles de soie et voiles magiques.
- Calcul automatique du **DD**, du **prix** et du coût perdu sur un échec.
- Suivi du constructeur : après un échec, ce constructeur ne peut plus terminer cette modification ; un autre constructeur subit **+2 au DD** si le navire a déjà été modifié par quelqu’un d’autre.
- Recalcul des PV de coque, solidité, PV/solidité des voiles, rames et dispositif de pilotage sans effacer les dégâts déjà subis.
- Bonus de navigation automatiquement raccordés au moteur naval : blindage −1, coque effilée +2, quille rallongée +1, safran élargi +1, voiles à déploiement rapide +1.
- Les **voiles de soie** donnent automatiquement +1 aux tests opposés d’ascendant.
- Suivi de la capacité de cargaison, des passagers, des dimensions, des compartiments de contrebande et des sabords dissimulés.
- Les modifications réservées à la construction initiale sont bloquées sauf si le mode chantier est explicitement activé.
- Le profil **Bateau de guerre** reconnaît sa voilure renforcée par magie comme équipement intrinsèque sans la doubler une seconde fois.
- Nouvelle macro **S&S — Améliorations du navire** et nouvelle page de l’Aide rapide.

## Nouveau en v1.4 — Dangers de navigation et Régate

- Nouveau contrôleur **Dangers & Régate** depuis la Passerelle.
- Météo aléatoire spécifique aux Chaînes : d100, proximité avec l’Œil d’Abendégo, Profession (marin)/Survie et catégories de météo.
- Résolution de la table **Dangers des tempêtes** avec fréquence et modificateur selon la météo ; suivi des avaries persistantes utiles au moteur (gouvernail bloqué, vitesse divisée par deux, échouage, voie d’eau majeure).
- Les états environnementaux sont intégrés au moteur naval : gouvernail bloqué = −10 aux tests de navigation, vitesse réduite = vitesse maximale divisée par deux, navire échoué = déplacement/manœuvres impossibles.
- Moteur des **Récifs éventreurs** : Perception → distance de repérage, DD d’évitement selon distance/vitesse, malus de virage, dégâts de raclement, impact 8d8, échouage et perte de score.
- Calcul automatique du modificateur de score lié à la vitesse moyenne dans les Récifs éventreurs.
- Moteur de **Régate des Capitaines libres** : score initial 0, étapes D à M, tests de navigation et variation de score par tranches complètes de 5 points.
- Jusqu’à trois aides (+2 chacune), carte des bons vents et gouvernail de Jalhazar pris en charge dans les outils de course.
- Outil générique de tests de compétence d’étape pour Survie, Nature, Géographie, Folklore local, Perception ou Profession (marin), avec pénalités de score configurables.
- Raccourcis de campagne : accident d’éperonnage au départ, traversée DD 30 du récif peau de requin, foudre 10d8 aux voiles dans l’ouragan et pénalité de round incontrôlé dans la dernière ligne droite.
- Projection automatique du résultat final de la Régate et des récompenses d’histoire indiquées dans l’aventure.
- Nouvelle macro **S&S — Dangers & Régate** et page dédiée dans l’Aide rapide.

## Nouveau en v1.3 — Aides visuelles et cisaillement

- Aides visuelles client-side directement sur le Canvas : secteurs **proue / bâbord / tribord / poupe** autour du navire contrôlé.
- Surbrillance des positions atteignables avec la **vitesse actuelle** : uniquement avant, avant-bâbord et avant-tribord à chaque case.
- Surbrillance séparée du déplacement gratuit d’**ascendant**.
- Correction importante de l’ascendant : ses cases gratuites peuvent maintenant être déplacées dans **n’importe laquelle des 8 directions**, conformément à la règle.
- Nouveau pavé de déplacement d’ascendant indépendant d’**Arrière toute !**.
- Planificateur visuel de **cisaillement** : vérification du départ adjacent à la proue/poupe de la cible, suivi du même flanc et comptage des segments adjacents longés.
- La longueur à parcourir est tirée du profil officiel du navire cible ; une longueur manuelle peut être renseignée pour les Vehicles personnalisés.
- Le trajet préparé est tracé sur le Canvas et devient vert lorsqu’il est complet.
- Le bouton **Cisailler les rames** du contrôleur naval reconnaît désormais un trajet validé par la Carte navale.
- Nouveau réglage client pour masquer toutes les aides visuelles sans modifier les données du monde.

## Nouveau en v1.2 — Carte navale

- Nouveau contrôleur **Carte navale** accessible depuis la Passerelle et le contrôleur naval.
- Déplacement réel du token par **cases navales de 9 m / 30 ft**, même sur une scène PF1 classique réglée sur 1,50 m / 5 ft.
- Mouvement vers l’avant, l’avant-bâbord et l’avant-tribord, plus les trois directions d’**Arrière toute !**.
- Suivi séparé du budget de mouvement fourni par la **vitesse actuelle** et du déplacement gratuit gagné avec l’**ascendant**.
- Consommation des rotations gratuites d’ascendant par tranches de **90°**.
- Synchronisation du cap S&S avec la rotation du token ; rotation automatique optionnelle après **Bâbord toute !** / **Tribord toute !**.
- Décalage graphique configurable par navire pour les illustrations dont la proue ne pointe pas vers le haut à rotation 0°.
- Indicateur de **vent** affiché sur les scènes contenant un navire S&S.
- Bouton facultatif pour configurer une scène à **1 case Foundry = 1 case navale**.
- Calcul du secteur relatif de la cible : **proue, poupe, bâbord, tribord**, avec distance entre les coques.
- Aides de placement pour éperonnage, agrippement, départ de cisaillement et bordées.
- Correction du calcul de proximité : une « case navale » tient désormais compte de l’échelle réelle de la scène au lieu d’être confondue avec une case Foundry ordinaire.
- Éperonnage automatiquement refusé si la cible calculable n’est pas placée devant la proue ; cisaillement refusé si le départ n’est pas à la proue ou à la poupe de la cible.
- Les bordées affichent désormais le secteur et la distance de la cible ; un mauvais côté produit un avertissement sans inventer un arc de tir strict absent du texte utilisé par le module.

## Moteur de règles inclus

- Navigation, vent, ascendant, manœuvres, éperonnage, agrippement, abordage et cisaillement.
- Carte navale : déplacements de tokens, orientation, secteurs, cases atteignables et planificateur de cisaillement.
- Dangers maritimes : météo des Chaînes, tempêtes, récifs, échouage et Régate des Capitaines libres.
- Voyages en haute mer : longue distance, poursuites et rencontres aléatoires.
- Améliorations de navire : installation, prix/DD, constructeurs, coque, gréement, pilotage et effets de navigation.
- Dégâts par composant, incendies, réparations et naufrage.
- Engins de siège, équipes, visée/chargement, munitions spéciales et bordées.
- Butin, Infamie, Déshonneur, ventes et impositions.
- Affrontements entre flottes.
- Vie quotidienne à bord, influence, rhum, châtiments et divertissements pirates.
- Assistant de création avec 9 profils de navires.
- Bibliothèque mécanique et compendiums générables.
- Règle optionnelle « Jambe de bois et cache-œil ».

## Accès rapide

Sélectionner le token `Vehicle` du navire puis utiliser une macro S&S ou le bouton de la fiche PF1.

Macros fournies dans `macros/`, dont :

- `open-dashboard.js`
- `open-controller.js`
- `open-naval-map.js`
- `open-hazards.js`
- `open-improvements.js`
- `open-voyage.js`
- `open-piracy.js`
- `open-siege.js`
- `open-reputation.js`
- `open-fleet.js`
- `open-life.js`
- `open-entertainment.js`
- `open-library.js`
- `ship-wizard.js`
- `open-quick-reference.js`
- `install-world-tools.js`

## API

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

## Remarque sur la carte navale

Les boutons de déplacement **n'effectuent pas le test de navigation à la place du contrôleur naval**. Ils servent à appliquer sur la scène le déplacement accordé après résolution de l'action. Cette séparation évite au module d'inventer un trajet lorsque plusieurs choix de cases sont possibles.

## Mise à jour depuis v1.6

Remplacer le dossier du module par la v1.7 puis recharger le monde. Le nouveau contrôleur **Piraterie & Prises** utilise un flag indépendant et ne modifie pas les voyages, améliorations ou combats existants. Relancer **Installer / mettre à jour les outils de monde** pour ajouter la nouvelle macro et mettre à jour l’aide rapide.

## Piraterie & Prises (v1.7)

Le contrôleur **Piraterie & Prises** gère les cinq proies de l’évènement répétable « Les loups de mer », la ruse pour empêcher leur fuite, le transfert de cargaison en Butin, le recrutement, les équipages de prise et la revente/conservation des navires capturés.

Il inclut également un bouton de versement de la **part de l’équipage** (−1 Butin lors d’une vente de Butin), le calcul de la capacité des cales, la création/l’association d’un Vehicle PF1 pour la proie et un suivi indicatif des prisonniers et rançons.


## Recrutement de flotte (v1.10)
Le contrôleur **Recrutement de flotte** automatise la phase de constitution de la flotte : mercenaires, cinq ports de recrutement, délais, DD 30, coûts, réduction par Déshonneur et alliés de campagne. Ouvre-le depuis la Passerelle, la fiche Flotte ou la macro `S&S — Recrutement de flotte`.


## v1.11 — HUD déplaçable et pétardage
Le HUD de ressources peut être déplacé en saisissant sa barre de titre ; sa position est mémorisée localement pour chaque utilisateur. Le contrôleur Pétardage & identité gère le chantier des Pétards du Frêle et conserve un historique des changements d’identité du navire.


## v1.12 — Compendiums de campagne

L'installation des compendiums de référence crée désormais aussi **S&S — Navires de campagne** et **S&S — Flottes de campagne**. Ils regroupent les bâtiments nommés déjà couverts par le module, les proies publiées des *Pillards de la mer de Fièvre*, les principaux vaisseaux amiraux, les escadrons alliés et le profil complet de l'Armada chélaxienne de la bataille d'Abendégo. Les entrées restent des références de jeu : lorsqu'une valeur n'est pas explicitement fournie par les sources intégrées, le module l'indique au lieu de l'inventer.
