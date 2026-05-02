import React, { useEffect, useRef } from 'react';
import { driver, DriveStep } from 'driver.js';
import { useFinance } from '../FinanceProvider';

interface PageTutorialProps {
  pageId: string;
  steps: DriveStep[];
  autoStart?: boolean;
}

export function PageTutorial({ pageId, steps, autoStart = true }: PageTutorialProps) {
  const { userProfile, markTutorialAsSeen, loading } = useFinance();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (loading || !userProfile || hasStarted.current) return;

    // Se o usuário já viu este tutorial, não mostramos novamente automaticamente
    if (userProfile.tutorialsSeen?.includes(pageId)) return;

    if (autoStart) {
      hasStarted.current = true;
      
      const driverObj = driver({
        showProgress: true,
        steps: steps.map(step => ({
          ...step,
          popover: {
            ...step.popover,
            nextBtnText: 'Próximo',
            prevBtnText: 'Anterior',
            doneBtnText: 'Entendi!',
          }
        })),
        onDestroyed: () => {
          markTutorialAsSeen(pageId);
        }
      });

      // Pequeno delay para garantir que o DOM esteja pronto e animações concluídas
      const timer = setTimeout(() => {
        driverObj.drive();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [pageId, steps, autoStart, userProfile, loading, markTutorialAsSeen]);

  return null;
}
