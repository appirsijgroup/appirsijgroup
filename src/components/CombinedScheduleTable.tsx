
import React from 'react';
import { PencilIcon, TrashIcon } from '@/components/Icons';
import { Activity, TeamAttendanceSession } from '@/types';

export type CombinedScheduleItem = {
    id: string;
    kind: 'activity' | 'session';
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    type: string;
    mode?: string;
    original: Activity | TeamAttendanceSession;
};

interface CombinedScheduleTableProps {
    items: CombinedScheduleItem[];
    onEdit: (item: CombinedScheduleItem) => void;
    onDelete: (item: CombinedScheduleItem) => void;
}

export const CombinedScheduleTable: React.FC<CombinedScheduleTableProps> = ({ items, onEdit, onDelete }) => {
    if (items.length === 0) {
        return (
            <div className="text-center py-12 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <p className="text-gray-400 text-sm">Belum ada jadwal kegiatan atau sesi presensi.</p>
            </div>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full table-auto">
                    <thead className="bg-black/20">
                        <tr>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[140px] sm:min-w-[200px]">Nama/Jenis</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[120px] sm:min-w-[150px] whitespace-nowrap">Tanggal</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[100px] whitespace-nowrap">Jam</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px] whitespace-nowrap">Tipe</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[80px] whitespace-nowrap">Mode</th>
                            <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider min-w-[70px] whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map(item => (
                            <tr key={`${item.kind}-${item.id}`} className="hover:bg-white/5 transition-colors">
                                <td className="px-3 sm:px-4 py-3">
                                    <div className="text-sm font-medium text-white whitespace-nowrap">{item.name}</div>
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                    <div className="text-sm text-gray-300 whitespace-nowrap">{item.date}</div>
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                    <div className="text-sm text-gray-300 whitespace-nowrap">{item.startTime} - {item.endTime}</div>
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${item.kind === 'activity' ? 'bg-teal-500/20 text-teal-300' : 'bg-purple-500/20 text-purple-300'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                    {item.mode ? (
                                        <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded whitespace-nowrap">
                                            {item.mode}
                                        </span>
                                    ) : (
                                        <span className="text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="px-3 sm:px-4 py-3">
                                    <div className="flex items-center gap-1 sm:gap-2">
                                        <button onClick={() => onEdit(item)} className="text-gray-400 hover:text-white p-1" title="Edit">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(item)} className="text-gray-400 hover:text-red-500 p-1" title="Hapus">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
