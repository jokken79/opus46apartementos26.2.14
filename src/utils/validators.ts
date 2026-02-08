/**
 * ESQUEMAS DE VALIDACIÓN - Zod
 * Validación centralizada y reutilizable
 * Sincronizado con types/database.ts
 */

import { z } from 'zod';

// ============ PROPERTY ============
export const PropertySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(100),
  room_number: z.string().optional(),
  postal_code: z.string().regex(/^\d{3}-?\d{4}$/, 'Código postal inválido (formato: 123-4567)').optional().or(z.string().length(0)),
  address_auto: z.string().optional(),
  address_detail: z.string().optional(),
  address: z.string().min(1, 'Dirección requerida'),
  type: z.string().optional(),
  capacity: z.number().int().min(1, 'Capacidad mínima: 1').max(20),
  rent_cost: z.number().nonnegative('Costo no puede ser negativo'),
  rent_price_uns: z.number().nonnegative('Precio UNS no puede ser negativo'),
  parking_cost: z.number().nonnegative('Costo parking no puede ser negativo'),
  kanri_hi: z.number().nonnegative('管理費 no puede ser negativo').optional(),
  billing_mode: (z.enum as any)(['split', 'fixed']).optional(),
  manager_name: z.string().optional(),
  manager_phone: z.string().optional().or(z.string().length(0)),
  contract_start: z.string().optional().or(z.string().length(0)),
  contract_end: z.string().optional().or(z.string().length(0)),
});

// ============ TENANT ============
export const TenantSchema = z.object({
  id: z.number().optional(),
  employee_id: z.string().min(1, 'ID empleado requerido').max(50),
  name: z.string().min(1, 'Nombre requerido'),
  name_kana: z.string().default(''),
  company: z.string().optional(),
  property_id: z.number().int().positive('ID propiedad inválido'),
  rent_contribution: z.number().nonnegative('Renta no puede ser negativa'),
  parking_fee: z.number().nonnegative('Parking no puede ser negativo'),
  entry_date: z.string().optional().or(z.string().length(0)),
  exit_date: z.string().optional(),
  cleaning_fee: z.number().nonnegative().optional(),
  status: (z.enum as any)(['active', 'inactive']).default('active'),
});

// ============ EMPLOYEE ============
export const EmployeeSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  name_kana: z.string().default(''),
  company: z.string().default(''),
  full_data: z.record(z.string(), z.unknown()).optional(),
});

// ============ CONFIG ============
export const AppConfigSchema = z.object({
  companyName: z.string().min(1),
  closingDay: z.number().int(),
  defaultCleaningFee: z.number().nonnegative(),
});

// ============ BACKUP (validación de datos importados) ============
export const BackupSchema = z.object({
  properties: z.array(z.object({ id: z.number(), name: z.string() }).passthrough()),
  tenants: z.array(z.object({ id: z.number(), property_id: z.number() }).passthrough()),
  employees: z.array(z.object({ id: z.string(), name: z.string() }).passthrough()),
  config: AppConfigSchema.partial(),
});

// ============ EXCEL ============
export const ExcelEmployeeRowSchema = z.object({
  '社員No': z.any(),
  '氏名': z.string(),
  'カナ': z.string(),
  '派遣先': z.string().optional(),
});

// ============ VALIDADORES FUNCIONALES ============

export function validateProperty(data: unknown) {
  const result = PropertySchema.safeParse(data);
  if (result.success) return { success: true as const, data: result.data };
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

export function validateTenant(data: unknown) {
  const result = TenantSchema.safeParse(data);
  if (result.success) return { success: true as const, data: result.data };
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

export function validateBackup(data: unknown) {
  const result = BackupSchema.safeParse(data);
  if (result.success) return { success: true as const, data: result.data };
  return {
    success: false as const,
    errors: result.error.issues.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    })),
  };
}

export function validateDataIntegrity(db: { properties: any[]; tenants: any[] }) {
  const errors: Array<{ type: string; message: string }> = [];

  for (const tenant of db.tenants || []) {
    if (!db.properties.find((p: any) => p.id === tenant.property_id)) {
      errors.push({
        type: 'FK_ERROR',
        message: `Inquilino "${tenant.name}" asignado a propiedad inexistente (ID: ${tenant.property_id})`,
      });
    }
  }

  for (const property of db.properties || []) {
    const tenantCount = db.tenants.filter((t: any) => t.property_id === property.id && t.status === 'active').length;
    if (tenantCount > property.capacity) {
      errors.push({
        type: 'CAPACITY_ERROR',
        message: `Propiedad "${property.name}" excede capacidad (${tenantCount}/${property.capacity})`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}
