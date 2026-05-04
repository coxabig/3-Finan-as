import React, { useMemo, useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button } from '../components/ui';
import { cn } from '../lib/utils';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight, AlertCircle, 
  PieChart as PieChartIcon, Info, User, HelpCircle
} from 'lucide-react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, parseISO } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { TransactionType } from '../types';
import { PageTutorial } from '../components/PageTutorial';
import { useFormatCurrency } from '../hooks/useFormatCurrency';
import { motion } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const dateLocales: Record<string, any> = {
  'pt-BR': ptBR,
  'pt': ptBR,
  'en': enUS,
  'es': es
};

export function SummaryView() {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const currentLocale = dateLocales[i18n.language] || dateLocales[i18n.language.split('-')[0]] || ptBR;
  const { allTransactions, categories, userProfile, partnerProfile } = useFinance();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  
  const currentYear = new Date().getFullYear();
  const yearStart = startOfYear(new Date());
  const yearEnd = endOfYear(new Date());
  
  const months = useMemo(() => eachMonthOfInterval({ start: yearStart, end: yearEnd }), [yearStart, yearEnd]);
  
  // Basic Financial Calculations
  const calculations = useMemo(() => {
    const monthlyList = months.map(month => {
      const monthTxs = allTransactions.filter(tx => {
        const txDate = parseISO(tx.date);
        return isSameMonth(txDate, month);
      });
      
      const revenue = monthTxs
        .filter(tx => tx.type === TransactionType.REVENUE)
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      const expenses = monthTxs
        .filter(tx => tx.type === TransactionType.EXPENSE)
        .reduce((sum, tx) => sum + tx.amount, 0);
        
      return {
        monthDate: month,
        month: format(month, 'MMM', { locale: currentLocale }),
        fullName: format(month, 'MMMM', { locale: currentLocale }),
        revenue,
        expenses,
        balance: revenue - expenses,
        transactions: monthTxs
      };
    });

    const yearly = monthlyList.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.revenue,
      expenses: acc.expenses + curr.expenses,
      balance: acc.balance + curr.balance
    }), { revenue: 0, expenses: 0, balance: 0 });

    // Determine target transactions based on selection
    const targetTransactions = selectedMonthIndex !== null 
      ? monthlyList[selectedMonthIndex].transactions 
      : allTransactions;

    // Category Distribution
    const catMap: Record<string, number> = {};
    targetTransactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .forEach(tx => {
        const catName = categories.find(c => c.id === tx.category)?.name || t('general_category', { defaultValue: 'Geral' });
        catMap[catName] = (catMap[catName] || 0) + tx.amount;
      });

    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Responsibility Distribution
    const respMap: Record<string, number> = {
      [t('joint', { defaultValue: 'Casal' })]: 0,
      [userProfile?.displayName || t('me', { defaultValue: 'Eu' })]: 0,
      [partnerProfile?.displayName || t('partner', { defaultValue: 'Parceiro' })]: 0
    };

    targetTransactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .forEach(tx => {
        let name = t('joint', { defaultValue: 'Casal' });
        if (tx.responsibility === userProfile?.uid) name = userProfile?.displayName || t('me', { defaultValue: 'Eu' });
        if (tx.responsibility === partnerProfile?.uid) name = partnerProfile?.displayName || t('partner', { defaultValue: 'Parceiro' });
        respMap[name] = (respMap[name] || 0) + tx.amount;
      });

    const responsibilityData = Object.entries(respMap)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const currentDisplayStats = selectedMonthIndex !== null 
      ? { 
          revenue: monthlyList[selectedMonthIndex].revenue,
          expenses: monthlyList[selectedMonthIndex].expenses,
          balance: monthlyList[selectedMonthIndex].balance,
          label: monthlyList[selectedMonthIndex].fullName
        }
      : { 
          revenue: yearly.revenue,
          expenses: yearly.expenses,
          balance: yearly.balance,
          label: `${t('all_year', { year: currentYear, defaultValue: `Todo o Ano ${currentYear}` })}`
        };

    return { monthly: monthlyList, yearly, categoryData, responsibilityData, currentDisplayStats, targetTransactions };
  }, [allTransactions, categories, months, userProfile, partnerProfile, selectedMonthIndex, currentYear]);

  const { monthly, yearly, categoryData, responsibilityData, currentDisplayStats, targetTransactions } = calculations;

  const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

  // Insights Logic
  const insights = useMemo(() => {
    const list = [];
    const totalRev = currentDisplayStats.revenue;
    const totalExp = currentDisplayStats.expenses;
    const balance = currentDisplayStats.balance;
    
    if (categoryData.length > 0) {
      const topCat = categoryData[0];
      const percentage = totalExp > 0 ? (topCat.value / totalExp) * 100 : 0;
      if (percentage > 30) {
        list.push({
          type: 'warning',
          title: t('focus_on', { category: topCat.name, defaultValue: `Foco em ${topCat.name}` }),
          description: t('focus_desc', { category: topCat.name, percentage: percentage.toFixed(0), defaultValue: `Neste período, ${topCat.name} consumiu ${percentage.toFixed(0)}% do seu orçamento de despesas.` })
        });
      }
    }

    const savingsRate = totalRev > 0 ? (balance / totalRev) * 100 : 0;
    if (totalRev > 0) {
      if (savingsRate < 10) {
        list.push({
          type: 'error',
          title: t('alert_rate', { defaultValue: 'Taxa de Alerta' }),
          description: t('alert_rate_desc', { rate: savingsRate.toFixed(1), defaultValue: `Vocês pouparam apenas ${savingsRate.toFixed(1)}% da renda. Momento de cautela.` })
        });
      } else if (savingsRate > 30) {
        list.push({
          type: 'success',
          title: t('accelerated_pace', { defaultValue: 'Ritmo Acelerado' }),
          description: t('accelerated_pace_desc', { rate: savingsRate.toFixed(1), defaultValue: `Poupança de ${savingsRate.toFixed(1)}%. Vocês estão construindo patrimônio rápido!` })
        });
      }
    }

    if (totalExp > totalRev && totalRev > 0) {
      list.push({
        type: 'critical',
        title: t('budget_blown_title', { defaultValue: 'Orçamento Estourado' }),
        description: t('budget_blown_desc', { defaultValue: 'As despesas superaram os ganhos. Identifiquem onde foi o excesso imediatamente.' })
      });
    }

    return list;
  }, [categoryData, currentDisplayStats]);

  const maxAmount = Math.max(...monthly.map(d => Math.max(d.revenue, d.expenses))) || 1;

  return (
    <div className="flex flex-col gap-10 pb-24">
      <PageTutorial 
        pageId="summary-diagnosis"
        steps={[
          { element: '#main-stats', popover: { title: t('year_highlights_title', { defaultValue: 'Destaques do Ano' }), description: t('year_highlights_desc', { defaultValue: 'Veja um resumo consolidado de suas receitas e despesas anuais.' }) } },
          { element: '#cashflow-chart', popover: { title: t('cashflow_chart_title', { defaultValue: 'Gráfico de Fluxo' }), description: t('cashflow_chart_desc', { defaultValue: 'Clique em qualquer barra para filtrar o diagnóstico completo para aquele mês específico.' }) } },
          { element: '#financial-insights', popover: { title: t('diagnosis_ai_title', { defaultValue: 'IA de Diagnóstico' }), description: t('diagnosis_ai_desc', { defaultValue: 'Nosso sistema analisa seus dados e gera alertas automáticos sobre taxas de poupança e gastos excessivos.' }) } },
          { element: '#category-distribution', popover: { title: t('where_is_money_title', { defaultValue: 'Onde está o dinheiro?' }), description: t('where_is_money_desc', { defaultValue: 'O gráfico de pizza mostra a distribuição percentual dos seus gastos por categoria.' }) } },
        ]}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">{t('couple_diagnosis', { defaultValue: 'Diagnóstico do Casal' })}</h2>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={12} className="text-orange-500" />
            {t('financial_vibe', { defaultValue: 'Vibração Financeira' })} • {currentDisplayStats.label}
          </p>
        </div>
        
        {selectedMonthIndex !== null && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setSelectedMonthIndex(null)}
            className="rounded-full font-black text-[10px] uppercase tracking-widest gap-2 bg-orange-500 text-white border-none hover:bg-orange-600"
          >
            <Calendar size={14} />
            {t('view_full_year', { defaultValue: 'Ver Ano Inteiro' })}
          </Button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div id="main-stats" className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
        <Card className="p-6 sm:p-10 bg-zinc-900 border-zinc-800 text-white md:col-span-1 relative overflow-hidden group shadow-2xl rounded-[32px] sm:rounded-[40px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 blur-[80px] group-hover:bg-orange-500/20 transition-all rounded-full -mr-24 -mt-24 pointer-events-none" />
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div>
              <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 leading-none">{t('net_balance')}</span>
              <p className={cn(
                "text-[32px] sm:text-5xl font-black tracking-tighter mt-4 leading-none",
                currentDisplayStats.balance >= 0 ? "text-emerald-400" : "text-rose-500"
              )}>
                {formatCurrency(currentDisplayStats.balance)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{formatCurrency(currentDisplayStats.revenue)}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <TrendingDown size={14} className="text-rose-400" />
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter">{formatCurrency(currentDisplayStats.expenses)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:p-10 bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/60 rounded-[32px] sm:rounded-[40px] flex flex-col justify-between gap-6 shadow-sm">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 block leading-none">{t('efficiency')}</span>
            <p className="text-[32px] sm:text-5xl font-black tracking-tighter text-orange-500 leading-none">
              {currentDisplayStats.revenue > 0 ? ((currentDisplayStats.balance / currentDisplayStats.revenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden shadow-inner">
               <div 
                 className="bg-orange-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(249,115,22,0.5)]" 
                 style={{ width: `${Math.min(Math.max((currentDisplayStats.balance / (currentDisplayStats.revenue || 1)) * 100, 0), 100)}%` }} 
               />
            </div>
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">{t('savings_rate')}</span>
          </div>
        </Card>

        <Card className="p-6 sm:p-10 bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/60 rounded-[32px] sm:rounded-[40px] flex flex-col justify-between gap-6 shadow-sm">
          <div>
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 block leading-none">{t('daily_consumption')}</span>
            <p className="text-[32px] sm:text-5xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100 leading-none">
              {formatCurrency(currentDisplayStats.expenses / (selectedMonthIndex !== null ? 30 : Math.max((new Date().getMonth() + 1) * 30, 30)))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full animate-pulse" />
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{t('based_on_period')}</p>
          </div>
        </Card>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Fluxo de Caixa Interativo */}
        <div id="cashflow-chart" className="xl:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('monthly_flow', { defaultValue: 'Fluxo Mensal' })} ({t('click_to_filter', { defaultValue: 'Clique para filtrar' })})</h3>
          </div>
          
          <Card className="p-8 overflow-x-auto min-h-[300px]">
            <div className="min-w-[500px] h-48 flex items-end justify-between gap-4">
              {monthly.map((data, idx) => (
                <button 
                  key={idx} 
                  onClick={() => setSelectedMonthIndex(selectedMonthIndex === idx ? null : idx)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-3 group relative transition-all duration-300",
                    selectedMonthIndex !== null && selectedMonthIndex !== idx ? "opacity-30 grayscale" : "opacity-100 scale-105"
                  )}
                >
                  <div className="w-full flex items-end justify-center gap-1 h-36">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.revenue / maxAmount) * 100}%` }}
                      className={cn(
                        "w-full rounded-t-lg relative",
                        selectedMonthIndex === idx ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-emerald-500/20 group-hover:bg-emerald-500/40"
                      )}
                    />
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.expenses / maxAmount) * 100}%` }}
                      className={cn(
                        "w-full rounded-t-lg relative",
                        selectedMonthIndex === idx ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-rose-500/20 group-hover:bg-rose-500/40"
                      )}
                    />
                  </div>
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-tighter transition-colors",
                    selectedMonthIndex === idx ? "text-zinc-900 dark:text-white" : "text-zinc-400 group-hover:text-zinc-600"
                  )}>
                    {data.month}
                  </span>
                  {selectedMonthIndex === idx && <div className="absolute -bottom-2 w-1 h-1 bg-orange-500 rounded-full" />}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-center gap-6 pt-4 border-t border-zinc-50 dark:border-zinc-800">
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                 <span className="text-[9px] font-black text-zinc-400 uppercase">{t('revenue_plural', { defaultValue: 'Receitas' })}</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                 <span className="text-[9px] font-black text-zinc-400 uppercase">{t('expense_plural', { defaultValue: 'Despesas' })}</span>
               </div>
            </div>
          </Card>
        </div>

        {/* Insights correlacionados */}
        <div id="financial-insights" className="xl:col-span-1 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('financial_intelligence', { defaultValue: 'Inteligência Financeira' })}</h3>
          </div>
          
          <div className="flex flex-col gap-4">
            {insights.length > 0 ? insights.map((insight, idx) => (
              <motion.div 
                key={`${selectedMonthIndex}-${idx}`}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                  "p-5 rounded-[24px] border flex gap-4 items-start",
                  insight.type === 'error' || insight.type === 'critical' ? "bg-rose-500/5 border-rose-500/20" : 
                  insight.type === 'warning' ? "bg-orange-500/5 border-orange-500/20" : "bg-emerald-500/5 border-emerald-500/20"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                  insight.type === 'error' || insight.type === 'critical' ? "bg-rose-500/10 text-rose-500" : 
                  insight.type === 'warning' ? "bg-orange-500/10 text-orange-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {insight.type === 'error' || insight.type === 'critical' ? <AlertCircle size={20} /> : <Info size={20} />}
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-tight mb-1">{insight.title}</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">{insight.description}</p>
                </div>
              </motion.div>
            )) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-8 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center text-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                   <HelpCircle size={24} />
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-widest leading-relaxed">
                  {t('all_under_control', { defaultValue: 'Tudo sob controle.' })} {t('no_anomaly', { defaultValue: 'Nenhuma anomalia detectada.' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categorias e Movimentações side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categorias */}
        <div id="category-distribution" className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('category_distribution_summary', { defaultValue: 'Distribuição de Categorias' })}</h3>
          </div>
          
          <Card className="p-8 min-h-[400px] flex flex-col">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', background: '#18181b', color: '#fff' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                <PieChartIcon size={40} className="opacity-20" />
                <span className="text-[10px] uppercase font-black">{t('no_spending_recorded', { defaultValue: 'Nenhuma despesa registrada' })}</span>
              </div>
            )}
          </Card>
        </div>

        {/* Top Expenses List */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('major_launches', { defaultValue: 'Maiores Lançamentos' })}</h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {targetTransactions
              .filter(tx => tx.type === TransactionType.EXPENSE)
              .sort((a, b) => b.amount - a.amount)
              .slice(0, 5)
              .map((tx, idx) => (
                <Card key={tx.id} className={cn(
                  "p-5 flex items-center justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all",
                  idx === 0 ? "border-orange-500/30 bg-orange-500/5 shadow-lg" : ""
                )}>
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl group-hover:scale-110 transition-transform">
                      {idx === 0 ? <TrendingDown size={18} className="text-orange-500" /> : <DollarSign size={18} className="text-zinc-400" />}
                    </div>
                    <div>
                      <p className="font-black text-xs uppercase tracking-tight">{tx.description}</p>
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: currentLocale })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{formatCurrency(tx.amount)}</p>
                    <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{categories.find(c => c.id === tx.category)?.name || t('general_category', { defaultValue: 'Geral' })}</p>
                  </div>
                </Card>
              ))}
            {targetTransactions.length === 0 && (
              <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-zinc-400 uppercase font-black text-[10px]">
                {t('no_launches_found', { defaultValue: 'Nenhum lançamento encontrado' })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Responsibility Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('spending_split', { defaultValue: 'Divisão de Gastos' })}</h3>
          </div>
          
          <Card className="p-8 h-[300px]">
            {responsibilityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responsibilityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {responsibilityData.map((_entry, index) => (
                      <Cell key={`cell-resp-${index}`} fill={index === 0 ? '#f59e0b' : index === 1 ? '#3b82f6' : '#8b5cf6'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px] uppercase font-black">{t('no_data', { defaultValue: 'Sem dados' })}</div>
            )}
          </Card>
        </div>

        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">{t('major_impacts_per_person', { defaultValue: 'Maiores Impactos por Pessoa' })}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[userProfile, partnerProfile].filter(Boolean).map((profile, pIdx) => {
              const currentPersonTxs = targetTransactions.filter(tx => 
                tx.type === TransactionType.EXPENSE && 
                tx.responsibility === profile?.uid
              );
              
              const pCatMap: Record<string, number> = {};
              currentPersonTxs.forEach(tx => {
                const catName = categories.find(c => c.id === tx.category)?.name || t('general_category', { defaultValue: 'Geral' });
                pCatMap[catName] = (pCatMap[catName] || 0) + tx.amount;
              });

              const pCatData = Object.entries(pCatMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);
              
              const totalPersonExpense = currentPersonTxs.reduce((sum, tx) => sum + tx.amount, 0);

              return (
                <Card key={`${selectedMonthIndex}-${pIdx}`} className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
                        <User size={16} className="text-orange-500" />
                      </div>
                      <h4 className="font-black text-sm tracking-tight">{profile?.displayName}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">{t('individual_spending', { defaultValue: 'Gasto Individual' })}</span>
                      <span className="text-sm font-black text-zinc-900 dark:text-white">{formatCurrency(totalPersonExpense)}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {pCatData.length > 0 ? pCatData.map((cat, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black text-zinc-500 uppercase">{cat.name}</span>
                          <span className="text-[10px] font-black">{formatCurrency(cat.value)}</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(cat.value / (pCatData[0]?.value || 1)) * 100}%` }}
                            className="bg-orange-500 h-full rounded-full" 
                          />
                        </div>
                      </div>
                    )) : (
                      <p className="text-[10px] text-zinc-400 border border-dashed border-zinc-100 dark:border-zinc-800 p-4 rounded-xl text-center">
                        {t('no_records', { defaultValue: 'Sem registros.' })}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
