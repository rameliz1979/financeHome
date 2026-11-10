/**
 * FinanceHome — Repositorio de Hogares (Data Layer)
 * Acceso y operaciones contra las tablas `households` y `household_members`.
 */

import { getSupabaseClient } from './supabase.client.js';

/**
 * Obtiene las membresías de un usuario.
 * @param {string} userId
 * @returns {Promise<Array<{household_id: string, role: string}>>}
 */
export async function getMembershipsByUser(userId) {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', userId);

    if (error || !data) return [];
    return data;
}

/**
 * Obtiene una lista de hogares por sus IDs.
 * @param {string[]} householdIds
 * @returns {Promise<object[]>}
 */
export async function getHouseholdsByIds(householdIds) {
    const client = getSupabaseClient();
    if (!client || householdIds.length === 0) return [];

    const { data, error } = await client
        .from('households')
        .select('*')
        .in('id', householdIds);

    if (error || !data) return [];
    return data;
}

/**
 * Busca un hogar por su código de invitación.
 * @param {string} inviteCode
 * @returns {Promise<object|null>}
 */
export async function findHouseholdByInviteCode(inviteCode) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data, error } = await client
        .from('households')
        .select('*')
        .eq('invite_code', inviteCode)
        .maybeSingle();

    if (error || !data) return null;
    return data;
}

/**
 * Inserta un nuevo hogar en la BD.
 * @param {object} householdObj
 * @returns {Promise<{error: object|null}>}
 */
export async function insertHousehold(householdObj) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('households')
        .insert([householdObj]);

    return { error };
}

/**
 * Inserta la membresía de un usuario a un hogar.
 * @param {object} memberObj
 * @returns {Promise<{error: object|null}>}
 */
export async function insertHouseholdMember(memberObj) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    const { error } = await client
        .from('household_members')
        .insert([memberObj]);

    return { error };
}

/**
 * Crea un hogar y registra al usuario autenticado como administrador usando RPC transaccional.
 * @param {string} name
 * @returns {Promise<{data: string|null, error: object|null}>}
 */
export async function createMyHousehold(name) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: { message: 'Supabase no disponible' } };

    const { data, error } = await client.rpc('create_my_household', {
        p_name: name
    });

    return { data, error };
}

/**
 * Une al usuario autenticado a un hogar usando RPC transaccional.
 * @param {string} inviteCode
 * @returns {Promise<{data: string|null, error: object|null}>}
 */
export async function joinMyHousehold(inviteCode) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: { message: 'Supabase no disponible' } };

    const { data, error } = await client.rpc('join_my_household', {
        p_invite_code: inviteCode
    });

    return { data, error };
}

/**
 * Obtiene todos los hogares registrados (para SuperAdmin).
 * @returns {Promise<object[]>}
 */
export async function getAllHouseholds() {
    const client = getSupabaseClient();
    if (!client) return [];

    const { data, error } = await client
        .from('households')
        .select('*');

    if (error || !data) return [];
    return data;
}
