import React from 'react';
import { GlassCard, StatCard } from '../ui';
import { Building, Users, CalendarDays, DollarSign, Percent, AlertCircle, Check } from 'lucide-react';
import type { AppDatabase, AlertItem } from '../../types/database';

interface DashboardViewProps {
    db: AppDatabase;
    alerts: AlertItem[];
}

export function DashboardView({ db, alerts }: DashboardViewProps) {
    // === CÁLCULOS DEL DASHBOARD MIGRADOS DE APP.TSX ===
    const totalEmployees = db.employeesGenzai.length + db.employeesUkeoi.length + db.employeesStaff.length;
    const tenantsCount = db.tenants.filter(t => t.status === 'active').length;
    // Solo se toma occupancy basada en las propiedades (algunos tenants pueden no tener propiedad válida)
    const totalCapacity = db.properties.reduce((acc, p) => acc + (p.capacity || 2), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((tenantsCount / totalCapacity) * 100) : 0;

    const propertiesCount = db.properties.length;
    const totalRentCollected = db.tenants
        .filter(t => t.status === 'active')
        .reduce((acc, t) => acc + (t.rent_contribution || 0) + (t.parking_fee || 0), 0);

    const totalRentCost = db.properties.reduce((acc, p) => acc + (p.rent_cost || 0) + (p.kanri_hi || 0) + (p.parking_cost || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Bienvenido a {db.config?.companyName || 'UNS-KIKAKU'}</h2>
                    <p className="text-gray-400 mt-2 font-medium">Resumen general del estado de propiedades y empleados.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="TOTAL PROPIEDADES" value={String(propertiesCount)} icon={Building} color="blue" />
                <StatCard title="EMPLEADOS" value={String(totalEmployees)} icon={Users} color="indigo" />
                <StatCard title="OCUPACIÓN" value={`${occupancyRate}%`} subtext={`${tenantsCount} / ${totalCapacity} plazas`} icon={Percent} color={occupancyRate > 90 ? 'red' : 'emerald'} />
                <StatCard title="RECAUDADO ESTE MES" value={`¥${totalRentCollected.toLocaleString()}`} subtext={`Costo total: ¥${totalRentCost.toLocaleString()}`} icon={DollarSign} color="purple" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <CalendarDays className="w-5 h-5 text-blue-400" />
                            <h3 className="text-lg font-bold text-white">Estado del Mes (Cierre: Día {db.config?.closingDay || 'Fin de mes'})</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <span className="text-gray-300">Ingresos Previstos (Nómina)</span>
                                <span className="text-xl font-bold text-white">¥{totalRentCollected.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                                <span className="text-gray-300">Costos Previstos (Propiedades)</span>
                                <span className="text-xl font-bold text-white">¥{totalRentCost.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                                <span className="text-blue-300 font-bold">Balance Operativo</span>
                                <span className={`text-xl font-black ${totalRentCollected - totalRentCost >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    ¥{(totalRentCollected - totalRentCost).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>

                <div className="space-y-6">
                    <GlassCard className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <h3 className="text-lg font-bold text-white">Alertas ({alerts.length})</h3>
                        </div>
                        {alerts.length > 0 ? (
                            <div className="space-y-3">
                                {alerts.map((alert: any) => (
                                    <div key={alert.id} className="flex gap-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-bold text-red-200">{alert.message}</p>
                                            <p className="text-xs text-red-400/70 mt-1">{alert.property_name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Check className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400 font-medium">Todo está en orden</p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
