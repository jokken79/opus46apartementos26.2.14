/**
 * HOOK: useReportExport
 * Exportación de reportes a Excel (SheetJS) y PDF (window.print)
 */

import { useCallback } from 'react';
import {
  PropertyReportRow,
  CompanyReportRow,
  PayrollDeductionRow,
} from '../types/database';

interface ExportTotals {
  propertyTotals: {
    total_properties: number;
    total_occupants: number;
    total_vacancy: number;
    total_rent_cost: number;
    total_rent_target: number;
    total_profit: number;
  };
  companyTotals: {
    total_companies: number;
    total_properties: number;
    total_rent_cost: number;
    total_rent_target: number;
    total_profit: number;
    total_payroll: number;
    total_monthly_profit: number;
  };
  payrollTotals: {
    total_employees: number;
    total_rent: number;
    total_parking: number;
    total_deduction: number;
  };
}

export function useReportExport() {

  // ========================================
  // EXPORTAR A EXCEL (SheetJS)
  // ========================================
  const exportToExcel = useCallback((
    propertyData: PropertyReportRow[],
    companyData: CompanyReportRow[],
    payrollData: PayrollDeductionRow[],
    totals: ExportTotals,
    cycleMonth: string,
  ) => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert('SheetJS no disponible. Espere a que cargue e intente de nuevo.');
      return;
    }

    const wb = XLSX.utils.book_new();

    // --- Hoja 1: Resumen por empresa ---
    const companyRows = companyData.map(r => ({
      '派遣先': r.company,
      '物件数': r.property_count,
      '契約家賃': r.rent_cost,
      '設定家賃': r.rent_target,
      '利益': r.profit,
      '支給家賃控除': r.payroll_deduction,
      '月家賃利益': r.monthly_profit,
    }));
    // Fila de totales
    companyRows.push({
      '派遣先': '合計',
      '物件数': totals.companyTotals.total_properties,
      '契約家賃': totals.companyTotals.total_rent_cost,
      '設定家賃': totals.companyTotals.total_rent_target,
      '利益': totals.companyTotals.total_profit,
      '支給家賃控除': totals.companyTotals.total_payroll,
      '月家賃利益': totals.companyTotals.total_monthly_profit,
    });
    const wsCompany = XLSX.utils.json_to_sheet(companyRows);
    // Ancho de columnas
    wsCompany['!cols'] = [
      { wch: 25 }, { wch: 8 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsCompany, '企業別集計');

    // --- Hoja 2: Descuentos nómina ---
    const payrollRows = payrollData.map(r => ({
      '社員No': r.employee_id,
      '派遣先': r.company,
      'カナ': r.name_kana,
      '氏名': r.name,
      'アパート': r.property_name,
      '家賃控除': r.rent_deduction,
      '駐車場控除': r.parking_deduction,
      '控除合計': r.total_deduction,
    }));
    payrollRows.push({
      '社員No': '合計',
      '派遣先': '',
      'カナ': '',
      '氏名': `${totals.payrollTotals.total_employees}名`,
      'アパート': '',
      '家賃控除': totals.payrollTotals.total_rent,
      '駐車場控除': totals.payrollTotals.total_parking,
      '控除合計': totals.payrollTotals.total_deduction,
    });
    const wsPayroll = XLSX.utils.json_to_sheet(payrollRows);
    wsPayroll['!cols'] = [
      { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 20 },
      { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, wsPayroll, '給与控除一覧');

    // --- Hoja 3: Detalle por propiedad ---
    const propRows = propertyData.map(r => ({
      'NO': r.no,
      '地区': r.area,
      'アパート名': r.property_name,
      '部屋番号': r.room_number,
      '間取': r.layout,
      '入居人数': r.occupant_count,
      '空状況': r.vacancy,
      '契約家賃': r.rent_cost,
      '設定家賃': r.rent_target,
      '利益': r.profit,
      '備考': r.notes,
    }));
    propRows.push({
      'NO': '' as any,
      '地区': '',
      'アパート名': '合計',
      '部屋番号': '',
      '間取': '',
      '入居人数': totals.propertyTotals.total_occupants,
      '空状況': totals.propertyTotals.total_vacancy,
      '契約家賃': totals.propertyTotals.total_rent_cost,
      '設定家賃': totals.propertyTotals.total_rent_target,
      '利益': totals.propertyTotals.total_profit,
      '備考': '',
    });
    const wsProp = XLSX.utils.json_to_sheet(propRows);
    wsProp['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 22 }, { wch: 8 }, { wch: 6 },
      { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsProp, '物件別詳細');

    // Descargar
    const fileName = `UNS_Reporte_${cycleMonth || new Date().toISOString().slice(0, 7)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, []);

  // ========================================
  // EXPORTAR A PDF (via window.print)
  // ========================================
  const exportToPDF = useCallback((
    reportType: 'property' | 'company' | 'payroll' | 'tenants',
    title: string,
  ) => {
    // Capturar la tabla visible del reporte activo
    const tableEl = document.getElementById(`report-table-${reportType}`);
    if (!tableEl) {
      alert('No se encontró la tabla para exportar.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Popup bloqueado. Permita popups para exportar a PDF.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))}</title>
        <style>
          @page { size: landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', 'Meiryo', sans-serif; font-size: 11px; color: #333; margin: 0; padding: 20px; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          .subtitle { color: #666; font-size: 11px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #1a1d24; color: white; padding: 8px 6px; text-align: left; font-size: 10px; font-weight: bold; }
          td { padding: 6px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
          tr:nth-child(even) { background: #f8f9fa; }
          tr:last-child { font-weight: bold; background: #e8f4fd; }
          .money { text-align: right; font-family: 'Consolas', monospace; }
          .negative { color: #dc2626; }
          .positive { color: #16a34a; }
          .footer { margin-top: 16px; text-align: right; font-size: 9px; color: #999; }
        </style>
      </head>
      <body>
        <h1>UNS Estate OS — ${title.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] || c))}</h1>
        <div class="subtitle">Generado: ${new Date().toLocaleDateString('ja-JP')} ${new Date().toLocaleTimeString('ja-JP')}</div>
        ${tableEl.outerHTML}
        <div class="footer">ユニバーサル企画株式会社</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onafterprint = () => { printWindow.close(); };
    setTimeout(() => { printWindow.print(); }, 500);
  }, []);

  return { exportToExcel, exportToPDF };
}
