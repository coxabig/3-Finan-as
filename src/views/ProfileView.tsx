import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { User, CreditCard, Bell, Moon, LogOut, ChevronRight, X, Palette, HelpCircle, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';

const COLORS = [
  { name: 'Emerald', bg: 'bg-emerald-600' },
  { name: 'Orange', bg: 'bg-orange-600' },
  { name: 'Blue', bg: 'bg-blue-600' },
  { name: 'Violet', bg: 'bg-violet-600' },
  { name: 'Rose', bg: 'bg-rose-600' },
  { name: 'Zinc', bg: 'bg-zinc-600' },
];

export function ProfileView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { userProfile, partnerProfile, toggleDarkMode, updateSubscription, updateProfileColors } = useFinance();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const restartTutorial = (pageId: string) => {
    // Dispara evento global que o PageTutorial de cada página está ouvindo
    const event = new CustomEvent('restart-tutorial', { detail: { pageId } });
    window.dispatchEvent(event);
    
    // O usuário precisa estar na página para ver o tutorial, então redirecionamos
    onNavigate(pageId);
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <div className="flex items-center gap-6 p-4">
        <div className="w-24 h-24 rounded-[32px] bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-4xl font-black text-white dark:text-zinc-900 shadow-2xl ring-8 ring-zinc-50 dark:ring-zinc-900 transition-transform hover:scale-105 duration-500">
           {userProfile?.displayName?.charAt(0) || 'U'}
        </div>
        <div>
           <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">{userProfile?.displayName}</h2>
           <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">{userProfile?.email}</p>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-400 px-4">Minha Conta</h3>
          <div className="flex flex-col gap-3">
            <Card 
              onClick={() => onNavigate('account-settings')}
              className="p-6 flex items-center justify-between group hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
            >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-all">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-black text-base block text-zinc-900 dark:text-white">Informações Pessoais</span>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nome, E-mail e Senha segura</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
            </Card>

            <Card 
              className="p-6 flex flex-col gap-6 bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
            >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-600">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-black text-base block text-zinc-900 dark:text-white">Tutoriais de Uso</span>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Rever guia das telas principais</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'planning', label: 'Planejamento' },
                    { id: 'invoices', label: 'Faturas' },
                    { id: 'credit-cards', label: 'Meus Cartões' },
                  ].map(t => (
                    <button 
                      key={t.id}
                      onClick={() => restartTutorial(t.id)}
                      className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all group"
                    >
                      <span className="text-[10px] font-black uppercase text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white tracking-widest">{t.label}</span>
                      <RefreshCw size={12} className="text-zinc-300 group-hover:text-orange-500 transition-colors" />
                    </button>
                  ))}
                </div>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-400 px-4">Identidade Visual</h3>
          <Card className="p-6 flex flex-col gap-6 bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800">
             <div className="flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Palette size={16} className="text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Sua Cor</span>
                  </div>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={`user-${c.name}`}
                        onClick={() => updateProfileColors({ userColor: c.name })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          c.bg,
                          userProfile?.userColor === c.name ? "border-black dark:border-white scale-110" : "border-transparent opacity-50"
                        )}
                      />
                    ))}
                  </div>
               </div>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Palette size={16} className="text-zinc-400" />
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Cor do Parceiro</span>
                  </div>
                  <div className="flex gap-2">
                    {COLORS.map(c => (
                      <button
                        key={`partner-${c.name}`}
                        onClick={() => updateProfileColors({ partnerColor: c.name })}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 transition-transform hover:scale-110",
                          c.bg,
                          userProfile?.partnerColor === c.name ? "border-black dark:border-white scale-110" : "border-transparent opacity-50"
                        )}
                      />
                    ))}
                  </div>
               </div>
             </div>
             <p className="text-[10px] text-zinc-400 italic">As cores serão aplicadas nos cards da Dashboard e Planejamento para identificar quem é o responsável.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-400 px-4">Preferências</h3>
          <div className="flex flex-col gap-3">
              <Card 
                onClick={toggleDarkMode}
                className="p-6 flex items-center justify-between group hover:border-zinc-200 transition-all cursor-pointer bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
              >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-all">
                      <Moon className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-black text-base block text-zinc-900 dark:text-white">Modo Escuro</span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ajustar aparência visual</p>
                    </div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-all p-1",
                    userProfile?.darkMode ? "bg-zinc-900 dark:bg-orange-600" : "bg-zinc-200"
                  )}>
                    <div className={cn(
                      "w-4 h-4 rounded-full transition-all shadow-sm",
                      userProfile?.darkMode ? "translate-x-6 bg-white" : "translate-x-0 bg-white"
                    )} />
                  </div>
              </Card>

              <Card 
                onClick={() => setShowSubscriptionModal(true)}
                className="p-6 flex items-center justify-between group hover:border-orange-200 transition-all cursor-pointer bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
              >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-600 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40 transition-all">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-black text-base block">Assinatura Premium</span>
                      <p className={cn("text-[10px] font-black italic uppercase tracking-[0.2em]", userProfile?.isPremium ? "text-orange-600" : "text-zinc-400")}>
                        {userProfile?.isPremium ? 'Membro 3% Ativo' : 'Plano Gratuito'}
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-50 dark:bg-orange-950/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
              </Card>

              <Card className="p-6 flex items-center justify-between group bg-white dark:bg-zinc-900 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800 opacity-40 grayscale select-none">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-black text-base block">Notificações</span>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Em breve disponível</p>
                    </div>
                  </div>
              </Card>
          </div>
        </div>

        <div className="mt-8 px-4 flex flex-col gap-6">
          <Button 
            variant="outline" 
            className="w-full h-16 rounded-2xl border-none ring-1 ring-rose-100 dark:ring-rose-900/30 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-black tracking-[0.2em] uppercase transition-all shadow-sm"
            onClick={() => auth.signOut()}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sair da Conta
          </Button>
          
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-black text-zinc-300 dark:text-zinc-700 tracking-[0.5em] uppercase">
              3% FINANÇAS • v1.2.0
            </p>
            <div className="w-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
          </div>
        </div>

        {/* Subscription Modal */}
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm p-8 flex flex-col gap-6 relative overflow-hidden">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black">Planos 3%</h2>
                    <p className="text-zinc-500 text-sm">Escolha o seu plano atual</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowSubscriptionModal(false)}>
                    <X className="w-6 h-6" />
                  </Button>
               </div>

               <div className="flex flex-col gap-4">
                  {/* Free Plan */}
                  <div className={cn(
                    "p-4 rounded-2xl border-2 transition-all",
                    !userProfile?.isPremium ? "border-orange-600 bg-orange-50 dark:bg-orange-950/20" : "border-zinc-100 dark:border-zinc-800"
                  )}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-black text-sm uppercase">Plano Free</span>
                       {!userProfile?.isPremium && <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase">Atual</span>}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      Funcionalidades básicas, anúncios em todas as telas e limite de transações.
                    </p>
                  </div>

                  {/* Premium Plan */}
                  <div className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    userProfile?.isPremium ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                  )} onClick={() => updateSubscription(!userProfile?.isPremium)}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-black text-sm uppercase text-orange-600">Premium Full</span>
                       <span className="font-black text-lg text-emerald-600">R$ 14,90<span className="text-[10px] text-zinc-400 font-bold">/mês</span></span>
                    </div>
                    <ul className="text-[10px] text-zinc-500 flex flex-col gap-1">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Sem anúncios</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> PDF ilimitados (Beta)</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> Benefício compartilhado p/ Casal</li>
                    </ul>
                    <Button 
                      className={cn("w-full mt-4 h-10 rounded-xl", userProfile?.isPremium ? "bg-rose-500" : "bg-emerald-600")}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSubscription(!userProfile?.isPremium);
                      }}
                    >
                      {userProfile?.isPremium ? 'Cancelar Assinatura' : 'Assinar Agora'}
                    </Button>
                  </div>
               </div>

               <p className="text-[10px] text-center text-zinc-400 italic">
                 * Basta um membro assinar para desbloquear as funções para ambos. Para remover anúncios individuais, ambos devem assinar.
               </p>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
