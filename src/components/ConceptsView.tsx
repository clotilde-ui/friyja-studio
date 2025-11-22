import { useState, useEffect } from 'react';
import { supabase, Analysis, Concept, Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateVideoConcepts, generateStaticConcepts, generateImage, generateImageIdeogram, generateImageGoogle } from '../services/openaiService';
import { generateImagePrompt } from '../services/promptGenerationService';
import { ArrowLeft, Loader, Download, FileDown, Trash2, X, Image as ImageIcon, Edit2, Check, DownloadIcon, Sparkles, Copy, Video, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface ConceptsViewProps {
  analysis: Analysis;
  onBack: () => void;
}

type ImageProvider = 'openai' | 'ideogram' | 'google';
type Tab = 'video' | 'static';

export default function ConceptsView({ analysis, onBack }: ConceptsViewProps) {
  const { user } = useAuth();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('video');
  
  // Gestion de l'analyse éditable
  const [analysisParams, setAnalysisParams] = useState<Analysis>(analysis);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);

  // States de génération
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [generatingStatic, setGeneratingStatic] = useState(false);
  const [generatingImageId, setGeneratingImageId] = useState<string | null>(null);
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null);
  
  // States d'édition
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editedConcept, setEditedConcept] = useState<Partial<Concept>>({});
  const [selectedProvider, setSelectedProvider] = useState<Record<string, ImageProvider>>({});
  
  // States pour les clés API et données
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);

  useEffect(() => {
    setAnalysisParams(analysis);
    loadConcepts();
    loadApiKey();
    loadClientData();
  }, [analysis.id]);

  // Au chargement, s'il n'y a que des concepts statiques, on bascule sur l'onglet statique
  useEffect(() => {
    if (concepts.length > 0) {
      const hasVideo = concepts.some(c => c.media_type === 'video');
      const hasStatic = concepts.some(c => c.media_type === 'static');
      if (!hasVideo && hasStatic) {
        setActiveTab('static');
      }
    }
  }, [concepts.length]);

  async function loadApiKey() {
    if (!user) return;

    try {
      const { data } = await supabase
        .from('settings')
        .select('openai_api_key, ideogram_api_key, google_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setApiKey(data.openai_api_key || '');
        setIdeogramApiKey(data.ideogram_api_key || '');
        setGoogleApiKey(data.google_api_key || '');
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
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

  async function handleSaveAnalysis() {
    setIsSavingAnalysis(true);
    try {
      const { error } = await supabase
        .from('analyses')
        .update({
          brand_name: analysisParams.brand_name, // Mise à jour du nom
          offer_details: analysisParams.offer_details,
          target_audience: analysisParams.target_audience,
          brand_positioning: analysisParams.brand_positioning,
        })
        .eq('id', analysis.id);

      if (error) throw error;
      alert('Analyse mise à jour avec succès');
    } catch (error) {
      console.error('Error updating analysis:', error);
      alert('Erreur lors de la mise à jour de l\'analyse');
    } finally {
      setIsSavingAnalysis(false);
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
    if (!confirm(`Supprimer tous les concepts ${stage} de ce type ?`)) return;

    try {
      const conceptIds = concepts
        .filter(c => c.funnel_stage === stage && c.media_type === activeTab)
        .map(c => c.id);

      if (conceptIds.length === 0) return;

      const { error } = await supabase
        .from('concepts')
        .delete()
        .in('id', conceptIds);

      if (error) throw error;
      setConcepts(concepts.filter(c => !conceptIds.includes(c.id)));
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
        analysisParams.brand_name,
        analysisParams.website_url,
        analysisParams.offer_details,
        analysisParams.target_audience,
        analysisParams.brand_positioning,
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
      setActiveTab('video');
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
        analysisParams.brand_name,
        analysisParams.website_url,
        analysisParams.offer_details,
        analysisParams.target_audience,
        analysisParams.brand_positioning,
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
      setActiveTab('static');
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
      const prompt = await generateImagePrompt(clientData, analysisParams, concept, apiKey);

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

    if (!concept.generated_prompt) {
      alert('Veuillez d\'abord générer un prompt avant de lancer la création de l\'image.');
      return;
    }

    if (provider === 'openai' && !apiKey) {
      alert('Veuillez configurer votre clé API OpenAI dans les paramètres');
      return;
    }

    if (provider === 'ideogram' && !ideogramApiKey) {
      alert('Veuillez configurer votre clé API Ideogram dans les paramètres');
      return;
    }

    if (provider === 'google' && !googleApiKey) {
      alert('Veuillez configurer votre clé API Google dans les paramètres');
      return;
    }

    setGeneratingImageId(concept.id);
    
    try {
      const promptToUse = concept.generated_prompt;
      let imageUrl: string;

      if (provider === 'ideogram') {
        imageUrl = await generateImageIdeogram(promptToUse, ideogramApiKey);
      } else if (provider === 'google') {
        imageUrl = await generateImageGoogle(promptToUse, googleApiKey);
      } else {
        imageUrl = await generateImage(promptToUse, apiKey);
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
      alert(`Erreur lors de la génération de l'image avec ${provider === 'ideogram' ? 'Ideogram' : (provider === 'google' ? 'Google' : 'OpenAI')}:\n\n${errorMessage}\n\nVérifiez votre clé API et votre connexion.`);
    } finally {
      setGeneratingImageId(null);
    }
  }

  async function handleDownloadImage(concept: Concept) {
    if (!concept.image_url) return;

    if (concept.image_url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = concept.image_url;
        link.download = `${concept.concept.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

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
    const activeConcepts = concepts.filter(c => c.media_type === activeTab);
    const headers = activeTab === 'video' 
      ? ['Stage', 'Concept', 'Format', 'Hook 1', 'Hook 2', 'Hook 3', 'Objectif', 'Scroll Stopper', 'Problème', 'Solution', 'Bénéfices', 'Preuve', 'CTA', 'Script']
      : ['Stage', 'Concept', 'Format', 'Hook 1', 'Hook 2', 'Hook 3', 'Objectif', 'Problème', 'Solution', 'Bénéfices', 'Preuve', 'CTA', 'Visuel suggéré', 'Prompt'];

    const rows = activeConcepts.map(c => {
      const base = [
        c.funnel_stage,
        c.concept,
        c.format,
        c.hooks[0] || '',
        c.hooks[1] || '',
        c.hooks[2] || '',
        c.marketing_objective,
      ];
      
      if (activeTab === 'video') {
        return [
          ...base,
          c.scroll_stopper,
          c.problem,
          c.solution,
          c.benefits,
          c.proof,
          c.cta,
          c.script_outline
        ];
      } else {
        return [
          ...base,
          c.problem,
          c.solution,
          c.benefits,
          c.proof,
          c.cta,
          c.suggested_visual,
          c.generated_prompt || ''
        ];
      }
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `concepts_${activeTab}_${analysisParams.brand_name}_${Date.now()}.csv`;
    link.click();
  }

  function exportToText() {
    const activeConcepts = concepts.filter(c => c.media_type === activeTab);
    let content = `CONCEPTS ${activeTab.toUpperCase()} - ${analysisParams.brand_name}\n`;
    content += `Site: ${analysisParams.website_url}\n`;
    content += `Date: ${new Date().toLocaleDateString('fr-FR')}\n\n`;
    content += '='.repeat(80) + '\n\n';

    ['TOFU', 'MOFU', 'BOFU'].forEach(stage => {
      const stageConcepts = activeConcepts.filter(c => c.funnel_stage === stage);
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
        
        if (activeTab === 'video') {
          content += `\nScroll Stopper:\n${c.scroll_stopper}\n\n`;
        }
        
        content += `Problème:\n${c.problem}\n\n`;
        content += `Solution:\n${c.solution}\n\n`;
        content += `Bénéfices:\n${c.benefits}\n\n`;
        content += `Preuve:\n${c.proof}\n\n`;
        content += `CTA:\n${c.cta}\n\n`;
        
        if (activeTab === 'static') {
          content += `Visuel suggéré:\n${c.suggested_visual}\n\n`;
          if (c.generated_prompt) {
            content += `Prompt:\n${c.generated_prompt}\n\n`;
          }
        } else {
          content += `Script:\n${c.script_outline}\n\n`;
        }
        
        content += '-'.repeat(80) + '\n\n';
      });
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `concepts_${activeTab}_${analysisParams.brand_name}_${Date.now()}.txt`;
    link.click();
  }

  const activeConcepts = concepts.filter(c => c.media_type === activeTab);
  const tofuConcepts = activeConcepts.filter(c => c.funnel_stage === 'TOFU');
  const mofuConcepts = activeConcepts.filter(c => c.funnel_stage === 'MOFU');
  const bofuConcepts = activeConcepts.filter(c => c.funnel_stage === 'BOFU');

  return (
    <div className="max-w-[95%] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'video'
                ? 'bg-white text-[#26B743] shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Video className="w-4 h-4" />
            Concepts Vidéos
          </button>
          <button
            onClick={() => setActiveTab('static')}
            className={`flex items-center gap-2 px-6 py-2 rounded-md font-medium transition-all ${
              activeTab === 'static'
                ? 'bg-white text-[#FFBEFA] !text-purple-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Concepts Statiques
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{analysisParams.brand_name}</h2>
            <p className="text-slate-600 text-sm">{analysisParams.website_url}</p>
          </div>
          <div className="flex gap-2">
            {activeConcepts.length > 0 && (
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
            
            {activeTab === 'video' ? (
              <button
                onClick={handleGenerateVideo}
                disabled={generatingVideo || !apiKey}
                className="flex items-center gap-2 px-6 py-2 bg-[#26B743] text-white rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors"
              >
                {generatingVideo ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5" />
                    Générer Vidéos
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleGenerateStatic}
                disabled={generatingStatic || !apiKey}
                className="flex items-center gap-2 px-6 py-2 bg-[#FFBEFA] text-[#232323] rounded-lg hover:bg-[#ff9de6] disabled:bg-slate-400 transition-colors"
              >
                {generatingStatic ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Génération...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    Générer Statiques
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* PANNEAU ANALYSE DÉPLIABLE */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden transition-all">
          <button
            onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-slate-700">Analyse & Stratégie</span>
            </div>
            {isAnalysisOpen ? (
              <ChevronUp className="w-5 h-5 text-slate-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-500" />
            )}
          </button>

          {isAnalysisOpen && (
            <div className="p-4 border-t border-slate-200 space-y-4 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Nom de l'analyse</label>
                  <input
                    type="text"
                    value={analysisParams.brand_name}
                    onChange={(e) => setAnalysisParams({ ...analysisParams, brand_name: e.target.value })}
                    className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Offre / Produits / Services
                  </label>
                  <textarea
                    value={analysisParams.offer_details}
                    onChange={(e) => setAnalysisParams({ ...analysisParams, offer_details: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Cibles prioritaires
                  </label>
                  <textarea
                    value={analysisParams.target_audience}
                    onChange={(e) => setAnalysisParams({ ...analysisParams, target_audience: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Positionnement et ton de marque
                  </label>
                  <textarea
                    value={analysisParams.brand_positioning}
                    onChange={(e) => setAnalysisParams({ ...analysisParams, brand_positioning: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
                    rows={4}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAnalysis}
                  disabled={isSavingAnalysis}
                  className="flex items-center gap-2 px-4 py-2 bg-[#26B743] text-white rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors"
                >
                  {isSavingAnalysis ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Sauvegarder l'analyse
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Résumé quand fermé */}
          {!isAnalysisOpen && (
            <div className="px-4 pb-4 text-sm text-slate-500">
              <span className="font-semibold">Cible :</span> {analysisParams.target_audience.substring(0, 150)}...
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader className="w-8 h-8 animate-spin text-[#26B743]" />
        </div>
      ) : activeConcepts.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {activeTab === 'video' ? <Video className="w-8 h-8 text-slate-400" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
          </div>
          <p className="text-slate-500 mb-4">Aucun concept {activeTab === 'video' ? 'vidéo' : 'statique'} généré</p>
          <p className="text-sm text-slate-400">
            Cliquez sur le bouton "Générer" ci-dessus pour commencer
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
                <div className="overflow-x-auto relative">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Concept</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[120px]">Format</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[300px]">Hooks</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[120px]">Objectif</th>
                        
                        {activeTab === 'video' && (
                          <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Scroll Stopper</th>
                        )}
                        
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Problème</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Solution</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Bénéfices</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Preuve</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[150px]">CTA</th>
                        
                        {activeTab === 'video' ? (
                          <>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Visuel suggéré</th>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[250px]">Script</th>
                          </>
                        ) : (
                          <>
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[200px]">Visuel suggéré</th>
                            {/* COLONNE FUSIONNÉE : STUDIO CRÉA (Sticky) AVEC NOUVEAU BACKGROUND */}
                            <th className="text-left py-3 px-4 font-semibold text-slate-700 min-w-[300px] sticky right-[50px] bg-slate-50 z-20 border-l border-slate-200 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                              Studio Créa
                            </th>
                          </>
                        )}
                        
                        {/* COLONNE ACTIONS (Sticky) */}
                        <th className="w-[50px] sticky right-0 bg-white z-20 border-l border-slate-200"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageConcepts.map((concept, i) => {
                        const isEditing = editingConceptId === concept.id;
                        const displayConcept = isEditing ? editedConcept : concept;

                        return (
                        <tr key={concept.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                          {/* ... (Colonnes de données identiques) ... */}
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
                                rows={2}
                              />
                            ) : (
                              <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full bg-${color}-100 text-${color}-700`}>
                                {concept.marketing_objective}
                              </span>
                            )}
                          </td>
                          {activeTab === 'video' && (
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
                                rows={2}
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
                          
                          {activeTab === 'video' ? (
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
                          ) : (
                            <td className="py-3 px-4 sticky right-[50px] bg-slate-50 group-hover:bg-slate-100 border-l border-slate-200 shadow-[-5px_0_5px_-5px_rgba(0,0,0,0.1)] z-10 align-top transition-colors">
                              <div className="flex flex-col gap-4">
                                {/* Bloc Prompt */}
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() => handleGeneratePrompt(concept)}
                                    disabled={generatingPromptId === concept.id}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
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
                                  
                                  {concept.generated_prompt && (
                                    <div className="p-2 bg-white rounded border border-slate-200">
                                      <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-xs font-semibold text-slate-700">Prompt:</p>
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
                                      <p className="text-xs text-slate-600 whitespace-pre-wrap max-h-20 overflow-y-auto custom-scrollbar">
                                        {concept.generated_prompt}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Bloc Image (Séparateur visuel si prompt existe) */}
                                {concept.generated_prompt && (
                                  <div className="border-t border-slate-200 pt-4 flex flex-col gap-2">
                                    {concept.image_url && (
                                      <div className="relative group/img">
                                        <img
                                          src={concept.image_url}
                                          alt={concept.concept}
                                          className="w-full h-32 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                                          onClick={() => setModalImageUrl(concept.image_url!)}
                                        />
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadImage(concept);
                                          }}
                                          className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white rounded shadow-sm opacity-0 group-hover/img:opacity-100 transition-opacity"
                                          title="Télécharger l'image"
                                        >
                                          <DownloadIcon className="w-4 h-4 text-slate-700" />
                                        </button>
                                      </div>
                                    )}
                                    
                                    <div className="flex flex-col gap-2">
                                      <select
                                        value={selectedProvider[concept.id] || 'openai'}
                                        onChange={(e) => setSelectedProvider({
                                          ...selectedProvider,
                                          [concept.id]: e.target.value as ImageProvider
                                        })}
                                        className="text-xs border border-slate-300 rounded px-2 py-1 w-full bg-white"
                                        disabled={generatingImageId === concept.id}
                                      >
                                        <option value="openai">OpenAI</option>
                                        <option value="ideogram">Ideogram</option>
                                        <option value="google">Google (Imagen 3)</option>
                                      </select>
                                      <button
                                        onClick={() => handleGenerateImage(concept)}
                                        disabled={generatingImageId === concept.id}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs bg-[#26B743] hover:bg-[#1f9336] text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Générer l'image à partir du prompt"
                                      >
                                        {generatingImageId === concept.id ? (
                                          <Loader className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <>
                                            <ImageIcon className="w-3 h-3" />
                                            Générer
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* COLONNE ACTIONS (Sticky) */}
                          <td className="py-3 px-2 sticky right-0 bg-white group-hover:bg-slate-50 border-l border-slate-200 z-10 align-top">
                            <div className="flex flex-col items-center gap-2 mt-1">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={saveEdit}
                                    className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                                    title="Enregistrer"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                                    title="Annuler"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => startEditing(concept)}
                                    className="p-1.5 text-slate-400 hover:text-[#26B743] hover:bg-slate-100 rounded transition-colors"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteConcept(concept.id, e)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-4 h-4" />
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