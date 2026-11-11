# PF1 — Skull & Shackles v1.22.0

## Nouveautés v1.22 — Rotation libre des navires

La v1.22 réintroduit les secteurs **Proue / Poupe / Bâbord / Tribord** avec une géométrie basée sur la rotation réelle du token.

- Les secteurs tournent avec l’image du token.
- Le `rotationOffset` permet de corriger l’orientation propre de l’illustration et accepte désormais des valeurs au degré près.
- Les cases atteignables et les déplacements automatisés suivent également l’axe réel du token.
- Un navire peut donc être orienté à 15°, 30°, 45° ou tout autre angle sans que les aides visuelles restent bloquées sur la grille.
- L’empreinte Foundry reste rectangulaire et approximative : le module ne tente pas de faire pivoter la collision native d’un token 3×1.
- Pour un grand navire, un encombrement carré approximatif, par exemple **3×3**, reste une bonne solution pratique si l’on veut éviter qu’une empreinte 3×1 devienne trompeuse lorsqu’elle est orientée en diagonale.
- Le cap logique cardinal reste utilisé pour les règles existantes de vent ; cette version ne remplace pas encore ces règles par un cap continu en degrés.

## Nouveautés v1.22 — Rotation libre des secteurs navals

Les zones visuelles **Proue / Poupe / Bâbord / Tribord** sont de nouveau disponibles et suivent maintenant la rotation réelle du token.

- La texture du navire peut être tournée librement dans Foundry.
- Les secteurs tournent autour du centre du token avec le même angle.
- Le **Décalage graphique du token** permet de corriger l’orientation propre à chaque image.
- Les angles intermédiaires sont supportés, pas seulement les quarts de tour.
- L’encombrement Foundry reste volontairement approximatif et ne change pas lors de la rotation.
- Pour un grand navire, un encombrement carré comme **3 × 3** peut donc servir d’approximation mécanique pendant que la texture et les secteurs tournent librement à l’intérieur.
- Les règles et déplacements navals restent pour l’instant fondés sur le cap logique du module ; seule la géométrie visuelle des secteurs suit directement la rotation libre.

## Nouveautés v1.21 — Cycle journalier & journal de bord

La v1.21 ajoute une vue d’orchestration quotidienne qui relie **Vie à bord**, **Quarts & fatigue** et le **Registre d’équipage** sans introduire de nouvelle règle PF1.

- Six phases de journée clairement visibles et sélectionnables par le MJ.
- Tableau centralisé Tâche / Jour / Nuit / Rhum pour les personnages suivis.
- Détection des compteurs de jour désynchronisés entre les sous-systèmes.
- Journal de bord persistant avec notes libres et historique.
- Résumé de journée publiable dans le chat.
- Clôture sécurisée : blocage si des actions restent non résolues, avec option de forçage explicite.
- La clôture utilise la même logique que « Nouvelle journée » dans Vie à bord.
- Aucun calendrier externe n’est avancé automatiquement.

## Nouveautés v1.20 — Quarts, relève et fatigue

La v1.20 ajoute un contrôleur **Quarts & fatigue** pour organiser les groupes de relève et suivre la disponibilité de l’équipage.

- Le quart actif et la rotation sont déduits des affectations du **Registre d’équipage**.
- Quatre niveaux de fatigue générale sont suivis : **Reposé**, **Fatigué**, **Épuisé** et **Hors service**.
- La fatigue générale applique un modificateur de **0 / −1 / −2 / −4** au sous-système maison de combat d’équipage d’Abordage.
- La fatigue individuelle des personnages nommés est également suivie et intervient dans leur jet maison de survie lorsqu’ils sont exposés pendant un abordage.
- **Branle-bas de combat** augmente la fatigue générale et celle des personnages rappelés alors qu’ils n’étaient pas de quart.
- **Cycle de repos** réduit la fatigue générale et permet aux personnages hors quart de récupérer.
- La fatigue déjà signalée par **Vie à bord** est importée sans écraser les données existantes.
- Le contrôleur conserve un historique des relèves et ajustements et peut publier un résumé dans le chat.
- Cette mécanique est explicitement une **règle maison** : elle n’ajoute aucune condition PF1 ni aucun malus officiel de navigation automatiquement.

