# Koze — État du projet

Mis à jour le 11 octobre 2026.

## Résumé

Koze est une application mobile Android de support client, construite sur Chatwoot et reliée à un seul serveur Koze. Une première version (APK) a été compilée et installée ; une deuxième, avec l'inscription en libre-service, est prête à installer.

L'application sait déjà gérer les conversations d'une entreprise. Pour fonctionner comme un vrai SaaS, il manque surtout l'envoi d'e-mails (SMTP), un serveur hébergé en permanence et les notifications push.

## Ce qui a été fait

| Date | Travail | Détail |
| --- | --- | --- |
| 11 oct. | Français par défaut | L'application s'ouvre en français (≈ 175 textes traduits en plus) ; un utilisateur qui a déjà choisi une langue la garde |
| 11 oct. | Photo de profil | Chaque agent et administrateur choisit, prend ou supprime sa photo dans les Réglages ; photo réduite à 512 px avant l'envoi |
| 11 oct. | Catalogue de produits | Les administrateurs créent les produits (nom, prix, devise, description, stock, photo) ; chaque téléphone garde sa copie et ne télécharge une photo qu'une fois ; les agents envoient un produit depuis le menu « + » d'une conversation |
| 30 sept. | Codes de réinitialisation | Le propriétaire ne choisit plus les mots de passe : il obtient un code à usage unique, la personne choisit son mot de passe depuis l'écran de connexion ; ajout d'administrateurs ; « Mes informations » pour chacun (téléphone modifiable, nom, sexe et e-mail gérés par le propriétaire) |
| 30 sept. | Gestion de l'équipe | Pause d'un agent, horaires de travail, coordonnées et mot de passe modifiables par le propriétaire, pastille verte « en ligne » en temps réel, limites de 3 agents et 2 administrateurs |
| 30 sept. | Réglages | Boîtes de réception et Rapports dans Réglages > Administration ; « Changer mon mot de passe » pour tous ; « Statut » traduit |
| 29 sept. | Nouvelle navigation | 4 onglets (Conversations, Boîtes, Rapports pour les administrateurs, Réglages) ; notifications derrière une cloche ; en-tête compact avec le logo |
| 29 sept. | Paiement MonCash (simulé) | 1 500 HTG par boîte et par mois ; numéro MonCash demandé à l'inscription ; le serveur refuse une boîte non payée |
| 29 sept. | Nouvelle conversation WhatsApp | Bouton « + » flottant : numéro du client et modèle WhatsApp approuvé |
| 29 sept. | Rapports | Conversations ouvertes, activité sur 7 ou 30 jours, temps de réponse |
| 28 sept. | Nouvelle identité visuelle | Couleurs Koze, cartes, champs et états vides aux couleurs de Koze |
| 27 sept. | Administration dans l'application | Le propriétaire ajoute ses agents (mot de passe temporaire), crée ses boîtes Telegram et WhatsApp et choisit qui y répond ; invisible pour les agents |
| 27 sept. | Confirmation automatique | En attendant SMTP, les nouveaux comptes sont confirmés automatiquement |
| 27 sept. | Inscription en libre-service | Écran « Créer un compte » (nom complet, entreprise, e-mail, mot de passe) ; crée l'utilisateur et le compte de l'entreprise, puis connecte automatiquement |
| 27 sept. | Correctif serveur | Le serveur renommait l'entreprise d'après le site du domaine e-mail (ex. « Gmail ») ; le nom saisi est maintenant conservé |
| 27 sept. | Messages d'erreur clairs | L'inscription affiche le vrai message du serveur (e-mail déjà utilisé, mot de passe trop faible) |
| 26 sept. | Premier APK | Compilé dans le cloud avec EAS (Expo), installé sur un téléphone |
| 26 sept. | Démarrage sans Firebase | L'application ne plante plus au lancement quand Firebase n'est pas configuré |
| 25 sept. | Logo et icônes | Logo Koze sur la page de connexion, l'écran de démarrage et l'icône de l'application |
| 25 sept. | Lien profond `kozeapp://` | Remplace `chatwootapp://` pour ne pas entrer en conflit avec l'application Chatwoot |
| 25 sept. | Sauvegarde | Configuration du serveur (sans mots de passe) et script des icônes ajoutés au dépôt |
| 24 sept. | Rebranding | Nom « Koze », identifiant `com.koze.app`, textes traduits sans « Chatwoot » |
| 24 sept. | Serveur verrouillé | L'application se connecte toujours au serveur Koze ; l'écran de saisie de l'URL a été retiré |

## Ce que l'application peut faire

L'inscription a été testée contre le vrai serveur. Les autres fonctions viennent de l'application Chatwoot et n'ont pas encore été vérifiées sur téléphone.

