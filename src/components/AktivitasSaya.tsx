import React, { useState, useMemo } from 'react';
import { type Employee, MonthlyReportSubmission, DailyActivity } from '../types';
import { Pencil, ShieldCheck, CheckSquare, BookOpen } from 'lucide-react';
import { AktivitasPribadiView, RiwayatBacaan } from './AktivitasPribadi';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface AktivitasSayaProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
    onLogManualActivity: (activityId: string, date: string) => void;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
    submissions: MonthlyReportSubmission[];
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onSubmitMonthlyReport: (monthKey: string) => void;
    tadarusRequests: any[];
    tadarusSessions: any[];
    missedPrayerRequests: any[];
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'password'>>) => Promise<boolean>;
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'manager' | 'kaunit') => void;
    onCreateTadarusSession: (data: any) => void;
    onUpdateTadarusSession: (sessionId: string, updates: any) => void;
    onDeleteTadarusSession: (sessionId: string) => void;
    onReviewTadarusRequest: (requestId: string, status: string) => void;
    onReviewMissedPrayerRequest: (requestId: string, status: string, mentorNotes?: string) => void;
    onMentorAttendOwnSession: (sessionId: string) => void;
    hospitals: any[];
    addToast?: (message: string, type: 'success' | 'error') => void;
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    initialTab?: 'aktivitas-pribadi' | 'riwayat-bacaan' | 'panel-mentor' | 'persetujuan';
}

const TabButton: React.FC<{
    label: string;
    icon: any;
    active: boolean;
    onClick: () => void;
    count?: number;
}> = ({ label, icon: Icon, active, onClick, count }) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap relative
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
        {count !== undefined && count > 0 && (
            <span className="absolute top-2 right-2 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg animate-pulse">
                {count}
            </span>
        )}
    </button>
);

const AktivitasSaya: React.FC<AktivitasSayaProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'aktivitas-pribadi' | 'riwayat-bacaan'>(
        (props.initialTab as any) || 'aktivitas-pribadi'
    );

    // Role calculations
    const hasMentorRole = props.employee.canBeMentor === true;
    const hasApprovalRole = props.employee.canBeSupervisor === true || props.employee.canBeManager === true || props.employee.canBeKaUnit === true;
    const functionalRoles = props.employee.functionalRoles || [];

    // Calculate pending counts for notification badges
    // Note: Pending counts are now mainly relevant for the sidebar badges, but if needed here we can keep them.
    // However, since we removed the tabs, we don't need badges specific to those tabs.

    const renderContent = () => {
        switch (activeTab) {
            case 'aktivitas-pribadi':
                return (
                    <AktivitasPribadiView
                        employee={props.employee}
                        dailyActivitiesConfig={props.dailyActivitiesConfig}
                        onLogBookReading={props.onLogBookReading}
                        onLogManualActivity={props.onLogManualActivity}
                        onDeleteReadingHistory={props.onDeleteReadingHistory} // Added prop
                        submissions={props.submissions}
                        onSubmitMonthlyReport={props.onSubmitMonthlyReport}
                    />
                );
            case 'riwayat-bacaan':
                return (
                    <RiwayatBacaan
                        employee={props.employee}
                        onDeleteReadingHistory={props.onDeleteReadingHistory}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <nav className="border-b border-white/20">
                <div className="overflow-x-auto overflow-y-hidden touch-pan-x">
                    <div className="flex items-center gap-2 -mb-px min-w-max">
                        <TabButton label="Aktivitas Pribadi" icon={Pencil} active={activeTab === 'aktivitas-pribadi'} onClick={() => setActiveTab('aktivitas-pribadi')} />
                        <TabButton label="Riwayat Bacaan" icon={BookOpen} active={activeTab === 'riwayat-bacaan'} onClick={() => setActiveTab('riwayat-bacaan')} />
                    </div>
                </div>
            </nav>
            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default AktivitasSaya;