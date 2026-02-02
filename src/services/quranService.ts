import type { Surah, SurahDetail } from '../types';

const QURAN_API_BASE_URL = 'https://equran.id/api/v2';

const SURAHS: Surah[] = [
    {
        "nomor": 1,
        "nama": "سُورَةُ ٱلْفَاتِحَةِ",
        "namaLatin": "Al-Fatihah",
        "jumlahAyat": 7,
        "tempatTurun": "Mekah",
        "arti": "Pembukaan",
        "deskripsi": "Surat ini dinamakan Al-Fatihah (Pembukaan) karena dengan surat inilah dibuka dan dimulainya Al-Qur'an. Dinamakan Ummul Qur'an (induk Al-Qur'an) atau Ummul Kitab (induk Al-Kitab) karena dia merupakan induk dari semua isi Al-Qur'an. Dinamakan pula As Sab'ul Matsaani (tujuh yang berulang-ulang) karena jumlah ayatnya yang tujuh dan dibaca berulang-ulang dalam shalat.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/001.mp3",
            "02": "https://server8.mp3quran.net/husr/001.mp3",
            "03": "https://server10.mp3quran.net/ajm/001.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/001.mp3",
            "05": "https://server11.mp3quran.net/shatri/001.mp3"
        }
    },
    {
        "nomor": 2,
        "nama": "سُورَةُ البَقَرَةِ",
        "namaLatin": "Al-Baqarah",
        "jumlahAyat": 286,
        "tempatTurun": "Madinah",
        "arti": "Sapi Betina",
        "deskripsi": "Surat ini dinamakan Al-Baqarah karena di dalamnya disebutkan kisah penyembelihan sapi betina yang diperintahkan Allah kepada Bani Israil (ayat 67-74). Surat ini merupakan surat yang terpanjang di dalam Al-Qur'an.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/002.mp3",
            "02": "https://server8.mp3quran.net/husr/002.mp3",
            "03": "https://server10.mp3quran.net/ajm/002.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/002.mp3",
            "05": "https://server11.mp3quran.net/shatri/002.mp3"
        }
    },
    {
        "nomor": 3,
        "nama": "سُورَةُ آلِ عِمۡرَانَ",
        "namaLatin": "Ali 'Imran",
        "jumlahAyat": 200,
        "tempatTurun": "Madinah",
        "arti": "Keluarga Imran",
        "deskripsi": "Surat ini dinamakan Ali 'Imran karena memuat kisah keluarga 'Imran yang di dalam kisah itu disebutkan kelahiran Nabi Isa, persamaan kejadiannya dengan Nabi Adam, kenabian dan beberapa mukjizatnya, serta kelahiran Maryam binti 'Imran, ibu dari Nabi Isa.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/003.mp3",
            "02": "https://server8.mp3quran.net/husr/003.mp3",
            "03": "https://server10.mp3quran.net/ajm/003.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/003.mp3",
            "05": "https://server11.mp3quran.net/shatri/003.mp3"
        }
    },
    {
        "nomor": 4,
        "nama": "سُورَةُ النِّسَاءِ",
        "namaLatin": "An-Nisa'",
        "jumlahAyat": 176,
        "tempatTurun": "Madinah",
        "arti": "Wanita",
        "deskripsi": "Surat ini dinamakan An-Nisa' (Wanita) karena dalam surat ini banyak dibicarakan hal-hal yang berhubungan dengan wanita serta merupakan surat yang paling banyak membicarakan hal itu dibanding dengan surat-surat yang lain.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/004.mp3",
            "02": "https://server8.mp3quran.net/husr/004.mp3",
            "03": "https://server10.mp3quran.net/ajm/004.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/004.mp3",
            "05": "https://server11.mp3quran.net/shatri/004.mp3"
        }
    },
    {
        "nomor": 5,
        "nama": "سُورَةُ المَائـِدَةِ",
        "namaLatin": "Al-Ma'idah",
        "jumlahAyat": 120,
        "tempatTurun": "Madinah",
        "arti": "Hidangan",
        "deskripsi": "Surat ini dinamakan Al-Ma'idah (Hidangan) karena memuat kisah para pengikut setia Nabi Isa yang meminta kepada Nabi Isa agar Allah menurunkan untuk mereka Al-Ma'idah (hidangan makanan) dari langit (ayat 112).",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/005.mp3",
            "02": "https://server8.mp3quran.net/husr/005.mp3",
            "03": "https://server10.mp3quran.net/ajm/005.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/005.mp3",
            "05": "https://server11.mp3quran.net/shatri/005.mp3"
        }
    },
    {
        "nomor": 6,
        "nama": "سُورَةُ الأَنۡعَامِ",
        "namaLatin": "Al-An'am",
        "jumlahAyat": 165,
        "tempatTurun": "Mekah",
        "arti": "Binatang Ternak",
        "deskripsi": "Surat ini dinamakan Al-An'am (Binatang Ternak) karena di dalamnya disebut kata An'am dalam hubungan dengan adat-istiadat kaum musyrik, yang menurut mereka binatang-binatang ternak itu dapat dipergunakan untuk mendekatkan diri kepada tuhan mereka.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/006.mp3",
            "02": "https://server8.mp3quran.net/husr/006.mp3",
            "03": "https://server10.mp3quran.net/ajm/006.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/006.mp3",
            "05": "https://server11.mp3quran.net/shatri/006.mp3"
        }
    },
    {
        "nomor": 7,
        "nama": "سُورَةُ الأَعۡرَافِ",
        "namaLatin": "Al-A'raf",
        "jumlahAyat": 206,
        "tempatTurun": "Mekah",
        "arti": "Tempat Tertinggi",
        "deskripsi": "Surat ini dinamakan Al-A'raf karena perkataan Al-A'raf terdapat dalam ayat 46 yang mengemukakan tentang keadaan orang-orang yang berada di atas Al-A'raf, yaitu tempat yang tertinggi di antara surga dan neraka.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/007.mp3",
            "02": "https://server8.mp3quran.net/husr/007.mp3",
            "03": "https://server10.mp3quran.net/ajm/007.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/007.mp3",
            "05": "https://server11.mp3quran.net/shatri/007.mp3"
        }
    },
    {
        "nomor": 8,
        "nama": "سُورَةُ الأَنفَالِ",
        "namaLatin": "Al-Anfal",
        "jumlahAyat": 75,
        "tempatTurun": "Madinah",
        "arti": "Harta Rampasan Perang",
        "deskripsi": "Surat ini dinamakan Al-Anfal (Harta Rampasan Perang) karena kata Al-Anfal terdapat pada permulaan surat ini dan juga persoalan yang menonjol dalam surat ini ialah tentang harta rampasan perang, hukum perang dan hal-hal yang berhubungan dengan peperangan pada umumnya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/008.mp3",
            "02": "https://server8.mp3quran.net/husr/008.mp3",
            "03": "https://server10.mp3quran.net/ajm/008.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/008.mp3",
            "05": "https://server11.mp3quran.net/shatri/008.mp3"
        }
    },
    {
        "nomor": 9,
        "nama": "سُورَةُ التَّوۡبَةِ",
        "namaLatin": "At-Taubah",
        "jumlahAyat": 129,
        "tempatTurun": "Madinah",
        "arti": "Pengampunan",
        "deskripsi": "Surat ini dinamakan At-Taubah (Pengampunan) karena kata At-Taubah banyak berulang dalam surat ini. Dinamakan juga dengan Bara'ah (Berlepas Diri) yang merupakan kata pertama dari surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/009.mp3",
            "02": "https://server8.mp3quran.net/husr/009.mp3",
            "03": "https://server10.mp3quran.net/ajm/009.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/009.mp3",
            "05": "https://server11.mp3quran.net/shatri/009.mp3"
        }
    },
    {
        "nomor": 10,
        "nama": "سُورَةُ يُونُسَ",
        "namaLatin": "Yunus",
        "jumlahAyat": 109,
        "tempatTurun": "Mekah",
        "arti": "Nabi Yunus",
        "deskripsi": "Surat ini dinamakan surat Yunus karena dalam surat ini terdapat kisah Nabi Yunus dan pengikut-pengikutnya yang teguh imannya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/010.mp3",
            "02": "https://server8.mp3quran.net/husr/010.mp3",
            "03": "https://server10.mp3quran.net/ajm/010.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/010.mp3",
            "05": "https://server11.mp3quran.net/shatri/010.mp3"
        }
    },
    {
        "nomor": 11,
        "nama": "سُورَةُ هُودٍ",
        "namaLatin": "Hud",
        "jumlahAyat": 123,
        "tempatTurun": "Mekah",
        "arti": "Nabi Hud",
        "deskripsi": "Surat ini dinamakan surat Hud karena dalam surat ini terdapat kisah Nabi Hud dan kaumnya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/011.mp3",
            "02": "https://server8.mp3quran.net/husr/011.mp3",
            "03": "https://server10.mp3quran.net/ajm/011.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/011.mp3",
            "05": "https://server11.mp3quran.net/shatri/011.mp3"
        }
    },
    {
        "nomor": 12,
        "nama": "سُورَةُ يُوسُفَ",
        "namaLatin": "Yusuf",
        "jumlahAyat": 111,
        "tempatTurun": "Mekah",
        "arti": "Nabi Yusuf",
        "deskripsi": "Surat ini dinamakan surat Yusuf adalah karena titik berat dari isinya mengenai riwayat Nabi Yusuf.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/012.mp3",
            "02": "https://server8.mp3quran.net/husr/012.mp3",
            "03": "https://server10.mp3quran.net/ajm/012.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/012.mp3",
            "05": "https://server11.mp3quran.net/shatri/012.mp3"
        }
    },
    {
        "nomor": 13,
        "nama": "سُورَةُ الرَّعۡدِ",
        "namaLatin": "Ar-Ra'd",
        "jumlahAyat": 43,
        "tempatTurun": "Madinah",
        "arti": "Guruh",
        "deskripsi": "Surat ini dinamakan Ar-Ra'd (Guruh) karena dalam ayat 13 Allah berfirman yang artinya 'Dan guruh itu bertasbih sambil memuji-Nya', yang menunjukkan sifat kesucian dan kesempurnaan Allah.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/013.mp3",
            "02": "https://server8.mp3quran.net/husr/013.mp3",
            "03": "https://server10.mp3quran.net/ajm/013.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/013.mp3",
            "05": "https://server11.mp3quran.net/shatri/013.mp3"
        }
    },
    {
        "nomor": 14,
        "nama": "سُورَةُ إِبۡرَاهِيمَ",
        "namaLatin": "Ibrahim",
        "jumlahAyat": 52,
        "tempatTurun": "Mekah",
        "arti": "Nabi Ibrahim",
        "deskripsi": "Surat ini dinamakan Ibrahim karena surat ini mengandung doa Nabi Ibrahim (ayat 35-41).",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/014.mp3",
            "02": "https://server8.mp3quran.net/husr/014.mp3",
            "03": "https://server10.mp3quran.net/ajm/014.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/014.mp3",
            "05": "https://server11.mp3quran.net/shatri/014.mp3"
        }
    },
    {
        "nomor": 15,
        "nama": "سُورَةُ الحِجۡرِ",
        "namaLatin": "Al-Hijr",
        "jumlahAyat": 99,
        "tempatTurun": "Mekah",
        "arti": "Hijr",
        "deskripsi": "Surat ini dinamakan Al-Hijr karena di dalamnya terdapat kisah penduduk Al-Hijr, yaitu kaum Tsamud yang telah dihancurkan Allah karena mendustakan Nabi Shaleh dan berpaling dari ayat-ayat Allah.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/015.mp3",
            "02": "https://server8.mp3quran.net/husr/015.mp3",
            "03": "https://server10.mp3quran.net/ajm/015.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/015.mp3",
            "05": "https://server11.mp3quran.net/shatri/015.mp3"
        }
    },
    {
        "nomor": 16,
        "nama": "سُورَةُ النَّحۡلِ",
        "namaLatin": "An-Nahl",
        "jumlahAyat": 128,
        "tempatTurun": "Mekah",
        "arti": "Lebah",
        "deskripsi": "Surat ini dinamakan An-Nahl yang berarti lebah karena di dalamnya, terdapat firman Allah SWT ayat 68 yang artinya 'Dan Tuhanmu mewahyukan kepada lebah'.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/016.mp3",
            "02": "https://server8.mp3quran.net/husr/016.mp3",
            "03": "https://server10.mp3quran.net/ajm/016.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/016.mp3",
            "05": "https://server11.mp3quran.net/shatri/016.mp3"
        }
    },
    {
        "nomor": 17,
        "nama": "سُورَةُ الإِسۡرَاءِ",
        "namaLatin": "Al-Isra'",
        "jumlahAyat": 111,
        "tempatTurun": "Mekah",
        "arti": "Perjalanan Malam",
        "deskripsi": "Surat ini dinamakan Al-Isra' (Perjalanan Malam) karena surat ini dimulai dengan penyebutan peristiwa Isra'. Surat ini dinamakan juga dengan Bani Israil karena di permulaan surat ini disebutkan tentang Bani Israil.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/017.mp3",
            "02": "https://server8.mp3quran.net/husr/017.mp3",
            "03": "https://server10.mp3quran.net/ajm/017.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/017.mp3",
            "05": "https://server11.mp3quran.net/shatri/017.mp3"
        }
    },
    {
        "nomor": 18,
        "nama": "سُورَةُ الكَهۡفِ",
        "namaLatin": "Al-Kahf",
        "jumlahAyat": 110,
        "tempatTurun": "Mekah",
        "arti": "Gua",
        "deskripsi": "Surat ini dinamakan Al-Kahf (Gua) karena di dalamnya terdapat kisah Ashabul Kahfi (penghuni-penghuni gua).",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/018.mp3",
            "02": "https://server8.mp3quran.net/husr/018.mp3",
            "03": "https://server10.mp3quran.net/ajm/018.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/018.mp3",
            "05": "https://server11.mp3quran.net/shatri/018.mp3"
        }
    },
    {
        "nomor": 19,
        "nama": "سُورَةُ مَرۡيَمَ",
        "namaLatin": "Maryam",
        "jumlahAyat": 98,
        "tempatTurun": "Mekah",
        "arti": "Maryam",
        "deskripsi": "Surat ini dinamakan Maryam, karena surat ini mengandung kisah Maryam, ibu Nabi Isa a.s.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/019.mp3",
            "02": "https://server8.mp3quran.net/husr/019.mp3",
            "03": "https://server10.mp3quran.net/ajm/019.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/019.mp3",
            "05": "https://server11.mp3quran.net/shatri/019.mp3"
        }
    },
    {
        "nomor": 20,
        "nama": "سُورَةُ طه",
        "namaLatin": "Taha",
        "jumlahAyat": 135,
        "tempatTurun": "Mekah",
        "arti": "Taha",
        "deskripsi": "Surat ini dinamakan Taha, diambil dari ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/020.mp3",
            "02": "https://server8.mp3quran.net/husr/020.mp3",
            "03": "https://server10.mp3quran.net/ajm/020.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/020.mp3",
            "05": "https://server11.mp3quran.net/shatri/020.mp3"
        }
    },
    {
        "nomor": 21,
        "nama": "سُورَةُ الأَنبِيَاءِ",
        "namaLatin": "Al-Anbiya'",
        "jumlahAyat": 112,
        "tempatTurun": "Mekah",
        "arti": "Para Nabi",
        "deskripsi": "Surat ini dinamakan Al-Anbiya' (Nabi-Nabi), karena surat ini mengutarakan kisah beberapa orang nabi.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/021.mp3",
            "02": "https://server8.mp3quran.net/husr/021.mp3",
            "03": "https://server10.mp3quran.net/ajm/021.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/021.mp3",
            "05": "https://server11.mp3quran.net/shatri/021.mp3"
        }
    },
    {
        "nomor": 22,
        "nama": "سُورَةُ الحَجِّ",
        "namaLatin": "Al-Hajj",
        "jumlahAyat": 78,
        "tempatTurun": "Madinah",
        "arti": "Haji",
        "deskripsi": "Surat ini dinamakan Al-Hajj, karena isinya mengemukakan hal-hal yang berhubungan dengan ibadah haji, seperti ihram, thawaf, sa'i, wuquf di Arafah, mencukur rambut, syi'ar-syi'ar Allah, faedah-faedah dan hikmah-hikmah disyari'atkannya haji.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/022.mp3",
            "02": "https://server8.mp3quran.net/husr/022.mp3",
            "03": "https://server10.mp3quran.net/ajm/022.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/022.mp3",
            "05": "https://server11.mp3quran.net/shatri/022.mp3"
        }
    },
    {
        "nomor": 23,
        "nama": "سُورَةُ المُؤۡمِنُونَ",
        "namaLatin": "Al-Mu'minun",
        "jumlahAyat": 118,
        "tempatTurun": "Mekah",
        "arti": "Orang-Orang Mukmin",
        "deskripsi": "Surat ini dinamakan Al-Mu'minun, karena permulaan surat ini menerangkan sifat-sifat orang-orang mukmin yang menyebabkan keberuntungan mereka di akhirat dan ketenteraman jiwa mereka di dunia.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/023.mp3",
            "02": "https://server8.mp3quran.net/husr/023.mp3",
            "03": "https://server10.mp3quran.net/ajm/023.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/023.mp3",
            "05": "https://server11.mp3quran.net/shatri/023.mp3"
        }
    },
    {
        "nomor": 24,
        "nama": "سُورَةُ النُّورِ",
        "namaLatin": "An-Nur",
        "jumlahAyat": 64,
        "tempatTurun": "Madinah",
        "arti": "Cahaya",
        "deskripsi": "Surat ini dinamakan An-Nur, yaitu Cahaya, diambil dari kata An-Nur yang terdapat pada ayat ke 35. Dalam ayat ini, Allah s.w.t. menjelaskan tentang Nur Ilahi, yakni Al-Qur'an yang mengandung petunjuk-petunjuk. Petunjuk-petunjuk Allah itu, merupakan cahaya yang terang benderang menerangi alam semesta.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/024.mp3",
            "02": "https://server8.mp3quran.net/husr/024.mp3",
            "03": "https://server10.mp3quran.net/ajm/024.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/024.mp3",
            "05": "https://server11.mp3quran.net/shatri/024.mp3"
        }
    },
    {
        "nomor": 25,
        "nama": "سُورَةُ الفُرۡقَانِ",
        "namaLatin": "Al-Furqan",
        "jumlahAyat": 77,
        "tempatTurun": "Mekah",
        "arti": "Pembeda",
        "deskripsi": "Surat ini dinamakan Al-Furqan, yang artinya pembeda, diambil dari kata Al-Furqan yang terdapat pada ayat pertama surat ini. Yang dimaksud dengan Al-Furqan dalam ayat ini ialah Al-Qur'an.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/025.mp3",
            "02": "https://server8.mp3quran.net/husr/025.mp3",
            "03": "https://server10.mp3quran.net/ajm/025.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/025.mp3",
            "05": "https://server11.mp3quran.net/shatri/025.mp3"
        }
    },
    {
        "nomor": 26,
        "nama": "سُورَةُ الشُّعَرَاءِ",
        "namaLatin": "Asy-Syu'ara'",
        "jumlahAyat": 227,
        "tempatTurun": "Mekah",
        "arti": "Para Penyair",
        "deskripsi": "Surat ini dinamakan Asy Syu'araa' (kata jamak dari Asy Sya'ir yang berarti penyair), diambil dari kata Asy Syuaraa' yang terdapat pada ayat 224.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/026.mp3",
            "02": "https://server8.mp3quran.net/husr/026.mp3",
            "03": "https://server10.mp3quran.net/ajm/026.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/026.mp3",
            "05": "https://server11.mp3quran.net/shatri/026.mp3"
        }
    },
    {
        "nomor": 27,
        "nama": "سُورَةُ النَّمۡلِ",
        "namaLatin": "An-Naml",
        "jumlahAyat": 93,
        "tempatTurun": "Mekah",
        "arti": "Semut",
        "deskripsi": "Surat ini disebut dengan An Naml yang berarti semut, karena pada ayat 18 dan 19 terdapat perkataan An Naml (semut), di mana raja semut mengatakan kepada anak buahnya agar masuk sarangnya masing-masing, supaya jangan terpijak oleh Nabi Sulaiman dan tentaranya yang akan lalu di tempat itu.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/027.mp3",
            "02": "https://server8.mp3quran.net/husr/027.mp3",
            "03": "https://server10.mp3quran.net/ajm/027.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/027.mp3",
            "05": "https://server11.mp3quran.net/shatri/027.mp3"
        }
    },
    {
        "nomor": 28,
        "nama": "سُورَةُ القَصَصِ",
        "namaLatin": "Al-Qasas",
        "jumlahAyat": 88,
        "tempatTurun": "Mekah",
        "arti": "Kisah-Kisah",
        "deskripsi": "Surat ini dinamakan Al Qashash (cerita-cerita) karena salah satu kata dari ayat 25 surat ini menceritakan tentang kisah Nabi Musa dengan Nabi Syu'aib.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/028.mp3",
            "02": "https://server8.mp3quran.net/husr/028.mp3",
            "03": "https://server10.mp3quran.net/ajm/028.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/028.mp3",
            "05": "https://server11.mp3quran.net/shatri/028.mp3"
        }
    },
    {
        "nomor": 29,
        "nama": "سُورَةُ العَنكَبُوتِ",
        "namaLatin": "Al-'Ankabut",
        "jumlahAyat": 69,
        "tempatTurun": "Mekah",
        "arti": "Laba-Laba",
        "deskripsi": "Surat ini dinamakan Al 'Ankabuut berhubung terdapatnya kata 'Al 'Ankabuut' dalam surat ini ayat 41, di mana Allah mengumpamakan para penyembah berhala-berhala itu dengan laba-laba yang membuat rumah yang serapuh-rapuhnya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/029.mp3",
            "02": "https://server8.mp3quran.net/husr/029.mp3",
            "03": "https://server10.mp3quran.net/ajm/029.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/029.mp3",
            "05": "https://server11.mp3quran.net/shatri/029.mp3"
        }
    },
    {
        "nomor": 30,
        "nama": "سُورَةُ الرُّومِ",
        "namaLatin": "Ar-Rum",
        "jumlahAyat": 60,
        "tempatTurun": "Mekah",
        "arti": "Bangsa Romawi",
        "deskripsi": "Surat ini dinamakan Ar Ruum karena pada permulaan surat ini, yaitu ayat 2, 3 dan 4 terdapat pemberitaan bangsa Rumawi yang pada mulanya dikalahkan oleh bangsa Persia, tetapi setelah beberapa tahun kemudian kerajaan Rumawi dapat menuntut balas dan mengalahkan kerajaan Persia kembali.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/030.mp3",
            "02": "https://server8.mp3quran.net/husr/030.mp3",
            "03": "https://server10.mp3quran.net/ajm/030.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/030.mp3",
            "05": "https://server11.mp3quran.net/shatri/030.mp3"
        }
    },
    {
        "nomor": 31,
        "nama": "سُورَةُ لُقۡمَانَ",
        "namaLatin": "Luqman",
        "jumlahAyat": 34,
        "tempatTurun": "Mekah",
        "arti": "Luqman",
        "deskripsi": "Surat ini dinamakan Luqman karena surat ini menuturkan kisah Luqman tentang nasehat-nasehat yang diberikan kepada anaknya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/031.mp3",
            "02": "https://server8.mp3quran.net/husr/031.mp3",
            "03": "https://server10.mp3quran.net/ajm/031.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/031.mp3",
            "05": "https://server11.mp3quran.net/shatri/031.mp3"
        }
    },
    {
        "nomor": 32,
        "nama": "سُورَةُ السَّجۡدَةِ",
        "namaLatin": "As-Sajdah",
        "jumlahAyat": 30,
        "tempatTurun": "Mekah",
        "arti": "Sujud",
        "deskripsi": "Surat ini dinamakan As Sajdah berhubung pada surat ini terdapat ayat sajdah, yaitu ayat yang menyunatkan kita bersujud ketika membacanya atau mendengarnya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/032.mp3",
            "02": "https://server8.mp3quran.net/husr/032.mp3",
            "03": "https://server10.mp3quran.net/ajm/032.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/032.mp3",
            "05": "https://server11.mp3quran.net/shatri/032.mp3"
        }
    },
    {
        "nomor": 33,
        "nama": "سُورَةُ الأَحۡزَابِ",
        "namaLatin": "Al-Ahzab",
        "jumlahAyat": 73,
        "tempatTurun": "Madinah",
        "arti": "Golongan-Golongan yang Bersekutu",
        "deskripsi": "Surat ini dinamakan Al Ahzaab (golongan-golongan yang bersekutu), karena dalam surat ini terdapat beberapa ayat, yaitu ayat 9 sampai dengan ayat 27 yang berhubungan dengan peperangan Al Ahzaab, yaitu peperangan yang dilancarkan oleh orang-orang Yahudi, kaum munafik dan orang-orang musyrik terhadap orang-orang mukmin di Madinah.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/033.mp3",
            "02": "https://server8.mp3quran.net/husr/033.mp3",
            "03": "https://server10.mp3quran.net/ajm/033.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/033.mp3",
            "05": "https://server11.mp3quran.net/shatri/033.mp3"
        }
    },
    {
        "nomor": 34,
        "nama": "سُورَةُ سَبَإٍ",
        "namaLatin": "Saba'",
        "jumlahAyat": 54,
        "tempatTurun": "Mekah",
        "arti": "Kaum Saba'",
        "deskripsi": "Surat ini dinamakan Saba' karena didalamnya terdapat kisah kaum Saba'.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/034.mp3",
            "02": "https://server8.mp3quran.net/husr/034.mp3",
            "03": "https://server10.mp3quran.net/ajm/034.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/034.mp3",
            "05": "https://server11.mp3quran.net/shatri/034.mp3"
        }
    },
    {
        "nomor": 35,
        "nama": "سُورَةُ فَاطِرٍ",
        "namaLatin": "Fatir",
        "jumlahAyat": 45,
        "tempatTurun": "Mekah",
        "arti": "Pencipta",
        "deskripsi": "Surat ini dinamakan Faathir (Pencipta) karena pada ayat pertama Allah menyebutkan diri-Nya sebagai Faathir (Pencipta) langit dan bumi.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/035.mp3",
            "02": "https://server8.mp3quran.net/husr/035.mp3",
            "03": "https://server10.mp3quran.net/ajm/035.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/035.mp3",
            "05": "https://server11.mp3quran.net/shatri/035.mp3"
        }
    },
    {
        "nomor": 36,
        "nama": "سُورَةُ يسٓ",
        "namaLatin": "Yasin",
        "jumlahAyat": 83,
        "tempatTurun": "Mekah",
        "arti": "Yasin",
        "deskripsi": "Surat ini dinamakan Yaa Siin karena surat ini dimulai dengan dua abjad Yaa Siin.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/036.mp3",
            "02": "https://server8.mp3quran.net/husr/036.mp3",
            "03": "https://server10.mp3quran.net/ajm/036.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/036.mp3",
            "05": "https://server11.mp3quran.net/shatri/036.mp3"
        }
    },
    {
        "nomor": 37,
        "nama": "سُورَةُ الصَّافَّاتِ",
        "namaLatin": "As-Saffat",
        "jumlahAyat": 182,
        "tempatTurun": "Mekah",
        "arti": "Barisan-Barisan",
        "deskripsi": "Surat ini dinamakan Ash Shaaffaat (Yang Bershaf-Shaf), diambil dari kata serupa yang terletak pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/037.mp3",
            "02": "https://server8.mp3quran.net/husr/037.mp3",
            "03": "https://server10.mp3quran.net/ajm/037.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/037.mp3",
            "05": "https://server11.mp3quran.net/shatri/037.mp3"
        }
    },
    {
        "nomor": 38,
        "nama": "سُورَةُ صٓ",
        "namaLatin": "Sad",
        "jumlahAyat": 88,
        "tempatTurun": "Mekah",
        "arti": "Sad",
        "deskripsi": "Surat ini dinamakan Shaad karena surat ini dimulai dengan huruf Shaad.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/038.mp3",
            "02": "https://server8.mp3quran.net/husr/038.mp3",
            "03": "https://server10.mp3quran.net/ajm/038.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/038.mp3",
            "05": "https://server11.mp3quran.net/shatri/038.mp3"
        }
    },
    {
        "nomor": 39,
        "nama": "سُورَةُ الزُّمَرِ",
        "namaLatin": "Az-Zumar",
        "jumlahAyat": 75,
        "tempatTurun": "Mekah",
        "arti": "Rombongan-Rombongan",
        "deskripsi": "Surat ini dinamakan Az Zumar (Rombongan-rombongan) karena perkataan Az Zumar yang terdapat pada ayat 71 dan 73 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/039.mp3",
            "02": "https://server8.mp3quran.net/husr/039.mp3",
            "03": "https://server10.mp3quran.net/ajm/039.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/039.mp3",
            "05": "https://server11.mp3quran.net/shatri/039.mp3"
        }
    },
    {
        "nomor": 40,
        "nama": "سُورَةُ غَافِرٍ",
        "namaLatin": "Gafir",
        "jumlahAyat": 85,
        "tempatTurun": "Mekah",
        "arti": "Maha Pengampun",
        "deskripsi": "Surat ini dinamakan Ghafir (yang mengampuni), karena ada hubungannya dengan kata Ghafir yang terdapat pada ayat 3 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/040.mp3",
            "02": "https://server8.mp3quran.net/husr/040.mp3",
            "03": "https://server10.mp3quran.net/ajm/040.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/040.mp3",
            "05": "https://server11.mp3quran.net/shatri/040.mp3"
        }
    },
    {
        "nomor": 41,
        "nama": "سُورَةُ فُصِّلَتۡ",
        "namaLatin": "Fussilat",
        "jumlahAyat": 54,
        "tempatTurun": "Mekah",
        "arti": "Yang Dijelaskan",
        "deskripsi": "Surat ini dinamakan Fushshilat (Yang Dijelaskan) diambil dari perkataan Fushshilat yang terdapat pada permulaan surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/041.mp3",
            "02": "https://server8.mp3quran.net/husr/041.mp3",
            "03": "https://server10.mp3quran.net/ajm/041.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/041.mp3",
            "05": "https://server11.mp3quran.net/shatri/041.mp3"
        }
    },
    {
        "nomor": 42,
        "nama": "سُورَةُ الشُّورَىٰ",
        "namaLatin": "Asy-Syura",
        "jumlahAyat": 53,
        "tempatTurun": "Mekah",
        "arti": "Musyawarah",
        "deskripsi": "Surat ini dinamakan Asy Syuura (Musyawarat) diambil dari kata Syuura yang terdapat pada ayat 38 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/042.mp3",
            "02": "https://server8.mp3quran.net/husr/042.mp3",
            "03": "https://server10.mp3quran.net/ajm/042.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/042.mp3",
            "05": "https://server11.mp3quran.net/shatri/042.mp3"
        }
    },
    {
        "nomor": 43,
        "nama": "سُورَةُ الزُّخۡرُفِ",
        "namaLatin": "Az-Zukhruf",
        "jumlahAyat": 89,
        "tempatTurun": "Mekah",
        "arti": "Perhiasan",
        "deskripsi": "Surat ini dinamakan Az Zukhruf (Perhiasan) diambil dari perkataan Az Zukhruf yang terdapat pada ayat 35 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/043.mp3",
            "02": "https://server8.mp3quran.net/husr/043.mp3",
            "03": "https://server10.mp3quran.net/ajm/043.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/043.mp3",
            "05": "https://server11.mp3quran.net/shatri/043.mp3"
        }
    },
    {
        "nomor": 44,
        "nama": "سُورَةُ الدُّخَانِ",
        "namaLatin": "Ad-Dukhan",
        "jumlahAyat": 59,
        "tempatTurun": "Mekah",
        "arti": "Kabut",
        "deskripsi": "Surat ini dinamakan Ad Dukhaan (Kabut), diambil dari perkataan Ad Dukhaan yang terdapat pada ayat 10 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/044.mp3",
            "02": "https://server8.mp3quran.net/husr/044.mp3",
            "03": "https://server10.mp3quran.net/ajm/044.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/044.mp3",
            "05": "https://server11.mp3quran.net/shatri/044.mp3"
        }
    },
    {
        "nomor": 45,
        "nama": "سُورَةُ الجَاثِيَةِ",
        "namaLatin": "Al-Jasiyah",
        "jumlahAyat": 37,
        "tempatTurun": "Mekah",
        "arti": "Berlutut",
        "deskripsi": "Surat ini dinamakan Al Jaatsiyah (Yang Berlutut), diambil dari perkataan Jaatsiyah yang terdapat pada ayat 28 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/045.mp3",
            "02": "https://server8.mp3quran.net/husr/045.mp3",
            "03": "https://server10.mp3quran.net/ajm/045.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/045.mp3",
            "05": "https://server11.mp3quran.net/shatri/045.mp3"
        }
    },
    {
        "nomor": 46,
        "nama": "سُورَةُ الأَحۡقَافِ",
        "namaLatin": "Al-Ahqaf",
        "jumlahAyat": 35,
        "tempatTurun": "Mekah",
        "arti": "Bukit Pasir",
        "deskripsi": "Surat ini dinamakan Al Ahqaaf (Bukit-Bukit Pasir) diambil dari kata Al Ahqaaf yang terdapat pada ayat 21 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/046.mp3",
            "02": "https://server8.mp3quran.net/husr/046.mp3",
            "03": "https://server10.mp3quran.net/ajm/046.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/046.mp3",
            "05": "https://server11.mp3quran.net/shatri/046.mp3"
        }
    },
    {
        "nomor": 47,
        "nama": "سُورَةُ مُحَمَّدٍ",
        "namaLatin": "Muhammad",
        "jumlahAyat": 38,
        "tempatTurun": "Madinah",
        "arti": "Nabi Muhammad",
        "deskripsi": "Surat ini dinamakan Muhammad, diambil dari perkataan Muhammad yang terdapat pada ayat 2 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/047.mp3",
            "02": "https://server8.mp3quran.net/husr/047.mp3",
            "03": "https://server10.mp3quran.net/ajm/047.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/047.mp3",
            "05": "https://server11.mp3quran.net/shatri/047.mp3"
        }
    },
    {
        "nomor": 48,
        "nama": "سُورَةُ الفَتۡحِ",
        "namaLatin": "Al-Fath",
        "jumlahAyat": 29,
        "tempatTurun": "Madinah",
        "arti": "Kemenangan",
        "deskripsi": "Surat ini dinamakan Al Fath (Kemenangan) diambil dari perkataan Fat-han yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/048.mp3",
            "02": "https://server8.mp3quran.net/husr/048.mp3",
            "03": "https://server10.mp3quran.net/ajm/048.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/048.mp3",
            "05": "https://server11.mp3quran.net/shatri/048.mp3"
        }
    },
    {
        "nomor": 49,
        "nama": "سُورَةُ الحُجُرَاتِ",
        "namaLatin": "Al-Hujurat",
        "jumlahAyat": 18,
        "tempatTurun": "Madinah",
        "arti": "Kamar-Kamar",
        "deskripsi": "Surat ini dinamakan Al Hujuraat (Kamar-kamar) diambil dari perkataan Hujuraat yang terdapat pada ayat 4 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/049.mp3",
            "02": "https://server8.mp3quran.net/husr/049.mp3",
            "03": "https://server10.mp3quran.net/ajm/049.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/049.mp3",
            "05": "https://server11.mp3quran.net/shatri/049.mp3"
        }
    },
    {
        "nomor": 50,
        "nama": "سُورَةُ قٓ",
        "namaLatin": "Qaf",
        "jumlahAyat": 45,
        "tempatTurun": "Mekah",
        "arti": "Qaf",
        "deskripsi": "Surat ini dinamakan Qaaf karena surat ini dimulai dengan huruf Qaaf.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/050.mp3",
            "02": "https://server8.mp3quran.net/husr/050.mp3",
            "03": "https://server10.mp3quran.net/ajm/050.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/050.mp3",
            "05": "https://server11.mp3quran.net/shatri/050.mp3"
        }
    },
    {
        "nomor": 51,
        "nama": "سُورَةُ الذَّارِيَاتِ",
        "namaLatin": "Az-Zariyat",
        "jumlahAyat": 60,
        "tempatTurun": "Mekah",
        "arti": "Angin yang Menerbangkan",
        "deskripsi": "Surat ini dinamakan Adz dzaariyaat (angin yang menerbangkan), diambil dari perkataan Adz dzaariyaat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/051.mp3",
            "02": "https://server8.mp3quran.net/husr/051.mp3",
            "03": "https://server10.mp3quran.net/ajm/051.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/051.mp3",
            "05": "https://server11.mp3quran.net/shatri/051.mp3"
        }
    },
    {
        "nomor": 52,
        "nama": "سُورَةُ الطُّورِ",
        "namaLatin": "At-Tur",
        "jumlahAyat": 49,
        "tempatTurun": "Mekah",
        "arti": "Bukit",
        "deskripsi": "Surat ini dinamakan Ath Thuur (Bukit) diambil dari perkataan Ath Thuur yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/052.mp3",
            "02": "https://server8.mp3quran.net/husr/052.mp3",
            "03": "https://server10.mp3quran.net/ajm/052.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/052.mp3",
            "05": "https://server11.mp3quran.net/shatri/052.mp3"
        }
    },
    {
        "nomor": 53,
        "nama": "سُورَةُ النَّجۡمِ",
        "namaLatin": "An-Najm",
        "jumlahAyat": 62,
        "tempatTurun": "Mekah",
        "arti": "Bintang",
        "deskripsi": "Surat ini dinamakan An Najm (Bintang), diambil dari perkataan An Najm yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/053.mp3",
            "02": "https://server8.mp3quran.net/husr/053.mp3",
            "03": "https://server10.mp3quran.net/ajm/053.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/053.mp3",
            "05": "https://server11.mp3quran.net/shatri/053.mp3"
        }
    },
    {
        "nomor": 54,
        "nama": "سُورَةُ القَمَرِ",
        "namaLatin": "Al-Qamar",
        "jumlahAyat": 55,
        "tempatTurun": "Mekah",
        "arti": "Bulan",
        "deskripsi": "Surat ini dinamakan Al Qamar (Bulan), diambil dari perkataan Al Qamar yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/054.mp3",
            "02": "https://server8.mp3quran.net/husr/054.mp3",
            "03": "https://server10.mp3quran.net/ajm/054.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/054.mp3",
            "05": "https://server11.mp3quran.net/shatri/054.mp3"
        }
    },
    {
        "nomor": 55,
        "nama": "سُورَةُ الرَّحۡمَٰنِ",
        "namaLatin": "Ar-Rahman",
        "jumlahAyat": 78,
        "tempatTurun": "Madinah",
        "arti": "Maha Pemurah",
        "deskripsi": "Surat ini dinamakan Ar Rahmaan (Yang Maha Pemurah), diambil dari perkataan Ar Rahmaan yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/055.mp3",
            "02": "https://server8.mp3quran.net/husr/055.mp3",
            "03": "https://server10.mp3quran.net/ajm/055.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/055.mp3",
            "05": "https://server11.mp3quran.net/shatri/055.mp3"
        }
    },
    {
        "nomor": 56,
        "nama": "سُورَةُ الوَاقِعَةِ",
        "namaLatin": "Al-Waqi'ah",
        "jumlahAyat": 96,
        "tempatTurun": "Mekah",
        "arti": "Hari Kiamat",
        "deskripsi": "Surat ini dinamakan Al Waaqi'ah (Hari Kiamat), diambil dari perkataan Al Waaqi'ah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/056.mp3",
            "02": "https://server8.mp3quran.net/husr/056.mp3",
            "03": "https://server10.mp3quran.net/ajm/056.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/056.mp3",
            "05": "https://server11.mp3quran.net/shatri/056.mp3"
        }
    },
    {
        "nomor": 57,
        "nama": "سُورَةُ الحَدِيدِ",
        "namaLatin": "Al-Hadid",
        "jumlahAyat": 29,
        "tempatTurun": "Madinah",
        "arti": "Besi",
        "deskripsi": "Surat ini dinamakan Al Hadiid (Besi), diambil dari perkataan Al Hadiid yang terdapat pada ayat 25 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/057.mp3",
            "02": "https://server8.mp3quran.net/husr/057.mp3",
            "03": "https://server10.mp3quran.net/ajm/057.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/057.mp3",
            "05": "https://server11.mp3quran.net/shatri/057.mp3"
        }
    },
    {
        "nomor": 58,
        "nama": "سُورَةُ المُجَادِلَةِ",
        "namaLatin": "Al-Mujadalah",
        "jumlahAyat": 22,
        "tempatTurun": "Madinah",
        "arti": "Gugatan",
        "deskripsi": "Surat ini dinamakan Al Mujaadalah (Wanita Yang Mengajukan Gugatan), karena pada awal surat ini disebutkan bantahan seorang perempuan, yang menurut riwayat bernama Khaulah binti Tsa'labah terhadap sikap suaminya yang telah menzhiharnya.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/058.mp3",
            "02": "https://server8.mp3quran.net/husr/058.mp3",
            "03": "https://server10.mp3quran.net/ajm/058.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/058.mp3",
            "05": "https://server11.mp3quran.net/shatri/058.mp3"
        }
    },
    {
        "nomor": 59,
        "nama": "سُورَةُ الحَشۡرِ",
        "namaLatin": "Al-Hasyr",
        "jumlahAyat": 24,
        "tempatTurun": "Madinah",
        "arti": "Pengusiran",
        "deskripsi": "Surat ini dinamakan Al Hasyr (Pengusiran) diambil dari perkataan Al Hasyr yang terdapat pada ayat 2 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/059.mp3",
            "02": "https://server8.mp3quran.net/husr/059.mp3",
            "03": "https://server10.mp3quran.net/ajm/059.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/059.mp3",
            "05": "https://server11.mp3quran.net/shatri/059.mp3"
        }
    },
    {
        "nomor": 60,
        "nama": "سُورَةُ المُمۡتَحَنَةِ",
        "namaLatin": "Al-Mumtahanah",
        "jumlahAyat": 13,
        "tempatTurun": "Madinah",
        "arti": "Wanita yang Diuji",
        "deskripsi": "Surat ini dinamakan Al Mumtahanah (Wanita Yang Diuji), diambil dari perkataan 'Famtahinuuhunna' yang berarti maka ujilah mereka (wanita-wanita itu), yang terdapat pada ayat 10 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/060.mp3",
            "02": "https://server8.mp3quran.net/husr/060.mp3",
            "03": "https://server10.mp3quran.net/ajm/060.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/060.mp3",
            "05": "https://server11.mp3quran.net/shatri/060.mp3"
        }
    },
    {
        "nomor": 61,
        "nama": "سُورَةُ الصَّفِّ",
        "namaLatin": "As-Saff",
        "jumlahAyat": 14,
        "tempatTurun": "Madinah",
        "arti": "Barisan",
        "deskripsi": "Surat ini dinamakan Ash Shaff (Satu Barisan), diambil dari perkataan Shaffan yang terdapat pada ayat 4 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/061.mp3",
            "02": "https://server8.mp3quran.net/husr/061.mp3",
            "03": "https://server10.mp3quran.net/ajm/061.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/061.mp3",
            "05": "https://server11.mp3quran.net/shatri/061.mp3"
        }
    },
    {
        "nomor": 62,
        "nama": "سُورَةُ الجُمُعَةِ",
        "namaLatin": "Al-Jumu'ah",
        "jumlahAyat": 11,
        "tempatTurun": "Madinah",
        "arti": "Hari Jum'at",
        "deskripsi": "Surat ini dinamakan Al Jumu'ah (Hari Jum'at), diambil dari perkataan Al Jumu'ah yang terdapat pada ayat 9 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/062.mp3",
            "02": "https://server8.mp3quran.net/husr/062.mp3",
            "03": "https://server10.mp3quran.net/ajm/062.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/062.mp3",
            "05": "https://server11.mp3quran.net/shatri/062.mp3"
        }
    },
    {
        "nomor": 63,
        "nama": "سُورَةُ المُنَافِقُونَ",
        "namaLatin": "Al-Munafiqun",
        "jumlahAyat": 11,
        "tempatTurun": "Madinah",
        "arti": "Orang-Orang Munafik",
        "deskripsi": "Surat ini dinamakan Al Munaafiquun (Orang-orang Munafik) karena surat ini membahas sifat-sifat orang-orang munafik.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/063.mp3",
            "02": "https://server8.mp3quran.net/husr/063.mp3",
            "03": "https://server10.mp3quran.net/ajm/063.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/063.mp3",
            "05": "https://server11.mp3quran.net/shatri/063.mp3"
        }
    },
    {
        "nomor": 64,
        "nama": "سُورَةُ التَّغَابُنِ",
        "namaLatin": "At-Tagabun",
        "jumlahAyat": 18,
        "tempatTurun": "Madinah",
        "arti": "Pengungkapan Kesalahan",
        "deskripsi": "Surat ini dinamakan At Taghaabun (Hari Ditampakkan Kesalahan-kesalahan) diambil dari perkataan At Taghaabun yang terdapat pada ayat 9 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/064.mp3",
            "02": "https://server8.mp3quran.net/husr/064.mp3",
            "03": "https://server10.mp3quran.net/ajm/064.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/064.mp3",
            "05": "https://server11.mp3quran.net/shatri/064.mp3"
        }
    },
    {
        "nomor": 65,
        "nama": "سُورَةُ الطَّلَاقِ",
        "namaLatin": "At-Talaq",
        "jumlahAyat": 12,
        "tempatTurun": "Madinah",
        "arti": "Talak",
        "deskripsi": "Surat ini dinamakan Ath Thalaaq (Talak), karena kebanyakan ayat-ayatnya mengenai masalah talak dan yang berhubungan dengan masalah itu.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/065.mp3",
            "02": "https://server8.mp3quran.net/husr/065.mp3",
            "03": "https://server10.mp3quran.net/ajm/065.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/065.mp3",
            "05": "https://server11.mp3quran.net/shatri/065.mp3"
        }
    },
    {
        "nomor": 66,
        "nama": "سُورَةُ التَّحۡرِيمِ",
        "namaLatin": "At-Tahrim",
        "jumlahAyat": 12,
        "tempatTurun": "Madinah",
        "arti": "Mengharamkan",
        "deskripsi": "Surat ini dinamakan At Tahrim (Mengharamkan), diambil dari perkataan 'Tuharrimu' yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/066.mp3",
            "02": "https://server8.mp3quran.net/husr/066.mp3",
            "03": "https://server10.mp3quran.net/ajm/066.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/066.mp3",
            "05": "https://server11.mp3quran.net/shatri/066.mp3"
        }
    },
    {
        "nomor": 67,
        "nama": "سُورَةُ المُلۡكِ",
        "namaLatin": "Al-Mulk",
        "jumlahAyat": 30,
        "tempatTurun": "Mekah",
        "arti": "Kerajaan",
        "deskripsi": "Surat ini dinamakan Al Mulk (Kerajaan), diambil dari perkataan Al Mulk yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/067.mp3",
            "02": "https://server8.mp3quran.net/husr/067.mp3",
            "03": "https://server10.mp3quran.net/ajm/067.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/067.mp3",
            "05": "https://server11.mp3quran.net/shatri/067.mp3"
        }
    },
    {
        "nomor": 68,
        "nama": "سُورَةُ القَلَمِ",
        "namaLatin": "Al-Qalam",
        "jumlahAyat": 52,
        "tempatTurun": "Mekah",
        "arti": "Pena",
        "deskripsi": "Surat ini dinamakan Al Qalam (Pena), diambil dari kata Al Qalam yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/068.mp3",
            "02": "https://server8.mp3quran.net/husr/068.mp3",
            "03": "https://server10.mp3quran.net/ajm/068.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/068.mp3",
            "05": "https://server11.mp3quran.net/shatri/068.mp3"
        }
    },
    {
        "nomor": 69,
        "nama": "سُورَةُ الحَاقَّةِ",
        "namaLatin": "Al-Haqqah",
        "jumlahAyat": 52,
        "tempatTurun": "Mekah",
        "arti": "Hari Kiamat",
        "deskripsi": "Surat ini dinamakan Al Haaqqah (Hari Kiamat), diambil dari perkataan Al Haaqqah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/069.mp3",
            "02": "https://server8.mp3quran.net/husr/069.mp3",
            "03": "https://server10.mp3quran.net/ajm/069.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/069.mp3",
            "05": "https://server11.mp3quran.net/shatri/069.mp3"
        }
    },
    {
        "nomor": 70,
        "nama": "سُورَةُ المَعَارِجِ",
        "namaLatin": "Al-Ma'arij",
        "jumlahAyat": 44,
        "tempatTurun": "Mekah",
        "arti": "Tempat Naik",
        "deskripsi": "Surat ini dinamakan Al Ma'aarij (Tempat-Tempat Naik), diambil dari perkataan Al Ma'aarij yang terdapat pada ayat 3 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/070.mp3",
            "02": "https://server8.mp3quran.net/husr/070.mp3",
            "03": "https://server10.mp3quran.net/ajm/070.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/070.mp3",
            "05": "https://server11.mp3quran.net/shatri/070.mp3"
        }
    },
    {
        "nomor": 71,
        "nama": "سُورَةُ نُوحٍ",
        "namaLatin": "Nuh",
        "jumlahAyat": 28,
        "tempatTurun": "Mekah",
        "arti": "Nabi Nuh",
        "deskripsi": "Surat ini dinamakan dengan surat Nuh karena surat ini seluruhnya menjelaskan da'wah dan doa Nabi Nuh.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/071.mp3",
            "02": "https://server8.mp3quran.net/husr/071.mp3",
            "03": "https://server10.mp3quran.net/ajm/071.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/071.mp3",
            "05": "https://server11.mp3quran.net/shatri/071.mp3"
        }
    },
    {
        "nomor": 72,
        "nama": "سُورَةُ الجِنِّ",
        "namaLatin": "Al-Jinn",
        "jumlahAyat": 28,
        "tempatTurun": "Mekah",
        "arti": "Jin",
        "deskripsi": "Surat ini dinamakan Al Jin (Jin), diambil dari perkataan Al Jin yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/072.mp3",
            "02": "https://server8.mp3quran.net/husr/072.mp3",
            "03": "https://server10.mp3quran.net/ajm/072.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/072.mp3",
            "05": "https://server11.mp3quran.net/shatri/072.mp3"
        }
    },
    {
        "nomor": 73,
        "nama": "سُورَةُ المُزَّمِّلِ",
        "namaLatin": "Al-Muzzammil",
        "jumlahAyat": 20,
        "tempatTurun": "Mekah",
        "arti": "Orang yang Berselimut",
        "deskripsi": "Surat ini dinamakan Al Muzzammil (Orang Yang Berselimut), diambil dari perkataan Al Muzzammil yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/073.mp3",
            "02": "https://server8.mp3quran.net/husr/073.mp3",
            "03": "https://server10.mp3quran.net/ajm/073.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/073.mp3",
            "05": "https://server11.mp3quran.net/shatri/073.mp3"
        }
    },
    {
        "nomor": 74,
        "nama": "سُورَةُ المُدَّثِّرِ",
        "namaLatin": "Al-Muddassir",
        "jumlahAyat": 56,
        "tempatTurun": "Mekah",
        "arti": "Orang yang Berkemul",
        "deskripsi": "Surat ini dinamakan Al Muddatstsir (Orang Yang Berkemul), diambil dari perkataan Al Muddatstsir yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/074.mp3",
            "02": "https://server8.mp3quran.net/husr/074.mp3",
            "03": "https://server10.mp3quran.net/ajm/074.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/074.mp3",
            "05": "https://server11.mp3quran.net/shatri/074.mp3"
        }
    },
    {
        "nomor": 75,
        "nama": "سُورَةُ القِيَامَةِ",
        "namaLatin": "Al-Qiyamah",
        "jumlahAyat": 40,
        "tempatTurun": "Mekah",
        "arti": "Hari Kiamat",
        "deskripsi": "Surat ini dinamakan Al Qiyaamah (Hari Kiamat), diambil dari perkataan Al Qiyaamah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/075.mp3",
            "02": "https://server8.mp3quran.net/husr/075.mp3",
            "03": "https://server10.mp3quran.net/ajm/075.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/075.mp3",
            "05": "https://server11.mp3quran.net/shatri/075.mp3"
        }
    },
    {
        "nomor": 76,
        "nama": "سُورَةُ الإِنسَانِ",
        "namaLatin": "Al-Insan",
        "jumlahAyat": 31,
        "tempatTurun": "Madinah",
        "arti": "Manusia",
        "deskripsi": "Surat ini dinamakan Al Insaan (Manusia), diambil dari perkataan Al Insaan yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/076.mp3",
            "02": "https://server8.mp3quran.net/husr/076.mp3",
            "03": "https://server10.mp3quran.net/ajm/076.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/076.mp3",
            "05": "https://server11.mp3quran.net/shatri/076.mp3"
        }
    },
    {
        "nomor": 77,
        "nama": "سُورَةُ المُرۡسَلَاتِ",
        "namaLatin": "Al-Mursalat",
        "jumlahAyat": 50,
        "tempatTurun": "Mekah",
        "arti": "Malaikat-Malaikat yang Diutus",
        "deskripsi": "Surat ini dinamakan Al Mursalaat (Malaikat-Malaikat Yang Diutus), diambil dari perkataan Al Mursalaat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/077.mp3",
            "02": "https://server8.mp3quran.net/husr/077.mp3",
            "03": "https://server10.mp3quran.net/ajm/077.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/077.mp3",
            "05": "https://server11.mp3quran.net/shatri/077.mp3"
        }
    },
    {
        "nomor": 78,
        "nama": "سُورَةُ النَّبَإِ",
        "namaLatin": "An-Naba'",
        "jumlahAyat": 40,
        "tempatTurun": "Mekah",
        "arti": "Berita Besar",
        "deskripsi": "Surat ini dinamakan An Naba' (Berita Besar), diambil dari perkataan An Naba' yang terdapat pada ayat 2 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/078.mp3",
            "02": "https://server8.mp3quran.net/husr/078.mp3",
            "03": "https://server10.mp3quran.net/ajm/078.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/078.mp3",
            "05": "https://server11.mp3quran.net/shatri/078.mp3"
        }
    },
    {
        "nomor": 79,
        "nama": "سُورَةُ النَّازِعَاتِ",
        "namaLatin": "An-Nazi'at",
        "jumlahAyat": 46,
        "tempatTurun": "Mekah",
        "arti": "Malaikat-Malaikat yang Mencabut",
        "deskripsi": "Surat ini dinamakan An Naazi'aat (Malaikat-Malaikat Yang Mencabut), diambil dari perkataan An Naazi'aat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/079.mp3",
            "02": "https://server8.mp3quran.net/husr/079.mp3",
            "03": "https://server10.mp3quran.net/ajm/079.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/079.mp3",
            "05": "https://server11.mp3quran.net/shatri/079.mp3"
        }
    },
    {
        "nomor": 80,
        "nama": "سُورَةُ عَبَسَ",
        "namaLatin": "'Abasa",
        "jumlahAyat": 42,
        "tempatTurun": "Mekah",
        "arti": "Bermuka Masam",
        "deskripsi": "Surat ini dinamakan 'Abasa (Ia Bermuka Masam), diambil dari perkataan 'Abasa yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/080.mp3",
            "02": "https://server8.mp3quran.net/husr/080.mp3",
            "03": "https://server10.mp3quran.net/ajm/080.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/080.mp3",
            "05": "https://server11.mp3quran.net/shatri/080.mp3"
        }
    },
    {
        "nomor": 81,
        "nama": "سُورَةُ التَّكۡوِيرِ",
        "namaLatin": "At-Takwir",
        "jumlahAyat": 29,
        "tempatTurun": "Mekah",
        "arti": "Menggulung",
        "deskripsi": "Surat ini dinamakan At Takwiir (Menggulung), diambil dari perkataan Kuwwirat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/081.mp3",
            "02": "https://server8.mp3quran.net/husr/081.mp3",
            "03": "https://server10.mp3quran.net/ajm/081.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/081.mp3",
            "05": "https://server11.mp3quran.net/shatri/081.mp3"
        }
    },
    {
        "nomor": 82,
        "nama": "سُورَةُ الانفِطَارِ",
        "namaLatin": "Al-Infitar",
        "jumlahAyat": 19,
        "tempatTurun": "Mekah",
        "arti": "Terbelah",
        "deskripsi": "Surat ini dinamakan Al Infithaar (Terbelah), diambil dari perkataan Infatharat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/082.mp3",
            "02": "https://server8.mp3quran.net/husr/082.mp3",
            "03": "https://server10.mp3quran.net/ajm/082.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/082.mp3",
            "05": "https://server11.mp3quran.net/shatri/082.mp3"
        }
    },
    {
        "nomor": 83,
        "nama": "سُورَةُ المُطَفِّفِينَ",
        "namaLatin": "Al-Mutaffifin",
        "jumlahAyat": 36,
        "tempatTurun": "Mekah",
        "arti": "Orang-Orang Curang",
        "deskripsi": "Surat ini dinamakan Al Muthaffifiin (Orang-orang Yang Curang), diambil dari perkataan Al Muthaffifiin yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/083.mp3",
            "02": "https://server8.mp3quran.net/husr/083.mp3",
            "03": "https://server10.mp3quran.net/ajm/083.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/083.mp3",
            "05": "https://server11.mp3quran.net/shatri/083.mp3"
        }
    },
    {
        "nomor": 84,
        "nama": "سُورَةُ الانشِقَاقِ",
        "namaLatin": "Al-Insyiqaq",
        "jumlahAyat": 25,
        "tempatTurun": "Mekah",
        "arti": "Terbelah",
        "deskripsi": "Surat ini dinamakan Al Insyiqaaq (Terbelah), diambil dari perkataan Insyaqqat yang terdapat pada permulaan surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/084.mp3",
            "02": "https://server8.mp3quran.net/husr/084.mp3",
            "03": "https://server10.mp3quran.net/ajm/084.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/084.mp3",
            "05": "https://server11.mp3quran.net/shatri/084.mp3"
        }
    },
    {
        "nomor": 85,
        "nama": "سُورَةُ البُرُوجِ",
        "namaLatin": "Al-Buruj",
        "jumlahAyat": 22,
        "tempatTurun": "Mekah",
        "arti": "Gugusan Bintang",
        "deskripsi": "Surat ini dinamakan Al Buruuj (Gugusan Bintang), diambil dari perkataan Al Buruuj yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/085.mp3",
            "02": "https://server8.mp3quran.net/husr/085.mp3",
            "03": "https://server10.mp3quran.net/ajm/085.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/085.mp3",
            "05": "https://server11.mp3quran.net/shatri/085.mp3"
        }
    },
    {
        "nomor": 86,
        "nama": "سُورَةُ الطَّارِقِ",
        "namaLatin": "At-Tariq",
        "jumlahAyat": 17,
        "tempatTurun": "Mekah",
        "arti": "Yang Datang di Malam Hari",
        "deskripsi": "Surat ini dinamakan Ath Thaariq (Yang Datang Di Malam Hari), diambil dari perkataan Ath Thaariq yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/086.mp3",
            "02": "https://server8.mp3quran.net/husr/086.mp3",
            "03": "https://server10.mp3quran.net/ajm/086.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/086.mp3",
            "05": "https://server11.mp3quran.net/shatri/086.mp3"
        }
    },
    {
        "nomor": 87,
        "nama": "سُورَةُ الأَعۡلَىٰ",
        "namaLatin": "Al-A'la",
        "jumlahAyat": 19,
        "tempatTurun": "Mekah",
        "arti": "Yang Paling Tinggi",
        "deskripsi": "Surat ini dinamakan Al A'laa (Yang Paling Tinggi), diambil dari perkataan Al A'laa yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/087.mp3",
            "02": "https://server8.mp3quran.net/husr/087.mp3",
            "03": "https://server10.mp3quran.net/ajm/087.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/087.mp3",
            "05": "https://server11.mp3quran.net/shatri/087.mp3"
        }
    },
    {
        "nomor": 88,
        "nama": "سُورَةُ الغَاشِيَةِ",
        "namaLatin": "Al-Gasyiyah",
        "jumlahAyat": 26,
        "tempatTurun": "Mekah",
        "arti": "Hari Pembalasan",
        "deskripsi": "Surat ini dinamakan Al Ghaasyiyah (Hari Pembalasan), diambil dari perkataan Al Ghaasyiyah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/088.mp3",
            "02": "https://server8.mp3quran.net/husr/088.mp3",
            "03": "https://server10.mp3quran.net/ajm/088.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/088.mp3",
            "05": "https://server11.mp3quran.net/shatri/088.mp3"
        }
    },
    {
        "nomor": 89,
        "nama": "سُورَةُ الفَجۡرِ",
        "namaLatin": "Al-Fajr",
        "jumlahAyat": 30,
        "tempatTurun": "Mekah",
        "arti": "Fajar",
        "deskripsi": "Surat ini dinamakan Al Fajr (Fajar), diambil dari perkataan Al Fajr yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/089.mp3",
            "02": "https://server8.mp3quran.net/husr/089.mp3",
            "03": "https://server10.mp3quran.net/ajm/089.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/089.mp3",
            "05": "https://server11.mp3quran.net/shatri/089.mp3"
        }
    },
    {
        "nomor": 90,
        "nama": "سُورَةُ البَلَدِ",
        "namaLatin": "Al-Balad",
        "jumlahAyat": 20,
        "tempatTurun": "Mekah",
        "arti": "Negeri",
        "deskripsi": "Surat ini dinamakan Al Balad (Negeri), diambil dari perkataan Al Balad yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/090.mp3",
            "02": "https://server8.mp3quran.net/husr/090.mp3",
            "03": "https://server10.mp3quran.net/ajm/090.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/090.mp3",
            "05": "https://server11.mp3quran.net/shatri/090.mp3"
        }
    },
    {
        "nomor": 91,
        "nama": "سُورَةُ الشَّمۡسِ",
        "namaLatin": "Asy-Syams",
        "jumlahAyat": 15,
        "tempatTurun": "Mekah",
        "arti": "Matahari",
        "deskripsi": "Surat ini dinamakan Asy Syams (Matahari), diambil dari perkataan Asy Syams yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/091.mp3",
            "02": "https://server8.mp3quran.net/husr/091.mp3",
            "03": "https://server10.mp3quran.net/ajm/091.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/091.mp3",
            "05": "https://server11.mp3quran.net/shatri/091.mp3"
        }
    },
    {
        "nomor": 92,
        "nama": "سُورَةُ اللَّيۡلِ",
        "namaLatin": "Al-Lail",
        "jumlahAyat": 21,
        "tempatTurun": "Mekah",
        "arti": "Malam",
        "deskripsi": "Surat ini dinamakan Al Lail (Malam), diambil dari perkataan Al Lail yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/092.mp3",
            "02": "https://server8.mp3quran.net/husr/092.mp3",
            "03": "https://server10.mp3quran.net/ajm/092.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/092.mp3",
            "05": "https://server11.mp3quran.net/shatri/092.mp3"
        }
    },
    {
        "nomor": 93,
        "nama": "سُورَةُ الضُّحَىٰ",
        "namaLatin": "Ad-Duha",
        "jumlahAyat": 11,
        "tempatTurun": "Mekah",
        "arti": "Waktu Dhuha",
        "deskripsi": "Surat ini dinamakan Adh Dhuhaa (Waktu Dhuha), diambil dari perkataan Adh Dhuhaa yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/093.mp3",
            "02": "https://server8.mp3quran.net/husr/093.mp3",
            "03": "https://server10.mp3quran.net/ajm/093.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/093.mp3",
            "05": "https://server11.mp3quran.net/shatri/093.mp3"
        }
    },
    {
        "nomor": 94,
        "nama": "سُورَةُ الشَّرۡحِ",
        "namaLatin": "Asy-Syarh",
        "jumlahAyat": 8,
        "tempatTurun": "Mekah",
        "arti": "Kelapangan",
        "deskripsi": "Surat ini dinamakan Alam Nasyrah (Bukankah Kami telah Melapangkan), diambil dari perkataan Alam Nasyrah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/094.mp3",
            "02": "https://server8.mp3quran.net/husr/094.mp3",
            "03": "https://server10.mp3quran.net/ajm/094.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/094.mp3",
            "05": "https://server11.mp3quran.net/shatri/094.mp3"
        }
    },
    {
        "nomor": 95,
        "nama": "سُورَةُ التِّينِ",
        "namaLatin": "At-Tin",
        "jumlahAyat": 8,
        "tempatTurun": "Mekah",
        "arti": "Buah Tin",
        "deskripsi": "Surat ini dinamakan At Tiin (Buah Tin), diambil dari perkataan At Tiin yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/095.mp3",
            "02": "https://server8.mp3quran.net/husr/095.mp3",
            "03": "https://server10.mp3quran.net/ajm/095.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/095.mp3",
            "05": "https://server11.mp3quran.net/shatri/095.mp3"
        }
    },
    {
        "nomor": 96,
        "nama": "سُورَةُ العَلَقِ",
        "namaLatin": "Al-'Alaq",
        "jumlahAyat": 19,
        "tempatTurun": "Mekah",
        "arti": "Segumpal Darah",
        "deskripsi": "Surat ini dinamakan Al 'Alaq (Segumpal Darah), diambil dari perkataan Alaq yang terdapat pada ayat 2 surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/096.mp3",
            "02": "https://server8.mp3quran.net/husr/096.mp3",
            "03": "https://server10.mp3quran.net/ajm/096.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/096.mp3",
            "05": "https://server11.mp3quran.net/shatri/096.mp3"
        }
    },
    {
        "nomor": 97,
        "nama": "سُورَةُ القَدۡرِ",
        "namaLatin": "Al-Qadr",
        "jumlahAyat": 5,
        "tempatTurun": "Mekah",
        "arti": "Kemuliaan",
        "deskripsi": "Surat ini dinamakan Al Qadr (Kemuliaan), diambil dari perkataan Al Qadr yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/097.mp3",
            "02": "https://server8.mp3quran.net/husr/097.mp3",
            "03": "https://server10.mp3quran.net/ajm/097.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/097.mp3",
            "05": "https://server11.mp3quran.net/shatri/097.mp3"
        }
    },
    {
        "nomor": 98,
        "nama": "سُورَةُ البَيِّنَةِ",
        "namaLatin": "Al-Bayyinah",
        "jumlahAyat": 8,
        "tempatTurun": "Madinah",
        "arti": "Bukti Nyata",
        "deskripsi": "Surat ini dinamakan Al Bayyinah (Bukti Yang Nyata), diambil dari perkataan Al Bayyinah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/098.mp3",
            "02": "https://server8.mp3quran.net/husr/098.mp3",
            "03": "https://server10.mp3quran.net/ajm/098.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/098.mp3",
            "05": "https://server11.mp3quran.net/shatri/098.mp3"
        }
    },
    {
        "nomor": 99,
        "nama": "سُورَةُ الزَّلۡزَلَةِ",
        "namaLatin": "Az-Zalzalah",
        "jumlahAyat": 8,
        "tempatTurun": "Madinah",
        "arti": "Guncangan",
        "deskripsi": "Surat ini dinamakan Az Zalzalah (Goncangan), diambil dari perkataan Zilzaal yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/099.mp3",
            "02": "https://server8.mp3quran.net/husr/099.mp3",
            "03": "https://server10.mp3quran.net/ajm/099.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/099.mp3",
            "05": "https://server11.mp3quran.net/shatri/099.mp3"
        }
    },
    {
        "nomor": 100,
        "nama": "سُورَةُ العَادِيَاتِ",
        "namaLatin": "Al-'Adiyat",
        "jumlahAyat": 11,
        "tempatTurun": "Mekah",
        "arti": "Kuda Perang",
        "deskripsi": "Surat ini dinamakan Al 'Aadiyaat (Kuda Perang Yang Berlari Kencang), diambil dari perkataan Al 'Aadiyaat yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/100.mp3",
            "02": "https://server8.mp3quran.net/husr/100.mp3",
            "03": "https://server10.mp3quran.net/ajm/100.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/100.mp3",
            "05": "https://server11.mp3quran.net/shatri/100.mp3"
        }
    },
    {
        "nomor": 101,
        "nama": "سُورَةُ القَارِعَةِ",
        "namaLatin": "Al-Qari'ah",
        "jumlahAyat": 11,
        "tempatTurun": "Mekah",
        "arti": "Hari Kiamat",
        "deskripsi": "Surat ini dinamakan Al Qaari'ah (Hari Kiamat), diambil dari perkataan Al Qaari'ah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/101.mp3",
            "02": "https://server8.mp3quran.net/husr/101.mp3",
            "03": "https://server10.mp3quran.net/ajm/101.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/101.mp3",
            "05": "https://server11.mp3quran.net/shatri/101.mp3"
        }
    },
    {
        "nomor": 102,
        "nama": "سُورَةُ التَّكَاثُرِ",
        "namaLatin": "At-Takasur",
        "jumlahAyat": 8,
        "tempatTurun": "Mekah",
        "arti": "Bermegah-Megahan",
        "deskripsi": "Surat ini dinamakan At Takaatsur (Bermegah-megahan), diambil dari perkataan At Takaatsur yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/102.mp3",
            "02": "https://server8.mp3quran.net/husr/102.mp3",
            "03": "https://server10.mp3quran.net/ajm/102.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/102.mp3",
            "05": "https://server11.mp3quran.net/shatri/102.mp3"
        }
    },
    {
        "nomor": 103,
        "nama": "سُورَةُ العَصۡرِ",
        "namaLatin": "Al-'Asr",
        "jumlahAyat": 3,
        "tempatTurun": "Mekah",
        "arti": "Masa",
        "deskripsi": "Surat ini dinamakan Al 'Ashr (Masa), diambil dari perkataan Al 'Ashr yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/103.mp3",
            "02": "https://server8.mp3quran.net/husr/103.mp3",
            "03": "https://server10.mp3quran.net/ajm/103.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/103.mp3",
            "05": "https://server11.mp3quran.net/shatri/103.mp3"
        }
    },
    {
        "nomor": 104,
        "nama": "سُورَةُ الهُمَزَةِ",
        "namaLatin": "Al-Humazah",
        "jumlahAyat": 9,
        "tempatTurun": "Mekah",
        "arti": "Pengumpat",
        "deskripsi": "Surat ini dinamakan Al Humazah (Pengumpat), diambil dari perkataan Humazah yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/104.mp3",
            "02": "https://server8.mp3quran.net/husr/104.mp3",
            "03": "https://server10.mp3quran.net/ajm/104.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/104.mp3",
            "05": "https://server11.mp3quran.net/shatri/104.mp3"
        }
    },
    {
        "nomor": 105,
        "nama": "سُورَةُ الفِيلِ",
        "namaLatin": "Al-Fil",
        "jumlahAyat": 5,
        "tempatTurun": "Mekah",
        "arti": "Gajah",
        "deskripsi": "Surat ini dinamakan Al Fiil (Gajah), diambil dari perkataan Al Fiil yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/105.mp3",
            "02": "https://server8.mp3quran.net/husr/105.mp3",
            "03": "https://server10.mp3quran.net/ajm/105.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/105.mp3",
            "05": "https://server11.mp3quran.net/shatri/105.mp3"
        }
    },
    {
        "nomor": 106,
        "nama": "سُورَةُ قُرَيۡشٍ",
        "namaLatin": "Quraisy",
        "jumlahAyat": 4,
        "tempatTurun": "Mekah",
        "arti": "Suku Quraisy",
        "deskripsi": "Surat ini dinamakan Quraisy, diambil dari perkataan Quraisy yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/106.mp3",
            "02": "https://server8.mp3quran.net/husr/106.mp3",
            "03": "https://server10.mp3quran.net/ajm/106.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/106.mp3",
            "05": "https://server11.mp3quran.net/shatri/106.mp3"
        }
    },
    {
        "nomor": 107,
        "nama": "سُورَةُ المَاعُونِ",
        "namaLatin": "Al-Ma'un",
        "jumlahAyat": 7,
        "tempatTurun": "Mekah",
        "arti": "Barang yang Berguna",
        "deskripsi": "Surat ini dinamakan Al Maa'uun (Barang-barang Yang Berguna), diambil dari perkataan Al Maa'uun yang terdapat pada ayat terakhir surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/107.mp3",
            "02": "https://server8.mp3quran.net/husr/107.mp3",
            "03": "https://server10.mp3quran.net/ajm/107.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/107.mp3",
            "05": "https://server11.mp3quran.net/shatri/107.mp3"
        }
    },
    {
        "nomor": 108,
        "nama": "سُورَةُ الكَوۡثَرِ",
        "namaLatin": "Al-Kausar",
        "jumlahAyat": 3,
        "tempatTurun": "Mekah",
        "arti": "Nikmat yang Banyak",
        "deskripsi": "Surat ini dinamakan Al Kautsar (Nikmat Yang Berlimpah), diambil dari perkataan Al Kautsar yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/108.mp3",
            "02": "https://server8.mp3quran.net/husr/108.mp3",
            "03": "https://server10.mp3quran.net/ajm/108.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/108.mp3",
            "05": "https://server11.mp3quran.net/shatri/108.mp3"
        }
    },
    {
        "nomor": 109,
        "nama": "سُورَةُ الكَافِرُونَ",
        "namaLatin": "Al-Kafirun",
        "jumlahAyat": 6,
        "tempatTurun": "Mekah",
        "arti": "Orang-Orang Kafir",
        "deskripsi": "Surat ini dinamakan Al Kaafiruun (Orang-orang Kafir), diambil dari perkataan Al Kaafiruun yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/109.mp3",
            "02": "https://server8.mp3quran.net/husr/109.mp3",
            "03": "https://server10.mp3quran.net/ajm/109.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/109.mp3",
            "05": "https://server11.mp3quran.net/shatri/109.mp3"
        }
    },
    {
        "nomor": 110,
        "nama": "سُورَةُ النَّصۡرِ",
        "namaLatin": "An-Nasr",
        "jumlahAyat": 3,
        "tempatTurun": "Madinah",
        "arti": "Pertolongan",
        "deskripsi": "Surat ini dinamakan An Nashr (Pertolongan), diambil dari perkataan Nashr yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/110.mp3",
            "02": "https://server8.mp3quran.net/husr/110.mp3",
            "03": "https://server10.mp3quran.net/ajm/110.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/110.mp3",
            "05": "https://server11.mp3quran.net/shatri/110.mp3"
        }
    },
    {
        "nomor": 111,
        "nama": "سُورَةُ المَسَدِ",
        "namaLatin": "Al-Masad",
        "jumlahAyat": 5,
        "tempatTurun": "Mekah",
        "arti": "Gejolak Api",
        "deskripsi": "Surat ini dinamakan Al Lahab (Gejolak Api), diambil dari perkataan Lahab yang terdapat pada ayat ketiga surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/111.mp3",
            "02": "https://server8.mp3quran.net/husr/111.mp3",
            "03": "https://server10.mp3quran.net/ajm/111.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/111.mp3",
            "05": "https://server11.mp3quran.net/shatri/111.mp3"
        }
    },
    {
        "nomor": 112,
        "nama": "سُورَةُ الإِخۡلَاصِ",
        "namaLatin": "Al-Ikhlas",
        "jumlahAyat": 4,
        "tempatTurun": "Mekah",
        "arti": "Keesaan",
        "deskripsi": "Surat ini dinamakan Al Ikhlash (Memurnikan Keesaan Allah), karena surat ini menegaskan kemurnian keesaan Allah s.w.t.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/112.mp3",
            "02": "https://server8.mp3quran.net/husr/112.mp3",
            "03": "https://server10.mp3quran.net/ajm/112.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/112.mp3",
            "05": "https://server11.mp3quran.net/shatri/112.mp3"
        }
    },
    {
        "nomor": 113,
        "nama": "سُورَةُ الفَلَقِ",
        "namaLatin": "Al-Falaq",
        "jumlahAyat": 5,
        "tempatTurun": "Mekah",
        "arti": "Waktu Subuh",
        "deskripsi": "Surat ini dinamakan Al Falaq (Waktu Shubuh), diambil dari perkataan Al Falaq yang terdapat pada ayat pertama surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/113.mp3",
            "02": "https://server8.mp3quran.net/husr/113.mp3",
            "03": "https://server10.mp3quran.net/ajm/113.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/113.mp3",
            "05": "https://server11.mp3quran.net/shatri/113.mp3"
        }
    },
    {
        "nomor": 114,
        "nama": "سُورَةُ النَّاسِ",
        "namaLatin": "An-Nas",
        "jumlahAyat": 6,
        "tempatTurun": "Mekah",
        "arti": "Manusia",
        "deskripsi": "Surat ini dinamakan An Naas (Manusia), diambil dari perkataan An Naas yang berulang-ulang dalam surat ini.",
        "audioFull": {
            "01": "https://server8.mp3quran.net/afs/114.mp3",
            "02": "https://server8.mp3quran.net/husr/114.mp3",
            "03": "https://server10.mp3quran.net/ajm/114.mp3",
            "04": "https://server7.mp3quran.net/s_gmd/114.mp3",
            "05": "https://server11.mp3quran.net/shatri/114.mp3"
        }
    }
];

export const fetchSurahs = async (): Promise<Surah[]> => {
    // Return static data to avoid network errors and improve offline capability.
    return Promise.resolve(SURAHS);
};

export const fetchSurahDetail = async (surahNumber: number): Promise<SurahDetail | null> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
        // Use our internal API route instead of calling equran.id directly from client
        const apiUrl = `/api/quran/${surahNumber}`;

        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
        }

        const data = await response.json();

        if (data.code === 200 && data.data) {
            return data.data;
        }

        return null;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error) {
            if (error.name === 'AbortError') {
            } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            } else {
            }
        } else {
        }
        return null;
    }
};
