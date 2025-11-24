import { useState, useEffect } from 'react';
import { supabase, Analysis, Concept, Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateVideoConcepts, generateStaticConcepts, generateImage, generateImageIdeogram, generateImageGoogle, generateImageNanoBanana } from '../services/openaiService';
import { generateImagePrompt } from '../services/promptGenerationService';
import { ArrowLeft, Loader, Download, FileDown, Trash2, X, Image as ImageIcon, Edit2, Check, DownloadIcon, Sparkles, Video, ChevronDown, ChevronUp, Save, PenTool, RefreshCw } from 'lucide-react';

interface ConceptsViewProps {
  analysis: Analysis;
  onBack: () => void;
}

type ImageProvider = 'openai' | 'ideogram' | 'google' | 'nano-banana';
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
  
  // States d'édition standard
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editedConcept, setEditedConcept] = useState<Partial<Concept>>({});
  const [selectedProvider, setSelectedProvider] = useState<Record<string, ImageProvider>>({});
  
  // --- NOUVEAU : States pour l'édition du PROMPT (Modal) ---
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPromptData, setEditingPromptData] = useState<{id: string, text: string} | null>(null);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // States pour les clés API et données
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [higgsfieldApiKey, setHiggsfieldApiKey] = useState('');
  const [higgsfieldSecret, setHiggsfieldSecret] = useState('');
  
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);

  useEffect(() => {
    setAnalysisParams(analysis);
    loadConcepts();
    loadApiKey();
    loadClientData();
  }, [analysis.id]);

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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setApiKey(data.openai_api_key || '');
        setIdeogramApiKey(data.ideogram_api_key || '');
        setGoogleApiKey(data.google_api_key || '');
        setHiggsfieldApiKey(data.higgsfield_api_key || '');
        setHiggsfieldSecret(data.higgsfield_secret || '');
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
          brand_name: analysisParams.brand_name,
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

  // --- GENERATION FUNCTIONS (Video/Static) ---
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

      const { error } = await supabase.from('concepts').insert(conceptsToInsert);
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

      const { error } = await supabase.from('concepts').insert(conceptsToInsert);
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
    if (provider === 'nano-banana' && (!higgsfieldApiKey || !higgsfieldSecret)) {
      alert('Veuillez configurer vos clés Nano Banana (API Key & Secret) dans les paramètres');
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
      } else if (provider === 'nano-banana') {
        imageUrl = await generateImageNanoBanana(promptToUse, higgsfieldApiKey, higgsfieldSecret);
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
      alert(`Erreur lors de la génération de l'image avec ${provider}:\n\n${errorMessage}\n\nVérifiez vos clés API et votre connexion.`);
    } finally {
      setGeneratingImageId(null);
    }
  }

  // --- FONCTIONS POUR LA GESTION DES IMAGES ET MODIFICATIONS ---

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
    // Pour les URLs normales, on tente le téléchargement via proxy ou direct
    try {
        const response = await fetch(concept.image_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${concept.concept.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        // Fallback simple: ouvrir dans un nouvel onglet
        window.open(concept.image_url, '_blank');
    }
  }

  // --- LOGIQUE EDITION PROMPT (MODALE) ---
  function openPromptModal(concept: Concept) {
    if (!concept.generated_prompt) return;
    setEditingPromptData({ id: concept.id, text: concept.generated_prompt });
    setIsPromptModalOpen(true);
  }

  async function handleSavePrompt() {
    if (!editingPromptData) return;
    setIsSavingPrompt(true);
    try {
      const { error } = await supabase
        .from('concepts')
        .update({ generated_prompt: editingPromptData.text })
        .eq('id', editingPromptData.id);

      if (error) throw error;

      setConcepts(prev => prev.map(c => 
        c.id === editingPromptData.id ? { ...c, generated_prompt: editingPromptData.text } : c
      ));
      setIsPromptModalOpen(false);
      setEditingPromptData(null);
    } catch (error) {
      console.error("Error updating prompt", error);
      alert("Erreur lors de la sauvegarde du prompt.");
    } finally {
      setIsSavingPrompt(false);
    }
  }

  // --- LOGIQUE EDITION CONCEPT CLASSIQUE ---
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

  // --- EXPORTS ---
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
        return [ ...base, c.scroll_stopper, c.problem, c.solution, c.benefits, c.proof, c.cta, c.script_outline ];
      } else {
        return [ ...base, c.problem, c.solution, c.benefits, c.proof, c.cta, c.suggested_visual, c.generated_prompt || '' ];
      }
    });
    const csvContent = [ headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')) ].join('\n');
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
        c.hooks.forEach((h, j) => content += `  ${j + 1}. ${h}\n`);
        
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
          if (c.generated_prompt) content += `Prompt:\n${c.generated_prompt}\n\n`;
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
      {/* HEADER ET ONGLETS */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[#232323]/60 hover:text-[#24B745] font-bold uppercase tracking-wider text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        
        <div className="flex bg-[#232323] p-1 gap-1 rounded-none">
          <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-6 py-2 font-bold uppercase text-xs tracking-wide transition-all rounded-none ${activeTab === 'video' ? 'bg-[#24B745] text-[#FAF5ED]' : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'}`}>
            <Video className="w-4 h-4" /> Concepts Vidéos
          </button>
          <button onClick={() => setActiveTab('static')} className={`flex items-center gap-2 px-6 py-2 font-bold uppercase text-xs tracking-wide transition-all rounded-none ${activeTab === 'static' ? 'bg-[#FFBEFA] text-[#232323]' : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'}`}>
            <ImageIcon className="w-4 h-4" /> Concepts Statiques
          </button>
        </div>
      </div>

      {/* CARTE STRATÉGIE */}
      <div className="bg-[#232323] p-6 mb-6 border-l-4 border-[#24B745] shadow-md rounded-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-[#FAF5ED] uppercase tracking-tighter">{analysisParams.brand_name}</h2>
            <p className="text-[#FAF5ED]/60 text-sm font-mono">{analysisParams.website_url}</p>
          </div>
          <div className="flex gap-2">
            {activeConcepts.length > 0 && (
              <>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-3 bg-[#1f9e3b]/20 hover:bg-[#1f9e3b]/40 text-[#24B745] font-bold uppercase text-xs border border-[#24B745] transition-colors rounded-none">
                  <FileDown className="w-4 h-4" /> CSV
                </button>
                <button onClick={exportToText} className="flex items-center gap-2 px-4 py-3 bg-[#FAF5ED]/10 hover:bg-[#FAF5ED]/20 text-[#FAF5ED] font-bold uppercase text-xs border border-[#FAF5ED]/20 transition-colors rounded-none">
                  <Download className="w-4 h-4" /> TXT
                </button>
              </>
            )}
            {activeTab === 'video' ? (
              <button onClick={handleGenerateVideo} disabled={generatingVideo || !apiKey} className="flex items-center gap-2 px-6 py-3 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] disabled:opacity-50 transition-colors font-bold uppercase text-xs tracking-widest rounded-none">
                {generatingVideo ? <Loader className="w-4 h-4 animate-spin" /> : <><Video className="w-4 h-4" /> Générer Vidéos</>}
              </button>
            ) : (
              <button onClick={handleGenerateStatic} disabled={generatingStatic || !apiKey} className="flex items-center gap-2 px-6 py-3 bg-[#FFBEFA] text-[#232323] hover:bg-[#e0a6dc] disabled:opacity-50 transition-colors font-bold uppercase text-xs tracking-widest rounded-none">
                {generatingStatic ? <Loader className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4" /> Générer Statiques</>}
              </button>
            )}
          </div>
        </div>

        {/* PANNEAU DÉPLIABLE ANALYSE */}
        <div className="bg-[#2A2A2A] border border-[#3A3A3A] overflow-hidden rounded-none">
          <button onClick={() => setIsAnalysisOpen(!isAnalysisOpen)} className="w-full flex items-center justify-between p-3 text-left hover:bg-[#333] transition-colors rounded-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#24B745]" />
              <span className="font-bold text-[#FAF5ED] uppercase text-xs tracking-widest">Stratégie & Analyse (Déplier pour modifier)</span>
            </div>
            {isAnalysisOpen ? <ChevronUp className="w-4 h-4 text-[#FAF5ED]" /> : <ChevronDown className="w-4 h-4 text-[#FAF5ED]" />}
          </button>
          {isAnalysisOpen && (
            <div className="p-4 border-t border-[#3A3A3A] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Nom de l'analyse</label>
                  <input type="text" value={analysisParams.brand_name} onChange={(e) => setAnalysisParams({ ...analysisParams, brand_name: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Offre</label>
                  <textarea value={analysisParams.offer_details} onChange={(e) => setAnalysisParams({ ...analysisParams, offer_details: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={2} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Cible</label>
                  <textarea value={analysisParams.target_audience} onChange={(e) => setAnalysisParams({ ...analysisParams, target_audience: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={3} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Positionnement</label>
                  <textarea value={analysisParams.brand_positioning} onChange={(e) => setAnalysisParams({ ...analysisParams, brand_positioning: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={3} />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveAnalysis} disabled={isSavingAnalysis} className="flex items-center gap-2 px-4 py-2 bg-[#232323] border border-[#24B745] text-[#24B745] hover:bg-[#24B745] hover:text-[#FAF5ED] transition-colors font-bold uppercase text-xs rounded-none">
                  {isSavingAnalysis ? '...' : <><Save className="w-3 h-3" /> Sauvegarder</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLEAU DES CONCEPTS */}
      {loading ? (
        <div className="flex justify-center h-64 items-center"><Loader className="w-8 h-8 animate-spin text-[#232323]" /></div>
      ) : activeConcepts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#232323]/20 rounded-none">
          <p className="text-[#232323] font-medium">Aucun concept généré pour le moment</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { stage: 'TOFU', concepts: tofuConcepts, label: 'Top of Funnel' },
            { stage: 'MOFU', concepts: mofuConcepts, label: 'Middle of Funnel' },
            { stage: 'BOFU', concepts: bofuConcepts, label: 'Bottom of Funnel' },
          ].map(({ stage, concepts: stageConcepts, label }) => (
            stageConcepts.length > 0 && (
              <div key={stage} className="bg-[#232323] p-0 shadow-xl border border-[#232323] overflow-hidden rounded-none">
                <div className="flex items-center justify-between p-4 bg-[#2A2A2A] border-b border-[#3A3A3A]">
                  <h3 className="text-xl font-black text-[#FAF5ED] uppercase tracking-tight">{stage} <span className="text-[#FAF5ED]/40 text-sm font-normal normal-case ml-2">- {label}</span></h3>
                  <button onClick={() => handleDeleteAll(stage)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Tout supprimer</button>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1A1A1A] text-[#FAF5ED]/60 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-4 min-w-[200px]">Concept</th>
                        <th className="p-4 min-w-[100px]">Format</th>
                        <th className="p-4 min-w-[250px]">Hooks</th>
                        <th className="p-4 min-w-[100px]">Objectif</th>
                        <th className="p-4 min-w-[200px]">Problème / Solution</th>
                        <th className="p-4 min-w-[150px]">CTA</th>
                        {activeTab === 'video' ? (
                          <>
                            <th className="p-4 min-w-[200px]">Scroll Stopper</th>
                            <th className="p-4 min-w-[300px]">Script</th>
                          </>
                        ) : (
                          <>
                             <th className="p-4 min-w-[200px]">Visuel Suggéré</th>
                             <th className="p-4 min-w-[320px] sticky right-[50px] bg-[#1A1A1A] z-10 border-l-4 border-[#24B745]">Studio Créa</th>
                          </>
                        )}
                        <th className="w-[50px] sticky right-0 bg-[#1A1A1A] z-10 border-l border-[#3A3A3A]"></th>
                      </tr>
                    </thead>
                    <tbody className="text-[#FAF5ED] text-sm divide-y divide-[#3A3A3A]">
                      {stageConcepts.map((c) => {
                         const isEditing = editingConceptId === c.id;
                         const displayConcept = isEditing ? editedConcept : c;
                         
                         return (
                        <tr key={c.id} className="group hover:bg-[#2A2A2A] transition-colors">
                          <td className="p-4 align-top font-bold">
                            {isEditing ? <textarea value={displayConcept.concept} onChange={e=>setEditedConcept({...editedConcept, concept: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.concept}
                          </td>
                          <td className="p-4 align-top text-[#FAF5ED]/70 text-xs">
                             {isEditing ? <input value={displayConcept.format} onChange={e=>setEditedConcept({...editedConcept, format: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.format}
                          </td>
                          <td className="p-4 align-top">
                             {isEditing ? (
                               <div className="space-y-1">{displayConcept.hooks?.map((h,i)=><input key={i} value={h} onChange={e=>updateHook(i, e.target.value)} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/>)}</div>
                             ) : (
                               <ul className="list-decimal list-inside text-xs space-y-1 text-[#FAF5ED]/80">{c.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
                             )}
                          </td>
                          <td className="p-4 align-top">
                             {isEditing ? <input value={displayConcept.marketing_objective} onChange={e=>setEditedConcept({...editedConcept, marketing_objective: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : <span className="bg-[#FAF5ED]/10 px-2 py-1 text-[10px] font-bold uppercase">{c.marketing_objective}</span>}
                          </td>
                          <td className="p-4 align-top text-xs space-y-2">
                            {isEditing ? (
                              <>
                                <textarea value={displayConcept.problem} onChange={e=>setEditedConcept({...editedConcept, problem: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none mb-1"/>
                                <textarea value={displayConcept.solution} onChange={e=>setEditedConcept({...editedConcept, solution: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/>
                              </>
                            ) : (
                              <>
                                <div><span className="text-[#24B745] font-bold">P:</span> {c.problem}</div>
                                <div><span className="text-[#24B745] font-bold">S:</span> {c.solution}</div>
                              </>
                            )}
                          </td>
                          <td className="p-4 align-top text-xs font-bold text-[#24B745]">
                            {isEditing ? <input value={displayConcept.cta} onChange={e=>setEditedConcept({...editedConcept, cta: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.cta}
                          </td>
                          
                          {activeTab === 'video' ? (
                            <>
                              <td className="p-4 align-top text-xs">{c.scroll_stopper}</td>
                              <td className="p-4 align-top text-xs font-mono bg-[#1A1A1A]/50 p-2">{c.script_outline}</td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 align-top text-xs">{c.suggested_visual}</td>
                              
                              {/* COLONNE STUDIO STICKY */}
                              <td className="p-4 align-top sticky right-[50px] bg-[#232323] group-hover:bg-[#2A2A2A] border-l-4 border-[#24B745] z-10 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                                <div className="space-y-3">
                                  <button onClick={() => handleGeneratePrompt(c)} disabled={generatingPromptId===c.id} className="w-full py-2 bg-[#24B745]/10 hover:bg-[#24B745] text-[#24B745] hover:text-[#FAF5ED] border border-[#24B745] transition-colors text-[10px] font-bold uppercase tracking-widest rounded-none">
                                    {generatingPromptId===c.id ? '...' : (c.generated_prompt ? 'Régénérer Prompt' : 'Générer Prompt')}
                                  </button>
                                  
                                  {c.generated_prompt && (
                                    <div className="bg-[#1A1A1A] p-3 border border-[#3A3A3A]">
                                      {/* ZONE DU PROMPT AVEC BOUTON EDIT */}
                                      <div className="relative group/prompt mb-2">
                                        <p className="text-[10px] text-[#FAF5ED]/60 line-clamp-3 font-mono pr-5">{c.generated_prompt}</p>
                                        <button onClick={() => openPromptModal(c)} className="absolute top-0 right-0 text-[#24B745] hover:text-white p-1" title="Modifier le prompt">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      
                                      <button onClick={() => {navigator.clipboard.writeText(c.generated_prompt!); alert('Copié !')}} className="text-[9px] text-[#24B745] hover:underline mb-2 block text-right">Copier tout</button>
                                      
                                      {c.image_url && (
                                        <div className="relative group/img mb-2">
                                          <img src={c.image_url} className="w-full h-32 object-cover border border-[#3A3A3A]" />
                                          <button onClick={() => setModalImageUrl(c.image_url || null)} className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest transition-opacity">Agrandir</button>
                                          <button onClick={() => handleDownloadImage(c)} className="absolute top-2 right-2 bg-[#232323] p-1 hover:text-[#24B745]"><DownloadIcon className="w-4 h-4" /></button>
                                        </div>
                                      )}
                                      
                                      {/* ZONE DE GÉNÉRATION (Toujours visible pour permettre la régénération) */}
                                      <div className="flex gap-1">
                                        <select className="bg-[#232323] text-[#FAF5ED] text-[10px] border border-[#3A3A3A] w-20 rounded-none" onChange={(e) => setSelectedProvider({...selectedProvider, [c.id]: e.target.value as any})}>
                                          <option value="openai">DALL-E</option>
                                          <option value="ideogram">Ideogram</option>
                                          <option value="google">Google</option>
                                          <option value="nano-banana">Nano Banana</option>
                                        </select>
                                        <button onClick={() => handleGenerateImage(c)} disabled={generatingImageId===c.id} className={`flex-1 py-2 font-bold text-[10px] uppercase rounded-none flex items-center justify-center gap-1 ${c.image_url ? 'bg-[#232323] text-[#FAF5ED] border border-[#FAF5ED]/20 hover:bg-[#2A2A2A]' : 'bg-[#FAF5ED] text-[#232323] hover:bg-white'}`}>
                                          {generatingImageId===c.id ? '...' : (c.image_url ? <><RefreshCw className="w-3 h-3" /> Regénérer</> : 'Générer')}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                          
                          <td className="p-4 align-top sticky right-0 bg-[#232323] group-hover:bg-[#2A2A2A] border-l border-[#3A3A3A] z-10">
                            <div className="flex flex-col gap-2">
                              {!isEditing ? (
                                <>
                                  <button onClick={() => startEditing(c)} className="text-[#FAF5ED]/20 hover:text-[#24B745]"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={(e) => handleDeleteConcept(c.id, e)} className="text-[#FAF5ED]/20 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={saveEdit} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      
      {/* MODALE VISUALISATION IMAGE */}
      {modalImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setModalImageUrl(null)}>
          <div className="relative max-w-7xl max-h-[90vh]">
            <img src={modalImageUrl} className="max-w-full max-h-full object-contain border-2 border-[#24B745]" />
          </div>
        </div>
      )}

      {/* MODALE EDITION PROMPT */}
      {isPromptModalOpen && editingPromptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#232323] border border-[#24B745] w-full max-w-3xl shadow-2xl p-6 relative rounded-none">
            <button onClick={() => setIsPromptModalOpen(false)} className="absolute top-4 right-4 text-[#FAF5ED]/50 hover:text-[#FAF5ED]">
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 text-[#24B745]">
              <PenTool className="w-5 h-5" />
              <h3 className="text-lg font-bold uppercase tracking-widest">Modifier le Prompt</h3>
            </div>
            
            <div className="mb-4">
              <textarea 
                value={editingPromptData.text} 
                onChange={(e) => setEditingPromptData({...editingPromptData, text: e.target.value})} 
                className="w-full h-64 bg-[#1A1A1A] border border-[#3A3A3A] text-[#FAF5ED] p-4 font-mono text-sm focus:border-[#24B745] outline-none resize-none rounded-none"
                placeholder="Entrez votre prompt ici..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPromptModalOpen(false)} className="px-6 py-2 border border-[#3A3A3A] text-[#FAF5ED] hover:bg-[#3A3A3A] font-bold uppercase text-xs tracking-wider transition-colors rounded-none">
                Annuler
              </button>
              <button onClick={handleSavePrompt} disabled={isSavingPrompt} className="px-6 py-2 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] font-bold uppercase text-xs tracking-wider transition-colors rounded-none disabled:opacity-50">
                {isSavingPrompt ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
EOFcat << 'EOF' > src/components/ConceptsView.tsx
import { useState, useEffect } from 'react';
import { supabase, Analysis, Concept, Client } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateVideoConcepts, generateStaticConcepts, generateImage, generateImageIdeogram, generateImageGoogle, generateImageNanoBanana } from '../services/openaiService';
import { generateImagePrompt } from '../services/promptGenerationService';
import { ArrowLeft, Loader, Download, FileDown, Trash2, X, Image as ImageIcon, Edit2, Check, DownloadIcon, Sparkles, Video, ChevronDown, ChevronUp, Save, PenTool, RefreshCw } from 'lucide-react';

interface ConceptsViewProps {
  analysis: Analysis;
  onBack: () => void;
}

type ImageProvider = 'openai' | 'ideogram' | 'google' | 'nano-banana';
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
  
  // States d'édition standard
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [editedConcept, setEditedConcept] = useState<Partial<Concept>>({});
  const [selectedProvider, setSelectedProvider] = useState<Record<string, ImageProvider>>({});
  
  // --- NOUVEAU : States pour l'édition du PROMPT (Modal) ---
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPromptData, setEditingPromptData] = useState<{id: string, text: string} | null>(null);
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // States pour les clés API et données
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [higgsfieldApiKey, setHiggsfieldApiKey] = useState('');
  const [higgsfieldSecret, setHiggsfieldSecret] = useState('');
  
  const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);

  useEffect(() => {
    setAnalysisParams(analysis);
    loadConcepts();
    loadApiKey();
    loadClientData();
  }, [analysis.id]);

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
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setApiKey(data.openai_api_key || '');
        setIdeogramApiKey(data.ideogram_api_key || '');
        setGoogleApiKey(data.google_api_key || '');
        setHiggsfieldApiKey(data.higgsfield_api_key || '');
        setHiggsfieldSecret(data.higgsfield_secret || '');
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
          brand_name: analysisParams.brand_name,
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

  // --- GENERATION FUNCTIONS (Video/Static) ---
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

      const { error } = await supabase.from('concepts').insert(conceptsToInsert);
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

      const { error } = await supabase.from('concepts').insert(conceptsToInsert);
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
    if (provider === 'nano-banana' && (!higgsfieldApiKey || !higgsfieldSecret)) {
      alert('Veuillez configurer vos clés Nano Banana (API Key & Secret) dans les paramètres');
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
      } else if (provider === 'nano-banana') {
        imageUrl = await generateImageNanoBanana(promptToUse, higgsfieldApiKey, higgsfieldSecret);
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
      alert(`Erreur lors de la génération de l'image avec ${provider}:\n\n${errorMessage}\n\nVérifiez vos clés API et votre connexion.`);
    } finally {
      setGeneratingImageId(null);
    }
  }

  // --- FONCTIONS POUR LA GESTION DES IMAGES ET MODIFICATIONS ---

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
    // Pour les URLs normales, on tente le téléchargement via proxy ou direct
    try {
        const response = await fetch(concept.image_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${concept.concept.substring(0, 30).replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (e) {
        // Fallback simple: ouvrir dans un nouvel onglet
        window.open(concept.image_url, '_blank');
    }
  }

  // --- LOGIQUE EDITION PROMPT (MODALE) ---
  function openPromptModal(concept: Concept) {
    if (!concept.generated_prompt) return;
    setEditingPromptData({ id: concept.id, text: concept.generated_prompt });
    setIsPromptModalOpen(true);
  }

  async function handleSavePrompt() {
    if (!editingPromptData) return;
    setIsSavingPrompt(true);
    try {
      const { error } = await supabase
        .from('concepts')
        .update({ generated_prompt: editingPromptData.text })
        .eq('id', editingPromptData.id);

      if (error) throw error;

      setConcepts(prev => prev.map(c => 
        c.id === editingPromptData.id ? { ...c, generated_prompt: editingPromptData.text } : c
      ));
      setIsPromptModalOpen(false);
      setEditingPromptData(null);
    } catch (error) {
      console.error("Error updating prompt", error);
      alert("Erreur lors de la sauvegarde du prompt.");
    } finally {
      setIsSavingPrompt(false);
    }
  }

  // --- LOGIQUE EDITION CONCEPT CLASSIQUE ---
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

  // --- EXPORTS ---
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
        return [ ...base, c.scroll_stopper, c.problem, c.solution, c.benefits, c.proof, c.cta, c.script_outline ];
      } else {
        return [ ...base, c.problem, c.solution, c.benefits, c.proof, c.cta, c.suggested_visual, c.generated_prompt || '' ];
      }
    });
    const csvContent = [ headers.join(','), ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')) ].join('\n');
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
        c.hooks.forEach((h, j) => content += `  ${j + 1}. ${h}\n`);
        
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
          if (c.generated_prompt) content += `Prompt:\n${c.generated_prompt}\n\n`;
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
      {/* HEADER ET ONGLETS */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-[#232323]/60 hover:text-[#24B745] font-bold uppercase tracking-wider text-xs transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
        
        <div className="flex bg-[#232323] p-1 gap-1 rounded-none">
          <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-6 py-2 font-bold uppercase text-xs tracking-wide transition-all rounded-none ${activeTab === 'video' ? 'bg-[#24B745] text-[#FAF5ED]' : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'}`}>
            <Video className="w-4 h-4" /> Concepts Vidéos
          </button>
          <button onClick={() => setActiveTab('static')} className={`flex items-center gap-2 px-6 py-2 font-bold uppercase text-xs tracking-wide transition-all rounded-none ${activeTab === 'static' ? 'bg-[#FFBEFA] text-[#232323]' : 'text-[#FAF5ED]/50 hover:text-[#FAF5ED]'}`}>
            <ImageIcon className="w-4 h-4" /> Concepts Statiques
          </button>
        </div>
      </div>

      {/* CARTE STRATÉGIE */}
      <div className="bg-[#232323] p-6 mb-6 border-l-4 border-[#24B745] shadow-md rounded-none">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-black text-[#FAF5ED] uppercase tracking-tighter">{analysisParams.brand_name}</h2>
            <p className="text-[#FAF5ED]/60 text-sm font-mono">{analysisParams.website_url}</p>
          </div>
          <div className="flex gap-2">
            {activeConcepts.length > 0 && (
              <>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-3 bg-[#1f9e3b]/20 hover:bg-[#1f9e3b]/40 text-[#24B745] font-bold uppercase text-xs border border-[#24B745] transition-colors rounded-none">
                  <FileDown className="w-4 h-4" /> CSV
                </button>
                <button onClick={exportToText} className="flex items-center gap-2 px-4 py-3 bg-[#FAF5ED]/10 hover:bg-[#FAF5ED]/20 text-[#FAF5ED] font-bold uppercase text-xs border border-[#FAF5ED]/20 transition-colors rounded-none">
                  <Download className="w-4 h-4" /> TXT
                </button>
              </>
            )}
            {activeTab === 'video' ? (
              <button onClick={handleGenerateVideo} disabled={generatingVideo || !apiKey} className="flex items-center gap-2 px-6 py-3 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] disabled:opacity-50 transition-colors font-bold uppercase text-xs tracking-widest rounded-none">
                {generatingVideo ? <Loader className="w-4 h-4 animate-spin" /> : <><Video className="w-4 h-4" /> Générer Vidéos</>}
              </button>
            ) : (
              <button onClick={handleGenerateStatic} disabled={generatingStatic || !apiKey} className="flex items-center gap-2 px-6 py-3 bg-[#FFBEFA] text-[#232323] hover:bg-[#e0a6dc] disabled:opacity-50 transition-colors font-bold uppercase text-xs tracking-widest rounded-none">
                {generatingStatic ? <Loader className="w-4 h-4 animate-spin" /> : <><ImageIcon className="w-4 h-4" /> Générer Statiques</>}
              </button>
            )}
          </div>
        </div>

        {/* PANNEAU DÉPLIABLE ANALYSE */}
        <div className="bg-[#2A2A2A] border border-[#3A3A3A] overflow-hidden rounded-none">
          <button onClick={() => setIsAnalysisOpen(!isAnalysisOpen)} className="w-full flex items-center justify-between p-3 text-left hover:bg-[#333] transition-colors rounded-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#24B745]" />
              <span className="font-bold text-[#FAF5ED] uppercase text-xs tracking-widest">Stratégie & Analyse (Déplier pour modifier)</span>
            </div>
            {isAnalysisOpen ? <ChevronUp className="w-4 h-4 text-[#FAF5ED]" /> : <ChevronDown className="w-4 h-4 text-[#FAF5ED]" />}
          </button>
          {isAnalysisOpen && (
            <div className="p-4 border-t border-[#3A3A3A] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Nom de l'analyse</label>
                  <input type="text" value={analysisParams.brand_name} onChange={(e) => setAnalysisParams({ ...analysisParams, brand_name: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Offre</label>
                  <textarea value={analysisParams.offer_details} onChange={(e) => setAnalysisParams({ ...analysisParams, offer_details: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={2} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Cible</label>
                  <textarea value={analysisParams.target_audience} onChange={(e) => setAnalysisParams({ ...analysisParams, target_audience: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={3} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#24B745] uppercase tracking-wider mb-1">Positionnement</label>
                  <textarea value={analysisParams.brand_positioning} onChange={(e) => setAnalysisParams({ ...analysisParams, brand_positioning: e.target.value })} className="w-full bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] p-2 text-sm focus:border-[#24B745] rounded-none" rows={3} />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={handleSaveAnalysis} disabled={isSavingAnalysis} className="flex items-center gap-2 px-4 py-2 bg-[#232323] border border-[#24B745] text-[#24B745] hover:bg-[#24B745] hover:text-[#FAF5ED] transition-colors font-bold uppercase text-xs rounded-none">
                  {isSavingAnalysis ? '...' : <><Save className="w-3 h-3" /> Sauvegarder</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TABLEAU DES CONCEPTS */}
      {loading ? (
        <div className="flex justify-center h-64 items-center"><Loader className="w-8 h-8 animate-spin text-[#232323]" /></div>
      ) : activeConcepts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#232323]/20 rounded-none">
          <p className="text-[#232323] font-medium">Aucun concept généré pour le moment</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { stage: 'TOFU', concepts: tofuConcepts, label: 'Top of Funnel' },
            { stage: 'MOFU', concepts: mofuConcepts, label: 'Middle of Funnel' },
            { stage: 'BOFU', concepts: bofuConcepts, label: 'Bottom of Funnel' },
          ].map(({ stage, concepts: stageConcepts, label }) => (
            stageConcepts.length > 0 && (
              <div key={stage} className="bg-[#232323] p-0 shadow-xl border border-[#232323] overflow-hidden rounded-none">
                <div className="flex items-center justify-between p-4 bg-[#2A2A2A] border-b border-[#3A3A3A]">
                  <h3 className="text-xl font-black text-[#FAF5ED] uppercase tracking-tight">{stage} <span className="text-[#FAF5ED]/40 text-sm font-normal normal-case ml-2">- {label}</span></h3>
                  <button onClick={() => handleDeleteAll(stage)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase flex items-center gap-1"><Trash2 className="w-3 h-3" /> Tout supprimer</button>
                </div>
                
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#1A1A1A] text-[#FAF5ED]/60 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-4 min-w-[200px]">Concept</th>
                        <th className="p-4 min-w-[100px]">Format</th>
                        <th className="p-4 min-w-[250px]">Hooks</th>
                        <th className="p-4 min-w-[100px]">Objectif</th>
                        <th className="p-4 min-w-[200px]">Problème / Solution</th>
                        <th className="p-4 min-w-[150px]">CTA</th>
                        {activeTab === 'video' ? (
                          <>
                            <th className="p-4 min-w-[200px]">Scroll Stopper</th>
                            <th className="p-4 min-w-[300px]">Script</th>
                          </>
                        ) : (
                          <>
                             <th className="p-4 min-w-[200px]">Visuel Suggéré</th>
                             <th className="p-4 min-w-[320px] sticky right-[50px] bg-[#1A1A1A] z-10 border-l-4 border-[#24B745]">Studio Créa</th>
                          </>
                        )}
                        <th className="w-[50px] sticky right-0 bg-[#1A1A1A] z-10 border-l border-[#3A3A3A]"></th>
                      </tr>
                    </thead>
                    <tbody className="text-[#FAF5ED] text-sm divide-y divide-[#3A3A3A]">
                      {stageConcepts.map((c) => {
                         const isEditing = editingConceptId === c.id;
                         const displayConcept = isEditing ? editedConcept : c;
                         
                         return (
                        <tr key={c.id} className="group hover:bg-[#2A2A2A] transition-colors">
                          <td className="p-4 align-top font-bold">
                            {isEditing ? <textarea value={displayConcept.concept} onChange={e=>setEditedConcept({...editedConcept, concept: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.concept}
                          </td>
                          <td className="p-4 align-top text-[#FAF5ED]/70 text-xs">
                             {isEditing ? <input value={displayConcept.format} onChange={e=>setEditedConcept({...editedConcept, format: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.format}
                          </td>
                          <td className="p-4 align-top">
                             {isEditing ? (
                               <div className="space-y-1">{displayConcept.hooks?.map((h,i)=><input key={i} value={h} onChange={e=>updateHook(i, e.target.value)} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/>)}</div>
                             ) : (
                               <ul className="list-decimal list-inside text-xs space-y-1 text-[#FAF5ED]/80">{c.hooks.map((h, i) => <li key={i}>{h}</li>)}</ul>
                             )}
                          </td>
                          <td className="p-4 align-top">
                             {isEditing ? <input value={displayConcept.marketing_objective} onChange={e=>setEditedConcept({...editedConcept, marketing_objective: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : <span className="bg-[#FAF5ED]/10 px-2 py-1 text-[10px] font-bold uppercase">{c.marketing_objective}</span>}
                          </td>
                          <td className="p-4 align-top text-xs space-y-2">
                            {isEditing ? (
                              <>
                                <textarea value={displayConcept.problem} onChange={e=>setEditedConcept({...editedConcept, problem: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none mb-1"/>
                                <textarea value={displayConcept.solution} onChange={e=>setEditedConcept({...editedConcept, solution: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/>
                              </>
                            ) : (
                              <>
                                <div><span className="text-[#24B745] font-bold">P:</span> {c.problem}</div>
                                <div><span className="text-[#24B745] font-bold">S:</span> {c.solution}</div>
                              </>
                            )}
                          </td>
                          <td className="p-4 align-top text-xs font-bold text-[#24B745]">
                            {isEditing ? <input value={displayConcept.cta} onChange={e=>setEditedConcept({...editedConcept, cta: e.target.value})} className="w-full bg-[#1A1A1A] text-[#FAF5ED] border border-[#3A3A3A] p-1 text-xs rounded-none"/> : c.cta}
                          </td>
                          
                          {activeTab === 'video' ? (
                            <>
                              <td className="p-4 align-top text-xs">{c.scroll_stopper}</td>
                              <td className="p-4 align-top text-xs font-mono bg-[#1A1A1A]/50 p-2">{c.script_outline}</td>
                            </>
                          ) : (
                            <>
                              <td className="p-4 align-top text-xs">{c.suggested_visual}</td>
                              
                              {/* COLONNE STUDIO STICKY */}
                              <td className="p-4 align-top sticky right-[50px] bg-[#232323] group-hover:bg-[#2A2A2A] border-l-4 border-[#24B745] z-10 shadow-[-10px_0_20px_-5px_rgba(0,0,0,0.5)]">
                                <div className="space-y-3">
                                  <button onClick={() => handleGeneratePrompt(c)} disabled={generatingPromptId===c.id} className="w-full py-2 bg-[#24B745]/10 hover:bg-[#24B745] text-[#24B745] hover:text-[#FAF5ED] border border-[#24B745] transition-colors text-[10px] font-bold uppercase tracking-widest rounded-none">
                                    {generatingPromptId===c.id ? '...' : (c.generated_prompt ? 'Régénérer Prompt' : 'Générer Prompt')}
                                  </button>
                                  
                                  {c.generated_prompt && (
                                    <div className="bg-[#1A1A1A] p-3 border border-[#3A3A3A]">
                                      {/* ZONE DU PROMPT AVEC BOUTON EDIT */}
                                      <div className="relative group/prompt mb-2">
                                        <p className="text-[10px] text-[#FAF5ED]/60 line-clamp-3 font-mono pr-5">{c.generated_prompt}</p>
                                        <button onClick={() => openPromptModal(c)} className="absolute top-0 right-0 text-[#24B745] hover:text-white p-1" title="Modifier le prompt">
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      
                                      <button onClick={() => {navigator.clipboard.writeText(c.generated_prompt!); alert('Copié !')}} className="text-[9px] text-[#24B745] hover:underline mb-2 block text-right">Copier tout</button>
                                      
                                      {c.image_url && (
                                        <div className="relative group/img mb-2">
                                          <img src={c.image_url} className="w-full h-32 object-cover border border-[#3A3A3A]" />
                                          <button onClick={() => setModalImageUrl(c.image_url || null)} className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white text-xs font-bold uppercase tracking-widest transition-opacity">Agrandir</button>
                                          <button onClick={() => handleDownloadImage(c)} className="absolute top-2 right-2 bg-[#232323] p-1 hover:text-[#24B745]"><DownloadIcon className="w-4 h-4" /></button>
                                        </div>
                                      )}
                                      
                                      {/* ZONE DE GÉNÉRATION (Toujours visible pour permettre la régénération) */}
                                      <div className="flex gap-1">
                                        <select className="bg-[#232323] text-[#FAF5ED] text-[10px] border border-[#3A3A3A] w-20 rounded-none" onChange={(e) => setSelectedProvider({...selectedProvider, [c.id]: e.target.value as any})}>
                                          <option value="openai">DALL-E</option>
                                          <option value="ideogram">Ideogram</option>
                                          <option value="google">Google</option>
                                          <option value="nano-banana">Nano Banana</option>
                                        </select>
                                        <button onClick={() => handleGenerateImage(c)} disabled={generatingImageId===c.id} className={`flex-1 py-2 font-bold text-[10px] uppercase rounded-none flex items-center justify-center gap-1 ${c.image_url ? 'bg-[#232323] text-[#FAF5ED] border border-[#FAF5ED]/20 hover:bg-[#2A2A2A]' : 'bg-[#FAF5ED] text-[#232323] hover:bg-white'}`}>
                                          {generatingImageId===c.id ? '...' : (c.image_url ? <><RefreshCw className="w-3 h-3" /> Regénérer</> : 'Générer')}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                          
                          <td className="p-4 align-top sticky right-0 bg-[#232323] group-hover:bg-[#2A2A2A] border-l border-[#3A3A3A] z-10">
                            <div className="flex flex-col gap-2">
                              {!isEditing ? (
                                <>
                                  <button onClick={() => startEditing(c)} className="text-[#FAF5ED]/20 hover:text-[#24B745]"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={(e) => handleDeleteConcept(c.id, e)} className="text-[#FAF5ED]/20 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={saveEdit} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      
      {/* MODALE VISUALISATION IMAGE */}
      {modalImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setModalImageUrl(null)}>
          <div className="relative max-w-7xl max-h-[90vh]">
            <img src={modalImageUrl} className="max-w-full max-h-full object-contain border-2 border-[#24B745]" />
          </div>
        </div>
      )}

      {/* MODALE EDITION PROMPT */}
      {isPromptModalOpen && editingPromptData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-[#232323] border border-[#24B745] w-full max-w-3xl shadow-2xl p-6 relative rounded-none">
            <button onClick={() => setIsPromptModalOpen(false)} className="absolute top-4 right-4 text-[#FAF5ED]/50 hover:text-[#FAF5ED]">
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-2 mb-4 text-[#24B745]">
              <PenTool className="w-5 h-5" />
              <h3 className="text-lg font-bold uppercase tracking-widest">Modifier le Prompt</h3>
            </div>
            
            <div className="mb-4">
              <textarea 
                value={editingPromptData.text} 
                onChange={(e) => setEditingPromptData({...editingPromptData, text: e.target.value})} 
                className="w-full h-64 bg-[#1A1A1A] border border-[#3A3A3A] text-[#FAF5ED] p-4 font-mono text-sm focus:border-[#24B745] outline-none resize-none rounded-none"
                placeholder="Entrez votre prompt ici..."
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsPromptModalOpen(false)} className="px-6 py-2 border border-[#3A3A3A] text-[#FAF5ED] hover:bg-[#3A3A3A] font-bold uppercase text-xs tracking-wider transition-colors rounded-none">
                Annuler
              </button>
              <button onClick={handleSavePrompt} disabled={isSavingPrompt} className="px-6 py-2 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] font-bold uppercase text-xs tracking-wider transition-colors rounded-none disabled:opacity-50">
                {isSavingPrompt ? 'Sauvegarde...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
