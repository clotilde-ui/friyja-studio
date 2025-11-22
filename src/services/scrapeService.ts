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
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  // Normaliser l'URL (ajouter https:// si manquant)
  let normalizedUrl = url.trim();
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  if (!SUPABASE_URL) {
    throw new Error('VITE_SUPABASE_URL n\'est pas configuré');
  }

  const apiUrl = `${SUPABASE_URL}/functions/v1/scrape-website`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: normalizedUrl }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to scrape website';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Erreur inconnue lors du scraping');
  }
}