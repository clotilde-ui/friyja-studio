import { useState, useEffect } from 'react';
import { supabase, Analysis, Concept, Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateVideoConcepts, generateStaticConcepts, generateImage, generateImageIdeogram } from '../services/openaiService';
import { generateImagePrompt } from '../services/promptGenerationService';
import { ArrowLeft, Loader, Download, FileDown, Trash2, X, Image as ImageIcon, Edit2, Check, DownloadIcon, Sparkles, Copy } from 'lucide-react';

interface ConceptsViewProps {
  analysis: Analysis;
  onBack: () => void;
}

type ImageProvider = 'openai' | 'ideogram';

export default function ConceptsView({ analysis, onBack }: ConceptsViewProps) {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatingStatic, setGeneratingStatic] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editedConcept, setEditedConcept] = useState<Partial<Concept>>({});
  const [selectedProvider, setSelectedProvider] = useState<Record<string, ImageProvider>>({});
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);

  useEffect(() => {
    loadConcepts();
    loadApiKey();
    loadClientData();
  }, [analysis.id]);

  async function loadApiKey() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('settings')
        .select('openai_api_key, ideogram_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.openai_api_key) {
        setApiKey(data.openai_api_key);
      }
      if (data?.ideogram_api_key) {
        setIdeogramApiKey(data.ideogram_api_key);
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
  }

  async function loadClientData() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', analysis.client_id)
        .maybeSingle();

      if (error) throw error;
      setClientData(data);
    } catch (error) {
      console.error('Error loading client data:', error);
    }
  }

  async function loadConcepts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .eq('analysis_id', analysis.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setConcepts(data || []);
    } catch (error) {
      console.error('Error loading concepts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConcept(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Supprimer ce concept ?')) return;

    try {
      const { error } = await supabase
        .from('concepts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setConcepts(concepts.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting concept:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function handleDeleteAll(stage: string) {
    if (!confirm(`Supprimer tous les concepts ${stage} ?`)) return;

    try {
      const conceptIds = concepts
        .filter(c => c.funnel_stage === stage)
        .map(c => c.id);

      const { error } = await supabase
        .from('concepts')
        .delete()
        .in('id', conceptIds);

      if (error) throw error;
      setConcepts(concepts.filter(c => c.funnel_stage !== stage));
    } catch (error) {
      console.error('Error deleting concepts:', error);
      alert('Erreur lors de la suppression');
    }
  }

  async function handleGenerateVideo() {
    if (!apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      return;
    }

    setGeneratingVideo(true);
    try {
      const generatedConcepts = await generateVideoConcepts(
        analysis.brand_name,
        analysis.website_url,
        analysis.offer_details,
        analysis.target_audience,
        analysis.brand_positioning,
        apiKey
      );

      const conceptsToInsert = generatedConcepts.map(c => ({
        analysis_id: analysis.id,
        funnel_stage: c.funnel_stage,
        concept: c.concept,
        format: c.format,
        hooks: c.hooks,
        marketing_objective: c.marketing_objective,
        scroll_stopper: c.scroll_stopper,
        problem: c.problem,
        solution: c.solution,
        benefits: c.benefits,
        proof: c.proof,
        cta: c.cta,
        suggested_visual: c.suggested_visual,
        script_outline: c.script_outline,
        media_type: c.media_type,
      }));

      const { error } = await supabase
        .from('concepts')
        .insert(conceptsToInsert);

      if (error) throw error;

      await loadConcepts();
    } catch (error) {
      console.error('Error generating concepts:', error);
      alert('Erreur lors de la génération des concepts. Vérifiez votre clé API.');
    } finally {
      setGeneratingVideo(false);
    }
  }

  async function handleGenerateStatic() {
    if (!apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      return;
    }

    setGeneratingStatic(true);
    try {
      const generatedConcepts = await generateStaticConcepts(
        analysis.brand_name,
        analysis.website_url,
        analysis.offer_details,
        analysis.target_audience,
        analysis.brand_positioning,
        apiKey
      );

      const conceptsToInsert = generatedConcepts.map(c => ({
        analysis_id: analysis.id,
        funnel_stage: c.funnel_stage,
        concept: c.concept,
        format: c.format,
        hooks: c.hooks,
        marketing_objective: c.marketing_objective,
        scroll_stopper: c.scroll_stopper,
        problem: c.problem,
        solution: c.solution,
        benefits: c.benefits,
        proof: c.proof,
        cta: c.cta,
        suggested_visual: c.suggested_visual,
        script_outline: c.script_outline,
        media_type: c.media_type,
      }));

      const { error } = await supabase
        .from('concepts')
        .insert(conceptsToInsert);

      if (error) throw error;

      await loadConcepts();
    } catch (error) {
      console.error('Error generating concepts:', error);
      alert('Erreur lors de la génération des concepts. Vérifiez votre clé API.');
    } finally {
      setGeneratingStatic(false);
    }
  }

  async function handleGeneratePrompt(concept: Concept) {
    if (!apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      return;
    }

    if (!clientData) {
      await loadClientData();
    }

    if (!clientData) {
      alert('Impossible de charger les données du client');
      return;
    }

    setGeneratingPromptId(concept.id);
    try {
      // On passe analysis en plus pour avoir le contexte complet
      const prompt = await generateImagePrompt(clientData, analysis, concept, apiKey);

      const { error } = await supabase
        .from('concepts')
        .update({
          generated_prompt: prompt,
          prompt_generated_at: new Date().toISOString()
        })
        .eq('id', concept.id);

      if (error) throw error;

      setConcepts(concepts.map(c =>
        c.id === concept.id
          ? { ...c, generated_prompt: prompt, prompt_generated_at: new Date().toISOString() }
          : c
      ));
    } catch (error) {
      console.error('Error generating prompt:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la génération du prompt:\n\n${errorMessage}\n\nVérifiez votre clé API.`);
    } finally {
      setGeneratingPromptId(null);
    }
  }

  async function handleGenerateImage(concept: Concept) {
    const provider = selectedProvider[concept.id] || 'openai';

    if (provider === 'openai' && !apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      return;
    }

    if (provider === 'ideogram' && !ideogramApiKey) {
      alert('Veuillez configurer votre clé API Ideogram dans les paramètres');
      return;
    }

    setGeneratingImageId(concept.id);
    
    try {
      let promptToUse = concept.generated_prompt;

      // Si pas de prompt généré, on le génère à la volée
      if (!promptToUse) {
        if (!clientData) {
          // Tentative de rechargement si manquant
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('id', analysis.client_id)
            .single();
            
          if (error || !data) throw new Error('Impossible de charger les données client pour générer le prompt');
          setClientData(data);
          
          // Génération du prompt
          promptToUse = await generateImagePrompt(data, analysis, concept, apiKey);
        } else {
          promptToUse = await generateImagePrompt(clientData, analysis, concept, apiKey);
        }

        // Sauvegarde du prompt généré à la volée
        await supabase
          .from('concepts')
          .update({
            generated_prompt: promptToUse,
            prompt_generated_at: new Date().toISOString()
          })
          .eq('id', concept.id);
          
        // Mise à jour de l'état local pour affichage immédiat
        setConcepts(prev => prev.map(c => 
          c.id === concept.id 
            ? { ...c, generated_prompt: promptToUse, prompt_generated_at: new Date().toISOString() } 
            : c
        ));
      }

      let imageUrl: string;

      if (provider === 'ideogram') {
        imageUrl = await generateImageIdeogram(
          promptToUse!, // On envoie le prompt complet
          ideogramApiKey
        );
      } else {
        imageUrl = await generateImage(
          promptToUse!, // On envoie le prompt complet
          apiKey
        );
      }

      const { error } = await supabase
        .from('concepts')
        .update({
          image_url: imageUrl,
          image_generated_at: new Date().toISOString()
        })
        .eq('id', concept.id);

      if (error) throw error;

      setConcepts(prev => prev.map(c =>
        c.id === concept.id
          ? { ...c, image_url: imageUrl, image_generated_at: new Date().toISOString() }
          : c
      ));
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      alert(`Erreur lors de la génération de l'image avec ${provider === 'ideogram' ? 'Ideogram' : 'OpenAI'}:\n\n${errorMessage}\n\nVérifiez votre clé API et votre connexion.`);
    } finally {
      setGeneratingImageId(null);
    }
  }

  async function handleDownloadImage(concept: Concept) {
    if (!concept.image_url) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const downloadFunctionUrl = `${supabaseUrl}/functions/v1/download-image`;

    try {
      const response = await fetch(downloadFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ imageUrl: concept.image_url }),
      });

      if (!response.ok) {
        throw new Error('Failed to download image');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${concept.concept.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
      alert('Erreur lors du téléchargement de l\'image.');
    }
  }

  function startEditing(concept: Concept) {
    setEditingConceptId(concept.id);
    setEditedConcept({ ...concept });
  }

  async function saveEdit() {
    if (!editingConceptId || !editedConcept) return;

    try {
      const { error } = await supabase
        .from('concepts')
        .update({
          concept: editedConcept.concept,
          format: editedConcept.format,
          hooks: editedConcept.hooks,
          marketing_objective: editedConcept.marketing_objective,
          scroll_stopper: editedConcept.scroll_stopper,
          problem: editedConcept.problem,
          solution: editedConcept.solution,
          benefits: editedConcept.benefits,
          proof: editedConcept.proof,
          cta: editedConcept.cta,
          suggested_visual: editedConcept.suggested_visual,
          script_outline: editedConcept.script_outline,
        })
        .eq('id', editingConceptId);

      if (error) throw error;

      setConcepts(concepts.map(c =>
        c.id === editingConceptId ? { ...c, ...editedConcept } : c
      ));

      setEditingConceptId(null);
      setEditedConcept({});
    } catch (error) {
      console.error('Error saving concept:', error);
      alert('Erreur lors de la sauvegarde');
    }
  }

  function cancelEdit() {
    setEditingConceptId(null);
    setEditedConcept({});
  }

  function updateHook(index: number, value: string) {
    const newHooks = [...(editedConcept.hooks || [])];
    newHooks[index] = value;
    setEditedConcept({ ...editedConcept, hooks: newHooks });
  }

  function exportToCSV() {
    const headers = ['Stage', 'Concept', 'Format', 'Hook 1', 'Hook 2', 'Hook 3', 'Objectif', 'Scroll Stopper', 'Problème', 'Solution', 'Bénéfices', 'Preuve', 'CTA', 'Visuel suggéré', 'Script'];
    const rows = concepts.map(c => [
      c.funnel_stage,
      c.concept,
      c.format,
      c.hooks[0] || '',
      c.hooks[1] || '',
      c.hooks[2] || '',
      c.marketing_objective,
      c.scroll_stopper,
      c.problem,
      c.solution,
      c.benefits,
      c.proof,
      c.cta,
      c.suggested_visual,
      c.script_outline,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `concepts_${analysis.brand_name}_${Date.now()}.csv`;
    link.click();
  }

  function exportToText() {
    let content = `CONCEPTS CRÉATIFS - ${analysis.brand_name}\n`;
    content += `Site: ${analysis.website_url}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    content += '='.repeat(80) + '\n\n';

    ['TOFU', 'MOFU', 'BOFU'].forEach(stage => {
      const stageConcepts = concepts.filter(c => c.funnel_stage === stage);
      if (stageConcepts.length === 0) return;

      content += `\n### ${stage} - ${stageConcepts.length} concepts\n\n`;

      stageConcepts.forEach((c, i) => {
        content += `## Concept ${i + 1}: ${c.concept}\n\n`;
        content += `Format: ${c.format}\n`;
        content += `Objectif: ${c.marketing_objective}\n\n`;
        content += `Hooks:\n`;
        c.hooks.forEach((h, j) => {
          content += `  ${j + 1}. ${h}\n`;
        });
        content += `\nScroll Stopper:\n${c.scroll_stopper}\n\n`;
        content += `Problème:\n${c.problem}\n\n`;
        content += `Solution:\n${c.solution}\n\n`;
        content += `Bénéfices:\n${c.benefits}\n\n`;
        content += `Preuve:\n${c.proof}\n\n`;
        content += `CTA:\n${c.cta}\n\n`;
        content += `Visuel suggéré:\n${c.suggested_visual}\n\n`;
        content += `Script:\n${c.script_outline}\n\n`;
        content += '-'.repeat(80) + '\n\n';
      });
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `concepts_${analysis.brand_name}_${Date.now()}.txt`;
    link.click();
  }

  const tofuConcepts = concepts.filter(c => c.funnel_stage === 'TOFU');
  const mofuConcepts = concepts.filter(c => c.funnel_stage === 'MOFU');
  const bofuConcepts = concepts.filter(c => c.funnel_stage === 'BOFU');

  const hasVideoConcepts = concepts.some(c => c.media_type === 'video');
  const hasStaticConcepts = concepts.some(c => c.media_type === 'static');

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{analysis.brand_name}</h2>
            <p className="text-slate-600 text-sm">{analysis.website_url}</p>
          </div>
          <div className="flex gap-2">
            {concepts.length > 0 && (
              <>
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FileDown className="w-5 h-5" />
                  CSV
                </button>
                <button
                  onClick={exportToText}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  TXT
                </button>
              </>
            )}
            <button
              onClick={handleGenerateVideo}
              disabled={generatingVideo || generatingStatic || !apiKey}
              className="flex items-center gap-2 px-6 py-2 bg-[#26B743] text-white rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors"
            >
              {generatingVideo ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Génération...
                </>
              ) : (
                'Générer concepts vidéos'
              )}
            </button>
            <button
              onClick={handleGenerateStatic}
              disabled={generatingVideo || generatingStatic || !apiKey}
              className="flex items-center gap-2 px-6 py-2 bg-[#FFBEFA] text-[#232323] rounded-lg hover:bg-[#ff9de6] disabled:bg-slate-400 transition-colors"
            >
              {generatingStatic ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Génération...
                </>
              ) : (
                'Générer concepts statiques'
              )}
            </button>
          </div>
        </div>
        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
          <p className="font-medium mb-1">Informations de l'analyse</p>
          <p><span className="font-semibold">Audience:</span> {analysis.target_audience}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-[#26B743]" />
        </div>
      ) : concepts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-slate-500 mb-4">Aucun concept généré pour le moment</p>
          <p className="text-sm text-slate-400">
            Cliquez sur "Générer les concepts" pour commencer
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { stage: 'TOFU', concepts: tofuConcepts, color: 'blue', label: 'Top of Funnel - Awareness' },
            { stage: 'MOFU', concepts: mofuConcepts, color: 'purple', label: 'Middle of Funnel - Considération' },
            { stage: 'BOFU', concepts: bofuConcepts, color: 'green', label: 'Bottom of Funnel - Conversion' },
          ].map(({ stage, concepts: stageConcepts, color, label }) => (
            stageConcepts.length > 0 && (
              <div key={stage} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-xl font-bold text-${color}-600`}>
                    {stage} - {label}
                  </h3>
                  <button
                    onClick={() => handleDeleteAll(stage)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer tout
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Concept</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[120px]">Format</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[300px]">Hooks</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[120px]">Objectif</th>
                        {hasVideoConcepts && (
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Scroll Stopper</th>
                        )}
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Problème</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Solution</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Bénéfices</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Preuve</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[150px]">CTA</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Visuel suggéré</th>
                        {hasVideoConcepts && (
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[250px]">Script</th>
                        )}
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Image</th>
                        <th className="w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageConcepts.map((concept, i) => {
                        const isEditing = editingConceptId === concept.id;
                        const displayConcept = isEditing ? editedConcept : concept;

                        return (
                        <tr key={concept.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600 font-medium">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.concept}
                                onChange={(e) => setEditedConcept({ ...editedConcept, concept: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.concept
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={displayConcept.format}
                                onChange={(e) => setEditedConcept({ ...editedConcept, format: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              concept.format
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <div className="space-y-1">
                                {displayConcept.hooks?.map((hook, j) => (
                                  <input
                                    key={j}
                                    type="text"
                                    value={hook}
                                    onChange={(e) => updateHook(j, e.target.value)}
                                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                  />
                                ))}
                              </div>
                            ) : (
                              <ul className="text-sm text-slate-600 space-y-1">
                                {concept.hooks.map((hook, j) => (
                                  <li key={j} className="flex">
                                    <span className="font-semibold mr-2">{j + 1}.</span>
                                    <span>{hook}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {isEditing ? (
                              <input
                                type="text"
                                value={displayConcept.marketing_objective}
                                onChange={(e) => setEditedConcept({ ...editedConcept, marketing_objective: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full bg-${color}-100 text-${color}-700`}>
                                {concept.marketing_objective}
                              </span>
                            )}
                          </td>
                          {concept.media_type === 'video' && (
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {isEditing ? (
                                <textarea
                                  value={displayConcept.scroll_stopper}
                                  onChange={(e) => setEditedConcept({ ...editedConcept, scroll_stopper: e.target.value })}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                  rows={2}
                                />
                              ) : (
                                concept.scroll_stopper
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.problem}
                                onChange={(e) => setEditedConcept({ ...editedConcept, problem: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.problem
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.solution}
                                onChange={(e) => setEditedConcept({ ...editedConcept, solution: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.solution
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.benefits}
                                onChange={(e) => setEditedConcept({ ...editedConcept, benefits: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.benefits
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.proof}
                                onChange={(e) => setEditedConcept({ ...editedConcept, proof: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.proof
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <input
                                type="text"
                                value={displayConcept.cta}
                                onChange={(e) => setEditedConcept({ ...editedConcept, cta: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                              />
                            ) : (
                              concept.cta
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {isEditing ? (
                              <textarea
                                value={displayConcept.suggested_visual}
                                onChange={(e) => setEditedConcept({ ...editedConcept, suggested_visual: e.target.value })}
                                className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                rows={2}
                              />
                            ) : (
                              concept.suggested_visual
                            )}
                          </td>
                          {concept.media_type === 'video' && (
                            <td className="py-3 px-4 text-sm text-slate-600">
                              {isEditing ? (
                                <textarea
                                  value={displayConcept.script_outline}
                                  onChange={(e) => setEditedConcept({ ...editedConcept, script_outline: e.target.value })}
                                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                                  rows={2}
                                />
                              ) : (
                                concept.script_outline
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4">
                            {concept.media_type === 'static' ? (
                              <div className="space-y-2">
                                {concept.generated_prompt && (
                                  <div className="mb-2 p-2 bg-slate-50 rounded border border-slate-200">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <p className="text-xs font-semibold text-slate-700">Prompt généré:</p>
                                      <button
                                        onClick={() => {
                                          navigator.clipboard.writeText(concept.generated_prompt!);
                                          alert('Prompt copié !');
                                        }}
                                        className="p-1 text-slate-600 hover:text-slate-800"
                                        title="Copier le prompt"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <p className="text-xs text-slate-600 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                      {concept.generated_prompt}
                                    </p>
                                  </div>
                                )}
                                <button
                                  onClick={() => handleGeneratePrompt(concept)}
                                  disabled={generatingPromptId === concept.id}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 mb-2"
                                >
                                  {generatingPromptId === concept.id ? (
                                    <>
                                      <Loader className="w-3 h-3 animate-spin" />
                                      Génération...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-3 h-3" />
                                      {concept.generated_prompt ? 'Régénérer prompt' : 'Générer un prompt'}
                                    </>
                                  )}
                                </button>
                                {concept.image_url && (
                                  <div className="relative group">
                                    <img
                                      src={concept.image_url}
                                      alt={concept.concept}
                                      className="w-32 h-32 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                      onClick={() => setModalImageUrl(concept.image_url!)}
                                    />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDownloadImage(concept);
                                      }}
                                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Télécharger l'image"
                                    >
                                      <DownloadIcon className="w-4 h-4 text-slate-700" />
                                    </button>
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <select
                                    value={selectedProvider[concept.id] || 'openai'}
                                    onChange={(e) => setSelectedProvider({
                                      ...selectedProvider,
                                      [concept.id]: e.target.value as ImageProvider
                                    })}
                                    className="text-xs border border-slate-300 rounded px-2 py-1"
                                    disabled={generatingImageId === concept.id}
                                  >
                                    <option value="openai">OpenAI</option>
                                    <option value="ideogram">Ideogram</option>
                                  </select>
                                  <button
                                    onClick={() => handleGenerateImage(concept)}
                                    disabled={generatingImageId === concept.id}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-[#26B743] hover:bg-[#1f9336] text-white rounded transition-colors disabled:opacity-50"
                                  >
                                    {generatingImageId === concept.id ? (
                                      <>
                                        <Loader className="w-3 h-3 animate-spin" />
                                        Génération...
                                      </>
                                    ) : (
                                      <>
                                        <ImageIcon className="w-3 h-3" />
                                        Générer une image
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">N/A</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="p-1 text-green-600 hover:text-green-700 transition-colors"
                                    title="Enregistrer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                    title="Annuler"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(concept)}
                                    className="p-1 text-slate-400 hover:text-[#26B743] transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteConcept(concept.id, e)}
                                    className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Supprimer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>
      )}

      {modalImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setModalImageUrl(null)}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setModalImageUrl(null)}
              className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors z-10"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>
            <img
              src={modalImageUrl}
              alt="Image agrandie"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}