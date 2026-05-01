import { 
  Utensils, 
  Coffee, 
  ShoppingBag, 
  Car, 
  Bus, 
  Plane, 
  Bike, 
  Gamepad2, 
  Tv, 
  Music, 
  Film, 
  Camera, 
  Repeat, 
  CreditCard, 
  Gift, 
  Shirt, 
  HeartPulse, 
  Pill, 
  GraduationCap, 
  Book, 
  Droplets, 
  Zap, 
  Wifi, 
  Phone, 
  Home, 
  Tag, 
  CircleDollarSign, 
  Landmark, 
  Briefcase, 
  Globe,
  Wallet,
  PiggyBank,
  GlassWater,
  ShoppingCart,
  Dumbbell,
  Stethoscope,
  Scissors,
  Brush,
  Wind,
  Flame,
  LucideIcon
} from 'lucide-react';

export const ALL_ICONS: { [key: string]: LucideIcon } = {
  Utensils, 
  Coffee, 
  ShoppingBag, 
  Car, 
  Bus, 
  Plane, 
  Bike, 
  Gamepad2, 
  Tv, 
  Music, 
  Film, 
  Camera, 
  Repeat, 
  CreditCard, 
  Gift, 
  Shirt, 
  HeartPulse, 
  Pill, 
  GraduationCap, 
  Book, 
  Droplets, 
  Zap, 
  Wifi, 
  Phone, 
  Home, 
  Tag, 
  CircleDollarSign, 
  Landmark, 
  Briefcase, 
  Globe,
  Wallet,
  PiggyBank,
  GlassWater,
  ShoppingCart,
  Dumbbell,
  Stethoscope,
  Scissors,
  Brush,
  Wind,
  Flame,
};

