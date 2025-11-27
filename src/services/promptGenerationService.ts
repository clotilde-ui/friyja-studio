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

  // 1. Définition des variables disponibles (injectées)
  const primaryColor = client.primary_color || '#24B745'; 
  const secondaryColor = client.secondary_color || '#232323'; 
  
  // Utilisation stricte de Concept.hooks[0] pour le titre
  const headlineContent = concept.hooks?.[0] || concept.concept; 
  
  // URL d'analyse
  const websiteUrl = analysis.website_url || client.website_url || '';

  // Variables conditionnelles (Baseline et Mots-clés)
  const clientBaseline = client.baseline || '';
  const clientKeywords = client.positioning_keywords || [];

  // Définition de la valeur injectée ou de l'instruction de génération (pour la Baseline)
  const baselineValue = clientBaseline 
    ? clientBaseline 
    : '[GÉNÈRE UNE BASELINE COURTE BASÉE SUR L\'OFFRE ET LE POSITIONNEMENT]';
    
  // Définition de la valeur injectée ou de l'instruction de génération (pour les Mots-clés)
  const keywordsValue = clientKeywords.length > 0 
    ? JSON.stringify(clientKeywords) 
    : '["[GÉNÈRE UNE LISTE DE MOTS CLÉS PERTINENTS (5-7) BASÉS SUR LE CONCEPT ET L\'ANALYSE]"]';


  // 2. Le prompt que l'IA va recevoir
  const fullPrompt = `
Tu es un Creative Strategist de haut niveau. Ta mission est de générer un objet JSON STRICTEMENT conforme au format fourni. Tu dois remplir tous les champs marqués par des crochets (Ex: "[DESCRIPTION DÉTAILLÉE DU FOND]").

RÈGLES IMPÉRATIVES :
1. Tu dois retourner UNIQUEMENT l'objet JSON (sans utiliser de blocs de code Markdown comme \`\`\`json\`\`\` ni texte additionnel).
2. La valeur du champ "image_prompt_for_generator" doit être le prompt final et complet pour le générateur d'image (DALL-E 3 ou IMAGEN).
3. Utilise les valeurs injectées (si non vides).

DONNÉES CLIENT & CONCEPT (Bases de ta génération) :
- Nom du Client : ${client.name}
- URL : ${websiteUrl}
- Offre : ${analysis.offer_details}
- Cible : ${analysis.target_audience}
- Positionnement : ${analysis.brand_positioning}
- Concept IDÉE : ${concept.concept}
- Funnel Stage : ${concept.funnel_stage}
- Visuel Suggéré par le Concept : ${concept.suggested_visual}
- Headline (Hook) à utiliser : ${headlineContent}
- CTA : ${concept.cta}
- Couleurs de Marque : Primaire: ${primaryColor}, Secondaire: ${secondaryColor}

---
RÉPONSE (JSON STRICT) :
{
  "project": "${client.name}",
  "format": {
    "ratio": "1:1",
    "size_px": "1080x1080",
    "platform": "Meta (Facebook / Instagram)"
  },
  "brand": {
    "name": "${client.name}",
    "url": "${websiteUrl}",
    "baseline": "${baselineValue}",
    "positioning_keywords": ${keywordsValue}
  },
  "visual_direction": {
    "style": "[STYLE VISUEL (Ex: Photographie publicitaire haute résolution, Rendu 3D isométrique, Illustration style Flat Design)]",
    "background": "[DESCRIPTION DÉTAILLÉE DU FOND VISUEL INSPIRÉE DU CONCEPT]",
    "foreground_elements": ["[ÉLÉMENT CLÉ 1 (Produit ou Bénéfice)]", "[ÉLÉMENT CLÉ 2]", "[ÉLÉMENT CLÉ 3]"],
    "color_palette_hex": [
      "${primaryColor}",
      "${secondaryColor}",
      "[COULEUR NEUTRE (Ex: #F5E6D3)]",
      "[COULEUR DE CONTRASTE (Ex: #1F2933)]"
    ],
    "mood": "[GÉNÈRE UN MOOD (AMBIANCE) EN QUATRE MOTS CLÉS BASÉ SUR LE CONCEPT ET L'ANALYSE]"
  },
  "text_on_image": {
    "headline": {
      "content": "${headlineContent}",
      "max_characters": 40,
      "placement": "[PLACEMENT HEADLINE (Ex: haut_gauche, centre_haut)]",
      "style": {
        "font_weight": "bold",
        "font_size": "grand",
        "text_case": "phrase",
        "background_shape": "bandeau_semi_transparent"
      }
    },
    "subheadline": {
      "content": "[COURTE PHRASE INCITATIVE BASÉE SUR LES BÉNÉFICES DU CONCEPT]",
      "max_characters": 45,
      "placement": "sous_headline",
      "style": {
        "font_weight": "medium",
        "font_size": "moyen"
      }
    },
    "cta_badge": {
      "content": "${concept.cta}",
      "placement": "[PLACEMENT CTA (Ex: bas_droite)]",
      "style": {
        "shape": "bouton_pill",
        "font_weight": "semibold",
        "font_size": "moyen"
      }
    },
    "logo": {
      "placement": "bas_gauche",
      "note": "Utiliser le logo officiel du client tel qu’il apparaît sur le site."
    },
    "constraints": {
      "max_text_area_percent": 20,
      "notes": "Limiter le texte à ces 3 blocs pour respecter les bonnes pratiques Meta."
    }
  },
  "image_prompt_for_generator": "[PROMPT DÉTAILLÉ ET OPTIMISÉ POUR DALL-E 3, BASÉ SUR TOUTES LES INFORMATIONS CI-DESSUS, INCLUANT LA TYPOGRAPHIE, LES COULEURS ET LES PLACEMENTS DE TEXTE EXACTS POUR UN RENDU RÉALISTE. LE PROMPT DOIT ÊTRE UNE DESCRIPTION PUREMENT VISUELLE DE L'IMAGE FINALE.]",
  "safe_area_guidelines": {
    "headline_safe_zone": "marge 150 px depuis le haut et 100 px des bords latéraux",
    "cta_safe_zone": "marge 150 px depuis le bas et 100 px des bords latéraux",
    "logo_safe_zone": "marge 150 px depuis le bas et 100 px du bord gauche"
  },
  "variant_suggestions": [
    {
      "name": "Variant 1",
      "headline": "[HEADLINE ALTERNATIVE 1 (40 chars max)]",
      "subheadline": "[SUBHEADLINE ALTERNATIVE 1 (45 chars max)]",
      "cta_badge": "[CTA ALTERNATIF 1]"
    },
    {
      "name": "Variant 2",
      "headline": "[HEADLINE ALTERNATIVE 2 (40 chars max)]",
      "subheadline": "[SUBHEADLINE ALTERNATIVE 2 (45 chars max)]",
      "cta_badge": "[CTA ALTERNATIF 2]"
    }
  ]
}
`;
  
  // 3. Logique d'appel API et de parsing
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Tu es un Creative Strategist expert. Tu dois générer un objet JSON STRICT pour un prompt de publicité. Ne réponds JAMAIS avec autre chose que le JSON complet et valide." 
        },
        { 
          role: "user", 
          content: fullPrompt 
        }
      ],
      temperature: 0.7,
      max_tokens: 4096, 
    });

    let jsonString = response.choices[0].message.content;
    if (!jsonString) { throw new Error('No content returned from OpenAI.'); }
    
    // Nettoyage et Parsing
    jsonString = jsonString.replace(/```json\s*|```/g, '').trim();

    let resultJson;
    try {
        resultJson = JSON.parse(jsonString);
    } catch (e) {
        throw new Error("Invalid JSON format returned from OpenAI: " + jsonString.substring(0, 100));
    }

    // NOUVEAU: Retourner le JSON complet et formaté
    return JSON.stringify(resultJson, null, 2); 

  } catch (error) {
    console.error("Error generating prompt:", error);
    // @ts-ignore
    const errorMessage = error.message || 'Unknown error during prompt generation';
    throw new Error(`Erreur lors de la génération du prompt JSON: ${errorMessage}`);
  }
}