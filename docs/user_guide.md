# Guide Utilisateur du Plugin Matomo Funnels

Ce guide vous aide à comprendre et utiliser le plugin Funnels pour Matomo.

## 1. Vue d'ensemble

Le plugin **Funnels** vous permet de visualiser les parcours des visiteurs sur votre site web, d'identifier les étapes d'abandon (drop-offs) et d'optimiser vos taux de conversion.

## 2. Configuration des Entonnoirs

Pour créer ou gérer un entonnoir :
1. Allez dans `Administration` > `Funnels` > `Manage Funnels`.
2. Cliquez sur `Add New Funnel` ou `Edit` un entonnoir existant.

### Options Générales du Funnel

*   **Nom du Funnel :** Un nom descriptif pour votre entonnoir.
*   **Actif :** Indique si l'entonnoir est en cours de suivi et d'archivage.
*   **Lien vers un Objectif (Optionnel) :** Associez cet entonnoir à un objectif Matomo existant. Si un objectif est lié, seules les visites ayant converti cet objectif seront incluses dans les rapports de l'entonnoir. (Assurez-vous que "Funnel tracking" est activé dans les paramètres de l'objectif).
*   **Mode Strict :** Si activé, un visiteur doit suivre *exactement* le chemin défini par les étapes. Aucune autre page ne doit être visitée entre deux étapes pour que la progression soit comptabilisée.
*   **Limite de Temps entre les Étapes (secondes) :** Définissez un délai maximum pour qu'un visiteur passe d'une étape à la suivante. Si le temps est dépassé, la progression est interrompue. Définissez à 0 pour aucune limite.

### Configuration des Étapes

Chaque entonnoir se compose d'une séquence d'étapes. Chaque étape peut avoir une ou plusieurs conditions (logique "OU"). Si plusieurs conditions sont définies pour une étape, n'importe laquelle de ces conditions suffit pour que l'étape soit considérée comme atteinte.

Pour chaque condition d'étape :
*   **Nom :** Un libellé descriptif (ex: "Page Panier").
*   **Logique (Comparison) :** Le type de donnée à analyser (URL, Chemin URL, Titre de Page, Catégorie/Action/Nom d'Événement, Terme de Recherche).
    *   `URL` : L'URL complète (incluant les paramètres de requête).
    *   `URL Path` : Seulement le chemin de l'URL (ex: `/checkout/step1`), ignorant le domaine et les paramètres.
    *   `Page Title` : Le titre de la page tel qu'il apparaît dans le navigateur.
    *   `Event Category`, `Event Action`, `Event Name` : Les valeurs de l'événement Matomo.
    *   `Search Query` : Le terme de recherche interne si Matomo Search est configuré.
*   **Opérateur :** Comment la `Logique` est comparée au `Pattern`.
    *   `Equals` / `Does not equal` : Correspondance exacte / Non-correspondance.
    *   `Contains` / `Does not contain` : Contient / Ne contient pas la chaîne.
    *   `Starts with` / `Does not start with` : Commence par / Ne commence pas par la chaîne.
    *   `Ends with` / `Does not end with` : Termine par / Ne termine pas par la chaîne.
    *   `Matches Regex` : Utilise une expression régulière PHP (PCRE).
*   **Pattern :** La valeur à comparer (ex: `/checkout`, `click-cta`).
*   **Case Sensitive :** Si coché, la comparaison distingue les majuscules des minuscules.
*   **Ignore Query Parameters :** (Uniquement pour `URL` Logic) Si coché, les paramètres de requête (ex: `?source=xyz`) sont ignorés lors de la comparaison.

#### Étapes Requises

Cochez `Required Step` si un visiteur *doit* passer par cette étape pour que le funnel soit valide. Si une étape requise est manquée, la progression du funnel est interrompue pour cette visite.

### Valider les Étapes

Utilisez la section "Validate Steps" en bas de l'éditeur pour tester manuellement si une URL ou une valeur correspond à vos étapes configurées. Cela vous aide à affiner vos patterns.

## 3. Rapports d'Entonnoir

Une fois configurés et traités par l'archivage Matomo (qui s'exécute généralement toutes les heures), les rapports sont accessibles via `Rapports` > `Funnels`.

### Vue d'ensemble des entonnoirs

Affiche une carte récapitulative pour chaque entonnoir actif, avec le taux de conversion et le nombre total de conversions.

### Rapport d'entonnoir détaillé

Affiche la visualisation du flux et un tableau détaillé :

*   **Step :** Le nom de l'étape.
*   **Entries :** Nombre de visites entrant ou passant par cette étape.
*   **Visits :** Nombre de visites ayant touché cette étape.
*   **Proceeded :** Nombre de visites ayant avancé à l'étape suivante.
*   **Drop-off :** Nombre de visites ayant quitté l'entonnoir après cette étape.
*   **Avg. Time to Next Step :** Temps moyen passé entre le moment où l'étape est atteinte et le moment où la suivante est atteinte.
*   **Top Drop-off URLs :** Les 5 principales URLs où les visiteurs sont allés juste après avoir abandonné le funnel à cette étape.

## 4. Intégration

*   **Segments :** Deux nouveaux segments sont disponibles :
    *   `Visit participated in funnel` : Pour filtrer toutes les visites ayant touché une étape de n'importe quel entonnoir.
    *   `Visit participated in funnel at step position` : Pour filtrer les visites ayant touché une étape spécifique (ex: `funnel_participated_step==2`).
*   **API de Reporting :** Toutes les données sont accessibles via l'API de reporting HTTP de Matomo.
*   **Alertes Personnalisées :** Vous pouvez configurer des alertes pour surveiller les métriques de l'entonnoir (taux de conversion, nombre de conversions).

## 5. Dépannage

Si vos rapports ne s'affichent pas ou semblent incorrects :
*   Vérifiez que l'entonnoir est `Actif`.
*   Assurez-vous que l'archivage Matomo s'exécute correctement (via cron).
*   Utilisez l'outil `Validate Steps` pour vérifier la correspondance de vos patterns.
*   Si vous avez modifié un entonnoir, les rapports passés peuvent être invalidés et devront être ré-archivés. Vous pouvez utiliser la commande CLI : `./console funnels:rearchive --idsite=X --idfunnel=Y` pour forcer le recalcul.
