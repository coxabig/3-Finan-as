import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { 
  Plus, 
  Trash2, 
  Pencil, 
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  X,
  Landmark,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PageTutorial } from '../components/PageTutorial';

export function BankAccountsView() {
  const { 
    userProfile, 
    partnerProfile, 
    accounts, 
    addAccount, 
    updateAccount, 
    removeAccount 
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);

  // Form State
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountOwner, setAccountOwner] = useState(userProfile?.uid || '');
  const [accountColor, setAccountColor] = useState('#18181b');

  const ACCOUNT_COLORS = [
    { name: 'Black', value: '#18181b' },
    { name: 'Purple', value: '#9333ea' },
    { name: 'Orange', value: '#ea580c' },
    { name: 'Blue', value: '#2563eb' },
    { name: 'Green', value: '#16a34a' },
    { name: 'Red', value: '#dc2626' },
    { name: 'Gold', value: '#ca8a04' },
  ];

  const resetForm = () => {
    setEditingAccountId(null);
    setAccountName('');
    setBankName('');
    setBalance('');
    setAccountColor('#18181b');
    setAccountOwner(userProfile?.uid || '');
    setShowAddModal(false);
  };

  const handleEdit = (account: any) => {
    setEditingAccountId(account.id);
    setAccountName(account.name);
    setBankName(account.bankName || '');
    setBalance(account.balance.toString());
    setAccountOwner(account.ownerId);
    setAccountColor(account.color || '#18181b');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: accountName,
      bankName,
      balance: parseFloat(balance),
      ownerId: accountOwner,
      color: accountColor
    };

    if (editingAccountId) {
      await updateAccount(editingAccountId, data);
    } else {
      await addAccount(data);
    }
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (deletingAccountId !== id) {
      setDeletingAccountId(id);
      setTimeout(() => setDeletingAccountId(prev => prev === id ? null : prev), 3000);
      return;
    }
    await removeAccount(id);
    setDeletingAccountId(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <PageTutorial 
        pageId="bank-accounts-manage"
        steps={[
          { element: '#accounts-grid', popover: { title: 'Minhas Contas', description: 'Aqui você cadastra e acompanha o saldo das suas contas correntes e poupança.' } },
          { element: '#add-account-btn', popover: { title: 'Nova Conta', description: 'Clique aqui para cadastrar uma nova conta bancária.' } },
        ]}
      />

      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">Minhas Contas</h2>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">Saldos e Bancos</p>
        </div>
        <div id="add-account-btn">
          <Button 
            onClick={() => setShowAddModal(true)} 
            variant="primary" 
            className="gap-2 shadow-xl shadow-orange-600/20"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      <div id="accounts-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {accounts.length === 0 && (
          <Card className="md:col-span-2 p-12 border-dashed border-2 flex flex-col items-center gap-4 text-center bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
            <Landmark className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <div className="max-w-xs">
               <p className="text-zinc-900 dark:text-white font-bold">Nenhuma conta cadastrada</p>
               <p className="text-xs text-zinc-500 mt-1">Cadastre suas contas bancárias para ter uma visão clara do seu patrimônio e fluxo de caixa.</p>
            </div>
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="mt-2">Cadastrar Agora</Button>
          </Card>
        )}

        {accounts.map(account => (
          <Card 
            key={account.id} 
            className="p-6 relative overflow-hidden group border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col gap-6"
          >
            <div 
              className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-16 -mt-16 transition-all duration-700 group-hover:scale-110"
              style={{ backgroundColor: account.color || '#18181b' }}
            />

            <div className="flex justify-between items-start relative z-10">
              <div className="flex gap-4 items-center">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: account.color || '#18181b' }}
                >
                  <Landmark size={24} />
                </div>
                <div>
                  <h4 className="font-black text-lg tracking-tight leading-none text-zinc-900 dark:text-white">{account.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-1">{account.bankName || 'Banco'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(account)} className="h-10 w-10 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                  <Pencil size={18} />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleDelete(account.id)} 
                  className={cn(
                    "h-10 w-10 transition-all",
                    deletingAccountId === account.id ? "bg-rose-600 text-white" : "text-rose-500/50 hover:text-rose-500"
                  )}
                >
                  {deletingAccountId === account.id ? <AlertCircle size={18} /> : <Trash2 size={18} />}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Titular</span>
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {account.ownerId === userProfile?.uid ? 'Você' : partnerProfile?.displayName?.split(' ')[0]}
                </p>
              </div>
              <div className="flex flex-col gap-1 text-right">
                <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Saldo Atual</span>
                <p className="text-lg font-black text-zinc-900 dark:text-zinc-100">{formatCurrency(account.balance)}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] font-bold text-zinc-400">
               <div className="flex items-center gap-1.5 leading-none">
                 <ShieldCheck size={14} className="text-emerald-500" />
                 <span>Dados Protegidos</span>
               </div>
               <ChevronRight size={14} className="text-zinc-200" />
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
                <h3 className="text-2xl font-black tracking-tighter uppercase">{editingAccountId ? 'Editar Conta' : 'Nova Conta'}</h3>
                <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-full">
                  <X />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Descrição (ex: Conta Principal)</label>
                  <Input 
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Ex: Itaú Laranjinha"
                    className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Instituição</label>
                    <Input 
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      placeholder="Ex: Itaú, Nubank..."
                      className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Saldo Inicial</label>
                    <Input 
                      type="number"
                      step="0.01"
                      value={balance}
                      onChange={e => setBalance(e.target.value)}
                      placeholder="0,00"
                      className="h-12 rounded-xl text-sm font-bold bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Cor da Conta</label>
                  <div className="flex flex-wrap gap-2">
                    {ACCOUNT_COLORS.map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setAccountColor(color.value)}
                          className={cn(
                            "w-10 h-10 rounded-xl transition-all border-4",
                            accountColor === color.value ? "border-zinc-300 dark:border-zinc-500 scale-110 shadow-lg" : "border-transparent"
                          )}
                          style={{ backgroundColor: color.value }}
                        />
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">Dono da Conta</label>
                  <div className="grid grid-cols-2 gap-3">
                     <Button 
                       type="button"
                       variant={accountOwner === userProfile?.uid ? 'primary' : 'outline'}
                       onClick={() => setAccountOwner(userProfile?.uid || '')}
                       className="h-12 rounded-xl text-[10px] uppercase font-black"
                     >
                       EU
                     </Button>
                     <Button 
                       type="button"
                       variant={accountOwner === partnerProfile?.uid ? 'primary' : 'outline'}
                       onClick={() => partnerProfile && setAccountOwner(partnerProfile.uid)}
                       disabled={!partnerProfile}
                       className="h-12 rounded-xl text-[10px] uppercase font-black"
                     >
                       {partnerProfile?.displayName?.split(' ')[0] || 'PARCEIRO'}
                     </Button>
                  </div>
                </div>

                <Button type="submit" className="h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-black uppercase text-xs tracking-widest mt-4">
                  {editingAccountId ? 'Salvar Alterações' : 'Cadastrar Conta'}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
