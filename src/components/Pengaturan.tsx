

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { Employee, Attendance, SunnahIbadah, Activity, FunctionalRole, DailyActivity, Hospital } from '../types';
import { User, Camera, Users, ShieldCheck, Trash2, Sparkles, Upload, ChevronDown, Check, X, Building2, Tag, GraduationCap, Eye, BadgeCheck, Info, FileText, Pen, Lock } from 'lucide-react';
import RapotView from './RapotView';
import SignaturePad, { type SignaturePadRef } from './SignaturePad';
import { validatePassword, isPasswordValid, type PasswordValidationResult } from './passwordUtils';
import PasswordInput from './PasswordInput';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';
import { uploadSignature, deleteSignature } from '@/services/signatureService';
import { uploadProfilePicture, deleteProfilePicture } from '@/services/profilePictureService';
import { dataURLToBlob } from '@/utils/imageUtils';
import { isAnyAdmin } from '@/lib/rolePermissions';

interface ProfileProps {
    employee: Employee;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance> }>;
    sunnahIbadahList: SunnahIbadah[];
    activities: Activity[];
    dailyActivitiesConfig: DailyActivity[];
    hospitals: Hospital[];
    onUpdateProfile: (userId: string, updates: Partial<Omit<Employee, 'id' | 'role' | 'password'>>) => Promise<boolean>;
    onChangePassword: (id: string, oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
    addToast: (message: string, type: 'success' | 'error') => void;
}

const getInitials = (name: string): string => {
    if (!name) return '?';
    const words = name.replace(/[^a-zA-Z\s]/g, "").trim().split(/\s+/);
    if (words.length === 0 || words[0] === "") return '?';
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
};

