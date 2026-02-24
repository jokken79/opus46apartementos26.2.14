import React, { useState } from 'react';
import { GlassCard } from '../ui';
import { Building, MapPin, Edit2, Trash2, Home } from 'lucide-react';
import type { AppDatabase, Property } from '../../types/database';
import { isPropertyActive } from '../../utils/propertyHelpers';

interface PropertiesViewProps {
    db: AppDatabase;
    searchTerm: string;
    onEdit: (p: Property) => void;
    onDelete: (id: number) => void;
    onManageTenants: (p: Property) => void;
    setIsSearchingAddress: (val: boolean) => void;
}

export function PropertiesView({ db, searchTerm, onEdit, onDelete, onManageTenants, setIsSearchingAddress }: PropertiesViewProps) {
    const [filterActive, setFilterActive] = useState(true);

    // Filtro de propiedades
    const filteredProperties = db.properties.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.address.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterActive ? isPropertyActive(p) : true;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">Propiedades</h2>
                    <p className="text-gray-400 mt-2 font-medium">Gestiona los apartamentos y casas de la empresa.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterActive(!filterActive)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${filterActive ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(0,82,204,0.4)]' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                    >
                        <div className={`w-2 h-2 rounded-full ${filterActive ? 'bg-white' : 'bg-gray-500'}`} />
                        {filterActive ? 'Mostrando Activos' : 'Mostrando Todos'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map(property => {
                    const tenantsInProp = db.tenants.filter(t => t.property_id === property.id && t.status === 'active');
                    const occupancy = tenantsInProp.length;
                    const isFull = occupancy >= property.capacity;
                    const isOverCapacity = occupancy > property.capacity;

                    return (
                        <GlassCard key={property.id} className="p-6 group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mt-10 -mr-10 transition-all group-hover:bg-blue-500/10"></div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-[#15171c] rounded-xl border border-white/5 shadow-inner">
                                        <Building className="w-6 h-6 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{property.name} {property.room_number || ''}</h3>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">{property.type || '1K'}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${isPropertyActive(property) ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {isPropertyActive(property) ? 'Activo' : 'Vencido'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onEdit(property)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition" title="Editar Propiedad">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onDelete(property.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Eliminar">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6 relative z-10">
                                <div className="flex items-start gap-2 text-gray-400 text-sm">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span className="leading-snug">〒{property.postal_code || '---'}<br />{property.address} {property.address_detail || ''}</span>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                    <div className="bg-[#15171c] rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">COSTO TOTAL</p>
                                        <p className="text-lg font-black text-white">¥{((property.rent_cost || 0) + (property.kanri_hi || 0) + (property.parking_cost || 0)).toLocaleString()}</p>
                                    </div>
                                    <div className="bg-[#15171c] rounded-xl p-3 border border-white/5">
                                        <p className="text-[10px] text-gray-500 font-bold tracking-wider mb-1">NÓMINA (META)</p>
                                        <p className="text-lg font-black text-blue-400">¥{(property.rent_price_uns || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm border ${isOverCapacity ? 'bg-red-500/20 text-red-500 border-red-500/30' : isFull ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}`}>
                                        {occupancy}
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium">/ {property.capacity} plaza{property.capacity !== 1 ? 's' : ''} ocupadas</span>
                                </div>
                                <button
                                    onClick={() => onManageTenants(property)}
                                    className="px-4 py-2 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-400 text-sm font-bold text-white rounded-xl transition-all shadow-lg flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    Inquilinos
                                </button>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {filteredProperties.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10 glass-cockpit">
                    <Building className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No se encontraron propiedades</h3>
                    <p className="text-gray-400">Ajusta los filtros de búsqueda o agrega una nueva.</p>
                </div>
            )}
        </div>
    );
}
