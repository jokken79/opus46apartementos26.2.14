import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './App.css';
import {
  Building, Users, LayoutDashboard, Search, UploadCloud, X,
  AlertCircle, Calculator, DollarSign, UserPlus, Calendar,
  User, History, Edit2, Map, Hash, Loader2, Bell,
  Settings, Percent, LogOut, FileText, TrendingUp
} from 'lucide-react';

import { PropertiesView } from './components/properties/PropertiesView';
import { EmployeesView } from './components/employees/EmployeesView';
import { ReportsView } from './components/reports/ReportsView';
import { GlassCard, StatCard, Modal, NavButton, NavButtonMobile } from './components/ui';
import { SettingsView } from './components/settings/SettingsView';
import { ImportView } from './components/import/ImportView';
import { useIndexedDB } from './hooks/useIndexedDB';
import { useExcelImport } from './hooks/useExcelImport';
import type { Property, Tenant, Employee, AppDatabase, AlertItem } from './types/database';
import { validateBackup, validateProperty } from './utils/validators';
import { isPropertyActive } from './utils/propertyHelpers';
import { COMPANY_INFO } from './utils/constants';

// --- ID Generator (monotónico, sin colisiones) ---
let _lastId = 0;
const generateId = (): number => {
  const now = Date.now();
  _lastId = now > _lastId ? now : _lastId + 1;
  return _lastId;
};

// --- SheetJS (Already imported via package) ---

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

const EMPTY_PROPERTY_FORM = { id: null as number | null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '', manager_name: '', manager_phone: '', contract_start: new Date().toISOString().split('T')[0], contract_end: '', type: '1K', capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0, parking_capacity: 0, kanri_hi: 0, billing_mode: 'fixed' as const };

type UnknownObject = Record<string, unknown>;

const normalizeHeaderKey = (k: string): string => k.trim().toLowerCase().replace(/[\s　]/g, '');

const getFirstFieldValue = (obj: UnknownObject, keys: string[]): unknown => {
  const normalized: Record<string, string> = {};
  Object.keys(obj).forEach(k => { normalized[normalizeHeaderKey(k)] = k; });
  for (const key of keys) {
    const real = normalized[normalizeHeaderKey(key)];
    if (real) return obj[real];
  }
  return undefined;
};

const parseZaishokuLike = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const s = String(value).trim();
  if (!s) return null;
  const n = s.toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on', 'ok', '○', '〇', '在職', '在職中', '在籍', '在籍中', '現職'].includes(n)) return true;
  if (['0', 'false', 'no', 'n', 'off', '×', '退職', '離職'].includes(n)) return false;
  if (n.includes('退職') || n.includes('離職')) return false;
  if (n.includes('在職') || n.includes('在籍')) return true;
  return null;
};

const isEmployeeZaishoku = (emp: Employee): boolean => {
  const raw = (emp.full_data || {}) as UnknownObject;

  // Si hay una fecha de retiro, asumimos NO en activo.
  const retiredDate = getFirstFieldValue(raw, ['退職日', '離職日', '退社日', '退職年月日', '離職年月日']);
  if (retiredDate !== undefined && String(retiredDate).trim() !== '') return false;

  // Flags explícitos de retiro.
  const retiredFlag = getFirstFieldValue(raw, ['退職', '離職', '退職フラグ', '退職区分', '退職済']);
  const retiredParsed = parseZaishokuLike(retiredFlag);
  if (retiredParsed === true) return false;
  if (typeof retiredFlag === 'string' && (retiredFlag.includes('退職') || retiredFlag.includes('離職'))) return false;

  // Flags explícitos de en-activo.
  const zaishokuFlag = getFirstFieldValue(raw, ['在職中', '在職', '在籍', '在籍中', '就業中', '勤務中']);
  const zaishokuParsed = parseZaishokuLike(zaishokuFlag);
  if (zaishokuParsed !== null) return zaishokuParsed;

  // Sin dato: no filtramos por defecto.
  return true;
};

