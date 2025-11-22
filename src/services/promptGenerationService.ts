import OpenAI from "openai";
import type { Client, Concept, Analysis } from "../lib/supabase";

export async function generateImagePrompt(
  client: Client,
  analysis: Analysis,
  concept: Concept,
  apiKey: string
): Promise<string> {
  const openai = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  // Construction intelligente du contexte de marque
  // Utilisation de la couleur primaire et secondaire si elles sont définies
  const primaryColor = client.primary_color || '#24B745'; // Vert par défaut
  const secondaryColor = client.secondary_color || '#232323'; // Anthracite par défaut

  const brandColors = client.primary_color 
    ? `- Palette principale : ${primaryColor} (Couleur dominante et accents), ${secondaryColor} (Contraste ou fond)
       - Ambiance : Vise la charte de marque (couleurs et humeur) pour l'intégration typographique et les éléments graphiques.`
    : `- Palette non définie. DÉDUIRE les couleurs dominantes du Mood : "${client.brand_mood || 'Moderne'}" et du Positionnement : "${analysis.brand_positioning}".`;

  const brandMood = client.brand_mood || `Tonalité publicitaire, ${analysis.brand_positioning.split(' ').slice(0, 3).join(', ')}`;

  const fullPrompt = `
Tu es un Directeur Artistique Expert spécialisé dans la publicité (Meta Ads / TikTok / Instagram / LinkedIn).
Ton objectif est de rédiger un PROMPT DE GÉNÉRATION D'IMAGE (pour DALL-E 3 ou IMAGEN) extrêmement détaillé et performant, axé sur la conversion publicitaire.

Tu dois impérativement t'assurer que le visuel créé :
1. Est immédiatement compréhensible et stoppe le scroll.
2. Respecte l'identité visuelle de la marque.
3. Intègre le texte marketing directement sur l'image (Headline et CTA).

DONNÉES MARQUE & ANALYSE :
- Nom : ${client.name}
- Offre : ${analysis.offer_details}
- Cible : ${analysis.target_audience}
- Positionnement : ${analysis.brand_positioning}
- Identité Visuelle : ${brandColors}
- Ambiance (Mood) : ${brandMood}

DONNÉES DU CONCEPT CRÉATIF :
- Stage Funnel : ${concept.funnel_stage}
- Idée : ${concept.concept}
- Scroll Stopper (Elément visuel fort) : ${concept.scroll_stopper}
- Visuel suggéré initialement : ${concept.suggested_visual}
- CTA : ${concept.cta}

---

TA MISSION :
Rédige un prompt final structuré pour un IA génératrice d'image.

STRUCTURE DE TA RÉPONSE (Le prompt final) :
(Commence directement par la description, sans titres).

1. [STYLE VISUEL] : Décris le style visuel précis. Exemples: "Photographie publicitaire haute résolution 8k", "Rendu 3D cinématique isométrique", "Illustration style Flat Design moderne", "Style UGC (User Generated Content) authentique", "Minimaliste, style brutaliste/anthracite".

2. [SUJET & COMPOSITION] : Décris la scène centrale avec précision, en utilisant le 'Scroll Stopper' et le 'Visuel suggéré'. La composition doit être dynamique et axée sur le sujet principal (un seul sujet fort est mieux).

3. [ÉCLAIRAGE & AMBIANCE] : Décris l'éclairage pour coller au 'Mood'. Exemples : "Éclairage de studio professionnel, doux et contrasté", "Lumière naturelle dorée (Golden Hour)", "Néon cyberpunk sur fond sombre". Le mood doit être "${brandMood}".

4. [PALETTE DE COULEURS] : Impose les codes couleurs HEX (en notation hexadécimale) en lien avec la marque: "Palette de couleurs dominée par ${primaryColor} et ${secondaryColor}."

5. [TYPOGRAPHIE INTÉGRÉE (CRUCIAL)] : L'image doit avoir du texte incrusté pour être une publicité. Indique :
"L'image intègre de manière réaliste et lisible un texte typographique moderne (sans erreur) :
- Headline (Titre accrocheur) : '${concept.scroll_stopper || concept.hooks?.[0] || concept.concept}'
- Bouton CTA (en bas, sur un bouton contrasté en ${primaryColor}) : '${concept.cta}'"

6. [FORMAT] : Termine par le format: "Format carré 1:1, prêt pour Meta Ads."
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("Error generating prompt:", error);
    throw error;
  }
}