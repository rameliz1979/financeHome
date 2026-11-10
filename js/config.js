/**
 * FinanceHome — Configuración Global
 * Constantes y credenciales centralizadas.
 */

export const SUPABASE_URL = 'https://kgpwxzgpzentbaapbyga.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_abeumhqyPLyGEz3-g8QFLQ_8aRQI8rW';

export const OTP_LENGTH = 8;
export const SUPER_ADMIN_EMAIL = 'star.home.9791@gmail.com';
export const SUPER_ADMIN_ROLE = 'SuperAdministrador';
export const DEFAULT_PHONE = '3127200361';

export const DEFAULT_SYSTEM_ROLES = [
    {
        name: 'Administrador de Hogar',
        desc: 'Control total sobre transacciones e integrantes del hogar',
        perms: ['Crear Hogar', 'Movimientos', 'Cuotas', 'Invitar']
    },
    {
        name: 'Miembro Estándar',
        desc: 'Acceso a registrar y visualizar sus movimientos',
        perms: ['Movimientos', 'Cuotas']
    },
    {
        name: 'Auditor / Contador',
        desc: 'Solo lectura de reportes y balances generales',
        perms: ['Movimientos']
    }
];

export const CHART_COLORS = {
    income: '#22c55e',
    expense: '#ef4444',
    installments: '#f59e0b'
};

export const LOCALE = 'es-CO';
