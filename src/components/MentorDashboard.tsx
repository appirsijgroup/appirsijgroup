import React, { useMemo, useState, Fragment, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { type Employee, TadarusSession, TadarusRequest, MissedPrayerRequest, AuditLogEntry, type WeeklyReportSubmission, MenteeTarget, Attendance } from '../types';
import { ArrowLeftIcon, CheckSquareIcon, SquareIcon, CalendarDaysIcon, PdfIcon, ExcelIcon, ChartBarIcon, UserGroupIcon, UserPlusIcon, BookOpenIcon, TagIcon, TrashIcon } from './Icons';
import { createPortal } from 'react-dom';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { generateOfficialPdf, ReportSection, TableConfig } from './ReportGenerator';

export type MentorDashboardView = 'overview' | 'sessions' | 'mentees' | 'progress' | 'missed-requests' | 'laporan-bacaan' | 'persetujuan' | 'target';

interface MentorDashboardProps {
  employee: Employee;
  allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, any>; }>;
  onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
  weeklyReportSubmissions: WeeklyReportSubmission[];
  onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit') => void;
  tadarusSessions: TadarusSession[];
  tadarusRequests: TadarusRequest[];
  onCreateTadarusSession: (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => void;
  onUpdateTadarusSession: (sessionId: string, updates: Partial<TadarusSession>) => void;
  onDeleteTadarusSession: (sessionId: string) => void;
  onReviewTadarusRequest: (requestId: string, status: 'approved' | 'rejected') => void;
  missedPrayerRequests: MissedPrayerRequest[];
  onReviewMissedPrayerRequest: (requestId: string, status: "approved" | "rejected", mentorNotes?: string) => void;
  onMentorAttendOwnSession: (sessionId: string) => void;
  onLogAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  onDeleteMenteeTarget: (targetId: string) => void;
  addToast?: (message: string, type: 'success' | 'error') => void;

  mentorSubView: MentorDashboardView;
  setMentorSubView: React.Dispatch<React.SetStateAction<MentorDashboardView>>;
  menteesOfMentor: Employee[];

  // Target management
  targetMenteeId: string;
  setTargetMenteeId: React.Dispatch<React.SetStateAction<string>>;
  targetTitle: string;
  setTargetTitle: React.Dispatch<React.SetStateAction<string>>;
  targetDescription: string;
  setTargetDescription: React.Dispatch<React.SetStateAction<string>>;
  handleCreateTarget: (e: React.FormEvent) => void;
  setConfirmDeleteTarget: React.Dispatch<React.SetStateAction<MenteeTarget | null>>;
  menteeTargets: MenteeTarget[];
}

const PREMIUM_COLORS = ['#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981'];

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmText?: string;
    confirmColorClass?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Ya, Konfirmasi", confirmColorClass = "bg-red-600 hover:bg-red-500" }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <div className="text-blue-200 mb-4">{message}</div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-lg font-semibold ${confirmColorClass}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RejectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (notes: string) => void;
    title: string;
    prompt: string;
}> = ({ isOpen, onClose, onSubmit, title, prompt }) => {
    const [notes, setNotes] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        onSubmit(notes);
        onClose();
        setNotes('');
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-blue-200 mb-4">{prompt}</p>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                    placeholder="Tuliskan catatan Anda di sini..."
                ></textarea>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} disabled={!notes} className="px-4 py-2 rounded-lg font-semibold bg-red-600 hover:bg-red-500 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        Kirim Penolakan
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

