import React, { useState } from 'react';
import { type Employee, type DocumentSubmission } from '../types';
import { DocumentArrowUpIcon, LinkIcon } from './Icons';

interface DocumentSubmissionViewProps {
  employee: Employee;
  submissions: DocumentSubmission[];
  onSubmit: (submissionData: Omit<DocumentSubmission, 'id' | 'menteeId' | 'menteeName' | 'mentorId' | 'submittedAt' | 'status'>) => void;
}

const DocumentSubmissionView: React.FC<DocumentSubmissionViewProps> = ({ employee, submissions, onSubmit }) => {
    const [documentName, setDocumentName] = useState('');
    const [documentUrl, setDocumentUrl] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!documentName || !documentUrl) {
            setError('Nama dokumen dan URL/Tautan harus diisi.');
            return;
        }

        try {
            // Basic URL validation
            new URL(documentUrl);
        } catch (_) {
            setError('URL/Tautan yang dimasukkan tidak valid.');
            return;
        }

        onSubmit({ documentName, documentUrl, notes });
        setDocumentName('');
        setDocumentUrl('');
        setNotes('');
        setSuccess('Dokumen berhasil diajukan untuk persetujuan!');
        setTimeout(() => setSuccess(''), 5000);
    };

    const getStatusChip = (status: DocumentSubmission['status']) => {
        switch (status) {
            case 'pending':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-300">Menunggu Persetujuan</span>;
            case 'approved':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-500/20 text-green-300">Disetujui</span>;
            case 'rejected':
                return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-300">Ditolak</span>;
            default:
                return null;
        }
    };

    return (
        <div className="bg-white/10 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/20 space-y-8">
            <div className="text-center">
                <DocumentArrowUpIcon className="w-16 h-16 mx-auto text-teal-300 mb-2"/>
                <h2 className="text-3xl font-bold text-white">Pengajuan Dokumen</h2>
                <p className="text-blue-200 mt-1">Ajukan dokumen untuk ditinjau oleh mentor Anda.</p>
            </div>

            {/* Submission Form */}
            <div className="bg-black/20 p-6 rounded-lg border border-white/10">
                <h3 className="text-xl font-semibold text-white mb-4">Formulir Pengajuan Baru</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="docName" className="block text-sm font-medium text-blue-200 mb-1">Nama Dokumen</label>
                        <input
                            id="docName"
                            type="text"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            placeholder="Contoh: Laporan Kinerja Bulanan"
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        />
                    </div>
                     <div>
                        <label htmlFor="docUrl" className="block text-sm font-medium text-blue-200 mb-1">URL/Tautan Dokumen</label>
                        <input
                            id="docUrl"
                            type="url"
                            value={documentUrl}
                            onChange={(e) => setDocumentUrl(e.target.value)}
                            placeholder="https://docs.google.com/document/..."
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        />
                         <p className="text-xs text-gray-400 mt-1">Pastikan tautan dapat diakses oleh mentor Anda.</p>
                    </div>
                     <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-blue-200 mb-1">Catatan (Opsional)</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Tambahkan catatan singkat untuk mentor..."
                            className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white"
                        ></textarea>
                    </div>

                    {error && <p className="p-3 bg-red-500/30 border border-red-500 text-red-200 rounded-lg text-sm">{error}</p>}
                    {success && <p className="p-3 bg-green-500/30 border border-green-500 text-green-200 rounded-lg text-sm">{success}</p>}

                    <div className="text-right">
                        <button type="submit" className="bg-teal-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-teal-400 transition-all duration-300">
                            Ajukan Dokumen
                        </button>
                    </div>
                </form>
            </div>

            {/* Submission History */}
            <div>
                 <h3 className="text-xl font-semibold text-white mb-4">Riwayat Pengajuan Anda</h3>
                 {submissions.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-white/20">
                        <table className="min-w-full text-sm text-left text-white">
                            <thead className="bg-white/10 text-xs uppercase text-blue-200">
                                <tr>
                                    <th scope="col" className="px-4 py-3">Dokumen</th>
                                    <th scope="col" className="px-4 py-3">Tanggal Pengajuan</th>
                                    <th scope="col" className="px-4 py-3">Status</th>
                                    <th scope="col" className="px-4 py-3">Catatan Mentor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {submissions.map(sub => (
                                    <tr key={sub.id} className="border-b border-gray-700 hover:bg-white/10">
                                        <td className="px-4 py-3">
                                             <a href={sub.documentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-teal-300 hover:underline font-semibold">
                                                <LinkIcon className="w-4 h-4"/>
                                                {sub.documentName}
                                            </a>
                                            <p className="text-xs text-gray-400 italic mt-1 truncate">{sub.notes}</p>
                                        </td>
                                        <td className="px-4 py-3">{new Date(sub.submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
                                        <td className="px-4 py-3">{getStatusChip(sub.status)}</td>
                                        <td className="px-4 py-3 text-yellow-200 italic">{sub.mentorNotes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 ) : (
                    <div className="text-center py-10 bg-black/20 rounded-lg">
                        <p className="text-lg text-blue-200">Anda belum pernah mengajukan dokumen.</p>
                        <p className="text-sm text-gray-400 mt-2">Gunakan formulir di atas untuk memulai.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};

export default DocumentSubmissionView;