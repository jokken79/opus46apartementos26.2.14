import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Users,
  LayoutDashboard,
  Search,
  Database,
  UploadCloud,
  PlusCircle,
  X,
  FileCheck,
  AlertCircle,
  Calculator,
  DollarSign,
  UserPlus,
  Save,
  Calendar,
  Check,
  Trash2,
  Phone,
  User,
  History,
  MapPin,
  Edit2,
  Car,
  Map,
  Hash,
  Loader2,
  Bell,
  TrendingUp,
  ArrowRight,
  Download,
  Upload,
  Settings,
  Clock,
  Mail,
  Award
} from 'lucide-react';

// --- INYECCIÓN DE LIBRERÍA EXCEL (SheetJS) ---
const useLoadSheetJS = () => {
  useEffect(() => {
    if (!(window as any).XLSX) {
      const script = document.createElement('script');
      script.src = "https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);
};

// --- TIPOS ---
interface Property {
  id: number;
  name: string;
  room_number?: string;
  postal_code?: string;
  address: string;
  address_auto?: string;
  address_detail?: string;
  manager_name?: string;
  manager_phone?: string;
  contract_start?: string;
  contract_end?: string;
  type?: string;
  capacity: number;
  rent_cost: number;
  rent_price_uns: number;
  parking_cost: number;
}

interface Tenant {
  id: number;
  employee_id: string;
  name: string;
  name_kana: string;
  property_id: number;
  rent_contribution: number;
  parking_fee: number;
  entry_date?: string;
  status: 'active' | 'inactive';
}

interface Employee {
  id: string;
  name: string;
  name_kana: string;
  company: string;
  full_data: any;
}

interface AppConfig {
  companyName: string;
  closingDay: number;
}

interface AppDatabase {
  properties: Property[];
  tenants: Tenant[];
  employees: Employee[];
  config: AppConfig;
}

interface AlertItem {
  type: 'warning' | 'danger';
  msg: string;
}

// --- DATOS CORPORATIVOS UNS ---
const COMPANY_INFO = {
  name_ja: "ユニバーサル企画株式会社",
  name_en: "UNS-KIKAKU",
  legal_name: "ユニバーサル企画 株式会社",
  postal_code: "461-0025",
  full_address: "愛知県名古屋市東区徳川2-18-18",
  phone: "052-938-8840",
  mobile: "080-7376-1988",
  email: "infoapp@uns-kikaku.com",
  website: "www.uns-kikaku.com",
  representative: "中山 雅和",
  licenses: [
    { name: "労働者派遣事業", number: "派 23-303669" },
    { name: "登録支援機関", number: "21登-006367" },
    { name: "古物商許可証", number: "愛知県公安委員会 第541032001..." }
  ],
  logo_url: "https://uns-kikaku.com/wp-content/uploads/2024/02/rogo-300x123.png"
};

// --- DATOS INICIALES ---
const INITIAL_DB: AppDatabase = {
  properties: [],
  tenants: [],
  employees: [],
  config: {
      companyName: COMPANY_INFO.name_en,
      closingDay: 0
  }
};

// --- COMPONENTES UI ---

const GlassCard = ({ children, className = "", hoverEffect = true }: { children: React.ReactNode; className?: string; hoverEffect?: boolean }) => (
  <div className={`
    relative overflow-hidden rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl
    ${hoverEffect ? 'transition-all duration-300 hover:border-blue-500/30 hover:bg-[#20242c] hover:shadow-blue-900/10 hover:-translate-y-1' : ''}
    ${className}
  `}>
    <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>
    {children}
  </div>
);

const StatCard = ({ title, value, subtext, icon: Icon, trend }: { title: string; value: string; subtext: string; icon: any; trend?: 'up' | 'down' }) => (
  <GlassCard hoverEffect={true} className="p-5">
    <div className="flex justify-between items-start mb-3">
      <div className="p-2.5 bg-gradient-to-br from-gray-800 to-black rounded-xl border border-white/5 shadow-inner">
        <Icon className="text-blue-400 w-5 h-5" />
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${trend === 'up' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
          {trend === 'up' ? '▲' : '▼'}
        </span>
      )}
    </div>
    <div className="space-y-1">
        <h3 className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">{title}</h3>
        <div className="text-3xl font-black text-white tracking-tight leading-none">{value}</div>
        <div className="text-xs text-gray-500 font-medium">{subtext}</div>
    </div>
  </GlassCard>
);

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#15171c] border border-blue-500/20 rounded-2xl w-full max-w-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto ring-1 ring-white/10 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center p-6 border-b border-gray-800/50 sticky top-0 bg-[#15171c]/95 backdrop-blur z-20">
          <h3 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition bg-gray-900/50 p-2 rounded-full hover:bg-gray-800 border border-transparent hover:border-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 md:p-8 space-y-6">{children}</div>
      </div>
    </div>
  );
};

const NavButton = ({ icon: Icon, active, onClick, label }: { icon: any; active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`
      relative group w-12 h-12 flex flex-col items-center justify-center rounded-xl transition-all duration-300
      ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-110' : 'text-gray-500 hover:text-white hover:bg-white/10'}
    `}
  >
    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="absolute left-14 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10 pointer-events-none z-50">
      {label}
    </span>
  </button>
);

