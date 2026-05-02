import React from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Pencil, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface SwipeableItemProps {
  key?: React.Key;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void | Promise<void>;
  confirmDelete?: boolean;
  isDeleting?: boolean;
  className?: string;
  disabled?: boolean;
}

export function SwipeableItem({ 
  children, 
  onEdit, 
  onDelete, 
  confirmDelete = false,
  isDeleting = false,
  className,
  disabled = false
}: SwipeableItemProps) {
  const x = useMotionValue(0);
  
  // Indicators visibility
  const editOpacity = useTransform(x, [0, 80], [0, 1]);
  const deleteOpacity = useTransform(x, [-80, 0], [1, 0]);
  const editScale = useTransform(x, [0, 80], [0.5, 1]);
  const deleteScale = useTransform(x, [-80, 0], [1, 0.5]);

  const handleDragEnd = (_: any, info: any) => {
    if (disabled) return;
    if (info.offset.x > 100 && onEdit) {
      onEdit();
    } else if (info.offset.x < -100 && onDelete) {
      onDelete();
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl group", className)}>
      {/* Background Actions */}
      {!disabled && (
        <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
          <motion.div 
            style={{ opacity: editOpacity, scale: editScale }}
            className="flex items-center gap-2 text-emerald-600 font-black uppercase text-[10px] tracking-widest"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-600/20 flex items-center justify-center">
              <Pencil size={18} />
            </div>
            <span>Editar</span>
          </motion.div>

          <motion.div 
            style={{ opacity: deleteOpacity, scale: deleteScale }}
            className="flex items-center gap-2 text-rose-600 font-black uppercase text-[10px] tracking-widest"
          >
            <span>Excluir</span>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isDeleting ? "bg-rose-600 text-white" : "bg-rose-100 dark:bg-rose-600/20"
            )}>
              <Trash2 size={18} />
            </div>
          </motion.div>
        </div>
      )}

      {/* Foreground Content */}
      <motion.div
        drag={disabled ? false : "x"}
        dragConstraints={{ left: onDelete ? -120 : 0, right: onEdit ? 120 : 0 }}
        dragElastic={0.1}
        dragSnapToOrigin={true}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn("relative z-10", !disabled && "touch-pan-y")}
      >
        <div className="bg-white dark:bg-zinc-900/50">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
