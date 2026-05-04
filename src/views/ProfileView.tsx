import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { User, CreditCard, Moon, LogOut, ChevronRight, X, Palette, ShieldCheck, Trash2, AlertTriangle, Eye, EyeOff, Lock, Languages, Check } from 'lucide-react';
import { auth } from '../lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { cn } from '../lib/utils';
import { PageTutorial } from '../components/PageTutorial';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../lib/constants';
import { format, parseISO } from 'date-fns';

export function ProfileView({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { t } = useTranslation();
  const { userProfile, partnerProfile, toggleDarkMode, updateSubscription, updateProfileColors, resetAccount, deleteAccount, updateLanguage } = useFinance();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const LANGUAGES = [
    { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', name: '简体中文', flag: '🇨🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'th', name: 'ภาษาไทย', flag: '🇹🇭' },
    { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  ];

  const handleLanguageSelect = (langCode: string) => {
    updateLanguage(langCode);
    setShowLanguageModal(false);
  };

  const handleResetAccount = async () => {
    if (!auth.currentUser || !userProfile) return;
    setResetLoading(true);
    setResetError('');

    try {
      // Se o usuário tem provedor de senha, reautentica
      const isPasswordUser = auth.currentUser.providerData.some(p => p.providerId === 'password');
      
      if (isPasswordUser) {
        if (!resetPassword) {
          setResetError(t('confirm_password_reset'));
          setResetLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, resetPassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        // Para usuários sociais, pedimos confirmação por texto
        const confirmWord = t('reset_confirm_word') || 'ZERAR';
        if (resetPassword.toUpperCase() !== confirmWord.toUpperCase()) {
           setResetError(t('confirm_with_text'));
           setResetLoading(false);
           return;
        }
      }

      await resetAccount();
      setShowResetModal(false);
      window.location.reload(); // Recarregar para garantir estado limpo e redirecionamento p/ onboarding
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setResetError(t('wrong_password'));
      } else if (err.code === 'auth/too-many-requests') {
        setResetError(t('too_many_requests') || 'Muitas tentativas. Tente mais tarde.');
      } else {
        setResetError(t('error_reset'));
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !userProfile) return;
    setDeleteLoading(true);
    setDeleteError('');

    try {
      // Reautenticação é OBRIGATÓRIA para deletar conta na Firebase
      const isPasswordUser = auth.currentUser.providerData.some(p => p.providerId === 'password');
      
      if (isPasswordUser) {
        if (!deletePassword) {
          setDeleteError(t('confirm_password_reset'));
          setDeleteLoading(false);
          return;
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email!, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
      } else {
        // Para usuários sociais (Google), pedimos confirmação por texto "EXCLUIR"
        const confirmWord = t('trash_confirm_word', { defaultValue: 'EXCLUIR' });
        if (deletePassword.toUpperCase() !== confirmWord.toUpperCase()) {
           setDeleteError(t('confirm_with_text') || 'Digite EXCLUIR para confirmar');
           setDeleteLoading(false);
           return;
        }
      }

      await deleteAccount();
      setShowDeleteAccountModal(false);
      window.location.reload(); 
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError(t('wrong_password'));
      } else if (err.code === 'auth/too-many-requests') {
        setDeleteError(t('too_many_requests'));
      } else {
        setDeleteError(t('error_reset'));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const restartTutorial = (pageId: string) => {
    // Dispara evento global que o PageTutorial de cada página está ouvindo
    const event = new CustomEvent('restart-tutorial', { detail: { pageId } });
    window.dispatchEvent(event);
    
    // O usuário precisa estar na página para ver o tutorial, então redirecionamos
    onNavigate(pageId);
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <PageTutorial 
        pageId="profile"
        steps={[
          { element: '#profile-header', popover: { title: t('profile'), description: 'Veja suas informações básicas e mude sua foto (em breve).' } },
          { element: '#account-section', popover: { title: t('account_details'), description: 'Gerencie seu e-mail, senha e reveja tutoriais das páginas.' } },
          { element: '#visual-identity', popover: { title: t('visual_identity'), description: 'Personalize as cores que representam você e seu parceiro nos gráficos.' } },
          { element: '#preferences-section', popover: { title: t('preferences'), description: 'Ative o modo escuro ou gerencie sua assinatura Premium.' } },
        ]}
      />
      <div id="profile-header" className="flex items-center gap-6 p-4">
        <div 
          className={cn(
            "w-24 h-24 rounded-[32px] flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-8 ring-zinc-50 dark:ring-zinc-900 transition-transform hover:scale-105 duration-500",
            COLORS.find(c => c.name === userProfile?.userColor)?.bg || "bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900"
          )}
        >
           {userProfile?.displayName?.charAt(0) || 'U'}
        </div>
        <div>
           <h2 className="text-3xl font-black tracking-tighter text-zinc-900 dark:text-white">{userProfile?.displayName}</h2>
           <div className="flex flex-col gap-0.5">
             <p className="text-zinc-500 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-[0.2em]">{userProfile?.email}</p>
             {userProfile?.birthDate && (
               <p className="text-zinc-400 dark:text-zinc-500 font-medium text-[9px] uppercase tracking-widest">
                 {format(parseISO(userProfile.birthDate), 'dd/MM/yyyy')}
               </p>
             )}
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        <div id="account-section" className="flex flex-col gap-4">
          <h3 className="font-black text-[10px] uppercase tracking-[0.3em] text-zinc-400 px-4">{t('account_details')}</h3>
          <div className="flex flex-col gap-3">
            <Card 
              onClick={() => onNavigate('account-settings')}
              className="p-6 flex items-center justify-between group hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
            >
                <div className="flex items-center gap-5">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorModal(true);
                    }}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg",
                      COLORS.find(c => c.name === userProfile?.userColor)?.bg || "bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400"
                    )}
                  >
                    <User className={cn("w-6 h-6", userProfile?.userColor ? "text-white" : "text-zinc-500 dark:text-zinc-400")} />
                  </button>
                  <div>
                    <span className="font-black text-base block text-zinc-900 dark:text-white">{t('personal_info')}</span>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('personal_info')}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
            </Card>

            <Card 
              onClick={() => setShowLanguageModal(true)}
              className="p-6 flex items-center justify-between group hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer bg-white dark:bg-zinc-900/50 border-none shadow-sm ring-1 ring-zinc-100 dark:ring-zinc-800"
            >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-all">
                    <Languages className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="font-black text-base block text-zinc-900 dark:text-white">{t('languages')}</span>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('language_name')}</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 group-hover:bg-zinc-900 dark:group-hover:bg-white group-hover:text-white dark:group-hover:text-zinc-900 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
            </Card>
          </div>
        </div>

        <div id="preferences-section" className="flex flex-col gap-4">
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
                      <span className="font-black text-base block text-zinc-900 dark:text-white">{t('dark_mode')}</span>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{t('appearance')}</p>
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
                      <span className="font-black text-base block">{t('premium')}</span>
                      <p className={cn("text-[10px] font-black italic uppercase tracking-[0.2em]", userProfile?.isPremium ? "text-orange-600" : "text-zinc-400")}>
                        {userProfile?.isPremium ? t('premium_active') : t('free_plan')}
                      </p>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-orange-50 dark:bg-orange-950/20 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <ChevronRight className="w-5 h-5" />
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
            {t('logout')}
          </Button>

          <Button 
            variant="ghost" 
            className="w-full h-12 rounded-xl text-rose-600/50 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-bold text-[10px] tracking-widest uppercase transition-all"
            onClick={() => setShowResetModal(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {t('reset_account')}
          </Button>

          <Button 
            variant="ghost" 
            className="w-full h-10 rounded-xl text-rose-600 font-black text-[10px] tracking-widest uppercase hover:bg-rose-50 dark:hover:bg-rose-950/10 transition-all opacity-80 hover:opacity-100"
            onClick={() => setShowDeleteAccountModal(true)}
          >
            {t('delete_account_btn')}
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
                    <h2 className="text-2xl font-black">{t('plans_title', { defaultValue: 'Planos 3%' })}</h2>
                    <p className="text-zinc-500 text-sm">{t('choose_current_plan', { defaultValue: 'Escolha o seu plano atual' })}</p>
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
                       <span className="font-black text-sm uppercase">{t('free_plan_label', { defaultValue: 'Plano Free' })}</span>
                       {!userProfile?.isPremium && <span className="bg-orange-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black uppercase">{t('current', { defaultValue: 'Atual' })}</span>}
                    </div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">
                      {t('free_plan_desc', { defaultValue: 'Funcionalidades básicas, anúncios em todas as telas e limite de transações.' })}
                    </p>
                  </div>

                  {/* Premium Plan */}
                  <div className={cn(
                    "p-4 rounded-2xl border-2 transition-all cursor-pointer",
                    userProfile?.isPremium ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/20" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                  )} onClick={() => updateSubscription(!userProfile?.isPremium)}>
                    <div className="flex justify-between items-center mb-2">
                       <span className="font-black text-sm uppercase text-orange-600">{t('premium_full', { defaultValue: 'Premium Full' })}</span>
                       <span className="font-black text-lg text-emerald-600">{t('premium_price', { defaultValue: 'R$ 14,90' })}<span className="text-[10px] text-zinc-400 font-bold">/{t('month', { defaultValue: 'mês' })}</span></span>
                    </div>
                    <ul className="text-[10px] text-zinc-500 flex flex-col gap-1">
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> {t('no_ads', { defaultValue: 'Sem anúncios' })}</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> {t('unlimited_pdf', { defaultValue: 'PDF ilimitados (Beta)' })}</li>
                      <li className="flex items-center gap-2"><div className="w-1 h-1 bg-emerald-500 rounded-full" /> {t('shared_benefit', { defaultValue: 'Benefício compartilhado p/ Casal' })}</li>
                    </ul>
                    <Button 
                      className={cn("w-full mt-4 h-10 rounded-xl", userProfile?.isPremium ? "bg-rose-500" : "bg-emerald-600")}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateSubscription(!userProfile?.isPremium);
                      }}
                    >
                      {userProfile?.isPremium ? t('cancel_subscription', { defaultValue: 'Cancelar Assinatura' }) : t('subscribe_now', { defaultValue: 'Assinar Agora' })}
                    </Button>
                  </div>
               </div>

               <p className="text-[10px] text-center text-zinc-400 italic">
                 {t('subscription_hint', { defaultValue: '* Basta um membro assinar para desbloquear as funções para ambos. Para remover anúncios individuais, ambos devem assinar.' })}
               </p>
            </Card>
          </div>
        )}

        {/* Color Selection Modal */}
        {showColorModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm p-8 flex flex-col gap-6 relative overflow-hidden">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black">{t('your_color')}</h2>
                    <p className="text-zinc-500 text-sm">{t('choose_color_desc', { defaultValue: 'Escolha a cor que melhor te representa.' })}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowColorModal(false)}>
                    <X className="w-6 h-6" />
                  </Button>
               </div>

               <div className="grid grid-cols-3 gap-4">
                  {COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => {
                        updateProfileColors({ userColor: c.name });
                        setShowColorModal(false);
                      }}
                      className={cn(
                        "group flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2",
                        userProfile?.userColor === c.name 
                          ? "border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-800" 
                          : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl shadow-lg transition-transform group-hover:scale-110", c.bg)} />
                      <span className="text-[10px] font-black uppercase text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white tracking-widest">{c.name}</span>
                    </button>
                  ))}
               </div>
            </Card>
          </div>
        )}

        {/* Language Selection Modal */}
        {showLanguageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-sm p-8 flex flex-col gap-6 relative overflow-hidden max-h-[80vh]">
               <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-black">{t('languages')}</h2>
                    <p className="text-zinc-500 text-sm">{t('select_language')}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setShowLanguageModal(false)}>
                    <X className="w-6 h-6" />
                  </Button>
               </div>

               <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl transition-all border-2",
                        userProfile?.language === lang.code 
                          ? "border-orange-600 bg-orange-50 dark:bg-orange-950/20" 
                          : "border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl" role="img" aria-label={lang.name}>{lang.flag}</span>
                        <span className={cn(
                          "font-black text-sm uppercase tracking-wider",
                          userProfile?.language === lang.code ? "text-orange-600" : "text-zinc-700 dark:text-zinc-300"
                        )}>
                          {lang.name}
                        </span>
                      </div>
                      {userProfile?.language === lang.code && (
                        <Check className="w-5 h-5 text-orange-600" />
                      )}
                    </button>
                  ))}
               </div>
            </Card>
          </div>
        )}

        {/* Reset Account Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 duration-200">
            <Card className="w-full max-w-md p-8 flex flex-col gap-6 border-none shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
               <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-3xl flex items-center justify-center animate-pulse">
                    <AlertTriangle size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-tighter">{t('reset_title_short')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2">
                      {t('reset_account_desc')}
                    </p>
                  </div>
               </div>

               <div className="bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                  <p className="text-[10px] text-rose-600 font-bold uppercase tracking-widest text-center">
                    {t('unlink_warning')}
                  </p>
               </div>

               <div className="flex flex-col gap-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder={auth.currentUser?.providerData.some(p => p.providerId === 'password') ? t('current_password') : t('reset_confirm_placeholder')}
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !(resetLoading || (auth.currentUser?.providerData.some(p => p.providerId === 'password') ? !resetPassword : resetPassword.toUpperCase() !== (t('reset_confirm_word') || 'ZERAR')))) {
                            handleResetAccount();
                          }
                        }}
                        className="pl-12 pr-12 h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                      />
                      {auth.currentUser?.providerData.some(p => p.providerId === 'password') && (
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>

                    {resetError && (
                      <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 py-2 rounded-lg">
                        {resetError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowResetModal(false);
                        setResetPassword('');
                        setResetError('');
                      }}
                      disabled={resetLoading}
                      className="h-14 rounded-2xl border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500"
                    >
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={handleResetAccount}
                      disabled={resetLoading || (auth.currentUser?.providerData.some(p => p.providerId === 'password') ? !resetPassword : resetPassword.toUpperCase() !== (t('reset_confirm_word') || 'ZERAR'))}
                      className="h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-lg shadow-rose-900/10 active:scale-95 transition-all"
                    >
                      {resetLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        t('reset_now')
                      )}
                    </Button>
                  </div>
               </div>
            </Card>
          </div>
        )}

        {/* Delete Account Modal */}
        {showDeleteAccountModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in zoom-in-95 duration-200">
            <Card className="w-full max-w-md p-8 flex flex-col gap-6 border-none shadow-[0_32px_64px_rgba(255,0,0,0.1)] bg-white dark:bg-zinc-900">
               <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-20 h-20 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-rose-500/20">
                    <Trash2 size={40} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-rose-600 uppercase tracking-tighter">{t('delete_account_title')}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 leading-relaxed">
                      {t('delete_account_desc')}
                    </p>
                  </div>
               </div>
               
               <div className="flex flex-col gap-4">
                  <div className="space-y-4">
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder={auth.currentUser?.providerData.some(p => p.providerId === 'password') ? t('current_password') : t('trash_confirm_placeholder', { defaultValue: "Digite 'EXCLUIR' para confirmar" })}
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="pl-12 pr-12 h-14 rounded-2xl border-rose-100 dark:border-rose-900/30 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-bold"
                      />
                      {auth.currentUser?.providerData.some(p => p.providerId === 'password') && (
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-rose-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      )}
                    </div>

                    {deleteError && (
                      <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest bg-rose-50 dark:bg-rose-950/30 py-2 rounded-lg">
                        {deleteError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <Button 
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || (auth.currentUser?.providerData.some(p => p.providerId === 'password') ? !deletePassword : deletePassword.toUpperCase() !== t('trash_confirm_word', { defaultValue: 'EXCLUIR' }))}
                      className="h-16 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 active:scale-95 transition-all text-base"
                    >
                      {deleteLoading ? (
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        t('delete_account_btn')
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setShowDeleteAccountModal(false);
                        setDeletePassword('');
                        setDeleteError('');
                      }}
                      disabled={deleteLoading}
                      className="h-12 text-zinc-400 hover:text-zinc-600 font-bold uppercase tracking-widest text-[10px]"
                    >
                      {t('cancel')}
                    </Button>
                  </div>
               </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
