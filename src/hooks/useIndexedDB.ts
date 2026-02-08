/**
 * HOOK: useIndexedDB
 * Reemplazo drop-in de localStorage para App.tsx.
 * Mantiene la misma interfaz { db, setDb } pero persiste en IndexedDB via Dexie.
 *
 * Estrategia:
 * - useState guarda el AppDatabase en memoria (fuente de verdad para renders)
 * - Al montar, carga desde IndexedDB (async)
 * - Cada setDb actualiza estado + escribe a IndexedDB en background
 * - Migración automática desde localStorage en primer uso
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { unsDB } from '../db/dexie';
import { migrateFromLocalStorage } from '../db/migrate';

// Interfaz idéntica a la de App.tsx
interface AppConfig {
  companyName: string;
  closingDay: number;
  defaultCleaningFee: number;
}

interface AppDatabase {
  properties: Array<any>;
  tenants: Array<any>;
  employees: Array<any>;
  config: AppConfig;
}

const INITIAL_DB: AppDatabase = {
  properties: [],
  tenants: [],
  employees: [],
  config: { companyName: 'UNS-KIKAKU', closingDay: 0, defaultCleaningFee: 30000 },
};

// Escribir el AppDatabase completo a IndexedDB (fire-and-forget)
async function persistToIndexedDB(data: AppDatabase): Promise<void> {
  try {
    await unsDB.transaction('rw',
      [unsDB.properties, unsDB.tenants, unsDB.employees, unsDB.config],
      async () => {
        // Properties: sincronizar (clear + bulkPut para manejar borrados)
        await unsDB.properties.clear();
        if (data.properties.length > 0) {
          await unsDB.properties.bulkPut(data.properties);
        }

        // Tenants
        await unsDB.tenants.clear();
        if (data.tenants.length > 0) {
          await unsDB.tenants.bulkPut(data.tenants);
        }

        // Employees
        await unsDB.employees.clear();
        if (data.employees.length > 0) {
          await unsDB.employees.bulkPut(data.employees);
        }

        // Config
        await unsDB.config.put({
          key: 'main',
          companyName: data.config.companyName || 'UNS-KIKAKU',
          closingDay: data.config.closingDay || 0,
          defaultCleaningFee: data.config.defaultCleaningFee ?? 30000,
        });
      }
    );
  } catch (error) {
    console.error('[useIndexedDB] Error persistiendo:', error);
  }
}

// Cargar todos los datos de IndexedDB
async function loadFromIndexedDB(): Promise<AppDatabase> {
  try {
    const [properties, tenants, employees, configRow] = await Promise.all([
      unsDB.properties.toArray(),
      unsDB.tenants.toArray(),
      unsDB.employees.toArray(),
      unsDB.config.get('main'),
    ]);

    return {
      properties,
      tenants,
      employees,
      config: configRow
        ? {
            companyName: configRow.companyName,
            closingDay: configRow.closingDay,
            defaultCleaningFee: configRow.defaultCleaningFee,
          }
        : INITIAL_DB.config,
    };
  } catch (error) {
    console.error('[useIndexedDB] Error cargando:', error);
    return INITIAL_DB;
  }
}

export function useIndexedDB() {
  const [db, setDbState] = useState<AppDatabase>(INITIAL_DB);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isInitialized = useRef(false);
  const pendingWrite = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Carga inicial: migrar si necesario, luego cargar
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    (async () => {
      try {
        // Paso 1: Migrar desde localStorage si es primer uso
        await migrateFromLocalStorage();

        // Paso 2: Cargar datos de IndexedDB
        const data = await loadFromIndexedDB();

        // Si no hay datos en IndexedDB, intentar cargar de localStorage como fallback
        if (data.properties.length === 0 && data.tenants.length === 0 && data.employees.length === 0) {
          try {
            const lsData = localStorage.getItem('uns_db_v6_0');
            if (lsData) {
              const parsed = JSON.parse(lsData);
              if (parsed.properties?.length > 0 || parsed.tenants?.length > 0 || parsed.employees?.length > 0) {
                const fallbackDb: AppDatabase = {
                  properties: parsed.properties || [],
                  tenants: parsed.tenants || [],
                  employees: parsed.employees || [],
                  config: {
                    companyName: parsed.config?.companyName || 'UNS-KIKAKU',
                    closingDay: parsed.config?.closingDay || 0,
                    defaultCleaningFee: parsed.config?.defaultCleaningFee ?? 30000,
                  },
                };
                setDbState(fallbackDb);
                // Persistir fallback a IndexedDB
                await persistToIndexedDB(fallbackDb);
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Ignorar errores de localStorage fallback
          }
        }

        setDbState(data);
      } catch (err) {
        console.error('[useIndexedDB] Error en inicialización:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
        // Fallback: intentar cargar de localStorage directamente
        try {
          const raw = localStorage.getItem('uns_db_v6_0');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.properties) {
              setDbState({
                properties: parsed.properties || [],
                tenants: parsed.tenants || [],
                employees: parsed.employees || [],
                config: {
                  companyName: parsed.config?.companyName || 'UNS-KIKAKU',
                  closingDay: parsed.config?.closingDay || 0,
                  defaultCleaningFee: parsed.config?.defaultCleaningFee ?? 30000,
                },
              });
            }
          }
        } catch {
          // Si todo falla, se queda con INITIAL_DB
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // setDb: actualiza estado inmediatamente + escribe a IndexedDB con debounce
  const setDb = useCallback((
    updater: AppDatabase | ((prev: AppDatabase) => AppDatabase)
  ) => {
    setDbState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;

      // Debounce: agrupar escrituras rápidas (ej. edición inline de renta)
      if (pendingWrite.current) {
        clearTimeout(pendingWrite.current);
      }
      pendingWrite.current = setTimeout(() => {
        persistToIndexedDB(next);
        pendingWrite.current = null;
      }, 100);

      return next;
    });
  }, []);

  return { db, setDb, isLoading, error };
}
