# 1.12.0

- Ajout des compendiums **S&S — Navires de campagne** et **S&S — Flottes de campagne**.
- Ajout de références pour l’Absinthe, le Promesse de l’Homme, les cinq proies des *Pillards de la mer de Fièvre*, le Fureur d’Abrogail et l’Argent sale.
- Ajout du profil complet de l’Armada chélaxienne (8 escadrons / 47 bâtiments), de la Chance de Bonvent et des escadrons alliés recrutables.
- L’installateur de compendiums existant installe/met à jour automatiquement les nouveaux packs sans doublons.
- Les profils n’inventent pas de valeurs absentes des sources.

# Changelog

## 1.11.0
- HUD Butin / Infamie / Déshonneur déplaçable par glisser-déposer, position enregistrée par utilisateur et bouton de réinitialisation.
- Nouveau contrôleur « Pétardage & identité » pour les Pétards du Frêle : coût 20 %, délai 1d4+4 jours, Artisanat (bateaux) DD 15, reconnaissance Perception DD 20, cachettes, surcharge d’attitude et financement optionnel.
- Suivi du nom, du pavillon, du maquillage de silhouette et de l’historique des identités.
- Nouvelle macro et nouvelle page d’aide rapide.

## 1.10.0
- Nouveau contrôleur **Recrutement de flotte**.
- Recrutement des escadrons mercenaires dans les cinq ports éligibles des Chaînes.
- Gestion du délai de 1d4 jours, du test social DD 30, d’Aider autrui, du coût de 40 000 po / 40 Butin et de la réduction par Déshonneur.
- Suivi du délai de réapparition de 1d4+4 semaines par port.
- Profil mercenaire officiel : 3 voiliers ou 3 drakkars, marin +10, moral 3, −2 aux tests de moral.
- Recrutement direct des trois alliés proposés par la campagne : Merril Boistendre, Pierce Jerrel et Sandara Quinn.
- Suivi des PX d’histoire, des dépenses et de la disponibilité des alliés.
- Bouton pour clore les contrats mercenaires après une bataille notable.
- Nouvelle macro et nouvelle page d’Aide rapide.

## 1.9.0

- La **Vie à bord** devient multijoueur depuis le HUD de campagne.
- Chaque joueur propriétaire d’un personnage affecté à l’équipage voit sa tâche du jour dans le HUD.
- Chaque joueur choisit lui-même son **action diurne** et son **action nocturne**.
- Les joueurs lancent eux-mêmes les jets de leur tâche depuis leur propre client ; les résultats sont publiés dans le chat puis synchronisés vers le navire par le MJ actif.
- Résolution joueur des actions discrètes diurnes/nocturnes, du repos et de la ration de rhum.
- Le HUD empêche les doubles résolutions pour une même journée.
- La fiche MJ de Vie à bord affiche un récapitulatif **Tâche / Jour / Nuit / Rhum** pour chaque membre.
- Les jeux multijoueurs de v1.8 et le HUD Butin / Infamie / Déshonneur sont conservés.

## 1.8.0

- Ajout d’un HUD permanent en haut à droite affichant **Butin**, **Infamie** et **Déshonneur** du navire de campagne.
- Le MJ peut lier le Vehicle sélectionné comme navire principal depuis le HUD.
- Ajout d’un mode multijoueur pour les divertissements : chaque joueur choisit son personnage, décide de participer ou non et lance ses propres dés.
- Inscriptions joueur pour **Bras de fer**, **Lancer de cochon** et **Haut les cœurs !**.
- Synchronisation des inscriptions et résultats via le socket du module ; le MJ conserve le contrôle des PNJ et des rondes.
- **Haut les cœurs !** fonctionne désormais par ronde ouverte par le MJ, puis chaque joueur lance sa propre rasade.
- Ajout d’un assistant d’**Abordage** : rappel de l’initiative des pilotes, règle du premier round, suivi manuel des équipages en arrière-plan et transition vers le combat PF1 normal.
- Nouvelle macro **S&S — Abordage** et nouvelles pages d’aide HUD/jeux multijoueurs et abordage.

## 1.7.0

- Nouveau contrôleur **Piraterie & Prises** pour les rencontres avec des navires marchands.
- Intégration des cinq proies de l'évènement 7 « Les loups de mer » avec capitaine, équipage, statistiques publiées, armement et cargaison.
- Création optionnelle d'un Vehicle PF1 à partir de la proie sélectionnée et liaison avec un token/Vehicle déjà présent.
- Ruse de poursuite : Bluff du pilote opposé à Psychologie du capitaine adverse après qu'une attaque a touché le navire des PJ.
- Transfert de cargaison vers le suivi de Butin avec contrôle de la capacité des cales (1 Butin = 10 tonnes).
- Part de l’équipage : bouton explicite retirant 1 point de Butin lors d’une vente de Butin.
- Remplacement des pertes d'équipage avec les survivants et recrutement DD 20 pour 1d4+2 nouveaux marins.
- Gestion d'un équipage de prise : équipage minimum + officier de confiance, retirés du navire principal.
- Vente d'une prise à 50 % de sa valeur de Butin, ou 25 % si elle a perdu plus de la moitié de ses PV ; valeur manuelle lorsque la campagne ne fournit pas de référence.
- Suivi de la conservation/du maquillage d'une prise et calcul optionnel des prisonniers/rançons.
- Nouvelle macro **S&S — Piraterie & Prises** et nouvelle page d'aide rapide.

