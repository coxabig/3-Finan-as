import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { useFinance } from '../FinanceProvider';

import { useTranslation } from 'react-i18next';

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  
  const steps = [
    {
      title: t('welcome_title', { defaultValue: "Bem-vindo ao 3%" }),
      description: t('onboarding_desc_p1', { defaultValue: "O controle financeiro feito sob medida para casais que buscam equilíbrio e transparência." }),
      image: "📊",
      color: "bg-orange-50"
    },
    {
      title: t('step_prop_title', { defaultValue: "Economia Proporcional" }),
      description: t('step_prop_desc', { defaultValue: "Divida as contas de forma justa: quem ganha mais, contribui mais. Simples assim." }),
      image: "⚖️",
      color: "bg-blue-50"
    },
    {
      title: t('step_all_one_title', { defaultValue: "Tudo em um só lugar" }),
      description: t('step_all_one_desc', { defaultValue: "Faturas, metas, cartões e planejamento conjuntos. Comece agora sua jornada financeira." }),
      image: "🏠",
      color: "bg-green-50"
    }
  ];

  const [current, setCurrent] = useState(0);
  const { finishOnboarding } = useFinance();

  const next = async () => {
    if (current < steps.length - 1) {
      setCurrent(current + 1);
    } else {
      await finishOnboarding();
      onComplete();
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white dark:bg-zinc-950 transition-colors duration-500 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
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
          <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed">
            {steps[current].description}
          </p>
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
        
        <Button onClick={next} className="w-full">
          {current === steps.length - 1 ? t('get_started', { defaultValue: 'Começar' }) : t('next', { defaultValue: 'Próximo' })}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}
