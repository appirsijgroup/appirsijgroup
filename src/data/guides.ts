/* eslint-disable @typescript-eslint/no-duplicate-keys */
import { type PrayerGuide, type DailyPrayer, type Achievement } from '../types';

const DOA_IFTITAH_CONTENT = {
    title: "Doa Iftitah (versi HPT Muhammadiyah)",
    arabic: "اللَّهُمَّ بَاعِدْ بَيْنِي وَبَيْنَ خَطَايَايَ كَمَا بَاعَدْتَ بَيْنَ الْمَشْرِقِ وَالْمَغْرِبِ، اللَّهُمَّ نَقِّنِي مِنْ خَطَايَايَ كَمَا يُنَقَّى الثَّوْبُ الْأَبْيَضُ مِنَ الدَّنَسِ، اللَّهُمَّ اغْسِلْنِي مِنْ خَطَايَايَ بِالثَّلْجِ وَالْمَاءِ وَالْبَرَدِ",
    latin: "Allahumma baa'id bainii wa baina khathaayaaya kamaa baa'adta bainal masyriqi wal maghrib. Allahumma naqqinii min khathaayaaya kamaa yunaqqats tsaubul abyadhu minad danas. Allahummaghsilnii min khathaayaaya bits tsalji wal maa-i wal barad.",
    translation: "Ya Allah, jauhkanlah antara aku dan kesalahanku sebagaimana Engkau menjauhkan antara timur dan barat. Ya Allah, bersihkanlah aku dari kesalahanku sebagaimana pakaian putih dibersihkan dari kotoran. Ya Allah, cucilah kesalahanku dengan salju, air, dan air es."
};

const DOA_IFTITAH = { id: 2, ...DOA_IFTITAH_CONTENT };

const AL_FATIHAH_CONTENT = {
    title: "Membaca Al-Fatihah",
    arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ. اَلْحَمْدُ لِلّٰهِ رَبِّ الْعٰلَمِيْنَۙ. الرَّحْمٰنِ الرَّحِيْمِۙ. مٰلِكِ يَوْمِ الدِّيْنِۗ. اِيَّاكَ نَعْبُدُ وَاِيَّاكَ نَسْتَعِيْنُۗ. اِهْدِنَا الصِّرَاطَ الْمُسْتَقِيْمَۙ. صِرَاطَ الَّذِيْنَ اَنْعَمْتَ عَلَيْهِمْ ەۙ غَيْرِ الْمَغْضُوْبِ عَلَيْهِمْ وَلَا الضَّاۤلِّيْنَࣖ.",
    latin: "Bismillaahir-rahmaanir-rahiim. Al-hamdu lillaahi rabbil-'aalamiin. Ar-rahmaanir-rahiim. Maaliki yaumid-diin. Iyyaaka na'budu wa iyyaaka nasta'iin. Ihdinash-shiraathal-mustaqiim. Shiraathal-ladziina an'amta 'alaihim ghairil-maghdhuubi 'alaihim wa ladh-dhaalliin.",
    translation: "Dengan nama Allah Yang Maha Pengasih, Maha Penyayang. Segala puji bagi Allah, Tuhan seluruh alam. Yang Maha Pengasih, Maha Penyayang. Pemilik hari pembalasan. Hanya kepada Engkaulah kami menyembah dan hanya kepada Engkaulah kami memohon pertolongan. Tunjukilah kami jalan yang lurus. (yaitu) jalan orang-orang yang telah Engkau beri nikmat kepadanya; bukan (jalan) mereka yang dimurkai, dan bukan (pula jalan) mereka yang sesat.",
    description: "Setelah membaca Al-Fatihah, dilanjutkan membaca surat atau ayat Al-Quran."
};

const AL_FATIHAH = { id: 3, ...AL_FATIHAH_CONTENT };

const RUKU = {
    id: 4,
    title: "Ruku'",
    arabic: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ اللَّهُمَّ اغْفِرْ لِي",
    latin: "Subhaanakallahumma rabbanaa wa bihamdika, allahummaghfir-lii.",
    translation: "Maha Suci Engkau ya Allah, Tuhan kami, dan dengan memuji-Mu, ya Allah, ampunilah aku."
};

const ITIDAL = {
    id: 5,
    title: "I'tidal",
    arabic: "سَمِعَ اللهُ لِمَنْ حَمِدَهُ، رَبَّنَا وَلَكَ الْحَمْدُ",
    latin: "Sami'allaahu liman hamidah. Rabbanaa wa lakal-hamd.",
    translation: "Allah mendengar orang yang memuji-Nya. Ya Tuhan kami, bagi-Mu segala puji."
};

