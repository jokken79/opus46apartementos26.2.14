import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { AppDatabase, Employee, Property } from '../types/database';

export function useExcelImport(db: AppDatabase, setDb: (db: AppDatabase) => void, generateId: () => number, setActiveTab: (tab: string) => void) {
  const [importStatus, setImportStatus] = useState({ type: '', msg: '' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [previewData, setPreviewData] = useState<any>([]);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [previewSummary, setPreviewSummary] = useState('');

  const processExcelFile = (file: File) => {
    setImportStatus({ type: 'loading', msg: '' });
    setPreviewData([]);
    setDetectedType(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
        const sn: string[] = wb.SheetNames;
        const empSheets = sn.filter((n: string) => {
          const name = n.toLowerCase();
          return name.includes('genzai') || name.includes('ukeoi') || name.includes('台帳') ||
            name.includes('employee') || name.includes('staff') || name.includes('名簿') ||
            name.includes('一覧') || name.includes('member');
        });
        const prop = sn.find((n: string) => n.includes('会社寮情報'));
        const ten = sn.find((n: string) => n.includes('入居者一覧'));

        if (empSheets.length > 0) {
          let mergedData: any[] = [];
          empSheets.forEach(sheetName => {
            const sheetData: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
            const dataWithSheet = sheetData.map(row => ({ ...row, _sheet: sheetName }));
            mergedData = [...mergedData, ...dataWithSheet];
          });
          setPreviewData(mergedData);
          setDetectedType('employees');
          setPreviewSummary(`社員台帳: ${mergedData.length} empleados detectados en ${empSheets.length} hojas (${empSheets.join(', ')}).`);
          setImportStatus({ type: 'success', msg: 'OK' });
        } else if (sn.length === 1 && !prop && !ten) {
          const d: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sn[0]], { defval: "" });
          const dataWithSheet = d.map(row => ({ ...row, _sheet: sn[0] }));
          setPreviewData(dataWithSheet);
          setDetectedType('employees');
          setPreviewSummary(`社員台帳 (Hoja única: ${sn[0]}): ${d.length} empleados detectados.`);
          setImportStatus({ type: 'success', msg: 'OK' });
        } else if (prop || ten) {
          const c: any = { properties: [], tenants: [] };
          let t = 'Gestión de Renta:\n';
          if (prop) {
            const p = XLSX.utils.sheet_to_json(wb.Sheets[prop], { defval: "" });
            c.properties = p;
            t += `- ${p.length} Propiedades\n`;
          }
          if (ten) {
            const tt = XLSX.utils.sheet_to_json(wb.Sheets[ten], { defval: "" });
            c.tenants = tt;
            t += `- ${tt.length} Inquilinos`;
          }
          setPreviewData(c);
          setDetectedType('rent_management');
          setPreviewSummary(t);
          setImportStatus({ type: 'success', msg: 'OK' });
        } else {
          setImportStatus({ type: 'error', msg: 'Formato no reconocido.' });
        }
      } catch {
        setImportStatus({ type: 'error', msg: 'Error de lectura.' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const saveToDatabase = () => {
    const newDb: AppDatabase = JSON.parse(JSON.stringify(db));
    let tab = 'dashboard';

    if (detectedType === 'employees') {
      let countGenzai = 0, countUkeoi = 0, countStaff = 0;

      previewData.forEach((r: any) => {
        const keys = Object.keys(r);
        if (keys.length === 0) return;

        const sourceSheet = String(r._sheet || '').toLowerCase();
        let employeeId = '';
        let employeeName = '';
        let employeeKana = '';
        let employeeCompany = '';
        let targetTable: 'genzai' | 'ukeoi' | 'staff' | 'legacy' = 'legacy';

        if (sourceSheet.includes('genzai')) {
          employeeId = String(r['社員№'] || r['社員No'] || r['社員no'] || '').trim();
          employeeName = String(r['氏名'] || '').trim();
          employeeKana = String(r['カナ'] || r['氏名カナ'] || '').trim();
          employeeCompany = String(r['派遣先'] || '').trim();
          targetTable = 'genzai';
        } else if (sourceSheet.includes('ukeoi')) {
          employeeId = String(r['社員№'] || r['社員No'] || r['社員no'] || '').trim();
          employeeName = String(r['氏名'] || '').trim();
          employeeKana = String(r['カナ'] || r['氏名カナ'] || '').trim();
          employeeCompany = '岡山';
          targetTable = 'ukeoi';
        } else if (sourceSheet.includes('staff')) {
          employeeId = String(r['社員№'] || r['社員No'] || r['社員no'] || '').trim();
          employeeName = String(r['氏名'] || '').trim();
          employeeKana = String(r['カナ'] || r['氏名カナ'] || '').trim();
          employeeCompany = '事務所';
          targetTable = 'staff';
        } else {
          const findKey = (candidates: string[]) => {
            return keys.find(k => {
              const normalized = k.trim().toLowerCase().replace(/\s/g, '');
              return candidates.some(c => normalized === c || normalized.includes(c));
            });
          };

          const idKey = findKey(['社員no', '社員ｎｏ', '社員番号', '社員コード', '社員ｺｰﾄﾞ', 'id', 'no', 'no.', 'コード', 'ｺｰﾄﾞ', 'empid', 'staffid', '番号']) || keys[0];
          const nameKey = findKey(['氏名', '名前', 'name', 'fullname', 'staffname', '氏名漢', '名称']) || (keys[1] || keys[0]);
          const kanaKey = findKey(['カナ', 'かな', 'kana', '氏名カナ', 'ﾌﾘｶﾞﾅ', 'フリガナ']);
          const companyKey = findKey(['派遣先', 'company', 'workplace', '所属', '部署']);

          employeeId = String(r[idKey] || '').trim();
          employeeName = String(r[nameKey] || '').trim();
          employeeKana = String(kanaKey ? r[kanaKey] : '').trim();
          employeeCompany = String(companyKey ? r[companyKey] : '').trim();
          targetTable = 'legacy';
        }

        if (!employeeId && !employeeName) return;

        const emp: Employee = {
          id: employeeId || 'N/A',
          name: employeeName || 'Sin Nombre',
          name_kana: employeeKana,
          company: employeeCompany,
          full_data: r
        };

        if (targetTable === 'genzai') {
          const i = newDb.employeesGenzai.findIndex(e => e.id === emp.id);
          if (i >= 0) newDb.employeesGenzai[i] = emp; else newDb.employeesGenzai.push(emp);
          countGenzai++;
        } else if (targetTable === 'ukeoi') {
          const i = newDb.employeesUkeoi.findIndex(e => e.id === emp.id);
          if (i >= 0) newDb.employeesUkeoi[i] = emp; else newDb.employeesUkeoi.push(emp);
          countUkeoi++;
        } else if (targetTable === 'staff') {
          const i = newDb.employeesStaff.findIndex(e => e.id === emp.id);
          if (i >= 0) newDb.employeesStaff[i] = emp; else newDb.employeesStaff.push(emp);
          countStaff++;
        } else {
          const i = newDb.employees.findIndex(e => e.id === emp.id);
          if (i >= 0) newDb.employees[i] = emp; else newDb.employees.push(emp);
        }
      });

      console.log(`[Import] Genzai: ${countGenzai}, Ukeoi: ${countUkeoi}, Staff: ${countStaff}`);
      tab = 'employees';
    } else if (detectedType === 'rent_management') {
      const { properties, tenants } = previewData;
      properties.forEach((r: any) => {
        const n = r['ｱﾊﾟｰﾄ'] || r['物件名'];
        if (!n) return;
        const ex = newDb.properties.find(p => p.name === n);
        const pid = ex ? ex.id : generateId();
        const o: Property = {
          id: pid,
          name: String(n).trim(),
          address: String(r['住所'] || '').trim(),
          capacity: parseInt(r['入居人数'] || 2) || 2,
          rent_cost: parseInt(r['家賃'] || 0),
          rent_price_uns: parseInt(r['USN家賃'] || 0),
          parking_cost: parseInt(r['駐車場代'] || 0),
          parking_capacity: 1
        };
        if (ex) Object.assign(ex, o); else newDb.properties.push(o);
      });

      tenants.forEach((r: any, idx: number) => {
        const apt = r['ｱﾊﾟｰﾄ'];
        const kana = r['カナ'];
        if (!apt || !kana) return;
        const pr = newDb.properties.find(p => p.name === apt);
        if (!pr) return;
        if (!newDb.tenants.find(t => t.name_kana === kana && t.property_id === pr.id)) {
          newDb.tenants.push({
            id: generateId(),
            employee_id: `IMP-${idx}`,
            name: kana,
            name_kana: kana,
            property_id: pr.id,
            rent_contribution: parseInt(r['家賃'] || 0),
            parking_fee: parseInt(r['駐車場'] || 0),
            entry_date: r['入居'] || new Date().toISOString().split('T')[0],
            status: 'active'
          });
        }
      });
      tab = 'properties';
    }

    setDb(newDb);
    setPreviewData([]);
    setDetectedType(null);
    setImportStatus({ type: '', msg: '' });
    setActiveTab(tab);
  };

  return {
    importStatus,
    setImportStatus,
    previewData,
    detectedType,
    previewSummary,
    processExcelFile,
    saveToDatabase
  };
}
