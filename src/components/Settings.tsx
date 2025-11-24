import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Save, Key, ExternalLink } from 'lucide-react';

interface SettingsProps { onBack: () => void; }

export default function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [ideogramApiKey, setIdeogramApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [higgsfieldApiKey, setHiggsfieldApiKey] = useState('');
  const [higgsfieldSecret, setHiggsfieldSecret] = useState('');
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    if (!user) return;
    const { data } = await supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle();
    if (data) {
      setApiKey(data.openai_api_key || '');
      setIdeogramApiKey(data.ideogram_api_key || '');
      setGoogleApiKey(data.google_api_key || '');
      setHiggsfieldApiKey(data.higgsfield_api_key || '');
      setHiggsfieldSecret(data.higgsfield_secret || '');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from('settings').select('id').eq('user_id', user.id).maybeSingle();
      
      const updates = { 
        openai_api_key: apiKey, 
        ideogram_api_key: ideogramApiKey, 
        google_api_key: googleApiKey,
        higgsfield_api_key: higgsfieldApiKey,
        higgsfield_secret: higgsfieldSecret,
        updated_at: new Date().toISOString() 
      };

      if (existing) await supabase.from('settings').update(updates).eq('id', existing.id);
      else await supabase.from('settings').insert({ user_id: user.id, ...updates });
      
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (error) { alert('Erreur lors de la sauvegarde'); console.error(error); } finally { setSaving(false); }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-[#232323]/60 hover:text-[#24B745] mb-8 font-bold uppercase tracking-wider text-xs">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="bg-[#232323] p-8 shadow-[8px_8px_0px_0px_#24B745] border-2 border-[#232323]">
        <h2 className="text-2xl font-black text-[#FAF5ED] mb-8 uppercase tracking-tight">Paramètres API</h2>

        <form onSubmit={handleSave} className="space-y-6">
          {/* OpenAI */}
          <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#24B745]">OpenAI API Key (DALL-E 3)</label>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[10px] text-[#FAF5ED]/50 hover:text-[#FAF5ED] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Obtenir</a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF5ED]/30" />
              <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] outline-none text-sm font-mono" />
            </div>
          </div>

          {/* Ideogram */}
          <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#FFBEFA]">Ideogram API Key</label>
              <a href="https://ideogram.ai/manage-api" target="_blank" rel="noreferrer" className="text-[10px] text-[#FAF5ED]/50 hover:text-[#FAF5ED] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Obtenir</a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF5ED]/30" />
              <input type="password" value={ideogramApiKey} onChange={(e) => setIdeogramApiKey(e.target.value)} placeholder="sk-..." className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] outline-none text-sm font-mono" />
            </div>
          </div>

          {/* Google */}
          <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A]">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-blue-400">Google Gemini API Key</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-[#FAF5ED]/50 hover:text-[#FAF5ED] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Obtenir</a>
            </div>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF5ED]/30" />
              <input type="password" value={googleApiKey} onChange={(e) => setGoogleApiKey(e.target.value)} placeholder="AIza..." className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] outline-none text-sm font-mono" />
            </div>
          </div>

          {/* Higgsfield (Nano Banana) */}
          <div className="p-4 bg-[#2A2A2A] border border-[#3A3A3A] border-l-4 border-l-yellow-400">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-yellow-400">Nano Banana (Higgsfield)</label>
              <a href="https://cloud.higgsfield.ai/" target="_blank" rel="noreferrer" className="text-[10px] text-[#FAF5ED]/50 hover:text-[#FAF5ED] flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Obtenir</a>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-[#FAF5ED]/50 uppercase font-bold mb-1 block">API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF5ED]/30" />
                  <input type="password" value={higgsfieldApiKey} onChange={(e) => setHiggsfieldApiKey(e.target.value)} placeholder="API Key..." className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-yellow-400 outline-none text-sm font-mono" />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-[#FAF5ED]/50 uppercase font-bold mb-1 block">API Secret</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FAF5ED]/30" />
                  <input type="password" value={higgsfieldSecret} onChange={(e) => setHiggsfieldSecret(e.target.value)} placeholder="Secret..." className="w-full pl-10 pr-4 py-3 bg-[#232323] border border-[#3A3A3A] text-[#FAF5ED] focus:border-yellow-400 outline-none text-sm font-mono" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] transition-colors font-bold uppercase tracking-widest text-xs shadow-lg">
              <Save className="w-4 h-4" /> {saving ? '...' : 'Sauvegarder'}
            </button>
            {saved && <span className="text-[#24B745] text-xs font-bold uppercase tracking-wide animate-pulse">✓ Sauvegardé</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
