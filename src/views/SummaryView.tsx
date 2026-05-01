import React, { useMemo } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button } from '../components/ui';
import { cn } from '../lib/utils';
import { 
  BarChart3, TrendingUp, TrendingDown, DollarSign, 
  Calendar, ArrowUpRight, ArrowDownRight, AlertCircle, 
  PieChart as PieChartIcon, Info, User, HelpCircle
} from 'lucide-react';
import { format, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';
import { TransactionType } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

export function SummaryView() {
  const { allTransactions, categories, userProfile, partnerProfile } = useFinance();
  const [selectedMonthIndex, setSelectedMonthIndex] = React.useState<number | null>(null);
  
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
        month: format(month, 'MMM', { locale: ptBR }),
        fullName: format(month, 'MMMM', { locale: ptBR }),
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
        const catName = categories.find(c => c.id === tx.category)?.name || 'Sem Categoria';
        catMap[catName] = (catMap[catName] || 0) + tx.amount;
      });

    const categoryData = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Responsibility Distribution
    const respMap: Record<string, number> = {
      'Casal': 0,
      [userProfile?.displayName || 'Eu']: 0,
      [partnerProfile?.displayName || 'Parceiro']: 0
    };

    targetTransactions
      .filter(tx => tx.type === TransactionType.EXPENSE)
      .forEach(tx => {
        let name = 'Casal';
        if (tx.responsibility === 'user1' && userProfile) name = userProfile.displayName;
        if (tx.responsibility === 'user2' && partnerProfile) name = partnerProfile.displayName;
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
          label: `Todo o Ano ${currentYear}`
        };

    return { monthly: monthlyList, yearly, categoryData, responsibilityData, currentDisplayStats, targetTransactions };
  }, [allTransactions, categories, months, userProfile, partnerProfile, selectedMonthIndex, currentYear]);

  const { monthly, yearly, categoryData, responsibilityData, currentDisplayStats, targetTransactions } = calculations;

  const COLORS = ['#f59e0b', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b'];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

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
          title: `Foco em ${topCat.name}`,
          description: `Neste período, ${topCat.name} consumiu ${percentage.toFixed(0)}% do seu orçamento de despesas.`
        });
      }
    }

    const savingsRate = totalRev > 0 ? (balance / totalRev) * 100 : 0;
    if (totalRev > 0) {
      if (savingsRate < 10) {
        list.push({
          type: 'error',
          title: 'Taxa de Alerta',
          description: `Vocês pouparam apenas ${savingsRate.toFixed(1)}% da renda. Momento de cautela.`
        });
      } else if (savingsRate > 30) {
        list.push({
          type: 'success',
          title: 'Ritmo Acelerado',
          description: `Poupança de ${savingsRate.toFixed(1)}%. Vocês estão construindo patrimônio rápido!`
        });
      }
    }

    if (totalExp > totalRev && totalRev > 0) {
      list.push({
        type: 'critical',
        title: 'Orçamento Estourado',
        description: 'As despesas superaram os ganhos. Identifiquem onde foi o excesso imediatamente.'
      });
    }

    return list;
  }, [categoryData, currentDisplayStats]);

  const maxAmount = Math.max(...monthly.map(d => Math.max(d.revenue, d.expenses))) || 1;

  return (
    <div className="flex flex-col gap-10 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-4xl font-black tracking-tighter uppercase italic">Diagnóstico do Casal</h2>
          <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={12} className="text-orange-500" />
            Vibração Financeira • {currentDisplayStats.label}
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
            Ver Ano Inteiro
          </Button>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-6 bg-zinc-900 border-zinc-800 text-white col-span-1 sm:col-span-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-all rounded-full -mr-16 -mt-16" />
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Saldo no Período</span>
            <p className={cn(
              "text-5xl font-black tracking-tighter mt-2",
              currentDisplayStats.balance >= 0 ? "text-emerald-400" : "text-rose-500"
            )}>
              {formatCurrency(currentDisplayStats.balance)}
            </p>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full">
                <TrendingUp size={12} className="text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">{formatCurrency(currentDisplayStats.revenue)}</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-full">
                <TrendingDown size={12} className="text-rose-400" />
                <span className="text-[10px] font-bold text-rose-400">{formatCurrency(currentDisplayStats.expenses)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Taxa de Poupança</span>
          <p className="text-3xl font-black tracking-tighter text-orange-500">
            {currentDisplayStats.revenue > 0 ? ((currentDisplayStats.balance / currentDisplayStats.revenue) * 100).toFixed(1) : 0}%
          </p>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
             <div 
               className="bg-orange-500 h-full rounded-full transition-all duration-1000" 
               style={{ width: `${Math.min(Math.max((currentDisplayStats.balance / (currentDisplayStats.revenue || 1)) * 100, 0), 100)}%` }} 
             />
          </div>
        </Card>

        <Card className="p-6 bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Gasto Médio/Dia</span>
          <p className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">
            {formatCurrency(currentDisplayStats.expenses / (selectedMonthIndex !== null ? 30 : (new Date().getMonth() + 1) * 30))}
          </p>
          <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Estimativa de consumo</p>
        </Card>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Fluxo de Caixa Interativo */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Fluxo Mensal (Clique para filtrar)</h3>
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
                 <span className="text-[9px] font-black text-zinc-400 uppercase">Receitas</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                 <span className="text-[9px] font-black text-zinc-400 uppercase">Despesas</span>
               </div>
            </div>
          </Card>
        </div>

        {/* Insights correlacionados */}
        <div className="xl:col-span-1 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Inteligência Financeira</h3>
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
                  Tudo sob controle. Nenhuma anomalia detectada.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Categorias e Movimentações side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Categorias */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Distribuição de Categorias</h3>
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
                <span className="text-[10px] uppercase font-black">Nenhuma despesa registrada</span>
              </div>
            )}
          </Card>
        </div>

        {/* Top Expenses List */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Maiores Lançamentos</h3>
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
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">{format(parseISO(tx.date), 'dd MMM yyyy', { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm">{formatCurrency(tx.amount)}</p>
                    <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{categories.find(c => c.id === tx.category)?.name || 'Geral'}</p>
                  </div>
                </Card>
              ))}
            {targetTransactions.length === 0 && (
              <div className="p-12 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[32px] flex flex-col items-center justify-center text-zinc-400 uppercase font-black text-[10px]">
                Nenhum lançamento encontrado
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
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Divisão de Gastos</h3>
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
              <div className="w-full h-full flex items-center justify-center text-zinc-400 text-[10px] uppercase font-black">Sem dados</div>
            )}
          </Card>
        </div>

        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-zinc-900 dark:bg-white rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-500">Maiores Impactos por Pessoa</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[userProfile, partnerProfile].filter(Boolean).map((profile, pIdx) => {
              const currentPersonTxs = targetTransactions.filter(tx => 
                tx.type === TransactionType.EXPENSE && 
                tx.responsibility === (pIdx === 0 ? 'user1' : 'user2')
              );
              
              const pCatMap: Record<string, number> = {};
              currentPersonTxs.forEach(tx => {
                const catName = categories.find(c => c.id === tx.category)?.name || 'Sem Categoria';
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
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest block">Gasto Individual</span>
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
                        Sem registros.
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
