# 1.22.2 — Auteurs du module

- Ajout de **Caelvanost** aux auteurs du module aux côtés de **Gélik**.

# 1.22.1 — Métadonnées du module

- Auteur du module changé en **Gélik** dans le manifeste Foundry.

# 1.22.0 — Rotation libre des navires

- Réactivation des secteurs visuels **Proue / Poupe / Bâbord / Tribord** autour des tokens de navire.
- Les secteurs suivent désormais directement la rotation réelle du token au lieu du seul cap logique N/E/S/O.
- Le calcul de l’axe visuel utilise `token.document.rotation - rotationOffset`, afin de respecter les illustrations dont la proue n’est pas orientée vers le haut à 0°.
- Les **cases atteignables** suivent maintenant elles aussi l’orientation libre du token.
- Les boutons de déplacement naval utilisent l’axe réel du token et peuvent donc déplacer le navire selon un angle intermédiaire.
- L’encombrement mécanique Foundry du token n’est pas redimensionné ni pivoté : il reste volontairement approximatif.
- Le décalage graphique du token peut maintenant être réglé au degré près.
- Le cap logique N/E/S/O est conservé pour les règles existantes de vent et les automatismes qui en dépendent ; la rotation libre est utilisée pour le rendu et les déplacements visuels.

# 1.22.0 — Rotation libre des secteurs navals

- Réactivation des zones visuelles **Proue / Poupe / Bâbord / Tribord** autour des tokens de navire.
- Les secteurs sont désormais dessinés dans un conteneur PIXI centré sur le token et tournent avec la **rotation réelle du token**.
- Le champ **Décalage graphique du token** corrige l’axe d’une texture dont la proue n’est pas orientée vers le haut à 0°.
- Les rotations intermédiaires sont prises en charge : 15°, 37°, 45°, 128°, etc.
- Le hook Foundry `updateToken` redessine automatiquement l’overlay après une rotation manuelle.
- L’encombrement mécanique du token reste volontairement **approximatif** et n’est pas redimensionné lors de la rotation.
- Les calculs internes de navigation, de mouvement et de manœuvres restent basés sur le cap logique existant ; cette version ne remplace pas encore la géométrie mécanique par une coque orientée.
- Restauration du bouton **Secteurs** dans la Carte navale et de la légende colorée correspondante.

# 1.21.1 — Correctif zones de token

- Suppression temporaire de l’overlay visuel **Proue / Poupe / Bâbord / Tribord** autour des tokens de navire.
- Suppression du bouton **Secteurs** dans la Carte navale.
- Les calculs internes de proue, poupe et bordées restent inchangés pour les manœuvres et la logique navale.
- Les zones visuelles seront réintroduites plus tard lorsqu’elles pourront suivre correctement la rotation réelle du token.

# 1.21.0 — Cycle journalier & journal de bord

- Nouveau contrôleur **Cycle journalier** accessible depuis la Passerelle et par macro.
- Six phases de journée : **Aube & affectations**, **Travail de jour**, **Heure du sang**, **Soirée & détente**, **Actions nocturnes**, **Repos & relève**.
- Vue consolidée de l’avancement des personnages suivis dans **Vie à bord** : Tâche / Jour / Nuit / Rhum.
- Détection et synchronisation des compteurs de jour entre **Vie à bord**, **Quarts & fatigue** et le nouveau cycle.
- Journal de bord persistant avec notes libres, historique des changements de phase et résumé publiable dans le chat.
- La clôture normale d’une journée avertit et bloque si des éléments PJ restent non résolus ; le MJ dispose d’une clôture forcée explicite.
- La clôture reprend la logique existante de **Nouvelle journée** de Vie à bord : remise à zéro des actions, report de fatigue nocturne et jet quotidien de Kroop.
- Le cycle journalier ne fait pas avancer un calendrier externe et n’ajoute aucun bonus/malus PF1 supplémentaire.
- Nouvelle macro **S&S — Cycle journalier**, nouvelle page de l’Aide rapide et intégration à la Passerelle.

# 1.20.0 — Quarts, relève et fatigue