export const getCategoryIcon = (name: string, iconName?: string): LucideIcon => {
  // Se houver um ícone selecionado manualmente, usá-lo prioritariamente
  if (iconName && ALL_ICONS[iconName]) {
    return ALL_ICONS[iconName];
  }

  const n = name.toLowerCase().trim();
  if (n.length === 0) return Tag;

  // Cache para buscas rápidas
  const keywords: { [key: string]: LucideIcon } = {
    // Supermercado
    'mercado': ShoppingBag,
    'supermercado': ShoppingBag,
    'compras': ShoppingCart,
    'sacolão': ShoppingBag,
    'sacolao': ShoppingBag,
    'hortifruti': ShoppingBag,
    'pão': Coffee,
    'pao': Coffee,
    'padaria': Coffee,
    'carrefour': ShoppingBag,
    'extra': ShoppingBag,
    'assai': ShoppingBag,
    'atacado': ShoppingBag,
    'shopee': ShoppingCart,
    'aliexpress': ShoppingCart,
    'amazon': ShoppingCart,
    'feira': ShoppingBag,
    'varejo': ShoppingCart,

    // Alimentação
    'alimentação': Utensils,
    'alimentacao': Utensils,
    'restaurante': Utensils,
    'comer': Utensils,
    'ifood': Utensils,
    'comida': Utensils,
    'jantar': Utensils,
    'almoço': Utensils,
    'almoco': Utensils,
    'lanche': Utensils,
    'pizza': Utensils,
    'hamburguer': Utensils,
    'burguer': Utensils,
    'sushi': Utensils,
    'café': Coffee,
    'cafe': Coffee,
    'doce': Coffee,
    'sobremesa': Coffee,
    'starbucks': Coffee,
    'bar': GlassWater,
    'pub': GlassWater,
    'bebida': GlassWater,
    'cerveja': GlassWater,

    // Transporte
    'transporte': Car,
    'carro': Car,
    'veículo': Car,
    'veiculo': Car,
    'uber': Car,
    '99': Car,
    'gasolina': Zap,
    'combustível': Zap,
    'combustivel': Zap,
    'posto': Zap,
    'estacionamento': Car,
    'ipva': Car,
    'pedágio': Car,
    'pedagio': Car,
    'ônibus': Bus,
    'onibus': Bus,
    'bus': Bus,
    'metrô': Bus,
    'metro': Bus,
    'trem': Bus,
    'avião': Plane,
    'aviao': Plane,
    'viagem': Plane,
    'hotel': Plane,
    'voo': Plane,
    'bike': Bike,
    'bicicleta': Bike,

    // Lazer
    'lazer': Camera,
    'diversão': Camera,
    'diversao': Camera,
    'hobby': Camera,
    'passeio': Camera,
    'parque': Camera,
    'viagem lazer': Camera,
    'cinema': Film,
    'filme': Film,
    'netflix': Tv,
    'streaming': Tv,
    'música': Music,
    'musica': Music,
    'spotify': Music,
    'show': Music,
    'jogo': Gamepad2,
    'game': Gamepad2,
    'shopping': ShoppingCart,

    // Saúde
    'saúde': HeartPulse,
    'saude': HeartPulse,
    'médico': Stethoscope,
    'medico': Stethoscope,
    'hospital': Landmark,
    'exame': Stethoscope,
    'dentista': HeartPulse,
    'farmácia': Pill,
    'farmacia': Pill,
    'remédio': Pill,
    'remedio': Pill,
    'academia': Dumbbell,
    'gym': Dumbbell,
    'treino': Dumbbell,
    'fit': Dumbbell,

    // Educação
    'escola': GraduationCap,
    'faculdade': GraduationCap,
    'curso': GraduationCap,
    'educação': GraduationCap,
    'educacao': GraduationCap,
    'estudo': Book,
    'livro': Book,

    // Casa
    'casa': Home,
    'aluguel': Home,
    'condomínio': Home,
    'condominio': Home,
    'móveis': Home,
    'moveis': Home,
    'água': Droplets,
    'agua': Droplets,
    'luz': Zap,
    'energia': Zap,
    'internet': Wifi,
    'wifi': Wifi,
    'celular': Phone,
    'telefone': Phone,
    'assinatura': Repeat,
    'streaming casa': Tv,

    // Pessoal / Outros
    'roupa': Shirt,
    'moda': Shirt,
    'presente': Gift,
    'mimo': Gift,
    'cabeleireiro': Scissors,
    'barbeiro': Scissors,
    'beleza': Brush,
    'estética': Brush,

    // Financeiro
    'salário': Briefcase,
    'salario': Briefcase,
    'pagamento': Wallet,
    'recebimento': PiggyBank,
    'investimento': Landmark,
    'investimentos': Landmark,
    'banco': Landmark,
    'cartão': CreditCard,
    'cartao': CreditCard,
    'imposto': CircleDollarSign,
    'irpf': CircleDollarSign,
    'iptu': Home,
  };

  // 1. Busca exata ou prefixo longo
  for (const [key, icon] of Object.entries(keywords)) {
    if (n === key || n.includes(key)) return icon;
  }

  // 2. Fallback para prefixos curtos (Reconhecimento agressivo)
  if (n.startsWith('mer') || n.startsWith('sup')) return ShoppingBag;
  if (n.startsWith('res') || n.startsWith('ifo') || n.startsWith('comi')) return Utensils;
  if (n.startsWith('ube') || n.startsWith('99') || n.startsWith('tra') || n.startsWith('car')) return Car;
  if (n.startsWith('laz') || n.startsWith('div') || n.startsWith('pas')) return Camera;
  if (n.startsWith('sau') || n.startsWith('med') || n.startsWith('hos')) return HeartPulse;
  if (n.startsWith('far') || n.startsWith('rem') || n.startsWith('dro')) return Pill;
  if (n.startsWith('edu') || n.startsWith('esc') || n.startsWith('fac')) return GraduationCap;
  if (n.startsWith('cas') || n.startsWith('alu') || n.startsWith('con')) return Home;
  if (n.startsWith('luz') || n.startsWith('ene') || n.startsWith('ele')) return Zap;
  if (n.startsWith('int') || n.startsWith('wif') || n.startsWith('viv')) return Wifi;
  if (n.startsWith('pre') || n.startsWith('mim') || n.startsWith('ani')) return Gift;

  return Tag;
};