const NavButtonMobile = ({ icon: Icon, active, onClick, label }: { icon: any; active: boolean; onClick: () => void; label: string }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all ${active ? 'text-blue-400' : 'text-gray-500'}`}
  >
    <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
    <span className="text-[10px] font-bold tracking-wide">{label}</span>
  </button>
);

// --- VISTA CONFIGURACIÓN ---
const SettingsView = ({ db, setDb, onDownloadBackup, onRestoreBackup, onReset }: {
  db: AppDatabase;
  setDb: (db: AppDatabase) => void;
  onDownloadBackup: () => void;
  onRestoreBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void
}) => {
    const [localConfig, setLocalConfig] = useState(db.config || INITIAL_DB.config);

    const handleSaveConfig = () => {
        setDb({ ...db, config: localConfig });
        alert('Configuración guardada correctamente.');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
            {/* CABECERA CORPORATIVA */}
            <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-r from-[#1a1d24] to-[#0f0f12] p-8 rounded-3xl border border-white/5 shadow-2xl">
                <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img src={COMPANY_INFO.logo_url} alt="UNS Logo" className="h-12 object-contain" onError={(e) => { const img = e.currentTarget; img.onerror = null; img.src = "https://via.placeholder.com/150x60?text=UNS-KIKAKU"; }} />
                </div>
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

            {/* LICENCIAS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {COMPANY_INFO.licenses.map((lic, idx) => (
                    <div key={idx} className="bg-[#1a1d24] border border-white/5 p-4 rounded-xl flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><Award className="w-5 h-5"/></div>
                        <div>
                            <div className="text-[10px] text-gray-500 uppercase font-bold">{lic.name}</div>
                            <div className="text-sm text-white font-mono">{lic.number}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-800 my-4"></div>

            {/* SECCIÓN FINANCIERA */}
            <GlassCard className="p-6">
                <h3 className="text-lg font-bold text-green-500 mb-4 flex items-center gap-2"><Clock className="w-5 h-5"/> Ciclo de Facturación</h3>
                <div>
                    <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">Día de Cierre (締め日)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[0, 15, 20, 25].map(day => (
                            <button
                                key={day}
                                onClick={() => setLocalConfig({...localConfig, closingDay: day})}
                                className={`p-3 rounded-xl border text-sm font-bold transition-all ${localConfig.closingDay === day ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            >
                                {day === 0 ? 'Fin de Mes (末日)' : `Día ${day} (日)`}
                            </button>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">* Esto afectará la fecha mostrada en el Dashboard.</p>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={handleSaveConfig} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 text-sm">
                        <Save className="w-4 h-4" /> Guardar Preferencias
                    </button>
                </div>
            </GlassCard>

            {/* ZONA DE DATOS */}
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Database className="w-6 h-6 text-blue-500"/> Gestión de Datos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="p-6 border-blue-500/30 bg-blue-900/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-full text-blue-400"><Download className="w-6 h-6" /></div>
                        <div><h3 className="text-lg font-bold text-white">Respaldo Local</h3><p className="text-xs text-blue-200">Guardar .JSON en PC.</p></div>
                    </div>
                    <button onClick={onDownloadBackup} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-blue-500/20 flex justify-center gap-2"><Save className="w-4 h-4" /> Descargar</button>
                </GlassCard>
                <GlassCard className="p-6 border-purple-500/30 bg-purple-900/10">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-full text-purple-400"><Upload className="w-6 h-6" /></div>
                        <div><h3 className="text-lg font-bold text-white">Restaurar</h3><p className="text-xs text-purple-200">Cargar .JSON previo.</p></div>
                    </div>
                    <label className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-500/20 flex justify-center gap-2 cursor-pointer text-center">
                        <UploadCloud className="w-4 h-4" /><span>Subir Archivo</span><input type="file" accept=".json" className="hidden" onChange={onRestoreBackup} />
                    </label>
                </GlassCard>
            </div>
            <div className="mt-8 pt-4 border-t border-red-900/30">
                <button onClick={onReset} className="w-full text-red-500 hover:text-red-400 hover:bg-red-900/10 p-4 rounded-xl text-sm flex gap-2 items-center justify-center transition-colors uppercase tracking-widest font-bold border border-transparent hover:border-red-900/50">
                    <Trash2 className="w-5 h-5"/> Resetear Sistema de Fábrica
                </button>
            </div>
        </div>
    );
};

// --- VISTA IMPORTACIÓN ---
const ImportView = ({ isDragging, importStatus, previewSummary, onDragOver, onDragLeave, onDrop, onFileChange, onSave }: {
  isDragging: boolean;
  importStatus: { type: string; msg: string };
  previewSummary: string;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-20">
        <div className="flex flex-col items-center justify-center py-10">
            <h2 className="text-3xl font-black text-white mb-2">Centro de Sincronización</h2>
            <p className="text-gray-500 max-w-md text-center">Importa tus archivos Excel maestros para actualizar la base de datos.</p>
        </div>

        <GlassCard className="p-10 text-center border-dashed border-2 border-gray-700 bg-transparent relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none"></div>
            <input type="file" id="fileUpload" className="hidden" onChange={onFileChange} accept=".xlsx, .xlsm" />
            <label htmlFor="fileUpload" onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} className={`flex flex-col items-center justify-center h-64 cursor-pointer transition-all duration-300 rounded-2xl relative z-10 ${isDragging ? 'scale-105' : ''}`}>
                {importStatus.type === 'loading' ? (
                    <div className="animate-pulse flex flex-col items-center gap-4"><Loader2 className="w-20 h-20 text-blue-500 animate-spin" /><p className="text-blue-500 font-bold text-2xl">Procesando Datos...</p></div>
                ) : importStatus.type === 'success' ? (
                    <div className="flex flex-col items-center gap-4"><div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(34,197,94,0.4)]"><FileCheck className="w-12 h-12 text-green-400" /></div><div><p className="text-green-400 font-bold text-3xl">Archivo Validado</p><p className="text-gray-400 mt-2 text-lg">Listo para sincronizar</p></div></div>
                ) : (
                    <div className="flex flex-col items-center gap-6 group">
                        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 shadow-2xl border border-white/5 group-hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]">
                            <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-white transition-colors" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Arrastra tu Excel aquí</p>
                            <p className="text-sm text-gray-500">Soporta formato .xlsx y .xlsm</p>
                        </div>
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
                        <h3 className="text-2xl font-bold text-white mb-3">Confirmación de Importación</h3>
                        <div className="bg-black/50 p-6 rounded-xl border border-white/5 mb-8">
                            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{String(previewSummary)}</pre>
                        </div>
                        <button onClick={onSave} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:shadow-green-500/20 text-lg">
                            <span>Ejecutar Sincronización</span>
                            <ArrowRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);

// --- APP PRINCIPAL ---