- Nouveau contrôleur **Quarts & fatigue** pour organiser les groupes de relève et suivre une disponibilité abstraite de l’équipage.
- Le quart actif et la rotation sont déduits des affectations du Registre d’équipage ; la rotation peut être avancée ou reculée sans imposer un modèle historique unique.
- Ajout de quatre niveaux de fatigue générale : Reposé, Fatigué, Épuisé et Hors service.
- La fatigue générale applique automatiquement un modificateur de **0 / −1 / −2 / −4** au sous-système maison de combat d’équipage d’Abordage.
- Suivi individuel de fatigue des personnages nommés ; cette fatigue modifie aussi leur jet maison de survie lorsqu’ils sont exposés pendant un abordage.
- Action **Branle-bas de combat** : fatigue générale +1 et +1 aux personnages nommés rappelés alors qu’ils n’étaient pas de quart.
- Action **Cycle de repos** : fatigue générale −1 et récupération d’un niveau pour les personnages hors quart.
- Import non destructif de la fatigue déjà signalée par **Vie à bord**.
- Les affectations de quart et fonctions libres restent stockées dans le Registre d’équipage ; le nouveau contrôleur ne duplique pas ces données.
- Historique des relèves et ajustements, résumé publiable dans le chat, accès depuis la Passerelle et le Registre, macro dédiée et page d’Aide rapide.
- Cette mécanique est explicitement marquée comme **règle maison** et ne pose aucune condition PF1 ni aucun malus de navigation officiel automatiquement.

# 1.19.0 — Registre d’équipage consolidé

- Nouveau contrôleur **Registre d’équipage** réunissant dans une vue unique les personnages suivis par Vie à bord, Abordage, Relations et les postes d’officiers.
- Agrégation non destructive : aucune donnée n’est déplacée ni dupliquée entre les anciens sous-systèmes.
- Résumé par personnage : rôle quotidien, poste d’officier, attitude, PJ lié, camp de mutinerie, état de santé, blessure permanente et provenance du suivi.
- Ajout manuel de personnages notables avec fonction libre, quart, marque Important et notes.
- Synchronisation rapide vers **Relations d’équipage** et vers les **PNJ nommés d’Abordage**, avec protection contre les doublons.
- Retirer une entrée manuelle ne supprime pas les données d’un personnage encore utilisé par un autre sous-système.
- Publication d’un résumé du registre dans le chat.
- Nouvelle macro **S&S — Registre d’équipage**, intégration à la Passerelle et nouvelle page de l’Aide rapide.
- Mise en page responsive avec tableau horizontal scrollable sur petits écrans.

# 1.18.0 — Relations d’équipage et camps de mutinerie

- Nouveau contrôleur **Relations d’équipage** pour suivre les PNJ nommés auxquels les PJ se lient.
- Suivi persistant des cinq attitudes utilisées par la campagne : Hostile, Inamical, Indifférent, Amical et Serviable.
- Ajout d’un **lien privilégié** facultatif avec un PJ, purement narratif, afin d’identifier rapidement les matelots importants pour chaque personnage.
- Prévision automatique des camps lors d’une mutinerie : amicaux/serviables avec les PJ, indifférents neutres, inamicaux/hostiles dans l’opposition, avec surcharge manuelle pour les exceptions de scénario.
- Publication des camps de mutinerie dans le chat et affichage d’un résumé directement dans **Équipage & cohésion**.
- Le test maison de mutinerie rappelle désormais le nombre de PNJ suivis dans chaque camp sans modifier automatiquement l’issue de la rencontre PF1.
- Intégration à **Vie à bord** : l’attitude suivie du PNJ ciblé est affichée pendant une tentative d’Influence.
- Un PNJ actuellement **Serviable** peut être sélectionné comme aide à une tentative d’Influence et fournit le **+2 officiel** prévu par la campagne.
- Le rappel d’« aide d’un PNJ amical » sur les tâches précise désormais que le PNJ doit posséder des rangs dans la compétence appropriée.
- Import rapide des PNJ nommés déjà suivis dans l’assistant **Abordage**.
- Historique des changements rapides d’attitude, macro dédiée, accès depuis la Passerelle, Vie à bord et Équipage & cohésion.

# 1.17.0 — Progression d’équipage, cohésion et mutinerie

- Nouveau contrôleur **Équipage & cohésion** accessible depuis la Passerelle et par macro.
- Ajout d’une progression maison de l’équipage avec expérience et seuils de qualité : Recrues 0, Aguerris 3, Vétérans 8, Élite 15, Exceptionnels 24.
- La qualité de combat d’équipage augmente automatiquement lorsqu’un seuil supérieur est atteint, sans rétrogradation automatique.
- Ajout de **Loyauté** (−5 à +5) et **Agitation** (0 à 10), avec ajustements libres du MJ et historique des événements.
- Action rapide de victoire significative (+1 XP, +1 loyauté) et entraînement quotidien par le maître d’armes ou le bosco (DD 15, +1 XP ; +2 XP à 25+).
- Nouveau **test de risque de mutinerie** utilisant le commandement du capitaine, le moral, la loyauté, l’agitation et le soutien du bosco/quartier-maître.
- États Calme / Tensions / Mutinerie menaçante / Mutinerie ouverte ; le module ne simule pas le combat de mutinerie, qui reste une scène PF1/narrative.
- Intégration aux profils d’abordage existants : qualité, moral et officiers sont partagés entre les deux outils.
- Nouvelle page d’Aide rapide et nouvelle macro **S&S — Équipage & cohésion**.
- Ergonomie responsive du nouveau contrôleur et nettoyage d’un doublon mineur dans la détection du MJ actif.

