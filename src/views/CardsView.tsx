import React, { useState, useRef } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { 
  CreditCard, 
  FileUp, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  Plus,
  ArrowRight,
  Lock,
  ChevronDown,
  X,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { MonthSelector } from '../components/MonthSelector';
import { TransactionType, FrequencyType } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GoogleGenAI, Type } from "@google/genai";
import { auth } from '../lib/firebase';
import { getCategoryIcon } from '../lib/category-icons';

import { SwipeableItem } from '../components/SwipeableItem';

export function CardsView() {
  const { 
    ratios, 
    userProfile, 
    partnerProfile, 
    cards, 
    cardSummaries, 
    categories,
    transactions,
    addCard, 
    updateCard, 
    removeCard, 
    addTransaction,
    removeTransaction,
    updateTransaction,
    selectedMonth,
    isFamilyPremium
  } = useFinance();
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedTx, setImportedTx] = useState<any[]>([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [importCardId, setImportCardId] = useState<string>('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [tempTxDescription, setTempTxDescription] = useState('');
  const [editingImportedId, setEditingImportedId] = useState<string | null>(null);
  const [tempImportedDesc, setTempImportedDesc] = useState('');

  // Deletion logic for individual card transactions
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const handleDeleteTx = async (id: string) => {
    if (deletingTxId !== id) {
      setDeletingTxId(id);
      setTimeout(() => setDeletingTxId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeTransaction(id);
    setDeletingTxId(null);
  };

  const handleUpdateTxDescription = async (id: string) => {
    if (!tempTxDescription.trim()) {
      setEditingTxId(null);
      return;
    }
    await updateTransaction(id, { description: tempTxDescription });
    setEditingTxId(null);
    setTempTxDescription('');
  };

  const handleUpdateImportedDesc = (id: string) => {
    if (!tempImportedDesc.trim()) {
      setEditingImportedId(null);
      return;
    }
    updateImportedItem(id, { desc: tempImportedDesc });
    setEditingImportedId(null);
    setTempImportedDesc('');
  };

  // Filter card transactions for display
  const cardTransactions = transactions
    .filter(t => t.cardId && t.type === TransactionType.EXPENSE)
    .sort((a, b) => b.date.localeCompare(a.date));

  // New Transaction Form (Internal Quick Add)
  const [showQuickAddTx, setShowQuickAddTx] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txResponsibility, setTxResponsibility] = useState<string>('couple');
  const [formLoading, setFormLoading] = useState(false);

  // New Card Form
  const [cardName, setCardName] = useState('');
  const [lastDigits, setLastDigits] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardOwner, setCardOwner] = useState(userProfile?.uid || '');
  const [cardColor, setCardColor] = useState('#18181b'); // Default to black/zinc
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CARD_COLORS = [
    { name: 'Black', value: '#18181b' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Gold', value: '#ca8a04' },
  ];

  const CATEGORY_MAP: Record<string, string> = {
    'Netflix': 'Assinaturas',
    'Spotify': 'Assinaturas',
    'Amazon': 'Compras',
    'Mercado': 'Alimentação',
    'Uber': 'Transporte',
    '99App': 'Transporte',
    'Ifood': 'Alimentação',
    'Restaurante': 'Lazer',
    'Shopping': 'Compras',
    'Farmacia': 'Saúde',
    'Droga': 'Saúde',
    'Shell': 'Transporte',
    'Posto': 'Transporte',
  };

  const guessCategory = (description: string) => {
    const desc = description.toUpperCase();
    for (const [key, cat] of Object.entries(CATEGORY_MAP)) {
      if (desc.includes(key.toUpperCase())) return cat;
    }
    return 'Geral';
  };

  const handleQuickAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCardId) return;
    setFormLoading(true);
    try {
      await addTransaction({
        description: txDescription,
        amount: parseFloat(txAmount),
        category: txCategory || guessCategory(txDescription),
        date: txDate,
        type: TransactionType.EXPENSE,
        responsibility: txResponsibility as any,
        cardId: selectedCardId,
        ownerId: userProfile?.uid
      });
      setShowQuickAddTx(false);
      setTxDescription('');
      setTxAmount('');
      setTxCategory('');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar transação.');
    } finally {
      setFormLoading(false);
    }
  };

  const fileToPart = async (file: File) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!importCardId) {
      alert('Selecione um cartão para importar.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(10);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const pdfPart = await fileToPart(file) as any;
      setImportProgress(30);

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              pdfPart,
              { text: "Você é um especialista financeiro. Analise esta fatura de cartão de crédito e extraia TODAS as transações de compras, serviços e pagamentos. Para cada transação, encontre: 'desc' (nome), 'val' (valor; positivo para compras, negativo para pagamentos/créditos), 'cat' (Alimentação, Transporte, Lazer, Assinaturas, Compras, Saúde, Geral), 'day' (dia do mês) e DETECTE PARCELAS (ex: '02/10', '1 de 5', 'P-03'). Se houver parcelas, extraia 'installments' (total) e 'current' (a parcela atual mostrada na fatura). Ignore juros e taxas. Retorne apenas o array JSON." }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                desc: { type: Type.STRING },
                val: { type: Type.NUMBER },
                cat: { type: Type.STRING },
                day: { type: Type.INTEGER },
                installments: { type: Type.INTEGER },
                current: { type: Type.INTEGER }
              },
              required: ["desc", "val", "cat", "day"]
            }
          }
        }
      });

      setImportProgress(90);
      const data = JSON.parse(response.text || "[]");
      
      setImportedTx(data.map((item: any, index: number) => ({
        id: `import_${Date.now()}_${index}`,
        desc: item.desc,
        val: item.val,
        cat: item.cat || guessCategory(item.desc),
        day: item.day,
        resp: 'couple',
        installments: item.installments,
        current: item.current
      })));

      setImportProgress(100);
    } catch (err) {
      console.error(err);
      alert('Erro ao analisar o PDF. Verifique se o arquivo é uma fatura válida ou tente novamente.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const updateImportedItem = (id: string, updates: any) => {
    setImportedTx(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const removeImportedItem = (id: string) => {
    setImportedTx(prev => prev.filter(item => item.id !== id));
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: cardName,
      lastDigits,
      limit: parseFloat(cardLimit),
      ownerId: cardOwner,
      color: cardColor
    };

    if (editingCardId) {
      await updateCard(editingCardId, data);
    } else {
      await addCard(data);
    }
    
    setShowAddCard(false);
    resetCardForm();
  };

  const resetCardForm = () => {
    setEditingCardId(null);
    setCardName('');
    setLastDigits('');
    setCardLimit('');
    setCardColor('#18181b');
    setCardOwner(userProfile?.uid || '');
  };

  const longPressTimer = useRef<any>(null);

  const startLongPress = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      setDeletingCardId(id);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleEditCard = (card: any) => {
    setEditingCardId(card.id);
    setCardName(card.name);
    setLastDigits(card.lastDigits);
    setCardLimit(card.limit.toString());
    setCardOwner(card.ownerId);
    setCardColor(card.color || '#18181b');
    setShowAddCard(true);
  };

  const handleDeleteCard = async (id: string) => {
    if (deletingCardId !== id) {
      setDeletingCardId(id);
      setTimeout(() => setDeletingCardId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeCard(id);
    setDeletingCardId(null);
  };

  const handleSaveImported = async () => {
    setFormLoading(true);
    try {
      for (const tx of importedTx) {
        // Build the date using the day from the PDF if available
        let txDateStr = `${selectedMonth}-15`;
        if (tx.day) {
          const day = String(tx.day).padStart(2, '0');
          txDateStr = `${selectedMonth}-${day}`;
        }
        
        await addTransaction({
          description: tx.desc,
          amount: Math.abs(tx.val),
          category: tx.cat,
          responsibility: tx.resp,
          type: tx.val < 0 ? TransactionType.REVENUE : TransactionType.EXPENSE,
          date: txDateStr,
          ownerId: userProfile?.uid,
          cardId: importCardId,
          frequency: tx.installments ? FrequencyType.INSTALLMENTS : FrequencyType.ONCE,
          installments: tx.installments,
          startInstallmentIndex: tx.current || 1
        } as any);
      }
      setImportedTx([]);
      setImportCardId('');
      alert(`Sucesso! Transações adicionadas ao mês de ${format(parseISO(selectedMonth + '-01'), 'MMMM', { locale: ptBR })}.`);
    } catch (err) {
      alert('Erro ao salvar algumas transações.');
    } finally {
      setFormLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Dynamic statistics for subscriptions and installments
  const activeSubscriptionsCount = transactions.filter(t => 
    t.type === TransactionType.EXPENSE && 
    (t.frequency === FrequencyType.FIXED || t.category === 'Assinaturas')
  ).length;

  const installmentTransactions = transactions.filter(t => 
    t.type === TransactionType.EXPENSE && 
    t.frequency === FrequencyType.INSTALLMENTS && 
    t.installments && 
    t.installmentIndex
  );

  const totalRemainingInstallments = installmentTransactions
    .reduce((acc, t) => acc + (t.installments! - t.installmentIndex!), 0);

  const totalRemainingValue = installmentTransactions
    .reduce((acc, t) => {
      const remainingCount = t.installments! - t.installmentIndex!;
      return acc + (t.amount * remainingCount);
    }, 0);

  const currentImportTotal = importedTx.reduce((acc, tx) => acc + tx.val, 0);

  return (
    <div className="flex flex-col gap-8 pb-32">
      <MonthSelector />
      
      {/* Cards Slider/List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">Meus Cartões</h3>
          <Button variant="ghost" size="sm" onClick={() => setShowAddCard(true)} className="text-orange-600 font-bold">
            <Plus size={16} className="mr-1" /> Adicionar
          </Button>
        </div>

        {cards.length === 0 && (
          <Card className="p-8 border-dashed border-2 border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-4 text-center bg-transparent">
            <CreditCard className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Você ainda não tem cartões cadastrados.</p>
            <Button variant="outline" onClick={() => setShowAddCard(true)}>Cadastrar Novo</Button>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {cardSummaries.map(card => (
              <SwipeableItem
                key={card.id}
                onEdit={() => handleEditCard(card)}
                onDelete={() => setDeletingCardId(card.id)}
                isDeleting={deletingCardId === card.id}
                className="overflow-visible"
              >
                <div className="relative">
                  <Card 
                    onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
                    className="text-white p-5 sm:p-6 relative overflow-hidden group border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition-all duration-500 cursor-pointer active:scale-[0.99]" 
                    style={{ backgroundColor: card.color || '#18181b' }}
                  >
                    {/* Main Glossy Reflection */}
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                    
                    {/* Secondary Bottom Reflection */}
                    <div className="absolute bottom-[-10%] left-[-5%] w-40 h-40 bg-black/20 rounded-full blur-2xl" />
                    
                    {/* Glass Shine Line */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-50" />

                    <div className="relative z-10 flex flex-col gap-4 sm:gap-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-base sm:text-lg leading-none">{card.name}</h4>
                          <span className="text-white/50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                            Titular: {card.ownerId === userProfile?.uid ? 'Você' : partnerProfile?.displayName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedCardId(card.id); setShowQuickAddTx(true); }}
                            className="p-1.5 sm:p-2 hover:bg-white/20 rounded-xl transition-all"
                          >
                            <Plus size={16} strokeWidth={3} />
                          </button>
                          <ChevronDown className={cn("text-white/50 transition-transform duration-300", expandedCardId === card.id ? "rotate-180" : "")} size={16} />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex flex-col gap-1">
                            <span className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase">Fatura Atual</span>
                            <span className="text-xl sm:text-2xl font-black text-white">{formatCurrency(card.invoiceTotal || 0)}</span>
                            <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
                              <div 
                                className="bg-white h-full transition-all duration-1000" 
                                style={{ width: `${Math.min((card.invoiceTotal / card.limit) * 100, 100)}%` }}
                              />
                            </div>
                         </div>
                         <div className="flex flex-col gap-1 text-right">
                            <span className="text-white/50 text-[9px] sm:text-[10px] font-bold uppercase">Limite Total</span>
                            <span className="text-lg sm:text-xl font-bold opacity-60">{formatCurrency(card.limit)}</span>
                            <span className="text-[9px] sm:text-[10px] font-black text-white/40">Disp: {formatCurrency(card.limit - card.invoiceTotal)}</span>
                         </div>
                      </div>

                      <AnimatePresence>
                        {expandedCardId === card.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1 text-left">
                                <span className="text-white/40 text-[8px] font-black uppercase tracking-widest">Comprometimento</span>
                                <p className="text-sm font-black italic">{((card.invoiceTotal / card.limit) * 100).toFixed(1)}% <span className="text-[10px] font-normal opacity-50">do limite</span></p>
                              </div>
                              <div className="flex flex-col gap-1 text-right">
                                <span className="text-white/40 text-[8px] font-black uppercase tracking-widest">Melhor Dia Compra</span>
                                <p className="text-sm font-black italic">Todo dia 10</p>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-white/10 w-full">
                               <p className="text-white/40 text-[8px] font-black uppercase tracking-widest mb-2">Resumo da Fatura</p>
                               <div className="flex justify-between text-[10px] font-bold text-white/70">
                                  <span>Responsável Eu:</span>
                                  <span>{formatCurrency(card.invoiceTotal * ratios.user)}</span>
                               </div>
                               <div className="flex justify-between text-[10px] font-bold text-white/70 mt-1">
                                  <span>Responsável Par:</span>
                                  <span>{formatCurrency(card.invoiceTotal * ratios.partner)}</span>
                               </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-zinc-300 uppercase">
                        <span>**** {card.lastDigits}</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                             <div className="w-1 h-1 rounded-full bg-emerald-400" />
                             <span>Ativo</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Confirm Deletion Overlay */}
                  <AnimatePresence>
                    {deletingCardId === card.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-20 bg-rose-600/95 backdrop-blur-md rounded-[2rem] flex flex-col items-center justify-center gap-4 text-white p-6 text-center"
                      >
                        <AlertCircle size={40} strokeWidth={3} />
                        <div>
                          <h4 className="text-lg font-black uppercase">Confirmar Exclusão?</h4>
                          <p className="text-xs opacity-80">Esta ação não pode ser desfeita.</p>
                        </div>
                        <div className="flex gap-3 w-full">
                          <Button 
                            onClick={(e) => { e?.stopPropagation(); setDeletingCardId(null); }}
                            className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded-xl h-12 font-black uppercase text-[10px]"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={(e) => { e?.stopPropagation(); handleDeleteCard(card.id); }}
                            className="flex-1 bg-white text-rose-600 hover:bg-rose-50 rounded-xl h-12 font-black uppercase text-[10px]"
                          >
                            Excluir
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </SwipeableItem>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Import Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-xs uppercase tracking-widest text-zinc-500">Lupa de PDFs</h3>
          {importedTx.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setImportedTx([]); setImportCardId(''); }} className="text-zinc-400">
              Cancelar
            </Button>
          )}
        </div>

        {importedTx.length === 0 ? (
          <Card className={cn(
            "dashed border-2 border-dashed border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col items-center justify-center p-12 text-center gap-6 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.02)]",
            !isFamilyPremium && "opacity-80 grayscale-[0.5]"
          )}>
            {!isFamilyPremium && (
              <div className="absolute inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 bg-gradient-to-t from-white dark:from-zinc-950 via-transparent">
                 <div className="bg-orange-600 p-2 rounded-xl mb-4 shadow-xl shadow-orange-600/20">
                   <Lock className="w-6 h-6 text-white" />
                 </div>
                 <h4 className="font-extrabold text-sm uppercase tracking-widest text-zinc-900 dark:text-white">Funcionalidade Premium</h4>
                 <p className="text-[10px] text-zinc-500 dark:text-zinc-400 max-w-[180px] mt-2 mb-4 leading-relaxed text-center">
                   A IA de importação automática é exclusiva para assinantes Premium Full.
                 </p>
                 <Button 
                   size="sm" 
                   onClick={() => {/* Navigate to profile or just show info */}}
                   className="h-8 text-[10px] font-black uppercase tracking-widest px-6 shadow-none"
                 >
                   Saiba Mais no Perfil
                 </Button>
              </div>
            )}
            <div className="w-16 h-16 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
              <FileUp className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex flex-col gap-4 w-full max-w-xs transition-opacity duration-300" style={{ opacity: isFamilyPremium ? 1 : 0.2 }}>
              <div>
                <p className="font-bold text-lg text-zinc-900 dark:text-white">Importar Fatura</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Selecione o cartão para vincular as despesas</p>
              </div>
              
              <div className="relative">
                <select 
                  value={importCardId} 
                  onChange={e => setImportCardId(e.target.value)}
                  className="w-full h-12 bg-white dark:bg-zinc-900 border-2 border-zinc-200/50 dark:border-zinc-800 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-orange-600 transition-all appearance-none dark:text-white"
                >
                  <option value="" className="dark:bg-zinc-900">Selecione um cartão...</option>
                  {cards.map(c => <option key={c.id} value={c.id} className="dark:bg-zinc-900">{c.name} (**** {c.lastDigits})</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                  <ChevronDown size={18} />
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="application/pdf"
                onChange={handleImport}
              />

              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isImporting || !importCardId || !isFamilyPremium}
                className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl h-12"
              >
                {isImporting ? `Analisando... ${importProgress}%` : 'Selecionar PDF da Fatura'}
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-center gap-3">
               <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                 <Search size={16} />
               </div>
               <p className="text-sm font-bold text-orange-800 dark:text-orange-400">Encontramos {importedTx.length} transações. Revise antes de salvar.</p>
             </div>

             <div className="flex flex-col gap-3">
               {importedTx.map(tx => (
                 <Card key={tx.id} className="p-4 flex flex-col gap-4 group hover:border-orange-200 dark:hover:border-orange-900 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center font-black text-zinc-400" style={(() => {
                           const cat = categories.find(c => c.name === tx.cat);
                           return cat ? { backgroundColor: cat.color + (userProfile?.darkMode ? '30' : '20'), color: cat.color } : {};
                        })()}>
                           {(() => {
                             const cat = categories.find(c => c.name === tx.cat);
                             const Icon = getCategoryIcon(tx.cat || tx.desc, cat?.iconName);
                             return <Icon size={20} />;
                           })()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                             {editingImportedId === tx.id ? (
                               <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                 <Input
                                   value={tempImportedDesc}
                                   onChange={(e) => setTempImportedDesc(e.target.value)}
                                   className="h-7 text-[10px] font-bold py-0 w-[150px]"
                                   autoFocus
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') handleUpdateImportedDesc(tx.id);
                                     if (e.key === 'Escape') setEditingImportedId(null);
                                   }}
                                 />
                                 <Button 
                                   size="sm" 
                                   className="h-6 w-6 p-0 bg-emerald-500" 
                                   onClick={() => handleUpdateImportedDesc(tx.id)}
                                 >
                                   <CheckCircle2 size={12} />
                                 </Button>
                               </div>
                             ) : (
                               <div className="flex items-center gap-2 group/desc cursor-pointer" onClick={() => {
                                 setEditingImportedId(tx.id);
                                 setTempImportedDesc(tx.desc);
                               }}>
                                 <p className="font-bold text-[14px] leading-tight text-zinc-900 dark:text-white truncate max-w-[150px]">{tx.desc}</p>
                                 <Pencil size={10} className="text-zinc-300 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
                               </div>
                             )}
                             {tx.day && <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-[10px] font-black px-1.5 py-0.5 rounded">Dia {tx.day}</span>}
                             {tx.installments && (
                               <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[10px] font-black px-1.5 py-0.5 rounded">
                                 {tx.current}/{tx.installments}
                               </span>
                             )}
                          </div>
                          <p className="text-lg font-black mt-1 text-zinc-900 dark:text-white">{formatCurrency(tx.val)}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 min-w-[120px]">
                        <select 
                          value={tx.cat} 
                          onChange={e => updateImportedItem(tx.id, { cat: e.target.value })}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 focus:outline-none focus:border-orange-600 appearance-none"
                        >
                          <option value="Geral">Categorizar</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>

                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateImportedItem(tx.id, { resp: userProfile?.uid })}
                            title={userProfile?.displayName || 'Usuário 1'}
                            className={cn(
                              "flex-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all truncate",
                              tx.resp === userProfile?.uid ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            {userProfile?.displayName?.split(' ')[0] || 'Eu'}
                          </button>
                          <button 
                            onClick={() => updateImportedItem(tx.id, { resp: 'couple' })}
                            className={cn(
                              "flex-1 px-2 py-1 rounded text-[9px] font-black uppercase transition-all",
                              tx.resp === 'couple' ? "bg-orange-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            Conjunta
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeImportedItem(tx.id)}
                        className="p-2 text-zinc-300 dark:text-zinc-700 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                 </Card>
               ))}
             </div>

             <Button 
               onClick={handleSaveImported}
               disabled={formLoading}
               className="bg-emerald-600 text-white h-16 rounded-[24px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
             >
                {formLoading ? 'Salvando no Sistema...' : `Finalizar Importação (${formatCurrency(currentImportTotal)})`}
             </Button>

             <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-8">
               As despesas serão lançadas para {format(parseISO(selectedMonth + '-01'), 'MMMM', { locale: ptBR })}
             </p>
          </div>
        )}
      </div>

      {/* Card Transactions List */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-xs uppercase tracking-widest text-zinc-500">Lançamentos nos Cartões</h3>
          <span className="text-[10px] font-bold text-zinc-400">{cardTransactions.length} itens</span>
        </div>
        
        {cardTransactions.length === 0 ? (
          <p className="text-center text-zinc-400 text-sm italic py-4">Nenhuma despesa no cartão este mês.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {cardTransactions.map(tx => {
              const card = cards.find(c => c.id === tx.cardId);
              const cat = categories.find(c => c.name === tx.category);
              const Icon = getCategoryIcon(tx.category || 'Geral', cat?.iconName);
              
              return (
                <div key={tx.id} className="flex flex-col">
                  <SwipeableItem
                    onDelete={() => handleDeleteTx(tx.id)}
                    isDeleting={deletingTxId === tx.id}
                  >
                    <div 
                      onClick={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                      className="bg-white dark:bg-zinc-900/50 p-4 rounded-2xl flex items-center justify-between shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border border-zinc-200/50 dark:border-zinc-800 gap-3 cursor-pointer transition-all active:scale-[0.99]"
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {editingTxId === tx.id ? (
                            <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={tempTxDescription}
                                onChange={(e) => setTempTxDescription(e.target.value)}
                                className="h-7 text-xs font-black py-0"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateTxDescription(tx.id);
                                  if (e.key === 'Escape') setEditingTxId(null);
                                }}
                              />
                              <Button 
                                size="sm" 
                                className="h-7 w-7 p-0 bg-emerald-500 hover:bg-emerald-600" 
                                onClick={() => handleUpdateTxDescription(tx.id)}
                              >
                                <CheckCircle2 size={14} />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-7 w-7 p-0 text-zinc-400" 
                                onClick={() => setEditingTxId(null)}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span className="font-black text-zinc-900 dark:text-zinc-100 truncate">{tx.description}</span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 w-5 p-0 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTxId(tx.id);
                                  setTempTxDescription(tx.description);
                                }}
                              >
                                <Pencil size={10} />
                              </Button>
                            </>
                          )}
                          <span 
                            className="text-[8px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter"
                            style={{ color: card?.color || '#3f3f46' }}
                          >
                            {card?.name}
                          </span>
                          <ChevronDown size={12} className={cn("text-zinc-300 transition-transform duration-300", expandedTxId === tx.id ? "rotate-180" : "")} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Icon size={10} style={{ color: cat?.color || '#71717a' }} />
                            <span className="text-[9px] text-zinc-400 font-bold uppercase">{tx.category || 'Geral'}</span>
                          </div>
                          <span className="w-0.5 h-0.5 bg-zinc-300 dark:bg-zinc-800 rounded-full" />
                          <span className="text-[9px] text-zinc-400 font-bold uppercase">
                            {tx.responsibility === 'couple' ? 'Conjunta' : (tx.responsibility === userProfile?.uid ? 'Eu' : 'Parceiro')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-base font-black text-rose-600 dark:text-rose-500">{formatCurrency(tx.amount)}</span>
                      </div>
                    </div>
                  </SwipeableItem>

                  <AnimatePresence>
                    {expandedTxId === tx.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                         <div className="mx-4 mt-1 p-4 bg-zinc-50 dark:bg-zinc-900/20 rounded-b-2xl border-x border-b border-zinc-100 dark:border-zinc-800/40 flex flex-col gap-3">
                            <div className="grid grid-cols-2 gap-4">
                               <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Divisão da Compra</span>
                                  {tx.responsibility === 'couple' ? (
                                    <div className="flex flex-col text-[10px] font-bold">
                                       <span>Sua: {formatCurrency(tx.amount * ratios.user)}</span>
                                       <span>Par: {formatCurrency(tx.amount * ratios.partner)}</span>
                                    </div>
                                  ) : (
                                    <p className="text-[10px] font-bold">{tx.responsibility === userProfile?.uid ? '100% Sua' : '100% Parceiro'}</p>
                                  )}
                               </div>
                               <div className="flex flex-col gap-1">
                                  <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Data Lanc.</span>
                                  <p className="text-[10px] font-bold">{tx.date}</p>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      <AnimatePresence>
        {showAddCard && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => { setShowAddCard(false); resetCardForm(); }}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-[32px] p-6 z-50 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">{editingCardId ? 'Editar Cartão' : 'Novo Cartão'}</h2>
                <Button variant="ghost" size="icon" onClick={() => { setShowAddCard(false); resetCardForm(); }}>
                  <X />
                </Button>
              </div>

              <form onSubmit={handleAddCard} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nome do Cartão</span>
                  <Input placeholder="Ex: Nubank Principal" value={cardName} onChange={e => setCardName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Últimos 4 Dígitos</span>
                      <Input placeholder="1234" maxLength={4} value={lastDigits} onChange={e => setLastDigits(e.target.value)} required />
                   </div>
                   <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Limite</span>
                      <Input type="number" placeholder="5000" value={cardLimit} onChange={e => setCardLimit(e.target.value)} required />
                   </div>
                </div>
                
                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Cor do Card</span>
                   <div className="flex flex-wrap gap-4 p-1">
                      {CARD_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCardColor(color.value)}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all shadow-lg relative overflow-hidden group",
                            cardColor === color.value ? "ring-4 ring-orange-500 scale-110 shadow-orange-500/20" : "hover:scale-105"
                          )}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        >
                          {/* Mini reflection for the button */}
                          <div className="absolute top-[-20%] right-[-10%] w-8 h-8 bg-white/20 rounded-full blur-md" />
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                          {cardColor === color.value && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,1)]" />
                            </div>
                          )}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Titular</span>
                   <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setCardOwner(userProfile?.uid || '')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                          cardOwner === userProfile?.uid ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-400 border-zinc-100"
                        )}
                      >
                        Eu
                      </button>
                      {partnerProfile && (
                        <button 
                          type="button"
                          onClick={() => setCardOwner(partnerProfile.uid)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all",
                            cardOwner === partnerProfile.uid ? "bg-zinc-900 text-white border-zinc-900" : "bg-zinc-50 text-zinc-400 border-zinc-100"
                          )}
                        >
                          {partnerProfile.displayName?.split(' ')[0]}
                        </button>
                      )}
                   </div>
                </div>

                <Button type="submit" className="bg-orange-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest mt-4">
                  {editingCardId ? 'Salvar Alterações' : 'Cadastrar Cartão'}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Quick Add Transaction Modal */}
      <AnimatePresence>
        {showQuickAddTx && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setShowQuickAddTx(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] p-6 z-50 flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-rose-600">Lançamento Rápido</h2>
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none mt-1">
                    No cartão: {cards.find(c => c.id === selectedCardId)?.name}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowQuickAddTx(false)}>
                  <X />
                </Button>
              </div>

              <form onSubmit={handleQuickAddTx} className="flex flex-col gap-4">
                <Input placeholder="O que você comprou?" value={txDescription} onChange={e => setTxDescription(e.target.value)} required />
                <Input type="number" placeholder="Valor (R$)" value={txAmount} onChange={e => setTxAmount(e.target.value)} required />
                <select 
                  value={txCategory} 
                  onChange={e => setTxCategory(e.target.value)}
                  className="w-full h-12 bg-white border-2 border-zinc-100 rounded-xl px-4 text-sm font-bold focus:outline-none focus:border-orange-600 transition-all appearance-none"
                >
                  <option value="">Selecione a Categoria</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  {categories.length === 0 && (
                    <>
                      <option value="Alimentação">Alimentação</option>
                      <option value="Transporte">Transporte</option>
                      <option value="Lazer">Lazer</option>
                      <option value="Assinaturas">Assinaturas</option>
                      <option value="Compras">Compras</option>
                      <option value="Saúde">Saúde</option>
                    </>
                  )}
                </select>
                <Input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} required />
                
                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Quem é responsável?</span>
                   <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setTxResponsibility(userProfile?.uid || '')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border-2 truncate px-2",
                          txResponsibility === userProfile?.uid ? "bg-zinc-900 border-zinc-900 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-400"
                        )}
                        title={userProfile?.displayName || 'Eu'}
                      >
                        {userProfile?.displayName?.split(' ')[0] || 'Eu'}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setTxResponsibility('couple')}
                        className={cn(
                          "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border-2",
                          txResponsibility === 'couple' ? "bg-zinc-900 border-zinc-900 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-400"
                        )}
                      >
                        Conjunta
                      </button>
                      {partnerProfile && (
                        <button 
                          type="button"
                          onClick={() => setTxResponsibility(partnerProfile.uid)}
                          className={cn(
                            "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border-2 truncate px-2",
                            txResponsibility === partnerProfile.uid ? "bg-zinc-900 border-zinc-900 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-400"
                          )}
                          title={partnerProfile.displayName || 'Parceiro'}
                        >
                          {partnerProfile.displayName?.split(' ')[0] || 'Parceiro'}
                        </button>
                      )}
                   </div>
                </div>

                <Button type="submit" disabled={formLoading} className="bg-rose-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest mt-4">
                  {formLoading ? 'Salvando...' : 'Lançar no Cartão'}
                </Button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Intelligence Info */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex flex-col gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200/50">
          <RefreshCw className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase">Assinaturas</p>
            <p className="font-black text-lg">{activeSubscriptionsCount} {activeSubscriptionsCount === 1 ? 'Ativa' : 'Ativas'}</p>
          </div>
        </Card>
        <Card className="p-4 flex flex-col gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-zinc-200/50">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase">Parcelas</p>
            <p className="font-black text-lg">{totalRemainingInstallments} {totalRemainingInstallments === 1 ? 'Restante' : 'Restantes'}</p>
            <p className="text-[10px] font-bold text-zinc-400 mt-1">Total: {formatCurrency(totalRemainingValue)}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
