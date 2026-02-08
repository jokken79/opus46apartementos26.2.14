/**
 * TIPOS PRINCIPALES - UNS Estate OS
 * Fuente única de verdad para todas las interfaces TypeScript
 */

// ============ PROPIEDAD ============
export interface Property {
  id: number;
  name: string;
  room_number?: string;
  postal_code?: string;
  address: string; // Dirección completa formateada
  address_auto?: string;
  address_detail?: string;
  type?: string; // 1K, 2K, etc
  capacity: number;

  // Financiero
  rent_cost: number; // Costo real (a propietario)
  rent_price_uns: number; // Precio objetivo UNS
  parking_cost: number;
  kanri_hi?: number; // 管理費

  // Cobro
  billing_mode?: 'split' | 'fixed'; // 均等割り o 個別設定

  // Administración
  manager_name?: string;
  manager_phone?: string;

  // Contrato
  contract_start?: string; // YYYY-MM-DD
  contract_end?: string;
}

// ============ INQUILINO/ASIGNACIÓN ============
export interface Tenant {
  id: number;
  employee_id: string; // ID empleado (社員№)
  name: string;
  name_kana: string;
  company?: string; // 派遣先
  property_id: number; // FK Property
  rent_contribution: number; // ¥ asignado
  parking_fee: number; // ¥ parking
  entry_date?: string; // YYYY-MM-DD
  exit_date?: string; // YYYY-MM-DD (al dar de baja)
  cleaning_fee?: number; // クリーニング費
  status: 'active' | 'inactive';
}

// ============ EMPLEADO ============
export interface Employee {
  id: string;
  name: string;
  name_kana: string;
  company: string;
  full_data: Record<string, unknown>; // Datos raw del Excel
}

// ============ CONFIGURACIÓN ============
export interface AppConfig {
  companyName: string;
  closingDay: number; // 0=末日, 15, 20, 25
  defaultCleaningFee: number;
}

// ============ BASE DE DATOS ============
export interface AppDatabase {
  properties: Property[];
  tenants: Tenant[];
  employees: Employee[];
  config: AppConfig;
}

// ============ ALERTAS ============
export interface AlertItem {
  type: 'warning' | 'danger';
  msg: string;
}

// ============ REPORTES MENSUALES ============

export interface PropertyReportRow {
  no: number;
  area: string;
  property_name: string;
  room_number: string;
  layout: string;
  occupant_count: number;
  vacancy: number;
  rent_cost: number;
  rent_target: number;
  profit: number;
  notes: string;
}

export interface CompanyReportRow {
  company: string;
  property_count: number;
  rent_cost: number;
  rent_target: number;
  profit: number;
  payroll_deduction: number;
  monthly_profit: number;
}

export interface PayrollDeductionRow {
  employee_id: string;
  company: string;
  name_kana: string;
  name: string;
  property_name: string;
  rent_deduction: number;
  parking_deduction: number;
  total_deduction: number;
}

export interface MonthlySnapshot {
  id: string;
  cycle_month: string;
  cycle_start: string;
  cycle_end: string;
  closed_at: string;
  total_properties: number;
  total_tenants: number;
  total_collected: number;
  total_cost: number;
  total_target: number;
  profit: number;
  occupancy_rate: number;
  company_summary: CompanyReportRow[];
  property_detail: PropertyReportRow[];
  payroll_detail: PayrollDeductionRow[];
}

export interface ReportHistory {
  snapshots: MonthlySnapshot[];
  version: string;
}
