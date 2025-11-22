import { ArrowLeft } from 'lucide-react';
export default function FeatureRequests({ onBack }: any) {
  return (<div className="max-w-4xl mx-auto p-8 bg-[#232323] text-[#FAF5ED] border-l-4 border-[#24B745]"><button onClick={onBack} className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs"><ArrowLeft className="w-4 h-4"/> Retour</button><h1 className="text-3xl font-black uppercase mb-4">Suggestions</h1><p className="opacity-60">En construction...</p></div>);
}