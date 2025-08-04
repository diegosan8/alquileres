import type { Property } from './types.js';

export const generateChargesForProperty = (property: Property) => {
    const charges = [];
    if (!property.contractStartDate || !property.valueHistory || property.valueHistory.length === 0) {
        return [];
    }

    let currentDate = new Date(property.contractStartDate);
    currentDate.setMinutes(currentDate.getMinutes() + currentDate.getTimezoneOffset());
    const today = new Date();
    
    const sortedHistory = [...property.valueHistory].sort((a, b) => a.date.localeCompare(b.date));

    while (currentDate <= today) {
        const chargeDateStr = currentDate.toISOString().slice(0, 10);
        
        const applicableValues = sortedHistory
            .filter(h => h.date <= chargeDateStr)
            .pop(); // Get the latest one on or before the charge date

        if(applicableValues) {
            const { rent, tax } = applicableValues;
            if (rent > 0) {
                charges.push({ id: `${property.id}-alquiler-${chargeDateStr}`, date: chargeDateStr, description: 'Alquiler', amount: rent });
            }
            if (tax > 0) {
                charges.push({ id: `${property.id}-tsg-${chargeDateStr}`, date: chargeDateStr, description: 'TSG', amount: tax });
            }
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return charges;
};

export const formatDate = (dateString, options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
    return date.toLocaleDateString('es-ES', options);
}

export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount || 0);
}
