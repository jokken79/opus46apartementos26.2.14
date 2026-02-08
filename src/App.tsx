import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building, Users, LayoutDashboard, Search, Database, UploadCloud, PlusCircle, X,
  FileCheck, AlertCircle, Calculator, DollarSign, UserPlus, Save, Calendar, Check,
  Trash2, Phone, User, History, MapPin, Edit2, Map, Hash, Loader2, Bell,
  TrendingUp, ArrowRight, Download, Upload, Settings, Clock, Mail, Award,
  CalendarDays, Percent, LogOut, Table2, FileText
} from 'lucide-react';
import { ReportsView } from './components/reports/ReportsView';
import { useIndexedDB } from './hooks/useIndexedDB';
import type { Property, Tenant, Employee, AppConfig, AppDatabase, AlertItem } from './types/database';
import { validateBackup } from './utils/validators';

// --- ID Generator (monotónico, sin colisiones) ---
let _lastId = 0;
const generateId = (): number => {
  const now = Date.now();
  _lastId = now > _lastId ? now : _lastId + 1;
  return _lastId;
};

// --- SheetJS ---
let sheetJSReady = false;
const useLoadSheetJS = () => {
  useEffect(() => {
    if ((window as any).XLSX) { sheetJSReady = true; return; }
    const script = document.createElement('script');
    script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
    script.async = true;
    script.onload = () => { sheetJSReady = true; };
    script.onerror = () => { console.error('[SheetJS] Error cargando CDN'); };
    document.body.appendChild(script);
  }, []);
};

// --- 日割り計算 (Pro-rata) ---
const calculateProRata = (monthlyAmount: number, entryDate: string) => {
  if (!entryDate || monthlyAmount <= 0) return { amount: monthlyAmount, days: 0, totalDays: 0, isProRata: false };
  const entry = new Date(entryDate);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const totalDays = lastOfMonth.getDate();
  if (entry < firstOfMonth) return { amount: monthlyAmount, days: totalDays, totalDays, isProRata: false };
  if (entry > lastOfMonth) return { amount: 0, days: 0, totalDays, isProRata: true };
  const daysOccupied = totalDays - entry.getDate() + 1;
  const raw = monthlyAmount / totalDays * daysOccupied;
  const amount = Math.round(raw / 10) * 10;
  return { amount, days: daysOccupied, totalDays, isProRata: true };
};

// --- DATOS CORPORATIVOS ---
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

const INITIAL_DB: AppDatabase = {
  properties: [], tenants: [], employees: [],
  config: { companyName: COMPANY_INFO.name_en, closingDay: 0, defaultCleaningFee: 30000 }
};

// --- UI COMPONENTS ---
const GlassCard = ({ children, className = "", hoverEffect = true }: { children: React.ReactNode; className?: string; hoverEffect?: boolean }) => (
  <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl ${hoverEffect ? 'transition-all duration-300 hover:border-blue-500/30 hover:bg-[#20242c] hover:shadow-blue-900/10 hover:-translate-y-1' : ''} ${className}`}>
    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, icon: Icon, trend }: { title: string; value: string; subtext: string; icon: React.ComponentType<{ className?: string }>; trend?: 'up' | 'down' }) => (
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

const Modal = ({ isOpen, onClose, title, children, wide = false }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
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

const NavButton = ({ icon: Icon, active, onClick, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} title={label} className={`relative group w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}>
    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">{label}</span>
  </button>
);