export default function App() {
  useLoadSheetJS();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const [db, setDb] = useState<AppDatabase>(() => {
    try {
        const saved = localStorage.getItem('uns_db_v6_0');
        return saved ? JSON.parse(saved) : INITIAL_DB;
    } catch (e) {
        return INITIAL_DB;
    }
  });

  useEffect(() => {
    localStorage.setItem('uns_db_v6_0', JSON.stringify(db));
  }, [db]);

  // Estados
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState({ type: '', msg: '' });
  const [previewData, setPreviewData] = useState<any>([]);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState('');
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');

  // Modals & Forms
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [isRentManagerOpen, setIsRentManagerOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [selectedPropertyForRent, setSelectedPropertyForRent] = useState<Property | null>(null);
  const [isIdFound, setIsIdFound] = useState(false);

  const [propertyViewMode, setPropertyViewMode] = useState('active');

  const [tenantForm, setTenantForm] = useState<any>({
    employee_id: '', name: '', name_kana: '', property_id: '',
    rent_contribution: 0, parking_fee: 0,
    entry_date: new Date().toISOString().split('T')[0]
  });

  const [propertyForm, setPropertyForm] = useState<any>({
    id: null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '',
    manager_name: '', manager_phone: '',
    contract_start: '', contract_end: '', type: '1K', capacity: 2,
    rent_cost: 0, rent_price_uns: 0, parking_cost: 0
  });

  // --- LOGIC: FECHAS ---
  const getCurrentBillingCycle = () => {
    const now = new Date();
    const closingDay = db.config?.closingDay || 0;
    let start: Date, end: Date;
    if (closingDay === 0) {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
        if (now.getDate() <= closingDay) {
            start = new Date(now.getFullYear(), now.getMonth() - 1, closingDay + 1);
            end = new Date(now.getFullYear(), now.getMonth(), closingDay);
        } else {
            start = new Date(now.getFullYear(), now.getMonth(), closingDay + 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, closingDay);
        }
    }
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return {
        start: start.toLocaleDateString('es-ES', options),
        end: end.toLocaleDateString('es-ES', options),
        month: now.toLocaleString('es-ES', { month: 'long' }).toUpperCase()
    };
  };
  const cycle = getCurrentBillingCycle();

  // --- LOGIC: METRICS ---
  const dashboardData = useMemo(() => {
    const activeProps = db.properties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date());
    const totalProperties = activeProps.length;
    const occupiedCount = db.tenants.filter(t => t.property_id !== null && t.status === 'active').length;
    const totalCapacity = activeProps.reduce((a, b) => a + (b.capacity || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedCount / totalCapacity) * 100) : 0;

    const totalRentCollected = db.tenants.reduce((acc, t) => acc + (t.status === 'active' ? t.rent_contribution : 0), 0);
    const totalParkingCollected = db.tenants.reduce((acc, t) => acc + (t.status === 'active' ? t.parking_fee : 0), 0);
    const totalCollected = totalRentCollected + totalParkingCollected;
    const totalPropCost = activeProps.reduce((acc, p) => acc + (p.rent_cost || 0) + (p.parking_cost || 0), 0);
    const totalTargetUNS = activeProps.reduce((acc, p) => acc + (p.rent_price_uns || 0), 0);
    const profit = totalCollected - totalPropCost;

    const alerts: AlertItem[] = [];
    const today = new Date();
    activeProps.forEach(p => {
        if (p.contract_end) {
            const endDate = new Date(p.contract_end);
            const diffTime = Math.abs(endDate.getTime() - today.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 60) alerts.push({ type: 'warning', msg: `Contrato de ${p.name} vence en ${diffDays} días.` });
        }
    });
    const zeroRentTenants = db.tenants.filter(t => t.status === 'active' && t.rent_contribution === 0);
    if (zeroRentTenants.length > 0) alerts.push({ type: 'danger', msg: `${zeroRentTenants.length} inquilinos tienen renta a ¥0.` });

    return { totalProperties, occupiedCount, totalCapacity, occupancyRate, profit, totalCollected, totalPropCost, totalTargetUNS, alerts };
  }, [db]);

  // --- LOGIC: BACKUP & RESTORE ---
  const downloadBackup = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `UNS_Estate_Backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const restoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const restoredDb = JSON.parse(e.target?.result as string);
              if (restoredDb.properties && Array.isArray(restoredDb.properties)) {
                  setDb(restoredDb);
                  alert('¡Sistema restaurado con éxito!');
              } else {
                  alert('Error: Archivo de respaldo inválido.');
              }
          } catch (err) {
              alert('Error al leer el archivo de respaldo.');
          }
      };
      reader.readAsText(file);
  };

  // --- LOGIC: EMPLOYEE LOOKUP ---
  useEffect(() => {
    if (tenantForm.employee_id.length > 2) {
        const found = db.employees.find(e => String(e.id) === String(tenantForm.employee_id));
        if (found) {
            setTenantForm((prev: any) => ({ ...prev, name: found.name, name_kana: found.name_kana || '' }));
            setIsIdFound(true);
        } else { setIsIdFound(false); }
    } else { setIsIdFound(false); }
  }, [tenantForm.employee_id, db.employees]);

  // --- LOGIC: ADDRESS ---
  const fetchAddressFromZip = async () => {
    setAddressSearchError('');
    const zip = propertyForm.postal_code.replace(/-/g, '');
    if (zip.length !== 7) { setAddressSearchError('Ingresa 7 dígitos exactos.'); return; }
    setIsSearchingAddress(true);
    try {
        const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`);
        const data = await response.json();
        if (data.results) {
            const res = data.results[0];
            setPropertyForm((prev: any) => ({ ...prev, address_auto: `${res.address1}${res.address2}${res.address3}` }));
        } else { setAddressSearchError('Código no encontrado.'); }
    } catch (error) { setAddressSearchError('Error de conexión.'); } finally { setIsSearchingAddress(false); }
  };

  const filteredProperties = useMemo(() => {
      const term = searchTerm.toLowerCase();
      if (!term) return db.properties;
      return db.properties.filter(p =>
          p.name.toLowerCase().includes(term) ||
          (p.room_number && p.room_number.includes(term)) ||
          p.address.toLowerCase().includes(term)
      );
  }, [db.properties, searchTerm]);

  // --- ACTIONS ---
  const openRentManager = (property: Property) => {
    setSelectedPropertyForRent(property);
    setIsRentManagerOpen(true);
  };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const newDb: AppDatabase = JSON.parse(JSON.stringify(db));
    const fullAddress = propertyForm.postal_code ? `〒${propertyForm.postal_code} ${propertyForm.address_auto} ${propertyForm.address_detail}` : `${propertyForm.address_auto} ${propertyForm.address_detail}`;
    const cleanProp = {
        ...propertyForm,
        address: fullAddress.trim(),
        capacity: parseInt(propertyForm.capacity) || 0,
        rent_cost: parseInt(propertyForm.rent_cost) || 0,
        rent_price_uns: parseInt(propertyForm.rent_price_uns) || 0,
        parking_cost: parseInt(propertyForm.parking_cost) || 0
    };
    if (propertyForm.id) {
        const idx = newDb.properties.findIndex(p => p.id === propertyForm.id);
        if (idx >= 0) newDb.properties[idx] = cleanProp;
    } else { newDb.properties.push({ ...cleanProp, id: Date.now() }); }
    setDb(newDb); setIsPropertyModalOpen(false);
  };

  const handleUpdateRentDetails = (tenantId: number, field: string, value: string) => {
    const val = parseInt(value) || 0;
    setDb(prev => ({
      ...prev,
      tenants: prev.tenants.map(t => t.id === tenantId ? { ...t, [field]: val } : t)
    }));
  };

  const distributeRentEvenly = () => {
    if (!selectedPropertyForRent) return;
    const tenantsInProp = db.tenants.filter(t => t.property_id === selectedPropertyForRent.id && t.status === 'active');
    if (tenantsInProp.length === 0) return;
    const split = Math.floor(selectedPropertyForRent.rent_price_uns / tenantsInProp.length);
    setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => (t.property_id === selectedPropertyForRent.id && t.status === 'active') ? { ...t, rent_contribution: split } : t) }));
  };

  const handleAddTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (db.tenants.find(t => t.employee_id === tenantForm.employee_id && t.status === 'active')) return alert('ID ya asignado.');
    const newT: Tenant = { id: Date.now(), ...tenantForm, property_id: parseInt(tenantForm.property_id),
                   rent_contribution: parseInt(tenantForm.rent_contribution), parking_fee: parseInt(tenantForm.parking_fee), status: 'active' };
    setDb(prev => ({ ...prev, tenants: [...prev.tenants, newT] })); setIsAddTenantModalOpen(false);
    setTenantForm({ employee_id: '', name: '', name_kana: '', property_id: '', rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] });
  };

  // --- IMPORT ---
  const processExcelFile = (file: File) => {
    setImportStatus({ type: 'loading', msg: 'Analizando...' }); setPreviewData([]); setDetectedType(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const XLSX = (window as any).XLSX;
        const workbook = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
        const sheetNames: string[] = workbook.SheetNames;
        let payload = { type: '', data: [] as any, summary: '' };

        const empSheet = sheetNames.find(n => n.includes('Genzai') || n.includes('Ukeoi'));
        const propSheet = sheetNames.find(n => n.includes('会社寮情報'));
        const tenantSheet = sheetNames.find(n => n.includes('入居者一覧'));

        if (empSheet) {
            const data = XLSX.utils.sheet_to_json(workbook.Sheets[empSheet], { defval: "" });
            payload = { type: 'employees', data, summary: `Maestro Empleados (${empSheet}): ${data.length} filas detectadas.` };
        } else if (propSheet || tenantSheet) {
            let combined: any = { properties: [], tenants: [] };
            let txt = 'Gestión de Renta Detectada:\n';
            if (propSheet) { const p = XLSX.utils.sheet_to_json(workbook.Sheets[propSheet], { defval: "" }); combined.properties = p; txt += `- ${p.length} Propiedades en '${propSheet}'.\n`; }
            if (tenantSheet) { const t = XLSX.utils.sheet_to_json(workbook.Sheets[tenantSheet], { defval: "" }); combined.tenants = t; txt += `- ${t.length} Inquilinos en '${tenantSheet}'.`; }
            payload = { type: 'rent_management', data: combined, summary: txt };
        } else { setImportStatus({ type: 'error', msg: 'Formato desconocido. Use los archivos maestros.' }); return; }

        setPreviewData(payload.data);
        setDetectedType(payload.type);
        setPreviewSummary(payload.summary);
        setImportStatus({ type: 'success', msg: 'Archivo Válido.' });
      } catch (err) { setImportStatus({ type: 'error', msg: 'Error de lectura de archivo.' }); }
    };
    reader.readAsArrayBuffer(file);
  };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) processExcelFile(e.dataTransfer.files[0]); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const saveToDatabase = () => {
      const newDb: AppDatabase = JSON.parse(JSON.stringify(db));
      let tabRedirect = 'dashboard';

      if (detectedType === 'employees') {
          previewData.forEach((row: any) => {
              const id = row['社員No'] || row['ID']; const name = row['氏名'] || row['Name']; if (!id || !name) return;
              const emp: Employee = { id: String(id).trim(), name: String(name).trim(), name_kana: String(row['カナ'] || ''), company: String(row['派遣先'] || ''), full_data: row };
              const idx = newDb.employees.findIndex(e => e.id === emp.id); if (idx >= 0) newDb.employees[idx] = emp; else newDb.employees.push(emp);
          });
          tabRedirect = 'employees';
      } else if (detectedType === 'rent_management') {
          const { properties, tenants } = previewData;
          properties.forEach((row: any, index: number) => {
              const name = row['ｱﾊﾟｰﾄ'] || row['物件名']; if (!name) return;
              const existing = newDb.properties.find(p => p.name === name);
              const pid = existing ? existing.id : (Date.now() + index);
              const pObj: Property = {
                  id: pid, name: String(name).trim(),
                  address: String(row['住所'] || '').trim(), address_auto: String(row['住所'] || '').trim(),
                  capacity: parseInt(row['入居人数'] || 2) || 2, rent_cost: parseInt(row['家賃'] || 0), rent_price_uns: parseInt(row['USN家賃'] || 0),
                  parking_cost: parseInt(row['駐車場代'] || 0), contract_start: row['契約開始日'] || '', contract_end: row['契約終了'] || ''
              };
              if (existing) Object.assign(existing, pObj); else newDb.properties.push(pObj);
          });
          tenants.forEach((row: any, index: number) => {
              const apt = row['ｱﾊﾟｰﾄ']; const kana = row['カナ']; if (!apt || !kana) return;
              const prop = newDb.properties.find(p => p.name === apt); if (!prop) return;
              const exists = newDb.tenants.find(t => t.name_kana === kana && t.property_id === prop.id);
              if (!exists) {
                  newDb.tenants.push({
                      id: Date.now() + index, employee_id: `IMP-${index}`, name: kana, name_kana: kana, property_id: prop.id,
                      rent_contribution: parseInt(row['家賃'] || 0), parking_fee: parseInt(row['駐車場'] || 0), entry_date: row['入居'] || new Date().toISOString().split('T')[0], status: 'active'
                  });
              }
          });
          tabRedirect = 'properties';
      }
      setDb(newDb);
      setPreviewData([]);
      setDetectedType(null);
      setImportStatus({type:'', msg:''});
      setActiveTab(tabRedirect);
  };

  const generateExcel = (type: string) => {
      const XLSX = (window as any).XLSX;
      if (!XLSX) return alert('Cargando librería...');
      const workbook = XLSX.utils.book_new();
      let data: any[] = []; let fileName = '';
      if (type === 'management') {
          fileName = `Gestion_Completa_${cycle.month}.xlsx`;
          const activeProps = db.properties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date());
          activeProps.forEach(p => {
              const tenants = db.tenants.filter(t => t.property_id === p.id && t.status === 'active');
              const pName = p.room_number ? `${p.name} ${p.room_number}` : p.name;
              const base = { 'Apartamento': pName, 'No. Apt': p.room_number||'', 'Dirección': p.address, 'Admin': p.manager_name, 'Tel': p.manager_phone, 'Inicio': p.contract_start, 'Fin': p.contract_end, 'Alquiler Real': p.rent_cost, 'Precio UNS': p.rent_price_uns, 'Costo Parking': p.parking_cost };
              if (tenants.length === 0) data.push({ ...base, 'Estado': 'VACÍO', 'Inquilino': '', 'Renta': 0, 'Parking': 0 });
              else tenants.forEach(t => data.push({ ...base, 'Estado': 'OCUPADO', 'Inquilino': `${t.employee_id} ${t.name}`, 'Renta': t.rent_contribution, 'Parking': t.parking_fee }));
          });
      } else {
          fileName = `Contabilidad_${cycle.month}.xlsx`;
          data = db.tenants.filter(t => t.status === 'active').map(t => {
              const prop = db.properties.find(p => p.id === t.property_id);
              const emp = db.employees.find(e => e.id === t.employee_id);
              return { 'ID': t.employee_id, 'Nombre': t.name, 'Kana': t.name_kana, 'Compañía': emp?.company||'', 'Apartamento': prop?.name||'', 'Renta (¥)': t.rent_contribution, 'Parking (¥)': t.parking_fee, 'TOTAL DESCUENTO (¥)': t.rent_contribution + (t.parking_fee || 0) };
          });
      }
      const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = Object.keys(data[0]||{}).map(() => ({wch:20}));
      XLSX.utils.book_append_sheet(workbook, ws, "Data"); XLSX.writeFile(workbook, fileName);
  };

  // Keep generateExcel available for future use
  void generateExcel;

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#0d0f12] text-gray-200 font-sans selection:bg-blue-500 selection:text-white overflow-x-hidden">

      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/10 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[120px]"></div>
      </div>

      <header className="h-20 border-b border-white/5 flex items-center justify-between px-6 md:px-10 bg-[#0d0f12]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 p-1">
                  <img src={COMPANY_INFO.logo_url} className="h-full object-contain" alt="Logo" onError={(e) => { const img = e.currentTarget; img.onerror = null; img.src = "https://via.placeholder.com/40x40?text=UNS"; }} />
              </div>
              <div>
                  <h1 className="text-lg font-black text-white tracking-tight leading-none">{COMPANY_INFO.name_en}</h1>
                  <span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">Estate OS v6.2</span>
              </div>
          </div>

          <div className="hidden md:flex items-center bg-[#15171c] border border-white/10 rounded-full px-4 py-2 w-96 focus-within:border-blue-500/50 transition-all group">
              <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Buscar propiedad, inquilino o dirección..."
                className="bg-transparent border-none outline-none text-sm text-white w-full ml-3 placeholder-gray-600"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); if(e.target.value) setActiveTab('properties'); }}
              />
          </div>

          <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#15171c] border border-white/10 flex items-center justify-center hover:bg-[#20242c] cursor-pointer transition relative">
                  <Bell className="w-4 h-4 text-gray-400" />
                  {dashboardData.alerts.length > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>}
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 border border-gray-500 overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=AdminUNS" alt="User" />
              </div>
          </div>
      </header>

      <div className="flex relative z-10">
          <nav className="w-20 hidden md:flex flex-col items-center py-8 gap-8 border-r border-white/5 h-[calc(100vh-80px)] sticky top-20 bg-[#0d0f12]/50 backdrop-blur-sm">
              <NavButton icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="HQ" />
              <NavButton icon={Building} active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} label="Prop." />
              <NavButton icon={Users} active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} label="Data" />
              <div className="h-px w-8 bg-gray-800"></div>
              <NavButton icon={UploadCloud} active={activeTab === 'import'} onClick={() => setActiveTab('import')} label="Sync" />
              <NavButton icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Config" />
          </nav>

          <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto min-h-[calc(100vh-80px)] mb-20 md:mb-0">
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-900/20 via-[#15171c] to-[#0d0f12] border border-white/5 p-8 shadow-2xl">
                        <div className="absolute top-0 right-0 p-32 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-green-500/30 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Sistema Activo</span>
                                    <span className="text-gray-500 text-xs font-mono">{new Date().toLocaleDateString()}</span>
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-1">
                                    Bienvenido a <span className="text-blue-500">UNS</span>
                                </h2>
                                <p className="text-gray-400 text-sm max-w-md">Plataforma de gestión inmobiliaria corporativa.</p>
                            </div>
                            <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center gap-4 min-w-[280px]">
                                <div className="p-3 bg-blue-600 text-white rounded-lg shadow-lg shadow-blue-500/20"><Calendar className="w-6 h-6" /></div>
                                <div><div className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Ciclo</div><div className="text-lg font-bold text-white leading-tight">{cycle.month}</div><div className="text-xs text-gray-500">{cycle.start} - {cycle.end}</div></div>
                            </div>
                        </div>
                    </div>

                    {dashboardData.alerts.length > 0 && (
                        <div className="grid gap-3 animate-in zoom-in-95 duration-300">
                            {dashboardData.alerts.map((alert, idx) => (
                                <div key={idx} className={`p-4 rounded-xl border flex items-center gap-3 ${alert.type === 'danger' ? 'bg-red-900/10 border-red-500/30 text-red-200' : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-200'}`}>
                                    <AlertCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-medium">{alert.msg}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Beneficio Neto" value={`¥${dashboardData.profit.toLocaleString()}`} subtext="Margen Mensual Real" icon={TrendingUp} trend={dashboardData.profit > 0 ? 'up' : 'down'} />
                        <StatCard title="Total Recaudado" value={`¥${dashboardData.totalCollected.toLocaleString()}`} subtext="Renta + Parking" icon={DollarSign} trend="up" />
                        <StatCard title="Ocupación Total" value={`${dashboardData.occupancyRate}%`} subtext={`${dashboardData.occupiedCount} de ${dashboardData.totalCapacity} camas`} icon={Users} />
                        <StatCard title="Costo Operativo" value={`¥${dashboardData.totalPropCost.toLocaleString()}`} subtext="Pagos a Propietarios" icon={Building} />
                    </div>

                    <GlassCard className="p-6">
                        <div className="flex justify-between items-end mb-6">
                            <div><h3 className="text-lg font-bold text-white mb-1">Balance Financiero</h3><p className="text-gray-400 text-xs">Comparativa de Ingresos vs Egresos</p></div>
                            <div className="text-right"><div className="text-2xl font-mono font-bold text-blue-400">¥{dashboardData.totalTargetUNS.toLocaleString()}</div><div className="text-[10px] text-gray-500 uppercase font-bold">Objetivo Máximo</div></div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative pt-6 pb-2">
                                <div className="flex mb-2 items-center justify-between"><div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-400 bg-green-200/10 border border-green-500/30">Ingresos Totales</span></div><div className="text-right"><span className="text-xs font-bold inline-block text-green-400">{dashboardData.totalTargetUNS > 0 ? Math.round((dashboardData.totalCollected / dashboardData.totalTargetUNS) * 100) : 0}%</span></div></div>
                                <div className="flex h-4 mb-4 overflow-hidden text-xs bg-gray-800 rounded-full border border-white/5"><div style={{ width: `${dashboardData.totalTargetUNS > 0 ? (dashboardData.totalCollected / dashboardData.totalTargetUNS) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-500 to-green-400 transition-all duration-1000"></div></div>
                            </div>
                            <div className="relative pt-1">
                                <div className="flex mb-2 items-center justify-between"><div><span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-red-400 bg-red-200/10 border border-red-500/30">Costos Fijos</span></div><div className="text-right"><span className="text-xs font-bold inline-block text-red-400">¥{dashboardData.totalPropCost.toLocaleString()}</span></div></div>
                                <div className="flex h-2 mb-4 overflow-hidden text-xs bg-gray-800 rounded-full border border-white/5"><div style={{ width: `${dashboardData.totalTargetUNS > 0 ? (dashboardData.totalPropCost / dashboardData.totalTargetUNS) * 100 : 0}%` }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-red-500 transition-all duration-1000"></div></div>
                            </div>
                        </div>
                    </GlassCard>
                </div>
              )}

              {activeTab === 'properties' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#15171c] p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
                        <div className="flex gap-1 bg-black/40 p-1 rounded-xl w-full md:w-auto">
                            <button onClick={()=>setPropertyViewMode('active')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${propertyViewMode==='active'?'bg-[#20242c] text-white shadow-lg border border-white/10':'text-gray-500 hover:text-white'}`}><Building className="w-4 h-4"/> Activos ({filteredProperties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date()).length})</button>
                            <button onClick={()=>setPropertyViewMode('history')} className={`flex-1 md:flex-none px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${propertyViewMode==='history'?'bg-[#20242c] text-white shadow-lg border border-white/10':'text-gray-500 hover:text-white'}`}><History className="w-4 h-4"/> Historial ({filteredProperties.filter(p => p.contract_end && new Date(p.contract_end) <= new Date()).length})</button>
                        </div>
                        <button onClick={() => { setPropertyForm({ id: null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '', manager_name: '', manager_phone: '', contract_start: new Date().toISOString().split('T')[0], contract_end: '', type: '1K', capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0 }); setIsPropertyModalOpen(true); }} className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform"><PlusCircle className="w-4 h-4"/> Nueva Propiedad</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(propertyViewMode === 'active'
                        ? filteredProperties.filter(p => !p.contract_end || new Date(p.contract_end) > new Date())
                        : filteredProperties.filter(p => p.contract_end && new Date(p.contract_end) <= new Date())
                    ).map(p => {
                        const tenants = db.tenants.filter(t => t.property_id === p.id && t.status === 'active');
                        const totalMoneyIn = tenants.reduce((sum, t) => sum + (t.rent_contribution||0) + (t.parking_fee||0), 0);
                        const vacancy = (p.capacity||0) - tenants.length; const isFull = vacancy <= 0;
                        return (
                        <GlassCard key={p.id} className="flex flex-col justify-between p-5 min-h-[280px]">
                            <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-black text-xl text-white truncate pr-2 flex flex-col leading-none">
                                    {p.name}
                                    {p.room_number && <span className="text-blue-400 font-mono text-base mt-1">#{p.room_number}</span>}
                                </h3>
                                {propertyViewMode === 'active' ? <span className={`shrink-0 px-2 py-1 rounded text-[10px] font-black tracking-wide border ${isFull ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>{isFull ? 'LLENO' : `${vacancy} LIBRES`}</span> : <span className="shrink-0 px-2 py-1 rounded text-[10px] font-black bg-gray-800 text-gray-400 border border-gray-700">DEVUELTO</span>}
                            </div>

                            <div className="space-y-3 mb-5">
                                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-gray-500 font-medium">Costo Base</span>
                                    <span className="text-gray-300 font-mono">¥{(p.rent_cost||0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                                    <span className="text-gray-500 font-medium">Objetivo UNS</span>
                                    <span className="text-blue-500 font-mono font-bold">¥{(p.rent_price_uns||0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-400 text-xs font-bold uppercase">Recaudado</span>
                                    <span className={`text-xl font-black font-mono tracking-tight ${totalMoneyIn >= p.rent_price_uns ? 'text-green-400' : 'text-orange-400'}`}>¥{totalMoneyIn.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4 opacity-60 hover:opacity-100 transition-opacity">
                                <p className="text-gray-400 text-[10px] flex gap-1 truncate items-center"><MapPin className="w-3 h-3 text-gray-600"/> {p.address}</p>
                                {p.manager_name && <p className="text-gray-400 text-[10px] flex gap-1 items-center"><User className="w-3 h-3 text-blue-500"/> {p.manager_name}</p>}
                            </div>
                            </div>

                            <div className="flex gap-2 mt-auto">
                                <button onClick={() => { setPropertyForm(p); setIsPropertyModalOpen(true); }} className="bg-black/40 hover:bg-black/60 text-gray-300 p-2.5 rounded-lg border border-white/10 transition"><Edit2 className="w-4 h-4"/></button>
                                {propertyViewMode === 'active' && <button onClick={() => openRentManager(p)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"><DollarSign className="w-4 h-4" /> Gestión Rentas</button>}
                            </div>
                        </GlassCard>
                        )
                    })}
                    </div>
                </div>
              )}

              {activeTab === 'import' && (
                  <ImportView
                      isDragging={isDragging}
                      importStatus={importStatus}
                      previewSummary={previewSummary}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onFileChange={(e) => e.target.files?.length && processExcelFile(e.target.files[0])}
                      onSave={saveToDatabase}
                  />
              )}

              {activeTab === 'settings' && (
                  <SettingsView
                    db={db}
                    setDb={setDb}
                    onDownloadBackup={downloadBackup}
                    onRestoreBackup={restoreBackup}
                    onReset={() => {if(window.confirm('¿SEGURO? Se borrarán todos los datos.')) setDb(INITIAL_DB)}}
                  />
              )}

              {activeTab === 'employees' && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-in fade-in">
                      <div className="bg-gray-900 p-6 rounded-full mb-6 border border-gray-800"><Users className="w-12 h-12 text-gray-600" /></div>
                      <h3 className="text-2xl font-bold text-white mb-2">Base de Datos de Personal</h3>
                      <p className="text-gray-500 max-w-md">Para gestionar empleados, utiliza el buscador global o el formulario de asignación en las propiedades.</p>
                  </div>
              )}
          </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#0d0f12]/95 backdrop-blur-lg border-t border-white/10 flex justify-around items-center h-20 z-50 px-2 pb-2 safe-area-bottom">
          <NavButtonMobile icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="HQ" />
          <NavButtonMobile icon={Building} active={activeTab === 'properties'} onClick={() => setActiveTab('properties')} label="Prop." />
          <div className="relative -top-5">
             <button onClick={() => setActiveTab('import')} className="bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-500/30 border-4 border-[#0d0f12]">
                <UploadCloud className="w-6 h-6" />
             </button>
          </div>
          <NavButtonMobile icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} label="Config" />
          <NavButtonMobile icon={Search} active={false} onClick={() => document.querySelector<HTMLInputElement>('input[type="text"]')?.focus()} label="Buscar" />
      </nav>

      {/* --- MODALS --- */}
      {/* RENT MANAGER */}
      <Modal isOpen={isRentManagerOpen} onClose={() => setIsRentManagerOpen(false)} title="Gestión de Renta y Parking">
         {selectedPropertyForRent && (() => {
            const tenants = db.tenants.filter(t => t.property_id === selectedPropertyForRent.id && t.status === 'active');
            const totalRent = tenants.reduce((acc, t) => acc + (t.rent_contribution||0), 0);
            const totalParking = tenants.reduce((acc, t) => acc + (t.parking_fee||0), 0);
            return (
               <div className="space-y-8">
                  <div className="grid grid-cols-3 gap-4">
                     <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Objetivo UNS</div>
                        <div className="text-2xl font-black text-white font-mono">¥{(selectedPropertyForRent.rent_price_uns||0).toLocaleString()}</div>
                     </div>
                     <div className="bg-green-500/10 p-4 rounded-xl border border-green-500/20 text-center">
                        <div className="text-[10px] text-green-400 uppercase font-bold tracking-widest mb-1">Total Rentas</div>
                        <div className="text-2xl font-black text-green-400 font-mono">¥{totalRent.toLocaleString()}</div>
                     </div>
                     <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
                        <div className="text-[10px] text-blue-400 uppercase font-bold tracking-widest mb-1">Total Parking</div>
                        <div className="text-2xl font-black text-blue-400 font-mono">¥{totalParking.toLocaleString()}</div>
                     </div>
                  </div>

                  <div className="flex gap-4">
                     <button onClick={distributeRentEvenly} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition border border-white/10"><Calculator className="w-4 h-4"/> Dividir Renta Equitativamente</button>
                     <button onClick={() => { setTenantForm({ employee_id: '', name: '', name_kana: '', property_id: selectedPropertyForRent.id, rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] }); setIsAddTenantModalOpen(true); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"><UserPlus className="w-4 h-4"/> Añadir Inquilino</button>
                  </div>

                  <div className="bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden">
                     <div className="grid grid-cols-12 text-[10px] text-gray-500 uppercase font-bold p-4 bg-black/20 border-b border-white/5">
                        <div className="col-span-5">Inquilino</div>
                        <div className="col-span-3 text-right">Renta Base (¥)</div>
                        <div className="col-span-4 text-right pr-2">Parking (¥)</div>
                     </div>
                     <div className="p-2 space-y-2">
                        {tenants.length === 0 ? <p className="text-center text-gray-600 py-8 text-sm">No hay inquilinos activos.</p> : tenants.map(t => {
                            const isZero = t.rent_contribution === 0;
                            return (
                                <div key={t.id} className={`grid grid-cols-12 items-center p-3 rounded-xl border transition-all ${isZero ? 'bg-red-500/5 border-red-500/30' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                                <div className="col-span-5">
                                    <div className="text-white text-sm font-bold truncate">{t.name}</div>
                                    <div className="text-[10px] text-gray-500 font-mono">{t.employee_id}</div>
                                    {isZero && <div className="text-[9px] text-red-400 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> REQUIERE CONFIGURACIÓN</div>}
                                </div>
                                <div className="col-span-3">
                                    <input type="number" className="w-full bg-gray-900 text-white font-mono text-sm p-2.5 rounded-lg text-right border border-gray-700 focus:border-blue-500 outline-none transition focus:bg-black" value={t.rent_contribution} onChange={(e) => handleUpdateRentDetails(t.id, 'rent_contribution', e.target.value)}/>
                                </div>
                                <div className="col-span-4 relative pl-2">
                                    <input type="number" className="w-full bg-gray-900 text-blue-400 font-mono text-sm p-2.5 rounded-lg text-right border border-blue-900/30 focus:border-blue-500 outline-none transition focus:bg-black" value={t.parking_fee} onChange={(e) => handleUpdateRentDetails(t.id, 'parking_fee', e.target.value)}/>
                                    <Car className="w-3.5 h-3.5 text-blue-500 absolute left-4 top-3.5 opacity-50 pointer-events-none" />
                                </div>
                                </div>
                            )
                        })}
                     </div>
                  </div>
               </div>
            );
         })()}
      </Modal>

      {/* PROPERTY FORM MODAL */}
      <Modal isOpen={isPropertyModalOpen} onClose={() => setIsPropertyModalOpen(false)} title={propertyForm.id ? "Editar Propiedad" : "Nueva Propiedad"}>
        <form onSubmit={handleSaveProperty} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
                <div className="col-span-1">
                    <label className="text-xs text-gray-400 font-bold block mb-1.5 ml-1">Nombre Edificio</label>
                    <input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white focus:border-blue-500 outline-none transition focus:bg-black" value={propertyForm.name} onChange={e => setPropertyForm({...propertyForm, name: e.target.value})} placeholder="Ej: Legend K" required />
                </div>
                <div className="col-span-1">
                    <label className="text-xs text-blue-500 font-bold block mb-1.5 ml-1 flex items-center gap-1"><Hash className="w-3 h-3" /> No. Apt (Opcional)</label>
                    <input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-blue-400 font-mono focus:border-blue-500 outline-none transition focus:bg-black" value={propertyForm.room_number} onChange={e => setPropertyForm({...propertyForm, room_number: e.target.value})} placeholder="204" />
                </div>

                <div className="col-span-2 bg-gray-800/30 p-5 rounded-2xl border border-white/5">
                    <label className="text-xs text-blue-500 font-bold block mb-4 uppercase flex items-center gap-2"><Map className="w-3 h-3" /> Dirección en Japón</label>
                    <div className="grid grid-cols-12 gap-3 mb-3">
                        <div className="col-span-4">
                            <label className="text-[10px] text-gray-500 block mb-1">C. Postal</label>
                            <input className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono outline-none focus:border-blue-500" placeholder="4710805" maxLength={8} value={propertyForm.postal_code} onChange={e => setPropertyForm({...propertyForm, postal_code: e.target.value})} />
                        </div>
                        <div className="col-span-8 flex items-end">
                            <button type="button" onClick={fetchAddressFromZip} disabled={isSearchingAddress} className="bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold px-4 py-3 rounded-lg w-full flex items-center justify-center gap-2 disabled:opacity-50 transition shadow-lg shadow-blue-900/20">
                                {isSearchingAddress ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                                {isSearchingAddress ? 'Localizando...' : 'Autocompletar Dirección'}
                            </button>
                        </div>
                    </div>
                    {addressSearchError && <p className="text-[10px] text-red-400 mb-3 flex items-center gap-1 bg-red-900/20 p-2 rounded"><AlertCircle className="w-3 h-3"/> {addressSearchError}</p>}
                    <div className="space-y-3">
                        <input className="w-full bg-black border border-gray-700 p-3 rounded-lg text-gray-300 focus:border-blue-500 outline-none" value={propertyForm.address_auto} onChange={e => setPropertyForm({...propertyForm, address_auto: e.target.value})} placeholder="Prefectura + Ciudad (Auto)" />
                        <input className="w-full bg-black border border-gray-700 p-3 rounded-lg text-white font-bold focus:border-blue-500 outline-none" value={propertyForm.address_detail} onChange={e => setPropertyForm({...propertyForm, address_detail: e.target.value})} placeholder="Ban-chi / Edificio" />
                    </div>
                </div>

                <div className="col-span-2 bg-gray-800/30 p-5 rounded-2xl border border-white/5">
                    <h4 className="text-green-400 text-xs font-bold mb-4 uppercase flex items-center gap-2"><DollarSign className="w-3 h-3"/> Estructura de Costos</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="text-[10px] text-gray-500 block mb-1">Alquiler Real</label><input type="number" className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono focus:border-green-500 outline-none" value={propertyForm.rent_cost} onChange={e => setPropertyForm({...propertyForm, rent_cost: e.target.value})} /></div>
                        <div><label className="text-[10px] text-blue-400 block mb-1">Costo Parking</label><input type="number" className="w-full bg-black border border-blue-900/30 p-2.5 rounded-lg text-blue-200 font-mono focus:border-blue-500 outline-none" value={propertyForm.parking_cost} onChange={e => setPropertyForm({...propertyForm, parking_cost: e.target.value})} /></div>
                        <div><label className="text-[10px] text-yellow-500 block mb-1 font-bold">Objetivo UNS</label><input type="number" className="w-full bg-black border border-yellow-900/30 p-2.5 rounded-lg text-yellow-400 font-mono font-bold focus:border-yellow-500 outline-none" value={propertyForm.rent_price_uns} onChange={e => setPropertyForm({...propertyForm, rent_price_uns: e.target.value})} /></div>
                    </div>
                </div>

                <div><label className="text-xs text-gray-400 block mb-1 ml-1">Tipo</label><input className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white outline-none" value={propertyForm.type} onChange={e => setPropertyForm({...propertyForm, type: e.target.value})} /></div>
                <div><label className="text-xs text-gray-400 block mb-1 ml-1">Capacidad</label><input type="number" className="w-full bg-black/50 border border-gray-700 p-3 rounded-xl text-white outline-none" value={propertyForm.capacity} onChange={e => setPropertyForm({...propertyForm, capacity: e.target.value})} /></div>
            </div>

            <div className="border-t border-gray-800 pt-6 grid grid-cols-2 gap-5">
                 <div><label className="text-xs text-gray-400 block mb-1">Admin Nombre</label><input className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.manager_name} onChange={e => setPropertyForm({...propertyForm, manager_name: e.target.value})} /></div>
                 <div><label className="text-xs text-gray-400 block mb-1">Admin Teléfono</label><input className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.manager_phone} onChange={e => setPropertyForm({...propertyForm, manager_phone: e.target.value})} /></div>
                 <div><label className="text-xs text-gray-400 block mb-1">Inicio Contrato</label><input type="date" className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.contract_start} onChange={e => setPropertyForm({...propertyForm, contract_start: e.target.value})} /></div>
                 <div><label className="text-xs text-gray-400 block mb-1">Fin Contrato</label><input type="date" className="w-full bg-black/50 border border-gray-700 p-2.5 rounded-lg text-white" value={propertyForm.contract_end} onChange={e => setPropertyForm({...propertyForm, contract_end: e.target.value})} /></div>
            </div>
            <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsPropertyModalOpen(false)} className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition hover:-translate-y-1">Guardar Cambios</button>
            </div>
        </form>
      </Modal>

      {/* ADD TENANT MODAL */}
      <Modal isOpen={isAddTenantModalOpen} onClose={() => setIsAddTenantModalOpen(false)} title="Registrar Nuevo Inquilino">
          <form onSubmit={handleAddTenant} className="space-y-6">
             <div className="bg-gray-800/50 p-6 rounded-2xl border border-white/5">
                <label className="text-xs text-blue-500 font-bold block mb-2 uppercase tracking-wide">Paso 1: Identificación</label>
                <div className="relative">
                    <input type="text" required autoFocus placeholder="ID de Empleado..." className="w-full bg-black border border-gray-700 p-4 rounded-xl text-white text-xl font-mono focus:border-blue-500 outline-none transition pl-12" value={tenantForm.employee_id} onChange={e => setTenantForm({...tenantForm, employee_id: e.target.value})}/>
                    <div className="absolute left-4 top-4 text-gray-500"><User className="w-6 h-6"/></div>
                    {isIdFound && <div className="absolute right-4 top-4 text-green-500 animate-in zoom-in"><Check className="w-6 h-6"/></div>}
                </div>
                {isIdFound && <p className="text-green-400 text-xs mt-2 font-medium flex items-center gap-1"><Database className="w-3 h-3"/> Empleado encontrado en base de datos.</p>}
             </div>

             <div className="grid grid-cols-2 gap-4">
                 <div><label className="text-xs text-gray-400 block mb-1">Nombre</label><input className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl text-white" value={tenantForm.name} onChange={e => setTenantForm({...tenantForm, name: e.target.value})} required/></div>
                 <div><label className="text-xs text-gray-400 block mb-1">Katakana</label><input className="w-full bg-gray-800 border border-gray-700 p-3 rounded-xl text-white" value={tenantForm.name_kana} onChange={e => setTenantForm({...tenantForm, name_kana: e.target.value})}/></div>
             </div>

             <div className="bg-gray-800/50 p-6 rounded-2xl border border-white/5">
                 <label className="text-xs text-blue-500 font-bold block mb-4 uppercase tracking-wide">Paso 2: Configuración Financiera</label>
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">Renta Base (¥)</label>
                        <input type="number" className="w-full bg-black border border-gray-700 p-3 rounded-xl text-white font-mono text-lg focus:border-blue-500 outline-none" value={tenantForm.rent_contribution} onChange={e => setTenantForm({...tenantForm, rent_contribution: e.target.value})}/>
                    </div>
                    <div>
                        <label className="text-xs text-blue-400 block mb-1">Costo Parking (¥)</label>
                        <input type="number" className="w-full bg-black border border-blue-900/50 p-3 rounded-xl text-blue-200 font-mono text-lg focus:border-blue-500 outline-none" value={tenantForm.parking_fee} onChange={e => setTenantForm({...tenantForm, parking_fee: e.target.value})}/>
                    </div>
                 </div>
             </div>

             <div className="flex gap-4 pt-2">
                <button type="button" onClick={() => setIsAddTenantModalOpen(false)} className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-blue-500/20 transition hover:-translate-y-1">Confirmar Asignación</button>
             </div>
          </form>
      </Modal>
    </div>
  );
}
