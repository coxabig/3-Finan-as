import { useTranslation } from 'react-i18next';

export function useFormatCurrency() {
  const { i18n } = useTranslation();

  const formatCurrency = (val: number) => {
    const lang = i18n.language.split('-')[0];
    const locale = i18n.language === 'pt-BR' ? 'pt-BR' : lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : i18n.language;
    const currency = i18n.language === 'pt-BR' ? 'BRL' : lang === 'es' ? 'EUR' : 'USD';
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    }).format(val);
  };

  return { formatCurrency };
}
