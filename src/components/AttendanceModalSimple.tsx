'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppDataStore } from '@/store/appDataStore';
import { submitAttendance } from '@/services/attendanceService';

interface AttendanceModalProps {
  isOpen: boolean;
  entityId: string | null;
  entityName: string | null;
  isLateEntry: boolean;
  onClose: () => void;
  onSubmit: (status: 'hadir' | 'tidak-hadir', reason: string | null, isLateEntry: boolean) => void;
}

const AttendanceModal: React.FC<AttendanceModalProps> = ({
  isOpen,
  entityId,
  entityName,
  isLateEntry,
  onClose,
  onSubmit
}) => {
  const { loggedInEmployee } = useAppDataStore();
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!entityId || !loggedInEmployee) return;

    try {
      // Submit to Supabase
      await submitAttendance(
        loggedInEmployee.id,
        entityId,
        isLateEntry ? 'hadir' : 'tidak-hadir',
        reason || null,
        isLateEntry
      );

      // Call parent callback
      onSubmit(isLateEntry ? 'hadir' : 'tidak-hadir', reason || null, isLateEntry);
      
      // Close modal and reset
      setReason('');
      onClose();
    } catch (error) {
      alert('Gagal menyimpan presensi. Silakan coba lagi.');
    }
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  if (!isOpen || !entityId) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-md border border-white/20">
        <h3 className="text-lg font-bold text-white mb-2">Konfirmasi</h3>
        <p className="text-blue-200 mb-4">{`Berikan alasan ${isLateEntry ? 'keterlambatan presensi' : 'ketidakhadiran'} untuk ${entityName}.`}</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full bg-white/10 border border-white/30 rounded-lg p-2 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
          placeholder={loggedInEmployee?.gender === 'Perempuan' ? "Contoh: Sakit, Dinas Luar, Haid" : "Contoh: Sakit, Dinas Luar"}
        />
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={handleClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
          <button 
            onClick={handleSubmit} 
            disabled={!reason.trim() && !isLateEntry} 
            className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AttendanceModal;