
import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full table-auto">
                    <thead>
                        <tr className="bg-white/5 border-b border-white/10">
                            <th className="px-4 py-4 text-left text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[180px] whitespace-nowrap">Nama / Judul</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[140px] whitespace-nowrap">Waktu Pelaksanaan</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[100px] whitespace-nowrap">Tipe</th>
                            <th className="px-4 py-4 text-left text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[100px] whitespace-nowrap">Mode Presensi</th>
                            <th className="px-4 py-4 text-center text-[10px] font-black text-teal-400 uppercase tracking-widest min-w-[160px] whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {items.map(item => {
                            const dateObj = new Date(item.date);
                            const formattedDate = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

                            return (
                                <tr key={`${item.kind}-${item.id}`} className="hover:bg-white/5 transition-all group">
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors uppercase tracking-tight">
                                                {item.name}
                                            </span>
                                            <span className="text-[10px] text-gray-400 uppercase font-medium mt-0.5">
                                                {item.kind === 'activity' ? 'Kegiatan Terjadwal' : 'Sesi Presensi Tim'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="text-sm font-semibold text-gray-200">{formattedDate}</div>
                                            <div className="text-xs text-teal-400/80 font-medium flex items-center gap-1.5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                {item.startTime} - {item.endTime}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider border ${item.kind === 'activity'
                                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                                            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                            }`}>
                                            {item.type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {item.mode ? (
                                            <span className="px-2.5 py-1 bg-white/5 text-gray-300 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/10">
                                                {item.mode}
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 text-xs font-medium italic">Universal</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => onEdit(item)}
                                                className="p-2 bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-gray-900 rounded-xl transition-all border border-teal-500/30 hover:border-teal-400 shadow-lg hover:shadow-teal-500/20 active:scale-95 group"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                            <button
                                                onClick={() => onDelete(item)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all border border-red-500/30 hover:border-red-400 shadow-lg hover:shadow-red-500/20 active:scale-95 group"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
