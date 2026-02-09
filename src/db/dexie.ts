/**
 * Dexie.js Database — UNS Estate OS
 * IndexedDB schema para reemplazar localStorage
 */
import Dexie, { type Table } from 'dexie';
import type { Property, Tenant, Employee, MonthlySnapshot } from '../types/database';

// Tipos específicos de IndexedDB (añaden la key para config y meta)
export interface DBConfig {
  key: string; // siempre 'main'
  companyName: string;
  closingDay: number;
  defaultCleaningFee: number;
}

export interface DBMeta {
  key: string; // siempre 'dbmeta'
  version: string;
  last_sync: string;
  migrated_from_localstorage: boolean;
}

class UNSDatabase extends Dexie {
  properties!: Table<Property, number>;
  tenants!: Table<Tenant, number>;
  employees!: Table<Employee, string>; // Legacy
  employeesGenzai!: Table<Employee, string>; // 派遣 (Haken)
  employeesUkeoi!: Table<Employee, string>;  // 請負 - 岡山
  employeesStaff!: Table<Employee, string>;  // 事務所
  config!: Table<DBConfig, string>;
  snapshots!: Table<MonthlySnapshot, string>;
  meta!: Table<DBMeta, string>;

  constructor() {
    super('UNSEstateOS');
    // Version 2: añade tablas separadas por categoría de empleado
    this.version(2).stores({
      properties: 'id, name, contract_end',
      tenants: 'id, property_id, employee_id, status, [property_id+status]',
      employees: 'id, name_kana, company',
      employeesGenzai: 'id, name_kana, company',
      employeesUkeoi: 'id, name_kana, company',
      employeesStaff: 'id, name_kana, company',
      config: 'key',
      snapshots: 'id, &cycle_month',
      meta: 'key',
    });
  }
}

// Singleton
export const unsDB = new UNSDatabase();
