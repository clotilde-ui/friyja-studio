# Guide complet pour créer un projet Supabase (pour débutants)

## Étape 1 : Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"Sign up"** en haut à droite
3. Créez un compte avec :
   - Votre email (ou connectez-vous avec GitHub si vous préférez)
   - Un mot de passe

## Étape 2 : Créer un nouveau projet

1. Une fois connecté, vous verrez un tableau de bord
2. Cliquez sur le bouton **"New Project"** (généralement en haut à droite ou au centre)
3. Remplissez le formulaire :
   - **Name** : Donnez un nom à votre projet (ex: "freyja-studio")
   - **Database Password** : Créez un mot de passe fort (⚠️ IMPORTANT : notez-le quelque part, vous en aurez besoin)
   - **Region** : Choisissez la région la plus proche de vous (ex: "West EU (Paris)" pour la France)
   - **Pricing Plan** : Choisissez "Free" pour commencer
4. Cliquez sur **"Create new project"**
5. ⏳ Attendez 2-3 minutes que Supabase crée votre projet (vous verrez une barre de progression)

## Étape 3 : Récupérer les clés d'API

Une fois le projet créé :

1. Dans le menu de gauche, cliquez sur **"Settings"** (l'icône d'engrenage ⚙️)
2. Cliquez sur **"API"** dans le sous-menu
3. Vous verrez deux informations importantes :
   - **Project URL** : C'est votre `VITE_SUPABASE_URL`
   - **anon public key** : C'est votre `VITE_SUPABASE_ANON_KEY`

## Étape 4 : Configurer les variables d'environnement

1. Dans votre projet local (friyja-studio), créez un fichier `.env` à la racine
2. Ouvrez ce fichier et ajoutez :

```
VITE_SUPABASE_URL=votre-project-url
VITE_SUPABASE_ANON_KEY=votre-anon-key
```

⚠️ Remplacez `votre-project-url` et `votre-anon-key` par les valeurs que vous avez copiées dans Supabase.

## Étape 5 : Créer les tables (Migration SQL)

1. Dans Supabase, cliquez sur **"SQL Editor"** dans le menu de gauche
2. Cliquez sur **"New query"** (ou le bouton "+")
3. Copiez-collez le SQL suivant (voir le fichier de migration)
4. Cliquez sur **"Run"** (ou appuyez sur Ctrl+Enter)
5. Vérifiez qu'il n'y a pas d'erreurs

## Étape 6 : Activer l'authentification

1. Dans Supabase, cliquez sur **"Authentication"** dans le menu de gauche
2. Cliquez sur **"Providers"**
3. Assurez-vous que **"Email"** est activé (il devrait l'être par défaut)
4. Vous pouvez désactiver "Confirm email" si vous voulez tester rapidement

## Étape 7 : Tester votre application

1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   ```
2. Ouvrez votre application dans le navigateur
3. Essayez de créer un compte avec votre email
4. Vous devriez pouvoir vous connecter !

## Aide supplémentaire

### Où trouver quoi dans Supabase :

- **Table Editor** : Pour voir et modifier vos données (comme un Excel)
- **SQL Editor** : Pour exécuter des requêtes SQL
- **Authentication** : Pour gérer les utilisateurs
- **Settings** : Pour les clés API et la configuration

### En cas de problème :

- Vérifiez que votre fichier `.env` existe et contient les bonnes valeurs
- Vérifiez que vous avez bien exécuté la migration SQL
- Redémarrez votre serveur après avoir modifié le `.env`




