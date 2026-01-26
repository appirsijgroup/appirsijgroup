import React, { useMemo, useState, Fragment, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { type Employee, TadarusSession, TadarusRequest, MissedPrayerRequest, AuditLogEntry, type MonthlyReportSubmission, MenteeTarget, Attendance, type DailyActivity } from '../types';
import {
    ArrowLeft,
    CheckSquare,
    Square,
    CalendarDays,
    FileDown,
    FileSpreadsheet,
    BarChart3,
    Users,
    UserPlus,
    BookOpen,
    Tag,
    Trash2,
    Calendar,
    Bell
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { DAILY_ACTIVITIES } from '../data/monthlyActivities';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { generateOfficialPdf, ReportSection, TableConfig } from '../components/ReportGenerator';
import { useUIStore } from '@/store/store';
import UniversalPersetujuan from '../components/Persetujuan';

export type MentorDashboardView = 'overview' | 'mentees' | 'progress' | 'missed-requests' | 'laporan-bacaan' | 'persetujuan' | 'target' | 'sessions';

interface MentorDashboardProps {
    employee: Employee;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, any>; }>;
    onUpdateProfile: (userId: string, updates: Partial<Employee>) => Promise<boolean>;
    monthlyReportSubmissions: MonthlyReportSubmission[];
    onReviewReport: (submissionId: string, decision: 'approved' | 'rejected', notes: string | undefined, reviewerRole: 'mentor' | 'supervisor' | 'kaunit' | 'manager') => void;
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
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>;
    dailyActivitiesConfig: DailyActivity[];
}

// 🔥 CRITICAL FIX: Add this hook at the component level to pre-load data
export const useMenteeDataPreloader = (
    mentorSubView: MentorDashboardView,
    mentees: Employee[],
    loadDetailedEmployeeData: (employeeId: string, monthOrForce?: number | boolean, year?: number, force?: boolean) => Promise<void>
) => {
    useEffect(() => {
        const needsDetailedData = mentorSubView === 'progress' || mentorSubView === 'laporan-bacaan';

        if (needsDetailedData && loadDetailedEmployeeData && mentees.length > 0) {
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            console.log(`🔄 [MentorDashboard] Pre-loading detailed data for ${mentees.length} mentees (tab: ${mentorSubView}, month: ${currentMonth}/${currentYear})`);

            // Load data for all mentees in parallel
            const loadPromises = mentees.map(mentee => {
                console.log(`  ↳ Loading data for: ${mentee.name} (${mentee.id})`);
                return loadDetailedEmployeeData(mentee.id, currentMonth, currentYear).catch(err => {
                    console.error(`  ✗ Failed to load data for ${mentee.name}:`, err);
                });
            });

            Promise.all(loadPromises).then(() => {
                console.log(`✅ [MentorDashboard] All ${mentees.length} mentees data loaded successfully`);
            });
        }
    }, [mentorSubView, mentees.length, loadDetailedEmployeeData]);
};
