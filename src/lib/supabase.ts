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
  google_api_key?: string; // <--- Le champ ajouté
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