import React, { useState, useEffect, useRef, useMemo } from 'react';
import { type ChatMessage, type AICommand, type Employee, type Activity, type MenteeData, DailyPrayer, Surah, View, PrayerGuide, Prayer, Attendance } from '../types';
import { getAiResponseStream } from '../services/geminiService';
import { UserIcon, AcademicCapIcon, SendIcon, TrashIcon, XIcon, MicrophoneIcon } from '../components/Icons';
import { DAILY_ACTIVITIES } from './monthlyActivities';
import { isAnyAdmin } from '@/lib/rolePermissions';

interface MessageRendererProps {
    text: string;
    navLinkMap: Record<string, View>;
    surahList: Surah[];
    onNavigate: (command: AICommand) => void;
}

const MessageRenderer: React.FC<MessageRendererProps> = ({ text, navLinkMap, surahList, onNavigate }) => {
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\])/g).filter(part => part);

    const handleLinkClick = (part: string) => {
        const label = part.slice(1, -1).trim();
        const sanitizeForComparison = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Match "Surah Name: Ayah" format
        const surahAyahMatch = label.match(/([\w\s'-]+):\s*(\d+)/);
        if (surahAyahMatch) {
            const surahName = surahAyahMatch[1].trim();
            const ayahNumber = parseInt(surahAyahMatch[2], 10);
            const sanitizedSurahName = sanitizeForComparison(surahName);
            const surah = surahList.find(s => sanitizeForComparison(s.namaLatin) === sanitizedSurahName);
            if (surah) {
                onNavigate({ command: 'navigateToView', view: 'alquran', surahNumber: surah.nomor, ayahNumber });
                return; // Matched, so we exit.
            }
        }
        
        // Match a direct link to a menu view
        const view = navLinkMap[label];
        if (view) {
            onNavigate({ command: 'navigateToView', view });
            return;
        }

        // Match just a surah name
        const sanitizedLabel = sanitizeForComparison(label);
        const surah = surahList.find(s => sanitizeForComparison(s.namaLatin) === sanitizedLabel);
        if (surah) {
            onNavigate({ command: 'navigateToView', view: 'alquran', surahNumber: surah.nomor, ayahNumber: 1 });
            return;
        }

        // Fallback: If it's not a known view or surah, treat it as a search query for Panduan & Doa.
        onNavigate({
            command: 'navigateToView',
            view: 'panduan-doa',
            query: label,
        });
    };

    return (
        <p className="whitespace-pre-wrap leading-relaxed">
            {parts.map((part, index) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={index}>{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('[') && part.endsWith(']')) {
                    const label = part.slice(1, -1);
                    return (
                        <button
                            key={index}
                            onClick={() => handleLinkClick(part)}
                            className="inline-block bg-teal-500/80 hover:bg-teal-500 text-white font-semibold py-1 px-2 rounded-md mx-1 transition-colors text-sm"
                        >
                            {label}
                        </button>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </p>
    );
};

interface VirtualMentorProps {
    employee: Employee;
    upcomingActivities: Activity[];
    onExecuteCommand: (command: AICommand) => void;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    menteesData?: MenteeData[];
    userMonthlyActivities: Employee['monthlyActivities'];
    surahList: Surah[];
    kumpulanDoa: DailyPrayer[];
    prayerGuides: PrayerGuide[];
    navLinkMap: Record<string, View>;
    onClose: () => void;
    allUsersData: Record<string, { employee: Employee; attendance: Attendance; history: Record<string, Attendance>; }>;
    allPrayers: Prayer[];
    addToast: (message: string, type: 'success' | 'error') => void;
}

const VirtualMentor: React.FC<VirtualMentorProps> = ({ employee, upcomingActivities, onExecuteCommand, messages, setMessages, menteesData, userMonthlyActivities, surahList, kumpulanDoa, prayerGuides, navLinkMap, onClose, allUsersData, allPrayers, addToast }) => {
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);

     useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false; // Stop automatically after a pause
            recognition.lang = 'id-ID';
            recognition.interimResults = true; // Enable real-time feedback
            
            recognition.onresult = (event: any) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setUserInput(transcript);
            };
            
            recognition.onerror = (event: any) => {
                let errorMessage = 'Terjadi kesalahan pada pengenalan suara.';
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    errorMessage = 'Izin mikrofon ditolak. Aktifkan di pengaturan browser Anda.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'Tidak ada suara yang terdeteksi.';
                }
                addToast(errorMessage, 'error');
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            recognitionRef.current?.stop();
        };
    }, [addToast]);

    const handleMicClick = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            if (recognitionRef.current) {
                try {
                    setUserInput(''); // Clear input before starting
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) {
                    addToast("Gagal memulai pengenalan suara. Periksa izin mikrofon.", 'error');
                }
            } else {
                addToast('Pengenalan suara tidak didukung di browser Anda.', 'error');
            }
        }
    };

    const systemInstruction = useMemo(() => {
        const today = new Date();
        const todayString = today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        const currentMonthName = today.toLocaleDateString('id-ID', { month: 'long' });
        const currentYear = today.getFullYear();
        const monthKey = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        const activitiesList = upcomingActivities.length > 0
            ? upcomingActivities.map(a => `- Nama: "${a.name}", Tanggal: ${a.date}, Waktu: ${a.startTime}, Status: ${a.status || 'scheduled'}, ID: ${a.id}`).join('\n')
            : 'Tidak ada kegiatan terjadwal.';
        
        const allDailyActivitiesList = DAILY_ACTIVITIES
            .map(a => `- "${a.title}" (gunakan id: ${a.id})`)
            .join('\n');

        let roleContext = 'Anda adalah seorang Karyawan.';
        if (isAnyAdmin(employee)) { // 🔥 NOW INCLUDES OWNER!
            roleContext = 'Anda adalah seorang Admin. Saat membuat jadwal, Anda dapat berasumsi itu untuk publik kecuali ditentukan lain.';
        } else if (employee.canBeMentor) {
            roleContext = 'Anda adalah seorang Mentor. Saat membuat jadwal, Anda dapat menawarkannya sebagai sesi bimbingan atau untuk publik.';
        }

        const currentMonthProgress = userMonthlyActivities?.[monthKey] || {};
        const progressSummary = DAILY_ACTIVITIES.map(activity => {
            const count = Object.values(currentMonthProgress).reduce((dayCount, dailyProgress) => {
                return dayCount + (dailyProgress[activity.id] ? 1 : 0);
            }, 0);
            return {
                aktivitas: activity.title,
                capaian: count,
                target: activity.monthlyTarget
            };
        });
        
        const userPerformanceSection = `
--- ANALISIS KINERJA PRIBADI PENGGUNA ---
Anda memiliki akses ke data progres Lembar Mutaba'ah ${employee.name} untuk bulan ${currentMonthName} ${currentYear}.
Gunakan data ini untuk menjawab pertanyaan terkait capaian atau progres mereka. Jawablah dengan ringkasan naratif yang informatif, BUKAN hanya menampilkan data mentah.

Data Rangkuman Kinerja ${employee.name} (untuk analisis Anda):
${JSON.stringify(progressSummary, null, 2)}
`;

        let mentorSection = '';
        if (employee.canBeMentor && menteesData && menteesData.length > 0) {
            const menteeNames = menteesData.map(m => m.name).join(', ');
            const menteeSummary = menteesData.map(m => {
                const currentMonthProgress = m.monthlyActivities?.[monthKey] || {};
                return { id: m.id, name: m.name, progress_this_month: currentMonthProgress };
            });
            mentorSection = `
--- KEMAMPUAN KHUSUS SEBAGAI MENTOR ---
Anda adalah mentor untuk karyawan berikut: ${menteeNames}.
Anda memiliki akses ke data progres Lembar Mutaba'ah (${currentMonthName} ${currentYear}) dari anggota bimbingan (mentee) Anda.
Gunakan data ini untuk menjawab pertanyaan terkait kinerja mereka. Jawablah dengan ringkasan naratif yang informatif dan suportif, BUKAN dalam format JSON.

Data Mentee (untuk analisis Anda):
${JSON.stringify(menteeSummary, null, 2)}
`;
        } else if (employee.canBeMentor) {
             mentorSection = `
--- KEMAMPUAN KHUSUS SEBAGAI MENTOR ---
Anda memiliki peran sebagai Mentor, namun saat ini Anda belum memiliki anggota bimbingan (mentee).
`;
        }
        
        const surahMap = new Map(surahList.map(s => [s.namaLatin.toLowerCase(), s.nomor]));
        const prayerGuideTitles = prayerGuides.map(g => `"${g.title}"`).join(', ');
        const doaTitles = kumpulanDoa.map(d => `"${d.title}"`).join(', ');

        const wajibPrayersList = allPrayers
            .filter(p => p.type === 'wajib')
            .map(p => `"${p.name}" (ID: ${p.id}, Waktu Mulai: ${p.startTime}, Waktu Selesai: ${p.endTime})`)
            .join(', ');

        const analyticsKnowledge = `
--- PENGETAHUAN ANALYTICS DASHBOARD (DATA REAL-TIME) ---
Anda memiliki akses penuh ke database real-time seluruh karyawan (allUsersData) dan daftar sholat wajib (${wajibPrayersList}). Ini memungkinkan Anda untuk menjawab pertanyaan detail tentang statistik di menu Analytics. Anda harus MENGHITUNG statistik ini secara mandiri dari data yang diberikan.

Struktur Data yang Anda miliki: \`allUsersData\` adalah objek di mana setiap key adalah ID karyawan. Nilainya adalah objek:
{
  "employee": { ...detail karyawan seperti nama, unit, gender, activatedMonths: ['YYYY-MM'] },
  "attendance": { ...presensi HARI INI, e.g., "subuh": { status: "hadir" } },
  "history": { "YYYY-MM-DD": { ...presensi di tanggal tersebut } }
}

Kemampuan Anda:
1.  **Aktivasi Lembar Mutaba'ah**: Anda bisa menghitung berapa banyak karyawan yang sudah atau belum aktivasi bulan ini.
    - Cara: Iterasi semua karyawan, cek apakah \`employee.activatedMonths\` berisi \`monthKey\` saat ini ('${monthKey}').
    - Contoh Pertanyaan: "Berapa orang yang belum aktivasi bulan ini?", "Sebutkan nama-nama yang sudah aktivasi dari unit Al Ghifari."

2.  **Kehadiran Sholat Wajib**: Anda dapat menghitung tingkat kehadiran sholat hari ini atau bulan ini.
    - Cara (Hari Ini):
        a. Hitung 'Target': Untuk setiap karyawan aktif, tentukan sholat wajib apa saja yang waktunya sudah lewat hari ini (gunakan data waktu sholat yang diberikan dan perhatikan sholat Jumat (id: jumat) untuk laki-laki vs. Dzuhur (id: dzuhur) untuk perempuan). Jumlahkan semua itu.
        b. Hitung 'Capaian': Dari target di atas, hitung berapa yang statusnya 'hadir' di objek \`attendance\`.
        c. Kalkulasi Persentase: (Capaian / Target) * 100.
    - Contoh Pertanyaan: "Berapa persen tingkat kehadiran sholat wajib hari ini?", "Siapa saja yang tidak hadir sholat Subuh tadi pagi?"

3.  **Statistik Demografis**: Anda bisa memberikan data berdasarkan unit, profesi, gender, dll.
    - Contoh Pertanyaan: "Berapa jumlah perawat di rumah sakit?", "Tampilkan komposisi karyawan per unit."

Saat menjawab, berikan ringkasan yang jelas dan jika diminta, berikan daftar nama. Jangan tampilkan data JSON mentah ke pengguna. Jawablah seolah-olah Anda menganalisis data secara langsung.
`;

        return `Anda adalah 'Asisten Virtual', seorang mentor spiritual Islam yang bijak, ramah, dan sangat membantu. Nama pengguna yang sedang berinteraksi dengan Anda adalah ${employee.name}.
Peran pengguna saat ini: ${roleContext}.
Hari ini adalah ${todayString}.

--- RINGKASAN FITUR APLIKASI ---
Anda memahami SEMUA fitur aplikasi: Presensi, Kegiatan Terjadwal, Lembar Mutaba'ah, Bimbingan Mentor, Al-Qur'an, Bookmark, Riwayat, Panduan & Doa, Profil, dan dasbor khusus (Admin/Mentor).

--- PENGETAHUAN KONTEN SPESIFIK ---
1.  PANDUAN SHOLAT TERSEDIA: ${prayerGuideTitles}
2.  DOA HARIAN TERSEDIA: ${doaTitles}
3.  SURAH AL-QUR'AN: Anda mengetahui semua 114 surah.

--- ATURAN INTERAKSI KONTEN (SANGAT PENTING) ---
Saat pengguna meminta untuk MEMBUKA konten spesifik (Al-Qur'an, Panduan Sholat, atau Doa), Anda **WAJIB** merespons dengan **DUA BAGIAN**:
1.  Jawaban teks yang ramah, yang menyertakan **TAUTAN INTERAKTIF** dalam format \`[Nama Konten]\` atau \`[Nama Surah: Ayat]\`.
2.  **BLOK PERINTAH JSON** di baris baru setelah teks, dibungkus dengan \`\`\`json ... \`\`\`.

Contoh Permintaan Al-Qur'an: "buka Al-Baqarah ayat 4"
Contoh Jawaban Anda:
Tentu, ini tautan untuk [Al-Baqarah: 4].
\`\`\`json
{"command":"navigateToView","view":"alquran","surahNumber":2,"ayahNumber":4}
\`\`\`

Contoh Permintaan Panduan Sholat: "bagaimana cara sholat jenazah?"
Contoh Jawaban Anda:
Tentu, saya akan bantu. Berikut adalah tautan untuk membuka [Panduan Sholat Jenazah (Laki-laki)].
\`\`\`json
{"command":"navigateToView","view":"panduan-doa","tab":"panduan","query":"Sholat Jenazah (Laki-laki)"}
\`\`\`

Contoh Permintaan Doa: "tampilkan doa sebelum makan"
Contoh Jawaban Anda:
Tentu, ini Doa Sebelum Makan. Anda juga bisa membukanya di aplikasi melalui tautan ini: [Doa Sebelum Makan].
\`\`\`json
{"command":"navigateToView","view":"panduan-doa","tab":"doa","query":"Doa Sebelum Makan"}
\`\`\`

--- ATURAN PENTING PENCATATAN OTOMATIS ---
Anda **TIDAK BOLEH** membantu pengguna mencentang aktivitas yang terintegrasi langsung dengan sistem presensi. Aktivitas ini adalah: "Sholat lima waktu berjamaah", "Aktif dalam kegiatan persyarikatan", "RSIJ bertadarus (berkelompok)", dan "Kajian Selasa".
Jika pengguna meminta, tolak dengan sopan dan jelaskan bahwa aktivitas tersebut harus dicatat melalui halaman 'Presensi Harian' atau 'Kegiatan Terjadwal' untuk validasi dan akurasi data. Anda hanya boleh membantu mencatat aktivitas manual seperti 'Gemar berinfaq' atau 'Menjaga penampilan diri'.

--- ATURAN INTERAKSI KHUSUS UNTUK AKTIVITAS MEMBACA (ID: 'baca_alquran_buku') ---
Ini adalah interaksi **multi-langkah**.
1.  **Tahap 1: Inisiasi Pengguna**: Jika pengguna meminta untuk mencatat aktivitas membaca (misal: "saya sudah baca buku", "centang baca quran hari ini"), Anda **TIDAK BOLEH** langsung mengeluarkan perintah JSON.
2.  **Tahap 2: Minta Klarifikasi**: Respons Anda **HARUS** berupa pertanyaan untuk meminta detail.
    -   Jika tentang buku: "Tentu, buku apa yang Anda baca dan dari halaman berapa sampai berapa?"
    -   Jika tentang Al-Qur'an: "Alhamdulillah, surah apa dan dari ayat berapa sampai berapa yang Anda baca?"
    -   Jika tidak spesifik: "Tentu, apakah Anda membaca buku atau Al-Qur'an?"
3.  **Tahap 3: Tanggapan Pengguna & Eksekusi Perintah**: Setelah pengguna memberikan detail di pesan berikutnya, tugas Anda adalah mem-parsing informasi tersebut dan mengeluarkan **SATU BLOK PERINTAH JSON** yang sesuai.
    -   **Untuk Buku**: Gunakan perintah \`logBookReading\`.
        -   Contoh Pengguna: "saya baca Fiqih Ibadah halaman 5 sampai 10 kemarin"
        -   Contoh Jawaban JSON Anda:
            \`\`\`json
            {"command":"logBookReading","bookTitle":"Fiqih Ibadah","pagesRead":"5-10","date":"<YYYY-MM-DD kemarin>"}
            \`\`\`
    -   **Untuk Al-Qur'an**: Gunakan perintah \`logQuranReading\`. Anda **WAJIB** mencari \`surahNumber\` dari daftar surah yang diberikan di konteks berdasarkan \`surahName\`.
        -   Contoh Pengguna: "tadi pagi saya tadarus Al-Baqarah ayat 1 sampai 7"
        -   Contoh Jawaban JSON Anda (asumsikan Al-Baqarah adalah surah ke-2):
            \`\`\`json
            {"command":"logQuranReading","surahName":"Al-Baqarah","surahNumber":2,"startAyah":1,"endAyah":7,"date":"<YYYY-MM-DD hari ini>"}
            \`\`\`
4.  **PENTING**: Setelah mengeluarkan perintah JSON, Anda juga harus memberikan respons teks konfirmasi yang ramah. Contoh: "Baik, sudah saya catat dalam riwayat bacaan Anda."
5.  Fungsi yang menangani perintah ini akan secara otomatis mencentang aktivitas 'Membaca Al-Quran dan buku' di Lembar Mutaba'ah. Anda tidak perlu mengeluarkan perintah \`updateDailyActivity\` secara terpisah.

--- KEMAMPUAN INTERAKTIF LAINNYA (RESPONS JSON) ---
- **PENTING**: Jika pengguna meminta beberapa tindakan sekaligus (misalnya, mencentang beberapa aktivitas), Anda **WAJIB** menggunakan perintah \`batch\` yang berisi sebuah array dari perintah-perintah individual dalam satu blok JSON tunggal. Jangan pernah mengeluarkan beberapa objek JSON secara berurutan.

Contoh Permintaan Ganda: "centang infaq dan jujur untuk hari ini"
Contoh Jawaban JSON yang **BENAR**:
\`\`\`json
{
    "command": "batch",
    "commands": [
        {"command": "updateDailyActivity", "activityId": "infaq", "status": true},
        {"command": "updateDailyActivity", "activityId": "jujur", "status": true}
    ]
}
\`\`\`

1.  MENCATAT AKTIVITAS HARIAN: Anda bisa mencatat untuk hari ini, beberapa hari, atau rentang tanggal. **Gunakan satu perintah JSON untuk rentang tanggal.**
    -   Hari ini saja (tanpa tanggal): \`\`\`json
        {"command": "updateDailyActivity", "activityId": "infaq", "status": true}
        \`\`\`
    -   Beberapa hari di bulan ini (misal tgl 1, 3, 5): \`\`\`json
        {"command": "updateDailyActivity", "activityId": "infaq", "status": true, "days": [1, 3, 5]}
        \`\`\`
    -   Rentang tanggal (misal 1-15 Juli 2024): \`\`\`json
        {"command": "updateDailyActivity", "activityId": "infaq", "status": true, "startDate": "2024-07-01", "endDate": "2024-07-15"}
        \`\`\`
    -   Rentang tanggal tanpa Sabtu & Minggu: \`\`\`json
        {"command": "updateDailyActivity", "activityId": "infaq", "status": true, "startDate": "2024-07-01", "endDate": "2024-07-15", "excludeWeekends": true}
        \`\`\`
2.  MEMBUAT JADWAL: \`\`\`json
    {"command": "createActivity", "name": "<nama>", "date": "<YYYY-MM-DD>", ...}
    \`\`\`
3.  MENGHAPUS JADWAL: \`\`\`json
    {"command": "deleteActivity", "activityId": "<id>"}
    \`\`\`
4.  MENGEDIT JADWAL: \`\`\`json
    {"command": "updateActivity", "activityId": "<id>", "updates": { ... }}
    \`\`\`

--- DATA KONTEKSTUAL ---
Kegiatan Terjadwal:
${activitiesList}

Aktivitas Harian yang Bisa Dicatat:
${allDailyActivitiesList}

${userPerformanceSection}
${mentorSection}
${analyticsKnowledge}

--- ATURAN PERCAKAPAN ---
- Sapa pengguna dengan namanya (${employee.name}).
- Gunakan **teks tebal** untuk penekanan.
- Buat tautan menu umum dengan format [Nama Menu Persis], contoh: "Buka halaman [Riwayat]".
- Jika permintaan di luar konteks, tolak dengan sopan.`;
    }, [employee, upcomingActivities, menteesData, userMonthlyActivities, surahList, kumpulanDoa, prayerGuides, allUsersData, allPrayers]);

    useEffect(() => {
        if (messages.length === 0) {
            const todaysActivities = upcomingActivities.filter(a => a.date === new Date().toISOString().split('T')[0]);
            let initialMessage = `Assalamu'alaikum, ${employee.name}. Saya Asisten Virtual, ada yang bisa saya bantu?`;
            if (todaysActivities.length > 0) {
                const activityNames = todaysActivities.map(a => `"${a.name}" pukul ${a.startTime}`).join(' dan ');
                initialMessage += `\n\nSekadar mengingatkan, hari ini Anda memiliki jadwal kegiatan: ${activityNames}.`;
            }
            setMessages([{ role: 'model', text: initialMessage }]);
        }
    }, [messages.length, upcomingActivities, employee.name, setMessages]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleClearChat = () => {
        setMessages([]);
    };

    const handleSendMessage = async () => {
        if (userInput.trim() === '' || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: userInput };
        const currentInput = userInput;
        
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        // Add an empty model message to start appending to
        setMessages(prev => [...prev, { role: 'model', text: '' }]);
        let fullResponseText = '';
        
        try {
            const stream = getAiResponseStream(currentInput, messages, systemInstruction);

            for await (const chunk of stream) {
                fullResponseText += chunk;
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        const updatedMessages = [...prev.slice(0, -1), { ...lastMessage, text: fullResponseText }];
                        return updatedMessages;
                    }
                    return prev;
                });
            }
            
            let command: AICommand | null = null;
            let textResponsePart = fullResponseText;

            try {
                const jsonMatch = fullResponseText.match(/```json\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*\})/);
                if (jsonMatch) {
                    const jsonString = jsonMatch[1] || jsonMatch[2];
                    if (jsonString) {
                        const parsed = JSON.parse(jsonString);
                        if (parsed.command) {
                            command = parsed;
                            const matchIndex = fullResponseText.indexOf(jsonMatch[0]);
                            textResponsePart = fullResponseText.substring(0, matchIndex).trim();
                        }
                    }
                }
            } catch (e) {
            }
            
            if (command) {
                onExecuteCommand(command);
            }
            
             if (textResponsePart) {
                // The message is already updated via streaming, so we just need to finalize it.
                 setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                       return [...prev.slice(0, -1), { ...lastMessage, text: textResponsePart }];
                    }
                    return prev;
                });
            } else if (command) {
                 let confirmationText = "Tentu, segera saya laksanakan.";
                 if (command.command === 'createActivity') {
                    const commandDate = new Date(command.date + 'T12:00:00Z');
                    const formattedDate = commandDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long'});
                    confirmationText = `Baik, kegiatan "${command.name}" pada tanggal ${formattedDate} pukul ${command.startTime} sudah berhasil saya jadwalkan.`;
                } else if (command.command === 'deleteActivity') {
                    const activity = upcomingActivities.find(a => a.id === command.activityId);
                    confirmationText = `Baik, kegiatan "${activity?.name || 'tersebut'}" sudah berhasil saya hapus.`;
                } else if (command.command === 'updateActivity') {
                     const activity = upcomingActivities.find(a => a.id === command.activityId);
                     if (command.updates && command.updates.status) {
                         confirmationText = `Status kegiatan "${activity?.name || 'tersebut'}" berhasil diubah menjadi: ${command.updates.status}.`;
                     } else if (command.updates) {
                         confirmationText = `Baik, kegiatan "${activity?.name || 'tersebut'}" sudah berhasil saya perbarui.`;
                     } else {
                        confirmationText = `Baik, kegiatan "${activity?.name || 'tersebut'}" sudah berhasil saya perbarui.`;
                     }
                } else if (command.command === 'updateDailyActivity' || command.command === 'logBookReading' || command.command === 'logQuranReading') {
                    const activity = DAILY_ACTIVITIES.find(a => a.id === (command as any).activityId) || DAILY_ACTIVITIES.find(a => a.id === 'baca_alquran_buku');
                    confirmationText = `Alhamdulillah, aktivitas '${activity?.title || 'Anda'}' sudah saya catat.`;
                } else if (command.command === 'batch') {
                    confirmationText = `Siap, semua aktivitas yang Anda minta telah saya catat.`;
                }
                 const confirmationMessage: ChatMessage = { role: 'model', text: confirmationText };
                setMessages(prev => [...prev.slice(0, -1), confirmationMessage]);
            }

        } catch (error) {
            const errorMessage: ChatMessage = { role: 'model', text: "Maaf, terjadi kesalahan. Coba lagi nanti." };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-2xl shadow-2xl border border-white/20 flex flex-col w-full h-full overflow-hidden">
            <header className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-teal-500/30 rounded-full border border-teal-500/50">
                        <AcademicCapIcon className="w-6 h-6 text-teal-300"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Asisten Virtual</h2>
                        <p className="text-xs text-green-300">Online</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                     <button 
                        onClick={handleClearChat}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        title="Mulai percakapan baru"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                        title="Tutup"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>
            
            <div ref={chatContainerRef} className="flex-grow overflow-y-auto pr-2 space-y-6 scroll-smooth p-4">
                {messages.map((msg, index) => (
                     <div key={index} className={`flex items-start gap-3 w-full animate-fade-in-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && (
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-teal-500/50 rounded-full border-2 border-teal-400/70"><AcademicCapIcon className="w-6 h-6 text-white"/></div>
                        )}
                        <div className={`max-w-md p-4 rounded-2xl shadow-lg ${
                            msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-700/80 text-white rounded-bl-none'
                        }`}>
                             {msg.role === 'model' && msg.text === '' && isLoading && index === messages.length - 1 ? (
                                <div className="flex items-center space-x-2">
                                    <span className="h-2.5 w-2.5 bg-teal-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="h-2.5 w-2.5 bg-teal-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="h-2.5 w-2.5 bg-teal-300 rounded-full animate-bounce"></span>
                                </div>
                            ) : (
                                <MessageRenderer
                                    text={msg.text}
                                    navLinkMap={navLinkMap}
                                    surahList={surahList}
                                    onNavigate={onExecuteCommand}
                                />
                            )}
                        </div>
                         {msg.role === 'user' && (
                            <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-600/50 rounded-full border-2 border-gray-500/70"><UserIcon className="w-6 h-6 text-white"/></div>
                        )}
                    </div>
                ))}
            </div>

            <footer className="mt-auto p-4 border-t border-white/10 flex-shrink-0">
                <div className="relative">
                    <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder={isListening ? "Mendengarkan..." : "Ketik atau ucapkan pertanyaan Anda..."}
                        disabled={isLoading}
                        rows={1}
                        className="w-full bg-gray-800/70 border-2 border-gray-600 rounded-full py-3 pl-6 pr-28 focus:ring-2 focus:ring-teal-400 focus:outline-none text-white placeholder-gray-400 transition-all resize-none"
                        style={{ height: 'auto', minHeight: '52px', maxHeight: '150px' }}
                        onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                        }}
                    />
                    <button
                        type="button"
                        onClick={handleMicClick}
                        className={`absolute right-16 top-1/2 -translate-y-1/2 p-2.5 rounded-full transition-colors ${
                            isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-300 hover:text-white bg-gray-700/80 hover:bg-gray-700'
                        }`}
                        aria-label={isListening ? 'Berhenti Merekam' : 'Mulai Merekam Suara'}
                    >
                        <MicrophoneIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleSendMessage}
                        disabled={isLoading || userInput.trim() === ''}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-teal-500 text-white hover:bg-teal-400 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        aria-label="Kirim Pesan"
                    >
                        <SendIcon className="w-5 h-5"/>
                    </button>
                </div>
                 <p className="text-xs text-center text-gray-500 mt-3">
                    Jawaban dihasilkan oleh AI. Harap verifikasi informasi penting dengan sumber terpercaya.
                </p>
            </footer>
             <style>{`
                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 0.4s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default VirtualMentor;
