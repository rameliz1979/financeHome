/**
 * FinanceHome — Repositorio de Transacciones (Data Layer)
 * Acceso y operaciones contra la tabla `transactions`.
 */

import { getSupabaseClient } from './supabase.client.js';

/**
 * Obtiene todas las transacciones de un hogar específico.
 * @param {string} householdId
 * @returns {Promise<object[]>}
 */
export async function getTransactionsByHousehold(householdId) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('transactions')
        .select('*')
        .eq('household_id', householdId)
        .order('transaction_date', { ascending: false });

    if (error || !data) return [];
    return data;
}

/**
 * Inserta un nuevo movimiento.
 * @param {object} txObj
 * @returns {Promise<{error: object|null}>}
 */
export async function insertTransaction(txObj) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('transactions')
        .insert([txObj]);

    return { error };
}

/**
 * Actualiza una transacción por su ID.
 * @param {string} txId
 * @param {object} updates
 * @param {string} [userId] - Limita la actualización al usuario autor.
 * @returns {Promise<{error: object|null}>}
 */
export async function updateTransactionById(txId, updates, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    let query = client
        .from('transactions')
        .update(updates)
        .eq('id', txId);

    if (userId) query = query.eq('user_id', userId);

    const { error } = await query;

    return { error };
}

/**
 * Elimina una transacción por su ID.
 * @param {string} txId
 * @param {string} [userId] - Limita la eliminación al usuario autor.
 * @returns {Promise<{error: object|null}>}
 */
export async function deleteTransactionById(txId, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    let query = client
        .from('transactions')
        .delete()
        .eq('id', txId);

    if (userId) query = query.eq('user_id', userId);

    const { error } = await query;

    return { error };
}

/**
 * Obtiene la totalidad de transacciones registradas (para SuperAdmin).
 * @returns {Promise<object[]>}
 */
export async function getAllTransactions() {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('transactions')
        .select('*');

    if (error || !data) return [];
    return data;
}
