import React from 'react';
import { ExternalLink, X } from 'lucide-react';

export function AdBanner() {
  const [closed, setClosed] = React.useState(false);

  if (closed) return null;

  return (
    <div className="relative group overflow-hidden bg-gradient-to-r from-orange-600 to-rose-600 p-[1px] rounded-2xl sm:rounded-3xl shadow-lg animate-in slide-in-from-top-4 duration-500">
      <div className="bg-white dark:bg-zinc-900 rounded-[15px] sm:rounded-[23px] p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-orange-600 shrink-0">
            <span className="font-black text-xl italic leading-none">3%</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
               <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">ANÚNCIO</span>
               <span className="font-bold text-xs sm:text-sm truncate">Viaje com milhas em casal!</span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              Curso exclusivo para membros Free: aprenda a acumular 100k milhas.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <button 
             onClick={() => window.open('https://google.com', '_blank')}
             className="px-3 py-2 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:bg-orange-700 transition-colors"
           >
             <ExternalLink size={12} />
             Ver
           </button>
           <button 
             onClick={() => setClosed(true)}
             className="p-2 text-zinc-300 hover:text-zinc-600 transition-colors"
           >
             <X size={14} />
           </button>
        </div>
      </div>
    </div>
  );
}