## Nouveautés v1.19 — Registre d’équipage consolidé

La v1.19 ajoute un contrôleur **Registre d’équipage** destiné à centraliser les PNJ et PJ importants du navire sans remplacer les sous-systèmes existants.

- Le registre agrège automatiquement les Actors déjà utilisés par **Vie à bord**, **Abordage**, **Relations d’équipage** et les **postes d’officiers**.
- Une seule ligne permet de voir : rôle quotidien, poste d’officier, attitude, PJ lié, camp probable en cas de mutinerie, état de santé, blessure permanente et sources de suivi.
- Le MJ peut ajouter manuellement un personnage notable et lui attribuer une **fonction libre**, un **quart**, une marque **Important** et des notes.
- Des boutons de synchronisation ajoutent rapidement un personnage au suivi des **Relations** ou aux **PNJ nommés d’Abordage**, sans créer de doublon.
- Retirer une entrée manuelle du registre ne supprime jamais les données des autres contrôleurs : le personnage reste visible tant qu’il est encore utilisé ailleurs.
- Le bouton **Publier** envoie au chat un résumé compact des officiers, blessés, capturés et relations importantes.
- Nouvelle macro **S&S — Registre d’équipage**, nouveau bouton dans la Passerelle et nouvelle page d’Aide rapide.

Le registre est volontairement un outil d’organisation : il ne crée aucun bonus mécanique supplémentaire et respecte les valeurs déjà conservées dans les sous-systèmes existants.


## Nouveautés v1.18 — Relations d’équipage

La v1.18 ajoute un contrôleur **Relations d’équipage** pour suivre les matelots nommés qui comptent réellement pour les PJ. Cette partie s’appuie sur la mécanique d’attitude de la première aventure : Hostile, Inamical, Indifférent, Amical et Serviable.

- Chaque PNJ peut être associé à un **PJ lié** comme repère narratif, sans bonus mécanique automatique.
- Le module calcule le camp probable d’un PNJ en cas de mutinerie : **Amical/Serviable → PJ**, **Indifférent → neutre**, **Hostile/Inamical → opposition**. Le MJ peut toujours forcer un camp différent pour gérer les exceptions du scénario.
- Les camps peuvent être publiés dans le chat et sont résumés dans **Équipage & cohésion**.
- Dans **Vie à bord**, une tentative d’Influence affiche l’attitude réellement suivie du PNJ.
- Un PNJ **Serviable** peut être choisi comme aide à une tentative d’Influence et fournit **+2**, conformément au texte de campagne.
- Le bonus de +2 d’un PNJ **Amical** pour une tâche de jour reste activé manuellement, car la campagne exige que le PNJ possède des rangs dans la compétence appropriée.
- Les PNJ nommés déjà suivis dans **Abordage** peuvent être importés d’un clic.

Le changement d’attitude lui-même reste arbitré par le MJ après le test de Bluff/Diplomatie/Intimidation, car la campagne renvoie aux règles normales de Diplomatie pour déterminer le nouvel état.




## Nouveautés v1.17 — Équipage, progression et mutinerie

La v1.17 ajoute un contrôleur **Équipage & cohésion** relié directement au profil d’abordage du navire. Il suit l’expérience collective, la qualité, la loyauté, l’agitation et le risque de mutinerie.

- Seuils maison de qualité : Recrues 0 XP, Aguerris 3, Vétérans 8, Élite 15, Exceptionnels 24.
- Entraînement quotidien par le maître d’armes ou le bosco ; un succès DD 15 fait progresser l’équipage.
- Le MJ peut enregistrer librement les effets d’une part de butin, d’une pénurie, d’une punition, d’une victoire ou de tout autre événement sur XP / loyauté / agitation.
- Le test de mutinerie tient compte du capitaine, du moral, du bosco et du quartier-maître. Une mutinerie ouverte devient ensuite une scène PF1 ou narrative normale : le module n’en décide pas automatiquement l’issue.
- Toutes ces mécaniques sont explicitement des **règles maison optionnelles** ; elles complètent les règles officielles de Skull & Shackles sans les remplacer.