| Domaine | Fonctions | Testé |
| --- | --- | --- |
| Compte | Créer un compte et son entreprise, connexion automatique, connexion par e-mail et mot de passe, mot de passe oublié | Inscription : oui, via le serveur |
| Conversations | Liste filtrée (mes conversations, non assignées, toutes), recherche, statut (résolue, en attente, reportée), priorité | Non |
| Réponses | Messages, notes privées, pièces jointes (photos, fichiers), messages vocaux, réponses prédéfinies, macros | Non |
| Organisation | Assigner à un agent ou une équipe, étiquettes, attributs personnalisés | Non |
| Contacts | Fiche contact, historique de ses conversations | Non |
| Temps réel | Nouveaux messages et indicateur « en train d'écrire » par WebSocket | Non |
| Compte utilisateur | Statut de disponibilité, changement de langue, plusieurs comptes d'entreprise | Non |
| Administration (propriétaire seulement) | Ajouter un agent avec un mot de passe temporaire, retirer un agent, créer une boîte Telegram ou WhatsApp, choisir les agents de chaque boîte | Serveur : oui ; téléphone : non |

Un nouvel inscrit devient administrateur et propriétaire de son entreprise. Lui seul voit la section « Administration » dans les Réglages ; les personnes qu'il ajoute ne la voient pas.

## Ce qu'elle ne peut pas encore faire

En attendant SMTP, les nouveaux comptes sont confirmés automatiquement : un inscrit peut se reconnecter, mais l'adresse e-mail n'est pas vérifiée.

| Limite | Conséquence | Solution |
| --- | --- | --- |
| Pas de SMTP | Pas d'e-mail de réinitialisation du mot de passe ni d'invitation ; e-mails non vérifiés (confirmation automatique temporaire) | Configurer Brevo ; la confirmation automatique s'arrête d'elle-même |
| Serveur sur un PC via ngrok | L'application ne marche que si le PC, Docker et ngrok sont allumés ; connexion instable | Héberger le serveur (VPS) avec un nom de domaine |
| Pas de Firebase | Aucune notification push | Créer l'app Android `com.koze.app` dans Firebase et fournir `google-services.json` |
| Android seulement | Aucune version iPhone | Compte Apple Developer (99 $/an) et build iOS |
| Pas sur le Play Store | Installation manuelle de l'APK (« sources inconnues ») | Compte Google Play (25 $), build `production` (.aab) |
| Configuration limitée dans l'application | Site web, e-mail, Facebook et Instagram, équipes, étiquettes et réponses prédéfinies se configurent uniquement sur le site web | Ajouter d'autres écrans selon les besoins |
| MonCash simulé | Le paiement de 1 500 HTG par boîte est simulé : aucun argent n'est prélevé | Compte marchand MonCash Business et ses clés API |
| Pas de renouvellement | Une boîte payée n'est pas bloquée après 30 jours | Renouvellement mensuel à développer |
| Inscription ouverte | N'importe qui peut créer un compte ; pas de captcha | Ajouter hCaptcha ou une validation manuelle |

La machine de développement a environ 5 Go d'espace libre et peu de RAM : les builds se font dans le cloud Expo.

## Infrastructure, comptes et fichiers

```
Téléphone (APK Koze) ⇄ ngrok (tint-moody-venture.ngrok-free.dev) ⇄ PC Windows / Docker
                                                                    ├─ Rails (API, port 3000)
                                                                    ├─ Sidekiq (tâches de fond) ──> SMTP, Firebase : à configurer
                                                                    ├─ PostgreSQL (données)
                                                                    └─ Redis (cache, temps réel)
Expo EAS compile l'APK dans le cloud.
```

| Élément | Où | À savoir |
| --- | --- | --- |
| Code de l'application | [GitHub keboguerlilos04-bit/Koze](https://github.com/keboguerlilos04-bit/Koze), branche `main` | Contient aussi `server/` (Docker, sans mots de passe) |
| Projet Expo | `@keboguerlilos04s-team/koze` sur expo.dev | Connexion par navigateur (compte GitHub) |
| Clé de signature Android | Stockée par Expo | Ne pas la supprimer : elle permet de publier les mises à jour |
| Mots de passe du serveur | `chatwoot-local/.env` sur le PC | Jamais sur GitHub ; à sauvegarder ailleurs |
| Correctif serveur | `server/koze_overrides.rb`, monté dans Docker | Garde le nom d'entreprise saisi à l'inscription |
| Logo | `src/assets/logo.svg` | `scripts/generate-icons.js` régénère icônes et écran de démarrage |
| Tunnel | `ngrok http --url=tint-moody-venture.ngrok-free.dev 3000` | À lancer dans une fenêtre qui reste ouverte |

## Prochaines étapes

1. **Configurer SMTP avec Brevo** (reporté ; confirmation automatique en attendant).
2. **Installer le nouvel APK** et tester : inscription, déconnexion, reconnexion, messages.
3. **Créer une boîte de réception de test** (widget de site web).
4. **Redémarrer le serveur** (`docker compose up -d --force-recreate rails sidekiq`) pour activer le catalogue, puis tester photo de profil et catalogue sur téléphone.
5. **Configurer Firebase** pour les notifications push.
6. **Héberger le serveur** sur un VPS avec un nom de domaine.
7. **Publier sur le Play Store**, puis envisager iOS et un système d'abonnement.