// --- Sub-component for Detailed Mentee Progress Table ---
const MenteeDetailProgressView: React.FC<{
    mentee: Employee;
    monthKey: string;
    onBack?: () => void;
    mentees?: Employee[];
    currentMonth?: Date;
    onMonthChange?: (newDate: Date) => void;
}> = ({ mentees, currentMonth, onMonthChange, mentee, monthKey, onBack }) => {
    const [selectedMenteeId, setSelectedMenteeId] = useState<string | null>(mentee?.id || (mentees && mentees.length > 0 ? mentees[0].id : null));

    const activeDate = useMemo(() => currentMonth || new Date(monthKey + '-02'), [currentMonth, monthKey]);

    const selectedMentee = useMemo(() => {
        if (!selectedMenteeId) return mentee;
        return mentees?.find(m => m.id === selectedMenteeId) ?? mentee;
    }, [selectedMenteeId, mentees, mentee]);

    const activeMonthKey = useMemo(() => `${activeDate.getFullYear()}-${String(activeDate.getMonth() + 1).padStart(2, '0')}`, [activeDate]);
    const daysInMonth = useMemo(() => new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 0).getDate(), [activeDate]);

    const groupedActivities = useMemo(() => {
        return DAILY_ACTIVITIES.reduce((acc, activity) => {
            if (!acc[activity.category]) acc[activity.category] = [];
            acc[activity.category].push(activity);
            return acc;
        }, {} as Record<string, typeof DAILY_ACTIVITIES>);
    }, []);

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (!onMonthChange || !currentMonth) return;
        const newDate = new Date(currentMonth);
        newDate.setDate(1);
        newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
        onMonthChange(newDate);
    };

    const isNextMonthFuture = () => {
        if (!currentMonth) return false;
        const nextMonth = new Date(currentMonth);
        nextMonth.setDate(1);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth > new Date();
    };

    const progress = useMemo(() => selectedMentee?.monthlyActivities?.[activeMonthKey] || {}, [selectedMentee, activeMonthKey]);

    const activityProgressCounts = useMemo(() => {
        if (!selectedMentee) return {};
        return DAILY_ACTIVITIES.reduce((acc, activity) => {
            acc[activity.id] = Object.values(progress).reduce((dayCount, dailyProgress) => dayCount + (dailyProgress[activity.id] ? 1 : 0), 0);
            return acc;
        }, {} as Record<string, number>);
    }, [progress, selectedMentee]);

    const chartSummaryData = useMemo(() => {
        if (!selectedMentee) return [];
        return DAILY_ACTIVITIES.map(activity => {
            const capaian = activityProgressCounts[activity.id] || 0;
            const percentage = activity.monthlyTarget > 0 ? Math.min(100, Math.round((capaian / activity.monthlyTarget) * 100)) : 0;
            return {
                name: activity.title,
                percentage: percentage,
            };
        });
    }, [selectedMentee, activityProgressCounts]);

    return (
        <div className="animate-view-change">
             <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                     {onBack && (
                        <button onClick={onBack} className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-500 rounded-lg font-bold text-white transition-all shadow-lg">
                            <ArrowLeftIcon className="w-5 h-5"/>
                            <span>Kembali</span>
                        </button>
                    )}
                    <div className={`${onBack ? 'border-l-4 border-teal-400 pl-4' : ''}`}>
                        <h3 className="text-xl sm:text-2xl font-bold text-white">
                            {onBack ? 'Detail Laporan Aktivitas' : 'Detail Progres Anggota'}
                        </h3>
                        {selectedMentee && (
                             <p className="text-base sm:text-lg text-teal-200">
                                {selectedMentee.name} - {activeDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </p>
                        )}
                    </div>
                </div>

                {mentees && mentees.length > 0 && (
                    <div className="w-full md:w-auto flex-grow md:flex-grow-0 flex items-center gap-4">
                        <div className="w-full md:w-56">
                            <select
                                value={selectedMenteeId || ''}
                                onChange={(e) => setSelectedMenteeId(e.target.value)}
                                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none"
                            >
                                {mentees.map(m => <option key={m.id} value={m.id} className="text-black bg-white">{m.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-shrink-0 flex items-center justify-between bg-black/20 p-1 rounded-full w-auto">
                            <button onClick={() => navigateMonth('prev')} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors">&larr;</button>
                            <button onClick={() => navigateMonth('next')} disabled={isNextMonthFuture()} className="px-4 py-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50">&rarr;</button>
                        </div>
                    </div>
                )}
            </div>

            {selectedMentee ? (
                <>
                    <div className="overflow-x-auto rounded-lg border border-white/20">
                        <table className="min-w-full text-sm text-left text-white border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-3 py-3 font-semibold w-64 min-w-[250px] text-left sticky left-0 z-20 bg-gray-900 whitespace-nowrap">Aktivitas</th>
                                    <th scope="col" className="px-3 py-3 font-semibold w-28 min-w-[100px] text-center sticky left-[250px] z-20 bg-gray-900 whitespace-nowrap">Progres</th>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
                                        <th key={day} scope="col" className="px-2 py-3 font-bold text-center w-12 min-w-[48px] bg-gray-800 whitespace-nowrap">
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(groupedActivities).map(([category, activities]) => (
                                    <Fragment key={category}>
                                        <tr className="bg-gray-700">
                                            <td colSpan={daysInMonth + 2} className="px-3 py-2 font-bold text-teal-200 sticky left-0 z-10 bg-gray-700">
                                                {category}
                                            </td>
                                        </tr>
                                        {activities.map(activity => (
                                            <tr key={activity.id} className="border-b border-gray-700 hover:bg-white/5">
                                                <td className="px-3 py-3 font-medium text-left sticky left-0 bg-gray-800 z-10 whitespace-nowrap">{activity.title}</td>
                                                <td className="px-3 py-3 font-semibold text-center sticky left-[250px] bg-gray-800 z-10 whitespace-nowrap">
                                                    {activityProgressCounts[activity.id] || 0} / {activity.monthlyTarget}
                                                </td>
                                                {Array.from({ length: daysInMonth }, (_, i) => String(i + 1).padStart(2, '0')).map(day => {
                                                    const isChecked = progress[day]?.[activity.id] || false;
                                                    return (
                                                        <td key={day} className="text-center border-l border-gray-700">
                                                            <div className="w-full h-full flex items-center justify-center py-3">
                                                                {isChecked ? (
                                                                    <CheckSquareIcon className="w-6 h-6 text-teal-400" />
                                                                ) : (
                                                                    <SquareIcon className="w-6 h-6 text-gray-600" />
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-8 pt-8 border-t border-white/20">
                        <h4 className="text-xl font-semibold text-white mb-4 text-center">
                            Grafik Rangkuman Capaian Bulanan
                        </h4>

                        {/* Mobile scroll indicator */}
                        <div className="md:hidden text-center text-xs text-blue-200 mb-2 flex items-center justify-center gap-2">
                            <span>← Geser kiri/kanan untuk melihat grafik →</span>
                        </div>

                        {/* Scrollable container for mobile */}
                        <div className="overflow-x-auto pb-4 -mx-2 px-2 md:overflow-x-visible md:mx-0 md:px-0">
                            <div className="min-w-[700px] md:min-w-0" style={{ height: 500 }}>
                               <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        layout="vertical"
                                        data={chartSummaryData}
                                        margin={{ top: 5, right: 40, left: 20, bottom: 20 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={150} tick={{ fontSize: 11 }} interval={0} />
                                        <Bar dataKey="percentage" name="Capaian" isAnimationActive={false} barSize={20}>
                                            <LabelList dataKey="percentage" position="right" fill="#e2e8f0" fontSize={11} formatter={(value: unknown) => {
                                                const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value) : 0;
                                                return (typeof numValue === 'number' && numValue > 0) ? `${numValue}%` : '';
                                            }} />
                                            {chartSummaryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PREMIUM_COLORS[index % PREMIUM_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-10 bg-black/20 rounded-lg">
                    <p className="text-lg text-blue-200">Pilih anggota bimbingan</p>
                </div>
            )}
        </div>
    );
};

const TadarusSessionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'>) => void;
    onUpdate: (id: string, updates: Partial<TadarusSession>) => void;
    existingSession: TadarusSession | null;
    mentees: Employee[];
    mentorId: string;
}> = ({ isOpen, onClose, onSave, onUpdate, existingSession, mentees, mentorId }) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [category, setCategory] = useState<'UMUM' | 'BBQ'>('BBQ');
    const [isRecurring, setIsRecurring] = useState(false);
    const [notes, setNotes] = useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());
    const [participantSearch, setParticipantSearch] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (existingSession) {
                setTitle(prev => {
                    if (prev !== existingSession.title) return existingSession.title;
                    return prev;
                });
                setDate(prev => {
                    if (prev !== existingSession.date) return existingSession.date;
                    return prev;
                });
                setStartTime(prev => {
                    if (prev !== (existingSession.startTime || '08:00')) return existingSession.startTime || '08:00';
                    return prev;
                });
                setEndTime(prev => {
                    if (prev !== (existingSession.endTime || '09:00')) return existingSession.endTime || '09:00';
                    return prev;
                });
                setCategory(prev => {
                    if (prev !== existingSession.category) return existingSession.category;
                    return prev;
                });
                setIsRecurring(prev => {
                    const newValue = !!existingSession.isRecurring;
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setNotes(prev => {
                    const newValue = existingSession.notes || '';
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setSelectedParticipantIds(prev => {
                    const newValue = new Set(existingSession.participantIds);
                    // Compare sets for equality
                    if (prev.size !== newValue.size || ![...prev].every(id => newValue.has(id))) {
                        return newValue;
                    }
                    return prev;
                });
            } else {
                setTitle(prev => {
                    const newValue = 'Sesi Bimbingan Baca Al-Qur\'an (BBQ)';
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setDate(prev => {
                    const newValue = new Date().toISOString().split('T')[0];
                    if (prev !== newValue) return newValue;
                    return prev;
                });
                setStartTime(prev => {
                    if (prev !== '08:00') return '08:00';
                    return prev;
                });
                setEndTime(prev => {
                    if (prev !== '09:00') return '09:00';
                    return prev;
                });
                setCategory(prev => {
                    if (prev !== 'BBQ') return 'BBQ';
                    return prev;
                });
                setIsRecurring(prev => {
                    if (prev !== false) return false;
                    return prev;
                });
                setNotes(prev => {
                    if (prev !== '') return '';
                    return prev;
                });
                setSelectedParticipantIds(prev => {
                    const newValue = new Set(mentees.map(m => m.id)); // Pre-select all mentees
                    // Compare sets for equality
                    if (prev.size !== newValue.size || ![...prev].every(id => newValue.has(id))) {
                        return newValue;
                    }
                    return prev;
                });
            }
        }
    }, [isOpen, existingSession, mentees]);

    const handleSubmit = () => {
        if (!title || !date) {
            alert("Judul dan Tanggal wajib diisi.");
            return;
        }

        const payload: Omit<TadarusSession, 'id' | 'createdAt' | 'presentMenteeIds'> = {
            title, date, startTime, endTime, category, notes, isRecurring,
            mentorId,
            participantIds: Array.from(selectedParticipantIds),
            status: 'open'
        };

        if (existingSession) {
            onUpdate(existingSession.id, payload);
        } else {
            onSave(payload);
        }
        onClose();
    };

    const handleParticipantToggle = (id: string) => {
        setSelectedParticipantIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const filteredMentees = useMemo(() => {
        if (!participantSearch) return mentees;
        return mentees.filter(m => m.name.toLowerCase().includes(participantSearch.toLowerCase()));
    }, [mentees, participantSearch]);

    if (!isOpen) return null;

    const formElementClasses = "w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white";

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold mb-4 text-white">{existingSession ? 'Edit Sesi Bimbingan' : 'Jadwalkan Sesi Bimbingan Baru'}</h3>
                 <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul Sesi" className={formElementClasses}/>
                    <div className="grid grid-cols-3 gap-4">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                        <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                        <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={`col-span-1 ${formElementClasses}`} style={{ colorScheme: 'dark' }} />
                    </div>
                     <select value={category} onChange={e => setCategory(e.target.value as 'UMUM' | 'BBQ')} className={formElementClasses}>
                         <option value="BBQ" className="bg-white text-black">Bimbingan Baca Qur'an (BBQ)</option>
                         <option value="UMUM" className="bg-white text-black">Tadarus Umum</option>
                    </select>
                    {!existingSession && (
                        <label className="flex items-center gap-2 text-white">
                            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500"/>
                            Ulangi setiap minggu pada bulan ini
                        </label>
                    )}
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Catatan (opsional)" rows={3} className={formElementClasses}></textarea>

                    <div>
                        <h4 className="font-semibold text-white mb-2">Pilih Peserta</h4>
                        <input type="search" value={participantSearch} onChange={e => setParticipantSearch(e.target.value)} placeholder="Cari anggota..." className={`${formElementClasses} mb-2`}/>
                        <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-black/20 rounded-md">
                            {filteredMentees.map(mentee => (
                                <label key={mentee.id} className="flex items-center gap-2 p-1.5 hover:bg-white/10 rounded-md cursor-pointer">
                                    <input type="checkbox" checked={selectedParticipantIds.has(mentee.id)} onChange={() => handleParticipantToggle(mentee.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                    <span className="text-white text-base">{mentee.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                    <button onClick={handleSubmit} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const MenteeManagement: React.FC<{
    mentees: Employee[];
    allUsers: Employee[];
    mentorId: string;
    onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
    addToast?: (message: string, type: 'success' | 'error') => void;
}> = ({ mentees, allUsers, mentorId, onUpdateProfile, addToast }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedToAdd, setSelectedToAdd] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [unitFilter, setUnitFilter] = useState('all');
    const [professionFilter, setProfessionFilter] = useState('all');
    const [confirmation, setConfirmation] = useState<{ isOpen: boolean; title: string; message: React.ReactNode; onConfirm: () => void; } | null>(null);

    const unassignedUsers = useMemo(() => {
        return allUsers
            .filter(u => !u.mentorId && u.id !== mentorId && !u.canBeMentor)
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allUsers, mentorId]);

    const uniqueUnits = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.unit).filter(Boolean))).sort()], [allUsers]);
    const uniqueProfessions = useMemo(() => ['all', ...Array.from(new Set(allUsers.map(u => u.profession).filter(Boolean))).sort()], [allUsers]);

    const filteredUnassigned = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return unassignedUsers.filter(u => {
            const searchMatch = !search || u.name.toLowerCase().includes(lowerSearch) || u.id.includes(lowerSearch);
            const unitMatch = unitFilter === 'all' || u.unit === unitFilter;
            const professionMatch = professionFilter === 'all' || u.profession === professionFilter;
            return searchMatch && unitMatch && professionMatch;
        });
    }, [unassignedUsers, search, unitFilter, professionFilter]);

    const handleAddMentees = async () => {
        // Show loading state or immediate feedback
        const selectedIds = Array.from(selectedToAdd);
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
            const result = await onUpdateProfile(id, { mentorId });
            if (result) {
                successCount++;
            } else {
                failCount++;
            }
        }

        // Close modal and reset selection
        setIsAddModalOpen(false);
        setSelectedToAdd(new Set());

        // Show success message
        if (successCount > 0 && failCount === 0) {
            addToast?.(`${successCount} anggota bimbingan berhasil ditambahkan!`, 'success');
        } else if (successCount > 0 && failCount > 0) {
            addToast?.(`${successCount} berhasil, ${failCount} gagal ditambahkan`, 'error');
        } else if (failCount > 0) {
            addToast?.(`Gagal menambahkan ${failCount} anggota bimbingan`, 'error');
        }
    };

    const initiateRemoveMentee = (mentee: Employee) => {
        setConfirmation({
            isOpen: true,
            title: 'Konfirmasi Hapus Anggota',
            message: <>Apakah Anda yakin ingin menghapus <strong>{mentee.name}</strong> dari daftar bimbingan Anda?</>,
            onConfirm: async () => {
                await onUpdateProfile(mentee.id, { mentorId: undefined });
                setConfirmation(null);
            },
        });
    };

    const toggleSelection = (id: string) => {
        setSelectedToAdd(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Kelola Anggota Bimbingan</h3>
                <button onClick={() => setIsAddModalOpen(true)} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                    <UserPlusIcon className="w-5 h-5" />
                    Tambah Anggota
                </button>
            </div>
             <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Nama Anggota</th>
                            <th className="px-4 py-3 whitespace-nowrap">Unit Kerja</th>
                            <th className="px-4 py-3 whitespace-nowrap">Profesi</th>
                            <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mentees.map(mentee => (
                            <tr key={mentee.id} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{mentee.name}</td>
                                <td className="px-4 py-3">{mentee.unit}</td>
                                <td className="px-4 py-3">{mentee.profession}</td>
                                <td className="px-4 py-3 text-center">
                                    <button onClick={() => initiateRemoveMentee(mentee)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-red-600 hover:bg-red-500 text-white transition-colors">
                                        Hapus
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {mentees.length === 0 && (
                            <tr><td colSpan={4} className="text-center p-8 text-blue-200">Anda belum memiliki anggota bimbingan.</td></tr>
                        )}
                    </tbody>
                </table>
             </div>

             {isAddModalOpen && createPortal(
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-2xl border border-white/20 flex flex-col h-[90vh]">
                        <h3 className="text-lg font-bold text-white mb-4">Tambah Anggota Bimbingan Baru</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama atau NIP..." className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"/>
                            <select value={unitFilter} onChange={e => setUnitFilter(e.target.value)} className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                                {uniqueUnits.map(u => <option key={u} value={u} className="bg-white text-black">{u === 'all' ? 'Semua Unit' : u}</option>)}
                            </select>
                            <select value={professionFilter} onChange={e => setProfessionFilter(e.target.value)} className="sm:col-span-1 w-full bg-black/20 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white">
                                 {uniqueProfessions.map(p => <option key={p} value={p} className="bg-white text-black">{p === 'all' ? 'Semua Profesi' : p}</option>)}
                            </select>
                        </div>
                        <div className="flex-grow overflow-y-auto border border-white/20 rounded-lg p-2 bg-black/20">
                             {filteredUnassigned.map(user => (
                                <label key={user.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-white/10 cursor-pointer">
                                    <input type="checkbox" checked={selectedToAdd.has(user.id)} onChange={() => toggleSelection(user.id)} className="w-4 h-4 rounded bg-gray-700 border-gray-500 text-teal-500 focus:ring-teal-500" />
                                    <div>
                                        <span className="text-white font-medium">{user.name}</span>
                                        <span className="text-xs text-gray-400 ml-2">({user.profession}, {user.unit})</span>
                                    </div>
                                </label>
                             ))}
                             {filteredUnassigned.length === 0 && <p className="text-center text-gray-400 p-4">Tidak ada karyawan yang tersedia.</p>}
                        </div>
                        <div className="mt-6 flex justify-between items-center">
                            <p className="text-sm text-blue-200">Terpilih: {selectedToAdd.size} orang</p>
                            <div className="flex gap-3">
                                <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                                <button onClick={handleAddMentees} disabled={selectedToAdd.size === 0} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:bg-gray-500">
                                    Tambahkan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
             )}

            {confirmation && (
                 <ConfirmationModal
                    isOpen={confirmation.isOpen}
                    onClose={() => setConfirmation(null)}
                    onConfirm={confirmation.onConfirm}
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmText="Ya, Hapus"
                    confirmColorClass="bg-red-600 hover:bg-red-500"
                 />
            )}
        </div>
    );
};

const ReadingReportView: React.FC<{ mentees: Employee[], mentorName: string }> = ({ mentees, mentorName }) => {
    const allReadings = useMemo(() => {
        const readings: { menteeName: string; date: string; type: 'Buku' | 'Al-Qur\'an'; detail: string; }[] = [];
        mentees.forEach(mentee => {
            (mentee.readingHistory || []).forEach(r => {
                readings.push({
                    menteeName: mentee.name,
                    date: r.dateCompleted,
                    type: 'Buku',
                    detail: r.bookTitle,
                });
            });
            (mentee.quranReadingHistory || []).forEach(r => {
                readings.push({
                    menteeName: mentee.name,
                    date: r.date,
                    type: 'Al-Qur\'an',
                    detail: `QS. ${r.surahName} [${r.surahNumber}:${r.startAyah}-${r.endAyah}]`,
                });
            });
        });
        return readings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [mentees]);

    const handleExport = (format: 'pdf' | 'xlsx') => {
        const fileName = `laporan_bacaan_bimbingan_${mentorName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}`;
        const tableHeader = ["Tanggal", "Nama Anggota", "Jenis Bacaan", "Detail"];
        const tableBody = allReadings.map(r => [
            new Date(r.date + 'T12:00:00Z').toLocaleDateString('id-ID'),
            r.menteeName,
            r.type,
            r.detail,
        ]);

        if (format === 'xlsx') {
            const ws = XLSX.utils.aoa_to_sheet([tableHeader, ...tableBody]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Laporan Bacaan");
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
            const tableConfig: TableConfig = {
                head: [tableHeader],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133] },
            };
            const reportSection: ReportSection = {
                title: "LAPORAN BACAAN ANGGOTA BIMBINGAN",
                subtitle: `Mentor: ${mentorName}`,
                tables: [tableConfig],
            };
            generateOfficialPdf([reportSection], `${fileName}.pdf`, 'save', mentorName);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-bold text-white">Laporan Bacaan Anggota Bimbingan</h3>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleExport('pdf')} className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                        <PdfIcon className="w-5 h-5" /> Export PDF
                    </button>
                    <button onClick={() => handleExport('xlsx')} className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg flex items-center gap-2 text-xs sm:text-sm">
                        <ExcelIcon className="w-5 h-5" /> Export Excel
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-white/20">
                <table className="min-w-full text-sm text-left text-white">
                    <thead className="bg-white/10 text-xs uppercase text-blue-200">
                        <tr>
                            <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                            <th className="px-4 py-3 whitespace-nowrap">Nama Anggota</th>
                            <th className="px-4 py-3 whitespace-nowrap">Jenis Bacaan</th>
                            <th className="px-4 py-3 whitespace-nowrap">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allReadings.map((reading, index) => (
                            <tr key={index} className="border-b border-gray-700 hover:bg-white/5">
                                <td className="px-4 py-3 whitespace-nowrap">{new Date(reading.date + 'T12:00:00Z').toLocaleDateString('id-ID')}</td>
                                <td className="px-4 py-3 font-semibold whitespace-nowrap">{reading.menteeName}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${reading.type === 'Al-Qur\'an' ? 'bg-teal-500/20 text-teal-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                                        {reading.type}
                                    </span>
                                </td>
                                <td className="px-4 py-3">{reading.detail}</td>
                            </tr>
                        ))}
                        {allReadings.length === 0 && (
                            <tr><td colSpan={4} className="text-center p-8 text-blue-200">Belum ada laporan bacaan dari anggota bimbingan.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

interface TargetManagementProps {
    mentees: Employee[];
    targetMenteeId: string;
    setTargetMenteeId: (id: string) => void;
    targetTitle: string;
    setTargetTitle: (title: string) => void;
    targetDescription: string;
    setTargetDescription: (desc: string) => void;
    handleCreateTarget: (e: React.FormEvent) => void;
    menteeTargets: MenteeTarget[];
    setConfirmDeleteTarget: (target: MenteeTarget | null) => void;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance>; }>;
}

const TargetManagement: React.FC<TargetManagementProps> = ({
    mentees,
    targetMenteeId,
    setTargetMenteeId,
    targetTitle,
    setTargetTitle,
    targetDescription,
    setTargetDescription,
    handleCreateTarget,
    menteeTargets,
    setConfirmDeleteTarget,
    allUsersData
}) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-black/20 p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Buat Target Baru</h3>
                <form onSubmit={handleCreateTarget} className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Pilih Anggota Bimbingan</label>
                        <select
                            value={targetMenteeId}
                            onChange={(e) => setTargetMenteeId(e.target.value)}
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        >
                            <option value="" disabled className="bg-white text-black">-- Pilih Anggota --</option>
                            {mentees.map(mentee => (
                                <option key={mentee.id} value={mentee.id} className="bg-white text-black">{mentee.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Judul Target</label>
                        <input
                            type="text"
                            value={targetTitle}
                            onChange={(e) => setTargetTitle(e.target.value)}
                            placeholder="Contoh: Selesaikan Juz Amma"
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-blue-200 block mb-1">Deskripsi (Opsional)</label>
                        <textarea
                            value={targetDescription}
                            onChange={(e) => setTargetDescription(e.target.value)}
                            rows={3}
                            placeholder="Detail atau catatan tambahan..."
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-2.5 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        ></textarea>
                    </div>
                    <div className="text-right">
                        <button type="submit" className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg">
                            Tetapkan Target
                        </button>
                    </div>
                </form>
            </div>
            <div className="bg-black/20 p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Daftar Target Bulan Ini</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {menteeTargets.length > 0 ? (
                        menteeTargets.map(target => (
                            <div key={target.id} className="bg-gray-800/50 p-3 rounded-lg flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white">{target.title}</p>
                                    <p className="text-xs text-gray-400">Untuk: {allUsersData[target.menteeId]?.employee.name || 'N/A'}</p>
                                    {target.status === 'completed' && <p className="text-xs text-green-400">Selesai pada: {new Date(target.completedAt!).toLocaleDateString('id-ID')}</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${target.status === 'completed' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                        {target.status === 'completed' ? 'Selesai' : 'Berjalan'}
                                    </span>
                                    <button
                                        onClick={() => setConfirmDeleteTarget(target)}
                                        className="p-1.5 text-red-400 hover:text-red-300 rounded-full hover:bg-white/10"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-blue-200">
                            Belum ada target yang dibuat bulan ini.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface PersetujuanProps {
    pendingMentorReviews: WeeklyReportSubmission[];
    pendingTadarusRequests: TadarusRequest[];
    pendingMissedPrayerRequests: MissedPrayerRequest[];
    onReviewTadarusRequest: (requestId: string, status: "approved" | "rejected") => void;
    onApproveMissedRequest: (id: string) => void;
    onRejectMissedRequest: (id: string) => void;
    onViewReport: (submission: WeeklyReportSubmission) => void;
    filteredSubmissions: WeeklyReportSubmission[];
    statusFilter: 'all' | 'pending' | 'approved' | 'rejected';
    setStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>;
    filterYear: string;
    setFilterYear: React.Dispatch<React.SetStateAction<string>>;
    availableYears: string[];
    filterMonth: string;
    setFilterMonth: React.Dispatch<React.SetStateAction<string>>;
}

const StatusFilterButton: React.FC<{
    filter: 'all' | 'pending' | 'approved' | 'rejected',
    label: string,
    currentFilter: 'all' | 'pending' | 'approved' | 'rejected',
    setFilter: React.Dispatch<React.SetStateAction<'all' | 'pending' | 'approved' | 'rejected'>>
}> = ({ filter, label, currentFilter, setFilter }) => (
    <button onClick={() => setFilter(filter)} className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-full transition-colors duration-200 ${currentFilter === filter ? 'bg-teal-500 text-white' : 'bg-gray-700/50 text-blue-200 hover:bg-gray-700'}`}>
        {label}
    </button>
);

const Persetujuan: React.FC<PersetujuanProps> = ({
    pendingMentorReviews,
    pendingTadarusRequests,
    pendingMissedPrayerRequests,
    onReviewTadarusRequest,
    onApproveMissedRequest,
    onRejectMissedRequest,
    onViewReport,
    filteredSubmissions,
    statusFilter, setStatusFilter,
    filterYear, setFilterYear, availableYears,
    filterMonth, setFilterMonth
}) => {

    const hasPending = pendingMentorReviews.length > 0 || pendingTadarusRequests.length > 0 || pendingMissedPrayerRequests.length > 0;

    return (
        <div className="space-y-8">
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Menunggu Tinjauan Anda</h3>
                {!hasPending ? (
                     <div className="text-center py-10 bg-black/20 rounded-lg"><p className="text-blue-200 text-sm">Tidak ada pengajuan</p></div>
                ) : (
                    <div className="space-y-4">
                        {/* Render pending requests */}
                        {pendingMentorReviews.map(sub => (
                             <div key={sub.id} className="bg-black/20 p-4 rounded-lg border border-yellow-400/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-semibold text-white">Laporan Mingguan: {sub.menteeName}</p>
                                    <p className="text-sm text-blue-200">{`Pekan ${sub.weekIndex + 1}, ${new Date(sub.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long' })}`}</p>
                                </div>
                                <button onClick={() => onViewReport(sub)} className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm">Lihat & Tinjau</button>
                            </div>
                        ))}
                         {pendingTadarusRequests.map(req => (
                             <div key={req.id} className="bg-black/20 p-4 rounded-lg border border-yellow-400/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-semibold text-white">Pengajuan Tadarus: {req.menteeName}</p>
                                    <p className="text-sm text-blue-200">Tanggal: {new Date(req.date + 'T12:00:00Z').toLocaleDateString('id-ID')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onReviewTadarusRequest(req.id, 'rejected')} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm">Tolak</button>
                                    <button onClick={() => onReviewTadarusRequest(req.id, 'approved')} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm">Setujui</button>
                                </div>
                            </div>
                         ))}
                         {pendingMissedPrayerRequests.map(req => (
                             <div key={req.id} className="bg-black/20 p-4 rounded-lg border border-yellow-400/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div>
                                    <p className="font-semibold text-white">Presensi Terlewat: {req.menteeName}</p>
                                    <p className="text-sm text-blue-200">{req.prayerName}, {new Date(req.date + 'T12:00:00Z').toLocaleDateString('id-ID')}</p>
                                     <p className="text-xs text-gray-400 italic mt-1">&quot;{req.reason}&quot;</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onRejectMissedRequest(req.id)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg text-sm">Tolak</button>
                                    <button onClick={() => onApproveMissedRequest(req.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg text-sm">Setujui</button>
                                </div>
                            </div>
                         ))}
                    </div>
                )}
            </div>

            <div>
                 <h3 className="text-xl font-bold text-white mb-4">Riwayat Tinjauan Laporan</h3>
                 <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-black/20 rounded-lg border border-white/10">
                     <div className="flex items-center gap-2 p-1.5 bg-black/30 rounded-full self-start flex-wrap">
                        <StatusFilterButton filter="all" label="Semua" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="pending" label="Menunggu" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="approved" label="Disetujui" currentFilter={statusFilter} setFilter={setStatusFilter} />
                        <StatusFilterButton filter="rejected" label="Ditolak" currentFilter={statusFilter} setFilter={setStatusFilter} />
                     </div>
                    <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            <option value="all" className="text-black bg-white">Semua Tahun</option>
                            {availableYears.map(year => <option key={year} value={year} className="text-black bg-white">{year}</option>)}
                        </select>
                        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-sm text-white focus:ring-2 focus:ring-teal-400 focus:outline-none">
                            <option value="all" className="text-black bg-white">Semua Bulan</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month} className="text-black bg-white">{new Date(0, month - 1).toLocaleString('id-ID', { month: 'long' })}</option>
                            ))}
                        </select>
                    </div>
                 </div>
                 <div className="overflow-x-auto rounded-lg border border-white/20">
                     <table className="min-w-full text-sm text-left text-white">
                         <thead className="bg-white/10 text-xs uppercase text-blue-200">
                             <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Nama Karyawan</th>
                                <th className="px-4 py-3 whitespace-nowrap">Periode Laporan</th>
                                <th className="px-4 py-3 whitespace-nowrap">Tanggal Pengajuan</th>
                                <th className="px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                            </tr>
                        </thead>
                         <tbody>
                            {filteredSubmissions.map(sub => (
                                <tr key={sub.id} className="border-b border-gray-700 hover:bg-white/5">
                                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{sub.menteeName}</td>
                                    <td className="px-4 py-3">{`Pekan ${sub.weekIndex + 1}, ${new Date(sub.monthKey + '-02').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}</td>
                                    <td className="px-4 py-3">{new Date(sub.submittedAt).toLocaleString('id-ID')}</td>
                                    <td className="px-4 py-3 text-center">
                                        <button onClick={() => onViewReport(sub)} className="px-3 py-1.5 rounded-md font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                                            Lihat Detail
                                        </button>
                                    </td>
                                </tr>
                            ))}
                             {filteredSubmissions.length === 0 && <tr><td colSpan={4} className="text-center p-4 text-blue-200">Tidak ada data.</td></tr>}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

interface SesiBimbinganProps {
    upcomingSessions: TadarusSession[];
    employee: Employee;
    onMentorAttendOwnSession: (sessionId: string) => void;
    onDeleteSession: (session: TadarusSession) => void;
    onEditSession: (session: TadarusSession) => void;
    onNewSession: () => void;
}

const SesiBimbingan: React.FC<SesiBimbinganProps> = ({
    upcomingSessions,
    employee: _employee,
    onMentorAttendOwnSession,
    onDeleteSession,
    onEditSession,
    onNewSession
}) => {

    return (
         <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Sesi Bimbingan Terjadwal</h3>
                <button onClick={onNewSession} className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold rounded-lg flex items-center gap-2 text-sm">
                    <CalendarDaysIcon className="w-5 h-5" />
                    Jadwalkan Sesi Baru
                </button>
            </div>
            {upcomingSessions.length > 0 ? (
                 <div className="space-y-3">
                    {upcomingSessions.map(session => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const isToday = session.date === todayStr;
                        return (
                            <div key={session.id} className="bg-black/20 p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <p className="font-semibold text-white">{session.title}</p>
                                    <p className="text-sm text-blue-200">
                                        {new Date(session.date + 'T12:00:00Z').toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long' })}
                                        <span className="text-gray-400 mx-2">|</span>
                                        {session.startTime} - {session.endTime}
                                    </p>
                                    <p className="text-xs text-purple-300 mt-1 font-semibold">{session.category}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
                                    {isToday && !session.mentorPresent && (
                                        <button onClick={() => onMentorAttendOwnSession(session.id)} className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 text-white rounded-md">Hadir</button>
                                    )}
                                    {session.mentorPresent && <span className="px-3 py-1.5 text-xs font-semibold bg-green-500/30 text-green-300 rounded-md">Sudah Hadir</span>}
                                    <button onClick={() => onEditSession(session)} className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-md">Edit</button>
                                    <button onClick={() => onDeleteSession(session)} className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded-md">Hapus</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                 <div className="text-center py-16 bg-black/20 rounded-lg">
                    <p className="text-lg text-blue-200">Belum ada sesi bimbingan</p>
                </div>
            )}
        </div>
    );
};

const SubTabButton: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    icon: React.FC<{className: string}>
    count?: number;
}> = ({ active, onClick, label, icon: Icon, count }) => (
     <button
        onClick={onClick}
        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md font-medium transition-all duration-300 ease-in-out text-sm relative
          ${active
            ? 'bg-teal-500 text-white'
            : 'text-blue-200 hover:text-white hover:bg-white/10'
          }`}
    >
        <Icon className="w-4 h-4" />
        {label}
        {count !== undefined && count > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                {count}
            </span>
        )}
    </button>
);

export const MentorDashboard: React.FC<MentorDashboardProps> = ({
  employee,
  allUsersData,
  onUpdateProfile,
  weeklyReportSubmissions,
  onReviewReport,
  tadarusSessions,
  tadarusRequests,
  onCreateTadarusSession,
  onUpdateTadarusSession,
  onDeleteTadarusSession,
  onReviewTadarusRequest,
  missedPrayerRequests,
  onReviewMissedPrayerRequest,
  onMentorAttendOwnSession,
  onLogAudit,
  addToast,
  mentorSubView,
  setMentorSubView,
  menteesOfMentor,
  targetMenteeId,
  setTargetMenteeId,
  targetTitle,
  setTargetTitle,
  targetDescription,
  setTargetDescription,
  handleCreateTarget,
  setConfirmDeleteTarget,
  menteeTargets,
}) => {

    // Unified state for confirmations
    const [approvalTarget, setApprovalTarget] = useState<{type: 'missed-prayer', id: string} | {type: 'report', id: string} | null>(null);
    const [rejectionTarget, setRejectionTarget] = useState<{type: 'missed-prayer', id: string} | {type: 'report', submission: WeeklyReportSubmission} | null>(null);
    const [pendingSessionDelete, setPendingSessionDelete] = useState<TadarusSession | null>(null);
    const [selectedSubmission, setSelectedSubmission] = useState<WeeklyReportSubmission | null>(null);

    // State for Tadarus session modal
    const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<TadarusSession | null>(null);

    // State for detailed progress view
    const [progressViewMonth, setProgressViewMonth] = useState(new Date());

    // State for Approval History filters
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [filterYear, setFilterYear] = useState<string>('all');
    const [filterMonth, setFilterMonth] = useState<string>('all');

    const mentees = menteesOfMentor;

    const pendingTadarusRequests = useMemo(() => {
        return tadarusRequests.filter(r => r.mentorId === employee.id && r.status === 'pending');
    }, [tadarusRequests, employee.id]);

    const pendingMissedPrayerRequests = useMemo(() => {
        return missedPrayerRequests.filter(r => r.mentorId === employee.id && r.status === 'pending');
    }, [missedPrayerRequests, employee.id]);

    const pendingMentorReviews = useMemo(() => {
        return weeklyReportSubmissions.filter(s => s.mentorId === employee.id && s.status === 'pending_mentor');
    }, [weeklyReportSubmissions, employee.id]);

    const upcomingSessions = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        return tadarusSessions.filter(s => s.mentorId === employee.id && s.date >= today)
               .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [tadarusSessions, employee.id]);

    const submissionsForMentor = useMemo(() => {
        return weeklyReportSubmissions.filter(s => s.mentorId === employee.id);
    }, [weeklyReportSubmissions, employee.id]);

    const availableYears = useMemo(() => {
        const years = new Set(submissionsForMentor.map(s => s.monthKey.substring(0, 4)));
        return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    }, [submissionsForMentor]);

    const filteredSubmissions = useMemo(() => {
        return submissionsForMentor.filter(s => {
            const statusMatch = statusFilter === 'all' ||
                (statusFilter === 'pending' && s.status === 'pending_mentor') ||
                (statusFilter === 'approved' && ['pending_supervisor', 'pending_kaunit', 'approved'].includes(s.status)) ||
                (statusFilter === 'rejected' && s.status.startsWith('rejected_'));

            if (!statusMatch) return false;

            const [year, month] = s.monthKey.split('-');
            const yearMatch = filterYear === 'all' || year === filterYear;
            const monthMatch = filterMonth === 'all' || parseInt(month, 10) === parseInt(filterMonth, 10);

            return yearMatch && monthMatch;
        });
    }, [submissionsForMentor, statusFilter, filterYear, filterMonth]);

    const handleApprove = (type: 'missed-prayer' | 'report', id: string) => {
        setApprovalTarget({ type, id });
    };

    const handleConfirmApproval = () => {
        if (!approvalTarget) return;

        if (approvalTarget.type === 'missed-prayer') {
            onReviewMissedPrayerRequest(approvalTarget.id, 'approved', 'Disetujui oleh Mentor');
        } else {
            onReviewReport(approvalTarget.id, 'approved', 'Disetujui oleh Mentor.', 'mentor');
        }

        const submission = weeklyReportSubmissions.find(s => s.id === approvalTarget.id);
        if(submission) {
            onLogAudit({ adminId: employee.id, adminName: employee.name, action: `Persetujuan Laporan`, target: `Karyawan: ${submission.menteeName}`, reason: 'Menyetujui laporan mingguan.' });
        }

        setSelectedSubmission(null);
        setApprovalTarget(null);
    };

    const handleRejectSubmit = (notes: string) => {
        if (!rejectionTarget) return;

        if (rejectionTarget.type === 'missed-prayer') {
            onReviewMissedPrayerRequest(rejectionTarget.id, 'rejected', notes);
        } else {
            onReviewReport(rejectionTarget.submission.id, 'rejected', notes, 'mentor');
             onLogAudit({ adminId: employee.id, adminName: employee.name, action: `Penolakan Laporan`, target: `Karyawan: ${rejectionTarget.submission.menteeName}`, reason: notes });
        }

        setSelectedSubmission(null);
        setRejectionTarget(null);
    };

    const handleDeleteSession = () => {
        if (pendingSessionDelete) {
            onDeleteTadarusSession(pendingSessionDelete.id);
            setPendingSessionDelete(null);
        }
    };

    const openSessionModal = (session?: TadarusSession) => {
        setEditingSession(session || null);
        setIsSessionModalOpen(true);
    };

    const menteeData = selectedSubmission ? allUsersData[selectedSubmission.menteeId]?.employee : null;

    if (selectedSubmission) {
        return menteeData ? (<MenteeDetailProgressView mentee={menteeData} monthKey={selectedSubmission.monthKey} onBack={() => setSelectedSubmission(null)} />) : null;
    }

    return (
        <div className="space-y-6">
             <div className="overflow-x-auto overflow-y-hidden touch-pan-x pb-3">
                <div className="flex items-center gap-2 sm:gap-3 border-b border-white/10 min-w-max px-1">
                    <SubTabButton label="Persetujuan" icon={CheckSquareIcon} active={mentorSubView === 'persetujuan'} onClick={() => setMentorSubView('persetujuan')} count={pendingMentorReviews.length + pendingTadarusRequests.length + pendingMissedPrayerRequests.length} />
                    <SubTabButton label="Sesi Bimbingan" icon={CalendarDaysIcon} active={mentorSubView === 'sessions'} onClick={() => setMentorSubView('sessions')} />
                    <SubTabButton label="Anggota Bimbingan" icon={UserGroupIcon} active={mentorSubView === 'mentees'} onClick={() => setMentorSubView('mentees')} />
                    <SubTabButton label="Target Bimbingan" icon={TagIcon} active={mentorSubView === 'target'} onClick={() => setMentorSubView('target')} />
                    <SubTabButton label="Progres Anggota" icon={ChartBarIcon} active={mentorSubView === 'progress'} onClick={() => setMentorSubView('progress')} />
                    <SubTabButton label="Laporan Bacaan" icon={BookOpenIcon} active={mentorSubView === 'laporan-bacaan'} onClick={() => setMentorSubView('laporan-bacaan')} />
                </div>
            </div>

            <div className="animate-view-change">
                {mentorSubView === 'persetujuan' && (
                    <Persetujuan
                        pendingMentorReviews={pendingMentorReviews}
                        pendingTadarusRequests={pendingTadarusRequests}
                        pendingMissedPrayerRequests={pendingMissedPrayerRequests}
                        onReviewTadarusRequest={onReviewTadarusRequest}
                        onApproveMissedRequest={(id) => handleApprove('missed-prayer', id)}
                        onRejectMissedRequest={(id) => setRejectionTarget({ type: 'missed-prayer', id })}
                        onViewReport={setSelectedSubmission}
                        filteredSubmissions={filteredSubmissions}
                        statusFilter={statusFilter}
                        setStatusFilter={setStatusFilter}
                        filterYear={filterYear}
                        setFilterYear={setFilterYear}
                        availableYears={availableYears}
                        filterMonth={filterMonth}
                        setFilterMonth={setFilterMonth}
                    />
                )}
                 {mentorSubView === 'sessions' && (
                    <SesiBimbingan
                        upcomingSessions={upcomingSessions}
                        employee={employee}
                        onMentorAttendOwnSession={onMentorAttendOwnSession}
                        onDeleteSession={(session) => setPendingSessionDelete(session)}
                        onEditSession={openSessionModal}
                        onNewSession={() => openSessionModal()}
                    />
                )}
                 {mentorSubView === 'mentees' && (
                    <MenteeManagement
                        mentees={mentees}
                        allUsers={Object.values(allUsersData).map(d => d.employee)}
                        mentorId={employee.id}
                        onUpdateProfile={onUpdateProfile}
                        addToast={addToast}
                    />
                )}
                 {mentorSubView === 'target' && (
                    <TargetManagement
                        mentees={mentees}
                        targetMenteeId={targetMenteeId}
                        setTargetMenteeId={setTargetMenteeId}
                        targetTitle={targetTitle}
                        setTargetTitle={setTargetTitle}
                        targetDescription={targetDescription}
                        setTargetDescription={setTargetDescription}
                        handleCreateTarget={handleCreateTarget}
                        menteeTargets={menteeTargets.filter(t => t.mentorId === employee.id)}
                        setConfirmDeleteTarget={setConfirmDeleteTarget}
                        allUsersData={allUsersData}
                    />
                )}
                {mentorSubView === 'progress' && (
                    <MenteeDetailProgressView
                        mentee={mentees[0]}
                        monthKey={progressViewMonth.toISOString().slice(0, 7)}
                        mentees={mentees}
                        currentMonth={progressViewMonth}
                        onMonthChange={setProgressViewMonth}
                    />
                )}
                {mentorSubView === 'laporan-bacaan' && (
                    <ReadingReportView mentees={mentees} mentorName={employee.name} />
                )}
            </div>

            <ConfirmationModal
                isOpen={!!approvalTarget}
                onClose={() => setApprovalTarget(null)}
                onConfirm={handleConfirmApproval}
                title="Konfirmasi Persetujuan"
                message="Apakah Anda yakin ingin menyetujui pengajuan ini?"
                confirmText="Ya, Setujui"
                confirmColorClass="bg-green-600 hover:bg-green-500"
            />

            <RejectionModal
                isOpen={!!rejectionTarget}
                onClose={() => setRejectionTarget(null)}
                onSubmit={handleRejectSubmit}
                title="Tolak Pengajuan"
                prompt="Berikan alasan penolakan pengajuan ini."
            />
             <ConfirmationModal
                isOpen={!!pendingSessionDelete}
                onClose={() => setPendingSessionDelete(null)}
                onConfirm={handleDeleteSession}
                title="Hapus Sesi Bimbingan"
                message={<>Apakah Anda yakin ingin menghapus sesi &quot;<strong>{pendingSessionDelete?.title}</strong>&quot;? Tindakan ini tidak dapat diurungkan.</>}
                confirmText="Ya, Hapus Sesi"
                confirmColorClass="bg-red-600 hover:bg-red-500"
            />
             <TadarusSessionModal
                isOpen={isSessionModalOpen}
                onClose={() => setIsSessionModalOpen(false)}
                onSave={onCreateTadarusSession}
                onUpdate={onUpdateTadarusSession}
                existingSession={editingSession}
                mentees={mentees}
                mentorId={employee.id}
            />
        </div>
    );
};
