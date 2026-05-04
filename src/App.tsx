import React, { useState, useEffect } from 'react';
import { FinanceProvider, useFinance } from './FinanceProvider';
import { auth } from './lib/firebase';
import { 
  Home, 
  LayoutList, 
  CreditCard, 
  Target, 
  Users, 
  User, 
  Menu, 
  Plus, 
  Tag,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Bell,
  X,
  BarChart3,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Input } from './components/ui';
import { cn } from './lib/utils';
import { useTranslation } from 'react-i18next';

// Views
import { DashboardView } from './views/DashboardView';
import { PlanningView } from './views/PlanningView';
import { InvoicesView } from './views/CardsView';
import { CreditCardsView } from './views/CreditCardsView';
import { GoalsView } from './views/GoalsView';
import { FamilyView } from './views/FamilyView';
import { ProfileView } from './views/ProfileView';
import { SummaryView } from './views/SummaryView';
import { CategoriesView } from './views/CategoriesView';
import { BankAccountsView } from './views/BankAccountsView';
import { AccountSettingsView } from './views/AccountSettingsView';
import { AuthView } from './views/AuthView';
import { OnboardingView } from './views/OnboardingView';
import { AdBanner } from './components/AdBanner';

function AppShell() {
  const { t } = useTranslation();
  const { userProfile, partnerProfile, loading, error } = useFinance();
  const [currentView, setCurrentView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    // Only show onboarding if user explicitly has onboarded: false (meaning they are new)
    // and hasn't seen it in this browser session/local storage
    const onboardedLocal = localStorage.getItem('onboarded');
    if (!loading && userProfile && userProfile.onboarded === false && !onboardedLocal) {
      setIsOnboarding(true);
    }
  }, [loading, userProfile]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8 text-center text-zinc-900 dark:text-zinc-100">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/30 text-rose-600 rounded-2xl flex items-center justify-center mb-6">
          <X className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Ops! Algo deu errado</h2>
        <p className="text-slate-500 max-w-xs mb-8 text-sm">{error}</p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={() => window.location.reload()} variant="primary">Tentar Novamente</Button>
          <Button onClick={() => auth.signOut()} variant="ghost">Sair da Conta</Button>
        </div>
      </div>
    );
  }

  if (isOnboarding) {
    return <OnboardingView onComplete={() => setIsOnboarding(false)} />;
  }

  if (!userProfile) {
    return <AuthView />;
  }

  const renderView = () => {
    if (!userProfile?.coupleId) return <FamilyView />;

    switch (currentView) {
      case 'dashboard': return <DashboardView />;
      case 'planning': return <PlanningView />;
      case 'invoices': return <InvoicesView />;
      case 'credit-cards': return <CreditCardsView />;
      case 'bank-accounts': return <BankAccountsView />;
      case 'summaries': return <SummaryView />;
      case 'goals': return <GoalsView />;
      case 'family': return <FamilyView />;
      case 'categories': return <CategoriesView />;
      case 'profile': return <ProfileView onNavigate={(view) => setCurrentView(view)} />;
      case 'account-settings': return <AccountSettingsView onBack={() => setCurrentView('profile')} />;
      default: return <DashboardView />;
    }
  };

  const navItems = [
    { id: 'dashboard', icon: Home, label: t('nav_home') },
    { id: 'planning', icon: LayoutList, label: t('nav_planning') },
    { id: 'invoices', icon: CreditCard, label: t('nav_invoices') },
  ];

  const sideItems = [
    { id: 'summaries', icon: BarChart3, label: t('nav_summaries') },
    { id: 'bank-accounts', icon: Landmark, label: t('nav_bank_accounts') },
    { id: 'credit-cards', icon: CreditCard, label: t('nav_credit_cards') },
    { id: 'goals', icon: Target, label: t('nav_goals') },
    { id: 'categories', icon: Tag, label: t('nav_categories') },
    { id: 'family', icon: Users, label: t('nav_family') },
  ];

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-500">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-900">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-12 h-20 sm:h-24 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 rounded-xl sm:rounded-2xl w-10 h-10 sm:w-12 sm:h-12 shadow-sm hover:shadow-md transition-all" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-black tracking-tighter select-none">
              3%<span className="text-orange-600 underline decoration-[3px] underline-offset-[6px] ml-1">FINANÇAS</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 group cursor-pointer" onClick={() => setCurrentView('profile')}>
            <div className="hidden sm:flex flex-col text-right">
              <p className="text-[10px] uppercase font-black text-zinc-400 leading-none tracking-[0.2em] mb-1">{t('active_session')}</p>
              <p className="font-black text-xs sm:text-sm tracking-tight">
                {userProfile.displayName?.split(' ')[0]} <span className="text-zinc-300 dark:text-zinc-600 mx-1">/</span> {partnerProfile?.displayName?.split(' ')[0] || '...'}
              </p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center text-white dark:text-zinc-900 font-black text-xs shadow-xl ring-4 ring-zinc-50 dark:ring-zinc-900 transition-transform group-hover:scale-105">
              {userProfile.displayName?.charAt(0)}{partnerProfile?.displayName?.charAt(0) || ''}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-y-auto pb-32 sm:pb-40">
        <div className="max-w-screen-xl mx-auto">
          {userProfile && !userProfile.isPremium && (
            <div className="px-4 pt-4 sm:px-8 sm:pt-10 mb-2">
              <AdBanner />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'circOut' }}
              className="px-4 py-8 sm:p-10"
            >
              <div className="min-h-[calc(100vh-20rem)]">
                {renderView()}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Sidebar Overlay */}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-zinc-950 z-50 p-6 flex flex-col gap-8 shadow-2xl border-r border-zinc-100 dark:border-zinc-900"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-orange-600 tracking-tighter">{t('sidebar_menu')}</h2>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)} className="dark:text-zinc-400">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <nav className="flex flex-col gap-2">
                {sideItems.map((item) => (
                  <Button
                    key={item.id}
                    variant={currentView === item.id ? 'secondary' : 'ghost'}
                    className={cn(
                      "justify-start gap-4 px-4 py-6 rounded-2xl transition-all",
                      currentView === item.id ? "dark:bg-white dark:text-zinc-900 shadow-xl" : "dark:text-zinc-400"
                    )}
                    onClick={() => {
                      setCurrentView(item.id);
                      setSidebarOpen(false);
                    }}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="font-black text-xs uppercase tracking-widest">{item.label}</span>
                  </Button>
                ))}
              </nav>

              <div className="mt-auto flex flex-col gap-2">
                <Button variant="ghost" className="justify-start gap-4 px-4 py-6 text-zinc-500 dark:text-rose-500/60 hover:dark:text-rose-500" onClick={() => auth.signOut()}>
                  <LogOut className="w-6 h-6" />
                  <span className="font-black text-xs uppercase tracking-widest">{t('exit')}</span>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 h-20 sm:h-24 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-around px-4 sm:px-8 z-30">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={cn(
              "p-3 sm:p-4 rounded-2xl transition-all relative group",
              currentView === item.id ? "text-orange-600" : "text-zinc-400 dark:text-zinc-600"
            )}
          >
            <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
            {currentView === item.id && (
              <motion.div
                layoutId="nav-active"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"
              />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <AppShell />
    </FinanceProvider>
  );
}
