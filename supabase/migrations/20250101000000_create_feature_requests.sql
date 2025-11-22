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

