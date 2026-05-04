import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '../components/ui';
import { ChevronRight, ArrowRight, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../FinanceProvider';

import { useTranslation } from 'react-i18next';

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { userProfile, finishOnboarding, updateBirthDate } = useFinance();
  const [birthDate, setBirthDate] = useState('');
  
  const steps = useMemo(() => {
    const baseSteps = [
      {
        id: 'welcome',
        title: t('welcome_title', { defaultValue: "Bem-vindo ao 3%" }),
        description: t('onboarding_desc_p1', { defaultValue: "O controle financeiro feito sob medida para casais que buscam equilíbrio e transparência." }),
        image: "📊",
        color: "bg-orange-50"
      },
      {
        id: 'proportional',
        title: t('step_prop_title', { defaultValue: "Economia Proporcional" }),
        description: t('step_prop_desc', { defaultValue: "Divida as contas de forma justa: quem ganha mais, contribui mais. Simples assim." }),
        image: "⚖️",
        color: "bg-blue-50"
      },
      {
        id: 'all-in-one',
        title: t('step_all_one_title', { defaultValue: "Tudo em um só lugar" }),
        description: t('step_all_one_desc', { defaultValue: "Faturas, metas, cartões e planejamento conjuntos. Comece agora sua jornada financeira." }),
        image: "🏠",
        color: "bg-green-50"
      }
    ];

    // Se o usuário já não tem data de nascimento (ex: login social), adicionamos o passo
    if (userProfile && !userProfile.birthDate) {
      baseSteps.push({
        id: 'birthdate',
        title: t('personal_info', { defaultValue: 'Informações Pessoais' }),
        description: t('enter_birth_date', { defaultValue: 'Informe sua data de nascimento para personalizarmos sua experiência.' }),
        image: "🎂",
        color: "bg-purple-50"
      });
    }

    return baseSteps;
  }, [userProfile, t]);

  const [current, setCurrent] = useState(0);

  const next = async () => {
    const currentStep = steps[current];
    
    if (currentStep.id === 'birthdate' && !birthDate) {
      // Validar se informou a data se for o passo da data
      return;
    }

    if (current < steps.length - 1) {
      setCurrent(current + 1);
    } else {
      if (birthDate) {
        await updateBirthDate(birthDate);
      }
      await finishOnboarding();
      onComplete();
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950 transition-colors duration-500 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={steps[current].id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -100 }}
          className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        >
          <div className={cn(
            "w-48 h-48 rounded-full flex items-center justify-center text-7xl mb-12 transition-colors duration-500", 
            steps[current].color,
            "dark:bg-opacity-20"
          )}>
            {steps[current].image}
          </div>
          <h2 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-white">{steps[current].title}</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed max-w-md mx-auto mb-8">
            {steps[current].description}
          </p>

          {steps[current].id === 'birthdate' && (
            <div className="w-full max-w-xs mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col gap-2 text-left bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 ring-4 ring-zinc-50 dark:ring-zinc-900/50">
                  <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2 px-1">
                    <Calendar className="w-3 h-3" /> Data de Nascimento
                  </span>
                  <Input 
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="h-12 bg-white dark:bg-zinc-950 border-none shadow-sm text-sm font-bold"
                  />
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="p-8 pb-12 flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === current ? "w-8 bg-orange-600" : "w-2 bg-zinc-200 dark:bg-zinc-800"
              )} 
            />
          ))}
        </div>
        
        <Button onClick={next} className="w-full h-14 rounded-2xl text-base font-black tracking-widest uppercase shadow-xl shadow-orange-600/20 active:scale-[0.98] transition-all" disabled={steps[current].id === 'birthdate' && !birthDate}>
          {current === steps.length - 1 ? t('get_started', { defaultValue: 'Começar Agora' }) : t('next', { defaultValue: 'Próximo' })}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
