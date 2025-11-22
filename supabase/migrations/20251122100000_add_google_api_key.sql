/*
  # Add Google API Key to Settings

  1. Changes
    - Add `google_api_key` column to `settings` table
    - This key will be used for Google Gemini / Imagen 3 integration
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'google_api_key'
  ) THEN
    ALTER TABLE settings ADD COLUMN google_api_key text;
  END IF;
END $$;