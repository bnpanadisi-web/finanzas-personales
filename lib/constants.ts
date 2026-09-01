import {
  LucideIcon,
  ShoppingCart,
  Home as HouseIcon,
  Zap,
  Utensils,
  Car,
  HeartPulse,
  Film,
  Tag,
  Wallet,
  Briefcase,
  TrendingUp,
  DollarSign,
  Dumbbell,
  Pizza,
  Coffee,
  Truck,
  Bike,
  Plane,
  GraduationCap,
  Gift,
  Smartphone,
  Printer,
  Tv,
  BookOpen,
  CreditCard,
  ArrowRightLeft,
  Landmark,
  PiggyBank,
  RefreshCw,
} from 'lucide-react';

export const ICONOS_DISPONIBLES: Record<string, LucideIcon> = {
  Wallet,
  Briefcase,
  TrendingUp,
  DollarSign,
  Landmark,
  PiggyBank,
  CreditCard,
  ArrowRightLeft,
  ShoppingCart,
  HouseIcon,
  Utensils,
  Pizza,
  Coffee,
  Zap,
  Car,
  Bike,
  Truck,
  Plane,
  HeartPulse,
  Dumbbell,
  Film,
  Tv,
  BookOpen,
  GraduationCap,
  Gift,
  Smartphone,
  Tag,
  Printer,
  RefreshCw,
};

export const ICONO_A_EMOJI: Record<string, string> = {
  Wallet: '👛',
  Briefcase: '💼',
  TrendingUp: '📈',
  DollarSign: '💵',
  Landmark: '🏛️',
  PiggyBank: '🐷',
  CreditCard: '💳',
  ArrowRightLeft: '🔁',
  ShoppingCart: '🛒',
  HouseIcon: '🏠',
  Home: '🏠',
  Utensils: '🍽️',
  Pizza: '🍕',
  Coffee: '☕',
  Zap: '⚡',
  Car: '🚗',
  Bike: '🚲',
  Truck: '🚚',
  Plane: '✈️',
  HeartPulse: '💊',
  Dumbbell: '🏋️',
  Film: '🎬',
  Tv: '📺',
  BookOpen: '📚',
  GraduationCap: '🎓',
  Gift: '🎁',
  Smartphone: '📱',
  Tag: '🏷️',
  Printer: '🖨️',
  RefreshCw: '🔄',
};

export function getCategoryEmoji(icono?: string): string {
  if (!icono) return '🏷️';
  if (ICONO_A_EMOJI[icono]) {
    return ICONO_A_EMOJI[icono];
  }
  // Si ya es un emoji o contiene caracteres unicode/no alfanuméricos simples
  if (/[\u{1F300}-\u{1FAFF}]/u.test(icono) || !/^[A-Za-z0-9_]+$/.test(icono)) {
    return icono;
  }
  return '🏷️';
}

export const DEFAULT_ACCOUNTS = [
  'Mercado Pago',
  'Efectivo',
  'Cuenta Bancaria',
  'Tarjeta de Crédito',
  'Billetera Cripto',
];

export const COLORES_GRAFICO = [
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#eab308', // Yellow
  '#64748b', // Slate
];

export const MESES_NOMBRES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
