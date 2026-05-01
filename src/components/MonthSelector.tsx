import React from 'react';
import { useFinance } from '../FinanceProvider';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useFinance();

  const handlePrevMonth = () => {
    const prev = subMonths(parseISO(selectedMonth + '-01'), 1);
    setSelectedMonth(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const next = addMonths(parseISO(selectedMonth + '-01'), 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  return (
    <div className="flex items-center bg-white dark:bg-zinc-900/50 backdrop-blur-md px-2 sm:px-3 py-1.5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 dark:border-zinc-800 gap-1 sm:gap-2 self-center mb-10 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
      <button 
        onClick={handlePrevMonth} 
        className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
      >
        <span className="text-lg">❮</span>
      </button>
      <div className="flex flex-col items-center px-4 sm:px-8 min-w-[140px] sm:min-w-[180px]">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-0.5">Competência</span>
        <span className="font-black text-sm text-zinc-900 dark:text-white capitalize">
          {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: ptBR })}
        </span>
      </div>
      <button 
        onClick={handleNextMonth} 
        className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
      >
        <span className="text-lg">❯</span>
      </button>
    </div>
  );
}
