/**
 * FinanceHome — Servicio de Hogares (Service Layer)
 * Reglas de negocio para consultar, seleccionar, crear y unirse a hogares.
 */

import {
    getMembershipsByUser,
    getHouseholdsByIds,
    createMyHousehold,
    joinMyHousehold
} from '../data/household.repository.js';
import AppState from '../state.js';

/**
 * Carga todos los hogares donde participa el usuario actual.
 */
export async function loadUserHouseholds() {
    AppState.userHouseholds = [];
    if (!AppState.currentUser) return;

    try {
        const memberships = await getMembershipsByUser(AppState.currentUser.id);
        if (memberships && memberships.length > 0) {
            const hIds = memberships.map(m => m.household_id);
            AppState.userHouseholds = await getHouseholdsByIds(hIds);
        }
    } catch (err) {
        console.error('Error cargando hogares:', err);
    }
}

/**
 * Selecciona el hogar activo.
 * @param {string} [householdId]
 */
export function selectHousehold(householdId) {
    if (householdId) {
        AppState.activeHousehold = AppState.userHouseholds.find(h => h.id === householdId) || null;
    } else if (!AppState.activeHousehold || !AppState.userHouseholds.some(h => h.id === AppState.activeHousehold.id)) {
        AppState.activeHousehold = AppState.userHouseholds[0] || null;
    }
}

/**
 * Crea un nuevo hogar y registra al usuario actual como admin.
 * @param {string} name
 * @returns {Promise<{success: boolean, message: string, household: object|null}>}
 */
export async function createHousehold(name) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado', household: null };
    }

    if (!name || !name.trim()) {
        return { success: false, message: 'Debes indicar el nombre del hogar', household: null };
    }

    try {
        const existingMemberships = await getMembershipsByUser(AppState.currentUser.id);
        if (existingMemberships.length > 0) {
            return {
                success: false,
                message: 'Ya perteneces a un hogar. Cada usuario solo puede crear o pertenecer a un hogar.',
                household: null
            };
        }

        const { data: newHId, error } = await createMyHousehold(name.trim());
        if (error) return { success: false, message: error.message, household: null };

        await loadUserHouseholds();
        AppState.activeHousehold = AppState.userHouseholds.find(h => h.id === newHId) || null;

        return { success: true, message: '¡Hogar creado satisfactoriamente!', household: AppState.activeHousehold };

    } catch (err) {
        console.error('Error en creación de hogar:', err);
        return { success: false, message: 'Error inesperado al crear hogar', household: null };
    }
}

/**
 * Se une a un hogar usando el código de invitación.
 * @param {string} inviteCode
 * @returns {Promise<{success: boolean, message: string, household: object|null}>}
 */
export async function joinHousehold(inviteCode) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado', household: null };
    }

    if (!inviteCode || !inviteCode.trim()) {
        return { success: false, message: 'Debes indicar el código de invitación', household: null };
    }

    try {
        const existingMemberships = await getMembershipsByUser(AppState.currentUser.id);
        if (existingMemberships.length > 0) {
            return {
                success: false,
                message: 'Ya perteneces a un hogar. No puedes unirte a otro.',
                household: null
            };
        }

        const { data: householdId, error } = await joinMyHousehold(inviteCode.trim().toUpperCase());
        if (error) return { success: false, message: error.message, household: null };

        await loadUserHouseholds();
        AppState.activeHousehold = AppState.userHouseholds.find(h => h.id === householdId) || null;

        const householdName = AppState.activeHousehold?.name || 'tu hogar';
        return { success: true, message: `¡Te has unido a ${householdName}!`, household: AppState.activeHousehold };

    } catch (err) {
        console.error('Error al unirse al hogar:', err);
        return { success: false, message: 'Error inesperado al unirse', household: null };
    }
}
