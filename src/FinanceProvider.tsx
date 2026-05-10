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
import { Transaction, TransactionType, UserProfile, Couple, FrequencyType, Goal, Card, Category, BankAccount } from './types';
import { format, addMonths, parseISO } from 'date-fns';
import i18n from './i18n';

interface FinanceContextType {
  userProfile: UserProfile | null;
  coupleProfile: Couple | null;
  partnerProfile: UserProfile | null;
  transactions: Transaction[];
  allTransactions: Transaction[];
  goals: Goal[];
  cards: Card[];
  accounts: BankAccount[];
  categories: Category[];
  cardSummaries: (Card & { invoiceTotal: number; utilizedTotal: number })[];
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
  addAccount: (data: Partial<BankAccount>) => Promise<void>;
  updateAccount: (id: string, data: Partial<BankAccount>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addCategory: (data: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  seedInitialCategories: () => Promise<void>;
  updateUserRevenue: (revenue: number) => Promise<void>;
  updateLanguage: (lang: string) => Promise<void>;
  updateBirthDate: (date: string) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  updateSubscription: (isPremium: boolean) => Promise<void>;
  updateProfileColors: (colors: { userColor?: string; partnerColor?: string }) => Promise<void>;
  markTutorialAsSeen: (tutorialId: string) => Promise<void>;
  resetAccount: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  removeTransactionsByCard: (cardId: string, month: string) => Promise<void>;
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
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
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

  // Separate Effect for Auth and User Profile
  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      if (user) {
        setLoading(true);
        setError(null);
        
        // Listener do Perfil do Usuário
        unsubscribeUser = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
          if (docSnap.exists()) {
            const profile = { ...docSnap.data(), uid: user.uid } as UserProfile;
            setUserProfile(profile);
            
            // Apply language if it exists
            if (profile.language && i18n.language !== profile.language) {
              i18n.changeLanguage(profile.language);
            }
            
            // Persist dark mode in localStorage
            if (profile.darkMode !== undefined) {
              localStorage.setItem('darkMode', String(profile.darkMode));
            }

            // If no couple connection, we are not loading the rest
            // Only stop loading if we are sure there is no coupleId (from server snapshot)
            // or if it's a fresh creation.
            if (!profile.coupleId && !docSnap.metadata.fromCache) {
              setLoading(false);
            } else if (profile.coupleId) {
              // Ensure loading stays true while the second effect kicks in
              setLoading(true);
            }
          } else {
            // Primeiro acesso: Criar perfil - Usar merge: true para segurança
            try {
              const newProfile = {
                uid: user.uid,
                displayName: user.displayName || 'Usuário',
                email: user.email,
                photoURL: user.photoURL,
                revenue: 0,
                onboarded: false,
                isPremium: false,
                darkMode: false,
                tutorialsSeen: [],
                createdAt: serverTimestamp()
              };
              await setDoc(doc(db, 'users', user.uid), newProfile, { merge: true });
              // Snapshot triggers again
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
              setLoading(false);
            }
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          setLoading(false);
        });
      } else {
        // Logout
        setUserProfile(null);
        setCoupleProfile(null);
        setPartnerProfile(null);
        setTransactions([]);
        setAllTransactions([]);
        setGoals([]);
        setCards([]);
        setAccounts([]);
        setCategories([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  // Separate Effect for Couple and shared data - Depend exclusively on coupleId and selectedMonth
  useEffect(() => {
    if (!userProfile?.coupleId) {
      // If we have a profile but no coupleId, and it was from the server, 
      // we ensure loading is false.
      return;
    }

    // Active connection found: keep loading true until everything is ready
    setLoading(true);

    let unsubscribeCouple: (() => void) | null = null;
    let unsubscribePartner: (() => void) | null = null;
    let unsubscribeTransactions: (() => void) | null = null;
    let unsubscribeAllTransactions: (() => void) | null = null;
    let unsubscribeGoals: (() => void) | null = null;
    let unsubscribeCards: (() => void) | null = null;
    let unsubscribeAccounts: (() => void) | null = null;
    let unsubscribeCategories: (() => void) | null = null;

    const coupleId = userProfile.coupleId;

    // Listener do Casal
    unsubscribeCouple = onSnapshot(doc(db, 'couples', coupleId), (coupleDoc) => {
      if (coupleDoc.exists()) {
        const coupleData = { ...coupleDoc.data(), id: coupleDoc.id } as Couple;
        setCoupleProfile(coupleData);
        
        const partnerId = coupleData.user1 === userProfile.uid ? coupleData.user2 : coupleData.user1;
        
        if (partnerId) {
          if (unsubscribePartner) unsubscribePartner();
          unsubscribePartner = onSnapshot(doc(db, 'users', partnerId), (pDoc) => {
            if (pDoc.exists()) {
              setPartnerProfile({ ...pDoc.data(), uid: partnerId } as UserProfile);
            } else {
              setPartnerProfile(null);
            }
          }, (err) => {
            console.warn("Partner profile access denied:", err.message);
          });
        } else {
          setPartnerProfile(null);
        }
      } else {
        setCoupleProfile(null);
        setPartnerProfile(null);
      }
    }, (err) => {
      console.warn("Couple access denied:", err.message);
    });

    // Listener das Transações (respeitando o mês selecionado)
    const txQuery = query(
      collection(db, 'couples', coupleId, 'transactions'),
      where('month', '==', selectedMonth)
    );
    unsubscribeTransactions = onSnapshot(txQuery, (snapshot) => {
      setTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Transaction[]);
    }, (err) => {
      console.warn("Transactions access denied:", err.message);
    });

    // Listener de TODAS as Transações (para resumos históricos)
    const allTxQuery = collection(db, 'couples', coupleId, 'transactions');
    unsubscribeAllTransactions = onSnapshot(allTxQuery, (snapshot) => {
      setAllTransactions(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Transaction[]);
    }, (err) => {
      console.warn("All transactions access denied:", err.message);
    });

    // Listener das Metas
    unsubscribeGoals = onSnapshot(collection(db, 'couples', coupleId, 'goals'), (snapshot) => {
      setGoals(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Goal[]);
    }, (err) => {
      console.warn("Goals access denied:", err.message);
    });

    // Listener de Cartões
    unsubscribeCards = onSnapshot(collection(db, 'couples', coupleId, 'cards'), (snapshot) => {
      setCards(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Card[]);
    }, (err) => {
      console.warn("Cards access denied:", err.message);
    });

    // Listener de Contas Bancárias
    unsubscribeAccounts = onSnapshot(collection(db, 'couples', coupleId, 'accounts'), (snapshot) => {
      setAccounts(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as BankAccount[]);
    }, (err) => {
      console.warn("Accounts access denied:", err.message);
    });

    // Listener de Categorias
    unsubscribeCategories = onSnapshot(collection(db, 'couples', coupleId, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
      setLoading(false); // Definitive loaded state
    }, (err) => {
      console.warn("Categories access denied:", err.message);
      setLoading(false);
    });

    return () => {
      if (unsubscribeCouple) unsubscribeCouple();
      if (unsubscribePartner) unsubscribePartner();
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeAllTransactions) unsubscribeAllTransactions();
      if (unsubscribeGoals) unsubscribeGoals();
      if (unsubscribeCards) unsubscribeCards();
      if (unsubscribeAccounts) unsubscribeAccounts();
      if (unsubscribeCategories) unsubscribeCategories();
    };
  }, [userProfile?.coupleId, selectedMonth, userProfile?.uid]);

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
      // Monthly invoice
      const monthlyTransactions = transactions.filter(tx => tx.cardId === card.id);
      const invoiceTotal = monthlyTransactions.reduce((sum, tx) => {
        return tx.type === TransactionType.EXPENSE ? sum + tx.amount : sum - tx.amount;
      }, 0);

      // Total utilized (all time)
      const allCardTransactions = allTransactions.filter(tx => tx.cardId === card.id);
      const utilizedTotal = allCardTransactions.reduce((sum, tx) => {
        return tx.type === TransactionType.EXPENSE ? sum + tx.amount : sum - tx.amount;
      }, 0);

      return {
        ...card,
        invoiceTotal,
        utilizedTotal
      };
    });
  }, [cards, transactions, allTransactions]);

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
      const batch = writeBatch(db);
      
      // Fix: Ensure date is treated as local noon to avoid timezone shift to previous day
      const baseDate = cleanData.date ? new Date(cleanData.date + 'T12:00:00') : new Date();

      for (let i = 0; i < count; i++) {
        // Create a new date object for each installment index
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

        const newDocRef = doc(collection(db, 'couples', userProfile.coupleId, 'transactions'));
        batch.set(newDocRef, txData);
      }

      await batch.commit();
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

  const updateLanguage = async (language: string) => {
    if (!auth.currentUser) return;
    try {
      await i18n.changeLanguage(language);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
        language,
        updatedAt: serverTimestamp()
      });
      setUserProfile(prev => prev ? { ...prev, language } : null);
    } catch (error) {
      console.error("Erro ao mudar idioma:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/language`);
    }
  };

  const updateBirthDate = async (birthDate: string) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
        birthDate,
        updatedAt: serverTimestamp()
      });
      setUserProfile(prev => prev ? { ...prev, birthDate } : null);
    } catch (error) {
      console.error("Erro ao atualizar data de nascimento:", error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}/birthDate`);
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

  const markTutorialAsSeen = async (tutorialId: string) => {
    if (!auth.currentUser || !userProfile) return;
    
    // Evitar duplicados
    if (userProfile.tutorialsSeen?.includes(tutorialId)) return;
    
    const newTutorials = [...(userProfile.tutorialsSeen || []), tutorialId];
    
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      tutorialsSeen: newTutorials,
      updatedAt: serverTimestamp()
    });
    
    setUserProfile(prev => prev ? { ...prev, tutorialsSeen: newTutorials } : null);
  };

  const resetAccount = async () => {
    if (!auth.currentUser || !userProfile) return;
    const coupleId = userProfile.coupleId;

    try {
      // 1. Limpar dados do casal se existir (FAZER ANTES DE DESVINCULAR PARA MANTER PERMISSÕES)
      if (coupleId) {
        const collections = ['transactions', 'goals', 'cards', 'accounts', 'categories'];
        
        for (const collName of collections) {
          const collRef = collection(db, 'couples', coupleId, collName);
          const snapshot = await getDocs(collRef);
          
          let i = 0;
          let batch = writeBatch(db);
          for (const d of snapshot.docs) {
            batch.delete(d.ref);
            i++;
            if (i === 400) {
              await batch.commit();
              batch = writeBatch(db);
              i = 0;
            }
          }
          if (i > 0) await batch.commit();
        }

        // Deletar o documento do casal
        await deleteDoc(doc(db, 'couples', coupleId));
      }

      // 2. Desvincular e resetar perfil do usuário
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        coupleId: null,
        onboarded: false,
        tutorialsSeen: [],
        revenue: 0,
        updatedAt: serverTimestamp()
      });

      // Atualizar estado local
      setUserProfile(prev => prev ? { 
        ...prev, 
        coupleId: null, 
        onboarded: false, 
        tutorialsSeen: [], 
        revenue: 0 
      } : null);
      setCoupleProfile(null);
      setPartnerProfile(null);
      setTransactions([]);
      setAllTransactions([]);
      setGoals([]);
      setCards([]);
      setAccounts([]);
      setCategories([]);

      // Limpar localStorage
      localStorage.removeItem('onboarded');
      
    } catch (err: any) {
      console.error("Erro ao resetar conta:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${auth.currentUser.uid}/reset`);
      throw err;
    }
  };

  const deleteAccount = async () => {
    if (!auth.currentUser || !userProfile) return;
    const uid = auth.currentUser.uid;

    try {
      // 1. Primeiro resetamos a conta (limpa casal, metas, transações, etc)
      await resetAccount();

      // 2. Deletamos o documento do usuário
      await deleteDoc(doc(db, 'users', uid));

      // 3. Deletamos a autenticação (isso requer login recente, o que deve ser garantido pelo modal de senha no frontend)
      await auth.currentUser.delete();
      
    } catch (err: any) {
      console.error("Erro ao excluir conta:", err);
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}/delete`);
      throw err;
    }
  };

  const removeTransactionsByCard = async (cardId: string, month: string) => {
    if (!userProfile?.coupleId) return;
    try {
      const q = query(
        collection(db, 'couples', userProfile.coupleId, 'transactions'),
        where('cardId', '==', cardId),
        where('month', '==', month)
      );
      const snapshot = await getDocs(q);
      
      let i = 0;
      let batch = writeBatch(db);
      for (const d of snapshot.docs) {
        batch.delete(d.ref);
        i++;
        if (i === 400) {
          await batch.commit();
          batch = writeBatch(db);
          i = 0;
        }
      }
      if (i > 0) await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `couples/${userProfile.coupleId}/transactions/clear-card-${cardId}-${month}`);
      throw error;
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      const txRef = doc(db, 'couples', userProfile.coupleId, 'transactions', id);
      const txSnap = await getDoc(txRef);
      
      if (!txSnap.exists()) throw new Error("Transação não encontrada.");
      const oldData = txSnap.data() as Transaction;
      
      const updateData: any = { 
        updatedAt: serverTimestamp() 
      };

      if (cleanData.description !== undefined) updateData.description = cleanData.description;
      if (cleanData.amount !== undefined) updateData.amount = parseFloat(cleanData.amount);
      if (cleanData.category !== undefined) updateData.category = cleanData.category;
      if (cleanData.responsibility !== undefined) updateData.responsibility = cleanData.responsibility;
      if (cleanData.cardId !== undefined) updateData.cardId = cleanData.cardId;
      if (cleanData.type !== undefined) updateData.type = cleanData.type;
      if (cleanData.isPaid !== undefined) updateData.isPaid = cleanData.isPaid;
      
      if (cleanData.date) {
        const dateObj = new Date(cleanData.date + 'T12:00:00');
        updateData.date = cleanData.date;
        updateData.month = format(dateObj, 'yyyy-MM');
      }

      // Se for installments e mudou algo comum ou o total de parcelas
      if (oldData.parentId && oldData.frequency === FrequencyType.INSTALLMENTS) {
        const batch = writeBatch(db);
        const q = query(
          collection(db, 'couples', userProfile.coupleId, 'transactions'),
          where('parentId', '==', oldData.parentId)
        );
        const snapshot = await getDocs(q);
        
        const oldTotal = oldData.installments || 1;
        const newTotal = cleanData.installments !== undefined ? cleanData.installments : oldTotal;

        // Base description to avoid "(1/2) (1/4)" issues
        const baseDescription = (cleanData.description || oldData.description).replace(/\s*\(\d+\/\d+\)$/, '');

        // Atualizar todos os existentes
        snapshot.docs.forEach(d => {
          const dData = d.data() as Transaction;
          const isTarget = d.id === id;
          
          // Create a NEW update object for each doc to avoid pointer issues
          const currentIdx = dData.installmentIndex || 1;
          const dUpdate: any = { 
            ...updateData,
            installments: newTotal,
            description: `${baseDescription} (${currentIdx}/${newTotal})`,
            updatedAt: serverTimestamp()
          };
          
          // Only update date/month for the actual document being edited
          // We don't want to move ALL installments to the same day
          if (!isTarget) {
            delete dUpdate.date;
            delete dUpdate.month;
            delete dUpdate.isPaid;
          }

          batch.update(d.ref, dUpdate);
        });

        // Se aumentou o número de parcelas, criar as novas SEM REPETIR existentes
        if (newTotal > oldTotal) {
          const snapshotDocs = snapshot.docs;
          const existingIndices = new Set(snapshotDocs.map(d => (d.data() as Transaction).installmentIndex));
          const lastExistingIdx = Math.max(...snapshotDocs.map(d => (d.data() as Transaction).installmentIndex || 0));
          
          // Encontrar a parcela 1 para calcular as datas das novas
          const firstInstallment = snapshotDocs.find(d => (d.data() as Transaction).installmentIndex === 1)?.data() as Transaction 
                                   || snapshotDocs[0].data() as Transaction;
          
          const baseDateForCalculation = new Date(firstInstallment.date + 'T12:00:00');
          const firstDate = addMonths(baseDateForCalculation, -( (firstInstallment.installmentIndex || 1) - 1 ));

          for (let i = lastExistingIdx + 1; i <= newTotal; i++) {
            // Safety: Skip if by some chance it already exists
            if (existingIndices.has(i)) continue;

            const currentDate = addMonths(firstDate, i - 1);
            const currentMonth = format(currentDate, 'yyyy-MM');
            const formattedDate = format(currentDate, 'yyyy-MM-dd');

            const newTxData: any = {
              description: `${baseDescription} (${i}/${newTotal})`,
              amount: cleanData.amount !== undefined ? parseFloat(cleanData.amount) : oldData.amount,
              type: cleanData.type || oldData.type,
              category: cleanData.category || oldData.category,
              responsibility: cleanData.responsibility || oldData.responsibility,
              date: formattedDate,
              month: currentMonth,
              frequency: FrequencyType.INSTALLMENTS,
              ownerId: auth.currentUser?.uid,
              cardId: cleanData.cardId !== undefined ? cleanData.cardId : oldData.cardId,
              parentId: oldData.parentId,
              installmentIndex: i,
              installments: newTotal,
              createdAt: serverTimestamp(),
            };
            
            const newDocRef = doc(collection(db, 'couples', userProfile.coupleId, 'transactions'));
            batch.set(newDocRef, newTxData);
          }
        }
        
        await batch.commit();
      } else {
        await updateDoc(txRef, updateData);
      }
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

  const addAccount = async (data: Partial<BankAccount>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await addDoc(collection(db, 'couples', userProfile.coupleId, 'accounts'), {
        ...cleanData,
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, `couples/${userProfile.coupleId}/accounts`);
    }
  };

  const updateAccount = async (id: string, data: Partial<BankAccount>) => {
    if (!userProfile?.coupleId) return;
    try {
      const cleanData = sanitizeData(data);
      await updateDoc(doc(db, 'couples', userProfile.coupleId, 'accounts', id), {
        ...cleanData,
        updatedAt: serverTimestamp()
      });
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `couples/${userProfile.coupleId}/accounts/${id}`);
    }
  };

  const removeAccount = async (id: string) => {
    if (!userProfile?.coupleId) return;
    try {
      await deleteDoc(doc(db, 'couples', userProfile.coupleId, 'accounts', id));
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `couples/${userProfile.coupleId}/accounts/${id}`);
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
      accounts,
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
      addAccount,
      updateAccount,
      removeAccount,
      addCategory,
      updateCategory,
      removeCategory,
      finishOnboarding,
      toggleDarkMode,
      updateSubscription,
      updateProfileColors,
      updateLanguage,
      updateBirthDate,
      markTutorialAsSeen,
      resetAccount,
      deleteAccount,
      removeTransactionsByCard,
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