## Nouveautés v1.15 — Reddition, prisonniers et enrôlement des survivants

- Après avoir déclaré les **Assaillants vainqueurs** ou les **Défenseurs vainqueurs**, l’assistant propose désormais une phase **Suites immédiates**.
- Le MJ choisit entre **reddition**, **repli** ou **fuite / dispersion** du camp vaincu.
- En cas de reddition, le module calcule un vivier de survivants ordinaires aptes et blessés. Les PNJ nommés restent séparés et ne sont jamais capturés automatiquement.
- Les survivants aptes peuvent être **enrôlés pour remplacer les pertes permanentes** du vainqueur. Le module ne remplace jamais plus de morts/disparus qu’il n’y en a réellement et respecte `system.crew.max`.
- Les survivants restants peuvent être transférés vers **Piraterie & Prises → Prisonniers & rançons** ou libérés.
- Les **PNJ nommés** du camp vaincu peuvent être marqués individuellement comme capturés ; leur niveau total est transféré dans la valeur de rançon des personnages importants.
- Un bouton ouvre directement **Piraterie & Prises** sur le navire vainqueur pour poursuivre la gestion de la prise.
- Cette couche reste volontairement légère : le résultat principal de l’abordage reste déterminé par le combat PF1 normal des PJ et PNJ importants.

## Nouveautés v1.14 — Après-abordage, triage et récupération

- Ajout d'une phase **Après l'abordage** dans l'assistant d'abordage.
- Le **charpentier / chirurgien** affecté peut faire un test de **Premiers secours / Heal DD 15** (Sagesse en repli) pour stabiliser des blessés graves.
- Un triage réussi convertit 1 blessé grave en blessé léger, +1 supplémentaire par tranche complète de 5 points au-dessus du DD, et accorde un bonus de récupération de +2 à +4 pour la prochaine journée.
- Une **journée de récupération** teste les blessés légers (DD 10) et graves (DD 15) ; les légers remis reviennent automatiquement dans `system.crew.value`, sans dépasser l'effectif complet du Vehicle.
- Les **PNJ nommés** récupèrent eux aussi progressivement : égratigné → apte ; blessé / grave / critique peuvent s'améliorer avec un test quotidien basé sur Constitution et le bonus de triage. Les mutilations permanentes restent enregistrées.
- Bouton de synchronisation des **pertes permanentes** (morts + disparus/capturés) vers **Piraterie & Prises → Pertes à remplacer**, afin d'utiliser directement le mécanisme existant d'enrôlement des survivants.
- Le suivi de récupération est persistant par navire : jour, dernier triage, bonus médical et historique.
- Ces règles de récupération sont explicitement signalées comme **règles maison** et ne remplacent pas les soins individuels PF1.


## Nouveautés v1.13 — Abordages et combat d’équipage

- L’assistant d’**Abordage** conserve la règle officielle : les PJ et PNJ importants combattent normalement avec PF1 sur le pont.
- Ajout d’un **sous-système maison optionnel** pour résoudre la mêlée des matelots en arrière-plan sans jouer des dizaines de PNJ individuellement.
- Qualité d’équipage : Recrues, Aguerris, Vétérans, Élite ou Exceptionnels.
- Moral : En déroute, Ébranlé, Stable, Confiant ou Exalté.
- Jet de phase opposé : `1d20 + qualité + moral + rapport de forces + maître d’armes + commandement + circonstances + événements`.
- Degrés de résultat : mêlée indécise, avantage, domination et effondrement.
- Calcul automatique des pertes et répartition entre **blessés légers, blessés graves, morts et disparus/capturés**. Les pertes réduisent l’équipage disponible du Vehicle PF1.
- Les **PNJ nommés** peuvent être liés à des Actors PF1 et marqués exposés/protégés. Leur niveau et leur Constitution influencent leur jet de survie.
- Les blessures graves peuvent tirer sur la table optionnelle **Jambe de bois et cache-œil** de Skull & Shackles.
- Gestion des officiers : capitaine, maître d’armes, bosco, maître artilleur, charpentier/chirurgien et quartier-maître.
- Test de commandement DD 15 avec le meilleur de Diplomatie, Intimidation ou Profession (marin).
- Bonus automatique du maître d’armes selon son BBA.
- Événements de bataille : capitaine/officier vaincu, PJ hors combat, critique spectaculaire, pavillon abattu, zone conquise, renforts, navire en feu, etc.
- Import automatique des Actors déjà affectés dans **Vie à bord** comme PNJ nommés de l’équipage.

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


