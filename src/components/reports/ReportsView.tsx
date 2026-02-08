/**
 * COMPONENTE: ReportsView
 * Vista principal del módulo de reportes mensuales
 * Tabs: Propiedad | Empresa | Nómina | Histórico
 */

import React, { useState, useMemo } from 'react';
import {
  Building, Users, DollarSign, Download, FileText, Printer,
  TrendingUp, TrendingDown, Calendar, Save, Trash2, BarChart3,
  ChevronDown, ChevronUp, ArrowRight, Home, AlertCircle,
} from 'lucide-react';
import { useReports } from '../../hooks/useReports';
import { useReportExport } from '../../hooks/useReportExport';
import { MonthlySnapshot } from '../../types/database';

interface ReportsViewProps {
  db: {
    properties: Array<any>;
    tenants: Array<any>;
    employees: Array<any>;
    config: { closingDay: number; companyName: string; defaultCleaningFee?: number; };
  };
  cycle: { start: string; end: string; month: string; };
}

type ReportTab = 'property' | 'company' | 'payroll' | 'tenants' | 'history';

export const ReportsView: React.FC<ReportsViewProps> = ({ db, cycle }) => {
  const [activeReport, setActiveReport] = useState<ReportTab>('company');
  const [companyFilter, setCompanyFilter] = useState('');
  const [expandedSnapshot, setExpandedSnapshot] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);
  const [historyVersion, setHistoryVersion] = useState(0);

  const {
    propertyReport, companyReport, payrollReport,
    propertyTotals, companyTotals, payrollTotals,
    loadHistory, saveSnapshot, deleteSnapshot,
  } = useReports(db);

  const { exportToExcel, exportToPDF } = useReportExport();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => loadHistory(), [loadHistory, historyVersion]);

  // Empresas únicas para filtro
  const uniqueCompanies = useMemo(() => {
    const set = new Set<string>();
    payrollReport.forEach(r => { if (r.company) set.add(r.company); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ja'));
  }, [payrollReport]);

  // Filtrar nómina por empresa
  const filteredPayroll = useMemo(() => {
    if (!companyFilter) return payrollReport;
    return payrollReport.filter(r => r.company === companyFilter);
  }, [payrollReport, companyFilter]);

  const filteredPayrollTotals = useMemo(() => {
    const data = filteredPayroll;
    return {
      total_employees: data.length,
      total_rent: data.reduce((a, r) => a + r.rent_deduction, 0),
      total_parking: data.reduce((a, r) => a + r.parking_deduction, 0),
      total_deduction: data.reduce((a, r) => a + r.total_deduction, 0),
    };
  }, [filteredPayroll]);

  // Datos agrupados por propiedad con inquilinos (家賃控除 vista)
  const tenantsByProperty = useMemo(() => {
    const activeProps = db.properties.filter(p => {
      if (!p.contract_end) return true;
      const d = new Date(p.contract_end);
      return isNaN(d.getTime()) || d > new Date();
    });

    return activeProps.map(p => {
      const allTenants = db.tenants.filter(t => t.property_id === p.id);
      const active = allTenants.filter(t => t.status === 'active');
      const inactive = allTenants.filter(t => t.status === 'inactive');
      const totalCost = (p.rent_cost || 0) + (p.kanri_hi || 0) + (p.parking_cost || 0);
      const totalCollected = active.reduce((a: number, t: any) => a + (t.rent_contribution || 0) + (t.parking_fee || 0), 0);

      // Alerta de contrato
      let contractAlert = '';
      if (p.contract_end) {
        const diff = Math.ceil((new Date(p.contract_end).getTime() - Date.now()) / 86400000);
        if (diff <= 0) contractAlert = '契約期限切れ';
        else if (diff <= 60) contractAlert = `${diff}日で満了`;
      }

      return {
        property: p,
        activeTenants: active,
        inactiveTenants: inactive,
        totalCost,
        rentTarget: p.rent_price_uns || 0,
        totalCollected,
        contractAlert,
      };
    }).filter(g => g.activeTenants.length > 0 || g.inactiveTenants.length > 0);
  }, [db.properties, db.tenants]);

  const tenantsByPropertyTotals = useMemo(() => {
    return {
      totalCost: tenantsByProperty.reduce((a, g) => a + g.totalCost, 0),
      totalTarget: tenantsByProperty.reduce((a, g) => a + g.rentTarget, 0),
      totalCollected: tenantsByProperty.reduce((a, g) => a + g.totalCollected, 0),
      totalActive: tenantsByProperty.reduce((a, g) => a + g.activeTenants.length, 0),
    };
  }, [tenantsByProperty]);

  // Ciclo actual como string YYYY-MM
  const currentCycleMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Verificar si ya se cerró el mes actual
  const isCurrentMonthClosed = useMemo(() => {
    return history.snapshots.some(s => s.cycle_month === currentCycleMonth);
  }, [history.snapshots, currentCycleMonth]);

  // Cierre de mes
  const handleCloseMonth = () => {
    if (isCurrentMonthClosed) {
      alert(`Ya existe un cierre para ${currentCycleMonth}`);
      return;
    }
    if (!window.confirm(`¿Cerrar el mes ${cycle.month} (${currentCycleMonth})?\n\nEsto guardará un snapshot de todos los reportes actuales.`)) return;
    const result = saveSnapshot(currentCycleMonth, cycle.start, cycle.end);
    if (result.success) {
      setHistoryVersion(v => v + 1);
      alert(`Cierre de ${cycle.month} guardado correctamente.`);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  // Exportar todo a Excel
  const handleExportExcel = () => {
    exportToExcel(propertyReport, companyReport, payrollReport, {
      propertyTotals, companyTotals, payrollTotals,
    }, currentCycleMonth);
  };

  // Comparar 2 periodos
  const comparisonData = useMemo(() => {
    if (!compareIds) return null;
    const [idA, idB] = compareIds;
    const a = history.snapshots.find(s => s.id === idA);
    const b = history.snapshots.find(s => s.id === idB);
    if (!a || !b) return null;
    return { a, b };
  }, [compareIds, history.snapshots]);

  // Tab buttons
  const reportTabs: { key: ReportTab; label: string; labelJa: string; icon: React.ComponentType<any> }[] = [
    { key: 'company', label: 'Por Empresa', labelJa: '企業別', icon: BarChart3 },
    { key: 'payroll', label: 'Nómina', labelJa: '給与控除', icon: DollarSign },
    { key: 'tenants', label: 'Inquilinos', labelJa: '家賃控除', icon: Home },
    { key: 'property', label: 'Por Propiedad', labelJa: '物件別', icon: Building },
    { key: 'history', label: 'Histórico', labelJa: '月次履歴', icon: Calendar },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <FileText className="w-7 h-7 text-blue-500" />
            Reportes Mensuales
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {cycle.month} — {cycle.start} al {cycle.end}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-green-500/20 transition"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => exportToPDF(activeReport === 'history' ? 'company' : (activeReport as any), `Reporte ${activeReport} — ${cycle.month}`)}
            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 transition"
          >
            <Printer className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleCloseMonth}
            disabled={isCurrentMonthClosed}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg transition ${
              isCurrentMonthClosed
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
            }`}
          >
            <Save className="w-4 h-4" /> {isCurrentMonthClosed ? 'Cerrado' : 'Cerrar Mes'}
          </button>
        </div>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex gap-1 bg-black/40 p-1 rounded-xl overflow-x-auto">
        {reportTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
                activeReport === tab.key
                  ? 'bg-[#20242c] text-white shadow-lg border border-white/10'
                  : 'text-gray-500 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.labelJa}</span>
            </button>
          );
        })}
      </div>

      {/* ====== REPORTE: POR EMPRESA ====== */}
      {activeReport === 'company' && (
        <div className="rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">企業別集計 — Resumen por Empresa</h3>
            <p className="text-gray-500 text-xs mt-1">{companyReport.length} empresas con inquilinos activos</p>
          </div>
          <div className="overflow-x-auto">
            <table id="report-table-company" className="w-full text-sm">
              <thead>
                <tr className="bg-black/40">
                  <th className="text-left px-4 py-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">派遣先</th>
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">物件数</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">契約家賃</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">設定家賃</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">利益</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">支給家賃控除</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">月家賃利益</th>
                </tr>
              </thead>
              <tbody>
                {companyReport.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-bold text-white">{row.company}</td>
                    <td className="px-3 py-3 text-center text-gray-300">{row.property_count}</td>
                    <td className="px-3 py-3 text-right font-mono text-gray-300">¥{row.rent_cost.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono text-gray-300">¥{row.rent_target.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${row.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ¥{row.profit.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-blue-400">¥{row.payroll_deduction.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${row.monthly_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ¥{row.monthly_profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-900/20 border-t-2 border-blue-500/30">
                  <td className="px-4 py-3 font-black text-white">合計</td>
                  <td className="px-3 py-3 text-center font-bold text-white">{companyTotals.total_properties}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{companyTotals.total_rent_cost.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{companyTotals.total_rent_target.toLocaleString()}</td>
                  <td className={`px-3 py-3 text-right font-mono font-black text-lg ${companyTotals.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ¥{companyTotals.total_profit.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-400">¥{companyTotals.total_payroll.toLocaleString()}</td>
                  <td className={`px-3 py-3 text-right font-mono font-black text-lg ${companyTotals.total_monthly_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ¥{companyTotals.total_monthly_profit.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ====== REPORTE: NÓMINA / DESCUENTOS ====== */}
      {activeReport === 'payroll' && (
        <div className="rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">給与控除一覧 — Descuentos Nómina</h3>
              <p className="text-gray-500 text-xs mt-1">Para contabilidad: montos a descontar de cada empleado</p>
            </div>
            <select
              value={companyFilter}
              onChange={e => setCompanyFilter(e.target.value)}
              className="bg-black/50 border border-gray-700 text-white px-4 py-2 rounded-xl text-sm outline-none"
            >
              <option value="">Todas las empresas</option>
              {uniqueCompanies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table id="report-table-payroll" className="w-full text-sm">
              <thead>
                <tr className="bg-black/40">
                  <th className="text-left px-4 py-3 text-[10px] text-gray-400 uppercase font-bold tracking-wider">社員No</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">派遣先</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">カナ</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">氏名</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">アパート</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">家賃控除</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">駐車場控除</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">控除合計</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayroll.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-mono text-gray-300">{row.employee_id}</td>
                    <td className="px-3 py-3 text-gray-300">{row.company}</td>
                    <td className="px-3 py-3 text-gray-300">{row.name_kana}</td>
                    <td className="px-3 py-3 font-bold text-white">{row.name}</td>
                    <td className="px-3 py-3 text-gray-400">{row.property_name}</td>
                    <td className="px-3 py-3 text-right font-mono text-gray-300">¥{row.rent_deduction.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono text-blue-400">¥{row.parking_deduction.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{row.total_deduction.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-900/20 border-t-2 border-blue-500/30">
                  <td className="px-4 py-3 font-black text-white">合計</td>
                  <td className="px-3 py-3 text-gray-400"></td>
                  <td className="px-3 py-3 text-gray-400"></td>
                  <td className="px-3 py-3 font-bold text-white">{filteredPayrollTotals.total_employees}名</td>
                  <td className="px-3 py-3 text-gray-400"></td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{filteredPayrollTotals.total_rent.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-blue-400">¥{filteredPayrollTotals.total_parking.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-black text-lg text-green-400">¥{filteredPayrollTotals.total_deduction.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ====== REPORTE: INQUILINOS POR PROPIEDAD (家賃控除) ====== */}
      {activeReport === 'tenants' && (
        <div className="space-y-4" id="report-table-tenants">
          {/* Totales arriba */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#1a1d24]/80 p-3 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-bold">物件数</div>
              <div className="text-lg font-black text-white font-mono">{tenantsByProperty.length}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1a1d24]/80 p-3 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-bold">入居者数</div>
              <div className="text-lg font-black text-white font-mono">{tenantsByPropertyTotals.totalActive}名</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1a1d24]/80 p-3 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-bold">家賃合計</div>
              <div className="text-lg font-black text-green-400 font-mono">¥{tenantsByPropertyTotals.totalCollected.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#1a1d24]/80 p-3 text-center">
              <div className="text-[9px] text-gray-500 uppercase font-bold">契約家賃合計</div>
              <div className="text-lg font-black text-blue-400 font-mono">¥{tenantsByPropertyTotals.totalTarget.toLocaleString()}</div>
            </div>
          </div>

          {/* Bloques por propiedad */}
          {tenantsByProperty.map((group) => {
            const p = group.property;
            const displayName = `${p.name}${p.room_number ? `　${p.room_number}` : ''}`;
            return (
              <div key={p.id} className="rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
                {/* Header de propiedad (barra coloreada como Excel) */}
                <div className={`px-5 py-3 flex items-center justify-between ${
                  group.contractAlert ? 'bg-yellow-600/20 border-b border-yellow-500/30' : 'bg-blue-600/15 border-b border-blue-500/20'
                }`}>
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="font-black text-white text-base">{displayName}</span>
                      {p.type && <span className="text-gray-400 text-xs ml-2">({p.type})</span>}
                    </div>
                    {group.contractAlert && (
                      <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {group.contractAlert}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-[9px] text-gray-500 uppercase">契約家賃</div>
                      <div className="font-mono font-bold text-gray-300">¥{group.totalCost.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] text-gray-500 uppercase">設定家賃</div>
                      <div className="font-mono font-bold text-blue-400">¥{group.rentTarget.toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Tabla de inquilinos */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-black/30">
                      <th className="text-left px-4 py-2 text-[10px] text-gray-500 uppercase font-bold">入居日</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">退去日</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">社員番号</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">職場</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">名前</th>
                      <th className="text-left px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">カナ</th>
                      <th className="text-right px-3 py-2 text-[10px] text-gray-500 uppercase font-bold">家賃</th>
                      <th className="text-right px-4 py-2 text-[10px] text-gray-500 uppercase font-bold">駐車場</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.activeTenants.map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="px-4 py-2.5 font-mono text-gray-300 text-xs">{t.entry_date || '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-500 text-xs">{t.exit_date || ''}</td>
                        <td className="px-3 py-2.5 font-mono text-gray-300">{t.employee_id}</td>
                        <td className="px-3 py-2.5 text-gray-400">{t.company || ''}</td>
                        <td className="px-3 py-2.5 font-bold text-white">{t.name}</td>
                        <td className="px-3 py-2.5 text-gray-400">{t.name_kana}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-green-400">¥{(t.rent_contribution || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-blue-400">{t.parking_fee ? `¥${t.parking_fee.toLocaleString()}` : ''}</td>
                      </tr>
                    ))}
                    {/* Inquilinos inactivos (históricos) */}
                    {group.inactiveTenants.map((t: any) => (
                      <tr key={t.id} className="border-b border-white/5 opacity-40">
                        <td className="px-4 py-2 font-mono text-gray-500 text-xs">{t.entry_date || '—'}</td>
                        <td className="px-3 py-2 font-mono text-red-400 text-xs font-bold">{t.exit_date || '—'}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{t.employee_id}</td>
                        <td className="px-3 py-2 text-gray-600">{t.company || ''}</td>
                        <td className="px-3 py-2 text-gray-500 line-through">{t.name}</td>
                        <td className="px-3 py-2 text-gray-600">{t.name_kana}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">¥{(t.rent_contribution || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-600">{t.parking_fee ? `¥${t.parking_fee.toLocaleString()}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* ====== REPORTE: POR PROPIEDAD ====== */}
      {activeReport === 'property' && (
        <div className="rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
          <div className="p-5 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">物件別詳細 — Detalle por Propiedad</h3>
            <p className="text-gray-500 text-xs mt-1">{propertyReport.length} propiedades activas | {propertyTotals.total_occupants} ocupantes | {propertyTotals.total_vacancy} vacantes</p>
          </div>
          <div className="overflow-x-auto">
            <table id="report-table-property" className="w-full text-sm">
              <thead>
                <tr className="bg-black/40">
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">NO</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">地区</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">アパート名</th>
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">部屋</th>
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">間取</th>
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">入居</th>
                  <th className="text-center px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">空</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">契約家賃</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">設定家賃</th>
                  <th className="text-right px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">利益</th>
                  <th className="text-left px-3 py-3 text-[10px] text-gray-400 uppercase font-bold">備考</th>
                </tr>
              </thead>
              <tbody>
                {propertyReport.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="px-3 py-3 text-center font-mono text-gray-500">{row.no}</td>
                    <td className="px-3 py-3 text-gray-400">{row.area}</td>
                    <td className="px-3 py-3 font-bold text-white">{row.property_name}</td>
                    <td className="px-3 py-3 text-center font-mono text-blue-400">{row.room_number}</td>
                    <td className="px-3 py-3 text-center text-gray-300">{row.layout}</td>
                    <td className="px-3 py-3 text-center text-gray-300">{row.occupant_count}</td>
                    <td className={`px-3 py-3 text-center font-bold ${row.vacancy > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {row.vacancy > 0 ? `${row.vacancy}空` : '満'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-gray-300">¥{row.rent_cost.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right font-mono text-gray-300">¥{row.rent_target.toLocaleString()}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${row.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ¥{row.profit.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-blue-900/20 border-t-2 border-blue-500/30">
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 font-black text-white">合計</td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3"></td>
                  <td className="px-3 py-3 text-center font-bold text-white">{propertyTotals.total_occupants}</td>
                  <td className="px-3 py-3 text-center font-bold text-yellow-400">{propertyTotals.total_vacancy}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{propertyTotals.total_rent_cost.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-white">¥{propertyTotals.total_rent_target.toLocaleString()}</td>
                  <td className={`px-3 py-3 text-right font-mono font-black text-lg ${propertyTotals.total_profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ¥{propertyTotals.total_profit.toLocaleString()}
                  </td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ====== HISTÓRICO ====== */}
      {activeReport === 'history' && (
        <div className="space-y-6">
          {/* KPI Cards del mes actual */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniKPI label="Propiedades" value={propertyTotals.total_properties.toString()} icon={Building} />
            <MiniKPI label="Inquilinos" value={payrollTotals.total_employees.toString()} icon={Users} />
            <MiniKPI label="Recaudado" value={`¥${payrollTotals.total_deduction.toLocaleString()}`} icon={DollarSign} />
            <MiniKPI label="Beneficio" value={`¥${propertyTotals.total_profit.toLocaleString()}`} icon={TrendingUp} positive={propertyTotals.total_profit >= 0} />
          </div>

          {/* Lista de cierres */}
          <div className="rounded-2xl border border-white/10 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="p-5 border-b border-white/5 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">月次履歴 — Histórico Mensual</h3>
                <p className="text-gray-500 text-xs mt-1">{history.snapshots.length} cierre(s) guardados</p>
              </div>
              {history.snapshots.length >= 2 && (
                <button
                  onClick={() => {
                    if (compareIds) {
                      setCompareIds(null);
                    } else {
                      const [a, b] = history.snapshots.slice(0, 2);
                      setCompareIds([a.id, b.id]);
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                >
                  <BarChart3 className="w-4 h-4" />
                  {compareIds ? 'Cerrar Comparativa' : 'Comparar Periodos'}
                </button>
              )}
            </div>

            {history.snapshots.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No hay cierres de mes guardados.</p>
                <p className="text-gray-600 text-xs mt-1">Use "Cerrar Mes" para guardar el primer snapshot.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {history.snapshots.map(snap => (
                  <div key={snap.id} className="hover:bg-white/5 transition">
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedSnapshot(expandedSnapshot === snap.id ? null : snap.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                          <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{snap.cycle_month}</div>
                          <div className="text-xs text-gray-500">{snap.cycle_start} — {snap.cycle_end}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden md:block">
                          <div className="text-xs text-gray-500">{snap.total_properties} prop. | {snap.total_tenants} inq.</div>
                          <div className={`font-mono font-bold ${snap.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ¥{snap.profit.toLocaleString()}
                          </div>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar cierre ${snap.cycle_month}?`)) { deleteSnapshot(snap.id); setHistoryVersion(v => v + 1); } }}
                          className="text-gray-600 hover:text-red-400 p-1 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedSnapshot === snap.id ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                      </div>
                    </div>
                    {expandedSnapshot === snap.id && (
                      <SnapshotDetail snapshot={snap} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comparativa */}
          {compareIds && comparisonData && (
            <ComparisonView a={comparisonData.a} b={comparisonData.b} />
          )}
        </div>
      )}
    </div>
  );
};

// ============ SUB-COMPONENTES ============

const MiniKPI: React.FC<{ label: string; value: string; icon: React.ComponentType<any>; positive?: boolean }> = ({
  label, value, icon: Icon, positive = true,
}) => (
  <div className="rounded-xl border border-white/10 bg-[#1a1d24]/80 p-4">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-blue-400" />
      <span className="text-[10px] text-gray-500 uppercase font-bold">{label}</span>
    </div>
    <div className={`text-xl font-black font-mono ${positive !== false ? 'text-white' : 'text-red-400'}`}>{value}</div>
  </div>
);

const SnapshotDetail: React.FC<{ snapshot: MonthlySnapshot }> = ({ snapshot: s }) => (
  <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
    <div className="bg-black/30 p-3 rounded-lg">
      <div className="text-[9px] text-gray-500 uppercase">Recaudado</div>
      <div className="text-sm font-mono font-bold text-green-400">¥{s.total_collected.toLocaleString()}</div>
    </div>
    <div className="bg-black/30 p-3 rounded-lg">
      <div className="text-[9px] text-gray-500 uppercase">Costo</div>
      <div className="text-sm font-mono font-bold text-red-400">¥{s.total_cost.toLocaleString()}</div>
    </div>
    <div className="bg-black/30 p-3 rounded-lg">
      <div className="text-[9px] text-gray-500 uppercase">Objetivo</div>
      <div className="text-sm font-mono font-bold text-blue-400">¥{s.total_target.toLocaleString()}</div>
    </div>
    <div className="bg-black/30 p-3 rounded-lg">
      <div className="text-[9px] text-gray-500 uppercase">Ocupación</div>
      <div className="text-sm font-mono font-bold text-white">{s.occupancy_rate}%</div>
    </div>
    <div className="col-span-2 md:col-span-4 text-[10px] text-gray-600">
      Cerrado: {new Date(s.closed_at).toLocaleString('ja-JP')} | {s.company_summary.length} empresas | {s.payroll_detail.length} empleados
    </div>
  </div>
);

const ComparisonView: React.FC<{ a: MonthlySnapshot; b: MonthlySnapshot }> = ({ a, b }) => {
  const diff = (valA: number, valB: number) => valA - valB;
  const pct = (valA: number, valB: number) => valB !== 0 ? Math.round((valA - valB) / Math.abs(valB) * 100) : 0;

  const rows = [
    { label: 'Recaudado', ja: '回収額', valA: a.total_collected, valB: b.total_collected },
    { label: 'Costo', ja: '費用', valA: a.total_cost, valB: b.total_cost },
    { label: 'Beneficio', ja: '利益', valA: a.profit, valB: b.profit },
    { label: 'Objetivo', ja: '目標', valA: a.total_target, valB: b.total_target },
    { label: 'Inquilinos', ja: '入居者', valA: a.total_tenants, valB: b.total_tenants },
    { label: 'Ocupación %', ja: '入居率', valA: a.occupancy_rate, valB: b.occupancy_rate },
  ];

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-[#1a1d24]/80 backdrop-blur-md shadow-xl overflow-hidden">
      <div className="p-5 border-b border-purple-500/10 bg-purple-500/5">
        <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Comparativa: {a.cycle_month} <ArrowRight className="w-4 h-4" /> {b.cycle_month}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-black/40">
              <th className="text-left px-4 py-3 text-[10px] text-gray-400 uppercase font-bold">Métrica</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-400 uppercase font-bold">{a.cycle_month}</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-400 uppercase font-bold">{b.cycle_month}</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-400 uppercase font-bold">Diferencia</th>
              <th className="text-right px-4 py-3 text-[10px] text-gray-400 uppercase font-bold">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const d = diff(row.valA, row.valB);
              const p = pct(row.valA, row.valB);
              const isMonetary = !row.label.includes('%') && !row.label.includes('Inquilinos');
              return (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3 text-white font-bold">
                    {row.label} <span className="text-gray-500 text-xs">({row.ja})</span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">
                    {isMonetary ? `¥${row.valA.toLocaleString()}` : row.valA}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-300">
                    {isMonetary ? `¥${row.valB.toLocaleString()}` : row.valB}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${d >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {d >= 0 ? '+' : ''}{isMonetary ? `¥${d.toLocaleString()}` : d}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold ${p >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {p >= 0 ? '+' : ''}{p}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
