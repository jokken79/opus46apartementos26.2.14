/**
 * HOOK: useReports
 * Lógica de generación de reportes mensuales
 * - Reporte por propiedad (detalle habitación)
 * - Resumen por empresa (派遣先)
 * - Descuentos nómina (contabilidad)
 * - Histórico mensual (cierre de mes)
 */

import { useMemo, useCallback } from 'react';
import {
  PropertyReportRow,
  CompanyReportRow,
  PayrollDeductionRow,
  MonthlySnapshot,
  ReportHistory,
  AppDatabase,
} from '../types/database';
import { unsDB } from '../db/dexie';

// Extraer zona/distrito del nombre o dirección
function extractArea(name: string, address: string): string {
  // Buscar patrones comunes de zona en nombre de propiedad
  const areaPatterns = [
    /(.+事業所)/,
    /(.+工場)/,
    /(.+支店)/,
  ];
  for (const p of areaPatterns) {
    const m = name.match(p);
    if (m) return m[1];
  }
  // Usar primeros caracteres de dirección como zona
  if (address) {
    const parts = address.split(/[　 ]/);
    if (parts.length >= 2) return parts[0];
    return address.substring(0, 6);
  }
  return '';
}

export function useReports(db: AppDatabase) {

  // Propiedades activas (contrato vigente)
  const activeProperties = useMemo(() => {
    return db.properties.filter(p => {
      if (!p.contract_end) return true;
      const d = new Date(p.contract_end);
      return isNaN(d.getTime()) || d > new Date();
    });
  }, [db.properties]);

  // Inquilinos activos
  const activeTenants = useMemo(() => {
    return db.tenants.filter(t => t.status === 'active');
  }, [db.tenants]);

  // ========================================
  // REPORTE 1: Detalle por propiedad
  // (como imagen 3 del Excel)
  // ========================================
  const propertyReport = useMemo((): PropertyReportRow[] => {
    return activeProperties.map((p, idx) => {
      const tenants = activeTenants.filter(t => t.property_id === p.id);
      const totalCollected = tenants.reduce((a, t) => a + t.rent_contribution + t.parking_fee, 0);
      const totalCost = (p.rent_cost || 0) + (p.kanri_hi || 0) + (p.parking_cost || 0);
      const vacancy = Math.max(0, p.capacity - tenants.length);

      // Notas automáticas
      const notes: string[] = [];
      if (p.contract_end) {
        const d = new Date(p.contract_end);
        const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
        if (diff <= 60 && diff > 0) notes.push(`契約${diff}日で満了`);
        if (diff <= 0) notes.push('契約期限切れ');
      }
      if (tenants.some(t => t.rent_contribution === 0)) notes.push('家賃¥0あり');

      return {
        no: idx + 1,
        area: extractArea(p.name, p.address),
        property_name: p.name,
        room_number: p.room_number || '',
        layout: p.type || '1K',
        occupant_count: tenants.length,
        vacancy,
        rent_cost: totalCost,
        rent_target: p.rent_price_uns || 0,
        profit: totalCollected - totalCost,
        notes: notes.join('; '),
      };
    });
  }, [activeProperties, activeTenants]);

  // ========================================
  // REPORTE 2: Resumen por empresa (派遣先)
  // (como imagen 1 del Excel)
  // ========================================
  const companyReport = useMemo((): CompanyReportRow[] => {
    // Agrupar inquilinos activos por empresa
    const companyMap = new Map<string, {
      propertyIds: Set<number>;
      rentCost: number;
      rentTarget: number;
      payrollDeduction: number;
    }>();

    activeTenants.forEach(t => {
      const company = t.company || '(sin empresa)';
      if (!companyMap.has(company)) {
        companyMap.set(company, {
          propertyIds: new Set(),
          rentCost: 0,
          rentTarget: 0,
          payrollDeduction: 0,
        });
      }
      const entry = companyMap.get(company)!;
      entry.propertyIds.add(t.property_id);
      entry.payrollDeduction += t.rent_contribution + t.parking_fee;
    });

    // Calcular costos por propiedad (proporcional a inquilinos de cada empresa)
    companyMap.forEach((entry, company) => {
      entry.propertyIds.forEach(pid => {
        const prop = db.properties.find(p => p.id === pid);
        if (prop) {
          const tenantsInProp = activeTenants.filter(t => t.property_id === pid);
          const companyTenantsInProp = tenantsInProp.filter(
            t => (t.company || '(sin empresa)') === company
          );
          // Proporcional del costo según inquilinos de ESTA empresa en la propiedad
          const totalInProp = tenantsInProp.length || 1;
          const fromCompany = companyTenantsInProp.length;
          const propCost = (prop.rent_cost || 0) + (prop.kanri_hi || 0) + (prop.parking_cost || 0);
          const propTarget = prop.rent_price_uns || 0;
          entry.rentCost += Math.round(propCost * fromCompany / totalInProp);
          entry.rentTarget += Math.round(propTarget * fromCompany / totalInProp);
        }
      });
    });

    const rows: CompanyReportRow[] = [];
    companyMap.forEach((entry, company) => {
      rows.push({
        company,
        property_count: entry.propertyIds.size,
        rent_cost: entry.rentCost,
        rent_target: entry.rentTarget,
        profit: entry.rentTarget - entry.rentCost,
        payroll_deduction: entry.payrollDeduction,
        monthly_profit: entry.payrollDeduction - entry.rentCost,
      });
    });

    // Ordenar por nombre de empresa
    rows.sort((a, b) => a.company.localeCompare(b.company, 'ja'));
    return rows;
  }, [activeTenants, db.properties]);

  // ========================================
  // REPORTE 3: Descuentos nómina
  // (como imagen 2 del Excel - para contabilidad)
  // ========================================
  const payrollReport = useMemo((): PayrollDeductionRow[] => {
    return activeTenants
      .filter(t => t.rent_contribution > 0 || t.parking_fee > 0)
      .map(t => {
        const prop = db.properties.find(p => p.id === t.property_id);
        return {
          employee_id: t.employee_id,
          company: t.company || '',
          name_kana: t.name_kana,
          name: t.name,
          property_name: prop?.name || '',
          rent_deduction: t.rent_contribution,
          parking_deduction: t.parking_fee,
          total_deduction: t.rent_contribution + t.parking_fee,
        };
      })
      .sort((a, b) => a.company.localeCompare(b.company, 'ja') || a.name_kana.localeCompare(b.name_kana, 'ja'));
  }, [activeTenants, db.properties]);

  // ========================================
  // TOTALES para cada reporte
  // ========================================
  const propertyTotals = useMemo(() => {
    return {
      total_properties: propertyReport.length,
      total_occupants: propertyReport.reduce((a, r) => a + r.occupant_count, 0),
      total_vacancy: propertyReport.reduce((a, r) => a + r.vacancy, 0),
      total_rent_cost: propertyReport.reduce((a, r) => a + r.rent_cost, 0),
      total_rent_target: propertyReport.reduce((a, r) => a + r.rent_target, 0),
      total_profit: propertyReport.reduce((a, r) => a + r.profit, 0),
    };
  }, [propertyReport]);

  const companyTotals = useMemo(() => {
    return {
      total_companies: companyReport.length,
      total_properties: companyReport.reduce((a, r) => a + r.property_count, 0),
      total_rent_cost: companyReport.reduce((a, r) => a + r.rent_cost, 0),
      total_rent_target: companyReport.reduce((a, r) => a + r.rent_target, 0),
      total_profit: companyReport.reduce((a, r) => a + r.profit, 0),
      total_payroll: companyReport.reduce((a, r) => a + r.payroll_deduction, 0),
      total_monthly_profit: companyReport.reduce((a, r) => a + r.monthly_profit, 0),
    };
  }, [companyReport]);

  const payrollTotals = useMemo(() => {
    return {
      total_employees: payrollReport.length,
      total_rent: payrollReport.reduce((a, r) => a + r.rent_deduction, 0),
      total_parking: payrollReport.reduce((a, r) => a + r.parking_deduction, 0),
      total_deduction: payrollReport.reduce((a, r) => a + r.total_deduction, 0),
    };
  }, [payrollReport]);

  // ========================================
  // HISTÓRICO: Guardar/leer snapshots (IndexedDB via Dexie)
  // ========================================
  const loadHistory = useCallback(async (): Promise<ReportHistory> => {
    try {
      const snapshots = await unsDB.snapshots.orderBy('cycle_month').reverse().toArray();
      return { snapshots: snapshots as unknown as MonthlySnapshot[], version: '1.0' };
    } catch {
      return { snapshots: [], version: '1.0' };
    }
  }, []);

  const saveSnapshot = useCallback(async (cycleMonth: string, cycleStart: string, cycleEnd: string) => {
    // No duplicar si ya existe cierre del mismo mes
    const existing = await unsDB.snapshots.where('cycle_month').equals(cycleMonth).first();
    if (existing) {
      return { success: false, error: `Ya existe cierre para ${cycleMonth}` };
    }

    const snapshot: MonthlySnapshot = {
      id: `snap_${Date.now()}`,
      cycle_month: cycleMonth,
      cycle_start: cycleStart,
      cycle_end: cycleEnd,
      closed_at: new Date().toISOString(),
      total_properties: propertyTotals.total_properties,
      total_tenants: payrollTotals.total_employees,
      total_collected: payrollTotals.total_deduction,
      total_cost: propertyTotals.total_rent_cost,
      total_target: propertyTotals.total_rent_target,
      profit: propertyTotals.total_profit,
      occupancy_rate: (propertyTotals.total_occupants + propertyTotals.total_vacancy) > 0
        ? Math.round(propertyTotals.total_occupants / (propertyTotals.total_occupants + propertyTotals.total_vacancy) * 100)
        : 0,
      company_summary: [...companyReport],
      property_detail: [...propertyReport],
      payroll_detail: [...payrollReport],
    };

    try {
      await unsDB.snapshots.put(snapshot as any);
      return { success: true, snapshot };
    } catch {
      return { success: false, error: 'Error al guardar en IndexedDB' };
    }
  }, [propertyTotals, payrollTotals, companyReport, propertyReport, payrollReport]);

  const deleteSnapshot = useCallback(async (snapshotId: string) => {
    try {
      await unsDB.snapshots.delete(snapshotId);
    } catch (error) {
      console.error('[useReports] Error eliminando snapshot:', error);
    }
  }, []);

  return {
    // Reportes actuales
    propertyReport,
    companyReport,
    payrollReport,
    // Totales
    propertyTotals,
    companyTotals,
    payrollTotals,
    // Histórico
    loadHistory,
    saveSnapshot,
    deleteSnapshot,
  };
}
