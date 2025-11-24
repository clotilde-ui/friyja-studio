/*
  # Add Higgsfield (Nano Banana) API Keys to Settings
*/

DO $$
BEGIN
  -- Ajout de la clé API
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'higgsfield_api_key'
  ) THEN
    ALTER TABLE settings ADD COLUMN higgsfield_api_key text;
  END IF;

  -- Ajout du Secret
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'higgsfield_secret'
  ) THEN
    ALTER TABLE settings ADD COLUMN higgsfield_secret text;
  END IF;
END $$;
