import React from 'react';
import { useFinance } from '../FinanceProvider';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const dateLocales: Record<string, any> = {
  'pt-BR': ptBR,
  'pt': ptBR,
  'en': enUS,
  'es': es
};

export function MonthSelector() {
  const { t, i18n } = useTranslation();
  const currentLocale = dateLocales[i18n.language] || dateLocales[i18n.language.split('-')[0]] || ptBR;
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
    <div className="flex items-center w-fit mx-auto self-center bg-white dark:bg-zinc-900/50 backdrop-blur-md px-2 sm:px-3 py-1.5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-zinc-100 dark:border-zinc-800 gap-1 sm:gap-2 mb-10 transition-all hover:border-zinc-200 dark:hover:border-zinc-700">
      <button 
        onClick={handlePrevMonth} 
        className="w-10 h-10 flex items-center justify-center rounded-xl text-zinc-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
      >
        <span className="text-lg">❮</span>
      </button>
      <div className="flex flex-col items-center px-4 sm:px-8 min-w-[140px] sm:min-w-[180px]">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-0.5">{t('month_selector_label', { defaultValue: 'Competência' })}</span>
        <span className="font-black text-sm text-zinc-900 dark:text-white capitalize">
          {format(parseISO(selectedMonth + '-01'), 'MMMM yyyy', { locale: currentLocale })}
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