const SUJUD = {
    id: 6,
    title: "Sujud",
    arabic: "سُبْحَانَكَ اللَّهُمَّ رَبَّنَا وَبِحَمْدِكَ اللَّهُمَّ اغْفِرْ لِي",
    latin: "Subhaanakallahumma rabbanaa wa bihamdika, allahummaghfir-lii.",
    translation: "Maha Suci Engkau ya Allah, Tuhan kami, dan dengan memuji-Mu, ya Allah, ampunilah aku."
};

const DUDUK_ANTARA_DUA_SUJUD = {
    id: 7,
    title: "Duduk di Antara Dua Sujud",
    arabic: "اللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاجْبُرْنِي وَاهْدِنِي وَARْزُقْنِي",
    latin: "Allaahummaghfir-lii warham-nii wajbur-nii wahdi-nii warzuq-nii.",
    translation: "Ya Allah, ampunilah aku, sayangilah aku, cukupilah aku, berilah aku petunjuk, dan berilah aku rezeki."
};

const SHALAWAT_NABI = {
    title: "Shalawat Nabi",
    arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، فِي الْعَالَمِينَ إِنَّكَ حَمِيدٌ مَجِيدٌ",
    latin: "Allaahumma shalli 'alaa muhammadin wa 'alaa aali muhammad, kamaa shallaita 'alaa ibraahiima wa 'alaa aali ibraahiim. Wa baarik 'alaa muhammadin wa 'alaa aali muhammad, kamaa baarakta 'alaa ibraahiima wa 'alaa aali ibraahiim. Fil 'aalamiina innaka hamiidum majiid.",
    translation: "Ya Allah, limpahkanlah rahmat kepada Muhammad dan keluarga Muhammad, sebagaimana Engkau telah melimpahkan rahmat kepada Ibrahim dan keluarga Ibrahim. Dan limpahkanlah berkah kepada Muhammad dan keluarga Muhammad, sebagaimana Engkau telah melimpahkan berkah kepada Ibrahim dan keluarga Ibrahim. Di seluruh alam, sesungguhnya Engkau Maha Terpuji lagi Maha Mulia."
}

const TASYAHUD_AKHIR_CONTENT = {
    arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْhَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ. " + SHALAWAT_NABI.arabic,
    latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh. " + SHALAWAT_NABI.latin,
    translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya. " + SHALAWAT_NABI.translation,
    description: "Setelah tasyahud, dianjurkan membaca doa perlindungan dari empat hal sebelum salam."
};

const TASYAHUD_AKHIR = { id: 9, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT };

const SALAM_CONTENT = {
    arabic: "السَّلاَمُ عَلَيْكُمْ وَرَحْمَةُ اللهِ",
    latin: "Assalaamu 'alaikum wa rahmatullaah.",
    translation: "Keselamatan dan rahmat Allah semoga tercurah kepadamu.",
    description: "Menoleh ke kanan, kemudian menoleh ke kiri (menurut sebagian pandangan)."
};

const SALAM = { id: 10, title: "Salam", ...SALAM_CONTENT };

const RAKAAT_STANDAR_STEPS = [DOA_IFTITAH, AL_FATIHAH, RUKU, ITIDAL, SUJUD, DUDUK_ANTARA_DUA_SUJUD, SUJUD];

