import React, { useState, useEffect } from 'react';
import { useFinance } from '../FinanceProvider';
import { Card, Button, Input } from '../components/ui';
import { 
  Tag, 
  Plus, 
  Trash2, 
  Pencil,
  X, 
  Check,
  Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Category } from '../types';
import { getCategoryIcon, ALL_ICONS } from '../lib/category-icons';
import { PageTutorial } from '../components/PageTutorial';

import { SwipeableItem } from '../components/SwipeableItem';

const CATEGORY_COLORS = [
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#ec4899', // pink-500
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#84cc16', // lime-500
  '#71717a', // zinc-500
  '#18181b', // zinc-950
];

export function CategoriesView() {
  const { categories, addCategory, updateCategory, removeCategory, seedInitialCategories } = useFinance();

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const data = { name, color, iconName: selectedIcon || null };
      if (editingId) {
        await updateCategory(editingId, data);
      } else {
        await addCategory(data);
      }
      closeModal();
    } catch (err) {
      console.error("Erro ao salvar categoria:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (cat: Category) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColor(cat.color);
    setSelectedIcon(cat.iconName || null);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setName('');
    setColor(CATEGORY_COLORS[0]);
    setSelectedIcon(null);
  };

  return (
    <div className="flex flex-col gap-8 pb-32">
      <PageTutorial 
        pageId="categories"
        steps={[
          { element: '#category-header', popover: { title: 'Categorias', description: 'Organize suas despesas criando categorias personalizadas. Nossa IA sugere ícones automaticamente!' } },
          { element: '#category-grid', popover: { title: 'Sua Lista', description: 'Clique para editar ou deslize para remover suas categorias.' } },
        ]}
      />
      <div id="category-header" className="flex items-center justify-between">
        <h2 className="text-2xl font-black uppercase tracking-tighter text-zinc-900 dark:text-white">Categorias</h2>
        <Button onClick={() => setShowAddModal(true)} variant="primary" className="gap-2">
          <Plus size={18} />
          <span>Nova</span>
        </Button>
      </div>

      <div id="category-grid" className="grid grid-cols-1 gap-4">
        {categories.length === 0 && (
          <Card className="p-12 border-dashed border-2 flex flex-col items-center gap-4 text-center bg-zinc-50 dark:bg-zinc-900/30 border-zinc-200 dark:border-zinc-800">
            <Tag className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            <div>
               <p className="text-zinc-900 dark:text-white font-bold">Nenhuma categoria criada</p>
               <p className="text-zinc-500 dark:text-zinc-400 text-sm">Crie categorias personalizadas ou comece com nossas sugestões.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => setShowAddModal(true)}>Criar Manualmente</Button>
              <Button className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900" onClick={() => seedInitialCategories()}>Gerar 15 Categorias Sugeridas</Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {categories.map((cat) => (
              <SwipeableItem
                key={cat.id}
                onEdit={() => openEdit(cat)}
                onDelete={() => removeCategory(cat.id)}
                className="w-full"
                disabled={isDesktop}
              >
                <Card className="flex items-center justify-between group bg-white dark:bg-zinc-900/50 border border-zinc-200/50 ring-1 ring-zinc-200/20 dark:ring-zinc-800 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] overflow-hidden">
                  <div className="flex-1 p-4 flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/10 dark:shadow-black/40"
                      style={{ backgroundColor: cat.color }}
                    >
                      {(() => {
                        const Icon = getCategoryIcon(cat.name, cat.iconName);
                        return <Icon size={18} />;
                      })()}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-white">{cat.name}</h4>
                      <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">{cat.color}</p>
                    </div>
                  </div>

                  {/* Desktop Actions for Category */}
                  {isDesktop && (
                    <div className="flex items-center gap-2 pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => openEdit(cat)}
                        className="w-9 h-9 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeCategory(cat.id)}
                        className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-600 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  )}
                </Card>
              </SwipeableItem>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Default System Categories (Read-only reference or message) */}
      {categories.length > 0 && (
        <div className="p-6 bg-zinc-100 dark:bg-zinc-900/50 rounded-3xl border dark:border-zinc-800">
           <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 text-center">Dica</p>
           <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center leading-relaxed">
             Suas categorias personalizadas aparecem automaticamente ao cadastrar novas transações ou importar faturas.
           </p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={closeModal}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-lg bg-white rounded-[32px] p-6 z-[101] flex flex-col gap-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-black">{editingId ? 'Editar Categoria' : 'Nova Categoria'}</h2>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Nome e Ícone da Categoria</span>
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div 
                      className="w-16 h-16 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/10 dark:shadow-black/40 transition-all duration-300"
                      style={{ backgroundColor: color }}
                    >
                      {(() => {
                        const Icon = getCategoryIcon(name, selectedIcon || undefined);
                        const isTag = Icon === getCategoryIcon('');
                        const isMatched = name.trim().length > 0 && !isTag;
                        
                        return (
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={selectedIcon || (isMatched ? 'matched' : (name ? 'typing' : 'empty'))}
                              initial={{ scale: 0.5, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0.5, opacity: 0 }}
                              className="relative flex items-center justify-center"
                            >
                              <Icon size={24} />
                              {isMatched && !selectedIcon && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white rounded-full flex items-center justify-center shadow-sm"
                                >
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                                </motion.div>
                              )}
                            </motion.div>
                          </AnimatePresence>
                        );
                      })()}
                    </div>
                    <Input 
                      placeholder="Ex: Mercado, Assinaturas..." 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="h-16 flex-1 w-full text-lg font-bold shadow-sm border-2 focus:border-zinc-900 transition-colors"
                      required 
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[10px] text-zinc-400 italic">
                      {selectedIcon ? 'Ícone selecionado manualmente' : 'O ícone mudará conforme você digita!'}
                    </p>
                    {name && !selectedIcon && (
                      <span className="text-[9px] font-black uppercase text-zinc-300">
                        {getCategoryIcon(name) === getCategoryIcon('') ? 'Sem correspondência' : 'Ícone sugerido'}
                      </span>
                    )}
                    {selectedIcon && (
                      <button 
                        type="button" 
                        onClick={() => setSelectedIcon(null)}
                        className="text-[9px] font-black uppercase text-orange-500 hover:orange-600 underline"
                      >
                        Resetar para Automático
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Escolha um Ícone (Opcional)</span>
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 p-4 max-h-48 overflow-y-auto bg-zinc-50 rounded-2xl border border-zinc-100">
                    {Object.entries(ALL_ICONS).map(([iconKey, IconComponent]) => (
                      <button
                        key={iconKey}
                        type="button"
                        onClick={() => setSelectedIcon(iconKey)}
                        className={cn(
                          "aspect-square rounded-xl flex items-center justify-center transition-all",
                          selectedIcon === iconKey 
                            ? "bg-zinc-900 text-white shadow-lg scale-110" 
                            : "bg-white text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 border border-zinc-100 shadow-sm transition-transform active:scale-90"
                        )}
                      >
                        <IconComponent size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                   <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-1">Selecione uma Cor</span>
                   <div className="flex flex-wrap gap-3 p-1">
                     {CATEGORY_COLORS.map(c => (
                       <button
                         key={c}
                         type="button"
                         onClick={() => setColor(c)}
                         className={cn(
                           "w-10 h-10 rounded-full transition-all relative overflow-hidden group border-2",
                           color === c ? "border-zinc-900 scale-110 shadow-md ring-4 ring-zinc-100" : "border-white hover:scale-110"
                         )}
                         style={{ backgroundColor: c }}
                       >
                         {color === c && (
                           <div className="absolute inset-0 flex items-center justify-center text-white">
                             <Check size={16} strokeWidth={4} />
                           </div>
                         )}
                       </button>
                     ))}
                   </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={closeModal}
                    className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-zinc-400"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-[2] bg-orange-600 text-white h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 dark:shadow-none">
                    {isSubmitting ? 'Salvando...' : (editingId ? 'Salvar' : 'Criar')}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
