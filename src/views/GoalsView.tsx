import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { Target, TrendingUp, Plus, X, Trash2, ChevronDown, Calendar, ArrowRight, Wallet, Sparkles, Trophy, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';
import { MonthSelector } from '../components/MonthSelector';
import { motion, AnimatePresence } from 'motion/react';
import { Goal } from '../types';
import { format, differenceInDays, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { SwipeableItem } from '../components/SwipeableItem';

export function GoalsView() {
  const { goals, addGoal, updateGoal, removeGoal } = useFinance();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const totalSaved = goals.reduce((acc, goal) => acc + goal.currentAmount, 0);
  const totalTarget = goals.reduce((acc, goal) => acc + goal.targetAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateGoal(editingId, {
          title,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount),
          deadline
        });
      } else {
        await addGoal({
          title,
          targetAmount: parseFloat(targetAmount),
          currentAmount: parseFloat(currentAmount),
          deadline,
          type: 'savings'
        });
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (deletingId !== id) {
      setDeletingId(id);
      setTimeout(() => setDeletingId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeGoal(id);
    setDeletingId(null);
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline);
    setShowModal(true);
  };

  const calculateCompoundInterest = (principal: number, monthly: number, rate: number, years: number) => {
    const r = rate / 100 / 12;
    const n = years * 12;
    if (r === 0) return principal + monthly * n;
    const futureValue = principal * Math.pow(1 + r, n) + monthly * ((Math.pow(1 + r, n) - 1) / r);
    return futureValue;
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <MonthSelector />
      
      {/* Header & Stats Summary */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">Nossas Metas</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Sonhando e realizando juntos</p>
          </div>
          <Button onClick={() => { resetForm(); setShowModal(true); }} size="icon" className="bg-orange-600 rounded-2xl w-12 h-12 shadow-xl shadow-orange-600/20 dark:shadow-orange-950/40">
            <Plus className="w-6 h-6 text-white" />
          </Button>
        </div>

        {goals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 border-none text-white relative overflow-hidden group">
              <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-white/10 rotate-12 group-hover:scale-110 transition-transform duration-500" />
              <div className="flex flex-col gap-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Total Acumulado</span>
                <p className="text-3xl font-black">{formatCurrency(totalSaved)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1.5 flex-1 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${overallProgress}%` }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                  <span className="text-[10px] font-black">{overallProgress.toFixed(1)}%</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-zinc-900 border-zinc-800 text-white flex flex-col justify-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Objetivo Total</span>
              <p className="text-2xl font-black">{formatCurrency(totalTarget)}</p>
              <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">
                Faltam {formatCurrency(totalTarget - totalSaved)} para o sucesso absoluto
              </p>
            </Card>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {goals.length === 0 && (
          <div className="p-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[40px] bg-white dark:bg-zinc-900/30 flex flex-col gap-6 items-center">
             <div className="w-20 h-20 bg-orange-50 dark:bg-orange-500/10 rounded-full flex items-center justify-center">
                <Target className="w-10 h-10 text-orange-500" />
             </div>
             <div className="flex flex-col gap-2">
               <h3 className="text-xl font-black text-zinc-900 dark:text-white">Qual o próximo sonho?</h3>
               <p className="text-zinc-500 dark:text-zinc-400 font-bold max-w-[280px] mx-auto text-sm">
                 Viagem, casa própria, ou reserva de emergência? Defina suas metas e acompanhe o progresso.
               </p>
             </div>
             <Button onClick={() => setShowModal(true)} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8">
               Criar Primeira Meta
             </Button>
          </div>
        )}
        
        {goals.map(goal => {
          const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
          const isCompleted = progress >= 100;
          const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null;

          return (
            <SwipeableItem
              key={goal.id}
              onEdit={() => handleEdit(goal)}
              onDelete={() => handleDelete(goal.id)}
              isDeleting={deletingId === goal.id}
            >
              <Card 
                onClick={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                className={cn(
                  "p-0 overflow-hidden relative group bg-white dark:bg-zinc-900/40 border-none ring-1 ring-zinc-200/50 dark:ring-zinc-800/60 shadow-sm transition-all active:scale-[0.985] duration-300",
                  expandedId === goal.id && "ring-orange-500/40 ring-2 shadow-xl"
                )}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-300",
                        isCompleted ? "bg-emerald-100 dark:bg-emerald-950" : "bg-orange-50 dark:bg-orange-950"
                      )}>
                        {isCompleted ? (
                          <Trophy className="w-6 h-6 text-emerald-600" />
                        ) : (
                          <Target className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-black text-zinc-900 dark:text-white leading-tight truncate">{goal.title}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">
                            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1 shrink-0">
                       <span className={cn(
                         "text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-wider",
                         isCompleted ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                       )}>
                         {isCompleted ? 'Finalizada' : goal.deadline ? format(parseISO(goal.deadline), "MMM 'yy", { locale: ptBR }) : 'Sem prazo'}
                       </span>
                       {!isCompleted && daysLeft !== null && daysLeft > 0 && (
                         <span className="text-[8px] font-bold text-zinc-400 uppercase">Faltam {daysLeft} dias</span>
                       )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-2">
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full overflow-hidden p-[2px]">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          isCompleted ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : "bg-gradient-to-r from-orange-400 to-orange-600"
                        )}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{progress.toFixed(0)}% Concluído</span>
                      {expandedId !== goal.id && <ChevronDown className="text-zinc-300" size={14} />}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === goal.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                      className="overflow-hidden bg-zinc-50/50 dark:bg-black/20"
                    >
                      <div className="p-6 border-t border-zinc-100 dark:border-zinc-800/60 flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1.5 text-rose-500 mb-1">
                                <Wallet size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Falta Poupar</span>
                             </div>
                             <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                               {isCompleted ? formatCurrency(0) : formatCurrency(goal.targetAmount - goal.currentAmount)}
                             </p>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end text-right">
                             <div className="flex items-center gap-1.5 text-emerald-500 mb-1">
                                <TrendingUp size={12} />
                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Esforço Mensal</span>
                             </div>
                             <p className="text-lg font-black text-zinc-900 dark:text-white leading-none">
                                {(() => {
                                  const diff = goal.targetAmount - goal.currentAmount;
                                  if (diff <= 0) return 'Sucesso!';
                                  const today = new Date();
                                  const targetDate = parseISO(goal.deadline);
                                  if (!isValid(targetDate)) return 'Defina data';
                                  
                                  const monthsLeft = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
                                  return formatCurrency(diff / (monthsLeft > 0 ? monthsLeft : 1));
                                })()}
                             </p>
                          </div>
                        </div>
                        
                        <div className="bg-white dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 flex flex-col gap-3">
                           <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center shrink-0">
                               <Lightbulb size={12} className="text-orange-500" />
                             </div>
                             <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Insight do Especialista</span>
                           </div>
                           <p className="text-xs text-zinc-500 italic leading-relaxed font-medium">
                              {isCompleted 
                                ? 'Parabéns casal! Vocês atingiram esta meta. Agora é hora de celebrar ou reinvestir este esforço no próximo sonho.'
                                : `Com as taxas atuais, se vocês automatizarem este aporte, chegarão no objetivo ${goal.deadline ? 'através de juros compostos em menos tempo.' : 'muito mais rápido.'}`
                              }
                           </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2">
                           <Button 
                             onClick={(e) => { e.stopPropagation(); handleDelete(goal.id); }}
                             variant="ghost" 
                             size="sm" 
                             className="text-zinc-400 hover:text-rose-500"
                           >
                             <Trash2 size={14} className="mr-2" />
                             Excluir Meta
                           </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </SwipeableItem>
          );
        })}
      </div>

      {/* Financial Simulator Section */}
      <div className="mt-4 flex flex-col gap-6">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
             <TrendingUp className="w-5 h-5 text-orange-500" />
           </div>
           <h3 className="font-black text-xl text-zinc-900 dark:text-white tracking-tighter">Simulador de Futuro</h3>
        </div>

        <Card className="bg-zinc-900 text-white p-8 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp size={120} className="rotate-12" />
          </div>
          
          <div className="flex flex-col gap-8 relative z-10">
            <div className="flex flex-col gap-2">
              <p className="text-zinc-400 text-sm font-medium leading-relaxed max-w-[300px]">
                Veja o poder do tempo e dos juros compostos com uma economia mensal agressiva.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">Após 5 anos</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">{formatCurrency(calculateCompoundInterest(0, 1000, 12, 5))}</span>
                  <span className="text-[10px] text-emerald-500 font-black uppercase">+32% lucro</span>
                </div>
                <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full w-1/3 bg-orange-500" />
                </div>
              </div>

              <div className="flex flex-col bg-white/5 backdrop-blur-sm p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-colors">
                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3">Após 10 anos</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">{formatCurrency(calculateCompoundInterest(0, 1000, 12, 10))}</span>
                  <span className="text-[10px] text-emerald-500 font-black uppercase">+110% lucro</span>
                </div>
                <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                   <div className="h-full w-2/3 bg-orange-500" />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
               <div className="flex items-center gap-2 text-zinc-500">
                 <Calendar size={14} />
                 <span className="text-[10px] font-bold uppercase">Cálculo baseado em SELIC 12.0% aa</span>
               </div>
               <Button variant="ghost" size="sm" className="text-orange-500 text-[10px] p-0 font-black">
                 SIMULAR COM OUTROS VALORES <ArrowRight size={12} className="ml-2" />
               </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Modal Metas */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
              onClick={() => setShowModal(false)}
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0 }} 
              animate={{ y: 0, opacity: 1 }} 
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 md:relative md:bottom-auto md:left-auto md:right-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-lg bg-white dark:bg-zinc-900 rounded-t-[40px] md:rounded-[40px] p-8 z-[70] flex flex-col gap-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tighter">
                    {editingId ? 'Ajustar Rota' : 'Novo Horizonte'}
                  </h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                    {editingId ? 'Refinando seus objetivos' : 'Adicione um novo sonho financeiro'}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full" onClick={() => setShowModal(false)}>
                  <X size={20} />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Título da Conquista</label>
                  <Input placeholder="Ex: Lua de Mel na Grécia" value={title} onChange={e => setTitle(e.target.value)} required />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Valor Almejado (Total)</label>
                      <Input type="number" placeholder="R$ 0,00" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} required />
                   </div>
                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Já Conquistado</label>
                      <Input type="number" placeholder="R$ 0,00" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} required />
                   </div>
                </div>

                <div className="flex flex-col gap-2">
                   <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] px-1">Prazo Estimado</label>
                   <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
                </div>

                <div className="pt-4 grid grid-cols-2 gap-3">
                  <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="h-14">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading} className="bg-orange-600 h-14 rounded-2xl text-sm font-black shadow-lg shadow-orange-600/20">
                    {loading ? "Processando..." : (editingId ? "Salvar Alterações" : "Ativar Meta")}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
