# 🚀 Guide simple : Créer votre projet Supabase (pour débutants)

## 📋 Ce dont vous avez besoin
- Un compte email
- 5 minutes de votre temps

---

## ÉTAPE 1 : Créer un compte Supabase

1. Ouvrez votre navigateur et allez sur : **https://supabase.com**
2. Cliquez sur **"Start your project"** (en haut à droite)
3. Créez un compte :
   - Entrez votre email
   - Créez un mot de passe
   - Ou connectez-vous avec GitHub si vous préférez

---

## ÉTAPE 2 : Créer votre projet

1. Une fois connecté, vous verrez votre tableau de bord
2. Cliquez sur le gros bouton **"New Project"** (vert, au centre ou en haut)
3. Remplissez le formulaire :

   **Name** : 
   - Donnez un nom simple, ex: `freyja-studio` ou `mon-projet`

   **Database Password** :
   - ⚠️ **TRÈS IMPORTANT** : Créez un mot de passe fort
   - Notez-le dans un endroit sûr (vous en aurez besoin plus tard)
   - Exemple : `MonMotDePasse123!@#`

   **Region** :
   - Choisissez la région la plus proche (ex: "West EU (Paris)" pour la France)

   **Pricing Plan** :
   - Choisissez **"Free"** (gratuit pour commencer)

4. Cliquez sur **"Create new project"**
5. ⏳ **Attendez 2-3 minutes** (vous verrez une barre de progression)

---

## ÉTAPE 3 : Récupérer vos clés API

Une fois le projet créé (quand la barre de progression est terminée) :

1. Dans le menu de **gauche**, cliquez sur **"Settings"** (l'icône ⚙️)
2. Cliquez sur **"API"** dans le sous-menu
3. Vous verrez deux informations importantes :

   **Project URL** :
   - C'est une URL qui ressemble à : `https://xxxxxxxxxxxxx.supabase.co`
   - 👆 **Copiez cette URL**

   **anon public key** :
   - C'est une longue chaîne de caractères
   - 👆 **Copiez cette clé aussi**

---

## ÉTAPE 4 : Configurer votre projet local

1. Dans votre projet `friyja-studio`, créez un fichier nommé `.env` à la racine
   - Si vous utilisez VS Code : Clic droit → New File → `.env`
   - Si vous utilisez un autre éditeur : Créez simplement un nouveau fichier nommé `.env`

2. Ouvrez le fichier `.env` et collez ceci :

```
VITE_SUPABASE_URL=votre-project-url-ici
VITE_SUPABASE_ANON_KEY=votre-clé-anon-ici
```

3. **Remplacez** :
   - `votre-project-url-ici` par l'URL que vous avez copiée (celle qui finit par `.supabase.co`)
   - `votre-clé-anon-ici` par la clé que vous avez copiée

**Exemple** :
```
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.exemple
```

---

## ÉTAPE 5 : Créer les tables dans Supabase

1. Dans Supabase, cliquez sur **"SQL Editor"** dans le menu de gauche
2. Cliquez sur **"New query"** (ou le bouton "+" en haut)
3. **Copiez-collez** tout le SQL ci-dessous :

```sql
-- Création de la table feature_requests
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la table feature_request_votes
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_user_id ON feature_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_requests_upvotes ON feature_requests(upvotes_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_feature_id ON feature_request_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user_id ON feature_request_votes(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;

-- Politique : Tous les utilisateurs authentifiés peuvent lire les suggestions
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les suggestions"
  ON feature_requests FOR SELECT
  TO authenticated
  USING (true);

-- Politique : Tous les utilisateurs authentifiés peuvent créer des suggestions
CREATE POLICY "Les utilisateurs authentifiés peuvent créer des suggestions"
  ON feature_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique : Seul l'admin (clotilde@deux.io) peut modifier les suggestions
CREATE POLICY "Seul l'admin peut modifier les suggestions"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clotilde@deux.io'
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'clotilde@deux.io'
  );

-- Politique : Tous les utilisateurs authentifiés peuvent lire les votes
CREATE POLICY "Les utilisateurs authentifiés peuvent lire les votes"
  ON feature_request_votes FOR SELECT
  TO authenticated
  USING (true);

-- Politique : Les utilisateurs peuvent créer leurs propres votes
CREATE POLICY "Les utilisateurs peuvent créer leurs propres votes"
  ON feature_request_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Politique : Les utilisateurs peuvent supprimer leurs propres votes
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres votes"
  ON feature_request_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
```

4. Cliquez sur le bouton **"Run"** (ou appuyez sur **Ctrl+Enter** / **Cmd+Enter**)
5. ✅ Vous devriez voir "Success" en bas

---

## ÉTAPE 6 : Vérifier que tout fonctionne

1. **Redémarrez votre serveur** :
   - Arrêtez-le (Ctrl+C dans le terminal)
   - Relancez : `npm run dev`

2. **Ouvrez votre application** dans le navigateur (http://localhost:5173)

3. **Testez** :
   - Cliquez sur "Créer un compte"
   - Entrez votre email et un mot de passe
   - Connectez-vous
   - Allez dans "Suggestions"
   - Essayez de créer une suggestion

---

## 🆘 En cas de problème

### "Je ne trouve pas Settings"
- Le menu est à gauche, cherchez l'icône ⚙️ (engrenage)

### "Je ne vois pas SQL Editor"
- C'est dans le menu de gauche, cherchez l'icône avec des lignes de code `</>`

### "Mon application ne se connecte pas"
- Vérifiez que votre fichier `.env` existe bien à la racine du projet
- Vérifiez que vous avez bien copié les bonnes valeurs (sans espaces)
- Redémarrez votre serveur après avoir modifié `.env`

### "Erreur lors de la création de la suggestion"
- Vérifiez que vous avez bien exécuté le SQL dans l'étape 5
- Allez dans "Table Editor" dans Supabase pour voir si les tables existent

---

## 📸 À quoi ça ressemble dans Supabase

Quand vous êtes connecté, vous verrez :
- **Table Editor** : Pour voir vos données (comme un Excel)
- **SQL Editor** : Pour exécuter du code SQL
- **Authentication** : Pour gérer les utilisateurs
- **Settings** : Pour les clés API

---

## ✅ Checklist finale

- [ ] Compte Supabase créé
- [ ] Projet Supabase créé
- [ ] Clés API copiées
- [ ] Fichier `.env` créé avec les bonnes valeurs
- [ ] SQL exécuté dans SQL Editor
- [ ] Serveur redémarré
- [ ] Application testée

Si tout est coché, vous êtes prêt ! 🎉




