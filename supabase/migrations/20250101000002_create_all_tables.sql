-- Migration complète : Création de toutes les tables nécessaires pour l'application

-- Table clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website_url TEXT,
  baseline TEXT,
  positioning_keywords TEXT[],
  primary_color TEXT,
  secondary_color TEXT,
  dark_color TEXT,
  light_color TEXT,
  brand_mood TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table analyses
CREATE TABLE IF NOT EXISTS analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  offer_details TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  brand_positioning TEXT NOT NULL,
  ad_platform TEXT NOT NULL DEFAULT 'Meta',
  raw_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table concepts
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  funnel_stage TEXT NOT NULL,
  concept TEXT NOT NULL,
  format TEXT NOT NULL,
  hooks TEXT[] NOT NULL,
  marketing_objective TEXT NOT NULL,
  scroll_stopper TEXT NOT NULL,
  problem TEXT NOT NULL,
  solution TEXT NOT NULL,
  benefits TEXT NOT NULL,
  proof TEXT NOT NULL,
  cta TEXT NOT NULL,
  suggested_visual TEXT NOT NULL,
  script_outline TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('video', 'static')),
  image_url TEXT,
  image_generated_at TIMESTAMP WITH TIME ZONE,
  generated_prompt TEXT,
  prompt_generated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  openai_api_key TEXT NOT NULL DEFAULT '',
  ideogram_api_key TEXT,
  google_api_key TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_client_id ON analyses(client_id);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concepts_analysis_id ON concepts(analysis_id);
CREATE INDEX IF NOT EXISTS idx_concepts_media_type ON concepts(media_type);
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Politiques pour clients
CREATE POLICY "Les utilisateurs authentifiés peuvent lire tous les clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les clients"
  ON clients FOR DELETE
  TO authenticated
  USING (true);

-- Politiques pour analyses
CREATE POLICY "Les utilisateurs authentifiés peuvent lire toutes les analyses"
  ON analyses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des analyses"
  ON analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres analyses"
  ON analyses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres analyses"
  ON analyses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour concepts
CREATE POLICY "Les utilisateurs authentifiés peuvent lire tous les concepts"
  ON concepts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent créer des concepts"
  ON concepts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier les concepts"
  ON concepts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer les concepts"
  ON concepts FOR DELETE
  TO authenticated
  USING (true);

-- Politiques pour settings
CREATE POLICY "Les utilisateurs peuvent lire leurs propres paramètres"
  ON settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres paramètres"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs propres paramètres"
  ON settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);


