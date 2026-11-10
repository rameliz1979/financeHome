/**
 * FinanceHome — Cliente Supabase
 * Inicialización centralizada del cliente de Supabase (Singleton).
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

let supabaseClient = null;

/**
 * Obtiene o inicializa la instancia singleton del cliente Supabase.
 * @returns {object|null}
 */
export function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;

    try {
        if (typeof supabase !== 'undefined') {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
    } catch (e) {
        console.error('Error inicializando cliente de Supabase:', e);
    }

    return supabaseClient;
}
