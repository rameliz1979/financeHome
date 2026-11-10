/**
 * FinanceHome — Servicio de Administración (Service Layer)
 * Reglas de negocio para el panel de SuperAdministrador.
 */

import { getSupabaseClient } from '../data/supabase.client.js';
import { getAllUsers, updateUser, upsertUser } from '../data/user.repository.js';
import { getAllHouseholds } from '../data/household.repository.js';
import { getAllTransactions } from '../data/transaction.repository.js';
import { DEFAULT_PHONE, SUPER_ADMIN_ROLE } from '../config.js';
import AppState from '../state.js';

/**
 * Carga las métricas globales para el panel de SuperAdministrador.
 * @returns {Promise<{users: object[], households: object[], transactions: object[], totalVolume: number}>}
 */
export async function loadSuperAdminMetrics() {
    try {
        const [users, households, transactions] = await Promise.all([
            getAllUsers(),
            getAllHouseholds(),
            getAllTransactions()
        ]);

        let totalVolume = 0;
        transactions.forEach(t => totalVolume += Number(t.amount || 0));

        return { users, households, transactions, totalVolume };

    } catch (err) {
        console.error('Error cargando métricas de superadministrador:', err);
        return { users: [], households: [], transactions: [], totalVolume: 0 };
    }
}

/**
 * Activa o suspende el estado de un usuario.
 * @param {string} userId
 * @param {boolean} currentActive
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function toggleUserStatus(userId, currentActive) {
    try {
        const { error } = await updateUser(userId, { is_active: !currentActive });
        if (error) throw error;
        return { success: true, message: `Usuario ${!currentActive ? 'activado' : 'suspendido'} exitosamente` };
    } catch (err) {
        console.error('Error al cambiar estado del usuario:', err);
        return { success: false, message: 'Error: ' + err.message };
    }
}

/**
 * Crea un nuevo usuario directamente desde el panel de SuperAdministrador.
 * @param {object} params - { name, email, password, role }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function createAdminUser({ name, email, password, role }) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const isSuperAdmin = role === SUPER_ADMIN_ROLE;
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: name, role_profile: role, is_superadmin: isSuperAdmin } }
        });

        if (error) throw error;

        if (data.user) {
            const { error: profileError } = await upsertUser({
                id: data.user.id,
                full_name: name,
                email: email,
                phone: DEFAULT_PHONE,
                is_active: true,
                is_superadmin: isSuperAdmin
            });
            if (profileError) throw profileError;
        }

        return { success: true, message: isSuperAdmin ? '¡SuperAdministrador registrado correctamente!' : '¡Usuario registrado correctamente!' };

    } catch (err) {
        console.error('Error creando usuario por Admin:', err);
        return { success: false, message: err.message };
    }
}

/**
 * Registra un nuevo perfil de rol en el sistema.
 * @param {string} name
 * @param {string} desc
 * @param {string[]} perms
 */
export function createCustomRole(name, desc, perms) {
    AppState.systemRoles.push({ name, desc, perms });
}
