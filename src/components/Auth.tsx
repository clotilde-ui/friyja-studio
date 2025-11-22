import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader, Sparkles } from 'lucide-react';

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
        setMessage('Un email de réinitialisation a été envoyé à votre adresse.');
        setEmail('');
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  }

  return (
    // Fond Crème #FAF5ED
    <div className="min-h-screen bg-[#FAF5ED] flex items-center justify-center p-4 font-sans">
      <div className="max-w-6xl w-full grid md:grid-cols-2 gap-8 items-center">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#24B745] p-2 rounded-lg shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-[#232323]">Freyja Studio</h1>
          </div>

          <p className="text-xl text-[#232323] leading-relaxed">
            L'intelligence créative au service de votre performance publicitaire.
          </p>

          <div className="space-y-4 text-[#232323]">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#24B745] flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">1</div>
              <div>
                <h3 className="font-bold">Analyse Stratégique</h3>
                <p className="text-sm text-gray-600">Extraction automatique de l'identité et du positionnement.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#24B745] flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">2</div>
              <div>
                <h3 className="font-bold">Concepts TOFU/MOFU/BOFU</h3>
                <p className="text-sm text-gray-600">Génération de scripts vidéos et visuels statiques.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#24B745] flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-xs font-bold">3</div>
              <div>
                <h3 className="font-bold">Production Visuelle</h3>
                <p className="text-sm text-gray-600">Génération d'images DALL-E 3 / Ideogram avec prompts experts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CARTE NOIRE #232323 avec Texte Crème #FAF5ED */}
        <div className="bg-[#232323] text-[#FAF5ED] rounded-2xl shadow-2xl p-8 border border-[#24B745]/20">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">
              {isForgotPassword ? 'Réinitialiser le mot de passe' : isLogin ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-gray-400 text-sm">
              {isForgotPassword ? 'Recevez un lien de réinitialisation par email' : isLogin ? 'Accédez à votre espace Freyja' : 'Commencez gratuitement'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:border-[#24B745] focus:ring-1 focus:ring-[#24B745] text-[#FAF5ED] placeholder-gray-500 transition-colors"
                placeholder="votre@email.com"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#2A2A2A] border border-gray-700 rounded-lg focus:outline-none focus:border-[#24B745] focus:ring-1 focus:ring-[#24B745] text-[#FAF5ED] placeholder-gray-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(''); setMessage(''); }}
                  className="text-[#24B745] hover:text-[#2ce253] text-sm font-medium transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
            {message && <div className="bg-green-500/10 border border-green-500/50 text-green-400 px-4 py-3 rounded-lg text-sm">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#24B745] hover:bg-[#1f9e3b] text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-900/20"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {isForgotPassword ? 'Envoi...' : isLogin ? 'Connexion...' : 'Création...'}
                </>
              ) : (
                isForgotPassword ? 'Envoyer le lien' : isLogin ? 'Se connecter' : 'Créer mon compte'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-2 border-t border-gray-800 pt-4">
            {isForgotPassword ? (
              <button
                onClick={() => { setIsForgotPassword(false); setError(''); setMessage(''); }}
                className="text-[#24B745] hover:text-[#2ce253] text-sm font-medium"
              >
                Retour à la connexion
              </button>
            ) : (
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                {isLogin ? "Pas encore de compte ? " : 'Déjà un compte ? '}
                <span className="text-[#24B745] font-medium hover:underline">{isLogin ? "S'inscrire" : 'Se connecter'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}