export const PRAYER_GUIDES: PrayerGuide[] = [
    {
        id: 'subuh',
        title: "Sholat Subuh",
        description: "Panduan sholat fardhu Subuh (2 rakaat). Sholat Subuh tidak menggunakan doa qunut.",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Subuh", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS,
            { id: 8, title: "Tasyahud Awal & Akhir", arabic: TASYAHUD_AKHIR.arabic, latin: TASYAHUD_AKHIR.latin, translation: TASYAHUD_AKHIR.translation, description: "Pada rakaat kedua (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'dzuhur',
        title: "Sholat Dzuhur",
        description: "Panduan sholat fardhu Dzuhur (4 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Dzuhur", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS, // Rakaat 1
            { id: 8, title: "Tasyahud Awal", ...TASYAHUD_AKHIR_CONTENT, arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.", latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh.", translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.", description: "Pada rakaat kedua, lakukan Tasyahud Awal. Kemudian berdiri untuk rakaat ketiga." },
            {
                id: 9,
                title: "Rakaat Ketiga",
                arabic: " ",
                latin: "Gerakan seperti rakaat sebelumnya, dimulai dengan Al-Fatihah.",
                translation: " ",
                description: "Setelah tasyahud awal, berdiri untuk rakaat ketiga dan membaca surat Al-Fatihah. Lanjutkan dengan gerakan sholat (ruku, i'tidal, sujud) seperti pada rakaat sebelumnya."
            },
            { id: 10, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat keempat (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'ashar',
        title: "Sholat Ashar",
        description: "Panduan sholat fardhu Ashar (4 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Ashar", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS, // Rakaat 1
            { id: 8, title: "Tasyahud Awal", ...TASYAHUD_AKHIR_CONTENT, arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.", latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh.", translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.", description: "Pada rakaat kedua, lakukan Tasyahud Awal. Kemudian berdiri untuk rakaat ketiga." },
            {
                id: 9,
                title: "Rakaat Ketiga",
                arabic: " ",
                latin: "Gerakan seperti rakaat sebelumnya, dimulai dengan Al-Fatihah.",
                translation: " ",
                description: "Setelah tasyahud awal, berdiri untuk rakaat ketiga dan membaca surat Al-Fatihah. Lanjutkan dengan gerakan sholat (ruku, i'tidal, sujud) seperti pada rakaat sebelumnya."
            },
            { id: 10, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat keempat (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'maghrib',
        title: "Sholat Maghrib",
        description: "Panduan sholat fardhu Maghrib (3 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Maghrib", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS, // Rakaat 1
            { id: 8, title: "Tasyahud Awal", ...TASYAHUD_AKHIR_CONTENT, arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.", latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh.", translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.", description: "Pada rakaat kedua, lakukan Tasyahud Awal. Kemudian berdiri untuk rakaat ketiga." },
            { id: 9, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat ketiga (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'isya',
        title: "Sholat Isya",
        description: "Panduan sholat fardhu Isya (4 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Isya", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS, // Rakaat 1
            { id: 8, title: "Tasyahud Awal", ...TASYAHUD_AKHIR_CONTENT, arabic: "التَّحِيَّاتُ لِلَّهِ وَالصَّلَوَاتُ وَالطَّيِّبَاتُ، السَّلَامُ عَلَيْكَ أَيُّهَا النَّبِيُّ وَرَحْمَةُ اللَّهِ وَبَرَكَاتُهُ، السَّلَامُ عَلَيْنَا وَعَلَى عِبَادِ اللَّهِ الصَّالِحِينَ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللَّهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ.", latin: "At-tahiyyaatu lillaahi wash-shalawaatu wath-thayyibaat. As-salaamu 'alaika ayyuhan-nabiyyu wa rahmatullaahi wa barakaatuh. As-salaamu 'alainaa wa 'alaa 'ibaadillaahish-shaalihiin. Asyhadu al-laa ilaaha illallaah, wa asyhadu anna muhammadan 'abduhu wa rasuuluh.", translation: "Segala kehormatan, shalat, dan kebaikan adalah milik Allah. Semoga keselamatan, rahmat Allah, dan berkah-Nya tercurah kepadamu, wahai Nabi. Semoga keselamatan tercurah kepada kami dan kepada hamba-hamba Allah yang saleh. Aku bersaksi bahwa tiada Tuhan selain Allah dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya.", description: "Pada rakaat kedua, lakukan Tasyahud Awal. Kemudian berdiri untuk rakaat ketiga." },
            {
                id: 9,
                title: "Rakaat Ketiga",
                arabic: " ",
                latin: "Gerakan seperti rakaat sebelumnya, dimulai dengan Al-Fatihah.",
                translation: " ",
                description: "Setelah tasyahud awal, berdiri untuk rakaat ketiga dan membaca surat Al-Fatihah. Lanjutkan dengan gerakan sholat (ruku, i'tidal, sujud) seperti pada rakaat sebelumnya."
            },
            { id: 10, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat keempat (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'jenazah-laki',
        title: "Sholat Jenazah (Laki-laki)",
        description: "Panduan sholat untuk jenazah laki-laki (4 takbir tanpa rukuk dan sujud).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat & Takbir Pertama", arabic: " ", latin: " ", translation: " ", description: "Niat di dalam hati bersamaan dengan takbir pertama. Setelah takbir, membaca surat Al-Fatihah." },
            { id: 2, ...AL_FATIHAH_CONTENT, description: "" },
            { id: 3, title: "Takbir Kedua & Shalawat", arabic: SHALAWAT_NABI.arabic, latin: SHALAWAT_NABI.latin, translation: SHALAWAT_NABI.translation, description: "Setelah takbir kedua, membaca shalawat kepada Nabi Muhammad SAW seperti dalam tasyahud akhir." },
            { id: 4, title: "Takbir Ketiga & Doa", arabic: "اَللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ وَأَكْرِمْ نُزُلَهُ وَوَسِّعْ مُدْخَلَهُ", latin: "Allahummaghfir lahu warhamhu wa 'aafihi wa'fu 'anhu wa akrim nuzulahu wa wassi' mudkholahu.", translation: "Ya Allah, ampunilah dia, rahmatilah dia, sejahterakanlah dia, maafkanlah dia, muliakanlah tempatnya, dan luaskanlah tempat masuknya." },
            { id: 6, title: "Salam", ...SALAM_CONTENT }
        ]
    },
    {
        id: 'jenazah-perempuan',
        title: "Sholat Jenazah (Perempuan)",
        description: "Panduan sholat untuk jenazah perempuan (4 takbir tanpa rukuk dan sujud).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat & Takbir Pertama", arabic: " ", latin: " ", translation: " ", description: "Niat di dalam hati bersamaan dengan takbir pertama. Setelah takbir, membaca surat Al-Fatihah." },
            { id: 2, ...AL_FATIHAH_CONTENT, description: "" },
            { id: 3, title: "Takbir Kedua & Shalawat", arabic: SHALAWAT_NABI.arabic, latin: SHALAWAT_NABI.latin, translation: SHALAWAT_NABI.translation, description: "Setelah takbir kedua, membaca shalawat kepada Nabi Muhammad SAW seperti dalam tasyahud akhir." },
            { id: 4, title: "Takbir Ketiga & Doa", arabic: "اَللَّهُمَّ اغْفِرْ لَهَا وَارْحَمْهَا وَعَافِهَا وَاعْفُ عَنْهَا وَأَكْرِمْ نُزُلَهَا وَوَسِّعْ مُدْخَلَهَا", latin: "Allahummaghfir laha warhamha wa 'aafiha wa'fu 'anha wa akrim nuzulaha wa wassi' mudkholaha.", translation: "Ya Allah, ampunilah dia, rahmatilah dia, sejahterakanlah dia, maafkanlah dia, muliakanlah tempatnya, dan luaskanlah tempat masuknya." },
            { id: 5, title: "Takbir Keempat & Doa Penutup", arabic: "اللَّهُمَّ لَا تَحْرِمْنَا أَجْرَهَا وَلَا تَفْتِنَّا bَعْدَهَا وَاغْفِرْ لَنَا وَلَهَا", latin: "Allahumma laa tahrimnaa ajroha wa laa taftinnaa ba'daha waghfirlanaa walaha.", translation: "Ya Allah, janganlah Engkau haramkan kami dari pahalanya, dan janganlah Engkau beri fitnah kepada kami setelah kematiannya, dan ampunilah kami dan dia." },
            { id: 6, title: "Salam", ...SALAM_CONTENT }
        ]
    },
    {
        id: 'dhuha',
        title: "Sholat Dhuha",
        description: "Panduan sholat sunnah Dhuha (minimal 2 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Dhuha", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS,
            { id: 8, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat kedua (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'gerhana',
        title: "Sholat Gerhana (Kusuf)",
        description: "Panduan sholat sunnah Gerhana (2 rakaat, masing-masing dengan 2 rukuk).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat & Rakaat Pertama", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram. Sholat gerhana dilakukan 2 rakaat, tetapi setiap rakaat terdiri dari 2 kali berdiri, 2 kali membaca Al-Fatihah, dan 2 kali rukuk." },
            { id: 2, title: "Gerakan Rakaat Pertama", arabic: "...", latin: "...", translation: "...", description: "1. Takbiratul Ihram & Iftitah. 2. Baca Al-Fatihah & surat panjang. 3. Rukuk (lama). 4. I'tidal. 5. Baca Al-Fatihah & surat (lebih pendek dari sebelumnya). 6. Rukuk kedua (lebih singkat). 7. I'tidal. 8. Sujud (lama). 9. Duduk di antara dua sujud. 10. Sujud kedua." },
            { id: 3, title: "Gerakan Rakaat Kedua", arabic: "...", latin: "...", translation: "...", description: "Berdiri untuk rakaat kedua dan melakukan gerakan yang sama seperti rakaat pertama (2 kali bacaan & 2 kali rukuk)." },
            { id: 4, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT },
            { id: 5, title: "Salam", ...SALAM_CONTENT }
        ]
    },
    {
        id: 'tahajud',
        title: "Sholat Tahajud",
        description: "Panduan sholat sunnah Tahajud di malam hari (minimal 2 rakaat).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat Sholat Tahajud", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            ...RAKAAT_STANDAR_STEPS,
            { id: 8, title: "Tasyahud Akhir", ...TASYAHUD_AKHIR_CONTENT, description: "Pada rakaat kedua (terakhir), lakukan Tasyahud Akhir." },
            SALAM
        ]
    },
    {
        id: 'idul_fitri',
        title: "Sholat Idul Fitri",
        description: "Panduan sholat sunnah Idul Fitri (2 rakaat dengan takbir tambahan).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            { ...DOA_IFTITAH_CONTENT, id: 2, title: "Takbiratul Ihram & Doa Iftitah" },
            { id: 3, title: "Takbir Tambahan 7x", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", translation: "Allah Maha Besar", description: "Setelah doa iftitah, bertakbir lagi sebanyak 7 kali." },
            { ...AL_FATIHAH_CONTENT, id: 4 },
            { id: 5, title: "Membaca Surat Pendek", arabic: "", latin: "", translation: "", description: "Dianjurkan membaca Surat Al-A'la atau surat lainnya." },
            { ...RUKU, id: 6 },
            { ...ITIDAL, id: 7 },
            { ...SUJUD, id: 8 },
            { ...DUDUK_ANTARA_DUA_SUJUD, id: 9 },
            { ...SUJUD, id: 10, title: "Sujud Kedua" },
            { id: 11, title: "Berdiri ke Rakaat Kedua & Takbir 5x", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", translation: "Allah Maha Besar", description: "Bangun untuk rakaat kedua, lalu bertakbir lagi sebanyak 5 kali." },
            { ...AL_FATIHAH_CONTENT, id: 12 },
            { id: 13, title: "Membaca Surat Pendek", arabic: "", latin: "", translation: "", description: "Dianjurkan membaca Surat Al-Ghasyiyah atau surat lainnya." },
            { id: 14, title: "Ruku', I'tidal, Sujud", arabic: "...", latin: "...", translation: "...", description: "Lanjutkan gerakan sholat seperti biasa hingga sujud kedua." },
            { ...TASYAHUD_AKHIR_CONTENT, id: 15, title: "Tasyahud Akhir & Salam" },
            { ...SALAM, id: 16 }
        ]
    },
    {
        id: 'idul_adha',
        title: "Sholat Idul Adha",
        description: "Panduan sholat sunnah Idul Adha (2 rakaat dengan takbir tambahan).",
        source: "Himpunan Putusan Tarjih Muhammadiyah",
        steps: [
            { id: 1, title: "Niat", arabic: " ", latin: " ", translation: " ", description: "Niat dilakukan di dalam hati bersamaan dengan Takbiratul Ihram." },
            { ...DOA_IFTITAH_CONTENT, id: 2, title: "Takbiratul Ihram & Doa Iftitah" },
            { id: 3, title: "Takbir Tambahan 7x", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", translation: "Allah Maha Besar", description: "Setelah doa iftitah, bertakbir lagi sebanyak 7 kali." },
            { ...AL_FATIHAH_CONTENT, id: 4 },
            { id: 5, title: "Membaca Surat Pendek", arabic: "", latin: "", translation: "", description: "Dianjurkan membaca Surat Al-A'la atau surat lainnya." },
            { ...RUKU, id: 6 },
            { ...ITIDAL, id: 7 },
            { ...SUJUD, id: 8 },
            { ...DUDUK_ANTARA_DUA_SUJUD, id: 9 },
            { ...SUJUD, id: 10, title: "Sujud Kedua" },
            { id: 11, title: "Berdiri ke Rakaat Kedua & Takbir 5x", arabic: "اللهُ أَكْبَرُ", latin: "Allahu Akbar", translation: "Allah Maha Besar", description: "Bangun untuk rakaat kedua, lalu bertakbir lagi sebanyak 5 kali." },
            { ...AL_FATIHAH_CONTENT, id: 12 },
            { id: 13, title: "Membaca Surat Pendek", arabic: "", latin: "", translation: "", description: "Dianjurkan membaca Surat Al-Ghasyiyah atau surat lainnya." },
            { id: 14, title: "Ruku', I'tidal, Sujud", arabic: "...", latin: "...", translation: "...", description: "Lanjutkan gerakan sholat seperti biasa hingga sujud kedua." },
            { ...TASYAHUD_AKHIR_CONTENT, id: 15, title: "Tasyahud Akhir & Salam" },
            { ...SALAM, id: 16 }
        ]
    }
];

export const KUMPULAN_DOA: DailyPrayer[] = [
    { id: 1, title: "Doa Sebelum Tidur", arabic: "بِاسْمِكَ اللّٰهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوْتُ", latin: "Bismika Allahumma ahya wa bismika amut.", translation: "Dengan nama-Mu ya Allah aku hidup dan dengan nama-Mu aku mati." },
    { id: 2, title: "Doa Bangun Tidur", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِىْ اَحْيَانَا بَعْدَ مَا اَمَاتَنَا وَاِلَيْهِ النُّشُوْرُ", latin: "Alhamdulillahilladzi ahyana ba'da ma amatana wa ilaihin nusyur.", translation: "Segala puji bagi Allah yang telah menghidupkan kami sesudah kami mati (tidur) dan kepada-Nya kami kembali." },
    { id: 3, title: "Doa Sebelum Makan", arabic: "اَللّٰهُمَّ بَارِكْ لَنَا فِيْمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ", latin: "Allahumma barik lana fima razaqtana waqina 'adzabannar.", translation: "Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka." },
    { id: 4, title: "Doa Sesudah Makan", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِيْ أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مِنَ الْمُسْلِمِيْنَ", latin: "Alhamdulillahilladzi ath'amana wa saqana wa ja'alana minal muslimin.", translation: "Segala puji bagi Allah yang telah memberi kami makan dan minum, serta menjadikan kami seorang muslim." },
    { id: 5, title: "Doa Masuk Kamar Mandi", arabic: "اَللّٰهُمَّ اِنِّيْ اَعُوْذُبِكَ مِنَ الْخُبُثِ وَالْخَبَائِثِ", latin: "Allahumma inni a'udzubika minal khubutsi wal khabaitsi.", translation: "Ya Allah, aku berlindung kepada-Mu dari godaan setan jantan dan betina." },
    { id: 6, title: "Doa Keluar Kamar Mandi", arabic: "غُفْرَانَكَ الْحَمْدُ لِلّٰهِ الَّذِيْ أَذْهَبَ عَنِّي الْأَذَى وَعَافَانِيْ", latin: "Ghufranaka. Alhamdulillahilladzi adzhaba 'annil adza wa 'afani.", translation: "Dengan mengharap ampunan-Mu, segala puji milik Allah yang telah menghilangkan kotoran dari badanku dan yang telah menyejahterakan." },
    { id: 7, title: "Doa Keluar Rumah", arabic: "بِسْمِ اللهِ تَوَكَّلْتُ عَلَى اللهِ، لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ", latin: "Bismillahi, tawakkaltu 'alallah, laa haula wa laa quwwata illaa billaah.", translation: "Dengan nama Allah, aku bertawakal kepada Allah. Tiada daya dan kekuatan kecuali dengan Allah." },
    { id: 8, title: "Doa Minum Obat", arabic: "بِسْمِ اللهِ الشَّافِى", latin: "Bismillahisy syaafii.", translation: "Dengan nama Allah Yang Maha Menyembuhkan." },
    { id: 9, title: "Doa Meminta Kesembuhan", arabic: "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ، اشْفِ وَأَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا", latin: "Allahumma rabban-nasi, adzhibil-ba’sa, isyfi, wa antas-syafi, la syifa’a illa syifa’uka, syifa’an la yughadiru saqaman.", translation: "Ya Allah, Tuhan manusia, hilangkanlah penyakit dan sembuhkanlah. Engkaulah Maha Penyembuh, tidak ada kesembuhan selain kesembuhan-Mu, kesembuhan yang tidak meninggalkan penyakit." },
    { id: 10, title: "Doa Sebelum Wudhu", arabic: "بِسْمِ اللهِ", latin: "Bismillah.", translation: "Dengan menyebut nama Allah." },
    { id: 11, title: "Doa Sesudah Wudhu", arabic: "أَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيْكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُوْلُهُ. اللَّهُمَّ اجْعَلْنِيْ مِنَ التَّوَّابِيْنَ وَاجْعَلْنِيْ مِنَ الْمُتَطَهِّرِيْنَ", latin: "Asyhadu an laa ilaaha illallaahu wahdahuu laa syariika lah, wa asyhadu anna muhammadan 'abduhuu wa rasuuluh. Allaahummaj'alnii minat tawwaabiina waj'alnii minal mutathahhiriin.", translation: "Aku bersaksi bahwa tiada Tuhan selain Allah Yang Esa, tiada sekutu bagi-Nya, dan aku bersaksi bahwa Muhammad adalah hamba dan utusan-Nya. Ya Allah, jadikanlah aku termasuk orang-orang yang bertaubat dan jadikanlah aku termasuk orang-orang yang mensucikan diri." },
    { id: 12, title: "Dzikir Setelah Sholat Fardhu", arabic: "أَسْتَغْفِرُ اللهَ (x3) اللَّهُمَّ أَنْتَ السَّلاَمُ، وَمِنْكَ السَّلاَمُ، تَبَارَكْتَ يَا ذَا الْجَلاَلِ وَالْإِكْرَامِ", latin: "Astaghfirullah (3x). Allahumma antas salaam wa minkas salaam tabaarakta yaa dzal jalaali wal ikraam.", translation: "Aku memohon ampun kepada Allah (3x). Ya Allah, Engkau adalah Maha Pemberi Keselamatan, dan dari-Mu lah keselamatan, Maha Suci Engkau, wahai Tuhan Yang Pemilik Keagungan dan Kemuliaan." },
    { id: 13, title: "Doa Untuk Kedua Orang Tua", arabic: "رَبِّ اغْفِرْ لِي وَلِوَالِدَيَّ وَارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا", latin: "Rabbighfirlii wa liwaalidayya warhamhumaa kamaa robbayaanii shoghiiroo.", translation: "Ya Tuhanku, ampunilah dosaku dan dosa kedua orang tuaku, dan sayangilah mereka sebagaimana mereka menyayangiku di waktu kecil." },
    { id: 14, title: "Doa Memohon Ilmu Bermanfaat", arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا", latin: "Allahumma inni as'aluka 'ilman naafi'an, wa rizqon thoyyiban, wa 'amalan mutaqobbalan.", translation: "Ya Allah, sesungguhnya aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima." },
    {
        id: 15,
        title: "Do'a Memulai Bekerja",
        arabic: "بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ\n\nأَشْهَدُ أَنْ لَا إِلٰهَ إِلَّا اللهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا رَسُوْلُ اللهِ\n\nرَضِيْتُ بِاللهِ رَبًّا وَبِالْإِسْلَامِ دِيْنًا وَبِمُحَمَّدٍ نَبِيًّا وَرَسُوْلًا\n\nرَبِّ اشْرَحْ لِيْ صَدْرِيْ وَيَسِّرْ لِيْ أَمْرِيْ وَاحْلُلْ عُقْدَةً مِّنْ لِّسَانِيْ يَفْقَهُوْا قَوْلِيْ\n\nاَللّٰهُمَّ إِنِّىْ أَسْأَلُكَ مِنْ خَيْرِ هٰذَا الْعَمَلِ وَخَيْرِ مَا فِيْهِ وَخَيْرِ مَا أُرْسِلْتُ بِهِ، وَأَعُوْذُبِكَ مِنْ شَرِّهِ وَشَرِّ مَا فِيْهِ وَشَرِّ مَا أُرْسِلْتُ بِهِ، إِنَّكَ عَلٰى كُلِّ شَيْءٍ قَدِيْرٌ\n\nاَللّٰهُمَّ أَحْسِنْ عَاقِبَتَنَا فِي الْأُمُوْرِ كُلِّهَا وَأَجِرْنَا مِنْ خِزْيِ الدُّنْيَا وَعَذَابِ الْآخِرَةِ",
        latin: "Bismillaahirrohmaanirrohiim.\n\nAsyhadu Allaa ilaaha illallooh wa asyhadu anna Muhammadar rasuululloh.\n\nRodhiitu billaahi robbaa wabil islaami diinaa wabi Muhammadin nabiyyaa wa rasuulaa.\n\nRobbisy-rahlii shodrii wa yassirlii amrii wahlul ‘uqdatammillisaanii yafqohuu qoulii.\n\nAlloohumma innii as-aluka min khoiri hadzal ‘amali wa khoiri maa fihi, wa a‘uudzu bika min syarri hadzal ‘amali wa syarri maa fihi innaka ‘ala kulli syai-in qodiir.\n\nAlloohumma ahsin ‘aaqibatanaa fil-umuur kullihaa wa ajirnaa min khiz-yid dunyaa wa ‘adzaabil aakhirah.",
        translation: "Dengan menyebut nama Allah Yang Maha Pengasih lagi Maha Penyayang.\n\nAku bersaksi bahwa tiada Tuhan selain Allah, dan aku bersaksi bahwa Muhammad adalah rasul (utusan) Allah.\n\nAku rela Allah sebagai Tuhanku, Islam sebagai agamaku dan Muhammad sebagai Nabi dan utusan Allah.\n\nYa Tuhanku, lapangkanlah dadaku dan mudahkanlah untukku urusanku, dan lepaskanlah kekakuanku dari lidahku, agar mereka mengerti perkataanku.\n\nYa Allah, aku memohon kepada-Mu kebaikan pekerjaan ini dan segala kebaikan yang ada di dalamnya, dan aku berlindung kepada-Mu daripada keburukan pekerjaan ini dan segala keburukan yang ada di dalamnya, sesungguhnya Engkau-lah yang Maha Berkuasa menentukannya.\n\nYa Allah, perbaikilah hasil setiap urusan kami semuanya, dan hindarkanlah kami dari kehinaan dunia dan siksaan akhirat."
    },
    { id: 16, title: "Doa Naik Kendaraan", arabic: "سُبْحَانَ الَّذِىْ سَخَّرَلَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِيْنَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُوْنَ", latin: "Subhanalladzi sakhara lana hadza wa ma kunna lahu muqrinin, wa inna ila rabbina lamunqalibun.", translation: "Maha Suci Allah yang telah menundukkan semua ini bagi kami padahal kami sebelumnya tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami." },
    { id: 17, title: "Doa Masuk Masjid", arabic: "اَللّٰهُمَّ افْتَحْ لِيْ أَبْوَابَ رَحْمَتِكَ", latin: "Allahummaftah li abwaba rahmatik.", translation: "Ya Allah, bukalah untukku pintu-pintu rahmat-Mu." },
    { id: 18, title: "Doa Keluar Masjid", arabic: "اَللّٰهُمَّ إِنِّيْ أَسْأَلُكَ مِنْ فَضْلِكَ", latin: "Allahumma inni as-aluka min fadhlika.", translation: "Ya Allah, sesungguhnya aku memohon kepada-Mu akan karunia-Mu." },
    { id: 19, title: "Doa Bercermin", arabic: "اَللّٰهُمَّ كَمَا حَسَّنْتَ خَلْقِيْ فَحَسِّنْ خُلُقِيْ", latin: "Allahumma kama hassanta khalqi fahassin khuluqi.", translation: "Ya Allah, sebagaimana Engkau telah membaguskan penciptaanku, maka baguskanlah pula akhlakku." },
    { id: 20, title: "Doa Berpakaian", arabic: "اَلْحَمْدُ لِلّٰهِ الَّذِيْ كَسَانِيْ هَذَا الثَّوْبَ وَرَزَقَنِيْهِ مِنْ غَيْرِ حَوْلٍ مِنِّيْ وَلَا قُوَّةٍ", latin: "Alhamdulillahilladzi kasani hadzats tsauba wa razaqanihi min ghairi haulin minni wa la quwwatin.", translation: "Segala puji bagi Allah yang telah memakaikan pakaian ini kepadaku dan mengaruniakannya kepadaku tanpa daya dan kekuatan dariku." },
    { id: 21, title: "Doa Sapu Jagat (Kebaikan Dunia Akhirat)", arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", latin: "Rabbana atina fid dunya hasanah wa fil akhirati hasanah wa qina 'adzaban nar.", translation: "Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat dan peliharalah kami dari siksa neraka." },
    { id: 22, title: "Doa Ketika Turun Hujan", arabic: "اَللّٰهُمَّ صَيِّبًا نَافِعًا", latin: "Allahumma shayyiban nafi'an.", translation: "Ya Allah, turunkanlah pada kami hujan yang bermanfaat." },
    { id: 23, title: "Doa Menjenguk Orang Sakit", arabic: "لَا بَأْسَ طَهُوْرٌ إِنْ شَاءَ اللهُ", latin: "La ba'sa thahurun insya Allah.", translation: "Tidak mengapa, semoga sakitmu ini membuat dosamu bersih, Insya Allah." },
    { id: 24, title: "Sayyidul Istighfar", arabic: "اَللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ", latin: "Allahumma anta rabbii laa ilaaha illa anta khalaqtanii wa anaa 'abduka wa anaa 'alaa 'ahdika wa wa'dika mastatha'tu. A'uudzu bika min syarri maa shana'tu. Abuu-u laka bini'matika 'alayya wa abuu-u bidzanbii faghfirlii fa-innahu laa yaghfirudz dzunuuba illa anta.", translation: "Ya Allah, Engkau adalah Tuhanku, tidak ada Tuhan selain Engkau. Engkau telah menciptakanku dan aku adalah hamba-Mu. Aku yakin dengan janji-janji-Mu semampuku. Aku berlindung kepada-Mu dari kejelekan yang aku perbuat. Aku mengakui nikmat-Mu kepadaku dan aku mengakui dosaku kepada-Mu. Maka ampunilah aku, sesungguhnya tidak ada yang dapat mengampuni dosa kecuali Engkau." },
];

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'tahajud-streak-3',
        name: 'Pejuang Malam I',
        description: 'Melaksanakan sholat Tahajud selama 3 hari berturut-turut.',
        icon: 'MoonIcon',
        criteria: {
            type: 'streak',
            entityId: 'tahajud-default',
            count: 3
        }
    },
    {
        id: 'tahajud-streak-7',
        name: 'Pejuang Malam II',
        description: 'Melaksanakan sholat Tahajud selama 7 hari berturut-turut.',
        icon: 'MoonIcon',
        criteria: {
            type: 'streak',
            entityId: 'tahajud-default',
            count: 7
        }
    },
    {
        id: 'dhuha-streak-3',
        name: 'Pembuka Rezeki I',
        description: 'Melaksanakan sholat Dhuha selama 3 hari berturut-turut.',
        icon: 'SparklesIcon',
        criteria: {
            type: 'streak',
            entityId: 'dhuha-default',
            count: 3
        }
    },
    {
        id: 'dhuha-streak-7',
        name: 'Pembuka Rezeki II',
        description: 'Melaksanakan sholat Dhuha selama 7 hari berturut-turut.',
        icon: 'SparklesIcon',
        criteria: {
            type: 'streak',
            entityId: 'dhuha-default',
            count: 7
        }
    },
    {
        id: 'subuh-jamaah-streak-7',
        name: 'Pejuang Subuh',
        description: 'Melaksanakan sholat Subuh (berjamaah/tepat waktu) selama 7 hari berturut-turut.',
        icon: 'SunIcon',
        criteria: {
            type: 'streak',
            entityId: 'subuh',
            count: 7
        }
    },
    {
        id: 'puasa-senin-kamis-4',
        name: 'Istiqomah Sunnah',
        description: 'Melaksanakan Puasa Senin & Kamis selama 4 pekan berturut-turut (total 8 puasa).',
        icon: 'FastingIcon',
        criteria: {
            type: 'streak', // This is a bit of a hack, the logic will need to be custom
            entityId: 'puasa-senin-kamis', // Placeholder ID
            count: 8
        }
    },
];
