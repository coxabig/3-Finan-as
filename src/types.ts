export enum TransactionType {
  REVENUE = 'revenue',
  EXPENSE = 'expense'
}

export enum FrequencyType {
  ONCE = 'once',
  FIXED = 'fixed',
  INSTALLMENTS = 'installments'
}

export type Responsibility = string | 'couple';

export interface Category {
  id: string;
  name: string;
  color: string;
  iconName?: string;
  coupleId: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  month: string;
  type: TransactionType;
  ownerId: string;
  responsibility: Responsibility;
  frequency: FrequencyType;
  installments?: number;
  installmentIndex?: number;
  parentId?: string;
  cardId?: string;
  createdAt: any;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  revenue: number;
  coupleId?: string;
  onboarded?: boolean;
  isPremium?: boolean;
  darkMode?: boolean;
  tutorialsSeen?: string[];
  userColor?: string;
  partnerColor?: string;
  language?: string;
  birthDate?: string;
}

export interface Couple {
  id: string;
  user1: string;
  user2: string;
  proportionalityEnabled: boolean;
  createdAt: number;
}

export interface Card {
  id: string;
  name: string;
  ownerId: string;
  lastDigits: string;
  limit: number;
  color?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  coupleId: string;
  type: string;
}

export interface BankAccount {
  id: string;
  name: string;
  ownerId: string;
  balance: number;
  color?: string;
  bankName?: string;
  createdAt?: any;
}
