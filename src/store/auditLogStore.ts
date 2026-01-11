import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuditLogEntry } from '@/types';

interface AuditLogState {
    auditLog: AuditLogEntry[];
    logAudit: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
}

export const useAuditLogStore = create<AuditLogState>()(
    persist(
        (set) => ({
            auditLog: [],
            logAudit: (entry) => {
                const timestamp = Date.now();
                const newEntry: AuditLogEntry = {
                    ...entry,
                    id: timestamp.toString(),
                    timestamp,
                };
                set((state) => ({ auditLog: [newEntry, ...state.auditLog] }));
            },
        }),
        {
            name: 'audit-log-storage',
        }
    )
);