## 1.6.0

- Nouveau contrôleur **Voyages & Poursuites**.
- Planificateur de déplacement sur longue distance avec allure effective, distance journalière, progression et ETA.
- Application automatique des modificateurs de vitesse de voyage issus des améliorations de navire.
- Préréglages sourcés pour le Canot (3 km/h, 30 km/jour) et la Jonque (3 km/h, 72 km/jour) ; aucun chiffre n’est inventé pour les autres profils.
- Résolution complète de Fuite et poursuite par trois tests de navigation opposés, avec victoire à deux tests sur trois et durée optionnelle de 1d4 jours.
- Tables de rencontres en mer de bas niveau, intermédiaire et haut niveau, avec tirage des quantités.
- Vérification de rencontre configurable et intégrable automatiquement à l’avancement d’une journée de voyage.
- Test de navigation hors combat dédié, DD 5 par défaut.
- Nouvelle macro et nouvelle page d’aide rapide.

## 1.5.0

- Nouveau contrôleur **Améliorations du navire**.
- Intégration des 20 modifications publiées dans le Guide du Joueur, avec DD, prix, conditions et effets résumés.
- Suivi du constructeur, du +2 de DD en cas de constructeur différent et de l’interdiction de réessayer avec le même constructeur après un échec.
- Registre des dépenses de chantier ; un échec comptabilise la moitié du prix.
- Recalcul réversible de la coque, de la solidité, des voiles, des rames et du dispositif de pilotage en conservant les dégâts existants.
- Bonus/malus de navigation des améliorations raccordés au moteur de navigation.
- Bonus des voiles de soie raccordé aux tests opposés d’ascendant.
- Suivi de la cargaison, des passagers, des dimensions, des compartiments secrets et des sabords dissimulés.
- Gestion des modifications de construction initiale et des traitements magiques.
- Migration de l’éperon existant et gestion spéciale de la voilure magique intrinsèque du profil Bateau de guerre.
- Nouvelle macro et page d’aide rapide.

## 1.4.0

- Nouveau contrôleur **Dangers & Régate**.
- Météo aléatoire des Chaînes avec modificateurs de proximité de l’Œil d’Abendégo.
- Résolution des Dangers des tempêtes et suivi des avaries environnementales persistantes.
- Intégration au moteur naval du gouvernail bloqué, de la vitesse réduite et de l’échouage.
- Moteur des Récifs éventreurs : repérage, distance, DD d’évitement, virage, dégâts, échouage et score.
- Moteur de score de la Régate des Capitaines libres et suivi des étapes D à M.
- Outil de tests de compétence d’étape et raccourcis pour plusieurs obstacles de la Régate.
- Projection de l’issue finale et des récompenses d’histoire.
- Nouvelle macro et nouvelle page d’aide rapide.

## 1.3.0

- Aides visuelles client-side sur le Canvas : proue, poupe, bâbord et tribord.
- Surbrillance des positions atteignables avec la vitesse actuelle et avec l’ascendant.
- Correction du déplacement d’ascendant : déplacement gratuit dans n’importe quelle direction, et non plus seulement vers l’avant.
- Nouveau pavé de déplacement d’ascendant à 8 directions.
- Planificateur de cisaillement avec vérification du départ proue/poupe, suivi de l’adjacence, du flanc et des segments parcourus.
- Longueur de cisaillement issue des profils officiels, avec valeur manuelle pour les navires personnalisés.
- Tracé du trajet de cisaillement sur le Canvas et validation automatique du trajet complet.
- Intégration du trajet préparé à l’action **Cisailler les rames**.
- Nouveau réglage client pour afficher ou masquer les aides visuelles navales.
- Aide rapide mise à jour.

## 1.2.0

- Nouveau contrôleur **Carte navale** avec déplacement réel des tokens par cases de 9 m / 30 ft.
- Conversion automatique de l’échelle de scène et option pour configurer directement une grille navale.
- Suivi des budgets de mouvement normal et d’ascendant, plus rotations gratuites de 90°.
- Synchronisation cap ↔ rotation du token et décalage graphique configurable.
- Indicateur de vent de scène.
- Calcul automatique des secteurs proue/poupe/bâbord/tribord et de la distance entre coques.
- Aides de placement pour éperonnage, agrippement, cisaillement et bordées.
- Correction du calcul de proximité navale sur les scènes à grille PF1 standard.
- Nouvelle macro **S&S — Carte navale** et nouvelle page de l’aide rapide.
- Deux réglages client : affichage de l’indicateur de vent et rotation automatique des tokens après un virage.

## 1.1.0

- Nouvelle **Passerelle** synthétique pour piloter les principaux outils du module depuis un seul écran.
- Résumé immédiat : structure, vitesse, équipage, pilote, cap, vent, états critiques, cible et round de combat.
- Nouveau réglage client : le bouton de fiche Vehicle peut ouvrir le contrôleur naval ou la Passerelle.
- Installation idempotente des **outils de monde** : 10 macros, aide rapide et compendiums de référence.
- Nouveau journal **S&S — Aide rapide** en plusieurs pages.
- Accès à l’aide rapide et aux outils de monde depuis la Bibliothèque.
- Nouvelles macros : Passerelle, Aide rapide, Installation des outils.
- Retouches générales de présentation et de cohérence visuelle.

## 1.0.0

- Première version stable regroupant navigation, combat naval, artillerie, réputation, flottes, vie à bord, divertissements, bibliothèque et assistant de navire.
