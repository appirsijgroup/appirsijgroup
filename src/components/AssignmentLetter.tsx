import React from 'react';
import { createPortal } from 'react-dom';
import { type Employee } from '../types';
import { XIcon, MosqueIcon } from './Icons';

interface AssignmentLetterProps {
    recipient: Employee;
    roleName: 'Mentor' | 'Supervisor' | 'Manajer' | 'Kepala Unit';
    assignmentType: 'assignment' | 'removal' | 'change' | 'designation' | 'revocation';
    assigneeName?: string;
    previousAssigneeName?: string;
    onClose: () => void;
    notificationTimestamp: number;
}

const getRoleSpecificText = (roleName: AssignmentLetterProps['roleName']) => {
    if (roleName === 'Mentor') {
        return {
            title: "Penugasan Bimbingan",
            purpose: "mendukung pengembangan spiritual dan profesional Anda",
            of: "Mentor",
        };
    }
    return {
        title: "Persetujuan Laporan Mutaba'ah",
        purpose: `memastikan kelancaran alur persetujuan laporan kinerja APPI Anda oleh ${roleName}`,
        of: roleName,
    };
};

const AssignmentLetter: React.FC<AssignmentLetterProps> = ({ recipient, roleName, assignmentType, assigneeName, previousAssigneeName, onClose, notificationTimestamp }) => {
    const dateOfLetter = new Date(notificationTimestamp);
    const today = dateOfLetter.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // 🔥 FIX: Handle gender with case-insensitive comparison and fallback
    const normalizedGender = recipient.gender?.toLowerCase().trim();
    const salutation = normalizedGender === 'laki-laki' || normalizedGender === 'lk' || normalizedGender === 'pria' || normalizedGender === 'male'
        ? 'Bapak'
        : normalizedGender === 'perempuan' || normalizedGender === 'pr' || normalizedGender === 'wanita' || normalizedGender === 'female'
            ? 'Ibu'
            : 'Bapak/Ibu'; // Fallback if gender is unclear

    const roleText = getRoleSpecificText(roleName);
    let subject = "";
    let bodyParagraphs: React.ReactNode[] = [];

    if (assignmentType === 'designation') {
        subject = `Surat Penugasan Sebagai ${roleName}`;
        bodyParagraphs = [
            `Dengan hormat,`,
            `Sehubungan dengan kebutuhan pengembangan dan pembinaan di lingkungan Rumah Sakit Islam Jakarta Group, kami memberitahukan bahwa terhitung mulai tanggal ${today}, Anda diberikan amanah dan penugasan sebagai:`,
            <div key="details" className="my-4 p-4 bg-slate-100 rounded-lg border border-slate-200 text-center">
                <p className="font-bold text-xl text-slate-800">{roleName}</p>
            </div>,
            `Penugasan ini merupakan bentuk kepercayaan manajemen terhadap kompetensi dan dedikasi yang Anda miliki. Kami berharap Anda dapat menjalankan amanah ini dengan sebaik-baiknya untuk kemajuan bersama.`,
            `Demikian surat penugasan ini kami sampaikan. Atas perhatian dan kesediaan Anda, kami ucapkan terima kasih.`
        ];
    } else if (assignmentType === 'revocation') {
        subject = `Pemberitahuan Pencabutan Penugasan ${roleName}`;
        bodyParagraphs = [
            `Dengan hormat,`,
            `Melalui surat ini, kami memberitahukan bahwa terhitung mulai tanggal ${today}, penugasan Anda sebagai ${roleName} telah berakhir.`,
            `Manajemen mengucapkan terima kasih yang sebesar-besarnya atas kontribusi dan dedikasi yang telah Anda berikan selama menjalankan amanah tersebut.`,
            `Semoga pengalaman yang didapat menjadi bekal berharga untuk kontribusi Anda selanjutnya di lingkungan Rumah Sakit Islam Jakarta Group.`,
            `Demikian surat pemberitahuan ini kami sampaikan. Atas perhatiannya, kami ucapkan terima kasih.`
        ];
    } else if (assignmentType === 'assignment') {
        subject = `Pemberitahuan Penugasan ${roleName}`;
        bodyParagraphs = [
            `Dengan hormat,`,
            `Melalui surat ini, kami memberitahukan bahwa terhitung mulai tanggal ${today}, ${roleName === 'Mentor' ? 'Anda akan mendapatkan bimbingan dari' : `persetujuan laporan mutaba'ah Anda akan ditinjau oleh`} ${roleName} berikut:`,
            <div key="details" className="my-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                <p><strong>Nama:</strong> {assigneeName}</p>
                <p><strong>Jabatan:</strong> {roleName}</p>
            </div>,
            `Kami berharap penugasan ini dapat ${roleText.purpose}.`,
            `Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`
        ];
    } else if (assignmentType === 'removal') {
        subject = `Pemberitahuan Pemberhentian ${roleText.title}`;
        bodyParagraphs = [
            `Dengan hormat,`,
            `Melalui surat ini, kami memberitahukan bahwa terhitung mulai tanggal ${today}, penugasan Anda di bawah ${roleText.of} (${salutation} ${previousAssigneeName}) telah berakhir.`,
            `Informasi mengenai penugasan ${roleName} yang baru akan diinformasikan lebih lanjut.`,
            `Kami mengucapkan terima kasih atas kerjasama yang telah terjalin.`,
            `Demikian surat pemberitahuan ini kami sampaikan. Atas perhatiannya, kami ucapkan terima kasih.`
        ];
    } else { // 'change'
        subject = `Pemberitahuan Perubahan ${roleName}`;
        bodyParagraphs = [
            `Dengan hormat,`,
            `Melalui surat ini, kami memberitahukan adanya perubahan ${roleName} untuk Anda, terhitung mulai tanggal ${today}, dengan tujuan untuk ${roleText.purpose}.`,
            <div key="details" className="my-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                <p><strong>{roleName} Sebelumnya:</strong> {previousAssigneeName}</p>
                <p><strong>{roleName} Baru:</strong> {assigneeName}</p>
            </div>,
            `Kami berharap perubahan ini dapat membawa dampak positif bagi kinerja dan pengembangan Anda.`,
            `Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.`
        ];
    }

    return createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-60 animate-fade-in">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-2xl border border-white/20 animate-pop-in flex flex-col h-[90vh]">
                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-lg font-bold text-white">Surat Pemberitahuan</h3>
                </div>
                <div className="bg-slate-50 text-slate-800 p-8 rounded-lg overflow-y-auto grow">
                    <div className="flex items-start justify-between pb-4 border-b-2 border-slate-700">
                        <div className="text-left">
                            <h4 className="text-xl font-bold text-slate-900">SURAT PEMBERITAHUAN</h4>
                            <p className="text-sm font-semibold text-slate-500">APLIKASI PERILAKU PELAYANAN ISLAMI</p>
                        </div>
                        <div className="text-center">
                            <MosqueIcon className="w-10 h-10 text-teal-600 mx-auto" />
                            <p className="text-xs font-bold text-teal-700 mt-1">RSIJ GROUP</p>
                        </div>
                    </div>
                    <div className="mt-8 text-sm">
                        <p className="mb-4">
                            <strong>Kepada Yth.</strong><br />
                            {salutation} {recipient.name}<br />
                            NIP. {recipient.id}<br />
                            di Tempat
                        </p>
                        <p className="font-bold mb-6">Perihal: {subject}</p>

                        <div className="space-y-4 leading-relaxed">
                            {bodyParagraphs.map((p, i) => (
                                typeof p === 'string' ? <p key={i}>{p}</p> : <div key={i}>{p}</div>
                            ))}
                        </div>

                        <div className="mt-12 flex justify-end">
                            <div className="text-center">
                                <p>{today}</p>
                                <p className="mb-16">Hormat kami,</p>
                                <p className="font-bold underline">Manajemen RSIJ Group</p>
                                <p className="text-xs">Bagian SDM</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-4 text-right shrink-0">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold text-white">Tutup</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AssignmentLetter;