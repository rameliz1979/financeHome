/**
 * FinanceHome — Repositorio de Cuotas (Data Layer)
 * Acceso y operaciones contra la tabla `installments`.
 */

import { getSupabaseClient } from './supabase.client.js';

/**
 * Obtiene todas las cuotas de un hogar.
 * @param {string} householdId
 * @returns {Promise<object[]>}
 */
export async function getInstallmentsByHousehold(householdId) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('installments')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
}

/**
 * Inserta una nueva compra a cuotas.
 * @param {object} instObj
 * @returns {Promise<{error: object|null}>}
 */
export async function insertInstallment(instObj) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('installments')
        .insert([instObj]);

    return { error };
}

/**
 * Actualiza los campos de una cuota.
 * @param {string} instId
 * @param {object} updates
 * @param {string} [userId] - Limita la actualización al usuario autor.
 * @returns {Promise<{error: object|null}>}
 */
export async function updateInstallment(instId, updates, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    let query = client
        .from('installments')
        .update(updates)
        .eq('id', instId);

    if (userId) query = query.eq('user_id', userId);

    const { error } = await query;

    return { error };
}

/**
 * Elimina una cuota por su ID.
 * @param {string} instId
 * @param {string} [userId] - Limita la eliminación al usuario autor.
 * @returns {Promise<{error: object|null}>}
 */
export async function deleteInstallmentById(instId, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    let query = client
        .from('installments')
        .delete()
        .eq('id', instId);

    if (userId) query = query.eq('user_id', userId);

    const { error } = await query;

    return { error };
}
