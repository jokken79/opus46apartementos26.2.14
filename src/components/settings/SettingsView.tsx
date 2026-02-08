/**
 * COMPONENTE: SettingsView
 * Vista de configuración del sistema — ciclo de facturación, limpieza, backup
 */

import React, { useState } from 'react';
import {
  MapPin, Phone, Mail, Award, Clock, Save, Trash2, Database,
  Download, Upload, UploadCloud, Settings
} from 'lucide-react';
import { GlassCard } from '../ui';
import type { AppDatabase, AppConfig } from '../../types/database';

const COMPANY_INFO = {
  name_ja: "ユニバーサル企画株式会社", name_en: "UNS-KIKAKU",
  postal_code: "461-0025", full_address: "愛知県名古屋市東区徳川2-18-18",
  phone: "052-938-8840", mobile: "080-7376-1988",
  email: "infoapp@uns-kikaku.com", representative: "中山 雅和",
  licenses: [
    { name: "労働者派遣事業", number: "派 23-303669" },
    { name: "登録支援機関", number: "21登-006367" },
    { name: "古物商許可証", number: "愛知県公安委員会 第541032001..." }
  ],
  logo_url: "https://uns-kikaku.com/wp-content/uploads/2024/02/rogo-300x123.png"
};

const INITIAL_CONFIG: AppConfig = { companyName: 'UNS-KIKAKU', closingDay: 0, defaultCleaningFee: 30000 };

interface SettingsViewProps {
  db: AppDatabase;
  setDb: (db: AppDatabase) => void;
  onDownloadBackup: () => void;
  onRestoreBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export const SettingsView = ({ db, setDb, onDownloadBackup, onRestoreBackup, onReset }: SettingsViewProps) => {
  const [localConfig, setLocalConfig] = useState(db.config || INITIAL_CONFIG);
  const handleSaveConfig = () => { setDb({ ...db, config: localConfig }); alert('Configuración guardada.'); };
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-[#1a1d24] to-[#0f0f12] p-8 rounded-3xl border border-white/5 shadow-2xl">
        <div className="bg-white p-4 rounded-xl shadow-lg"><img src={COMPANY_INFO.logo_url} alt="UNS" className="h-12 object-contain" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://via.placeholder.com/150x60?text=UNS"; }} /></div>
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-black text-white">{COMPANY_INFO.name_ja}</h2>
          <p className="text-blue-400 font-bold tracking-widest text-sm">{COMPANY_INFO.name_en}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-400 justify-center md:justify-start">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {COMPANY_INFO.full_address}</span>
            <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {COMPANY_INFO.phone}</span>
            <span className="flex items-center gap-1"><Mail className="w-3 h-3"/> {COMPANY_INFO.email}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COMPANY_INFO.licenses.map((lic, idx) => (
          <div key={idx} className="bg-[#1a1d24] border border-white/5 p-4 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Award className="w-5 h-5"/></div>
            <div><div className="text-[10px] text-gray-500 uppercase font-bold">{lic.name}</div><div className="text-sm text-white font-mono">{lic.number}</div></div>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-800 my-4"></div>
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2"><Clock className="w-5 h-5"/> Ciclo de Facturación</h3>
        <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">Día de Cierre (締め日)</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 15, 20, 25].map(day => (
            <button key={day} onClick={() => setLocalConfig({...localConfig, closingDay: day})} className={`p-3 rounded-xl border text-sm font-bold transition-all ${localConfig.closingDay === day ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
              {day === 0 ? 'Fin de Mes (末日)' : `Día ${day} (日)`}
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4"><button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> Guardar</button></div>
      </GlassCard>
      <GlassCard className="p-6">
        <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><Trash2 className="w-5 h-5"/> クリーニング費 (Limpieza al salir)</h3>
        <p className="text-xs text-gray-500 mb-3">Monto que se cobra al inquilino al dar de baja. Se registra automáticamente en el historial.</p>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-lg font-bold">¥</span>
          <input type="number" step="1000" className="w-48 bg-black/50 border border-gray-700 p-3 rounded-xl text-white font-mono text-lg focus:border-red-500 outline-none transition" value={localConfig.defaultCleaningFee ?? 30000} onChange={e => setLocalConfig({...localConfig, defaultCleaningFee: parseInt(e.target.value) || 0})} />
          <span className="text-gray-500 text-xs">por persona</span>
        </div>
        <div className="flex justify-end mt-4"><button onClick={handleSaveConfig} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-red-500/20 flex items-center gap-2 text-sm"><Save className="w-4 h-4" /> Guardar</button></div>
      </GlassCard>
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Database className="w-6 h-6 text-blue-500"/> Gestión de Datos</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard className="p-6 border-blue-500/30 bg-blue-900/10">
          <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-blue-500/20 rounded-full text-blue-400"><Download className="w-6 h-6" /></div><div><h3 className="text-lg font-bold text-white">Respaldo</h3><p className="text-xs text-blue-200">Guardar .JSON</p></div></div>
          <button onClick={onDownloadBackup} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20 flex justify-center gap-2"><Save className="w-4 h-4" /> Descargar</button>
        </GlassCard>
        <GlassCard className="p-6 border-purple-500/30 bg-purple-900/10">
          <div className="flex items-center gap-4 mb-4"><div className="p-3 bg-purple-500/20 rounded-full text-purple-400"><Upload className="w-6 h-6" /></div><div><h3 className="text-lg font-bold text-white">Restaurar</h3><p className="text-xs text-purple-200">Cargar .JSON</p></div></div>
          <label className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-500/20 flex justify-center gap-2 cursor-pointer text-center"><UploadCloud className="w-4 h-4" /><span>Subir</span><input type="file" accept=".json" className="hidden" onChange={onRestoreBackup} /></label>
        </GlassCard>
      </div>
      <div className="mt-8 pt-4 border-t border-red-900/30">
        <button onClick={onReset} className="w-full text-red-500 hover:text-red-400 hover:bg-red-900/10 p-4 rounded-xl text-sm flex gap-2 items-center justify-center transition-colors uppercase tracking-widest font-bold border border-transparent hover:border-red-900/50"><Trash2 className="w-5 h-5"/> Resetear Sistema</button>
      </div>
    </div>
  );
};
