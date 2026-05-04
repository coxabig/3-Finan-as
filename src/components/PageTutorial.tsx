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
      overlayOpacity: 0.85,
      popoverClass: 'driverjs-theme',
      steps: steps.map((step, index) => ({
        ...step,
        popover: {
          ...step.popover,
          nextBtnText: index === steps.length - 1 ? 'Concluir ✨' : 'Próximo',
          prevBtnText: 'Anterior',
          doneBtnText: 'Concluir ✨',
        }
      })),
      onDeselected: (element, step, { state }) => {
        // Se desmarcou o último passo, consideramos como concluído
        if (state.activeIndex === steps.length - 1) {
          markTutorialAsSeen(pageId);
        }
      },
      onDestroyed: () => {
        // No driver.js v1, onDestroyed é chamado sempre que fecha.
        // Já cuidamos da marcação no onDeselected acima para garantir finalização.
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
