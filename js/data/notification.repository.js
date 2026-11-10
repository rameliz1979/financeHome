/**
 * FinanceHome — Repositorio de Presupuesto y Notificaciones.
 */

import { getSupabaseClient } from './supabase.client.js';
import { getMembershipsByUser } from './household.repository.js';

export async function getHouseholdMembershipRole(userId, householdId) {
    const memberships = await getMembershipsByUser(userId);
    return memberships.find((membership) => membership.household_id === householdId)?.role || null;
}

export async function getHouseholdBudget(householdId) {
    const client = getSupabaseClient();
    if (!client) return { data: null, error: { message: 'Supabase no disponible' } };

    return client
        .from('household_budgets')
        .select('monthly_budget')
        .eq('household_id', householdId)
        .maybeSingle();
}

export async function saveHouseholdBudget(householdId, monthlyBudget) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    return client
        .from('household_budgets')
        .upsert({ household_id: householdId, monthly_budget: monthlyBudget }, { onConflict: 'household_id' });
}

export async function getHouseholdNotifications(householdId, userId) {
    const client = getSupabaseClient();
    if (!client) return { data: [], error: { message: 'Supabase no disponible' } };

    return client
        .from('notifications')
        .select('id, household_id, period_start, threshold_percent, title, message, is_active, read_at, created_at')
        .eq('household_id', householdId)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });
}

export async function getUnreadNotificationCount(householdId, userId) {
    const client = getSupabaseClient();
    if (!client) return { count: 0, error: { message: 'Supabase no disponible' } };

    const { count, error } = await client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('recipient_id', userId)
        .is('read_at', null);

    return { count: count || 0, error };
}

export async function markNotificationRead(notificationId, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    return client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', userId)
        .is('read_at', null);
}

export async function markAllNotificationsRead(householdId, userId) {
    const client = getSupabaseClient();
    if (!client) return { error: { message: 'Supabase no disponible' } };

    return client
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('household_id', householdId)
        .eq('recipient_id', userId)
        .is('read_at', null);
}

export function subscribeToNotificationChanges(userId, onChange) {
    const client = getSupabaseClient();
    if (!client || !userId) return null;

    return client
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `recipient_id=eq.${userId}`
        }, onChange)
        .subscribe();
}

export async function unsubscribeFromNotificationChanges(channel) {
    const client = getSupabaseClient();
    if (client && channel) await client.removeChannel(channel);
}