## Nouveau en v1.20 — Quarts, relève et fatigue

- Nouveau contrôleur **Quarts & fatigue** accessible depuis la Passerelle, le Registre d’équipage et la macro dédiée.
- Les personnages nommés utilisent les affectations de quart déjà conservées dans le Registre ; le module détecte les groupes réellement utilisés et construit une rotation sans imposer un découpage historique particulier.
- Suivi d’une **fatigue générale** du gros de l’équipage : Reposé (0), Fatigué (−1), Épuisé (−2), Hors service (−4).
- Ce modificateur ne touche que le **combat d’équipage maison** d’Abordage. Les tests PF1 normaux et les règles officielles de navigation ne sont pas modifiés.
- Suivi individuel de fatigue pour les PNJ/PJ nommés, avec influence sur leur jet maison de survie pendant un abordage.
- **Branle-bas de combat** : rappelle tout le monde et fatigue davantage les personnages qui étaient hors quart.
- **Cycle de repos** : réduit la fatigue générale et celle des personnages hors quart.
- Import facultatif de la fatigue de **Vie à bord** sans écraser un niveau déjà supérieur.
- Historique des relèves et ajustements, publication au chat et interface responsive.



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
- Relations des PNJ, attitudes persistantes, aides officielles et camps de mutinerie.
- Quarts, relève et fatigue maison de l’équipage, reliés au combat d’abordage abstrait.
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
- `open-crew-roster.js`
- `open-crew-watch.js`
- `open-crew-relations.js`
- `open-entertainment.js`
- `open-library.js`
- `ship-wizard.js`
- `open-quick-reference.js`
- `install-world-tools.js`

## API

```js
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedDashboard();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedShip();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewRoster();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewWatch();
game.modules.get("pf1-skull-and-shackles")?.api?.openSelectedCrewRelations();
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

## Interface et multijoueur — v1.16

La v1.16 renforce le HUD et les interactions joueur/MJ sans modifier les règles de campagne. Dans **Configuration du module**, chaque client peut choisir la densité du HUD (`Minimal`, `Compact` ou `Confortable`), activer l'ancrage automatique sur petit écran et choisir des notifications multijoueur discrètes.

Le HUD affiche désormais l'état des actions : **Prêt** lorsqu'un jet ou une résolution peut être effectué, **En attente** pendant la validation par le MJ, puis **Envoyé/Fait** quand l'état serveur est enregistré. Chaque requête possède un identifiant unique et le module bloque les soumissions locales concurrentes ainsi que les doubles validations côté MJ.

Le bouton en forme d'horloge, visible au MJ dans le HUD, ouvre l'**Historique multijoueur**. Les inscriptions, jets de jeux de pirates et actions de Vie à bord validés y sont conservés. La dernière action encore active de chaque sous-système peut être **annulée/corrigée** : le module restaure l'état précédent, ce qui permet au joueur de refaire ensuite son choix ou son jet. Pour remonter plus loin, annuler successivement les actions les plus récentes du même sous-système.

En cas de changement de scène, reconnexion, retour sur l'onglet ou retour réseau, le client demande automatiquement une resynchronisation au MJ actif. Le bouton de synchronisation du HUD permet aussi de forcer cette opération manuellement.
