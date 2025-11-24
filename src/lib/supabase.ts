import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Client {
  id: string;
  name: string;
  website_url?: string;
  baseline?: string;
  positioning_keywords?: string[];
  primary_color?: string;
  secondary_color?: string;
  dark_color?: string;
  light_color?: string;
  brand_mood?: string;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: string;
  client_id: string;
  website_url: string;
  brand_name: string;
  offer_details: string;
  target_audience: string;
  brand_positioning: string;
  ad_platform: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
}

export interface Concept {
  id: string;
  analysis_id: string;
  funnel_stage: string;
  concept: string;
  format: string;
  hooks: string[];
  marketing_objective: string;
  scroll_stopper: string;
  problem: string;
  solution: string;
  benefits: string;
  proof: string;
  cta: string;
  suggested_visual: string;
  script_outline: string;
  media_type: 'video' | 'static';
  image_url?: string;
  image_generated_at?: string;
  generated_prompt?: string;
  prompt_generated_at?: string;
  created_at: string;
}

export interface Settings {
  id: string;
  user_id: string;
  openai_api_key: string;
  ideogram_api_key?: string;
  google_api_key?: string;
  higgsfield_api_key?: string;
  higgsfield_secret?: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  upvotes_count: number;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface FeatureRequestVote {
  id: string;
  feature_request_id: string;
  user_id: string;
  created_at: string;
}

// --- NOUVELLE FONCTION POUR L'UPLOAD D'IMAGES ---

export async function uploadImageToStorage(urlOrBase64: string, conceptId: string): Promise<string | null> {
  try {
    let blob: Blob;

    // 1. Convertir l'entrée en Blob (Fichier)
    if (urlOrBase64.startsWith('data:image')) {
      // Cas Base64 (Google / Nano Banana parfois)
      const base64Data = urlOrBase64.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/png' });
    } else {
      // Cas URL (OpenAI / Ideogram)
      // On doit passer par un fetch pour récupérer le binaire
      const response = await fetch(urlOrBase64);
      blob = await response.blob();
    }

    // 2. Générer un nom de fichier unique
    const fileName = `${conceptId}_${Date.now()}.png`;

    // 3. Upload vers Supabase Storage
    // Le bucket 'generated-images' doit être créé dans Supabase au préalable
    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Récupérer l'URL publique
    const { data } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    return data.publicUrl;

  } catch (error) {
    console.error('Erreur upload storage:', error);
    // Si l'upload échoue, on renvoie null (ou l'on pourrait renvoyer l'url temporaire en fallback)
    return null;
  }
}