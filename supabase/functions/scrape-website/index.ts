import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeRequest {
  url: string;
}

interface AnalysisResult {
  brandName: string;
  offerDetails: string;
  targetAudience: string;
  brandPositioning: string;
  rawContent: string;
  primaryColor?: string;
  secondaryColor?: string;
  brandMood?: string;
}

// Fonction utilitaire pour extraire les couleurs hexadécimales
function extractHexColors(text: string): string[] {
  const matches = text.match(/#[0-9a-fA-F]{6}/g) || [];
  return matches.map(c => c.toLowerCase());
}

// 1. MÉTHODE PRINCIPALE : Scraping Direct
// Tente de récupérer le HTML brut. Retourne null si échec (403, 404, timeout...).
async function scrapeDirect(url: string): Promise<string | null> {
  console.log(`Attempting DIRECT scrape for ${url}...`);
  try {
    const controller = new AbortController();
    // On laisse 8s max pour répondre, sinon on considère que ça traîne/bloque
    const timeoutId = setTimeout(() => controller.abort(), 8000); 

    const browserHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    };

    const response = await fetch(url, { 
      method: 'GET', 
      headers: browserHeaders,
      signal: controller.signal 
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Direct scrape failed with status: ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.warn(`Direct scrape error: ${error instanceof Error ? error.message : 'Unknown'}`);
    return null;
  }
}

// 2. MÉTHODE DE SECOURS : Jina AI
// Utilise un proxy intelligent pour lire le contenu si le direct échoue.
async function scrapeViaJina(url: string): Promise<string | null> {
  console.log(`Falling back to JINA AI for ${url}...`);
  try {
    // r.jina.ai renvoie le contenu nettoyé en Markdown
    const response = await fetch(`https://r.jina.ai/${url}`);
    if (!response.ok) return null;
    return await response.text();
  } catch (error) {
    console.error("Jina AI error:", error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url }: ScrapeRequest = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- AUTHENTIFICATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Authorization required");

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data: settings } = await supabase
      .from('settings')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) throw new Error("OpenAI API key not configured");

    // ==========================================
    // LOGIQUE DE SCRAPING : DIRECT PUIS FALLBACK
    // ==========================================
    
    let contentText = "";
    let rawHtmlForColors: string | null = null;
    let scrapingSource = "Direct";

    // ÉTAPE 1 : TENTATIVE DIRECTE
    rawHtmlForColors = await scrapeDirect(url);

    if (rawHtmlForColors) {
      // SUCCÈS DIRECT
      console.log("Direct scrape successful!");
      // On nettoie le HTML pour en faire du texte pour l'IA
      contentText = rawHtmlForColors
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    } else {
      // ÉCHEC DIRECT -> ÉTAPE 2 : JINA AI (FALLBACK)
      scrapingSource = "Jina AI (Fallback)";
      const jinaContent = await scrapeViaJina(url);
      
      if (jinaContent) {
        contentText = jinaContent;
      } else {
        // ÉCHEC TOTAL (Ni Direct, ni Jina)
        throw new Error(`Impossible d'accéder au site ${url} (Direct & Jina failed).`);
      }
    }

    // ==========================================
    // ANALYSE DES COULEURS
    // ==========================================
    
    let finalColorCandidates: string[] = [];
    
    if (rawHtmlForColors) {
      // Si on a eu accès au HTML brut, on extrait les couleurs précisément
      const headerMatch = rawHtmlForColors.match(/<header[\s\S]*?<\/header>/i);
      const footerMatch = rawHtmlForColors.match(/<footer[\s\S]*?<\/footer>/i);
      const svgMatches = rawHtmlForColors.match(/<svg[\s\S]*?<\/svg>/gi) || [];
      const cssVarMatches = rawHtmlForColors.match(/--[a-zA-Z0-9-]*(color|primary|brand|main|accent)[a-zA-Z0-9-]*:\s*(#[0-9a-fA-F]{6})/gi) || [];
      
      const priorityColors: string[] = [];
      if (headerMatch) priorityColors.push(...extractHexColors(headerMatch[0]));
      if (footerMatch) priorityColors.push(...extractHexColors(footerMatch[0]));
      svgMatches.forEach(svg => priorityColors.push(...extractHexColors(svg)));
      
      const cssBrandColors = cssVarMatches.map(m => m.match(/#[0-9a-fA-F]{6}/)?.[0]?.toLowerCase()).filter(Boolean) as string[];
      
      // Fréquence globale
      const allColors = extractHexColors(rawHtmlForColors);
      const colorCounts: Record<string, number> = {};
      allColors.forEach(c => colorCounts[c] = (colorCounts[c] || 0) + 1);
      const ignoreList = ['#ffffff', '#000000', '#f8f8f8', '#f2f2f2', '#eeeeee', '#333333', '#222222', '#111111'];
      const topGlobalColors = Object.entries(colorCounts)
        .filter(([c]) => !ignoreList.includes(c))
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([c]) => c);

      finalColorCandidates = [...new Set([...cssBrandColors, ...priorityColors, ...topGlobalColors])].slice(0, 15);
    } else {
      // Si on est passé par Jina, on n'a pas le CSS/HTML brut pour les couleurs.
      console.log("Using Jina content - HTML/CSS colors unavailable. AI will deduce mood.");
    }

    // ==========================================
    // ANALYSE IA (OpenAI)
    // ==========================================

    const contentForAI = `
URL: ${url}
Scraping Source: ${scrapingSource}

DETECTED COLOR CANDIDATES (From HTML/CSS):
${finalColorCandidates.length > 0 ? finalColorCandidates.join(', ') : "NONE (Site protected or no colors found)."}

Content: 
${contentText.substring(0, 6000)}`;

    const aiPrompt = `Tu es un expert en UI/UX et branding.

Analyse ce contenu de site web.
Ta mission est d'identifier la CHARTE GRAPHIQUE de la marque.

Règles pour les couleurs :
1. "primaryColor" : Choisis dans la liste "DETECTED COLOR CANDIDATES" si disponible. 
   SI LA LISTE EST VIDE OU "NONE" (car site protégé), DÉDUIS IMPÉRATIVEMENT une couleur hexadécimale (#......) qui correspond à l'univers de la marque décrit dans le texte (ex: #000000 pour du luxe, #2E8B57 pour de la nature, #0000FF pour du tech/corporate). Ne renvoie jamais vide.
2. "secondaryColor" : Idem, choisis une couleur complémentaire ou de contraste.

${contentForAI}

Réponds UNIQUEMENT avec un JSON valide au format suivant (sans markdown):
{
  "brandName": "Nom de la marque",
  "offerDetails": "Description de l'offre (2-3 phrases)",
  "targetAudience": "Cible prioritaire",
  "brandPositioning": "Positionnement et ton",
  "primaryColor": "Code HEX",
  "secondaryColor": "Code HEX",
  "brandMood": "L'ambiance visuelle en 3-4 mots clés"
}`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.openai_api_key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'JSON only.' },
          { role: 'user', content: aiPrompt }
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
    }

    const aiData = await openaiResponse.json();
    const aiContent = aiData.choices[0].message.content;
    const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error('Invalid AI response format');
    
    const aiResult = JSON.parse(jsonMatch[0]);

    const result: AnalysisResult = {
      brandName: aiResult.brandName || 'Marque Inconnue',
      offerDetails: aiResult.offerDetails || '',
      targetAudience: aiResult.targetAudience || '',
      brandPositioning: aiResult.brandPositioning || '',
      rawContent: contentText.substring(0, 1000),
      primaryColor: aiResult.primaryColor || '#000000',
      secondaryColor: aiResult.secondaryColor || '#ffffff',
      brandMood: aiResult.brandMood || 'Neutre'
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});