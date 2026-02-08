/**
 * Dexie.js Database — UNS Estate OS
 * IndexedDB schema para reemplazar localStorage
 */
import Dexie, { type Table } from 'dexie';

// Interfaces alineadas con App.tsx (las interfaces "inline" que usa el app)
export interface DBProperty {
  id: number; name: string; room_number?: string; postal_code?: string;
  address: string; address_auto?: string; address_detail?: string;
  manager_name?: string; manager_phone?: string;
  contract_start?: string; contract_end?: string; type?: string;
  capacity: number; rent_cost: number; rent_price_uns: number;
  parking_cost: number; kanri_hi?: number;
  billing_mode?: 'split' | 'fixed';
}

export interface DBTenant {
  id: number; employee_id: string; name: string; name_kana: string;
  company?: string; property_id: number; rent_contribution: number; parking_fee: number;
  entry_date?: string; exit_date?: string; cleaning_fee?: number; status: 'active' | 'inactive';
}

export interface DBEmployee {
  id: string; name: string; name_kana: string; company: string;
  full_data: Record<string, unknown>;
}

export interface DBConfig {
  key: string; // siempre 'main'
  companyName: string;
  closingDay: number;
  defaultCleaningFee: number;
}

export interface DBSnapshot {
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
  company_summary: any[];
  property_detail: any[];
  payroll_detail: any[];
}

export interface DBMeta {
  key: string; // siempre 'dbmeta'
  version: string;
  last_sync: string;
  migrated_from_localstorage: boolean;
}

class UNSDatabase extends Dexie {
  properties!: Table<DBProperty, number>;
  tenants!: Table<DBTenant, number>;
  employees!: Table<DBEmployee, string>;
  config!: Table<DBConfig, string>;
  snapshots!: Table<DBSnapshot, string>;
  meta!: Table<DBMeta, string>;

  constructor() {
    super('UNSEstateOS');
    this.version(1).stores({
      properties: 'id, name, contract_end',
      tenants: 'id, property_id, employee_id, status, [property_id+status]',
      employees: 'id, name_kana, company',
      config: 'key',
      snapshots: 'id, &cycle_month',
      meta: 'key',
    });
  }
}

// Singleton
export const unsDB = new UNSDatabase();
