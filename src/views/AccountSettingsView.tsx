import React, { useState, useEffect, useRef } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { User, Mail, Lock, ChevronLeft, ShieldCheck } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { updateProfile, updateEmail, updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { PageTutorial } from '../components/PageTutorial';

interface AccountSettingsViewProps {
  onBack: () => void;
}

export function AccountSettingsView({ onBack }: AccountSettingsViewProps) {
  const { userProfile } = useFinance();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSuccess, setAccountSuccess] = useState<string | null>(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (userProfile && !initialized.current) {
      setName(userProfile.displayName || '');
      setEmail(userProfile.email || '');
      initialized.current = true;
    }
  }, [userProfile]);

  const handleUpdateAccount = async () => {
    if (!auth.currentUser) return;
    setIsUpdatingAccount(true);
    setAccountError(null);
    setAccountSuccess(null);

    try {
      // 1. Update Name
      if (name !== userProfile?.displayName) {
        await updateProfile(auth.currentUser, { displayName: name });
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { displayName: name });
      }

      // 2. Update Email
      if (email !== userProfile?.email) {
        await updateEmail(auth.currentUser, email);
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { email: email });
      }

      // 3. Update Password
      if (password) {
        await updatePassword(auth.currentUser, password);
        setPassword('');
      }

      setAccountSuccess('Informações da conta atualizadas com sucesso!');
    } catch (err: any) {
      console.error("Account update error:", err);
      if (err.code === 'auth/requires-recent-login') {
        setAccountError('Por segurança, esta ação requer um login recente. Por favor, saia e entre novamente.');
      } else {
        setAccountError(err.message || 'Erro ao atualizar conta.');
      }
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <PageTutorial 
        pageId="account-settings"
        steps={[
          { element: '#settings-card', popover: { title: 'Dados da Conta', description: 'Mantenha seus dados atualizados. Você pode mudar seu nome, e-mail e senha aqui.' } },
        ]}
      />
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <ChevronLeft className="w-6 h-6 text-zinc-900 dark:text-white" />
        </Button>
        <h2 className="text-2xl font-black tracking-tighter uppercase text-zinc-900 dark:text-white">Minha Conta</h2>
      </div>

      <Card id="settings-card" className="flex flex-col gap-6 p-8 border-none shadow-2xl bg-white dark:bg-zinc-900/50 ring-1 ring-zinc-100 dark:ring-zinc-800">
        <div className="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30">
          <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Segurança</p>
            <p className="text-xs font-bold text-orange-800 dark:text-orange-400">Suas informações são privadas e criptografadas.</p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <User className="w-3.5 h-3.5" /> Nome de Exibição
            </span>
            <Input 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="Seu nome"
              className="h-14 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> E-mail de Transações
            </span>
            <Input 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="Seu e-mail"
              className="h-14 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Alterar Senha
            </span>
            <Input 
              type="password"
              value={password} 
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-14 text-sm"
            />
            <p className="text-[9px] text-zinc-400 font-medium italic">Deixe em branco para não alterar</p>
          </div>
        </div>

        {accountError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 p-4 rounded-xl">
            <p className="text-xs font-bold text-rose-600">{accountError}</p>
          </div>
        )}
        
        {accountSuccess && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl">
            <p className="text-xs font-bold text-emerald-600">{accountSuccess}</p>
          </div>
        )}

        <Button 
          onClick={handleUpdateAccount} 
          disabled={isUpdatingAccount}
          size="lg"
          className="w-full mt-4 font-black tracking-widest"
        >
          {isUpdatingAccount ? 'PROCESSANDO...' : 'SALVAR ALTERAÇÕES'}
        </Button>
      </Card>

      <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
         <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
           <ShieldCheck size={20} />
         </div>
         <div>
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">Proteção de Dados</p>
           <p className="text-[10px] text-zinc-400 max-w-[200px] leading-relaxed">
             Suas credenciais são gerenciadas pelo Firebase Auth, garantindo o mais alto padrão de segurança.
           </p>
         </div>
      </div>
    </div>
  );
}
