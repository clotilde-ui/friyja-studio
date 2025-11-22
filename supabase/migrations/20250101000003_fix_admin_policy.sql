-- Correction de la politique admin pour les feature_requests
-- Le problème : on ne peut pas accéder directement à auth.users dans les politiques RLS

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Seul l'admin peut modifier les suggestions" ON feature_requests;

-- Créer une fonction sécurisée pour vérifier si l'utilisateur est admin
-- Cette fonction peut accéder à auth.users car elle a SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur actuel depuis auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Vérifier si l'email correspond à l'admin
  RETURN COALESCE(user_email, '') = 'clotilde@deux.io';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer la politique avec la fonction
CREATE POLICY "Seul l'admin peut modifier les suggestions"
  ON feature_requests FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

