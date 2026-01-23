'use client';

import React, { useState, useMemo } from 'react';
import { type Employee, WeeklyReportSubmission, ToDoItem, DailyActivity, AuditLogEntry } from '../types';
import { PencilIcon, AcademicCapIcon, ShieldCheckIcon, CheckSquareIcon } from './Icons';
import { AktivitasPribadiView } from './AktivitasPribadi';
import MenteeGuidanceView from './MenteeGuidanceView';
import { MentorDashboard, type MentorDashboardView } from './MentorDashboard';
import Persetujuan from './Persetujuan';
import { getTodayLocalDateString } from '../utils/dateUtils';

interface AktivitasSayaProps {
    employee: Employee;
    dailyActivitiesConfig: DailyActivity[];
    onLogBookReading: (bookTitle: string, pagesRead: string, dateCompleted: string) => void;
    onLogManualActivity: (activityId: string, date: string) => void;
    onDeleteReadingHistory: (type: 'book' | 'quran', id: string, date: string) => void;
    onUpdateTodoList: (userId: string, todoList: ToDoItem[]) => void;
    submissions: WeeklyReportSubmission[];
    allUsersData: Record<string, { employee: Employee; attendance: any; history: any }>;
    weeklyReportSubmissions: WeeklyReportSubmission[];
    onNavigateToReport: (monthKey: string) => void;
    tadarusRequests: any[];
    onTadarusRequest: (data: any) => void;
    tadarusSessions: any[];
    onMenteeAttendSession: (sessionId: string) => void;
    missedPrayerRequests: any[];
    onCreateMissedPrayerRequest: (data: any) => void;
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
}

const TabButton: React.FC<{
    label: string;
    icon: React.FC<{ className: string }>;
    active: boolean;
    onClick: () => void;
}> = ({ label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`grow flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-4 text-sm font-semibold border-b-2 transition-colors duration-200
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
    const [activeTab, setActiveTab] = useState<'aktivitas-pribadi' | 'bimbingan' | 'panel-mentor' | 'persetujuan'>('aktivitas-pribadi');

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
                        onUpdateTodoList={props.onUpdateTodoList}
                        submissions={props.submissions}
                    />
                );
            case 'bimbingan':
                return (
                    <MenteeGuidanceView
                        employee={props.employee}
                        submissions={props.submissions}
                        onNavigateToReport={props.onNavigateToReport}
                        tadarusRequests={props.tadarusRequests}
                        onTadarusRequest={props.onTadarusRequest}
                        tadarusSessions={props.tadarusSessions}
                        onMenteeAttendSession={props.onMenteeAttendSession}
                        missedPrayerRequests={props.missedPrayerRequests}
                        onCreateMissedPrayerRequest={props.onCreateMissedPrayerRequest}
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
                        <TabButton label="Aktivitas Pribadi" icon={PencilIcon} active={activeTab === 'aktivitas-pribadi'} onClick={() => setActiveTab('aktivitas-pribadi')} />
                        <TabButton label="Bimbingan Saya" icon={AcademicCapIcon} active={activeTab === 'bimbingan'} onClick={() => setActiveTab('bimbingan')} />
                        {hasMentorRole && <TabButton label="Panel Mentor" icon={ShieldCheckIcon} active={activeTab === 'panel-mentor'} onClick={() => setActiveTab('panel-mentor')} />}
                        {hasApprovalRole && <TabButton label="Persetujuan" icon={CheckSquareIcon} active={activeTab === 'persetujuan'} onClick={() => setActiveTab('persetujuan')} />}
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