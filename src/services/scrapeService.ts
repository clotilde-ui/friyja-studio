import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface ScrapeResult {
  brandName: string;
  offerDetails: string;
  targetAudience: string;
  brandPositioning: string;
  rawContent: string;
  // AJOUTS ICI :
  primaryColor?: string;
  secondaryColor?: string;
  brandMood?: string;
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  // ... (le reste de la fonction ne change pas)
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const apiUrl = `${SUPABASE_URL}/functions/v1/scrape-website`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to scrape website');
  }

  return await response.json();
}