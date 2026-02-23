export const TASK_STATUS_MAP: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    '3': { label: 'Nowe', color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    '4': { label: 'W trakcie', color: 'text-amber-600', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' },
    '1': { label: 'Zablokowane', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    '2': { label: 'Oczekuje na akceptację', color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
    '0': { label: 'Zakończone', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    '-1': { label: 'Zarchiwizowane', color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
};

export const TASK_PRIORITY_MAP: Record<string, { label: string; color: string }> = {
    'critical': { label: 'Krytyczny', color: 'text-red-700 bg-red-100 border-red-300' },
    'high': { label: 'Wysoki', color: 'text-red-500 bg-red-50 border-red-200' },
    'medium': { label: 'Średni', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    'low': { label: 'Niski', color: 'text-green-600 bg-green-50 border-green-200' },
    'lowest': { label: 'Najniższy', color: 'text-blue-500 bg-blue-50 border-blue-200' },
};

// Słownik statusów z samych aktualizacji (project updates z starej wersji)
export const PROJECT_STATUS_MAP = {
    0: { label: 'Na dobrej drodze', color: 'text-green-600' },
    1: { label: 'Zagrożony', color: 'text-amber-600' },
    2: { label: 'Problem', color: 'text-red-600' }
};
