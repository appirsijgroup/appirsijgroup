'use client';

import React, { useState, useMemo } from 'react';
import { type Employee, WeeklyReportSubmission, DailyActivity, AuditLogEntry } from '../types';
import { Pencil, ShieldCheck, CheckSquare, BookOpen } from 'lucide-react';
import { AktivitasPribadiView, RiwayatBacaan } from './AktivitasPribadi';
import { MentorDashboard, type MentorDashboardView } from './MentorDashboard';
import Persetujuan from './Persetujuan';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface AktivitasSayaProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
    onLogManualActivity: (activityId: string, date: string) => void;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
    submissions: WeeklyReportSubmission[];
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
    weeklyReportSubmissions: WeeklyReportSubmission[];
    tadarusRequests: any[];
    tadarusSessions: any[];
    missedPrayerRequests: any[];
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'password'>>) => Promise<boolean>;
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit') => void;
    onCreateTadarusSession: (data: any) => void;
    onUpdateTadarusSession: (sessionId: string, updates: any) => void;
    onDeleteTadarusSession: (sessionId: string) => void;
    onReviewTadarusRequest: (requestId: string, status: string) => void;
    onReviewMissedPrayerRequest: (requestId: string, status: string, mentorNotes?: string) => void;
    onMentorAttendOwnSession: (sessionId: string) => void;
    onLogAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
    onCreateMenteeTarget: (target: any) => void;
    onDeleteMenteeTarget: (targetId: string) => void;
    menteeTargets: any[];
    hospitals: any[];
    addToast?: (message: string, type: 'success' | 'error') => void;
    loadDetailedEmployeeData: (employeeId: string) => Promise<void>;
    initialTab?: 'aktivitas-pribadi' | 'riwayat-bacaan' | 'panel-mentor' | 'persetujuan';
}

