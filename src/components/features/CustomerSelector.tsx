'use client';

import React, { useState } from 'react';
import { useJastipStore } from '@/store/useJastipStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, User, Pencil, Check } from 'lucide-react';

export function CustomerSelector() {
  const { customers, activeCustomerId, addCustomer, removeCustomer, renameCustomer, setActiveCustomer } = useJastipStore();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    const name = newName.trim() || `Customer ${customers.length + 1}`;
    addCustomer(name);
    setNewName('');
    setIsAdding(false);
  };

  const handleRemove = (id: string, name: string) => {
    const customer = customers.find(c => c.id === id);
    const hasItems = customer && customer.items.length > 0;
    if (hasItems) {
      if (!confirm(`Hapus "${name}" beserta ${customer.items.length} item-nya?`)) return;
    }
    removeCustomer(id);
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const confirmEdit = () => {
    if (editingId && editingName.trim()) {
      renameCustomer(editingId, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="bg-card border rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Customer</span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {customers.map((c) => (
          <div key={c.id} className="relative group">
            {editingId === c.id ? (
              <div className="flex items-center gap-1">
                <Input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditingId(null); }}
                  className="h-8 w-32 text-sm px-2"
                />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={confirmEdit}>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setActiveCustomer(c.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                  transition-all duration-200 border
                  ${c.id === activeCustomerId
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-105'
                    : 'bg-muted/50 text-foreground border-border hover:border-primary/50 hover:bg-primary/5'}
                `}
              >
                <span>{c.name}</span>
                {c.items.length > 0 && (
                  <span className={`
                    text-[10px] px-1.5 py-0.5 rounded-full font-bold
                    ${c.id === activeCustomerId ? 'bg-white/20' : 'bg-primary/10 text-primary'}
                  `}>
                    {c.items.length}
                  </span>
                )}

                {/* Hover / Active actions (Fixed for iOS Touch via active state) */}
                <span className={`items-center gap-0.5 ml-1 ${
                  c.id === activeCustomerId ? 'flex' : 'hidden md:group-hover:flex'
                }`}>
                  <span
                    role="button"
                    className="p-0.5 rounded hover:bg-white/20 opacity-70 hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); startEdit(c.id, c.name); }}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                  </span>
                  {customers.length > 1 && (
                    <span
                      role="button"
                      className="p-0.5 rounded hover:bg-red-500/20 opacity-70 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleRemove(c.id, c.name); }}
                    >
                      <X className="w-2.5 h-2.5" />
                    </span>
                  )}
                </span>
              </button>
            )}
          </div>
        ))}

        {/* Add Customer */}
        {isAdding ? (
          <div className="flex items-center gap-1">
            <Input
              autoFocus
              placeholder="Nama customer..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
              className="h-8 w-36 text-sm px-2"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={handleAdd}>
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsAdding(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold border border-dashed border-primary/40 text-primary/70 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Customer
          </button>
        )}
      </div>
    </div>
  );
}
