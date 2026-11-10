/**
 * FinanceHome — Repositorio de Usuarios (Data Layer)
 * Acceso directo y CRUD a la tabla `public.users`.
 */

import { getSupabaseClient } from './supabase.client.js';

/**
 * Busca un usuario por su ID.
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function findUserById(userId) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    return data;
}

/**
 * Inserta o actualiza un registro en `users` (upsert).
 * @param {object} userObj
 * @returns {Promise<{error: object|null}>}
 */
export async function upsertUser(userObj) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('users')
        .upsert([userObj]);

    return { error };
}

/**
 * Actualiza campos específicos de un usuario por su ID.
 * @param {string} userId
 * @param {object} updates
 * @returns {Promise<{error: object|null}>}
 */
export async function updateUser(userId, updates) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('users')
        .update(updates)
        .eq('id', userId);

    return { error };
}

/**
 * Obtiene la lista completa de usuarios (para SuperAdmin).
 * @returns {Promise<object[]>}
 */
export async function getAllUsers() {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('users')
        .select('*');

    if (error || !data) return [];
    return data;
}