const SettingsSection: React.FC<{
    title: string;
    icon: React.FC<{ className: string }>;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}> = ({ title, icon: Icon, isOpen, onToggle, children }) => {
    return (
        <div className="bg-black/20 rounded-2xl border border-white/10 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex justify-between items-center p-3 sm:p-4 md:p-5 hover:bg-white/5 text-left gap-2"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-300 shrink-0" />
                    <span className="font-semibold text-base sm:text-lg text-white truncate">{title}</span>
                </div>
                <ChevronDown className={`w-5 h-5 sm:w-6 sm:h-6 transform transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 sm:p-4 md:p-5 border-t border-white/10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const SignatureModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (signatureDataUrl: string | null) => void | Promise<void>;
    currentSignature: string | null | undefined;
}> = ({ isOpen, onClose, onSave, currentSignature }) => {
    type Tab = 'draw' | 'upload';
    const [activeTab, setActiveTab] = useState<Tab>('draw');
    const signaturePadRef = useRef<SignaturePadRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setUploadedImage(null);
            setActiveTab('draw');
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (activeTab === 'draw') {
            const signature = signaturePadRef.current?.getSignature();
            await onSave(signature || null);
        } else {
            await onSave(uploadedImage);
        }
        onClose();
    };

    const handleDelete = async () => {
        await onSave(null);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60">
            <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Kelola Tanda Tangan</h3>
                <div className="flex border-b border-white/10 mb-4">
                    <button onClick={() => setActiveTab('draw')} className={`py-2 px-4 font-semibold ${activeTab === 'draw' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-gray-400'}`}>Gambar</button>
                    <button onClick={() => setActiveTab('upload')} className={`py-2 px-4 font-semibold ${activeTab === 'upload' ? 'border-b-2 border-teal-400 text-teal-300' : 'text-gray-400'}`}>Unggah</button>
                </div>
                {activeTab === 'draw' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-blue-200">Gunakan mouse atau jari Anda untuk menggambar tanda tangan di area bawah.</p>
                        <SignaturePad ref={signaturePadRef} width={450} height={200} />
                        <button onClick={() => signaturePadRef.current?.clear()} className="px-4 py-2 text-sm rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Bersihkan</button>
                    </div>
                )}
                {activeTab === 'upload' && (
                    <div className="flex flex-col items-center gap-4">
                        <p className="text-sm text-blue-200">Pilih file gambar tanda tangan (disarankan format PNG dengan latar transparan).</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                        <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold flex items-center gap-2">
                            <Upload className="w-5 h-5" /> Pilih File
                        </button>
                        {uploadedImage && <img src={uploadedImage} alt="Preview" className="max-h-40 border-2 border-dashed border-gray-500 rounded-md p-2 bg-white" />}
                    </div>
                )}
                <div className="mt-6 flex justify-between items-center">
                    <button onClick={handleDelete} className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-500 font-semibold disabled:bg-gray-500" disabled={!currentSignature}>Hapus Tanda Tangan</button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold">Batal</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 font-semibold">Simpan</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RoleEmblem: React.FC<{ icon: React.FC<{ className: string }>, label: string, colorClasses: string }> = ({ icon: Icon, label, colorClasses }) => (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${colorClasses}`}>
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </div>
);

const Profile: React.FC<ProfileProps> = ({ employee, allUsersData, sunnahIbadahList, activities, dailyActivitiesConfig, hospitals, onUpdateProfile, onChangePassword, addToast }) => {
    const [openSection, setOpenSection] = useState<'profil' | 'keamanan' | 'appi' | 'signature' | null>(employee.mustChangePassword ? 'keamanan' : 'profil');

    // States for Profile Form
    const [email, setEmail] = useState(employee.email);
    const [profilePicture, setProfilePicture] = useState<string | null>(employee.profilePicture);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photoMenuRef = useRef<HTMLDivElement>(null);
    const photoButtonRef = useRef<HTMLButtonElement>(null);

    // States for Security Form
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordValidation, setPasswordValidation] = useState<PasswordValidationResult | null>(null);

    // States for UI control
    const [isPhotoMenuOpen, setIsPhotoMenuOpen] = useState(false);
    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

    // Logic for verified badge
    const shouldShowVerifiedBadge = useMemo(() => {
        if (!employee) return false;
        const isAdmin = isAnyAdmin(employee);
        const hasHighFunctionalRole = employee.functionalRoles?.some(role => ['BPH', 'DIREKSI'].includes(role));
        const isGuidanceLeader = employee.canBeMentor || employee.canBeSupervisor || employee.canBeKaUnit;
        return isAdmin || hasHighFunctionalRole || isGuidanceLeader;
    }, [employee]);

    // Role display configuration
    const { functionalRolesToDisplay, systemRolesToDisplay } = useMemo(() => {
        type DisplayConfig = { label: string, icon: React.FC<{ className: string }>, colorClasses: string };
        const functionalRoleMap: Record<FunctionalRole, DisplayConfig> = {
            'BPH': { label: 'BPH', icon: Building2, colorClasses: 'bg-indigo-500/20 text-indigo-300' },
            'DIREKSI': { label: 'Direksi', icon: Building2, colorClasses: 'bg-indigo-500/20 text-indigo-300' },
            'MANAJER': { label: 'Manajer', icon: Users, colorClasses: 'bg-blue-500/20 text-blue-300' },
            'KEPALA URUSAN': { label: 'Kepala Urusan', icon: Tag, colorClasses: 'bg-green-500/20 text-green-300' },
            'KEPALA RUANGAN': { label: 'Kepala Ruangan', icon: Tag, colorClasses: 'bg-green-500/20 text-green-300' },
        };

        const functionalRoles = (employee.functionalRoles || [])
            .map(role => functionalRoleMap[role])
            .filter(Boolean);

        const systemRoles: DisplayConfig[] = [];
        if (employee.role === 'super-admin') {
            systemRoles.push({ label: 'Super Admin', icon: ShieldCheck, colorClasses: 'bg-purple-500/20 text-purple-300' });
        } else if (employee.role === 'admin') {
            systemRoles.push({ label: 'Admin', icon: ShieldCheck, colorClasses: 'bg-sky-500/20 text-sky-300' });
        }

        if (employee.canBeMentor) {
            systemRoles.push({ label: 'Mentor', icon: GraduationCap, colorClasses: 'bg-orange-500/20 text-orange-300' });
        }
        if (employee.canBeSupervisor) {
            systemRoles.push({ label: 'Supervisor', icon: Eye, colorClasses: 'bg-cyan-500/20 text-cyan-300' });
        }
        if (employee.canBeKaUnit) {
            systemRoles.push({ label: 'Ka. Unit', icon: Tag, colorClasses: 'bg-lime-500/20 text-lime-300' });
        }

        return { functionalRolesToDisplay: functionalRoles, systemRolesToDisplay: systemRoles };
    }, [employee]);

    useEffect(() => {
        setEmail(employee.email);
        setProfilePicture(employee.profilePicture);
    }, [employee]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                photoMenuRef.current && !photoMenuRef.current.contains(event.target as Node) &&
                photoButtonRef.current && !photoButtonRef.current.contains(event.target as Node)
            ) {
                setIsPhotoMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                addToast('Mengunggah foto profil...', 'success');
                const imageUrl = await uploadProfilePicture(file, employee.id);
                setProfilePicture(imageUrl);
                await onUpdateProfile(employee.id, { profilePicture: imageUrl });
                addToast('Foto profil berhasil diperbarui!', 'success');
            } catch (error) {
                console.error('Failed to upload profile picture:', error);
                addToast('Gagal mengunggah foto profil.', 'error');
            }
        }
    };

    const handleRemovePicture = async () => {
        try {
            await deleteProfilePicture(employee.id);
            setProfilePicture(null);
            await onUpdateProfile(employee.id, { profilePicture: null });
            if (fileInputRef.current) fileInputRef.current.value = "";
            addToast('Foto profil berhasil dihapus.', 'success');
        } catch (error) {
            addToast('Gagal menghapus foto profil.', 'error');
        }
    };

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isSuccess = await onUpdateProfile(employee.id, { email });

        if (isSuccess) {
            addToast('Profil berhasil diperbarui!', 'success');
        } else {
            addToast('Gagal memperbarui profil. Silakan coba lagi.', 'error');
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate new password format
        const validation = validatePassword(newPassword);
        if (!isPasswordValid(validation)) {
            addToast('Password baru tidak memenuhi semua syarat keamanan.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            addToast('Password baru dan konfirmasi tidak cocok.', 'error');
            return;
        }

        if (oldPassword === newPassword) {
            addToast('Password baru tidak boleh sama dengan password lama.', 'error');
            return;
        }

        // Call server-side API to change password
        const result = await onChangePassword(employee.id, oldPassword, newPassword);

        if (result.success) {
            if (employee.mustChangePassword) {
                onUpdateProfile(employee.id, { mustChangePassword: false });
            }
            addToast('Password berhasil diperbarui!', 'success');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setPasswordValidation(null);
        } else {
            addToast(result.error || 'Gagal memperbarui password. Silakan coba lagi.', 'error');
        }
    };

    const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pass = e.target.value;
        setNewPassword(pass);
        setPasswordValidation(validatePassword(pass));
    };



    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-1 space-y-8">
                {/* Profile Card */}
                <div className="bg-black/20 p-6 rounded-2xl shadow-lg border border-white/10 text-center">
                    <div className="relative w-32 h-32 mx-auto">
                        <button
                            ref={photoButtonRef}
                            type="button"
                            onClick={() => setIsPhotoMenuOpen(!isPhotoMenuOpen)}
                            className="group relative w-full h-full rounded-full bg-linear-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden border-4 border-white/20 shadow-lg ring-4 ring-teal-400/50"
                            aria-label="Opsi foto profil"
                        >
                            {profilePicture ? (
                                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover object-top" />
                            ) : (
                                <span>{getInitials(employee.name)}</span>
                            )}
                            <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                        {isPhotoMenuOpen && (
                            <div
                                ref={photoMenuRef}
                                className="absolute z-10 mt-2 left-1/2 -translate-x-1/2 w-48 origin-top-right bg-gray-700/90 backdrop-blur-sm rounded-md shadow-2xl border border-white/20 ring-1 ring-black ring-opacity-5"
                            >
                                <div className="py-1">
                                    <button onClick={() => { fileInputRef.current?.click(); setIsPhotoMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-600/80 rounded-t-md">
                                        <Camera className="w-5 h-5 mr-3" /> Ganti Foto
                                    </button>
                                    {profilePicture && (
                                        <button onClick={() => { handleRemovePicture(); setIsPhotoMenuOpen(false); }} className="flex items-center w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-600/80 rounded-b-md">
                                            <Trash2 className="w-5 h-5 mr-3" /> Hapus Foto
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-5 px-4">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white text-center truncate max-w-full" title={employee.name}>{employee.name}</h2>
                        {shouldShowVerifiedBadge && (
                            // FIX: Wrapped CheckBadgeIcon in a span with a title attribute to fix a prop type error.
                            <span title="Lencana Terverifikasi" className="shrink-0">
                                <BadgeCheck className="w-5 h-5 sm:w-6 sm:h-7 text-teal-400" />
                            </span>
                        )}
                    </div>
                    <p className="text-teal-300 font-medium text-base sm:text-lg text-center px-4">{employee.profession}</p>
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-left text-sm px-4">
                        <p className="wrap-break-word"><strong className="text-blue-200 w-20 inline-block shrink-0">NIP</strong>: <span className="font-mono break-all">{employee.id}</span></p>
                        <p className="wrap-break-word"><strong className="text-blue-200 w-20 inline-block shrink-0">Unit</strong>: <span className="break-all">{employee.unit}</span></p>
                        <p className="wrap-break-word"><strong className="text-blue-200 w-20 inline-block shrink-0">Bagian</strong>: <span className="break-all">{employee.bagian}</span></p>
                    </div>

                    {(functionalRolesToDisplay.length > 0 || systemRolesToDisplay.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-white/10 text-left">
                            <h3 className="font-semibold text-white mb-3">Peran & Jabatan</h3>
                            <div className="space-y-4">
                                {functionalRolesToDisplay.length > 0 && (
                                    <div>
                                        <h4 className="text-xs uppercase font-bold text-blue-200 mb-2">Jabatan Fungsional</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {functionalRolesToDisplay.map(role => <RoleEmblem key={role.label} {...role} />)}
                                        </div>
                                    </div>
                                )}
                                {systemRolesToDisplay.length > 0 && (
                                    <div>
                                        <h4 className="text-xs uppercase font-bold text-blue-200 mb-2">Peran Sistem & Kapabilitas</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {systemRolesToDisplay.map(role => <RoleEmblem key={role.label} {...role} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
                {employee.mustChangePassword && (
                    <div className="p-4 bg-yellow-500/20 border-l-4 border-yellow-400 text-yellow-200 rounded-r-lg shadow-lg animate-pulse flex items-start gap-3">
                        <Info className="w-6 h-6 shrink-0 text-yellow-300 mt-0.5" />
                        <div>
                            <p className="font-bold">Perbarui Password Default</p>
                            <p className="text-sm mt-1">Wajib ganti password di bagian "Keamanan Akun"</p>
                        </div>
                    </div>
                )}
                <SettingsSection title="Edit Informasi Profil" icon={User} isOpen={openSection === 'profil'} onToggle={() => setOpenSection(openSection === 'profil' ? null : 'profil')}>
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-1">Alamat Email</label>
                            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contoh@email.com" className="w-full bg-white/10 border border-white/30 rounded-lg p-3 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white" />
                        </div>
                        <div className="text-left sm:text-right pt-2">
                            <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-blue-500 transition-all duration-300 text-sm sm:text-base">
                                Simpan Perubahan
                            </button>
                        </div>
                    </form>
                </SettingsSection>

                <SettingsSection title="Keamanan Akun" icon={ShieldCheck} isOpen={openSection === 'keamanan'} onToggle={() => setOpenSection(openSection === 'keamanan' ? null : 'keamanan')}>
                    <div className="space-y-8">
                        <form onSubmit={handlePasswordSubmit} className="space-y-6">
                            <h3 className="text-lg font-semibold text-teal-300">Ubah Password</h3>
                            <PasswordInput
                                id="oldPassword"
                                label="Password Lama"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                required
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <PasswordInput
                                    id="newPassword"
                                    label="Password Baru"
                                    value={newPassword}
                                    onChange={handleNewPasswordChange}
                                    required
                                />
                                <PasswordInput
                                    id="confirmPassword"
                                    label="Konfirmasi Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <PasswordStrengthIndicator validationResult={passwordValidation} />

                            <div className="text-left sm:text-right pt-2">
                                <button type="submit" className="w-full sm:w-auto bg-teal-500 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-teal-400 transition-all duration-300 text-sm sm:text-base">
                                    Ubah Password
                                </button>
                            </div>
                        </form>
                    </div>
                </SettingsSection>

                <SettingsSection title="Tanda Tangan Digital" icon={Pen} isOpen={openSection === 'signature'} onToggle={() => setOpenSection(openSection === 'signature' ? null : 'signature')}>
                    <div className="space-y-4">
                        <p className="text-blue-200 text-sm">
                            Tanda tangan ini akan digunakan untuk keperluan validasi dokumen digital dan laporan.
                        </p>
                        <div className="bg-black/20 p-3 sm:p-4 rounded-lg border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center justify-center">
                                {employee.signature ? (
                                    <img src={employee.signature} alt="Tanda Tangan" className="h-12 sm:h-16 bg-white rounded-md p-2" />
                                ) : (
                                    <p className="text-gray-400 text-sm italic">Belum ada tanda tangan.</p>
                                )}
                            </div>
                            <button
                                onClick={() => setIsSignatureModalOpen(true)}
                                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-blue-500/20"
                            >
                                {employee.signature ? 'Ubah' : 'Buat'} Tanda Tangan
                            </button>
                        </div>
                    </div>
                </SettingsSection>
            </div>

            {/* Full Width APPI Section at the Bottom */}
            <div className="lg:col-span-3 mt-4">
                <SettingsSection title="Transkrip Nilai (APPI)" icon={FileText} isOpen={openSection === 'appi'} onToggle={() => setOpenSection(openSection === 'appi' ? null : 'appi')}>
                    <div className="bg-black/40 rounded-xl border border-white/5 overflow-hidden">
                        <RapotView
                            employee={employee}
                            dailyActivitiesConfig={dailyActivitiesConfig}
                            allUsersData={allUsersData as any}
                            hospitals={hospitals}
                        />
                    </div>
                </SettingsSection>
            </div>
            <SignatureModal
                isOpen={isSignatureModalOpen}
                onClose={() => setIsSignatureModalOpen(false)}
                onSave={async (signature) => {
                    try {
                        let signatureUrl: string | null = null;

                        if (signature) {
                            // Convert data URL to File object using utility to avoid CSP fetch issues
                            const blob = dataURLToBlob(signature);
                            const file = new File([blob], 'signature.png', { type: 'image/png' });

                            // Upload to Supabase Storage
                            addToast('Mengupload tanda tangan...', 'success');
                            signatureUrl = await uploadSignature(file, employee.id);
                        } else {
                            // Delete signature from storage
                            await deleteSignature(employee.id);
                        }

                        // Update profile with URL (or null if deleted)
                        const isSuccess = await onUpdateProfile(employee.id, { signature: signatureUrl });
                        if (isSuccess) {
                            addToast(signature ? 'Tanda tangan berhasil disimpan!' : 'Tanda tangan berhasil dihapus!', 'success');
                        } else {
                            addToast('Gagal menyimpan tanda tangan.', 'error');
                        }
                    } catch (error) {
                        addToast('Gagal mengupload tanda tangan.', 'error');
                    }
                }}
                currentSignature={employee.signature}
            />
        </div>
    );
};

export default Profile;
