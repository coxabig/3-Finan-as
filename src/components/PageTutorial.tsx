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

  const startTutorial = () => {
    // Verificar se pelo menos o primeiro elemento existe
    const firstStep = steps[0];
    if (firstStep?.element && !document.querySelector(firstStep.element as string)) {
      console.warn(`[Tutorial] Element ${firstStep.element} not found, retrying in 500ms...`);
      setTimeout(startTutorial, 500);
      return;
    }

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
          nextBtnText: index === steps.length - 1 ? (pageId === 'dashboard' ? 'Entendi! 🚀' : 'Concluir ✨') : 'Próximo',
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
      onDestroyed: (element, step, { state }) => {
        // Se fechou no último passo ou completou, marca como visto
        if (state.activeIndex === steps.length - 1) {
          markTutorialAsSeen(pageId);
        }
      }
    });

    driverObj.drive();
  };

  useEffect(() => {
    if (loading || !userProfile) return;

    // Escuta evento global para reiniciar o tutorial se solicitado pelo usuário
    const handleRestart = (e: any) => {
      if (e.detail?.pageId === pageId || e.detail?.pageId === 'current') {
        startTutorial();
      }
    };
    window.addEventListener('restart-tutorial', handleRestart);

    // Auto-start logic
    if (autoStart && !hasStarted.current && !userProfile.tutorialsSeen?.includes(pageId)) {
      hasStarted.current = true;
      const timer = setTimeout(() => {
        startTutorial();
      }, 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('restart-tutorial', handleRestart);
      }
    }

    return () => window.removeEventListener('restart-tutorial', handleRestart);
  }, [pageId, userProfile, loading, autoStart]);

  return null;
}