# 1.15.0

- Nouvelle phase **Suites immédiates** après la résolution du vainqueur principal d’un abordage.
- Gestion explicite de la **reddition**, du **repli** ou de la **fuite / dispersion** du camp vaincu.
- La reddition crée un vivier de survivants ordinaires aptes et blessés sans convertir automatiquement les PNJ nommés.
- Les survivants aptes peuvent être **enrôlés directement pour remplacer les pertes permanentes** du vainqueur, dans la limite des pertes et de l’effectif maximal du Vehicle.
- Transfert direct des prisonniers ordinaires vers **Piraterie & Prises → Prisonniers & rançons**.
- Les PNJ nommés du camp vaincu peuvent être marqués individuellement comme capturés ; leurs niveaux de classe sont ajoutés au calcul des rançons importantes.
- Possibilité de **libérer le reste des survivants** sans créer de prisonniers ou de recrues supplémentaires.
- Bouton pour ouvrir directement **Piraterie & Prises** sur le navire vainqueur.
- Les choix de reddition/prisonniers restent des décisions de MJ et sont séparés de la règle officielle qui fait dépendre l’issue de la mêlée d’équipage du combat principal.

# 1.14.0

- Nouvelle phase **Après-abordage** dans l'assistant d'abordage.
- Triage du charpentier/chirurgien : Premiers secours / Heal DD 15, Sagesse en repli.
- Stabilisation des blessés graves et bonus médical de +2 à +4 pour la prochaine journée de récupération.
- Récupération journalière abstraite : blessés légers DD 10, blessés graves DD 15 ; les marins remis reprennent automatiquement leur place dans `system.crew.value`.
- Récupération progressive des PNJ nommés sans supprimer leurs blessures permanentes.
- Synchronisation des morts + disparus/capturés vers **Piraterie & Prises → Pertes à remplacer**.
- Historique de triage/récupération conservé dans les flags d'abordage.
- Documentation et Aide rapide mises à jour ; ces mécaniques sont identifiées comme sous-système maison optionnel.

# 1.13.0

- Extension majeure de l’assistant **Abordage** avec un sous-système maison de combat d’équipage, tout en conservant le combat PF1 normal pour les PJ et PNJ importants.
- Qualité et moral d’équipage, rapport de forces, commandement, maître d’armes et événements de bataille intégrés aux jets opposés de phase.
- Degrés de résultat et pertes automatiques : blessés légers, blessés graves, morts, disparus/capturés.
- Les pertes réduisent automatiquement `system.crew.value` du Vehicle, ce qui les raccorde aux règles navales déjà présentes.
- Gestion de six postes d’officiers avec Actors PF1 ; commandement DD 15 et bonus du maître d’armes selon le BBA.
- Suivi des PNJ nommés, exposition/protection, import depuis **Vie à bord**, jets de survie basés sur niveau et Constitution.
- Blessures graves reliées à la table optionnelle « Jambe de bois et cache-œil ».
- Cartes de chat détaillées pour les phases d’équipage, les pertes et les conséquences sur les PNJ nommés.
- Mise à jour de l’Aide rapide et de la documentation.

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

## 1.16.0 — Interface & multijoueur

- Grosse passe du HUD de campagne : modes **Minimal / Compact / Confortable**, états client persistants, position conservée et ancrage automatique sur petits écrans.
- Ajout d'états visuels **Prêt / En attente / Envoyé** pour les jeux de pirates et les actions de Vie à bord.
- Ajout d'un indicateur de connexion au MJ et d'un bouton de resynchronisation manuelle dans le HUD.
- Remplacement des confirmations réseau répétitives par des **notifications discrètes** configurables.
- Ajout d'identifiants uniques de requête, d'accusés de réception, de verrous locaux et serveur et de contrôles d'état pour limiter les **doubles soumissions** et doubles jets.
- Renforcement des permissions côté MJ : personnage obligatoirement contrôlé par l'utilisateur, navire S&S valide, inscription et phase de jeu vérifiées avant mutation.
- Ajout d'un **historique d'audit multijoueur** par navire pour les inscriptions, choix, actions et jets validés.
- Le MJ peut **annuler/corriger** la dernière action active d'un sous-système ; l'état précédent est restauré et le joueur peut alors refaire son choix ou son jet.
- Ajout de resynchronisations lors d'une reconnexion, du retour sur l'onglet, du retour réseau et des changements de scène.
- Le personnage sélectionné et les sections ouvertes/repliées du HUD sont conservés côté client.
- Ergonomie améliorée sur petits écrans : HUD bord-à-bord, contenu scrollable, grille simplifiée et historique responsive.
