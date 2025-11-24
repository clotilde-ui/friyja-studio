# Migration SQL - Feature Requests

## Instructions pour exécuter la migration

### Option 1 : Via l'interface Supabase (Recommandé)

1. **Connectez-vous à votre projet Supabase**
   - Allez sur [https://supabase.com](https://supabase.com)
   - Sélectionnez votre projet

2. **Ouvrez le SQL Editor**
   - Dans le menu de gauche, cliquez sur **"SQL Editor"**
   - Cliquez sur **"New query"**

3. **Copiez-collez le contenu du fichier de migration**
   - Ouvrez le fichier : `supabase/migrations/20250101000000_create_feature_requests.sql`
   - Copiez tout le contenu (Ctrl+C / Cmd+C)
   - Collez-le dans l'éditeur SQL de Supabase

4. **Exécutez la migration**
   - Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Enter / Cmd+Enter)
   - Vérifiez qu'il n'y a pas d'erreurs dans les résultats

5. **Vérifiez que les tables sont créées**
   - Allez dans **"Table Editor"** dans le menu de gauche
   - Vous devriez voir les tables `feature_requests` et `feature_request_votes`

### Option 2 : Via la CLI Supabase

Si vous avez la CLI Supabase installée :

```bash
# Assurez-vous d'être dans le répertoire du projet
cd /Users/clotildethomas/friyja-studio

# Connectez-vous à votre projet Supabase
supabase link --project-ref votre-project-ref

# Poussez les migrations
supabase db push
```

### Contenu de la migration

La migration crée :
- ✅ Table `feature_requests` avec les colonnes nécessaires
- ✅ Table `feature_request_votes` pour gérer les upvotes
- ✅ Index pour améliorer les performances
- ✅ Trigger pour mettre à jour automatiquement `updated_at`
- ✅ Politiques RLS (Row Level Security) pour la sécurité

### Après l'exécution

Une fois la migration exécutée :
1. Rafraîchissez votre application
2. La page "Suggestions" devrait fonctionner correctement
3. Vous pourrez créer des suggestions et voter

### En cas d'erreur

Si vous rencontrez une erreur lors de l'exécution :
- Vérifiez que vous êtes connecté au bon projet Supabase
- Assurez-vous que les extensions nécessaires sont activées
- Vérifiez les logs d'erreur dans Supabase