const NavButtonMobile = ({ icon: Icon, active, onClick, label }: { icon: React.ComponentType<{ className?: string }>; active: boolean; onClick: () => void; label: string }) => (
  <button onClick={onClick} aria-label={label} className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${active ? 'text-blue-400' : 'text-gray-500'}`}>
    <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);

// --- SETTINGS VIEW ---
const SettingsView = ({ db, setDb, onDownloadBackup, onRestoreBackup, onReset }: { db: AppDatabase; setDb: (db: AppDatabase) => void; onDownloadBackup: () => void; onRestoreBackup: (e: React.ChangeEvent<HTMLInputElement>) => void; onReset: () => void }) => {
  const [localConfig, setLocalConfig] = useState(db.config || INITIAL_DB.config);
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

// --- IMPORT VIEW ---
const ImportViewComponent = ({ isDragging, importStatus, previewSummary, onDragOver, onDragLeave, onDrop, onFileChange, onSave }: { isDragging: boolean; importStatus: { type: string; msg: string }; previewSummary: string; onDragOver: (e: React.DragEvent) => void; onDragLeave: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void; onSave: () => void; }) => (
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

const EMPTY_PROPERTY_FORM = { id: null as number | null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '', manager_name: '', manager_phone: '', contract_start: new Date().toISOString().split('T')[0], contract_end: '', type: '1K', capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0, kanri_hi: 0, billing_mode: 'fixed' as const };
const EMPTY_TENANT_FORM = { employee_id: '', name: '', name_kana: '', company: '', property_id: '' as string | number, rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] };

// ============================================
// ============ APP PRINCIPAL =================
// ============================================
export default function App() {
  useLoadSheetJS();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  // IndexedDB (Dexie) — reemplaza localStorage
  const { db, setDb, isLoading: isDbLoading, resetDb } = useIndexedDB();

  // --- ESTADOS ---
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', msg: '' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any>([]);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');

  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [isRentManagerOpen, setIsRentManagerOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [selectedPropertyForRent, setSelectedPropertyForRent] = useState<Property | null>(null);
  const [isIdFound, setIsIdFound] = useState(false);
  const [propertyViewMode, setPropertyViewMode] = useState('active');
  const [companyFilter, setCompanyFilter] = useState('');
  const [empSearch, setEmpSearch] = useState('');
  const [empPage, setEmpPage] = useState(1);
  const EMP_PER_PAGE = 50;

  const [tenantForm, setTenantForm] = useState<any>({
    employee_id: '', name: '', name_kana: '', company: '', property_id: '',
    rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0]
  });
  const [propertyForm, setPropertyForm] = useState<any>({
    id: null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '',
    manager_name: '', manager_phone: '', contract_start: '', contract_end: '', type: '1K',
    capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0, kanri_hi: 0, billing_mode: 'fixed'
  });

  // --- CICLO ---
  const cycle = useMemo(() => {
    const now = new Date(); const cd = db.config?.closingDay || 0;
    let s: Date, e: Date;
    if (cd === 0) { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else if (now.getDate() <= cd) { s = new Date(now.getFullYear(), now.getMonth() - 1, cd + 1); e = new Date(now.getFullYear(), now.getMonth(), cd); }
    else { s = new Date(now.getFullYear(), now.getMonth(), cd + 1); e = new Date(now.getFullYear(), now.getMonth() + 1, cd); }
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return { start: s.toLocaleDateString('es-ES', opt), end: e.toLocaleDateString('es-ES', opt), month: now.toLocaleString('es-ES', { month: 'long' }).toUpperCase() };
  }, [db.config?.closingDay]);

  // --- MÉTRICAS ---
  const dashboardData = useMemo(() => {
    const ap = db.properties.filter(p => { if (!p.contract_end) return true; const d = new Date(p.contract_end); return isNaN(d.getTime()) || d > new Date(); });
    const occ = db.tenants.filter(t => t.property_id !== null && t.status === 'active').length;
    const cap = ap.reduce((a, b) => a + (b.capacity || 0), 0);
    const rent = db.tenants.reduce((a, t) => a + (t.status === 'active' ? t.rent_contribution : 0), 0);
    const park = db.tenants.reduce((a, t) => a + (t.status === 'active' ? t.parking_fee : 0), 0);
    const col = rent + park;
    const cost = ap.reduce((a, p) => a + (p.rent_cost || 0) + (p.parking_cost || 0) + (p.kanri_hi || 0), 0);
    const target = ap.reduce((a, p) => a + (p.rent_price_uns || 0), 0);
    const alerts: AlertItem[] = [];
    const today = new Date();
    ap.forEach(p => { if (p.contract_end) { const d = Math.ceil((new Date(p.contract_end).getTime() - today.getTime()) / 86400000); if (d > 0 && d <= 60) alerts.push({ type: 'warning', msg: `${p.name}: contrato vence en ${d} días.` }); if (d <= 0) alerts.push({ type: 'danger', msg: `${p.name}: contrato vencido.` }); } });
    const zr = db.tenants.filter(t => t.status === 'active' && t.rent_contribution === 0);
    if (zr.length > 0) alerts.push({ type: 'danger', msg: `${zr.length} inquilinos con renta ¥0.` });
    return { totalProperties: ap.length, occupiedCount: occ, totalCapacity: cap, occupancyRate: cap > 0 ? Math.round(occ / cap * 100) : 0, profit: col - cost, totalCollected: col, totalPropCost: cost, totalTargetUNS: target, alerts };
  }, [db]);

  // --- BACKUP ---
  const downloadBackup = () => { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); a.download = `UNS_Backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); };
  const restoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const f = event.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const d = JSON.parse(e.target?.result as string);
        const v = validateBackup(d);
        if (!v.success) { alert('Archivo inválido: ' + v.errors.map(e => e.message).join(', ')); return; }
        setDb({
          properties: d.properties || [],
          tenants: d.tenants || [],
          employees: d.employees || [],
          config: { companyName: d.config?.companyName || 'UNS-KIKAKU', closingDay: d.config?.closingDay ?? 0, defaultCleaningFee: d.config?.defaultCleaningFee ?? 30000 },
        });
        alert('Restaurado!');
      } catch { alert('Error de lectura.'); }
    };
    r.onerror = () => { alert('Error al leer archivo.'); };
    r.readAsText(f);
  };

  // --- EMPLOYEE LOOKUP ---
  useEffect(() => {
    if (tenantForm.employee_id.length > 2) {
      const f = db.employees.find(e => String(e.id) === String(tenantForm.employee_id));
      if (f) { setTenantForm((p: any) => ({ ...p, name: f.name, name_kana: f.name_kana || '', company: f.company || '' })); setIsIdFound(true); }
      else setIsIdFound(false);
    } else setIsIdFound(false);
  }, [tenantForm.employee_id, db.employees]);

  // --- ADDRESS ---
  const fetchAddressFromZip = async () => {
    setAddressSearchError(''); const zip = propertyForm.postal_code.replace(/-/g, '');
    if (zip.length !== 7) { setAddressSearchError('7 dígitos.'); return; }
    setIsSearchingAddress(true);
    try { const r = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`); const d = await r.json(); if (d.results) { const a = d.results[0]; setPropertyForm((p: any) => ({ ...p, address_auto: `${a.address1}${a.address2}${a.address3}` })); } else setAddressSearchError('No encontrado.'); }
    catch { setAddressSearchError('Error de conexión.'); } finally { setIsSearchingAddress(false); }
  };

  const uniqueCompanies = useMemo(() => {
    const companies = new Set<string>();
    db.tenants.filter(t => t.status === 'active' && t.company).forEach(t => companies.add(t.company!));
    return Array.from(companies).sort();
  }, [db.tenants]);

  const filteredProperties = useMemo(() => {
    let result = db.properties;
    const t = searchTerm.toLowerCase();
    if (t) result = result.filter(p => p.name.toLowerCase().includes(t) || (p.room_number && p.room_number.includes(t)) || p.address.toLowerCase().includes(t));
    if (companyFilter) {
      const propIdsWithCompany = new Set(db.tenants.filter(t => t.status === 'active' && t.company === companyFilter).map(t => t.property_id));
      result = result.filter(p => propIdsWithCompany.has(p.id));
    }
    return result;
  }, [db.properties, db.tenants, searchTerm, companyFilter]);

  const filteredEmployees = useMemo(() => {
    const t = empSearch.toLowerCase(); if (!t) return db.employees;
    return db.employees.filter(e => e.id.includes(t) || e.name.toLowerCase().includes(t) || e.name_kana.toLowerCase().includes(t) || e.company.toLowerCase().includes(t));
  }, [db.employees, empSearch]);

  // --- ACTIONS ---
  const openRentManager = (p: Property) => { setSelectedPropertyForRent(p); setIsRentManagerOpen(true); };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = propertyForm.postal_code ? `〒${propertyForm.postal_code} ${propertyForm.address_auto} ${propertyForm.address_detail}` : `${propertyForm.address_auto} ${propertyForm.address_detail}`;
    const cp = { ...propertyForm, address: addr.trim() };
    setDb(prev => {
      const newProps = [...prev.properties];
      if (propertyForm.id) { const i = newProps.findIndex(p => p.id === propertyForm.id); if (i >= 0) newProps[i] = cp; }
      else newProps.push({ ...cp, id: generateId() });
      return { ...prev, properties: newProps };
    });
    setIsPropertyModalOpen(false);
  };

  const handleDeleteProperty = (pid: number) => {
    const prop = db.properties.find(p => p.id === pid);
    if (!prop) return;
    const activeTs = db.tenants.filter(t => t.property_id === pid && t.status === 'active');
    if (activeTs.length > 0) { alert(`No se puede eliminar "${prop.name}": tiene ${activeTs.length} inquilino(s) activo(s). Dar de baja primero.`); return; }
    if (!window.confirm(`¿Eliminar propiedad "${prop.name}" permanentemente?\n\nEsta acción no se puede deshacer.`)) return;
    setDb(prev => ({ ...prev, properties: prev.properties.filter(p => p.id !== pid), tenants: prev.tenants.filter(t => t.property_id !== pid) }));
    setIsRentManagerOpen(false);
    setIsPropertyModalOpen(false);
  };

  const reactivateTenant = (tid: number) => {
    const tenant = db.tenants.find(t => t.id === tid);
    if (!tenant) return;
    if (db.tenants.find(t => t.employee_id === tenant.employee_id && t.status === 'active')) { alert(`社員No ${tenant.employee_id} ya está asignado a otro apartamento.`); return; }
    if (!window.confirm(`¿Reactivar a ${tenant.name}?`)) return;
    setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'active' as const, exit_date: undefined, cleaning_fee: undefined } : t) }));
  };

  const handleUpdateRentDetails = (tid: number, field: string, val: string) => {
    const v = parseInt(val) || 0;
    setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, [field]: v } : t) }));
  };

  const distributeRentEvenly = () => {
    if (!selectedPropertyForRent) return;
    setDb(prev => {
      const ts = prev.tenants.filter(t => t.property_id === selectedPropertyForRent.id && t.status === 'active');
      if (ts.length === 0) return prev;
      const split = Math.floor(selectedPropertyForRent.rent_price_uns / ts.length);
      const remainder = selectedPropertyForRent.rent_price_uns % ts.length;
      return { ...prev, tenants: prev.tenants.map(t => {
        if (t.property_id === selectedPropertyForRent.id && t.status === 'active') {
          const idx = ts.findIndex(x => x.id === t.id);
          return { ...t, rent_contribution: idx === 0 ? split + remainder : split };
        }
        return t;
      })};
    });
  };

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantForm.employee_id.trim() || !tenantForm.name.trim()) { alert('社員No y Nombre son obligatorios.'); return; }
    if (!tenantForm.property_id) { alert('Error: propiedad no seleccionada.'); return; }
    if (db.tenants.find(t => t.employee_id === tenantForm.employee_id && t.status === 'active')) { alert('Este 社員No ya está asignado a otro apartamento.'); return; }
    const newT: Tenant = { id: generateId(), ...tenantForm, property_id: Number(tenantForm.property_id), status: 'active' };
    setDb(prev => ({ ...prev, tenants: [...prev.tenants, newT] }));
    setIsAddTenantModalOpen(false);
    setTenantForm({ employee_id: '', name: '', name_kana: '', company: '', property_id: '', rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] });
  };

  const removeTenant = (tid: number) => {
    const tenant = db.tenants.find(t => t.id === tid);
    if (!tenant) return;
    const fee = db.config.defaultCleaningFee || 30000;
    if (!window.confirm(`¿Dar de baja a ${tenant.name}?\n\nSe aplicará クリーニング費 (limpieza): ¥${fee.toLocaleString()}`)) return;
    const exitDate = new Date().toISOString().split('T')[0];
    setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'inactive' as const, exit_date: exitDate, cleaning_fee: fee } : t) }));
  };

  // --- IMPORT ---
  const processExcelFile = (file: File) => {
    setImportStatus({ type: 'loading', msg: '' }); setPreviewData([]); setDetectedType(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const X = (window as any).XLSX;
        if (!X) { setImportStatus({ type: 'error', msg: 'SheetJS aún no terminó de cargar. Espere e intente de nuevo.' }); return; }
        const wb = X.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
        const sn: string[] = wb.SheetNames;
        let emp = sn.find((n: string) => n.includes('Genzai') || n.includes('Ukeoi') || n.includes('台帳'));
        const prop = sn.find((n: string) => n.includes('会社寮情報'));
        const ten = sn.find((n: string) => n.includes('入居者一覧'));
        if (!emp && !prop && !ten && sn.length === 1) emp = sn[0];
        if (emp) { const d = X.utils.sheet_to_json(wb.Sheets[emp], { defval: "" }); setPreviewData(d); setDetectedType('employees'); setPreviewSummary(`社員台帳 (${emp}): ${d.length} empleados detectados.`); setImportStatus({ type: 'success', msg: 'OK' }); }
        else if (prop || ten) {
          const c: any = { properties: [], tenants: [] }; let t = 'Gestión de Renta:\n';
          if (prop) { const p = X.utils.sheet_to_json(wb.Sheets[prop], { defval: "" }); c.properties = p; t += `- ${p.length} Propiedades\n`; }
          if (ten) { const tt = X.utils.sheet_to_json(wb.Sheets[ten], { defval: "" }); c.tenants = tt; t += `- ${tt.length} Inquilinos`; }
          setPreviewData(c); setDetectedType('rent_management'); setPreviewSummary(t); setImportStatus({ type: 'success', msg: 'OK' });
        } else setImportStatus({ type: 'error', msg: 'Formato no reconocido.' });
      } catch { setImportStatus({ type: 'error', msg: 'Error de lectura.' }); }
    }; reader.readAsArrayBuffer(file);
  };

  const saveToDatabase = () => {
    const newDb: AppDatabase = JSON.parse(JSON.stringify(db)); let tab = 'dashboard';
    if (detectedType === 'employees') {
      previewData.forEach((r: any) => { const id = r['社員No'] || r['ID']; const nm = r['氏名'] || r['Name']; if (!id || !nm) return; const emp: Employee = { id: String(id).trim(), name: String(nm).trim(), name_kana: String(r['カナ'] || ''), company: String(r['派遣先'] || ''), full_data: r }; const i = newDb.employees.findIndex(e => e.id === emp.id); if (i >= 0) newDb.employees[i] = emp; else newDb.employees.push(emp); });
      tab = 'employees';
    } else if (detectedType === 'rent_management') {
      const { properties, tenants } = previewData;
      properties.forEach((r: any) => { const n = r['ｱﾊﾟｰﾄ'] || r['物件名']; if (!n) return; const ex = newDb.properties.find(p => p.name === n); const pid = ex ? ex.id : generateId(); const o: Property = { id: pid, name: String(n).trim(), address: String(r['住所'] || '').trim(), capacity: parseInt(r['入居人数'] || 2) || 2, rent_cost: parseInt(r['家賃'] || 0), rent_price_uns: parseInt(r['USN家賃'] || 0), parking_cost: parseInt(r['駐車場代'] || 0) }; if (ex) Object.assign(ex, o); else newDb.properties.push(o); });
      tenants.forEach((r: any, idx: number) => { const apt = r['ｱﾊﾟｰﾄ']; const kana = r['カナ']; if (!apt || !kana) return; const pr = newDb.properties.find(p => p.name === apt); if (!pr) return; if (!newDb.tenants.find(t => t.name_kana === kana && t.property_id === pr.id)) newDb.tenants.push({ id: generateId(), employee_id: `IMP-${idx}`, name: kana, name_kana: kana, property_id: pr.id, rent_contribution: parseInt(r['家賃'] || 0), parking_fee: parseInt(r['駐車場'] || 0), entry_date: r['入居'] || new Date().toISOString().split('T')[0], status: 'active' }); });
      tab = 'properties';
    }
    setDb(newDb); setPreviewData([]); setDetectedType(null); setImportStatus({ type: '', msg: '' }); setActiveTab(tab);
  };

  // --- RENDER ---
  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-[#0d0f12] flex items-center justify-center">
        <div className="text-center space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <div className="text-white font-bold text-lg">Cargando UNS Estate OS...</div>
          <div className="text-gray-500 text-xs">Inicializando base de datos</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-200 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]"></div>
      </div>

      {/* HEADER */}
      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-[#0d0f12]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 p-1"><img src={COMPANY_INFO.logo_url} className="h-full object-contain" alt="Logo" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/40x40?text=UNS"; }} /></div>
          <div><h1 className="text-lg font-black text-white tracking-tight leading-none">{COMPANY_INFO.name_en}</h1><span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Estate OS v7</span></div>
        </div>
        <div className="flex items-center bg-[#15171c] border border-white/10 rounded-full px-3 py-2 flex-1 mx-3 md:mx-0 md:flex-none md:w-96 focus-within:border-blue-500/50 transition-all group">
          <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors shrink-0" />
          <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-sm text-white w-full ml-2 placeholder-gray-600" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) setActiveTab('properties'); }} />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white shrink-0"><X className="w-3.5 h-3.5"/></button>}
        </div>
        <div className="flex items-center gap-2">
          <button aria-label={`Alertas (${dashboardData.alerts.length})`} className="w-8 h-8 rounded-full bg-[#15171c] border border-white/10 flex items-center justify-center hover:bg-[#20242c] cursor-pointer transition relative"><Bell className="w-4 h-4 text-gray-400" />{dashboardData.alerts.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}</button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500 overflow-hidden"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=AdminUNS" alt="U" /></div>
        </div>
      </header>

      <div className="flex relative z-10">
        {/* SIDEBAR */}
        <nav className="w-20 hidden md:flex flex-col items-center py-8 gap-8 border-r border-white/5 h-[calc(100vh-80px)] sticky top-20 bg-[#0d0f12]/50 backdrop-blur-sm">
          <NavButton icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="HQ" />
          <NavButton icon={Building} active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} label="Prop." />
          <NavButton icon={Users} active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} label="社員" />
          <NavButton icon={FileText} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="報告" />
          <div className="h-px w-8 bg-gray-800"></div>
          <NavButton icon={UploadCloud} active={activeTab === 'import'} onClick={() => setActiveTab('import')} label="Sync" />
          <NavButton icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Config" />
        </nav>

        {/* MAIN */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto min-h-[calc(100vh-80px)] mb-20 md:mb-0">

          {/* ====== DASHBOARD ====== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/20 via-[#15171c] to-[#0d0f12] border border-white/5 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2"><span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/30 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Activo</span><span className="text-gray-500 text-xs font-mono">{new Date().toLocaleDateString()}</span></div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">Bienvenido a <span className="text-blue-500">UNS</span></h2>
                    <p className="text-gray-400 text-sm">Gestión inmobiliaria corporativa. {db.employees.length} empleados | {db.properties.length} propiedades</p>
                  </div>
                  <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4 min-w-[280px]">
                    <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20"><Calendar className="w-6 h-6" /></div>
                    <div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Ciclo</div><div className="text-lg font-bold text-white leading-tight">{cycle.month}</div><div className="text-xs text-gray-500">{cycle.start} - {cycle.end}</div></div>
                  </div>
                </div>
              </div>
              {dashboardData.alerts.length > 0 && <div className="grid gap-3">{dashboardData.alerts.map((a, i) => (<div key={i} className={`p-4 rounded-xl border flex items-center gap-3 ${a.type === 'danger' ? 'bg-red-900/10 border-red-500/30 text-red-200' : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-200'}`}><AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-medium">{a.msg}</span></div>))}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Beneficio Neto" value={`¥${dashboardData.profit.toLocaleString()}`} subtext="Margen Mensual" icon={TrendingUp} trend={dashboardData.profit > 0 ? 'up' : 'down'} />
                <StatCard title="Recaudado" value={`¥${dashboardData.totalCollected.toLocaleString()}`} subtext="Renta + Parking" icon={DollarSign} trend="up" />
                <StatCard title="Ocupación" value={`${dashboardData.occupancyRate}%`} subtext={`${dashboardData.occupiedCount} de ${dashboardData.totalCapacity}`} icon={Users} />
                <StatCard title="Costo Operativo" value={`¥${dashboardData.totalPropCost.toLocaleString()}`} subtext="家賃+管理費+駐車場" icon={Building} />
              </div>
              <GlassCard className="p-6">
                <div className="flex justify-between items-end mb-6"><div><h3 className="text-lg font-bold text-white mb-1">Balance Financiero</h3></div><div className="text-right"><div className="text-2xl font-mono font-bold text-blue-400">¥{dashboardData.totalTargetUNS.toLocaleString()}</div><div className="text-[10px] text-gray-500 uppercase font-bold">Objetivo</div></div></div>
                <div className="space-y-4">
                  <div><div className="flex mb-2 items-center justify-between"><span className="text-xs font-semibold py-1 px-2 rounded-full text-green-400 bg-green-200/10 border border-green-500/30">Ingresos</span><span className="text-xs font-bold text-green-400">{dashboardData.totalTargetUNS > 0 ? Math.round(dashboardData.totalCollected / dashboardData.totalTargetUNS * 100) : 0}%</span></div><div className="flex h-4 overflow-hidden bg-gray-800 rounded-full border border-white/5"><div style={{ width: `${dashboardData.totalTargetUNS > 0 ? dashboardData.totalCollected / dashboardData.totalTargetUNS * 100 : 0}%` }} className="bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"></div></div></div>
                  <div><div className="flex mb-2 items-center justify-between"><span className="text-xs font-semibold py-1 px-2 rounded-full text-red-400 bg-red-200/10 border border-red-500/30">Costos</span><span className="text-xs font-bold text-red-400">¥{dashboardData.totalPropCost.toLocaleString()}</span></div><div className="flex h-2 overflow-hidden bg-gray-800 rounded-full border border-white/5"><div style={{ width: `${dashboardData.totalTargetUNS > 0 ? dashboardData.totalPropCost / dashboardData.totalTargetUNS * 100 : 0}%` }} className="bg-red-500 transition-all duration-1000"></div></div></div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* ====== PROPIEDADES ====== */}
          {activeTab === 'properties' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#15171c] p-2 rounded-2xl border border-white/5">
                <div className="flex gap-1 bg-black/40 p-1 rounded-xl w-full md:w-auto">
                  <button onClick={() => setPropertyViewMode('active')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${propertyViewMode === 'active' ? 'bg-[#20242c] text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-white'}`}><Building className="w-4 h-4"/> Activos</button>
                  <button onClick={() => setPropertyViewMode('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${propertyViewMode === 'history' ? 'bg-[#20242c] text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-white'}`}><History className="w-4 h-4"/> Historial</button>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  {uniqueCompanies.length > 0 && (
                    <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="bg-black/60 border border-white/10 text-sm text-white rounded-xl px-3 py-2.5 outline-none focus:border-cyan-500 transition appearance-none cursor-pointer">
                      <option value="">全派遣先 (Todas)</option>
                      {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                  <button onClick={() => { setPropertyForm({ id: null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '', manager_name: '', manager_phone: '', contract_start: new Date().toISOString().split('T')[0], contract_end: '', type: '1K', capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0, kanri_hi: 0, billing_mode: 'fixed' }); setIsPropertyModalOpen(true); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"><PlusCircle className="w-4 h-4"/> Nueva Propiedad</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {(propertyViewMode === 'active' ? filteredProperties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date()) : filteredProperties.filter(p => p.contract_end && new Date(p.contract_end) <= new Date())).map(p => {
                  const ts = db.tenants.filter(t => t.property_id === p.id && t.status === 'active');
                  const totalIn = ts.reduce((s, t) => s + (t.rent_contribution || 0) + (t.parking_fee || 0), 0);
                  const vac = (p.capacity || 0) - ts.length;
                  const totalCost = (p.rent_cost || 0) + (p.kanri_hi || 0) + (p.parking_cost || 0);
                  return (
                    <GlassCard key={p.id} className="flex flex-col justify-between p-5 min-h-[320px]">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-black text-xl text-white truncate pr-2 flex flex-col leading-none">{p.name}{p.room_number && <span className="text-blue-400 font-mono text-base mt-1">#{p.room_number}</span>}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-black border ${vac < 0 ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : vac === 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{vac < 0 ? 'EXCESO' : vac === 0 ? 'LLENO' : `${vac} LIBRES`}</span>
                            <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-bold border ${p.billing_mode === 'split' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>{p.billing_mode === 'split' ? '均等割り' : '個別設定'}</span>
                          </div>
                        </div>
                        <div className="space-y-2 mb-4 text-xs">
                          <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">家賃 (不動産屋)</span><span className="text-white font-mono">¥{(p.rent_cost || 0).toLocaleString()}</span></div>
                          {(p.kanri_hi || 0) > 0 && <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">管理費</span><span className="text-white font-mono">¥{(p.kanri_hi || 0).toLocaleString()}</span></div>}
                          {(p.parking_cost || 0) > 0 && <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">駐車場代</span><span className="text-blue-400 font-mono">¥{(p.parking_cost || 0).toLocaleString()}</span></div>}
                          <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500 font-bold">合計コスト</span><span className="text-red-400 font-mono font-bold">¥{totalCost.toLocaleString()}</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-gray-500">Objetivo UNS</span><span className="text-blue-500 font-mono font-bold">¥{(p.rent_price_uns || 0).toLocaleString()}</span></div>
                          <div className="flex justify-between pt-1"><span className="text-gray-400 font-bold uppercase">Recaudado</span><span className={`text-lg font-black font-mono ${totalIn >= (p.rent_price_uns || 0) ? 'text-green-400' : 'text-orange-400'}`}>¥{totalIn.toLocaleString()}</span></div>
                        </div>
                        {ts.length > 0 && <div className="mb-3 space-y-1.5">{ts.map(t => (<div key={t.id} className="flex items-center gap-2 text-[10px] text-gray-400"><User className="w-3 h-3 text-blue-500 shrink-0"/><div className="flex flex-col min-w-0 flex-1"><span className="truncate text-gray-300">{t.name}</span>{t.company && <span className="truncate text-[9px] text-cyan-500/70">派遣先: {t.company}</span>}</div><span className="text-gray-600 font-mono shrink-0">¥{t.rent_contribution.toLocaleString()}</span></div>))}</div>}
                        {(() => { const past = db.tenants.filter(t => t.property_id === p.id && t.status === 'inactive'); return past.length > 0 ? <div className="mb-3 flex items-center gap-1.5 text-[10px] text-orange-400/60"><History className="w-3 h-3"/><span>{past.length} inquilino{past.length > 1 ? 's' : ''} anterior{past.length > 1 ? 'es' : ''}</span></div> : null; })()}
                        <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity mb-3"><p className="text-gray-400 text-[10px] flex gap-1 truncate items-center"><MapPin className="w-3 h-3 text-gray-600"/> {p.address}</p></div>
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => { setPropertyForm({ ...p, kanri_hi: p.kanri_hi || 0, billing_mode: p.billing_mode || 'fixed' }); setIsPropertyModalOpen(true); }} className="bg-black/40 hover:bg-black/60 text-gray-300 p-2.5 rounded-lg border border-white/10 transition"><Edit2 className="w-4 h-4"/></button>
                        <button onClick={() => handleDeleteProperty(p.id)} className="bg-black/40 hover:bg-red-900/40 text-gray-500 hover:text-red-400 p-2.5 rounded-lg border border-white/10 hover:border-red-500/30 transition" title="Eliminar propiedad"><Trash2 className="w-4 h-4"/></button>
                        {propertyViewMode === 'active' && <button onClick={() => openRentManager(p)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition"><DollarSign className="w-4 h-4" /> Gestión</button>}
                      </div>
                    </GlassCard>
                  );
                })}
                {(propertyViewMode === 'active' ? filteredProperties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date()) : filteredProperties.filter(p => p.contract_end && new Date(p.contract_end) <= new Date())).length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                    <Building className="w-12 h-12 text-gray-700 mb-4" />
                    <p className="text-gray-500 text-sm font-bold">{companyFilter ? `Sin propiedades para 派遣先: ${companyFilter}` : searchTerm ? 'Sin resultados para la búsqueda' : propertyViewMode === 'history' ? 'Sin propiedades en historial' : 'Sin propiedades registradas'}</p>
                    {companyFilter && <button onClick={() => setCompanyFilter('')} className="mt-3 text-blue-400 text-xs hover:underline">Limpiar filtro</button>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====== EMPLEADOS (社員台帳) ====== */}
          {activeTab === 'employees' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div><h2 className="text-3xl font-black text-white">社員台帳</h2><p className="text-gray-500 text-sm">Base de datos de empleados — {db.employees.length} registros</p></div>
                <button onClick={() => setActiveTab('import')} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-500/20"><UploadCloud className="w-4 h-4"/> Importar 社員台帳</button>
              </div>
              {db.employees.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="bg-gray-900 p-6 rounded-full mb-6 border border-gray-800"><Table2 className="w-12 h-12 text-gray-600" /></div>
                  <h3 className="text-2xl font-bold text-white mb-2">Sin empleados</h3>
                  <p className="text-gray-500 max-w-md mb-6">Importa tu archivo Excel de 社員台帳 para cargar todos los empleados.</p>
                  <button onClick={() => setActiveTab('import')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2"><UploadCloud className="w-5 h-5"/> Ir a Importar</button>
                </div>
              ) : (
                <>
                  <div className="flex items-center bg-[#15171c] border border-white/10 rounded-xl px-4 py-3 focus-within:border-blue-500/50 transition-all">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input type="text" placeholder="Buscar por ID, nombre, カナ, empresa..." className="bg-transparent border-none outline-none text-sm text-white w-full ml-3 placeholder-gray-600" value={empSearch} onChange={e => { setEmpSearch(e.target.value); setEmpPage(1); }} />
                    {empSearch && <button onClick={() => setEmpSearch('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
                  </div>
                  <GlassCard hoverEffect={false} className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="border-b border-white/10 bg-black/30">
                          <th className="text-left p-4 text-[10px] text-gray-500 uppercase font-bold">社員No</th>
                          <th className="text-left p-4 text-[10px] text-gray-500 uppercase font-bold">氏名</th>
                          <th className="text-left p-4 text-[10px] text-gray-500 uppercase font-bold hidden md:table-cell">カナ</th>
                          <th className="text-left p-4 text-[10px] text-gray-500 uppercase font-bold hidden md:table-cell">派遣先</th>
                          <th className="text-left p-4 text-[10px] text-gray-500 uppercase font-bold">Estado</th>
                        </tr></thead>
                        <tbody>
                          {filteredEmployees.slice((empPage - 1) * EMP_PER_PAGE, empPage * EMP_PER_PAGE).map(emp => {
                            const isAssigned = db.tenants.some(t => t.employee_id === emp.id && t.status === 'active');
                            const assignedProp = isAssigned ? db.properties.find(p => p.id === db.tenants.find(t => t.employee_id === emp.id && t.status === 'active')?.property_id) : null;
                            return (
                              <tr key={emp.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="p-4 font-mono text-blue-400 font-bold">{emp.id}</td>
                                <td className="p-4 text-white font-medium">{emp.name}</td>
                                <td className="p-4 text-gray-400 hidden md:table-cell">{emp.name_kana}</td>
                                <td className="p-4 text-gray-400 hidden md:table-cell">{emp.company}</td>
                                <td className="p-4">{isAssigned ? <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded font-bold flex items-center gap-1 w-fit"><Building className="w-3 h-3"/>{assignedProp?.name}</span> : <span className="text-[10px] text-gray-500">Disponible</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredEmployees.length > EMP_PER_PAGE && (
                      <div className="p-4 flex items-center justify-between border-t border-white/5">
                        <span className="text-xs text-gray-500">{(empPage - 1) * EMP_PER_PAGE + 1}–{Math.min(empPage * EMP_PER_PAGE, filteredEmployees.length)} de {filteredEmployees.length}</span>
                        <div className="flex gap-2">
                          <button onClick={() => setEmpPage(p => Math.max(1, p - 1))} disabled={empPage <= 1} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 border border-white/10 disabled:opacity-30 hover:bg-gray-700 transition">← Ant</button>
                          <span className="px-3 py-1.5 text-xs text-white font-mono">{empPage}/{Math.ceil(filteredEmployees.length / EMP_PER_PAGE)}</span>
                          <button onClick={() => setEmpPage(p => Math.min(Math.ceil(filteredEmployees.length / EMP_PER_PAGE), p + 1))} disabled={empPage >= Math.ceil(filteredEmployees.length / EMP_PER_PAGE)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-400 border border-white/10 disabled:opacity-30 hover:bg-gray-700 transition">Sig →</button>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </>
              )}
            </div>
          )}

          {/* ====== REPORTES ====== */}
          {activeTab === 'reports' && <ReportsView db={db} cycle={cycle} onUpdateTenant={(tid, field, val) => { const v = parseInt(val) || 0; setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, [field]: v } : t) })); }} onRemoveTenant={(tid) => { const tenant = db.tenants.find(t => t.id === tid); if (!tenant) return; const fee = db.config.defaultCleaningFee || 30000; if (!window.confirm(`¿Dar de baja a ${tenant.name}?\n\nクリーニング費: ¥${fee.toLocaleString()}`)) return; setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'inactive' as const, exit_date: new Date().toISOString().split('T')[0], cleaning_fee: fee } : t) })); }} onAddTenant={(tenantData) => { if (db.tenants.find(t => t.employee_id === tenantData.employee_id && t.status === 'active')) { alert('Este 社員No ya está asignado.'); return; } const newT: Tenant = { ...tenantData, id: generateId(), status: 'active' }; setDb(prev => ({ ...prev, tenants: [...prev.tenants, newT] })); }} onDeleteTenant={(tid) => { if (!window.confirm('¿Eliminar registro permanentemente?')) return; setDb(prev => ({ ...prev, tenants: prev.tenants.filter(t => t.id !== tid) })); }} />}

          {/* ====== IMPORT ====== */}
          {activeTab === 'import' && <ImportViewComponent isDragging={isDragging} importStatus={importStatus} previewSummary={previewSummary} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }} onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) processExcelFile(e.dataTransfer.files[0]); }} onFileChange={(e) => e.target.files?.length && processExcelFile(e.target.files[0])} onSave={saveToDatabase} />}

          {/* ====== SETTINGS ====== */}
          {activeTab === 'settings' && <SettingsView db={db} setDb={setDb} onDownloadBackup={downloadBackup} onRestoreBackup={restoreBackup} onReset={() => { if (window.confirm('¿Borrar todo?')) resetDb(); }} />}
        </main>
      </div>

      {/* MOBILE NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0d0f12]/95 backdrop-blur-lg border-t border-white/10 flex justify-around items-center h-20 z-50 px-2 pb-2 safe-area-bottom">
        <NavButtonMobile icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="HQ" />
        <NavButtonMobile icon={Building} active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} label="Prop." />
        <NavButtonMobile icon={Users} active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} label="社員" />
        <NavButtonMobile icon={FileText} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label="報告" />
        <NavButtonMobile icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Config" />
      </nav>

      {/* ====== MODAL: RENT MANAGER ====== */}
      <Modal isOpen={isRentManagerOpen} onClose={() => setIsRentManagerOpen(false)} title={`${selectedPropertyForRent?.name || ''} — Gestión de Rentas`} wide>
        {selectedPropertyForRent && (() => {
          const prop = db.properties.find(p => p.id === selectedPropertyForRent.id) || selectedPropertyForRent;
          const tenants = db.tenants.filter(t => t.property_id === prop.id && t.status === 'active');
          const totalRent = tenants.reduce((a, t) => a + (t.rent_contribution || 0), 0);
          const totalParking = tenants.reduce((a, t) => a + (t.parking_fee || 0), 0);
          const mode = prop.billing_mode || 'fixed';
          const totalCostProp = (prop.rent_cost || 0) + (prop.kanri_hi || 0) + (prop.parking_cost || 0);
          return (
            <div className="space-y-6">
              {/* STATS */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-800/50 p-3 rounded-xl border border-white/5 text-center"><div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Costo Real</div><div className="text-lg font-black text-red-400 font-mono">¥{totalCostProp.toLocaleString()}</div></div>
                <div className="bg-gray-800/50 p-3 rounded-xl border border-white/5 text-center"><div className="text-[9px] text-gray-500 uppercase font-bold mb-1">Objetivo UNS</div><div className="text-lg font-black text-white font-mono">¥{(prop.rent_price_uns || 0).toLocaleString()}</div></div>
                <div className="bg-green-500/10 p-3 rounded-xl border border-green-500/20 text-center"><div className="text-[9px] text-green-400 uppercase font-bold mb-1">Rentas</div><div className="text-lg font-black text-green-400 font-mono">¥{totalRent.toLocaleString()}</div></div>
                <div className="bg-blue-500/10 p-3 rounded-xl border border-blue-500/20 text-center"><div className="text-[9px] text-blue-400 uppercase font-bold mb-1">Parking</div><div className="text-lg font-black text-blue-400 font-mono">¥{totalParking.toLocaleString()}</div></div>
              </div>

              {/* BILLING MODE */}
              <div className="bg-gray-800/30 p-4 rounded-xl border border-white/5">
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-3 flex items-center gap-2"><Percent className="w-3 h-3"/> Modo de Cobro</div>
                <div className="flex gap-2">
                  <button onClick={() => { setDb(prev => ({ ...prev, properties: prev.properties.map(p => p.id === prop.id ? { ...p, billing_mode: 'split' as const } : p) })); setSelectedPropertyForRent({ ...prop, billing_mode: 'split' }); }} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${mode === 'split' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}><Calculator className="w-4 h-4"/> 均等割り (Dividir)</button>
                  <button onClick={() => { setDb(prev => ({ ...prev, properties: prev.properties.map(p => p.id === prop.id ? { ...p, billing_mode: 'fixed' as const } : p) })); setSelectedPropertyForRent({ ...prop, billing_mode: 'fixed' }); }} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${mode === 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}><Edit2 className="w-4 h-4"/> 個別設定 (Individual)</button>
                </div>
                {mode === 'split' && tenants.length > 0 && <p className="text-xs text-purple-300 mt-2 text-center">¥{(prop.rent_price_uns || 0).toLocaleString()} ÷ {tenants.length} personas = <span className="font-bold">¥{Math.floor((prop.rent_price_uns || 0) / tenants.length).toLocaleString()}</span>/persona</p>}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                {mode === 'split' && <button onClick={distributeRentEvenly} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition"><Calculator className="w-4 h-4"/> Aplicar División</button>}
                <button onClick={() => { setTenantForm({ employee_id: '', name: '', name_kana: '', company: '', property_id: prop.id, rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] }); setIsAddTenantModalOpen(true); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"><UserPlus className="w-4 h-4"/> Registrar Inquilino</button>
              </div>

              {/* TENANT TABLE - ACTIVE */}
              <div className="bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 text-[10px] text-gray-500 uppercase font-bold p-4 bg-black/20 border-b border-white/5">
                  <div className="col-span-4">Inquilino</div>
                  <div className="col-span-2 text-center">Entrada</div>
                  <div className="col-span-2 text-right">Renta (¥)</div>
                  <div className="col-span-2 text-right">日割り</div>
                  <div className="col-span-2 text-right pr-2">Parking</div>
                </div>
                <div className="p-2 space-y-2">
                  {tenants.length === 0 ? <p className="text-center text-gray-600 py-8 text-sm">Sin inquilinos. Registra uno con el botón de arriba.</p> : tenants.map(t => {
                    const pr = calculateProRata(t.rent_contribution, t.entry_date || '');
                    return (
                      <div key={t.id} className={`grid grid-cols-12 items-center p-3 rounded-xl border transition-all ${t.rent_contribution === 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                        <div className="col-span-4">
                          <div className="text-white text-sm font-bold truncate">{t.name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{t.employee_id}</div>
                          {t.company && <div className="text-[9px] text-cyan-400/70 truncate">派遣先: {t.company}</div>}
                          {t.rent_contribution === 0 && <div className="text-[9px] text-red-400 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> SIN PRECIO</div>}
                        </div>
                        <div className="col-span-2 text-center"><div className="text-[10px] text-gray-400 font-mono">{t.entry_date || '—'}</div></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-gray-900 text-white font-mono text-sm p-2 rounded-lg text-right border border-gray-700 focus:border-blue-500 outline-none transition" value={t.rent_contribution} onChange={(e) => handleUpdateRentDetails(t.id, 'rent_contribution', e.target.value)} /></div>
                        <div className="col-span-2 text-center">{pr.isProRata ? <div><div className="text-yellow-400 font-mono text-xs font-bold">¥{pr.amount.toLocaleString()}</div><div className="text-[9px] text-gray-500">{pr.days}/{pr.totalDays}日</div></div> : <span className="text-[10px] text-gray-600">全月</span>}</div>
                        <div className="col-span-2 flex items-center gap-1">
                          <input type="number" className="w-full bg-gray-900 text-blue-400 font-mono text-sm p-2 rounded-lg text-right border border-blue-900/30 focus:border-blue-500 outline-none transition" value={t.parking_fee} onChange={(e) => handleUpdateRentDetails(t.id, 'parking_fee', e.target.value)} />
                          <button onClick={() => removeTenant(t.id)} className="text-gray-600 hover:text-red-400 transition p-1 shrink-0" title="Dar de baja"><LogOut className="w-3.5 h-3.5"/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* TENANT HISTORY - INACTIVE */}
              {(() => {
                const inactiveTenants = db.tenants.filter(t => t.property_id === prop.id && t.status === 'inactive');
                if (inactiveTenants.length === 0) return null;
                return (
                  <div className="bg-gray-900/30 rounded-2xl border border-orange-500/10 overflow-hidden">
                    <div className="flex items-center gap-2 p-4 bg-orange-900/10 border-b border-orange-500/10">
                      <History className="w-4 h-4 text-orange-400" />
                      <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">Historial de Inquilinos ({inactiveTenants.length})</span>
                    </div>
                    <div className="grid grid-cols-12 text-[9px] text-gray-600 uppercase font-bold px-4 pt-3 pb-1">
                      <div className="col-span-3">Nombre</div>
                      <div className="col-span-2 text-center">入居</div>
                      <div className="col-span-2 text-center">退去</div>
                      <div className="col-span-2 text-right">最終家賃</div>
                      <div className="col-span-2 text-right">クリーニング費</div>
                      <div className="col-span-1"></div>
                    </div>
                    <div className="p-2 space-y-1">
                      {inactiveTenants.map(t => (
                        <div key={t.id} className="grid grid-cols-12 items-center p-3 rounded-xl bg-black/20 border border-white/5 opacity-70 hover:opacity-100 transition-opacity">
                          <div className="col-span-3">
                            <div className="text-gray-400 text-sm font-bold truncate">{t.name}</div>
                            <div className="text-[10px] text-gray-600 font-mono">{t.employee_id}</div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-[10px] text-gray-500 font-mono">{t.entry_date || '—'}</div>
                          </div>
                          <div className="col-span-2 text-center">
                            <div className="text-[10px] text-orange-400/70 font-mono">{t.exit_date || '—'}</div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-[10px] text-gray-500 font-mono">¥{(t.rent_contribution || 0).toLocaleString()}</div>
                          </div>
                          <div className="col-span-2 text-right">
                            <div className="text-[10px] text-red-400 font-mono font-bold">¥{(t.cleaning_fee || 0).toLocaleString()}</div>
                          </div>
                          <div className="col-span-1 text-right">
                            <button onClick={() => reactivateTenant(t.id)} className="text-gray-600 hover:text-green-400 transition p-1" title="Reactivar inquilino"><UserPlus className="w-3.5 h-3.5"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
      </Modal>

      {/* ====== MODAL: PROPERTY FORM ====== */}
      <Modal isOpen={isPropertyModalOpen} onClose={() => { setPropertyForm({...EMPTY_PROPERTY_FORM}); setIsPropertyModalOpen(false); }} title={propertyForm.id ? "Editar Propiedad" : "Nueva Propiedad"}>
        <form onSubmit={handleSaveProperty} className="space-y-6">
          <div className="grid grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-400 font-bold block mb-1.5 ml-1">Nombre Edificio</label><input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none transition" value={propertyForm.name} onChange={e => setPropertyForm({ ...propertyForm, name: e.target.value })} placeholder="Ej: Legend K" required /></div>
            <div><label className="text-xs text-blue-500 font-bold block mb-1.5 ml-1 flex items-center gap-1"><Hash className="w-3 h-3" /> No. Apt</label><input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-blue-400 font-mono focus:border-blue-500 outline-none transition" value={propertyForm.room_number} onChange={e => setPropertyForm({ ...propertyForm, room_number: e.target.value })} placeholder="204" /></div>

            {/* ADDRESS */}
            <div className="col-span-2 bg-gray-800/30 p-5 rounded-2xl border border-white/5">
              <label className="text-xs text-blue-500 font-bold block mb-4 uppercase flex items-center gap-2"><Map className="w-3 h-3" /> Dirección</label>
              <div className="grid grid-cols-12 gap-3 mb-3">
                <div className="col-span-4"><label className="text-[10px] text-gray-500 block mb-1">〒 Postal</label><input className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono outline-none focus:border-blue-500" placeholder="4710805" maxLength={8} value={propertyForm.postal_code} onChange={e => setPropertyForm({ ...propertyForm, postal_code: e.target.value })} /></div>
                <div className="col-span-8 flex items-end"><button type="button" onClick={fetchAddressFromZip} disabled={isSearchingAddress} className="bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold px-4 py-3 rounded-lg w-full flex items-center justify-center gap-2 disabled:opacity-50 transition">{isSearchingAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}{isSearchingAddress ? 'Buscando...' : 'Autocompletar'}</button></div>
              </div>
              {addressSearchError && <div className="text-[10px] text-red-400 mb-3 flex items-center gap-2 bg-red-900/20 p-2 rounded"><AlertCircle className="w-3 h-3" /><span>{addressSearchError}</span><button type="button" onClick={fetchAddressFromZip} className="text-blue-400 underline hover:text-blue-300 ml-auto shrink-0">Reintentar</button></div>}
              <div className="space-y-3">
                <input className="w-full bg-black border border-gray-700 p-3 rounded-lg text-gray-300 focus:border-blue-500 outline-none" value={propertyForm.address_auto} onChange={e => setPropertyForm({ ...propertyForm, address_auto: e.target.value })} placeholder="都道府県+市区町村 (Auto)" />
                <input className="w-full bg-black border border-gray-700 p-3 rounded-lg text-white font-bold focus:border-blue-500 outline-none" value={propertyForm.address_detail} onChange={e => setPropertyForm({ ...propertyForm, address_detail: e.target.value })} placeholder="番地 / 建物名" />
              </div>
            </div>

            {/* COSTS */}
            <div className="col-span-2 bg-gray-800/30 p-5 rounded-2xl border border-white/5">
              <h4 className="text-green-400 text-xs font-bold mb-4 uppercase flex items-center gap-2"><DollarSign className="w-3 h-3" /> Estructura de Costos (不動産屋に払う)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><label className="text-[10px] text-gray-500 block mb-1">家賃 (Renta)</label><input type="number" min="0" step="1000" className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono focus:border-green-500 outline-none" value={propertyForm.rent_cost} onChange={e => setPropertyForm({ ...propertyForm, rent_cost: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-gray-500 block mb-1">管理費</label><input type="number" min="0" step="500" className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono focus:border-green-500 outline-none" value={propertyForm.kanri_hi} onChange={e => setPropertyForm({ ...propertyForm, kanri_hi: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-blue-400 block mb-1">駐車場代</label><input type="number" min="0" step="500" className="w-full bg-black border border-blue-900/30 p-2.5 rounded-lg text-blue-200 font-mono focus:border-blue-500 outline-none" value={propertyForm.parking_cost} onChange={e => setPropertyForm({ ...propertyForm, parking_cost: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-yellow-500 block mb-1 font-bold">Precio UNS</label><input type="number" min="0" step="1000" className="w-full bg-black border border-yellow-900/30 p-2.5 rounded-lg text-yellow-400 font-mono font-bold focus:border-yellow-500 outline-none" value={propertyForm.rent_price_uns} onChange={e => setPropertyForm({ ...propertyForm, rent_price_uns: Number(e.target.value) || 0 })} /></div>
              </div>
            </div>

            {/* BILLING MODE */}
            <div className="col-span-2 bg-gray-800/30 p-5 rounded-2xl border border-white/5">
              <h4 className="text-purple-400 text-xs font-bold mb-3 uppercase flex items-center gap-2"><Percent className="w-3 h-3" /> Modo de Cobro</h4>
              <div className="flex gap-3">
                <button type="button" onClick={() => setPropertyForm({ ...propertyForm, billing_mode: 'split' })} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${propertyForm.billing_mode === 'split' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}><Calculator className="w-4 h-4" /> 均等割り</button>
                <button type="button" onClick={() => setPropertyForm({ ...propertyForm, billing_mode: 'fixed' })} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${propertyForm.billing_mode === 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}><Edit2 className="w-4 h-4" /> 個別設定</button>
              </div>
            </div>

            <div><label className="text-xs text-gray-400 block mb-1 ml-1">Tipo</label><input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white outline-none" value={propertyForm.type} onChange={e => setPropertyForm({ ...propertyForm, type: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400 block mb-1 ml-1">Capacidad</label><input type="number" min="1" max="20" className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white outline-none" value={propertyForm.capacity} onChange={e => setPropertyForm({ ...propertyForm, capacity: Number(e.target.value) || 1 })} /></div>
          </div>
          <div className="border-t border-gray-800 pt-6 grid grid-cols-2 gap-5">
            <div><label className="text-xs text-gray-400 block mb-1">Admin</label><input className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.manager_name} onChange={e => setPropertyForm({ ...propertyForm, manager_name: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Tel Admin</label><input className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.manager_phone} onChange={e => setPropertyForm({ ...propertyForm, manager_phone: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Inicio Contrato</label><input type="date" className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.contract_start} onChange={e => setPropertyForm({ ...propertyForm, contract_start: e.target.value })} /></div>
            <div><label className="text-xs text-gray-400 block mb-1">Fin Contrato</label><input type="date" className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.contract_end} onChange={e => setPropertyForm({ ...propertyForm, contract_end: e.target.value })} /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => { setPropertyForm({...EMPTY_PROPERTY_FORM}); setIsPropertyModalOpen(false); }} className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">Cancelar</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition hover:-translate-y-1">Guardar</button>
          </div>
        </form>
      </Modal>

      {/* ====== MODAL: ADD TENANT ====== */}
      <Modal isOpen={isAddTenantModalOpen} onClose={() => { setTenantForm({...EMPTY_TENANT_FORM}); setIsIdFound(false); setIsAddTenantModalOpen(false); }} title="Registrar Inquilino">
        <form onSubmit={handleAddTenant} className="space-y-6">
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-white/5">
            <label className="text-xs text-blue-500 font-bold block mb-2 uppercase tracking-wide">Paso 1: 社員No (ID Empleado)</label>
            <div className="relative">
              <input type="text" required autoFocus placeholder="Escribe el ID del empleado..." className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white text-xl font-mono focus:border-blue-500 outline-none transition pl-12" value={tenantForm.employee_id} onChange={e => setTenantForm({ ...tenantForm, employee_id: e.target.value })} />
              <div className="absolute left-4 top-4 text-gray-500"><User className="w-6 h-6" /></div>
              {isIdFound && <div className="absolute right-4 top-4 text-green-500 animate-in zoom-in"><Check className="w-6 h-6" /></div>}
            </div>
            {isIdFound && <div className="mt-2 space-y-1"><p className="text-green-400 text-xs font-medium flex items-center gap-1"><Database className="w-3 h-3" /> Empleado encontrado.</p>{tenantForm.company && <p className="text-cyan-400 text-xs flex items-center gap-1"><Building className="w-3 h-3" /> 派遣先: {tenantForm.company}</p>}</div>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs text-gray-400 block mb-1">Nombre</label><input className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl text-white" value={tenantForm.name} onChange={e => setTenantForm({ ...tenantForm, name: e.target.value })} required /></div>
            <div><label className="text-xs text-gray-400 block mb-1">カナ</label><input className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl text-white" value={tenantForm.name_kana} onChange={e => setTenantForm({ ...tenantForm, name_kana: e.target.value })} /></div>
          </div>

          {/* ENTRY DATE */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-white/5">
            <label className="text-xs text-blue-500 font-bold block mb-3 uppercase tracking-wide flex items-center gap-2"><CalendarDays className="w-3 h-3" /> Paso 2: Fecha de Entrada (入居日)</label>
            <input type="date" required className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white font-mono text-lg focus:border-blue-500 outline-none" value={tenantForm.entry_date} onChange={e => setTenantForm({ ...tenantForm, entry_date: e.target.value })} />
            {tenantForm.entry_date && (() => {
              const d = new Date(tenantForm.entry_date);
              const now = new Date();
              if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && d.getDate() > 1) {
                const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const days = last - d.getDate() + 1;
                return <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1"><CalendarDays className="w-3 h-3" /> 日割り計算: {days}日分 de {last}日 (entrada a mitad de mes)</p>;
              }
              return null;
            })()}
          </div>

          {/* PRICING */}
          <div className="bg-gray-800/50 p-6 rounded-2xl border border-white/5">
            <label className="text-xs text-blue-500 font-bold block mb-4 uppercase tracking-wide">Paso 3: Precio Mensual</label>
            <div className="grid grid-cols-2 gap-6">
              <div><label className="text-xs text-gray-400 block mb-1">Renta (¥/月)</label><input type="number" min="0" step="1000" className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white font-mono text-lg focus:border-blue-500 outline-none" value={tenantForm.rent_contribution} onChange={e => setTenantForm({ ...tenantForm, rent_contribution: Number(e.target.value) || 0 })} /></div>
              <div><label className="text-xs text-blue-400 block mb-1">Parking (¥/月)</label><input type="number" min="0" step="500" className="w-full bg-black border border-blue-900/50 p-3 rounded-xl text-blue-200 font-mono text-lg focus:border-blue-500 outline-none" value={tenantForm.parking_fee} onChange={e => setTenantForm({ ...tenantForm, parking_fee: Number(e.target.value) || 0 })} /></div>
            </div>
            {tenantForm.entry_date && parseInt(tenantForm.rent_contribution) > 0 && (() => {
              const pr = calculateProRata(parseInt(tenantForm.rent_contribution), tenantForm.entry_date);
              if (pr.isProRata) return <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-xl"><p className="text-yellow-400 text-sm font-bold flex items-center gap-2"><CalendarDays className="w-4 h-4" /> 日割り este mes: ¥{pr.amount.toLocaleString()} ({pr.days}日分)</p></div>;
              return null;
            })()}
          </div>

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={() => { setTenantForm({...EMPTY_TENANT_FORM}); setIsIdFound(false); setIsAddTenantModalOpen(false); }} className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">Cancelar</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 transition hover:-translate-y-1">Confirmar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
