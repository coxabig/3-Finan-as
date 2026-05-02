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
    // Escuta evento global para reiniciar o tutorial se solicitado pelo usuário
    const handleRestart = (e: any) => {
      if (e.detail?.pageId === pageId) {
        startTutorial();
      }
    };
    window.addEventListener('restart-tutorial', handleRestart);
    return () => window.removeEventListener('restart-tutorial', handleRestart);
  }, [pageId]);

  const startTutorial = () => {
    const driverObj = driver({
      showProgress: true,
      allowClose: true,
      overlayColor: '#000',
      overlayOpacity: 0.75,
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

    driverObj.drive();
  };

  useEffect(() => {
    if (loading || !userProfile || hasStarted.current) return;

    // Se o usuário já viu este tutorial, não mostramos novamente automaticamente
    if (userProfile.tutorialsSeen?.includes(pageId)) return;

    if (autoStart) {
      hasStarted.current = true;
      
      // Pequeno delay para garantir que o DOM esteja pronto e animações concluídas
      const timer = setTimeout(() => {
        startTutorial();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [pageId, steps, autoStart, userProfile, loading, markTutorialAsSeen]);

  return null;
}
