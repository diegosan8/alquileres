<<<<<<< HEAD
export interface Payment {
    id: string;
    date: string;
    amount: number;
    notes: string;
    allocatedChargeIds: string[];
    type?: string;
}

export interface ValueHistory {
    date: string;
    rent: number;
    tax: number;
}

export interface ContractFile {
    name: string;
    type: string;
    storagePath: string;
    downloadURL: string;
}

export interface Property {
    id: string;
    address: string;
    tenant: {
        name: string;
        email: string;
        phone: string;
    };
    rent: number;
    tax: number;
    contractStartDate: string;
    updateFrequencyMonths: number;
    contractFile?: ContractFile;
    payments: Payment[];
    valueHistory: ValueHistory[];
}

export interface Owner {
    id: string;
    name: string;
    percentage: number;
}

export interface InflationRecord {
    id: string; // YYYY-MM
    yearMonth: string;
    rate: number;
}

export interface Deposit {
    id: string;
    date: string;
    amount: number;
}

export interface Distributions {
    [month: string]: {
        [ownerId: string]: Deposit[];
    };
}

export interface Charge {
    id: string;
    date: string;
    description: string;
    amount: number;
}
=======
// This file is intentionally left blank.
// TypeScript types are removed during the conversion to pure JavaScript
// to ensure browser compatibility without a build step.
>>>>>>> 2e12e770348c4360d07999b59baecd81bf9eaf6c
