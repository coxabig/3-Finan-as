import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Pencil, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { PageTutorial } from '../components/PageTutorial';
import { useTranslation } from 'react-i18next';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export function CreditCardsView() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const { 
    userProfile, 
    partnerProfile, 
    cards, 
    addCard, 
    updateCard, 
    removeCard 
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  // Form State
  const [cardName, setCardName] = useState('');
  const [lastDigits, setLastDigits] = useState('');
  const [cardLimit, setCardLimit] = useState('');
  const [cardOwner, setCardOwner] = useState(userProfile?.uid || '');
  const [cardColor, setCardColor] = useState('#18181b');

  const CARD_COLORS = [
    { name: 'Black', value: '#18181b' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Gold', value: '#ca8a04' },
  ];

  const resetForm = () => {
    setEditingCardId(null);
    setCardName('');
    setLastDigits('');
    setCardLimit('');
    setCardColor('#18181b');
    setCardOwner(userProfile?.uid || '');
    setShowAddModal(false);
  };

  const handleEdit = (card: any) => {
    setEditingCardId(card.id);
    setCardName(card.name);
    setLastDigits(card.lastDigits);
    setCardLimit(card.limit.toString());
    setCardOwner(card.ownerId);
    setCardColor(card.color || '#18181b');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (deletingCardId !== id) {
      setDeletingCardId(id);
      setTimeout(() => setDeletingCardId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeCard(id);
    setDeletingCardId(null);
  };


  return (
    <div className="flex flex-col gap-8 pb-32">
      <PageTutorial 
        pageId="credit-cards-manage"
        steps={[
          { element: '#cards-grid', popover: { title: t('invoice_mgmt_title', { defaultValue: 'Gestão de Cartões' }), description: t('invoice_mgmt_desc_alt', { defaultValue: 'Aqui você cadastra e edita seus cartões de crédito para que possamos monitorar o saldo e faturas.' }) } },
          { element: '#add-card-btn', popover: { title: t('new_card_title_tutorial', { defaultValue: 'Novo Cartão' }), description: t('new_card_desc_tutorial_alt', { defaultValue: 'Clique aqui para adicionar um novo cartão à conta do casal.' }) } },
        ]}
      />

      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">{t('my_cards_header', { defaultValue: 'Meus Cartões' })}</h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">{t('credit_config', { defaultValue: 'Configuração de Crédito' })}</p>
        </div>
        <div id="add-card-btn">
          <Button 
            onClick={() => setShowAddModal(true)} 
            variant="primary" 
            className="gap-2 shadow-xl shadow-orange-600/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{t('add_card_btn', { defaultValue: 'Adicionar' })}</span>
          </Button>
        </div>
      </div>

      <div id="cards-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.length === 0 && (
          <Card className="md:col-span-2 p-12 border-dashed border-2 flex flex-col items-center gap-4 text-center bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
            <CreditCard className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <div className="max-w-xs">
               <p className="text-zinc-900 dark:text-white font-bold">{t('no_cards_registered', { defaultValue: 'Nenhum cartão cadastrado' })}</p>
               <p className="text-xs text-zinc-500 mt-1">Cadastre seus cartões para automatizar a gestão de faturas e limite compartilhado.</p>
            </div>
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="mt-2">Cadastrar Agora</Button>
          </Card>
        )}

        {cards.map(card => (
          <Card 
            key={card.id} 
            className="p-6 relative overflow-hidden group border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col gap-6"
          >
            <div 
              className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-16 -mt-16 transition-all duration-700 group-hover:scale-110"
              style={{ backgroundColor: card.color || '#18181b' }}
            />

            <div className="flex justify-between items-start relative z-10">
              <div className="flex gap-4 items-center">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: card.color || '#18181b' }}
                >
                  <CreditCard size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg tracking-tight leading-none text-zinc-900 dark:text-white">{card.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">**** {card.lastDigits}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(card)} className="h-10 w-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <Pencil size={18} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(card.id)} 
                  className={cn(
                    "h-10 w-10 transition-all",
                    deletingCardId === card.id ? "bg-rose-600 text-white" : "text-rose-500/50 hover:text-rose-500"
                  )}
                >
                  {deletingCardId === card.id ? <AlertCircle size={18} /> : <Trash2 size={18} />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Titular</span>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {card.ownerId === userProfile?.uid ? 'Você' : partnerProfile?.displayName?.split(' ')[0]}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Limite Total</span>
                <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(card.limit)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
               <div className="flex items-center gap-1.5 leading-none">
                 <ShieldCheck size={14} />
                 <span>Monitoramento Ativo</span>
               </div>
               <ChevronRight size={14} className="text-zinc-300" />
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Add/Edit */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetForm}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[32px] p-8 shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-3xl -mr-16 -mt-16" />
              
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black tracking-tighter uppercase">{editingCardId ? 'Editar Cartão' : 'Novo Cartão'}</h3>
                <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-full">
                  <X />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Nome do Cartão (ex: Nubank)</label>
                  <Input 
                    value={cardName}
                    onChange={e => setCardName(e.target.value)}
                    placeholder="Nome amigável"
                    className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Últimos 4 Dígitos</label>
                    <Input 
                      value={lastDigits}
                      onChange={e => setLastDigits(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="0000"
                      className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Limite Total</label>
                    <Input 
                      type="number"
                      value={cardLimit}
                      onChange={e => setCardLimit(e.target.value)}
                      placeholder="5000"
                      className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Cor de Destaque</label>
                  <div className="flex flex-wrap gap-2">
                    {CARD_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setCardColor(color.value)}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all border-4",
                            cardColor === color.value ? "border-zinc-300 dark:border-zinc-500 scale-110 shadow-lg" : "border-transparent"
                          )}
                          style={{ backgroundColor: color.value }}
                        />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Dono do Cartão</label>
                  <div className="grid grid-cols-2 gap-3">
                     <Button 
                       type="button"
                       variant={cardOwner === userProfile?.uid ? 'primary' : 'outline'}
                       onClick={() => setCardOwner(userProfile?.uid || '')}
                       className="h-12 rounded-xl text-[10px] uppercase font-black"
                     >
                       EU
                     </Button>
                     <Button 
                       type="button"
                       variant={cardOwner === partnerProfile?.uid ? 'primary' : 'outline'}
                       onClick={() => partnerProfile && setCardOwner(partnerProfile.uid)}
                       disabled={!partnerProfile}
                       className="h-12 rounded-xl text-[10px] uppercase font-black"
                     >
                       {partnerProfile?.displayName?.split(' ')[0] || 'PARCEIRO'}
                     </Button>
                  </div>
                </div>

                <Button type="submit" className="h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase text-xs tracking-widest mt-4">
                  {editingCardId ? 'Salvar Alterações' : 'Cadastrar Cartão'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
