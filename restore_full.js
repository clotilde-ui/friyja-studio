import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Définition du package.json (CRITIQUE)
const pkg = {
  "name": "freyja-studio",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "lucide-react": "^0.344.0",
    "openai": "^4.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.56",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.4"
  }
};

// 2. Autres fichiers manquants
const files = {
  "package.json": JSON.stringify(pkg, null, 2),

  "vite.config.ts": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});`,

  "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

  "src/components/NewClientModal.tsx": `import { useState } from 'react';
import { supabase, Client } from '../lib/supabase';
import { X, Loader, Globe, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function NewClientModal({ onClose, onClientCreated }: any) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('clients').insert({ name: name.trim(), website_url: website.trim() || null }).select().single();
      if (error) throw error;
      onClientCreated(data);
    } catch (error) { console.error(error); alert('Erreur'); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#232323] border-2 border-[#24B745] shadow-[8px_8px_0px_0px_#24B745] p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#FAF5ED]/50 hover:text-[#24B745]"><X className="w-6 h-6" /></button>
        <h2 className="text-2xl font-black text-[#FAF5ED] uppercase tracking-tight mb-8">Nouveau Client</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div><label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Nom</label><div className="relative"><Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FAF5ED]/30" /><input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus required className="w-full pl-12 pr-4 py-4 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] font-bold outline-none rounded-none" /></div></div>
          <div><label className="block text-xs font-bold text-[#24B745] uppercase tracking-wider mb-2">Site Web</label><div className="relative"><Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#FAF5ED]/30" /><input type="url" value={website} onChange={e => setWebsite(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-[#2A2A2A] border-2 border-[#3A3A3A] text-[#FAF5ED] focus:border-[#24B745] focus:bg-[#232323] outline-none rounded-none" /></div></div>
          <div className="flex gap-4 pt-4"><button type="button" onClick={onClose} className="flex-1 px-4 py-4 border-2 border-[#3A3A3A] text-[#FAF5ED] hover:bg-[#3A3A3A] font-bold uppercase tracking-widest text-xs rounded-none">Annuler</button><button type="submit" disabled={loading} className="flex-1 px-4 py-4 bg-[#24B745] text-[#FAF5ED] hover:bg-[#1f9e3b] font-bold uppercase tracking-widest text-xs shadow-lg rounded-none flex justify-center items-center gap-2">{loading ? <Loader className="w-4 h-4 animate-spin" /> : 'Créer'}</button></div>
        </form>
      </div>
    </div>
  );
}`,

  "src/components/FeatureRequests.tsx": `import { ArrowLeft } from 'lucide-react';
export default function FeatureRequests({ onBack }: any) {
  return (<div className="max-w-4xl mx-auto p-8 bg-[#232323] text-[#FAF5ED] border-l-4 border-[#24B745]"><button onClick={onBack} className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs"><ArrowLeft className="w-4 h-4"/> Retour</button><h1 className="text-3xl font-black uppercase mb-4">Suggestions</h1><p className="opacity-60">En construction...</p></div>);
}`,

  "src/components/AdminDashboard.tsx": `import { ArrowLeft, ShieldAlert } from 'lucide-react';
export default function AdminDashboard({ onBack }: any) {
  return (<div className="max-w-4xl mx-auto p-8 bg-[#232323] text-[#FAF5ED] border-l-4 border-red-500"><button onClick={onBack} className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs"><ArrowLeft className="w-4 h-4"/> Retour</button><div className="flex items-center gap-4 mb-4"><ShieldAlert className="w-8 h-8 text-red-500"/><h1 className="text-3xl font-black uppercase">Admin</h1></div><p className="opacity-60">Module Admin.</p></div>);
}`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(__dirname, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content);
  console.log(`✅ ${filePath} restauré.`);
}