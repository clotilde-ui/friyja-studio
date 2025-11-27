# 🔍 Débogage de l'analyse de site web

## Problèmes possibles et solutions

### 1. La fonction Edge Function n'est pas déployée

**Symptôme** : Erreur 404 ou "Function not found"

**Solution** : Déployer la fonction dans Supabase

1. Allez dans Supabase → **Edge Functions**
2. Cliquez sur **"Deploy a new function"** ou **"New function"**
3. Nommez-la `scrape-website`
4. Copiez le contenu du fichier `supabase/functions/scrape-website/index.ts`
5. Collez-le dans l'éditeur
6. Cliquez sur **"Deploy"**

### 2. La clé API OpenAI n'est pas configurée

**Symptôme** : Erreur "OpenAI API key not configured"

**Solution** : Configurer votre clé API OpenAI

1. Allez dans votre application → **Paramètres**
2. Entrez votre clé API OpenAI
3. Sauvegardez
4. Réessayez l'analyse

### 3. Problème CORS

**Symptôme** : Erreur CORS dans la console

**Solution** : Vérifier que les headers CORS sont corrects dans la fonction Edge Function

### 4. URL mal formatée

**Symptôme** : Erreur de connexion

**Solution** : Le code normalise maintenant automatiquement l'URL (ajoute https:// si manquant)

### 5. Vérifier les logs

1. Allez dans Supabase → **Edge Functions** → **Logs**
2. Regardez les erreurs récentes
3. Cela vous donnera plus d'informations sur le problème

## Test rapide

Pour tester si la fonction est accessible :

1. Ouvrez la console du navigateur (F12)
2. Regardez l'erreur exacte affichée
3. Vérifiez dans Supabase → Edge Functions si la fonction existe

## Messages d'erreur améliorés

Le code a été mis à jour pour afficher des messages d'erreur plus détaillés. 
Lorsque vous essayez d'analyser un site, vous verrez maintenant le message d'erreur exact.





