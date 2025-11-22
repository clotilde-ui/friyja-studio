import { ArrowLeft, ShieldAlert } from 'lucide-react';
export default function AdminDashboard({ onBack }: any) {
  return (<div className="max-w-4xl mx-auto p-8 bg-[#232323] text-[#FAF5ED] border-l-4 border-red-500"><button onClick={onBack} className="flex items-center gap-2 text-[#24B745] mb-6 font-bold uppercase text-xs"><ArrowLeft className="w-4 h-4"/> Retour</button><div className="flex items-center gap-4 mb-4"><ShieldAlert className="w-8 h-8 text-red-500"/><h1 className="text-3xl font-black uppercase">Admin</h1></div><p className="opacity-60">Module Admin.</p></div>);
}