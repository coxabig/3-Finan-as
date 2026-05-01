import React from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button } from '../components/ui';
import { cn } from '../lib/utils';
import { TrendingUp, TrendingDown, Wallet, Users, ChevronLeft, ChevronRight, Tag, ChevronDown } from 'lucide-react';
import { format, addMonths, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getCategoryIcon } from '../lib/category-icons';
import { motion, AnimatePresence } from 'framer-motion';

import { MonthSelector } from '../components/MonthSelector';

import { TransactionType } from '../types';

const COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-50', dark: 'dark:bg-emerald-600/20', darkText: 'dark:text-emerald-400', darkBorder: 'dark:border-emerald-900/20', shadow: 'shadow-emerald-900/20' },
  { name: 'Orange', bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200', light: 'bg-orange-50', dark: 'dark:bg-orange-600/20', darkText: 'dark:text-orange-400', darkBorder: 'dark:border-orange-900/20', shadow: 'shadow-orange-900/20' },
  { name: 'Blue', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50', dark: 'dark:bg-blue-600/20', darkText: 'dark:text-blue-400', darkBorder: 'dark:border-blue-900/20', shadow: 'shadow-blue-900/20' },
  { name: 'Violet', bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-200', light: 'bg-violet-50', dark: 'dark:bg-violet-600/20', darkText: 'dark:text-violet-400', darkBorder: 'dark:border-violet-900/20', shadow: 'shadow-violet-900/20' },
  { name: 'Rose', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50', dark: 'dark:bg-rose-600/20', darkText: 'dark:text-rose-400', darkBorder: 'dark:border-rose-900/20', shadow: 'shadow-rose-900/20' },
  { name: 'Zinc', bg: 'bg-zinc-600', text: 'text-zinc-600', border: 'border-zinc-200', light: 'bg-zinc-50', dark: 'dark:bg-zinc-800/40', darkText: 'dark:text-zinc-400', darkBorder: 'dark:border-zinc-800/30', shadow: 'shadow-zinc-900/20' },
];

export function DashboardView() {
  const { 
    userProfile, 
    partnerProfile, 
    transactions, 
    categories,
    ratios,
    updateProfileColors
  } = useFinance();

  const [expandedCard, setExpandedCard] = React.useState<string | null>(null);
  const [expandedUserShare, setExpandedUserShare] = React.useState<'user' | 'partner' | null>(null);

  const totals = transactions.reduce((acc, tx) => {
    if (tx.type === TransactionType.REVENUE) {
      acc.revenue += tx.amount;
    } else {
      acc.expenses += tx.amount;
      if (tx.responsibility === 'couple') acc.sharedExpenses += tx.amount;
    }
    return acc;
  }, { revenue: 0, expenses: 0, sharedExpenses: 0 });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const userShare = totals.sharedExpenses * ratios.user;
  const partnerShare = totals.sharedExpenses * ratios.partner;

  // Category Breakdown
  const categoryTotals = transactions
    .filter(tx => tx.type === TransactionType.EXPENSE)
    .reduce((acc, tx) => {
      const catName = tx.category || 'Geral';
      acc[catName] = (acc[catName] || 0) + tx.amount;
      return acc;
    }, {} as Record<string, number>);

  const sortedCategories = (Object.entries(categoryTotals) as [string, number][])
    .sort(([, a], [, b]) => b - a);

  const userColor = COLORS.find(c => c.name === userProfile?.userColor) || COLORS[1]; // Default Orange
  const partnerColor = COLORS.find(c => c.name === userProfile?.partnerColor) || COLORS[5]; // Default Zinc

  return (
    <div className="flex flex-col gap-8">
      <MonthSelector />

      {/* Main Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card 
          onClick={() => setExpandedCard(expandedCard === 'main' ? null : 'main')}
          className="lg:col-span-2 bg-zinc-900 border-none p-8 sm:p-12 text-white relative overflow-hidden group shadow-[0_20px_50px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_60px_rgba(0,0,0,1)] ring-1 ring-zinc-800 cursor-pointer transition-all active:scale-[0.98]"
        >
        <div className="relative z-10 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
          <div className="flex items-center justify-between w-full">
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.3em] mb-4">Saldo Combinado</p>
            <ChevronDown className={cn("text-zinc-500 transition-transform duration-300", expandedCard === 'main' ? 'rotate-180' : '')} size={16} />
          </div>
          <h2 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">{formatCurrency(totals.revenue - totals.expenses)}</h2>
          
          <div className="mt-10 sm:mt-14 flex items-center gap-10 sm:gap-16">
            <div className="flex flex-col gap-1 text-left">
              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest leading-none">Receitas</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">{formatCurrency(totals.revenue)}</p>
            </div>
            <div className="w-px h-10 bg-zinc-800/50" />
            <div className="flex flex-col gap-1 text-left">
              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest leading-none">Despesas</p>
              <p className="text-xl sm:text-2xl font-black text-rose-500 dark:text-rose-400">{formatCurrency(totals.expenses)}</p>
            </div>
          </div>

          <AnimatePresence>
            {expandedCard === 'main' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full mt-8 pt-8 border-t border-zinc-800"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Divisão do Casal</span>
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase">Eu</p>
                        <p className="text-sm font-black">{(ratios.user * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase">Parceiro</p>
                        <p className="text-sm font-black">{(ratios.partner * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Comprometimento</span>
                    <p className="text-sm font-black">{((totals.expenses / (totals.revenue || 1)) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Dias Restantes</span>
                    <p className="text-sm font-black">12 dias <span className="text-[10px] text-zinc-500 font-normal">estimados</span></p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Decorative elements for "Good Quality" look */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32 transition-all duration-700 group-hover:opacity-40 group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-600 rounded-full blur-[80px] opacity-10 -ml-16 -mb-16" />
      </Card>

      {/* Quick Visual Stats */}
      <div className="lg:col-span-1 flex flex-col gap-4">
         <Card className="h-full p-6 sm:p-8 flex flex-col justify-center">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest mb-1">Economia do Mês</p>
                <p className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">{(100 - (totals.expenses / (totals.revenue || 1)) * 100).toFixed(0)}% <span className="text-sm font-normal text-zinc-500 italic">restante</span></p>
              </div>
              <TrendingUp className="w-6 h-6 text-orange-500" />
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500 transition-all duration-1000 shadow-[0_0_10px_rgba(249,115,22,0.3)]" 
                style={{ width: `${Math.min((totals.expenses / (totals.revenue || 1)) * 100, 100)}%` }} 
              />
            </div>
         </Card>
      </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Proportionality Breakdown */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.3)]"></div>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] text-zinc-400">Divisão Proporcional</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div 
              onClick={() => setExpandedUserShare(expandedUserShare === 'user' ? null : 'user')}
              className={cn(
                "bg-white dark:bg-zinc-900/40 rounded-[32px] p-8 border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col gap-6 group transition-all relative overflow-hidden cursor-pointer active:scale-[0.99]",
                userColor.border, userColor.darkBorder, "hover:border-opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", userColor.light, userColor.dark, userColor.text, userColor.darkText, userColor.darkBorder)}>
                  <Users size={20} />
                </div>
                <div className="flex items-center gap-3">
                  <ChevronDown size={14} className={cn("text-zinc-300 transition-transform duration-300", expandedUserShare === 'user' ? "rotate-180" : "")} />
                  <span className={cn("text-white text-[10px] px-2.5 py-1 rounded-full font-black italic shadow-lg", userColor.bg, userColor.shadow)}>{(ratios.user * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white leading-none tracking-tighter mb-2">{formatCurrency(userShare)}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{userProfile?.displayName}</p>
              </div>

              <AnimatePresence>
                {expandedUserShare === 'user' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
                      {/* User Revenues Filtered */}
                      {transactions
                        .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === userProfile?.uid)
                        .length > 0 && (
                          <div className="flex flex-col gap-1">
                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Minhas Receitas</p>
                            {transactions
                              .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === userProfile?.uid)
                              .map(tx => (
                                <div key={tx.id} className="flex justify-between items-center text-[10px]">
                                  <span className="text-zinc-400 font-bold truncate max-w-[120px]">{tx.description}</span>
                                  <span className="font-black text-emerald-500">{formatCurrency(tx.amount)}</span>
                                </div>
                              ))}
                          </div>
                        )}

                      {/* Expenses/Contributions */}
                      <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Minhas Despesas & Partilhas</p>
                        {transactions
                          .filter(tx => tx.type === TransactionType.EXPENSE && (tx.responsibility === userProfile?.uid || tx.responsibility === 'couple'))
                          .map(tx => {
                            const amount = tx.responsibility === 'couple' ? tx.amount * ratios.user : tx.amount;
                            return (
                              <div key={tx.id} className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1">
                                  {tx.responsibility === 'couple' && <span className="text-[8px] text-zinc-400">Share:</span>}
                                  <span className="text-zinc-400 font-bold truncate max-w-[120px]">{tx.description}</span>
                                </div>
                                <span className="font-black text-zinc-900 dark:text-white">{formatCurrency(amount)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div 
              onClick={() => setExpandedUserShare(expandedUserShare === 'partner' ? null : 'partner')}
              className={cn(
                "bg-white dark:bg-zinc-900/40 rounded-[32px] p-8 border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] flex flex-col gap-6 group transition-all relative overflow-hidden cursor-pointer active:scale-[0.99]",
                partnerColor.border, partnerColor.darkBorder, "hover:border-opacity-100"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", partnerColor.light, partnerColor.dark, partnerColor.text, partnerColor.darkText, partnerColor.darkBorder)}>
                  <Users size={20} />
                </div>
                <div className="flex items-center gap-3">
                  <ChevronDown size={14} className={cn("text-zinc-300 transition-transform duration-300", expandedUserShare === 'partner' ? "rotate-180" : "")} />
                  <span className={cn("text-white text-[10px] px-2.5 py-1 rounded-full font-black italic shadow-lg", partnerColor.bg, partnerColor.shadow)}>{(ratios.partner * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div>
                <p className="text-3xl sm:text-4xl font-black text-zinc-900 dark:text-white leading-none tracking-tighter mb-2">{formatCurrency(partnerShare)}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest truncate">{partnerProfile?.displayName || 'Convide seu par'}</p>
              </div>

              <AnimatePresence>
                {expandedUserShare === 'partner' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <div className="mt-2 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-3">
                      {/* Partner Revenues Filtered */}
                      {transactions
                        .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === partnerProfile?.uid)
                        .length > 0 && (
                          <div className="flex flex-col gap-1">
                            <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">Receitas do Par</p>
                            {transactions
                              .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === partnerProfile?.uid)
                              .map(tx => (
                                <div key={tx.id} className="flex justify-between items-center text-[10px]">
                                  <span className="text-zinc-400 font-bold truncate max-w-[120px]">{tx.description}</span>
                                  <span className="font-black text-emerald-500">{formatCurrency(tx.amount)}</span>
                                </div>
                              ))}
                          </div>
                        )}

                      {/* Expenses/Contributions */}
                      <div className="flex flex-col gap-1">
                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-1">Despesas & Partilhas do Par</p>
                        {transactions
                          .filter(tx => tx.type === TransactionType.EXPENSE && (tx.responsibility === partnerProfile?.uid || tx.responsibility === 'couple'))
                          .map(tx => {
                            const amount = tx.responsibility === 'couple' ? tx.amount * ratios.partner : tx.amount;
                            return (
                              <div key={tx.id} className="flex justify-between items-center text-[10px]">
                                <div className="flex items-center gap-1">
                                  {tx.responsibility === 'couple' && <span className="text-[8px] text-zinc-400">Share:</span>}
                                  <span className="text-zinc-400 font-bold truncate max-w-[120px]">{tx.description}</span>
                                </div>
                                <span className="font-black text-zinc-900 dark:text-white">{formatCurrency(amount)}</span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full"></div>
            <h3 className="font-black text-xs uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Gastos por Categoria</h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {sortedCategories.map(([name, total]) => {
              const cat = categories.find(c => c.name === name);
              const percentage = ((total as number) / (totals.expenses || 1)) * 100;
              return (
                <div key={name} className="flex flex-col">
                  <Card 
                    onClick={() => setExpandedCard(expandedCard === `cat-${name}` ? null : `cat-${name}`)}
                    className="p-4 flex items-center justify-between group bg-white dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.4)] cursor-pointer transition-all active:scale-[0.99] hover:border-orange-200 dark:hover:border-orange-900/40"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10 dark:shadow-black/40"
                        style={{ backgroundColor: cat?.color || '#71717a' }}
                      >
                        {(() => {
                          const Icon = getCategoryIcon(name, cat?.iconName);
                          return <Icon size={18} />;
                        })()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">{name}</span>
                            <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{(percentage).toFixed(0)}%</span>
                          </div>
                          <span className="text-sm font-black text-zinc-900 dark:text-white">{formatCurrency(total as number)}</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="h-full transition-all duration-1000"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: cat?.color || '#71717a'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>

                  <AnimatePresence>
                    {expandedCard === `cat-${name}` && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-4 mt-1 p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-b-2xl border-x border-b border-zinc-100 dark:border-zinc-800/40 flex flex-col gap-3">
                          <p className="text-[8px] font-black uppercase text-zinc-400 tracking-[0.2em] mb-1">Maiores Gastos</p>
                          {transactions
                            .filter(t => t.category === name && t.type === TransactionType.EXPENSE)
                            .sort((a, b) => b.amount - a.amount)
                            .slice(0, 3)
                            .map(tx => (
                              <div key={tx.id} className="flex justify-between items-center bg-white dark:bg-zinc-900/40 p-2 rounded-xl shadow-sm border border-zinc-100/50 dark:border-zinc-800/20">
                                <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 truncate max-w-[60%]">{tx.description}</span>
                                <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(tx.amount)}</span>
                              </div>
                            ))}
                          {transactions.filter(t => t.category === name).length === 0 && (
                            <p className="text-[10px] text-zinc-400 italic">Sem detalhes adicionais</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            {sortedCategories.length === 0 && (
              <p className="text-center py-8 text-zinc-400 dark:text-zinc-500 text-sm italic">Nenhum gasto registrado este mês.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
