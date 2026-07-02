'use client';

import React, { useState } from 'react';
import { useJastipStore, useActiveSession } from '@/store/useJastipStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Pencil, Check, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function SessionSelector() {
  const { sessions, activeSessionId, addSession, removeSession, renameSession, setActiveSession } =
    useJastipStore();
  const activeSession = useActiveSession();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    const name = newName.trim() || `JASTIP ${sessions.length + 1}`;
    addSession(name.toUpperCase());
    setNewName('');
    setIsAdding(false);
  };

  const handleRemove = (id: string, name: string) => {
    const session = sessions.find((s) => s.id === id);
    const totalItems = session?.customers.reduce((acc, c) => acc + c.items.length, 0) ?? 0;
    if (totalItems > 0) {
      if (
        !confirm(
          `Hapus sesi "${name}"? Sesi ini memiliki ${totalItems} item dari ${session?.customers.length} customer. Semua data akan hilang.`
        )
      )
        return;
    } else if (sessions.length > 1) {
      if (!confirm(`Hapus sesi "${name}"?`)) return;
    }
    removeSession(id);
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const confirmEdit = () => {
    if (editingId && editingName.trim()) {
      renameSession(editingId, editingName.trim().toUpperCase());
    }
    setEditingId(null);
  };

  const totalItemsInSession = (sessionId: string) => {
    const s = sessions.find((s) => s.id === sessionId);
    return s?.customers.reduce((acc, c) => acc + c.items.length, 0) ?? 0;
  };

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-primary/15 rounded-lg">
          <MapPin className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-bold text-primary uppercase tracking-wider">Sesi Jastip</span>
        <span className="text-xs text-muted-foreground ml-1">
          ({sessions.length} sesi tersimpan)
        </span>
      </div>

      {/* Session tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        {sessions.map((s) => (
          <div key={s.id} className="relative group">
            <AnimatePresence mode="wait">
              {editingId === s.id ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1"
                >
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmEdit();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="h-8 w-40 text-sm px-2 font-bold uppercase"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-green-600"
                    onClick={confirmEdit}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                </motion.div>
              ) : (
                <motion.button
                  key="display"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setActiveSession(s.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold
                    transition-all duration-200 border-2
                    ${
                      s.id === activeSessionId
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                        : 'bg-white/80 text-foreground border-border hover:border-primary/60 hover:bg-primary/5 hover:scale-102'
                    }
                  `}
                >
                  <span className="text-base">✈️</span>
                  <span>{s.name}</span>

                  {/* Item & customer count badge */}
                  <span
                    className={`
                    flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold
                    ${
                      s.id === activeSessionId
                        ? 'bg-white/25 text-white'
                        : 'bg-primary/10 text-primary'
                    }
                  `}
                  >
                    {s.customers.length} cust · {totalItemsInSession(s.id)} item
                  </span>

                  {/* Hover actions */}
                  <span
                    className={`items-center gap-0.5 ml-0.5 ${
                      s.id === activeSessionId ? 'flex' : 'hidden md:group-hover:flex'
                    }`}
                  >
                    <span
                      role="button"
                      aria-label="Rename sesi"
                      className="p-0.5 rounded hover:bg-white/20 opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(s.id, s.name);
                      }}
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </span>
                    {sessions.length > 1 && (
                      <span
                        role="button"
                        aria-label="Hapus sesi"
                        className="p-0.5 rounded hover:bg-red-500/30 opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(s.id, s.name);
                        }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Add Session */}
        <AnimatePresence>
          {isAdding ? (
            <motion.div
              key="adding"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-1"
            >
              <Input
                autoFocus
                placeholder="JASTIP PENANG..."
                value={newName}
                onChange={(e) => setNewName(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                className="h-8 w-44 text-sm px-2 font-bold uppercase"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleAdd}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setIsAdding(false)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          ) : (
            <motion.button
              key="add-btn"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Sesi
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Active session info bar */}
      <div className="mt-3 pt-3 border-t border-primary/15 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Sesi aktif:</span>
        <span className="text-xs font-bold text-primary">{activeSession.name}</span>
        <span className="text-xs text-muted-foreground">
          · {activeSession.customers.length} customer
          · {totalItemsInSession(activeSession.id)} total item
        </span>
      </div>
    </div>
  );
}
