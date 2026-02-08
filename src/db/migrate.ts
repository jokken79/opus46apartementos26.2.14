/**
 * Migración: localStorage → IndexedDB (Dexie)
 * Se ejecuta una sola vez en el primer inicio.
 * Lee las claves uns_db_v6_0 y uns_reports_v1, escribe en IndexedDB.
 */
import { unsDB } from './dexie';

const LS_DB_KEY = 'uns_db_v6_0';
const LS_REPORTS_KEY = 'uns_reports_v1';

export async function migrateFromLocalStorage(): Promise<boolean> {
  try {
    // Verificar si ya migró
    const metaRow = await unsDB.meta.get('dbmeta');
    if (metaRow?.migrated_from_localstorage) {
      return false; // Ya migrado, no hacer nada
    }

    // Leer datos de localStorage
    const dbRaw = localStorage.getItem(LS_DB_KEY);
    const reportsRaw = localStorage.getItem(LS_REPORTS_KEY);

    if (!dbRaw) {
      // No hay datos — marcar como migrado (primera instalación)
      await unsDB.meta.put({
        key: 'dbmeta',
        version: '8.0',
        last_sync: new Date().toISOString(),
        migrated_from_localstorage: true,
      });
      return false;
    }

    const parsed = JSON.parse(dbRaw);

    // Validación mínima
    if (!parsed.properties || !Array.isArray(parsed.properties) ||
        !parsed.tenants || !Array.isArray(parsed.tenants) ||
        !parsed.employees || !Array.isArray(parsed.employees)) {
      console.warn('[Migración] Datos de localStorage corruptos, saltando migración');
      // Marcar como migrado para evitar retry loop infinito
      await unsDB.meta.put({ key: 'dbmeta', version: '8.0', last_sync: new Date().toISOString(), migrated_from_localstorage: true });
      return false;
    }

    // Transacción atómica: todo o nada
    await unsDB.transaction('rw',
      [unsDB.properties, unsDB.tenants, unsDB.employees, unsDB.config, unsDB.snapshots, unsDB.meta],
      async () => {
        // Propiedades
        if (parsed.properties.length > 0) {
          await unsDB.properties.bulkPut(parsed.properties);
        }

        // Inquilinos
        if (parsed.tenants.length > 0) {
          await unsDB.tenants.bulkPut(parsed.tenants);
        }

        // Empleados
        if (parsed.employees.length > 0) {
          await unsDB.employees.bulkPut(parsed.employees);
        }

        // Configuración
        const config = parsed.config || {};
        await unsDB.config.put({
          key: 'main',
          companyName: config.companyName || 'UNS-KIKAKU',
          closingDay: config.closingDay ?? 0,
          defaultCleaningFee: config.defaultCleaningFee ?? 30000,
        });

        // Snapshots de reportes
        if (reportsRaw) {
          try {
            const reports = JSON.parse(reportsRaw);
            if (reports.snapshots && Array.isArray(reports.snapshots) && reports.snapshots.length > 0) {
              await unsDB.snapshots.bulkPut(reports.snapshots);
            }
          } catch {
            console.warn('[Migración] Error parseando reportes, ignorando');
          }
        }

        // Marcar como migrado
        await unsDB.meta.put({
          key: 'dbmeta',
          version: '8.0',
          last_sync: new Date().toISOString(),
          migrated_from_localstorage: true,
        });
      }
    );

    console.info(`[Migración] Completada: ${parsed.properties.length} propiedades, ${parsed.tenants.length} inquilinos, ${parsed.employees.length} empleados`);
    return true;
  } catch (error) {
    console.error('[Migración] Error:', error);
    return false;
  }
}
