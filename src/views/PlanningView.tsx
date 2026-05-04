import React, { useState, useEffect } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { Plus, X, ArrowUpCircle, ArrowDownCircle, Trash2, Pencil, CreditCard, Tag, ChevronDown } from 'lucide-react';
import { TransactionType, Responsibility, FrequencyType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { MonthSelector } from '../components/MonthSelector';
import { getCategoryIcon } from '../lib/category-icons';
import { PageTutorial } from '../components/PageTutorial';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

import { SwipeableItem } from '../components/SwipeableItem';

const COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-50', dark: 'dark:bg-emerald-600/20', darkText: 'dark:text-emerald-400', darkBorder: 'dark:border-emerald-900/20', shadow: 'shadow-emerald-900/20' },
  { name: 'Orange', bg: 'bg-orange-600', text: 'text-orange-600', border: 'border-orange-200', light: 'bg-orange-50', dark: 'dark:bg-orange-600/20', darkText: 'dark:text-orange-400', darkBorder: 'dark:border-orange-900/20', shadow: 'shadow-orange-900/20' },
  { name: 'Blue', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-200', light: 'bg-blue-50', dark: 'dark:bg-blue-600/20', darkText: 'dark:text-blue-400', darkBorder: 'dark:border-blue-900/20', shadow: 'shadow-blue-900/20' },
  { name: 'Violet', bg: 'bg-violet-600', text: 'text-violet-600', border: 'border-violet-200', light: 'bg-violet-50', dark: 'dark:bg-violet-600/20', darkText: 'dark:text-violet-400', darkBorder: 'dark:border-violet-900/20', shadow: 'shadow-violet-900/20' },
  { name: 'Rose', bg: 'bg-rose-600', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50', dark: 'dark:bg-rose-600/20', darkText: 'dark:text-rose-400', darkBorder: 'dark:border-rose-900/20', shadow: 'shadow-rose-900/20' },
  { name: 'Zinc', bg: 'bg-zinc-600', text: 'text-zinc-600', border: 'border-zinc-200', light: 'bg-zinc-50', dark: 'dark:bg-zinc-800/40', darkText: 'dark:text-zinc-400', darkBorder: 'dark:border-zinc-800/30', shadow: 'shadow-zinc-900/20' },
];

import { useTranslation } from 'react-i18next';

export function PlanningView() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const { transactions, userProfile, partnerProfile, cards, categories, addTransaction, updateTransaction, removeTransaction, ratios } = useFinance();
  
  const userColor = COLORS.find(c => c.name === userProfile?.userColor) || COLORS[1];
  const partnerColor = COLORS.find(c => c.name === userProfile?.partnerColor) || COLORS[5];

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const [showModal, setShowModal] = useState<TransactionType | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [responsibility, setResponsibility] = useState<Responsibility>('couple');
  const [frequency, setFrequency] = useState<FrequencyType>(FrequencyType.ONCE);
  const [installments, setInstallments] = useState('2');
  const [cardId, setCardId] = useState('');

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rigorous validation: all fields must be filled
    if (!description.trim()) {
      setFormError(t('description_required', { defaultValue: 'Por favor, insira uma descrição.' }));
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setFormError(t('amount_required', { defaultValue: 'Por favor, insira um valor válido maior que zero.' }));
      return;
    }
    if (!category.trim()) {
      setFormError(t('category_required', { defaultValue: 'Por favor, escolha ou insira uma categoria.' }));
      return;
    }
    if (!date) {
      setFormError(t('date_required', { defaultValue: 'Por favor, selecione uma data.' }));
      return;
    }

    setFormLoading(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateTransaction(editingId, {
          description,
          amount: parseFloat(amount),
          category,
          date,
          responsibility,
          cardId: showModal === TransactionType.EXPENSE ? cardId : undefined,
        });
      } else {
        await addTransaction({
          description,
          amount: parseFloat(amount),
          category,
          date,
          type: showModal as TransactionType,
          responsibility,
          frequency,
          installments: frequency === FrequencyType.INSTALLMENTS ? parseInt(installments) : undefined,
          ownerId: userProfile?.uid,
          cardId: showModal === TransactionType.EXPENSE ? cardId : undefined,
        });
      }

      resetForm();
      setShowModal(null);
    } catch (err: any) {
      setFormError(err.message || t('error_saving_transaction', { defaultValue: 'Erro ao salvar transação.' }));
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setCategory('');
    setFrequency(FrequencyType.ONCE);
    setEditingId(null);
    setCardId('');
  };

  const handleEdit = (tx: any) => {
    setEditingId(tx.id);
    setDescription(tx.description);
    setAmount(tx.amount.toString());
    setCategory(tx.category || '');
    setDate(tx.date);
    setResponsibility(tx.responsibility);
    setFrequency(tx.frequency);
    setCardId(tx.cardId || '');
    setShowModal(tx.type);
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedSummary, setExpandedSummary] = useState<'rev' | 'exp' | null>(null);

  const handleDelete = async (id: string) => {
    console.log("Delete triggered for ID:", id);
    if (deletingId !== id) {
      setDeletingId(id);
      // Reset after 3 seconds if not confirmed
      setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000);
      return;
    }
    
    setFormLoading(true);
    try {
      console.log("Proceeding with deletion from Firestore...");
      await removeTransaction(id);
      setDeletingId(null);
    } catch (err: any) {
      console.error("Detailed Delete error:", err);
      let message = t('error_deleting_transaction', { defaultValue: 'Erro ao excluir transação.' });
      try {
        const parsed = JSON.parse(err.message);
        if (parsed.error) {
          message += `\n${t('reason')}: ${parsed.error}`;
          message += `\n${t('operation')}: ${parsed.operationType}`;
          message += `\n${t('path')}: ${parsed.path}`;
        }
      } catch {
        message += `\n${err.message || t('unknown_error', { defaultValue: 'Erro desconhecido' })}`;
      }
      alert(message);
    } finally {
      setFormLoading(false);
    }
  };

  const revenues = transactions.filter(t => t.type === TransactionType.REVENUE);
  
  // Filtrar despesas para não mostrar as que são de cartão
  const nonCardExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE && !t.cardId);

  // Calcular faturas dos cartões com seus splits
  const cardBills = cards.map(card => {
    const cardExpenses = transactions.filter(t => t.type === TransactionType.EXPENSE && t.cardId === card.id);
    const total = cardExpenses.reduce((sum, tx) => sum + tx.amount, 0);
    
    if (total === 0) return null;

    // Calcular as porções de cada um na fatura baseada na responsabilidade de cada item
    const userPortion = cardExpenses.reduce((sum, tx) => {
      if (tx.responsibility === userProfile?.uid) return sum + tx.amount;
      if (tx.responsibility === 'couple') return sum + (tx.amount * ratios.user);
      return sum;
    }, 0);

    const partnerPortion = cardExpenses.reduce((sum, tx) => {
      if (tx.responsibility === partnerProfile?.uid) return sum + tx.amount;
      if (tx.responsibility === 'couple') return sum + (tx.amount * ratios.partner);
      return sum;
    }, 0);

    return {
      id: `bill-${card.id}`,
      description: `Fatura: ${card.name}`,
      amount: total,
      userAmount: userPortion,
      partnerAmount: partnerPortion,
      isCardBill: true,
      card
    };
  }).filter(Boolean) as any[];

  const displayExpenses = [...nonCardExpenses, ...cardBills];

  const totals = transactions.reduce((acc, tx) => {
    const isUser = tx.responsibility === userProfile?.uid;
    const isPartner = tx.responsibility === partnerProfile?.uid;
    const isCouple = tx.responsibility === 'couple';

    if (tx.type === TransactionType.REVENUE) {
      acc.rev += tx.amount;
      if (isUser) acc.userRev += tx.amount;
      else if (isPartner) acc.partnerRev += tx.amount;
      else if (isCouple) {
        acc.userRev += tx.amount * ratios.user;
        acc.partnerRev += tx.amount * ratios.partner;
      }
    } else {
      acc.exp += tx.amount;
      if (isUser) acc.userExp += tx.amount;
      else if (isPartner) acc.partnerExp += tx.amount;
      else if (isCouple) {
        acc.userExp += tx.amount * ratios.user;
        acc.partnerExp += tx.amount * ratios.partner;
      }
    }
    return acc;
  }, { rev: 0, exp: 0, userRev: 0, partnerRev: 0, userExp: 0, partnerExp: 0 });

  const openCreateModal = (type: TransactionType) => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setCategory('');
    setDate('');
    setResponsibility(type === TransactionType.REVENUE ? (userProfile?.uid || '') : 'couple');
    setFrequency(FrequencyType.ONCE);
    setShowModal(type);
  };

  return (
    <div className="flex flex-col gap-6 relative">
      <PageTutorial 
        pageId="planning"
        steps={[
          { element: '#summary-header', popover: { title: t('monthly_flow_title', { defaultValue: 'Fluxo Mensal' }), description: t('monthly_flow_desc', { defaultValue: 'Veja um resumo rápido de tudo que entra e sai no seu mês.' }) } },
          { element: '#transaction-lists', popover: { title: t('your_transactions_title', { defaultValue: 'Suas Transações' }), description: t('your_transactions_desc', { defaultValue: 'Lista detalhada de entradas e saídas. Deslize para editar ou excluir.' }) } },
          { element: '#add-buttons', popover: { title: t('new_launches_title', { defaultValue: 'Novos Lançamentos' }), description: t('new_launches_desc', { defaultValue: 'Use o botão verde para receitas e o vermelho para despesas.' }) } },
        ]}
      />
      <MonthSelector />
      
      {/* Summary Header */}
      <div id="summary-header" className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div 
          onClick={() => setExpandedSummary(expandedSummary === 'rev' ? null : 'rev')}
          className="bg-white dark:bg-zinc-900/40 border border-emerald-100/50 dark:border-emerald-900/30 rounded-[32px] p-6 sm:p-8 flex flex-col gap-4 group shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-emerald-950/5 cursor-pointer active:scale-[0.99] transition-all overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.2em] leading-none">{t('total_revenue')}</span>
            <div className="flex items-center gap-3">
              <ChevronDown size={14} className={cn("text-emerald-300 transition-transform duration-300", expandedSummary === 'rev' ? "rotate-180" : "")} />
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-600/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner dark:shadow-emerald-900/20 border border-emerald-100/50 dark:border-emerald-800/30">
                <ArrowUpCircle size={20} />
              </div>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-500 tracking-tighter leading-none">{formatCurrency(totals.rev)}</p>
          
          <AnimatePresence>
            {expandedSummary === 'rev' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="mt-2 flex flex-col gap-3">
                   {transactions.filter(tx => tx.type === TransactionType.REVENUE).map(tx => (
                      <div key={tx.id} className="flex justify-between items-center text-[11px] group">
                         <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", tx.responsibility === 'couple' ? "bg-zinc-300" : tx.responsibility === userProfile?.uid ? userColor.bg : partnerColor.bg)} />
                            <span className="text-zinc-500 dark:text-zinc-400 font-bold">{tx.description}</span>
                         </div>
                         <span className="font-black text-emerald-600 dark:text-emerald-500">{formatCurrency(tx.amount)}</span>
                      </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 pt-4 border-t border-emerald-100 dark:border-emerald-900/20 flex flex-col gap-2">
             <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-500">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", userColor.bg)} />
                  <span className="opacity-70">{t('me')}:</span>
                </div>
                <span className="font-black">{formatCurrency(totals.userRev)}</span>
             </div>
             <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-500">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", partnerColor.bg)} />
                  <span className="opacity-70">{partnerProfile?.displayName?.split(' ')[0] || t('partner')}:</span>
                </div>
                <span className="font-black">{formatCurrency(totals.partnerRev)}</span>
             </div>
          </div>
        </div>

        <div 
          onClick={() => setExpandedSummary(expandedSummary === 'exp' ? null : 'exp')}
          className="bg-white dark:bg-zinc-900/40 border border-rose-100/50 dark:border-rose-900/30 rounded-[32px] p-6 sm:p-8 flex flex-col gap-4 group shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-rose-950/5 cursor-pointer active:scale-[0.99] transition-all overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-rose-800 dark:text-rose-400 uppercase tracking-[0.2em] leading-none">{t('total_expenses_label')}</span>
            <div className="flex items-center gap-3">
              <ChevronDown size={14} className={cn("text-rose-300 transition-transform duration-300", expandedSummary === 'exp' ? "rotate-180" : "")} />
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-600/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner dark:shadow-rose-900/20 border border-rose-100/50 dark:border-rose-800/30">
                <ArrowDownCircle size={20} />
              </div>
            </div>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-500 tracking-tighter leading-none">{formatCurrency(totals.exp)}</p>
          
          <AnimatePresence>
            {expandedSummary === 'exp' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="mt-2 flex flex-col gap-3">
                   {transactions.filter(tx => tx.type === TransactionType.EXPENSE).map(tx => (
                      <div key={tx.id} className="flex justify-between items-center text-[11px] group">
                         <div className="flex items-center gap-2">
                            <div className={cn("w-1.5 h-1.5 rounded-full", tx.responsibility === 'couple' ? "bg-zinc-300" : tx.responsibility === userProfile?.uid ? userColor.bg : partnerColor.bg)} />
                            <span className="text-zinc-500 dark:text-zinc-400 font-bold truncate max-w-[150px]">{tx.description}</span>
                         </div>
                         <span className="font-black text-rose-600 dark:text-rose-500">{formatCurrency(tx.amount)}</span>
                      </div>
                   ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-2 pt-4 border-t border-rose-100 dark:border-rose-900/20 flex flex-col gap-2">
             <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-rose-800 dark:text-rose-500">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", userColor.bg)} />
                  <span className="opacity-70">{t('me')}:</span>
                </div>
                <span className="font-black">{formatCurrency(totals.userExp)}</span>
             </div>
             <div className="flex justify-between items-center text-[10px] sm:text-xs font-bold text-rose-800 dark:text-rose-500">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", partnerColor.bg)} />
                  <span className="opacity-70">{partnerProfile?.displayName?.split(' ')[0] || t('partner')}:</span>
                </div>
                <span className="font-black">{formatCurrency(totals.partnerExp)}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Lists */}
      <div id="transaction-lists" className="flex flex-col gap-10 mt-4">
        {/* Receitas */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-emerald-800">{t('entry_flow')}</h3>
            <span className="text-[10px] font-bold text-zinc-400">{revenues.length} {t('items')}</span>
          </div>
          {revenues.length === 0 && <p className="text-zinc-400 text-sm italic px-2">{t('no_revenue')}</p>}
          <div className="flex flex-col gap-3 sm:gap-6">
            {revenues.map(tx => (
              <div key={tx.id} className="flex flex-col">
                <SwipeableItem 
                  onEdit={() => handleEdit(tx)}
                  onDelete={() => handleDelete(tx.id)}
                  isDeleting={deletingId === tx.id}
                  disabled={isDesktop}
                  className="rounded-[24px] sm:rounded-[28px]"
                >
                  <Card 
                    className="flex items-center border-zinc-200/60 dark:border-zinc-800/60 gap-3 sm:gap-4 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-[24px] sm:rounded-[28px] p-0 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <div 
                      onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                      className="p-3 sm:p-6 flex-1 flex items-center justify-between gap-3 sm:gap-5 group"
                    >
                      <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                         {/* Icon Box */}
                         <div className={cn(
                           "flex w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[20px] items-center justify-center shrink-0 border border-emerald-100/50 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-500 shadow-sm"
                         )}>
                            {(() => {
                              const cat = categories.find(c => c.name === (tx.category || 'Geral'));
                              const Icon = getCategoryIcon(tx.category || 'Geral', cat?.iconName);
                              return <Icon size={isDesktop ? 24 : 20} />;
                            })()}
                         </div>

                        <div className="flex flex-col min-w-0 flex-1 gap-0.5 sm:gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-[13px] sm:text-lg text-zinc-900 dark:text-zinc-100 truncate tracking-tight leading-tight">{tx.description}</span>
                            {tx.frequency === FrequencyType.FIXED && (
                              <span className="text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest shrink-0">{t('fixed')}</span>
                            )}
                            {tx.frequency === FrequencyType.INSTALLMENTS && (
                              <span className="text-[8px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest shrink-0">
                                {tx.installmentIndex}/{tx.installments}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex gap-2 sm:gap-3 items-center">
                            <span className={cn(
                              "text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0 shadow-sm",
                              tx.responsibility === 'couple' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" :
                              tx.responsibility === userProfile?.uid ? cn(userColor.bg, "text-white") :
                              cn(partnerColor.bg, "text-white")
                            )}>
                              {tx.responsibility === 'couple' ? t('joint') : 
                               tx.responsibility === userProfile?.uid ? t('you') : 
                               partnerProfile?.displayName?.split(' ')[0] || t('partner')}
                            </span>
                            <span className="w-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full shrink-0" />
                            {(() => {
                              const cat = categories.find(c => c.name === (tx.category || 'Geral'));
                              return (
                                <span className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-[0.1em] truncate">
                                  {tx.category || t('general_category', { defaultValue: 'Geral' })}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 shrink-0 pr-1 sm:pr-4">
                        <div className="text-right">
                          <span className="text-[15px] sm:text-2xl font-black text-emerald-600 leading-none tracking-tighter">{formatCurrency(tx.amount)}</span>
                        </div>
                        <ChevronDown size={isDesktop ? 18 : 14} className={cn("text-zinc-300 transition-transform duration-300", expandedId === tx.id ? "rotate-180" : "")} />
                      </div>
                    </div>

                    {/* Desktop Actions */}
                    {isDesktop && (
                      <div className="flex items-center gap-2 pr-5">
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handleEdit(tx)}
                           className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                         >
                           <Pencil size={18} />
                         </Button>
                         <Button 
                           variant="ghost" 
                           size="icon" 
                           onClick={() => handleDelete(tx.id)}
                           className={cn(
                             "w-10 h-10 rounded-xl transition-all",
                             deletingId === tx.id 
                               ? "bg-rose-600 text-white" 
                               : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                           )}
                         >
                           <Trash2 size={18} />
                         </Button>
                      </div>
                    )}
                  </Card>
                </SwipeableItem>

                <AnimatePresence>
                  {expandedId === tx.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mt-1 p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-b-2xl border-x border-b border-zinc-100 dark:border-zinc-800/40 flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{t('responsibility')}</span>
                            {tx.responsibility === 'couple' ? (
                              <div className="flex flex-col text-[10px] font-bold">
                                <span>{t('me')}: {formatCurrency(tx.amount * ratios.user)}</span>
                                <span>{t('partner')}: {formatCurrency(tx.amount * ratios.partner)}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] font-bold">100% {tx.responsibility === userProfile?.uid ? t('yours', { defaultValue: 'Sua' }) : t('partner')}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{t('entry_date')}</span>
                            <p className="text-[10px] font-bold">{tx.date}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* Despesas */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-black text-xs uppercase tracking-widest text-rose-800">{t('exit_flow')}</h3>
            <span className="text-[10px] font-bold text-zinc-400">{displayExpenses.length} {t('items')}</span>
          </div>
          {displayExpenses.length === 0 && <p className="text-zinc-400 text-sm italic px-2">{t('no_expenses')}</p>}
          <div className="flex flex-col gap-3 sm:gap-6">
            {displayExpenses.map(item => {
              const isBill = item.isCardBill;
              return (
                <div key={item.id} className="flex flex-col">
                  <SwipeableItem 
                    onEdit={!isBill ? () => handleEdit(item) : undefined}
                    onDelete={!isBill ? () => handleDelete(item.id) : undefined}
                    isDeleting={deletingId === item.id}
                    disabled={isDesktop}
                    className="rounded-[24px] sm:rounded-[28px]"
                  >
                    <Card 
                      className={cn(
                        "flex items-center border gap-3 sm:gap-4 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-[24px] sm:rounded-[28px] p-0 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5",
                        isBill ? "border-rose-200 dark:border-rose-900/50 bg-rose-50/10 dark:bg-rose-950/20" : "border-zinc-200/60 dark:border-zinc-800/60"
                      )}>
                      <div 
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="p-3 sm:p-6 flex-1 flex items-center justify-between gap-3 sm:gap-5 group"
                      >
                        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0">
                           {/* Icon Box */}
                           <div className={cn(
                             "flex w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[20px] items-center justify-center shrink-0 border border-rose-100/50 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-500 shadow-sm"
                           )}>
                              {(() => {
                                const cat = categories.find(c => c.name === (item.category || 'Geral'));
                                const Icon = getCategoryIcon(item.category || 'Geral', cat?.iconName);
                                return <Icon size={isDesktop ? 24 : 20} />;
                              })()}
                           </div>

                          <div className="flex flex-col min-w-0 flex-1 gap-0.5 sm:gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-black text-[13px] sm:text-lg text-zinc-900 dark:text-zinc-100 truncate tracking-tight leading-tight">{item.description}</span>
                              {isBill && (
                                <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest shadow-sm shrink-0">{t('card')}</span>
                              )}
                              {!isBill && item.frequency === FrequencyType.FIXED && (
                                <span className="text-[8px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest shrink-0">{t('fixed')}</span>
                              )}
                              {!isBill && item.frequency === FrequencyType.INSTALLMENTS && (
                                <span className="text-[8px] bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-lg font-black uppercase tracking-widest shrink-0">
                                  {item.installmentIndex}/{item.installments}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2 sm:gap-3 items-center">
                              {!isBill ? (
                                <>
                                  <span className={cn(
                                    "text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0 shadow-sm",
                                    item.responsibility === 'couple' ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400" :
                                    item.responsibility === userProfile?.uid ? cn(userColor.bg, "text-white") :
                                    cn(partnerColor.bg, "text-white")
                                  )}>
                                    {item.responsibility === 'couple' ? t('joint') : 
                                     item.responsibility === userProfile?.uid ? t('you') : 
                                     partnerProfile?.displayName?.split(' ')[0] || t('partner')}
                                  </span>
                                  <span className="w-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full shrink-0" />
                                  <span className="text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-black tracking-[0.1em] truncate">
                                    {item.category || t('general_category', { defaultValue: 'Geral' })}
                                  </span>
                                </>
                              ) : (
                                <div 
                                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em]"
                                  style={{ color: item.card?.color || '#e11d48' }}
                                >
                                  <CreditCard size={12} />
                                  <span>{t('monthly_invoice', { defaultValue: 'Fatura mensal' })}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 shrink-0 pr-1 sm:pr-4">
                          <div className="text-right">
                            <span className="text-[15px] sm:text-2xl font-black text-rose-600 leading-none tracking-tighter">{formatCurrency(item.amount)}</span>
                          </div>
                          <ChevronDown size={isDesktop ? 18 : 14} className={cn("text-zinc-300 transition-transform duration-300", expandedId === item.id ? "rotate-180" : "")} />
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      {isDesktop && !isBill && (
                        <div className="flex items-center gap-2 pr-5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEdit(item)}
                            className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40"
                          >
                            <Pencil size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(item.id)}
                            className={cn(
                              "w-10 h-10 rounded-xl transition-all",
                              deletingId === item.id 
                                ? "bg-rose-600 text-white" 
                                : "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40"
                            )}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </SwipeableItem>

                  <AnimatePresence>
                    {expandedId === item.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mx-4 mt-1 p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-b-2xl border-x border-b border-zinc-100 dark:border-zinc-800/40 flex flex-col gap-3">
                          {isBill ? (
                            <div className="flex flex-col gap-2">
                               <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{t('invoice_composition')}</p>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{t('your_part')}:</span>
                                    <span className="text-sm font-black text-rose-600">{formatCurrency(item.userAmount)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase">{t('partner_part')}:</span>
                                    <span className="text-sm font-black text-rose-600">{formatCurrency(item.partnerAmount)}</span>
                                  </div>
                               </div>
                               <div className="mt-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
                                  <p className="text-[8px] font-black text-zinc-400 uppercase italic">{t('card_items_hint')}</p>
                               </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{t('real_split')}</span>
                                {item.responsibility === 'couple' ? (
                                  <div className="flex flex-col text-[10px] font-bold">
                                    <span>{t('me')}: {formatCurrency(item.amount * ratios.user)}</span>
                                    <span>{t('partner')}: {formatCurrency(item.amount * ratios.partner)}</span>
                                  </div>
                                ) : (
                                  <p className="text-[10px] font-bold">{item.responsibility === userProfile?.uid ? t('your_spending') : t('partner_spending', { partner: partnerProfile?.displayName?.split(' ')[0] || t('partner'), defaultValue: `Gasto de ${partnerProfile?.displayName?.split(' ')[0] || 'Parceiro'}` })}</p>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">{t('entry_date')}</span>
                                <p className="text-[10px] font-bold">{item.date}</p>
                                {item.cardId && (
                                  <span className="text-[8px] font-black text-orange-600 uppercase border border-orange-100 dark:border-orange-900 rounded px-1 w-fit mt-1">{t('card')}: {cards.find(c => c.id === item.cardId)?.name}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FABs */}
      <div id="add-buttons" className="fixed bottom-[92px] sm:bottom-[110px] left-6 sm:left-8 z-20">
        <button 
          onClick={() => openCreateModal(TransactionType.REVENUE)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 text-white rounded-full shadow-2xl shadow-emerald-500/20 dark:shadow-emerald-900/40 flex items-center justify-center active:scale-95 hover:scale-105 transition-all outline-none"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
        </button>
      </div>
      <div className="fixed bottom-[92px] sm:bottom-[110px] right-6 sm:right-8 z-20">
        <button 
          onClick={() => openCreateModal(TransactionType.EXPENSE)}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-rose-500 text-white rounded-full shadow-2xl shadow-rose-500/20 dark:shadow-rose-900/40 flex items-center justify-center active:scale-95 hover:scale-105 transition-all outline-none"
        >
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3]" />
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] p-8 z-50 flex flex-col gap-8 shadow-2xl max-h-[90vh] overflow-y-auto border border-zinc-100 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between">
                <h2 className={cn("text-2xl font-black tracking-tight", showModal === TransactionType.REVENUE ? "text-emerald-600" : "text-rose-600")}>
                  {editingId ? t('edit') : t('new')} {showModal === TransactionType.REVENUE ? t('new_income') : t('new_expense')}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => { setShowModal(null); setEditingId(null); }} className="rounded-full w-10 h-10">
                  <X />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {formError && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold font-mono break-all">
                    {formError}
                  </div>
                )}
                <Input placeholder={t('description')} value={description} onChange={e => setDescription(e.target.value)} required />
                <Input type="number" placeholder={t('value')} value={amount} onChange={e => setAmount(e.target.value)} required />
                
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('category')}</span>
                  <div className="relative">
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)}
                      className="w-full h-14 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl sm:rounded-2xl px-4 text-sm font-bold focus:outline-none focus:border-zinc-900 dark:focus:border-orange-600 transition-all appearance-none dark:text-white"
                    >
                      <option value="">{t('select_category')}</option>
                      {categories.map(c => <option key={c.id} value={c.name} className="dark:bg-zinc-900">{c.name}</option>)}
                      {categories.length === 0 && (
                        <>
                          <option value="Alimentação">{t('food_cat', { defaultValue: 'Alimentação' })}</option>
                          <option value="Transporte">{t('transport_cat', { defaultValue: 'Transporte' })}</option>
                          <option value="Lazer">{t('leisure_cat', { defaultValue: 'Lazer' })}</option>
                          <option value="Assinaturas">{t('subscriptions_cat', { defaultValue: 'Assinaturas' })}</option>
                          <option value="Compras">{t('shopping_cat', { defaultValue: 'Compras' })}</option>
                          <option value="Saúde">{t('health_cat', { defaultValue: 'Saúde' })}</option>
                          <option value="Outros">{t('others_cat', { defaultValue: 'Outros' })}</option>
                        </>
                      )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                <Input type="date" value={date} onChange={e => setDate(e.target.value)} required />
                
                {showModal === TransactionType.EXPENSE && cards.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('link_card')}</span>
                    <div className="relative">
                      <select 
                        value={cardId} 
                        onChange={e => setCardId(e.target.value)}
                        className="w-full h-14 bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 rounded-xl sm:rounded-2xl px-4 text-sm font-bold focus:outline-none focus:border-zinc-900 dark:focus:border-orange-600 transition-all appearance-none dark:text-white"
                      >
                        <option value="" className="dark:bg-zinc-900">{t('no_card')}</option>
                        {cards.map(card => (
                          <option key={card.id} value={card.id} className="dark:bg-zinc-900">
                            {card.name} (**** {card.lastDigits})
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                        <ChevronDown size={18} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('transaction_type')}</span>
                  <div className="flex gap-2">
                    {[
                      { id: FrequencyType.ONCE, label: t('once') },
                      { id: FrequencyType.FIXED, label: t('fixed') },
                      { id: FrequencyType.INSTALLMENTS, label: t('installments') }
                    ].map(f => (
                      <button 
                        key={f.id}
                        type="button"
                        onClick={() => setFrequency(f.id)}
                        className={cn(
                          "flex-1 py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                          frequency === f.id 
                            ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white text-white dark:text-zinc-900" 
                            : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                        )}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {frequency === FrequencyType.INSTALLMENTS && (
                  <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('num_installments')}</span>
                    <Input type="number" placeholder="Ex: 12" value={installments} onChange={e => setInstallments(e.target.value)} min="2" max="60" />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">{t('responsibility_holder')}</span>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      type="button"
                      onClick={() => setResponsibility(userProfile?.uid || '')}
                      className={cn(
                        "flex-1 min-w-[100px] py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                        responsibility === userProfile?.uid 
                          ? "bg-orange-600 border-orange-600 text-white" 
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                      )}
                    >
                      {userProfile?.displayName?.split(' ')[0] || t('me')}
                    </button>
                    {partnerProfile && (
                      <button 
                        type="button"
                        onClick={() => setResponsibility(partnerProfile.uid)}
                        className={cn(
                          "flex-1 min-w-[100px] py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                          responsibility === partnerProfile.uid 
                            ? "bg-orange-600 border-orange-600 text-white" 
                            : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                        )}
                      >
                        {partnerProfile.displayName?.split(' ')[0] || t('partner')}
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setResponsibility('couple')}
                      className={cn(
                        "flex-1 min-w-[100px] py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                        responsibility === 'couple' 
                          ? "bg-orange-600 border-orange-600 text-white" 
                          : "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-400"
                      )}
                    >
                      {t('joint')}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={formLoading} className={cn("mt-4", showModal === TransactionType.REVENUE ? "bg-green-600" : "bg-red-600")}>
                  {formLoading ? t('saving') : t('save')}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
