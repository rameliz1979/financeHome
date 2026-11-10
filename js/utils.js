/**
 * FinanceHome — Utilidades Generales
 * Funciones de ayuda reutilizables en todas las capas.
 */

import { LOCALE } from './config.js';

/**
 * Muestra una notificación toast temporal en pantalla.
 * @param {string} message
 * @param {'success'|'error'} type
 */
export function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const bgClass = type === 'success' ? 'bg-emerald-600' : 'bg-rose-600';
    const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

    toast.className = `${bgClass} text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 transition-all transform translate-y-2 opacity-0 z-50`;
    toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * Formatea un valor numérico a moneda colombiana.
 * @param {number} value
 * @returns {string}
 */
export function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString(LOCALE)}`;
}

/**
 * Genera un código de invitación aleatorio.
 * @returns {string} Formato HFG-XXXX
 */
export function generateInviteCode() {
    return 'HFG-' + Math.floor(1000 + Math.random() * 9000);
}

/**
 * Convierte un código de rol técnico de la BD a un nombre amigable.
 * @param {string} roleCode
 * @returns {string}
 */
export function getFriendlyRoleName(roleCode) {
    if (!roleCode) return 'Miembro Estándar';
    if (roleCode === 'admin') return 'Administrador de Hogar';
    if (roleCode === 'member') return 'Miembro Estándar';
    return roleCode;
}

/**
 * Convierte un nombre amigable de rol a su código ENUM para la BD.
 * @param {string} roleName
 * @returns {string}
 */
export function getDbRoleCode(roleName) {
    if (roleName === 'Administrador de Hogar' || roleName === 'admin') return 'admin';
    return 'member';
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD.
 * @returns {string}
 */
export function todayISO() {
    return new Date().toISOString().split('T')[0];
}
