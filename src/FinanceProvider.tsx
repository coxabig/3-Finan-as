import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './lib/firebase';
import { handleFirestoreError, OperationType } from './lib/firestore-errors';
import { Transaction, TransactionType, UserProfile, Couple, FrequencyType, Goal, Card, Category } from './types';
import { format, addMonths, parseISO } from 'date-fns';

interface FinanceContextType {
  userProfile: UserProfile | null;
  coupleProfile: Couple | null;
  partnerProfile: UserProfile | null;
  transactions: Transaction[];
  allTransactions: Transaction[];
  goals: Goal[];
  cards: Card[];
  categories: Category[];
  cardSummaries: (Card & { invoiceTotal: number })[];
  loading: boolean;
  error: string | null;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  ratios: { user: number; partner: number; userRevenue: number; partnerRevenue: number };
  addTransaction: (data: Partial<Transaction>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  addGoal: (data: Partial<Goal>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  addCard: (data: Partial<Card>) => Promise<void>;
  updateCard: (id: string, data: Partial<Card>) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  addCategory: (data: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  seedInitialCategories: () => Promise<void>;
  updateUserRevenue: (revenue: number) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  updateSubscription: (isPremium: boolean) => Promise<void>;
  updateProfileColors: (colors: { userColor?: string; partnerColor?: string }) => Promise<void>;
  isFamilyPremium: boolean;
  createCouple: () => Promise<void>;
  joinCouple: (coupleId: string) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [coupleProfile, setCoupleProfile] = useState<Couple | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const saved = localStorage.getItem('selectedMonth');
    return saved || format(new Date(), 'yyyy-MM');
  });

  useEffect(() => {
    localStorage.setItem('selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Separate Effect for context-wide transaction sync
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;
    let unsubscribeCouple: (() => void) | null = null;
    let unsubscribePartner: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeAllTransactions: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;
    let unsubscribeCards: (() => void) | null = null;
    let unsubscribeCategories: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // 1. Limpar todos os listeners anteriores imediatamente
      if (unsubscribeUser) { unsubscribeUser(); unsubscribeUser = null; }
      if (unsubscribeCouple) { unsubscribeCouple(); unsubscribeCouple = null; }
      if (unsubscribePartner) { unsubscribePartner(); unsubscribePartner = null; }
      if (unsubscribeTransactions) { unsubscribeTransactions(); unsubscribeTransactions = null; }
      if (unsubscribeAllTransactions) { unsubscribeAllTransactions(); unsubscribeAllTransactions = null; }
      if (unsubscribeGoals) { unsubscribeGoals(); unsubscribeGoals = null; }
      if (unsubscribeCards) { unsubscribeCards(); unsubscribeCards = null; }
      if (unsubscribeCategories) { unsubscribeCategories(); unsubscribeCategories = null; }

      if (user) {
        setLoading(true);
        setError(null);
        try {
          // Listener do Perfil do Usuário
          unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
            if (docSnap.exists()) {
              const profile = { ...docSnap.data(), uid: user.uid } as UserProfile;
              setUserProfile(profile);
              
              // Persist dark mode in localStorage for immediate application next time
              if (profile.darkMode !== undefined) {
                localStorage.setItem('darkMode', String(profile.darkMode));
              }

              if (profile.coupleId) {
                // Listener do Casal
                if (unsubscribeCouple) unsubscribeCouple();
                unsubscribeCouple = onSnapshot(doc(db, 'couples', profile.coupleId), async (coupleDoc) => {
                  if (coupleDoc.exists()) {
                    const coupleData = { ...coupleDoc.data(), id: coupleDoc.id } as Couple;
                    setCoupleProfile(coupleData);
                    
                    const partnerId = coupleData.user1 === user.uid ? coupleData.user2 : coupleData.user1;
                    
                    if (partnerId) {
                      if (unsubscribePartner) unsubscribePartner();
                      unsubscribePartner = onSnapshot(doc(db, 'users', partnerId), (pDoc) => {
                        if (pDoc.exists()) {
                          setPartnerProfile({ ...pDoc.data(), uid: partnerId } as UserProfile);
                        } else {
                          setPartnerProfile(null);
                        }
                      });
                    } else {
                      setPartnerProfile(null);
                    }
                  }
                }, (err) => {
                  handleFirestoreError(err, OperationType.GET, `couples/${profile.coupleId}`);
                });

                // Listener das Transações (respeitando o mês selecionado)
                if (unsubscribeTransactions) unsubscribeTransactions();
                const txQuery = query(
                  collection(db, 'couples', profile.coupleId, 'transactions'),
                  where('month', '==', selectedMonth)
                );
                unsubscribeTransactions = onSnapshot(txQuery, (snapshot) => {
                  setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Transaction[]);
                }, (err) => {
                  handleFirestoreError(err, OperationType.LIST, `couples/${profile.coupleId}/transactions`);
                });

                // Listener de TODAS as Transações (para resumos históricos)
                if (unsubscribeAllTransactions) unsubscribeAllTransactions();
                const allTxQuery = collection(db, 'couples', profile.coupleId, 'transactions');
                unsubscribeAllTransactions = onSnapshot(allTxQuery, (snapshot) => {
                  setAllTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Transaction[]);
                }, (err) => {
                  handleFirestoreError(err, OperationType.LIST, `couples/${profile.coupleId}/all-transactions`);
                });

                // Listener das Metas
                if (unsubscribeGoals) unsubscribeGoals();
                unsubscribeGoals = onSnapshot(collection(db, 'couples', profile.coupleId, 'goals'), (snapshot) => {
                  setGoals(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Goal[]);
                }, (err) => {
                  handleFirestoreError(err, OperationType.LIST, `couples/${profile.coupleId}/goals`);
                });

                // Listener de Cartões
                if (unsubscribeCards) unsubscribeCards();
                unsubscribeCards = onSnapshot(collection(db, 'couples', profile.coupleId, 'cards'), (snapshot) => {
                  setCards(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Card[]);
                }, (err) => {
                  handleFirestoreError(err, OperationType.LIST, `couples/${profile.coupleId}/cards`);
                });

                // Listener de Categorias
                if (unsubscribeCategories) unsubscribeCategories();
                unsubscribeCategories = onSnapshot(collection(db, 'couples', profile.coupleId, 'categories'), (snapshot) => {
                  setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
                  setLoading(false);
                }, (err) => {
                  handleFirestoreError(err, OperationType.LIST, `couples/${profile.coupleId}/categories`);
                  setLoading(false);
                });
              } else {
                // Usuário sem casal
                setCoupleProfile(null);
                setPartnerProfile(null);
                setTransactions([]);
                setGoals([]);
                setCards([]);
                setCategories([]);
                setLoading(false);
              }
            } else {
              // Primeiro acesso: Criar perfil
              try {
                await setDoc(doc(db, 'users', user.uid), {
                  uid: user.uid,
                  displayName: user.displayName || 'Usuário',
                  email: user.email,
                  photoURL: user.photoURL,
                  revenue: 0,
                  onboarded: false,
                  isPremium: false,
                  darkMode: false,
                  createdAt: serverTimestamp()
                });
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
              }
              setLoading(false);
            }
          }, (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          });

        } catch (err: any) {
          setError(err.message || "Erro inesperado.");
          setLoading(false);
        }
      } else {
        // Logout
        setUserProfile(null);
        setCoupleProfile(null);
        setPartnerProfile(null);
        setTransactions([]);
        setGoals([]);
        setCards([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeCouple) unsubscribeCouple();
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeAllTransactions) unsubscribeAllTransactions();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeCards) unsubscribeCards();
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, [selectedMonth]);

  const isFamilyPremium = useMemo(() => {
    return !!(userProfile?.isPremium || partnerProfile?.isPremium);
  }, [userProfile, partnerProfile]);

  // Effect to apply Dark Mode
  useEffect(() => {
    // Check localStorage first for immediate application
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const activeDarkMode = userProfile?.darkMode ?? savedDarkMode;

    if (activeDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProfile?.darkMode]);

  const ratios = useMemo(() => {
    // Buscar rendas registradas nas transações do mês selecionado
    // Utilizamos 'responsibility' para saber de quem é a receita, conforme especificado pelo usuário
    const monthlyUserRevenue = transactions
      .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === userProfile?.uid)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const monthlyPartnerRevenue = transactions
      .filter(tx => tx.type === TransactionType.REVENUE && tx.responsibility === partnerProfile?.uid)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalMonthlyRevenue = monthlyUserRevenue + monthlyPartnerRevenue;

    // Se houver renda no mês, calcular proporção realística
    if (totalMonthlyRevenue > 0) {
      return {
        user: monthlyUserRevenue / totalMonthlyRevenue,
        partner: monthlyPartnerRevenue / totalMonthlyRevenue,
        userRevenue: monthlyUserRevenue,
        partnerRevenue: monthlyPartnerRevenue
      };
    }

    // Fallback para a renda base do perfil se não houver registros no mês
    const userRev = userProfile?.revenue || 0;
    const partnerRev = partnerProfile?.revenue || 0;
    const totalRev = userRev + partnerRev;

    if (totalRev === 0) return { user: 0.5, partner: 0.5, userRevenue: 0, partnerRevenue: 0 };
    
    return {
      user: userRev / totalRev,
      partner: partnerRev / totalRev,
      userRevenue: userRev,
      partnerRevenue: partnerRev
    };
  }, [transactions, userProfile, partnerProfile]);

  const cardSummaries = useMemo(() => {
    return cards.map(card => {
      const cardTransactions = transactions.filter(tx => tx.cardId === card.id);
      const invoiceTotal = cardTransactions.reduce((sum, tx) => {
        return tx.type === TransactionType.EXPENSE ? sum + tx.amount : sum - tx.amount;
      }, 0);
      return {
        ...card,
        invoiceTotal
      };
    });
  }, [cards, transactions]);

  const createCouple = async () => {
    if (!auth.currentUser) return;
    const coupleRef = await addDoc(collection(db, 'couples'), {
      user1: auth.currentUser.uid,
      user2: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      coupleId: coupleRef.id
    });

    setUserProfile(prev => prev ? { ...prev, coupleId: coupleRef.id } : null);
  };

  const joinCouple = async (coupleId: string) => {
    if (!auth.currentUser) return;
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleDoc = await getDoc(coupleRef);
    
    if (!coupleDoc.exists()) throw new Error("Código de casal inválido.");
    
    const data = coupleDoc.data();
    if (data.user2) throw new Error("Este casal já está completo.");

    await updateDoc(coupleRef, {
      user2: auth.currentUser.uid,
      updatedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      coupleId: coupleId
    });

    setUserProfile(prev => prev ? { ...prev, coupleId } : null);
  };

  const sanitizeData = (data: any) => {
    const sanitized = { ...data };
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    return sanitized;
  };

  const addTransaction = async (data: Partial<Transaction>) => {
    if (!userProfile?.coupleId) {
      console.error("Tentativa de adicionar transação sem estar em um casal.");
      return;
    }
    
    const cleanData = sanitizeData(data);
    const frequency = cleanData.frequency || FrequencyType.ONCE;
    const totalInstallments = cleanData.installments || 1;
    const startIdx = (cleanData as any).startInstallmentIndex || 1;
    
    const count = frequency === FrequencyType.INSTALLMENTS 
      ? (totalInstallments - startIdx + 1) 
      : (frequency === FrequencyType.FIXED ? 12 : 1);

    try {
      const parentId = doc(collection(db, 'temp')).id;
      
      // Fix: Ensure date is treated as local noon to avoid timezone shift to previous day
      const baseDate = cleanData.date ? new Date(cleanData.date + 'T12:00:00') : new Date();

      for (let i = 0; i < count; i++) {
        const currentDate = addMonths(baseDate, i);
        const currentMonth = format(currentDate, 'yyyy-MM');
        const formattedDate = format(currentDate, 'yyyy-MM-dd');
        const currentIdx = frequency === FrequencyType.INSTALLMENTS ? startIdx + i : null;

        const txData: any = {
          description: frequency === FrequencyType.INSTALLMENTS 
            ? `${cleanData.description} (${currentIdx}/${totalInstallments})` 
            : cleanData.description,
          amount: parseFloat(cleanData.amount),
          type: cleanData.type,
          category: cleanData.category || 'Geral',
          responsibility: cleanData.responsibility || 'couple',
          date: formattedDate,
          month: currentMonth,
          frequency: frequency,
          ownerId: auth.currentUser?.uid,
          cardId: cleanData.cardId || null,
          parentId: (frequency === FrequencyType.INSTALLMENTS || frequency === FrequencyType.FIXED) ? parentId : null,
          installmentIndex: currentIdx,
          installments: frequency === FrequencyType.INSTALLMENTS ? totalInstallments : null,
          createdAt: serverTimestamp(),
        };

        if (cleanData.startInstallmentIndex) {
          txData.startInstallmentIndex = cleanData.startInstallmentIndex;
        }

        await addDoc(collection(db, 'couples', userProfile.coupleId, 'transactions'), txData);
      }
    } catch (err: any) {
      console.error("Erro ao adicionar transação:", err);
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/transactions`);
      throw err;
    }
  };

  const updateUserRevenue = async (revenue: number) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { revenue });
      setUserProfile(prev => prev ? { ...prev, revenue } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const finishOnboarding = async () => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { onboarded: true });
    setUserProfile(prev => prev ? { ...prev, onboarded: true } : null);
    localStorage.setItem('onboarded', 'true');
  };

  const toggleDarkMode = async () => {
    if (!auth.currentUser || !userProfile) return;
    const nextMode = !userProfile.darkMode;
    
    // Immediate local update
    localStorage.setItem('darkMode', String(nextMode));
    
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { darkMode: nextMode });
    setUserProfile(prev => prev ? { ...prev, darkMode: nextMode } : null);
  };

  const updateSubscription = async (isPremium: boolean) => {
    if (!auth.currentUser) return;
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { isPremium });
    setUserProfile(prev => prev ? { ...prev, isPremium } : null);
  };

  const updateProfileColors = async (colors: { userColor?: string; partnerColor?: string }) => {
    if (!auth.currentUser) return;
    const cleanColors = sanitizeData(colors);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      ...cleanColors,
      updatedAt: serverTimestamp()
    });
    setUserProfile(prev => prev ? { ...prev, ...cleanColors } : null);
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      const updateData: any = { 
        updatedAt: serverTimestamp() 
      };

      if (cleanData.description !== undefined) updateData.description = cleanData.description;
      if (cleanData.amount !== undefined) updateData.amount = parseFloat(cleanData.amount);
      if (cleanData.category !== undefined) updateData.category = cleanData.category;
      if (cleanData.responsibility !== undefined) updateData.responsibility = cleanData.responsibility;
      if (cleanData.cardId !== undefined) updateData.cardId = cleanData.cardId;
      if (cleanData.type !== undefined) updateData.type = cleanData.type;
      
      if (cleanData.date) {
        const dateObj = new Date(cleanData.date + 'T12:00:00');
        updateData.date = cleanData.date;
        updateData.month = format(dateObj, 'yyyy-MM');
      }

      await updateDoc(doc(db, 'couples', userProfile.coupleId, 'transactions', id), updateData);
    } catch (err: any) {
      console.error("Erro ao atualizar transação:", err);
      handleFirestoreError(err, OperationType.UPDATE, `couples/${userProfile.coupleId}/transactions/${id}`);
      throw err;
    }
  };

  const removeTransaction = async (id: string) => {
    if (!userProfile?.coupleId) {
      const msg = "Não foi possível remover: Identificador do casal não encontrado.";
      console.error(msg, { userProfile });
      throw new Error(msg);
    }
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'transactions', id));
    } catch (err: any) {
      console.error("Erro ao remover transação:", err);
      handleFirestoreError(err, OperationType.DELETE, `couples/${userProfile.coupleId}/transactions/${id}`);
      throw err;
    }
  };

  const addGoal = async (data: Partial<Goal>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await addDoc(collection(db, 'couples', userProfile.coupleId, 'goals'), {
        ...cleanData,
        coupleId: userProfile.coupleId,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/goals`);
    }
  };

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await updateDoc(doc(db, 'couples', userProfile.coupleId, 'goals', id), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `couples/${userProfile.coupleId}/goals/${id}`);
    }
  };

  const removeGoal = async (id: string) => {
    if (!userProfile?.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'goals', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `couples/${userProfile.coupleId}/goals/${id}`);
    }
  };

  const addCard = async (data: Partial<Card>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await addDoc(collection(db, 'couples', userProfile.coupleId, 'cards'), {
        ...cleanData,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/cards`);
    }
  };

  const updateCard = async (id: string, data: Partial<Card>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await updateDoc(doc(db, 'couples', userProfile.coupleId, 'cards', id), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `couples/${userProfile.coupleId}/cards/${id}`);
    }
  };

  const removeCard = async (id: string) => {
    if (!userProfile?.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'cards', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `couples/${userProfile.coupleId}/cards/${id}`);
    }
  };

  const addCategory = async (data: Partial<Category>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await addDoc(collection(db, 'couples', userProfile.coupleId, 'categories'), {
        ...cleanData,
        coupleId: userProfile.coupleId,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/categories`);
    }
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      const catRef = doc(db, 'couples', userProfile.coupleId, 'categories', id);
      const catSnap = await getDoc(catRef);
      const oldName = catSnap.exists() ? catSnap.data().name : null;

      await updateDoc(catRef, {
        ...cleanData,
        updatedAt: serverTimestamp()
      });

      // Se o nome mudou, atualizar todas as transações que usavam o nome antigo
      if (oldName && cleanData.name && cleanData.name !== oldName) {
        const txQuery = query(
          collection(db, 'couples', userProfile.coupleId, 'transactions'),
          where('category', '==', oldName)
        );
        const txSnaps = await getDocs(txQuery);
        
        if (!txSnaps.empty) {
          const batch = writeBatch(db);
          txSnaps.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { category: cleanData.name });
          });
          await batch.commit();
        }
      }
    } catch (err: any) {
      console.error("Erro ao atualizar categoria:", err);
      handleFirestoreError(err, OperationType.UPDATE, `couples/${userProfile.coupleId}/categories/${id}`);
      throw err;
    }
  };

  const removeCategory = async (id: string) => {
    if (!userProfile?.coupleId) return;
    try {
      const catRef = doc(db, 'couples', userProfile.coupleId, 'categories', id);
      const catSnap = await getDoc(catRef);
      const oldName = catSnap.exists() ? catSnap.data().name : null;

      await deleteDoc(catRef);

      // Se a categoria foi removida, atualizar transações para 'Outros'
      if (oldName) {
        const txQuery = query(
          collection(db, 'couples', userProfile.coupleId, 'transactions'),
          where('category', '==', oldName)
        );
        const txSnaps = await getDocs(txQuery);
        
        if (!txSnaps.empty) {
          const batch = writeBatch(db);
          txSnaps.docs.forEach(docSnap => {
            batch.update(docSnap.ref, { category: 'Outros' });
          });
          await batch.commit();
        }
      }
    } catch (err: any) {
      console.error("Erro ao remover categoria:", err);
      handleFirestoreError(err, OperationType.DELETE, `couples/${userProfile.coupleId}/categories/${id}`);
    }
  };

  const seedInitialCategories = async () => {
    if (!userProfile?.coupleId) return;
    
    const initialCategories = [
      { name: 'Supermercado', color: '#10b981' }, 
      { name: 'Restaurantes', color: '#ef4444' }, 
      { name: 'Transporte', color: '#3b82f6' }, 
      { name: 'Uber / 99', color: '#18181b' }, 
      { name: 'Aluguel / Casa', color: '#f59e0b' }, 
      { name: 'Luz / Energia', color: '#eab308' }, 
      { name: 'Água', color: '#06b6d4' }, 
      { name: 'Internet / TV', color: '#8b5cf6' }, 
      { name: 'Lazer', color: '#ec4899' }, 
      { name: 'Farmácia', color: '#f43f5e' }, 
      { name: 'Saúde', color: '#0ea5e9' }, 
      { name: 'Educação', color: '#6366f1' }, 
      { name: 'Shopping', color: '#d946ef' }, 
      { name: 'Assinaturas', color: '#64748b' }, 
      { name: 'Investimentos', color: '#22c55e' }, 
    ];

    try {
      const batch = writeBatch(db);
      initialCategories.forEach(cat => {
        const newDocRef = doc(collection(db, 'couples', userProfile.coupleId!, 'categories'));
        batch.set(newDocRef, {
          ...cat,
          coupleId: userProfile.coupleId,
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/categories/seed`);
    }
  };

  return (
    <FinanceContext.Provider value={{ 
      userProfile, 
      coupleProfile, 
      partnerProfile,
      transactions,
      allTransactions,
      goals,
      cards,
      categories,
      cardSummaries,
      loading,
      error,
      selectedMonth,
      setSelectedMonth,
      ratios,
      addTransaction,
      updateTransaction,
      removeTransaction,
      addGoal,
      updateGoal,
      removeGoal,
      addCard,
      updateCard,
      removeCard,
      addCategory,
      updateCategory,
      removeCategory,
      finishOnboarding,
      toggleDarkMode,
      updateSubscription,
      updateProfileColors,
      isFamilyPremium,
      seedInitialCategories,
      updateUserRevenue,
      createCouple,
      joinCouple
    }}>
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) throw new Error('useFinance must be used within a FinanceProvider');
  return context;
}
