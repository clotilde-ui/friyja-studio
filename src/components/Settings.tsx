import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Key, ExternalLink } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
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
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaved(false);

    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      const updates = {
        openai_api_key: apiKey,
        ideogram_api_key: ideogramApiKey,
        google_api_key: googleApiKey,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update(updates)
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({
            user_id: user.id,
            ...updates
          });

        if (error) throw error;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour
      </button>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Paramètres API</h2>

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* OPENAI */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-700">
                OpenAI API Key (DALL-E 3)
              </label>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#26B743] hover:underline flex items-center gap-1"
              >
                Obtenir une clé <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#26B743] focus:border-transparent"
              />
            </div>
          </div>

          {/* GOOGLE GEMINI */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-blue-900">
                Google Gemini API Key (Imagen 3)
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                Obtenir une clé <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="password"
                value={googleApiKey}
                onChange={(e) => setGoogleApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <p className="text-xs text-blue-600 mt-2">
              Recommandé : Meilleur rapport qualité/prix ($0.025/image)
            </p>
          </div>

          {/* IDEOGRAM */}
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-purple-900">
                Ideogram API Key
              </label>
              <a
                href="https://ideogram.ai/manage-api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-purple-600 hover:underline flex items-center gap-1"
              >
                Obtenir une clé <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
              <input
                type="password"
                value={ideogramApiKey}
                onChange={(e) => setIdeogramApiKey(e.target.value)}
                placeholder="I_..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#26B743] text-white font-medium rounded-lg hover:bg-[#1f9336] disabled:bg-slate-400 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Sauvegarde...' : 'Sauvegarder les clés'}
            </button>
            {saved && (
              <span className="text-green-600 text-sm font-medium animate-fade-in flex items-center gap-1">
                ✓ Paramètres sauvegardés
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}