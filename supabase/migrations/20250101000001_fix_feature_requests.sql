-- Migration de correction : Ajouter la colonne upvotes_count si elle n'existe pas
DO $$ 
BEGIN
  -- Vérifier si la colonne existe, sinon l'ajouter
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'feature_requests' 
    AND column_name = 'upvotes_count'
  ) THEN
    ALTER TABLE feature_requests ADD COLUMN upvotes_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- S'assurer que la colonne a la bonne valeur par défaut
ALTER TABLE feature_requests ALTER COLUMN upvotes_count SET DEFAULT 0;

-- Mettre à jour les enregistrements existants qui pourraient avoir NULL
UPDATE feature_requests SET upvotes_count = 0 WHERE upvotes_count IS NULL;

-- S'assurer que la colonne n'accepte pas NULL
ALTER TABLE feature_requests ALTER COLUMN upvotes_count SET NOT NULL;
