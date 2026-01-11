import type { RawEmployee } from '../types';

// Raw employee data without dynamic fields like id, password, lastVisitDate
export const EMPLOYEES: Record<string, RawEmployee> = {
    '6000': {
        hospitalId: 'RSIJSP',
        name: 'Ns. Edi Heryanto, S.Kep',
        unit: 'Rawat Jalan & Pel. Penunjang',
        bagian: 'Rawat Jalan',
        professionCategory: 'MEDIS',
        profession: 'Perawat',
        gender: 'Laki-laki',
    },
    '4560': {
        hospitalId: 'RSIJSP',
        name: 'NOPI IRAWAN',
        unit: 'HUMAS & PEMASARAN',
        bagian: 'Perkantoran & Umum',
        professionCategory: 'NON MEDIS',
        profession: 'Perawat',
        gender: 'Laki-laki',
    },
    '5791': {
        hospitalId: 'RSIJSP',
        name: 'MUHAMMAD SAEPUL HIDAYAT,S.Kom',
        unit: 'HUMAS & PEMASARAN',
        bagian: 'Perkantoran & Umum',
        professionCategory: 'NON MEDIS',
        profession: 'Perawat',
        gender: 'Laki-laki',
    },
    '5802': {
        hospitalId: 'RSIJSP',
        name: 'UMAR SAHID SAIFUL AMRI, SE',
        unit: 'HUMAS & PEMASARAN',
        bagian: 'Perkantoran & Umum',
        professionCategory: 'NON MEDIS',
        profession: 'Perawat',
        gender: 'Laki-laki',
    }
};