import React, { useState, useRef, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { MonthSelector } from '../components/MonthSelector';
import { PageTutorial } from '../components/PageTutorial';
import { TransactionType, FrequencyType } from '../types';
import { format, parseISO } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { GoogleGenAI, Type } from "@google/genai";
import { auth } from '../lib/firebase';
import { getCategoryIcon } from '../lib/category-icons';
import { SwipeableItem } from '../components/SwipeableItem';
import { useTranslation } from 'react-i18next';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

const dateLocales: Record<string, any> = {
  'pt-BR': ptBR,
  'pt': ptBR,
  'en': enUS,
  'es': es
};

export function InvoicesView() {
  const { t, i18n } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const currentLocale = dateLocales[i18n.language] || dateLocales[i18n.language.split('-')[0]] || ptBR;
  const { 
    ratios, 
    userProfile, 
    partnerProfile, 
    cards, 
    cardSummaries, 
    categories,
    transactions,
    addTransaction,
    removeTransaction,
    updateTransaction,
    removeTransactionsByCard,
    selectedMonth,
    isFamilyPremium
  } = useFinance();

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const [showImportPanel, setShowImportPanel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importedTx, setImportedTx] = useState<any[]>([]);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [importCardId, setImportCardId] = useState<string>('');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [tempTxDescription, setTempTxDescription] = useState('');
  const [editingImportedId, setEditingImportedId] = useState<string | null>(null);
  const [tempImportedDesc, setTempImportedDesc] = useState('');

  // Deletion logic for individual card transactions
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [clearingInvoiceId, setClearingInvoiceId] = useState<string | null>(null);

  const handleDeleteTx = async (id: string) => {
    if (deletingTxId !== id) {
      setDeletingTxId(id);
      setTimeout(() => setDeletingTxId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeTransaction(id);
    setDeletingTxId(null);
  };

  const handleClearInvoice = async (cardId: string) => {
    if (clearingInvoiceId !== cardId) {
      setClearingInvoiceId(cardId);
      setTimeout(() => setClearingInvoiceId(prev => prev === cardId ? null : prev), 3000);
      return;
    }
    
    try {
      await removeTransactionsByCard(cardId, selectedMonth);
      setClearingInvoiceId(null);
    } catch (err) {
      console.error(err);
    }
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
      alert(t('error_save_transaction', { defaultValue: 'Erro ao salvar transação.' }));
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
      alert(t('select_card_import_alert', { defaultValue: 'Selecione um cartão para importar.' }));
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
      alert(t('error_analyze_pdf', { defaultValue: 'Erro ao analisar o PDF. Verifique se o arquivo é uma fatura válida ou tente novamente.' }));
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

  const longPressTimer = useRef<any>(null);

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
      alert(t('success_import_msg', { 
        defaultValue: `Sucesso! Transações adicionadas ao mês de {{month}}.`,
        month: format(parseISO(selectedMonth + '-01'), 'MMMM', { locale: currentLocale })
      }));
    } catch (err) {
      alert(t('error_save_some_transactions', { defaultValue: 'Erro ao salvar algumas transações.' }));
    } finally {
      setFormLoading(false);
    }
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
      <PageTutorial 
        pageId="invoices"
        steps={[
          { element: '#cards-list', popover: { title: t('invoice_mgmt_title', { defaultValue: 'Gestão de Faturas' }), description: t('invoice_mgmt_desc', { defaultValue: 'Veja o saldo atual de cada cartão e o quanto eles comprometem do seu limite.' }) } },
          { element: '#import-section', popover: { title: t('ai_import_title', { defaultValue: 'Importação por IA' }), description: t('ai_import_desc', { defaultValue: 'Nossa IA lê sua fatura em PDF e lança todas as despesas para você.' }) } },
          { element: '#card-stats', popover: { title: t('exposure_summary_title', { defaultValue: 'Resumo da Exposição' }), description: t('exposure_summary_desc', { defaultValue: 'Acompanhe assinaturas e parcelas futuras em um só lugar.' }) } },
        ]}
      />
      <MonthSelector />
      
      {/* Cards Slider/List */}
      <div id="cards-list" className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500">{t('my_invoices', { defaultValue: 'Minhas Faturas' })}</h3>
        </div>

        {cards.length === 0 && (
          <Card className="p-8 border-dashed border-2 border-zinc-200 dark:border-zinc-800 flex flex-col items-center gap-4 text-center bg-transparent">
            <CreditCard className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">{t('add_cards_hint', { defaultValue: 'Cadastre Cartões no Menu Lateral para gerenciar faturas.' })}</p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {cardSummaries.map(card => (
              <div key={card.id}>
                <div className="relative flex items-center group/card">
                  <Card 
                    onClick={() => setExpandedCardId(expandedCardId === card.id ? null : card.id)}
                    className="flex-1 text-white p-4 sm:p-8 relative overflow-hidden group border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:shadow-[0_25px_60px_rgba(0,0,0,0.4)] transition-all duration-500 cursor-pointer active:scale-[0.99] rounded-[24px] sm:rounded-[32px]" 
                    style={{ backgroundColor: card.color || '#18181b' }}
                  >
                      {/* Improved Glossy Effects */}
                      <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
                      <div className="absolute bottom-[-10%] left-[-5%] w-40 h-40 bg-black/20 rounded-full blur-2xl" />
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />

                      <div className="relative z-10 flex flex-col gap-6 sm:gap-8">
                        <div className="flex justify-between items-start min-w-0 gap-2">
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <h4 className="font-black text-sm sm:text-xl leading-none tracking-tight truncate">{card.name}</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-widest">
                                {card.ownerId === userProfile?.uid ? t('your_account', { defaultValue: 'Sua Conta' }) : t('partner_account_fmt', { defaultValue: `Conta ${partnerProfile?.displayName?.split(' ')[0]}`, name: partnerProfile?.displayName?.split(' ')[0] })}
                              </span>
                              <div className="w-1 h-1 bg-white/20 rounded-full" />
                              <span className="text-white/40 text-[8px] sm:text-[9px] font-black tracking-widest uppercase">**** {card.lastDigits}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedCardId(card.id); setShowQuickAddTx(true); }}
                              className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all shadow-inner border border-white/5"
                            >
                              <Plus size={isDesktop ? 20 : 16} strokeWidth={3} />
                            </button>
                            <ChevronDown className={cn("text-white/30 transition-transform duration-300", expandedCardId === card.id ? "rotate-180" : "")} size={18} />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:gap-6">
                          <div className="flex flex-col gap-1.5 min-w-0">
                              <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">{t('invoice_this_month', { defaultValue: 'Fatura no Mês' })}</span>
                              <span className="text-sm sm:text-3xl font-black text-white tracking-tighter leading-none shrink-0">{formatCurrency(card.invoiceTotal || 0)}</span>
                              
                              <div className="flex flex-col gap-1 mt-2">
                                <div className="flex justify-between items-center text-[7px] sm:text-[8px] font-black uppercase tracking-widest">
                                  <span className="text-white/30">Uso Total: {formatCurrency(card.utilizedTotal)}</span>
                                  <span className="text-white/30">{( (card.utilizedTotal / card.limit) * 100 ).toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden shadow-inner">
                                  <div 
                                    className="bg-white h-full transition-all duration-1000" 
                                    style={{ width: `${Math.min((card.utilizedTotal / card.limit) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                           </div>
                              <div className="flex flex-col gap-1.5 text-right items-end min-w-0">
                                 <span className="text-white/40 text-[8px] sm:text-[9px] font-black uppercase tracking-widest leading-none">{t('available', { defaultValue: 'Disponível Real' })}</span>
                                 <span className="text-xs sm:text-2xl font-black text-white/90 tracking-tighter leading-none shrink-0">{formatCurrency(card.limit - card.utilizedTotal)}</span>
                                 <span className="text-[8px] sm:text-[9px] font-black text-white/30 uppercase tracking-tighter mt-1">{t('limit_label', { defaultValue: 'Limite' })} {formatCurrency(card.limit)}</span>
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
                              <div className="pt-6 border-t border-white/10 grid grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                   <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Divisão da Fatura</p>
                                   <div className="flex flex-col gap-1.5">
                                      <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-white/60">Minha Parte:</span>
                                        <span className="text-white">{formatCurrency(card.invoiceTotal * ratios.user)}</span>
                                      </div>
                                      <div className="flex justify-between text-[11px] font-bold">
                                        <span className="text-white/60">Parte do Parceiro:</span>
                                        <span className="text-white">{formatCurrency(card.invoiceTotal * ratios.partner)}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col gap-2 text-right">
                                   <span className="text-white/30 text-[9px] font-black uppercase tracking-widest">Uso Total do Limite</span>
                                   <p className="text-lg font-black italic tracking-tighter">
                                     {((card.utilizedTotal / card.limit) * 100).toFixed(1)}%
                                   </p>
                                   <span className="text-[9px] font-bold text-white/40 uppercase">Comprometido Total</span>
                                </div>
                              </div>

                              {/* Detalhamento da Fatura */}
                              <div className="pt-6 border-t border-white/5 flex flex-col gap-4">
                                 <div className="flex items-center justify-between">
                                    <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">Lançamentos do Mês</p>
                                    <div className="flex items-center gap-3">
                                      {cardTransactions.filter(tx => tx.cardId === card.id).length > 0 && (
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleClearInvoice(card.id); }}
                                          className={cn(
                                            "flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                            clearingInvoiceId === card.id 
                                              ? "bg-rose-600 text-white animate-pulse" 
                                              : "bg-white/10 text-white/40 hover:bg-white/20"
                                          )}
                                        >
                                          <Trash2 size={10} />
                                          {clearingInvoiceId === card.id ? t('reset_confirm_word') : t('clear_invoice')}
                                        </button>
                                      )}
                                      <span className="text-[10px] items-center gap-1 flex font-bold text-white/40">
                                         {cardTransactions.filter(tx => tx.cardId === card.id).length} itens
                                      </span>
                                    </div>
                                 </div>
                                 <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto pr-1">
                                    {cardTransactions.filter(tx => tx.cardId === card.id).length === 0 ? (
                                      <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                                         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest italic">Nenhum lançamento registrado</p>
                                      </div>
                                    ) : (
                                      cardTransactions.filter(tx => tx.cardId === card.id).map(tx => (
                                        <div key={tx.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group/tx">
                                           <div className="flex items-center gap-3 min-w-0">
                                             <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                                               {(() => {
                                                 const cat = categories.find(c => c.name === tx.category);
                                                 const Icon = getCategoryIcon(tx.category || tx.description, cat?.iconName);
                                                 return <Icon size={14} className="text-white/60" />;
                                               })()}
                                             </div>
                                             <div className="min-w-0">
                                                <p className="text-xs font-bold text-white leading-tight truncate">{tx.description}</p>
                                                <div className="flex items-center gap-2">
                                                   <p className="text-[9px] text-white/30 uppercase font-black">{format(parseISO(tx.date), 'dd MMM', { locale: currentLocale })}</p>
                                                   {tx.installments && (
                                                     <span className="text-[8px] bg-white/10 text-white/50 px-1 rounded font-black italic">
                                                       {tx.installmentIndex}/{tx.installments}
                                                     </span>
                                                   )}
                                                </div>
                                             </div>
                                           </div>
                                           <div className="flex items-center gap-4 shrink-0">
                                             <p className="text-xs font-black text-white">{formatCurrency(tx.amount)}</p>
                                             <button 
                                               onClick={(e) => { e.stopPropagation(); handleDeleteTx(tx.id); }}
                                               className={cn(
                                                 "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                                 deletingTxId === tx.id ? "bg-rose-600 text-white" : "text-white/20 hover:text-rose-400 group-hover/tx:text-white/40"
                                               )}
                                             >
                                               {deletingTxId === tx.id ? <AlertCircle size={14} /> : <Trash2 size={14} />}
                                             </button>
                                           </div>
                                        </div>
                                      ))
                                    )}
                                 </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </Card>
                  </div>
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Import Section */}
      <div id="import-section" className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="font-black text-xs uppercase tracking-widest text-zinc-500">{t('import_via_ia_title', { defaultValue: 'Importar via IA' })}</h3>
          {importedTx.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => { setImportedTx([]); setImportCardId(''); }} className="text-zinc-400">
              {t('cancel', { defaultValue: 'Cancelar' })}
            </Button>
          )}
        </div>

        {importedTx.length === 0 ? (
          <div className="flex flex-col gap-2 px-2">
            <Button 
               variant="outline" 
               className="w-full flex items-center justify-between h-14 px-4 border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 rounded-2xl group hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all border-dashed border-2"
               onClick={() => setShowImportPanel(!showImportPanel)}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center text-orange-600">
                  <FileUp size={18} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Importar Fatura PDF</p>
                </div>
              </div>
              <Plus size={18} className={cn("text-zinc-400 transition-transform", showImportPanel ? "rotate-45" : "")} />
            </Button>

            <AnimatePresence>
              {showImportPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="p-5 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-5 relative overflow-hidden mt-1 rounded-2xl sm:rounded-3xl">
                    {!isFamilyPremium && (
                      <div className="absolute inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4">
                        <Lock className="w-5 h-5 text-orange-600 mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900 dark:text-white text-center">IA Pronta para Analisar!</p>
                        <p className="text-[9px] text-zinc-500 text-center max-w-[200px] mt-1 mb-3">Upgrade para o Plano Premium para importar PDFs ilimitados.</p>
                        <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest px-6 shadow-sm bg-white dark:bg-zinc-900">Saiba Mais</Button>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-4 transition-all" style={{ opacity: isFamilyPremium ? 1 : 0.3 }}>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">1. Vincular Despesas ao Cartão:</label>
                        <div className="relative">
                          <select 
                            value={importCardId} 
                            onChange={e => setImportCardId(e.target.value)}
                            className="w-full h-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl px-4 text-sm font-bold appearance-none dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                          >
                            <option value="">Selecione um cartão...</option>
                            {cards.map(c => <option key={c.id} value={c.id}>{c.name} (**** {c.lastDigits})</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">2. Enviar Arquivo:</label>
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
                          className={cn(
                            "w-full h-12 rounded-xl text-sm font-black uppercase tracking-widest transition-all",
                            isImporting 
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" 
                              : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:scale-[1.02] active:scale-[0.98]"
                          )}
                        >
                          {isImporting ? (
                            <div className="flex items-center gap-2">
                              <RefreshCw size={16} className="animate-spin" />
                              <span>{importProgress}%</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <FileUp size={18} />
                              <span>Selecionar PDF</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl p-4 flex items-center gap-3">
               <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                 <Search size={16} />
               </div>
               <p className="text-sm font-bold text-orange-800 dark:text-orange-400">{t('found_transactions', { defaultValue: 'Encontramos {{count}} transações. Revise antes de salvar.', count: importedTx.length })}</p>
             </div>

             <div className="flex flex-col gap-3">
               {importedTx.map(tx => (
                 <Card key={tx.id} className="p-3 sm:p-4 flex flex-col gap-3 sm:gap-4 group hover:border-orange-200 dark:hover:border-orange-900 transition-all rounded-2xl sm:rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center font-black text-zinc-400 shrink-0" style={(() => {
                           const cat = categories.find(c => c.name === tx.cat);
                           return cat ? { backgroundColor: cat.color + (userProfile?.darkMode ? '30' : '20'), color: cat.color } : {};
                        })()}>
                           {(() => {
                             const cat = categories.find(c => c.name === tx.cat);
                             const Icon = getCategoryIcon(tx.cat || tx.desc, cat?.iconName);
                             return <Icon size={isDesktop ? 22 : 18} />;
                           })()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                             {editingImportedId === tx.id ? (
                               <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                 <Input
                                   value={tempImportedDesc}
                                   onChange={(e) => setTempImportedDesc(e.target.value)}
                                   className="h-7 text-[10px] font-bold py-0 w-[120px]"
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
                               <div className="flex items-center gap-1.5 group/desc cursor-pointer" onClick={() => {
                                 setEditingImportedId(tx.id);
                                 setTempImportedDesc(tx.desc);
                               }}>
                                 <p className="font-black text-[13px] sm:text-[15px] leading-tight text-zinc-900 dark:text-white truncate">{tx.desc}</p>
                                 <Pencil size={10} className="text-zinc-300 opacity-0 group-hover/desc:opacity-100 transition-opacity hidden sm:block" />
                               </div>
                             )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm sm:text-lg font-black text-zinc-900 dark:text-white leading-none whitespace-nowrap shrink-0">{formatCurrency(tx.val)}</p>
                            {tx.day && <span className="bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 text-[8px] font-black px-1 py-0.5 rounded leading-none">Dia {tx.day}</span>}
                            {tx.installments && (
                              <span className="bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 text-[8px] font-black px-1 py-0.5 rounded leading-none">
                                {tx.current}/{tx.installments}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-1.5 min-w-[100px] sm:min-w-[120px]">
                        <select 
                          value={tx.cat} 
                          onChange={e => updateImportedItem(tx.id, { cat: e.target.value })}
                          className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2 py-1 text-[9px] font-black uppercase text-zinc-500 dark:text-zinc-400 focus:outline-none focus:border-orange-600 appearance-none"
                        >
                          <option value="Geral">Categorizar</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                        </select>

                        <div className="flex gap-1">
                          <button 
                            onClick={() => updateImportedItem(tx.id, { resp: userProfile?.uid })}
                            title={userProfile?.displayName || 'Eu'}
                            className={cn(
                              "flex-1 px-1.5 py-1 rounded text-[8px] font-black uppercase transition-all truncate",
                              tx.resp === userProfile?.uid ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            {userProfile?.displayName?.split(' ')[0] || 'Eu'}
                          </button>
                          <button 
                            onClick={() => updateImportedItem(tx.id, { resp: 'couple' })}
                            className={cn(
                              "flex-1 px-1.5 py-1 rounded text-[8px] font-black uppercase transition-all",
                              tx.resp === 'couple' ? "bg-orange-600 text-white" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                            )}
                          >
                            Conjunta
                          </button>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeImportedItem(tx.id)}
                        className="p-1.5 text-zinc-300 dark:text-zinc-700 hover:text-rose-500 transition-colors shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                 </Card>
               ))}
             </div>

             <Button 
               onClick={handleSaveImported}
               disabled={formLoading}
               className="bg-emerald-600 text-white h-14 sm:h-16 rounded-2xl sm:rounded-[24px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20"
             >
                {formLoading ? 'Salvando no Sistema...' : `Finalizar Importação (${formatCurrency(currentImportTotal)})`}
             </Button>

             <p className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-8">
               As despesas serão lançadas para {format(parseISO(selectedMonth + '-01'), 'MMMM', { locale: currentLocale })}
             </p>
          </div>
        )}
      </div>

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
                  <option value="Geral">Geral</option>
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
      <div id="card-stats" className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
        <Card className="p-6 sm:p-10 flex flex-col gap-8 shadow-[0_20px_50px_rgb(0,0,0,0.05)] border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/50 rounded-[32px] sm:rounded-[40px] group hover:shadow-2xl hover:-translate-y-1 transition-all">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <RefreshCw className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3 leading-none">Assinaturas Ativas</p>
            <p className="font-black text-[24px] sm:text-5xl tracking-tighter text-zinc-900 dark:text-zinc-100">{activeSubscriptionsCount} <span className="text-lg sm:text-2xl font-black text-zinc-300 tracking-normal ml-1">ITENS</span></p>
            <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mt-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              Sincronização Ativa via IA
            </p>
          </div>
        </Card>
        <Card className="p-6 sm:p-10 flex flex-col gap-8 shadow-[0_20px_50px_rgb(0,0,0,0.05)] border-zinc-100 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/50 rounded-[32px] sm:rounded-[40px] group hover:shadow-2xl hover:-translate-y-1 transition-all">
          <div className="w-16 h-16 bg-rose-50 dark:bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner group-hover:bg-rose-600 group-hover:text-white transition-colors">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.3em] mb-3 leading-none">Exposição Financeira</p>
            <div className="flex items-baseline gap-2 sm:gap-3">
              <p className="font-black text-[24px] sm:text-5xl tracking-tighter text-zinc-900 dark:text-zinc-100">{totalRemainingInstallments}</p>
              <span className="text-lg sm:text-2xl font-black text-zinc-300 uppercase leading-none tracking-tighter">Parcelas</span>
            </div>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800/60 flex justify-between items-end">
               <div>
                 <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Saldo Devedor</span>
                 <span className="text-lg sm:text-2xl font-black text-rose-600 dark:text-rose-500 tracking-tighter">{formatCurrency(totalRemainingValue)}</span>
               </div>
               <div className="text-[10px] font-black text-rose-500/40 uppercase italic mb-1">Total acumulado</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}