// ============================================
// ============ APP PRINCIPAL =================
// ============================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  // IndexedDB (Dexie) — reemplaza localStorage
  const { db, setDb, isLoading: isDbLoading, resetDb } = useIndexedDB();

  // --- HOOK DE IMPORTACIÓN EXCEL ---
  const {
    importStatus, previewSummary,
    processExcelFile, saveToDatabase
  } = useExcelImport(db, setDb, generateId, setActiveTab);

  // --- ESTADOS ---
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [addressSearchError, setAddressSearchError] = useState('');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);
  const [isRentManagerOpen, setIsRentManagerOpen] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [selectedPropertyForRent, setSelectedPropertyForRent] = useState<Property | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isIdFound, setIsIdFound] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [companyFilter, setCompanyFilter] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [empSearch, setEmpSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [empCategory, setEmpCategory] = useState<'genzai' | 'ukeoi' | 'staff'>('genzai');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [empOnlyZaishoku, setEmpOnlyZaishoku] = useState(false);

  const [tenantForm, setTenantForm] = useState<any>({
    employee_id: '', name: '', name_kana: '', company: '', property_id: '',
    rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0]
  });
  const [propertyForm, setPropertyForm] = useState<any>({
    id: null, name: '', room_number: '', postal_code: '', address_auto: '', address_detail: '',
    manager_name: '', manager_phone: '', contract_start: '', contract_end: '', type: '1K',
    capacity: 2, rent_cost: 0, rent_price_uns: 0, parking_cost: 0, parking_capacity: 0, kanri_hi: 0, billing_mode: 'fixed'
  });

  // Snapshots para detectar cambios sin guardar (B13)
  const propertyFormSnapshot = useRef('');
  const tenantFormSnapshot = useRef('');

  const confirmDiscardChanges = useCallback((currentJson: string, initialJson: string): boolean => {
    if (currentJson !== initialJson) {
      return window.confirm('Hay cambios sin guardar. ¿Descartar?');
    }
    return true;
  }, []);

  // --- CICLO ---
  const cycle = useMemo(() => {
    const now = new Date(); const cd = db.config?.closingDay ?? 0;
    let s: Date, e: Date;
    if (cd === 0) { s = new Date(now.getFullYear(), now.getMonth(), 1); e = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else if (now.getDate() <= cd) { s = new Date(now.getFullYear(), now.getMonth() - 1, cd + 1); e = new Date(now.getFullYear(), now.getMonth(), cd); }
    else { s = new Date(now.getFullYear(), now.getMonth(), cd + 1); e = new Date(now.getFullYear(), now.getMonth() + 1, cd); }
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    return { start: s.toLocaleDateString('es-ES', opt), end: e.toLocaleDateString('es-ES', opt), month: now.toLocaleString('es-ES', { month: 'long' }).toUpperCase() };
  }, [db.config?.closingDay]);

  // --- MÉTRICAS ---
  const dashboardData = useMemo(() => {
    const ap = db.properties.filter(isPropertyActive);
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
  const downloadBackup = () => { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); a.download = `UNS_Backup_${new Date().toISOString().slice(0, 10)}.json`; a.click(); };
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
          employeesGenzai: d.employeesGenzai || [],
          employeesUkeoi: d.employeesUkeoi || [],
          employeesStaff: d.employeesStaff || [],
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
      // Buscar en las 3 tablas de empleados
      const allEmployees = [...db.employeesGenzai, ...db.employeesUkeoi, ...db.employeesStaff];
      const f = allEmployees.find(e => String(e.id) === String(tenantForm.employee_id));
      if (f) { setTenantForm((p: any) => ({ ...p, name: f.name, name_kana: f.name_kana || '', company: f.company || '' })); setIsIdFound(true); }
      else setIsIdFound(false);
    } else setIsIdFound(false);
  }, [tenantForm.employee_id, db.employeesGenzai, db.employeesUkeoi, db.employeesStaff]);

  // --- ADDRESS ---
  const fetchAddressFromZip = async () => {
    setAddressSearchError(''); const zip = propertyForm.postal_code.replace(/-/g, '');
    if (zip.length !== 7) { setAddressSearchError('7 dígitos.'); return; }
    setIsSearchingAddress(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try { const r = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip}`, { signal: controller.signal }); const d = await r.json(); if (d.results) { const a = d.results[0]; setPropertyForm((p: any) => ({ ...p, address_auto: `${a.address1}${a.address2}${a.address3}` })); } else setAddressSearchError('No encontrado.'); }
    catch (err) { setAddressSearchError(err instanceof DOMException && err.name === 'AbortError' ? 'Timeout (10s). Reintentar.' : 'Error de conexión.'); }
    finally { clearTimeout(timeout); setIsSearchingAddress(false); }
  };



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
    // Seleccionar la tabla según la categoría actual
    let source: Employee[];
    switch (empCategory) {
      case 'genzai': source = db.employeesGenzai; break;
      case 'ukeoi': source = db.employeesUkeoi; break;
      case 'staff': source = db.employeesStaff; break;
      default: source = db.employeesGenzai;
    }

    let result = source;
    // Filtro local (tab empleados)
    const local = empSearch.toLowerCase();
    if (local) result = result.filter(e => e.id.includes(local) || e.name.toLowerCase().includes(local) || e.name_kana.toLowerCase().includes(local) || e.company.toLowerCase().includes(local));
    // Filtro global (header search) — se aplica además del local
    const global = searchTerm.toLowerCase();
    if (global) result = result.filter(e => e.id.includes(global) || e.name.toLowerCase().includes(global) || e.name_kana.toLowerCase().includes(global) || e.company.toLowerCase().includes(global));

    // Filtro: solo en activo (在職中)
    if (empOnlyZaishoku) result = result.filter(isEmployeeZaishoku);
    return result;
  }, [db.employeesGenzai, db.employeesUkeoi, db.employeesStaff, empCategory, empSearch, searchTerm, empOnlyZaishoku]);

  // Inquilinos filtrados por búsqueda global
  const filteredTenants = useMemo(() => {
    const t = searchTerm.toLowerCase();
    if (!t) return [];
    return db.tenants.filter(tn => tn.name.toLowerCase().includes(t) || tn.name_kana.toLowerCase().includes(t) || tn.employee_id.includes(t) || (tn.company || '').toLowerCase().includes(t));
  }, [db.tenants, searchTerm]);

  // --- ACTIONS ---
  const openRentManager = (p: Property) => { setSelectedPropertyForRent(p); setIsRentManagerOpen(true); };

  const handleSaveProperty = (e: React.FormEvent) => {
    e.preventDefault();
    const addr = propertyForm.postal_code ? `〒${propertyForm.postal_code} ${propertyForm.address_auto} ${propertyForm.address_detail}` : `${propertyForm.address_auto} ${propertyForm.address_detail}`;
    const cp = { ...propertyForm, address: addr.trim() };
    // Validar con Zod
    const validation = validateProperty(cp);
    if (!validation.success) {
      alert('Error de validación:\n' + validation.errors.map(e => `• ${e.field}: ${e.message}`).join('\n'));
      return;
    }
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
    setDb(prev => {
      const updated = { ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'active' as const, exit_date: undefined, cleaning_fee: undefined } : t) };
      return autoSplitRent(updated, tenant.property_id);
    });
  };



  const handleUpdateRentDetails = (tid: number, field: string, val: string) => {
    const v = parseInt(val) || 0;
    setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, [field]: v } : t) }));
  };

  // Redistribuir renta equitativamente (para billing_mode='split')
  const autoSplitRent = (dbState: AppDatabase, propertyId: number): AppDatabase => {
    const prop = dbState.properties.find(p => p.id === propertyId);
    if (!prop || prop.billing_mode !== 'split') return dbState;
    const ts = dbState.tenants.filter(t => t.property_id === propertyId && t.status === 'active');
    if (ts.length === 0) return dbState;
    const split = Math.floor((prop.rent_price_uns || 0) / ts.length);
    const remainder = (prop.rent_price_uns || 0) % ts.length;
    return {
      ...dbState, tenants: dbState.tenants.map(t => {
        if (t.property_id === propertyId && t.status === 'active') {
          const idx = ts.findIndex(x => x.id === t.id);
          return { ...t, rent_contribution: idx === 0 ? split + remainder : split };
        }
        return t;
      })
    };
  };

  const distributeRentEvenly = () => {
    if (!selectedPropertyForRent) return;
    setDb(prev => autoSplitRent(prev, selectedPropertyForRent.id));
  };



  const removeTenant = (tid: number) => {
    const tenant = db.tenants.find(t => t.id === tid);
    if (!tenant) return;
    const fee = db.config.defaultCleaningFee || 30000;
    if (!window.confirm(`¿Dar de baja a ${tenant.name}?\n\nSe aplicará クリーニング費 (limpieza): ¥${fee.toLocaleString()}`)) return;
    const exitDate = new Date().toISOString().split('T')[0];
    setDb(prev => {
      const updated = { ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'inactive' as const, exit_date: exitDate, cleaning_fee: fee } : t) };
      return autoSplitRent(updated, tenant.property_id);
    });
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
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative w-14 h-14 bg-black/40 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/10 p-1 shadow-2xl overflow-hidden">
              <img
                src={COMPANY_INFO.logo_url}
                className="w-full h-full object-contain filter drop-shadow(0 0 8px rgba(0,82,204,0.3))"
                alt="UNS Logo"
                onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/60x60?text=UNS"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none"></div>
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-black text-white tracking-tighter leading-none font-hud">{COMPANY_INFO.name_en}</h1>
            <span className="text-[10px] text-blue-400 uppercase tracking-[0.3em] font-bold font-hud">Jpkken-OS Elite v7</span>
          </div>
        </div>
        <div className="flex items-center bg-[#15171c] border border-white/10 rounded-full px-3 py-2 flex-1 mx-3 md:mx-0 md:flex-none md:w-96 focus-within:border-blue-500/50 transition-all group">
          <Search className="w-4 h-4 text-gray-500 group-focus-within:text-blue-500 transition-colors shrink-0" />
          <input type="text" placeholder="Buscar propiedades, empleados, inquilinos..." className="bg-transparent border-none outline-none text-sm text-white w-full ml-2 placeholder-gray-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && searchTerm) { const counts = [{ tab: 'properties', n: filteredProperties.length }, { tab: 'employees', n: filteredEmployees.length }, { tab: 'properties', n: filteredTenants.length }]; const best = counts.sort((a, b) => b.n - a.n)[0]; setActiveTab(best.n > 0 ? best.tab : 'properties'); } }} />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white shrink-0"><X className="w-3.5 h-3.5" /></button>}
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

          {/* GLOBAL SEARCH BANNER */}
          {searchTerm && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/20 rounded-xl p-4 flex flex-wrap items-center gap-3 animate-in fade-in duration-300">
              <Search className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm text-blue-300 font-bold">"{searchTerm}"</span>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => setActiveTab('properties')} className={`text-xs px-3 py-1.5 rounded-lg border transition font-bold ${activeTab === 'properties' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'}`}><Building className="w-3 h-3 inline mr-1" />{filteredProperties.length} propiedades</button>
                <button onClick={() => setActiveTab('employees')} className={`text-xs px-3 py-1.5 rounded-lg border transition font-bold ${activeTab === 'employees' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black/40 border-white/10 text-gray-400 hover:text-white'}`}><Users className="w-3 h-3 inline mr-1" />{filteredEmployees.length} empleados</button>
                {filteredTenants.length > 0 && <span className="text-xs px-3 py-1.5 rounded-lg border bg-black/40 border-white/10 text-gray-400 font-bold"><User className="w-3 h-3 inline mr-1" />{filteredTenants.length} inquilinos</span>}
              </div>
              <button onClick={() => setSearchTerm('')} className="ml-auto text-gray-500 hover:text-white transition"><X className="w-4 h-4" /></button>
            </div>
          )}

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
            <PropertiesView
              db={db}
              searchTerm={searchTerm}
              onEdit={(p) => {
                const f = { ...p, kanri_hi: p.kanri_hi || 0, billing_mode: p.billing_mode || 'fixed', parking_capacity: p.parking_capacity || 0 };
                setPropertyForm(f);
                propertyFormSnapshot.current = JSON.stringify(f);
                setIsPropertyModalOpen(true);
              }}
              onDelete={handleDeleteProperty}
              onManageTenants={openRentManager}
              onAddNew={() => {
                const f = { ...EMPTY_PROPERTY_FORM };
                setPropertyForm(f);
                propertyFormSnapshot.current = JSON.stringify(f);
                setIsPropertyModalOpen(true);
              }}
              setIsSearchingAddress={setIsSearchingAddress}
            />
          )}

          {/* ====== EMPLEADOS (社員台帳) ====== */}
          {activeTab === 'employees' && (
            <EmployeesView db={db} searchTerm={searchTerm} />
          )}

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
            <ReportsView
              db={db}
              cycle={cycle}
              onUpdateTenant={(tid, field, val) => { const v = parseInt(val) || 0; setDb(prev => ({ ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, [field]: v } : t) })); }}
              onRemoveTenant={(tid) => { const tenant = db.tenants.find(t => t.id === tid); if (!tenant) return; const fee = db.config?.defaultCleaningFee || 30000; if (!window.confirm(`¿Dar de baja a ${tenant.name}?\n\nクリーニング費: ¥${fee.toLocaleString()}`)) return; setDb(prev => { const updated = { ...prev, tenants: prev.tenants.map(t => t.id === tid ? { ...t, status: 'inactive' as const, exit_date: new Date().toISOString().split('T')[0], cleaning_fee: fee } : t) }; return autoSplitRent(updated, tenant.property_id); }); }}
              onAddTenant={(tenantData) => { if (db.tenants.find(t => t.employee_id === tenantData.employee_id && t.status === 'active')) { alert('Este 社員No ya está asignado.'); return; } const newT: Tenant = { ...tenantData, id: generateId(), status: 'active' }; setDb(prev => { const updated = { ...prev, tenants: [...prev.tenants, newT] }; return autoSplitRent(updated, tenantData.property_id); }); }}
              onDeleteTenant={(tid) => { if (!window.confirm('¿Eliminar registro permanentemente?')) return; setDb(prev => ({ ...prev, tenants: prev.tenants.filter(t => t.id !== tid) })); }}
            />
          )}

          {/* IMPORT/EXPORT TAB */}
          {activeTab === 'import' && (
            <ImportView
              isDragging={false}
              importStatus={importStatus}
              previewSummary={previewSummary}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) processExcelFile(e.dataTransfer.files[0]); }}
              onFileChange={(e) => e.target.files?.length && processExcelFile(e.target.files[0])}
              onSave={saveToDatabase}
            />
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsView
              db={db}
              setDb={setDb}
              onDownloadBackup={downloadBackup}
              onRestoreBackup={restoreBackup}
              onReset={() => { if (window.confirm('¿Borrar todo?')) resetDb(); }}
            />
          )}

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
                <div className="text-[10px] text-gray-500 uppercase font-bold mb-3 flex items-center gap-2"><Percent className="w-3 h-3" /> Modo de Cobro</div>
                <div className="flex gap-2">
                  <button onClick={() => { setDb(prev => ({ ...prev, properties: prev.properties.map(p => p.id === prop.id ? { ...p, billing_mode: 'split' as const } : p) })); setSelectedPropertyForRent({ ...prop, billing_mode: 'split' }); }} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${mode === 'split' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}><Calculator className="w-4 h-4" /> 均等割り (Dividir)</button>
                  <button onClick={() => { setDb(prev => ({ ...prev, properties: prev.properties.map(p => p.id === prop.id ? { ...p, billing_mode: 'fixed' as const } : p) })); setSelectedPropertyForRent({ ...prop, billing_mode: 'fixed' }); }} className={`flex-1 p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${mode === 'fixed' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-700 text-gray-500 hover:text-white'}`}><Edit2 className="w-4 h-4" /> 個別設定 (Individual)</button>
                </div>
                {mode === 'split' && tenants.length > 0 && <p className="text-xs text-purple-300 mt-2 text-center">¥{(prop.rent_price_uns || 0).toLocaleString()} ÷ {tenants.length} personas = <span className="font-bold">¥{Math.floor((prop.rent_price_uns || 0) / tenants.length).toLocaleString()}</span>/persona</p>}
              </div>

              {/* ACTIONS */}
              <div className="flex gap-3">
                {mode === 'split' && <button onClick={distributeRentEvenly} className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition"><Calculator className="w-4 h-4" /> Aplicar División</button>}
                <button onClick={() => { const f = { employee_id: '', name: '', name_kana: '', company: '', property_id: prop.id, rent_contribution: 0, parking_fee: 0, entry_date: new Date().toISOString().split('T')[0] }; setTenantForm(f); tenantFormSnapshot.current = JSON.stringify(f); setIsAddTenantModalOpen(true); }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition"><UserPlus className="w-4 h-4" /> Registrar Inquilino</button>
              </div>

              {/* TENANT TABLE - ACTIVE */}
              <div className="bg-gray-900/50 rounded-2xl border border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 text-[10px] text-gray-500 uppercase font-bold p-4 bg-black/20 border-b border-white/5">
                  <div className="col-span-4">Inquilino</div>
                  <div className="col-span-2 text-center">Entrada</div>
                  <div className="col-span-2 text-right">Renta (¥)</div>
                  <div className="col-span-2 text-center">日割り</div>
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
                          {t.rent_contribution === 0 && <div className="text-[9px] text-red-400 font-bold mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> SIN PRECIO</div>}
                        </div>
                        <div className="col-span-2 text-center"><div className="text-[10px] text-gray-400 font-mono">{t.entry_date || '—'}</div></div>
                        <div className="col-span-2"><input type="number" className="w-full bg-gray-900 text-white font-mono text-sm p-2 rounded-lg text-right border border-gray-700 focus:border-blue-500 outline-none transition" value={t.rent_contribution} onChange={(e) => handleUpdateRentDetails(t.id, 'rent_contribution', e.target.value)} /></div>
                        <div className="col-span-2 text-center">{pr.isProRata ? <div><div className="text-yellow-400 font-mono text-xs font-bold">¥{pr.amount.toLocaleString()}</div><div className="text-[9px] text-gray-500">{pr.days}/{pr.totalDays}日</div></div> : <span className="text-[10px] text-gray-600">全月</span>}</div>
                        <div className="col-span-2 flex items-center gap-1">
                          <input type="number" className="w-full bg-gray-900 text-blue-400 font-mono text-sm p-2 rounded-lg text-right border border-blue-900/30 focus:border-blue-500 outline-none transition" value={t.parking_fee} onChange={(e) => handleUpdateRentDetails(t.id, 'parking_fee', e.target.value)} />
                          <button onClick={() => removeTenant(t.id)} className="text-gray-600 hover:text-red-400 transition p-1 shrink-0" title="Dar de baja"><LogOut className="w-3.5 h-3.5" /></button>
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
                            <button onClick={() => reactivateTenant(t.id)} className="text-gray-600 hover:text-green-400 transition p-1" title="Reactivar inquilino"><UserPlus className="w-3.5 h-3.5" /></button>
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
      <Modal isOpen={isPropertyModalOpen} onClose={() => { if (!confirmDiscardChanges(JSON.stringify(propertyForm), propertyFormSnapshot.current)) return; setPropertyForm({ ...EMPTY_PROPERTY_FORM }); setIsPropertyModalOpen(false); }} title={propertyForm.id ? "Editar Propiedad" : "Nueva Propiedad"}>
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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><label className="text-[10px] text-gray-500 block mb-1">家賃 (Renta)</label><input type="number" min="0" step="1000" className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono focus:border-green-500 outline-none" value={propertyForm.rent_cost} onChange={e => setPropertyForm({ ...propertyForm, rent_cost: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-gray-500 block mb-1">管理費</label><input type="number" min="0" step="500" className="w-full bg-black border border-gray-700 p-2.5 rounded-lg text-white font-mono focus:border-green-500 outline-none" value={propertyForm.kanri_hi} onChange={e => setPropertyForm({ ...propertyForm, kanri_hi: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-blue-400 block mb-1">Parking (Total ¥)</label><input type="number" min="0" step="500" className="w-full bg-black border border-blue-900/30 p-2.5 rounded-lg text-blue-200 font-mono focus:border-blue-500 outline-none" value={propertyForm.parking_cost} onChange={e => setPropertyForm({ ...propertyForm, parking_cost: Number(e.target.value) || 0 })} /></div>
                <div><label className="text-[10px] text-blue-400 block mb-1">Cant. Parking</label><input type="number" min="0" className="w-full bg-black border border-blue-900/30 p-2.5 rounded-lg text-blue-200 font-mono focus:border-blue-500 outline-none" value={propertyForm.parking_capacity} onChange={e => setPropertyForm({ ...propertyForm, parking_capacity: Number(e.target.value) || 0 })} /></div>
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
            <button type="button" onClick={() => { if (!confirmDiscardChanges(JSON.stringify(propertyForm), propertyFormSnapshot.current)) return; setPropertyForm({ ...EMPTY_PROPERTY_FORM }); setIsPropertyModalOpen(false); }} className="flex-1 bg-transparent border border-gray-600 text-gray-300 font-bold py-4 rounded-xl hover:bg-white/5 transition">Cancelar</button>
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition hover:-translate-y-1">Guardar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
