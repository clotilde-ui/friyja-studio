import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Sparkles } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
        });
        if (error) throw error;
        setMessage('Email envoyé.');
        setEmail('');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF5ED] flex items-center justify-center p-4 font-sans">
      <div className="max-w-5xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        {/* Colonne Texte */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#24B745] p-3 shadow-[6px_6px_0px_0px_#232323] border-2 border-[#232323]">
              <Sparkles className="w-8 h-8 text-[#FAF5ED]" />
            </div>
            <h1 className="text-5xl font-black text-[#232323] uppercase tracking-tighter">Freyja<br/>Studio</h1>
          </div>

          <p className="text-xl text-[#232323] font-medium leading-relaxed border-l-4 border-[#24B745] pl-6">
            Intelligence créative radicale pour vos campagnes publicitaires.
          </p>
        </div>

        {/* Carte Formulaire : Fond Anthracite, Texte Beige */}
        <div className="bg-[#232323] text-[#FAF5ED] p-10 shadow-[15px_15px_0px_0px_#24B745] border-4 border-[#232323]">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 uppercase tracking-wide text-[#FAF5ED]">
              {isForgotPassword ? 'Récupération' : isLogin ? 'Connexion' : 'Inscription'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] transition-colors placeholder-[#FAF5ED]/30"
                placeholder="votre@email.com"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] transition-colors placeholder-[#FAF5ED]/30"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && <div className="bg-red-500/20 border-l-4 border-red-500 text-red-200 px-4 py-3 text-sm font-medium">{error}</div>}
            {message && <div className="bg-green-500/20 border-l-4 border-green-500 text-green-200 px-4 py-3 text-sm font-medium">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#24B745] hover:bg-[#1f9e3b] text-[#FAF5ED] font-black uppercase tracking-widest py-4 px-6 border-2 border-[#24B745] hover:border-[#1f9e3b] transition-all active:translate-y-1"
            >
              {loading ? '...' : (isForgotPassword ? 'Envoyer' : isLogin ? 'Entrer' : 'Créer')}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[#FAF5ED]/10 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setIsForgotPassword(false); }}
              className="text-[#FAF5ED]/60 hover:text-[#24B745] text-sm font-bold uppercase tracking-wide transition-colors"
            >
              {isLogin ? "Créer un compte" : 'Se connecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}