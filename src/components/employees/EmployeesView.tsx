import React, { useState } from 'react';
import { GlassCard } from '../ui';
import { Search, Building } from 'lucide-react';
import type { AppDatabase, Employee } from '../../types/database';

interface EmployeesViewProps {
    db: AppDatabase;
    searchTerm: string;
}

export function EmployeesView({ db, searchTerm }: EmployeesViewProps) {
    const [employeeTab, setEmployeeTab] = useState<'genzai' | 'ukeoi' | 'staff' | 'legacy'>('genzai');

    // Filtro de empleados según la pestaña actual y el término de búsqueda
    const filteredEmployees = (() => {
        let list: Employee[] = [];
        if (employeeTab === 'genzai') list = db.employeesGenzai;
        else if (employeeTab === 'ukeoi') list = db.employeesUkeoi;
        else if (employeeTab === 'staff') list = db.employeesStaff;
        else list = db.employees;

        return list.filter(e => {
            const searchStr = `${e.id} ${e.name} ${e.name_kana} ${e.company}`.toLowerCase();
            return searchStr.includes(searchTerm.toLowerCase());
        });
    })();

    const tabButtonStyle = (isActive: boolean) =>
        `flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${isActive
            ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(0,82,204,0.4)]'
            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
        }`;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Directorio de Empleados</h2>
                    <p className="text-gray-400 mt-2 font-medium">Gestiona y consulta la información de todo el personal.</p>
                </div>
            </div>

            <GlassCard className="p-2 flex gap-2 overflow-x-auto">
                <button onClick={() => setEmployeeTab('genzai')} className={tabButtonStyle(employeeTab === 'genzai')}>
                    派遣 (Genzai) <span className="ml-2 text-xs opacity-70">({db.employeesGenzai.length})</span>
                </button>
                <button onClick={() => setEmployeeTab('ukeoi')} className={tabButtonStyle(employeeTab === 'ukeoi')}>
                    請負 (Ukeoi) <span className="ml-2 text-xs opacity-70">({db.employeesUkeoi.length})</span>
                </button>
                <button onClick={() => setEmployeeTab('staff')} className={tabButtonStyle(employeeTab === 'staff')}>
                    事務所 (Staff) <span className="ml-2 text-xs opacity-70">({db.employeesStaff.length})</span>
                </button>
                {db.employees.length > 0 && (
                    <button onClick={() => setEmployeeTab('legacy')} className={tabButtonStyle(employeeTab === 'legacy')}>
                        Antiguos <span className="ml-2 text-xs opacity-70">({db.employees.length})</span>
                    </button>
                )}
            </GlassCard>

            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-[#15171c]/80 border-b border-white/10 text-xs uppercase tracking-wider text-gray-400 font-bold font-hud">
                                <th className="p-4 px-6 w-24">ID</th>
                                <th className="p-4 px-6">Nombre (Kana)</th>
                                <th className="p-4 px-6">Empresa / Sede</th>
                                <th className="p-4 px-6 w-48 text-right">Información Adicional</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredEmployees.map((employee, idx) => (
                                <tr key={`${employee.id}-${idx}`} className="hover:bg-white/5 transition group">
                                    <td className="p-4 px-6 font-mono text-xs text-blue-400 font-bold">
                                        {employee.id}
                                    </td>
                                    <td className="p-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-800 to-gray-700 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/30 transition">
                                                <span className="text-white font-bold text-sm">
                                                    {employee.name ? employee.name.charAt(0) : '?'}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-white font-bold">{employee.name}</div>
                                                <div className="text-gray-500 text-xs">{employee.name_kana || '---'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 px-6">
                                        <div className="bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg inline-flex items-center gap-2 text-sm text-gray-300">
                                            <Building className="w-3.5 h-3.5 text-blue-400" />
                                            {employee.company || 'Sin Asignar'}
                                        </div>
                                    </td>
                                    <td className="p-4 px-6 text-right">
                                        <button className="text-xs text-blue-400 hover:text-white transition font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10">
                                            Ver Ficha
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredEmployees.length === 0 && (
                        <div className="text-center py-20 px-4">
                            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-bold text-white mb-2">No hay empleados en esta categoría</h3>
                            <p className="text-gray-400 text-sm">
                                No se encontraron resultados para la búsqueda actual o la lista está vacía.
                            </p>
                        </div>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}
