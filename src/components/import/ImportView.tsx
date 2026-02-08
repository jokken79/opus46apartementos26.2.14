/**
 * COMPONENTE: ImportView
 * Vista de importación Excel — drag & drop, previsualización, sincronización
 */

import React from 'react';
import {
  UploadCloud, FileCheck, AlertCircle, Loader2, Database, ArrowRight
} from 'lucide-react';
import { GlassCard } from '../ui';

interface ImportViewProps {
  isDragging: boolean;
  importStatus: { type: string; msg: string };
  previewSummary: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}

export const ImportView = ({ isDragging, importStatus, previewSummary, onDragOver, onDragLeave, onDrop, onFileChange, onSave }: ImportViewProps) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
    <div className="flex flex-col items-center justify-center py-10">
      <h2 className="text-3xl font-black text-white mb-2">Centro de Sincronización</h2>
      <p className="text-gray-500 max-w-md text-center">Importa la 社員台帳 (maestro empleados) o archivos de gestión de renta.</p>
    </div>
    <GlassCard className="p-10 text-center border-dashed border-2 border-gray-700 bg-transparent relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
      <input type="file" id="fileUpload" className="hidden" onChange={onFileChange} accept=".xlsx, .xlsm" />
      <label htmlFor="fileUpload" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`flex flex-col items-center justify-center h-64 cursor-pointer transition-all duration-300 rounded-2xl relative z-10 ${isDragging ? 'scale-105' : ''}`}>
        {importStatus.type === 'loading' ? (
          <div className="animate-pulse flex flex-col items-center gap-4"><Loader2 className="w-20 h-20 text-blue-500 animate-spin" /><p className="text-blue-500 font-bold text-2xl">Procesando...</p></div>
        ) : importStatus.type === 'success' ? (
          <div className="flex flex-col items-center gap-4"><div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]"><FileCheck className="w-12 h-12 text-green-400" /></div><p className="text-green-400 font-bold text-3xl">Archivo Validado</p><p className="text-gray-400 text-lg">Listo para sincronizar</p></div>
        ) : (
          <div className="flex flex-col items-center gap-6 group">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 shadow-2xl border border-white/5"><UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" /></div>
            <div><p className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Arrastra tu Excel aquí</p><p className="text-sm text-gray-500">社員台帳 (.xlsx / .xlsm)</p></div>
          </div>
        )}
      </label>
    </GlassCard>
    {importStatus.type === 'error' && <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-2xl text-red-200 flex items-center gap-4 animate-in fade-in shadow-lg"><AlertCircle className="w-6 h-6 shrink-0" /><span className="text-lg font-medium">{importStatus.msg}</span></div>}
    {importStatus.type === 'success' && (
      <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-8 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="flex items-start gap-6">
          <div className="bg-green-500/20 p-4 rounded-xl"><Database className="w-8 h-8 text-green-500" /></div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-3">Confirmación</h3>
            <div className="bg-black/50 p-6 rounded-xl border border-white/5 mb-8"><pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{String(previewSummary)}</pre></div>
            <button onClick={onSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all text-lg"><span>Ejecutar Sincronización</span><ArrowRight className="w-6 h-6" /></button>
          </div>
        </div>
      </div>
    )}
  </div>
);
