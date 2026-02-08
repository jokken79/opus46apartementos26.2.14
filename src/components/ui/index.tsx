/**
 * Componentes UI compartidos — GlassCard, StatCard, Modal, NavButton
 * Extraídos de App.tsx para reducir tamaño del archivo principal
 */

import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export const GlassCard = ({ children, className = "", hoverEffect = true }: { children: React.ReactNode; className?: string; hoverEffect?: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl ${hoverEffect ? 'transition-all duration-300 hover:border-blue-500/30 hover:bg-[#20242c] hover:shadow-blue-900/10 hover:-translate-y-1' : ''} ${className}`}>
    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
    {children}
  </div>
);

export const StatCard = ({ title, value, subtext, icon: Icon, trend }: { title: string; value: string; subtext: string; icon: React.ComponentType<{ className?: string }>; trend?: 'up' | 'down' }) => (
  <GlassCard hoverEffect={true} className="p-5">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2.5 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-white/5 shadow-inner"><Icon className="text-blue-400 w-5 h-5" /></div>
      {trend && <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${trend === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>{trend === 'up' ? '▲' : '▼'}</span>}
    </div>
    <div className="space-y-1">
      <h3 className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">{title}</h3>
      <div className="text-3xl font-black text-white tracking-tight leading-none">{value}</div>
      <div className="text-xs text-gray-500 font-medium">{subtext}</div>
    </div>
  </GlassCard>
);

export const Modal = ({ isOpen, onClose, title, children, wide = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={`bg-[#15171c] border border-blue-500/20 rounded-2xl w-full ${wide ? 'max-w-5xl' : 'max-w-3xl'} shadow-2xl relative max-h-[90vh] overflow-y-auto ring-1 ring-white/10 animate-in zoom-in-95 duration-300`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-800/50 sticky top-0 bg-[#15171c]/95 backdrop-blur z-20">
          <h3 id="modal-title" className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>{title}
          </h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-white transition bg-gray-900/50 p-2 rounded-full hover:bg-gray-800 border border-transparent hover:border-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 md:p-8 space-y-6">{children}</div>
      </div>
    </div>
  );
};

export const NavButton = ({ icon: Icon, active, onClick, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`relative group w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}>
    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">{label}</span>
  </button>
);

export const NavButtonMobile = ({ icon: Icon, active, onClick, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${active ? 'text-blue-400' : 'text-gray-500'}`}>
    <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);
