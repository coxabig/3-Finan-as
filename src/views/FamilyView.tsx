import React, { useState } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { cn } from '../lib/utils';
import { Users, UserPlus, Heart, Settings, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { MonthSelector } from '../components/MonthSelector';

import { PageTutorial } from '../components/PageTutorial';

import { useTranslation } from 'react-i18next';
import { useFormatCurrency } from '../hooks/useFormatCurrency';

export function FamilyView() {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatCurrency();
  const { 
    userProfile, 
    partnerProfile, 
    ratios, 
    createCouple, 
    joinCouple,
  } = useFinance();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await createCouple();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode) return;
    setLoading(true);
    setError(null);
    try {
      await joinCouple(inviteCode);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile?.coupleId) {
    return (
      <div className="flex flex-col gap-8 py-8 items-center text-center max-w-sm mx-auto">
        <PageTutorial 
          pageId="family-onboarding"
          steps={[
            { element: '#family-setup', popover: { title: t('family_onboarding_title'), description: t('family_onboarding_desc', { defaultValue: 'Para começar, você precisa criar um grupo ou entrar no grupo do seu parceiro usando o código dele.' }) } },
          ]}
        />
        <div id="family-setup" className="flex flex-col gap-8 py-8 items-center text-center max-w-sm mx-auto">
          <div className="w-20 h-20 bg-orange-100 dark:bg-orange-950/20 text-orange-600 rounded-3xl flex items-center justify-center mb-4">
            <Users className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter text-zinc-900 dark:text-white">{t('start_couple')}</h2>
            <p className="text-zinc-500 dark:text-zinc-400">{t('start_couple_desc', { defaultValue: 'Para usar o 3%, você precisa criar um espaço compartilhado ou entrar em um existente.' })}</p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 p-4 rounded-xl text-xs font-bold w-full">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-4 w-full">
            <Button onClick={handleCreate} disabled={loading} className="py-6 rounded-2xl">
              {loading ? t('creating') : t('create_couple', { defaultValue: 'Criar Novo Casal' })}
            </Button>
            
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
              <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-600 uppercase">{t('or')}</span>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 flex-1" />
            </div>

            <div className="flex flex-col gap-2">
              <Input 
                placeholder={t('invite_code_placeholder', { defaultValue: 'Cole o código do seu parceiro' })}
                value={inviteCode} 
                onChange={e => setInviteCode(e.target.value)}
                className="text-center"
              />
              <Button variant="outline" onClick={handleJoin} disabled={loading || !inviteCode} className="py-6 rounded-2xl">
                {loading ? t('joining') : t('join_code', { defaultValue: 'Entrar com Código' })}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTutorial 
        pageId="family-dashboard"
        steps={[
          { element: '#family-members', popover: { title: t('family_dashboard_members_title'), description: t('family_dashboard_members_desc', { defaultValue: 'Aqui você vê quem faz parte do casal e a renda declarada por cada um.' }) } },
          { element: '#participation-ratio', popover: { title: t('participation_ratio_title'), description: t('participation_ratio_desc', { defaultValue: 'O sistema calcula automaticamente quanto cada um deve contribuir baseado na renda do mês.' }) } },
          { element: '#invite-partner', popover: { title: t('invite_partner_title'), description: t('invite_partner_desc', { defaultValue: 'Se o seu parceiro ainda não entrou, compartilhe este código com ele para unirem as finanças.' }) } },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">{t('family_title')}</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{t('family_subtitle', { defaultValue: 'Membros ativos e participação por mês.' })}</p>
      </div>

      <MonthSelector />

      <div id="family-members" className="flex flex-col gap-4">
        {/* User Card */}
        <Card className="p-6 flex items-center justify-between border-l-4 border-l-orange-500 bg-white dark:bg-zinc-900/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-zinc-200/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-600/20 flex items-center justify-center text-xl font-bold text-orange-600 dark:text-orange-400 border border-orange-100/50 dark:border-orange-900/30">
               {userProfile?.displayName?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">{userProfile?.displayName}</h3>
              <p className="text-xs text-zinc-400 font-bold uppercase">{t('income_month')}: {formatCurrency(ratios.userRevenue)}</p>
            </div>
          </div>
          <div id="participation-ratio" className="text-right">
             <span className="text-xs font-black text-orange-600">{(ratios.user * 100).toFixed(0)}%</span>
             <p className="text-[10px] text-zinc-400 font-bold uppercase">{t('participation')}</p>
          </div>
        </Card>

        {/* Partner Card */}
        {partnerProfile ? (
          <Card className="p-6 flex items-center justify-between border-l-4 border-l-zinc-300 dark:border-l-zinc-700 bg-white dark:bg-zinc-900/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-zinc-200/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800/40 flex items-center justify-center text-xl font-bold text-zinc-400 dark:text-zinc-500 border border-zinc-100/50 dark:border-zinc-800/30">
                 {partnerProfile.displayName?.charAt(0) || 'P'}
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-white">{partnerProfile.displayName}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase">{t('income_month')}: {formatCurrency(ratios.partnerRevenue)}</p>
              </div>
            </div>
            <div className="text-right">
               <span className="text-xs font-black text-zinc-400">{(ratios.partner * 100).toFixed(0)}%</span>
               <p className="text-[10px] text-zinc-400 font-bold uppercase">{t('participation')}</p>
            </div>
          </Card>
        ) : (
          <Card id="invite-partner" className="p-8 border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 flex flex-col items-center justify-center text-center gap-4">
            <UserPlus className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            <div className="flex flex-col gap-1">
              <p className="font-bold text-zinc-900 dark:text-white">{t('invite_partner_title')}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('invite_partner_desc', { defaultValue: 'Peça para seu parceiro entrar com o código abaixo:' })}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 px-6 py-4 rounded-xl border border-zinc-200 dark:border-zinc-800 font-mono text-sm font-bold tracking-widest text-orange-600">
              {userProfile?.coupleId}
            </div>
            <Button 
               variant="outline" 
               size="sm" 
               onClick={() => {
                 navigator.clipboard.writeText(userProfile?.coupleId || '');
               }}
            >
              {t('copy_code')}
            </Button>
          </Card>
        )}
      </div>

      <Card className="p-6 flex flex-col gap-4 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-5 h-5 text-orange-600" />
           <h3 className="font-bold text-zinc-900 dark:text-white">{t('privacy_title', { defaultValue: 'Privacidade & Acesso' })}</h3>
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t('privacy_desc', { defaultValue: 'Ambos os membros têm acesso total às despesas conjuntas e cartões compartilhados. As despesas individuais permanecem visíveis para fins de cálculo de proporcionalidade.' })}
        </p>
      </Card>
    </div>
  );
}