const TabButton: React.FC<{
    label: string;
    icon: any;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap
          ${active
                ? 'border-teal-400 text-teal-300'
                : 'border-transparent text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
    >
        <Icon className="w-5 h-5 hidden sm:block" />
        <span>{label}</span>
    </button>
);

const AktivitasSaya: React.FC<AktivitasSayaProps> = (props) => {
    const [activeTab, setActiveTab] = useState<'aktivitas-pribadi' | 'riwayat-bacaan' | 'panel-mentor' | 'persetujuan'>(props.initialTab || 'aktivitas-pribadi');

    // Role calculations
    const hasMentorRole = props.employee.canBeMentor === true;
    const hasApprovalRole = props.employee.canBeSupervisor === true || props.employee.canBeKaUnit === true;
    const functionalRoles = props.employee.functionalRoles || [];

    // State for MentorDashboard subview
    const [mentorSubView, setMentorSubView] = useState<MentorDashboardView>('persetujuan');

    // State for MentorDashboard target creation form
    const [targetMenteeId, setTargetMenteeId] = useState('');
    const [targetTitle, setTargetTitle] = useState('');
    const [targetDescription, setTargetDescription] = useState('');
    const [confirmDeleteTarget, setConfirmDeleteTarget] = useState<any>(null);

    const menteesOfMentor = useMemo(() => {
        if (!hasMentorRole) return [];
        return Object.values(props.allUsersData)
            .filter(data => data.employee.mentorId === props.employee.id)
            .map(data => data.employee);
    }, [props.allUsersData, props.employee.id, hasMentorRole]);

    // Initialize targetMenteeId when mentees become available
    // Use a ref to ensure we only set it once to avoid cascading renders
    const initializedRef = React.useRef(false);
    React.useEffect(() => {
        if (menteesOfMentor.length > 0 && !targetMenteeId && !initializedRef.current) {
            initializedRef.current = true;
            // Safe because ref prevents re-execution - only runs once on first load
            setTargetMenteeId(menteesOfMentor[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Including menteesOfMentor would cause re-runs, but ref prevents that
    }, [menteesOfMentor.length, targetMenteeId]);

    const handleCreateTarget = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetMenteeId || !targetTitle.trim()) {
            // Assuming there's an addToast function passed as prop
            if (props.hasOwnProperty('addToast')) {
                (props as any).addToast('Harap pilih anggota dan isi judul target.', 'error');
            }
            return;
        }
        const monthKey = new Date().toISOString().slice(0, 7);
        props.onCreateMenteeTarget({
            mentorId: props.employee.id,
            menteeId: targetMenteeId,
            title: targetTitle,
            description: targetDescription,
            monthKey: monthKey,
        });
        setTargetTitle('');
        setTargetDescription('');
        if (props.hasOwnProperty('addToast')) {
            (props as any).addToast('Target baru berhasil ditetapkan!', 'success');
        }
    };

    const handleDeleteTarget = () => {
        if (confirmDeleteTarget) {
            props.onDeleteMenteeTarget(confirmDeleteTarget.id);
            setConfirmDeleteTarget(null);
        }
    };

    // FIX: Wrapper function untuk delete mentee target
    const handleDeleteMenteeTarget = (targetId: string) => {
        props.onDeleteMenteeTarget(targetId);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'aktivitas-pribadi':
                return (
                    <AktivitasPribadiView
                        employee={props.employee}
                        dailyActivitiesConfig={props.dailyActivitiesConfig}
                        onLogBookReading={props.onLogBookReading}
                        onLogManualActivity={props.onLogManualActivity}
                        onDeleteReadingHistory={props.onDeleteReadingHistory}
                        submissions={props.submissions}
                    />
                );
            case 'riwayat-bacaan':
                return (
                    <RiwayatBacaan
                        employee={props.employee}
                        onDeleteReadingHistory={props.onDeleteReadingHistory}
                    />
                );

            case 'panel-mentor':
                if (!hasMentorRole) return null;
                return (
                    <MentorDashboard
                        employee={props.employee}
                        allUsersData={props.allUsersData}
                        onUpdateProfile={props.onUpdateProfile}
                        weeklyReportSubmissions={props.weeklyReportSubmissions}
                        onReviewReport={props.onReviewReport}
                        tadarusSessions={props.tadarusSessions}
                        tadarusRequests={props.tadarusRequests}
                        onCreateTadarusSession={props.onCreateTadarusSession}
                        onUpdateTadarusSession={props.onUpdateTadarusSession}
                        onDeleteTadarusSession={props.onDeleteTadarusSession}
                        onReviewTadarusRequest={props.onReviewTadarusRequest}
                        missedPrayerRequests={props.missedPrayerRequests}
                        onReviewMissedPrayerRequest={props.onReviewMissedPrayerRequest}
                        onMentorAttendOwnSession={props.onMentorAttendOwnSession}
                        onLogAudit={props.onLogAudit}
                        onDeleteMenteeTarget={handleDeleteMenteeTarget}
                        addToast={props.addToast}
                        mentorSubView={mentorSubView}
                        setMentorSubView={setMentorSubView}
                        menteesOfMentor={menteesOfMentor}
                        targetMenteeId={targetMenteeId}
                        setTargetMenteeId={setTargetMenteeId}
                        targetTitle={targetTitle}
                        setTargetTitle={setTargetTitle}
                        targetDescription={targetDescription}
                        setTargetDescription={setTargetDescription}
                        handleCreateTarget={handleCreateTarget}
                        setConfirmDeleteTarget={setConfirmDeleteTarget}
                        menteeTargets={props.menteeTargets.filter((t: any) => t.mentorId === props.employee.id)}
                        loadDetailedEmployeeData={props.loadDetailedEmployeeData}
                    />
                );
            case 'persetujuan':
                if (!hasApprovalRole) return null;
                return (
                    <Persetujuan
                        loggedInEmployee={props.employee}
                        weeklyReportSubmissions={props.weeklyReportSubmissions}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Persetujuan component uses a simpler signature
                        onReviewReport={props.onReviewReport as any} // Cast because this component is simpler
                        allUsersData={props.allUsersData}
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
                        {hasMentorRole && <TabButton label="Panel Mentor" icon={ShieldCheck} active={activeTab === 'panel-mentor'} onClick={() => setActiveTab('panel-mentor')} />}
                        {hasApprovalRole && <TabButton label="Persetujuan" icon={CheckSquare} active={activeTab === 'persetujuan'} onClick={() => setActiveTab('persetujuan')} />}
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