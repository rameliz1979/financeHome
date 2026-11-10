/**
 * FinanceHome — UI de presupuesto y notificaciones financieras.
 */

import {
    getHouseholdBudget,
    getHouseholdMembershipRole,
    getHouseholdNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
    saveHouseholdBudget,
    subscribeToNotificationChanges,
    unsubscribeFromNotificationChanges
} from '../data/notification.repository.js';
import { formatCurrency, showToast, todayISO } from '../utils.js';
import AppState from '../state.js';

let activeHouseholdId = null;
let activeUserId = null;
let notificationChannel = null;
let notificationRequestId = 0;

function renderBudgetOverview(monthlyBudget) {
    const input = document.getElementById('monthlyBudgetInput');
    const spentLabel = document.getElementById('budgetSpentText');
    const progress = document.getElementById('budgetProgressBar');
    const progressFill = document.getElementById('budgetProgressFill');
    const status = document.getElementById('budgetStatusText');

    if (!input || !spentLabel || !progress || !progressFill || !status) return;
    if (document.activeElement !== input) input.value = monthlyBudget || '';

    const currentMonth = todayISO().slice(0, 7);
    const spent = AppState.householdTransactions.reduce((total, transaction) => {
        if (transaction.type !== 'expense' || !String(transaction.transaction_date || '').startsWith(currentMonth)) {
            return total;
        }
        return total + Number(transaction.amount || 0);
    }, 0);

    if (!monthlyBudget || monthlyBudget <= 0) {
        spentLabel.textContent = 'Aún no hay un presupuesto mensual configurado.';
        progressFill.style.width = '0%';
        progressFill.className = 'h-full rounded-full bg-emerald-500 transition-all';
        progress.setAttribute('aria-valuenow', '0');
        status.textContent = 'Configura el límite mensual para activar las alertas del 80 %, 90 % y 100 %.';
        return;
    }

    const percentage = (spent / monthlyBudget) * 100;
    const progressPercentage = Math.min(percentage, 100);
    const colorClass = percentage >= 100 ? 'bg-rose-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

    spentLabel.textContent = `${formatCurrency(spent)} de ${formatCurrency(monthlyBudget)} (${Math.floor(percentage)} %)`;
    progressFill.style.width = `${progressPercentage}%`;
    progressFill.className = `h-full rounded-full ${colorClass} transition-all`;
    progress.setAttribute('aria-valuenow', String(Math.min(Math.round(percentage), 100)));
    status.textContent = percentage >= 100
        ? 'El presupuesto mensual se alcanzó o superó.'
        : percentage >= 90
            ? 'Se alcanzó el umbral del 90 %.'
            : percentage >= 80
                ? 'Se alcanzó el umbral del 80 %.'
                : 'Se notificará a cada integrante al alcanzar el 80 %, 90 % y 100 %.';
}

function renderNotificationList(notifications) {
    const list = document.getElementById('notificationList');
    if (!list) return;

    list.replaceChildren();
    if (notifications.length === 0) {
        const emptyState = document.createElement('p');
        emptyState.className = 'px-4 py-8 text-center text-xs text-gray-500';
        emptyState.textContent = 'No hay alertas financieras para este hogar.';
        list.appendChild(emptyState);
        return;
    }

    notifications.forEach((notification) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.dataset.notificationId = notification.id;
        item.className = `w-full border-b border-gray-100 dark:border-gray-800 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 ${notification.read_at ? '' : 'bg-emerald-50/70 dark:bg-emerald-950/20'}`;

        const heading = document.createElement('span');
        heading.className = 'flex items-center justify-between gap-3 text-xs font-bold text-gray-900 dark:text-white';
        const title = document.createElement('span');
        title.textContent = notification.title;
        const unreadMarker = document.createElement('span');
        unreadMarker.className = `h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-transparent' : 'bg-emerald-500'}`;
        unreadMarker.setAttribute('aria-label', notification.read_at ? 'Leída' : 'No leída');
        heading.append(title, unreadMarker);

        const message = document.createElement('span');
        message.className = 'mt-1 block text-[11px] leading-relaxed text-gray-600 dark:text-gray-300';
        message.textContent = notification.message;

        const meta = document.createElement('span');
        meta.className = 'mt-2 flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400';
        const status = document.createElement('span');
        status.textContent = notification.is_active ? 'Umbral vigente' : 'Umbral corregido';
        const date = document.createElement('time');
        date.dateTime = notification.created_at;
        date.textContent = new Date(notification.created_at).toLocaleString('es-CO', {
            dateStyle: 'short',
            timeStyle: 'short'
        });
        meta.append(status, date);
        item.append(heading, message, meta);
        list.appendChild(item);
    });
}

async function refreshNotificationHistory(householdId, userId, requestId) {
    const [notificationsResult, countResult] = await Promise.all([
        getHouseholdNotifications(householdId, userId),
        getUnreadNotificationCount(householdId, userId)
    ]);

    if (requestId !== notificationRequestId || householdId !== activeHouseholdId) return;

    const list = document.getElementById('notificationList');
    if (notificationsResult.error || countResult.error) {
        if (list) {
            list.textContent = 'No se pudieron cargar las alertas. Verifica que la migración de Supabase esté aplicada.';
        }
        return;
    }

    renderNotificationList(notificationsResult.data || []);
    const unreadCount = countResult.count || 0;
    const badge = document.getElementById('notificationUnreadCount');
    const markAllButton = document.getElementById('markAllNotificationsReadBtn');
    if (badge) {
        badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
        badge.classList.toggle('hidden', unreadCount === 0);
        badge.setAttribute('aria-label', `${unreadCount} notificaciones no leídas`);
    }
    if (markAllButton) markAllButton.disabled = unreadCount === 0;
}

export function initNotificationsUI() {
    const bell = document.getElementById('notificationBellBtn');
    const panel = document.getElementById('notificationPanel');
    const budgetForm = document.getElementById('monthlyBudgetForm');
    const list = document.getElementById('notificationList');
    const markAllButton = document.getElementById('markAllNotificationsReadBtn');

    bell?.addEventListener('click', () => {
        const isOpening = panel?.classList.contains('hidden');
        panel?.classList.toggle('hidden', !isOpening);
        bell.setAttribute('aria-expanded', String(Boolean(isOpening)));
    });

    document.addEventListener('click', (event) => {
        const control = document.getElementById('notificationControl');
        if (control && !control.contains(event.target)) {
            panel?.classList.add('hidden');
            bell?.setAttribute('aria-expanded', 'false');
        }
    });

    list?.addEventListener('click', async (event) => {
        const item = event.target.closest('[data-notification-id]');
        if (!item || !AppState.currentUser) return;

        const { error } = await markNotificationRead(item.dataset.notificationId, AppState.currentUser.id);
        if (error) {
            showToast('No se pudo marcar la alerta como leída.', 'error');
            return;
        }
        await refreshNotificationHistory(activeHouseholdId, activeUserId, notificationRequestId);
    });

    markAllButton?.addEventListener('click', async () => {
        if (!activeHouseholdId || !activeUserId) return;
        const { error } = await markAllNotificationsRead(activeHouseholdId, activeUserId);
        if (error) {
            showToast('No se pudieron marcar las alertas como leídas.', 'error');
            return;
        }
        await refreshNotificationHistory(activeHouseholdId, activeUserId, notificationRequestId);
    });

    budgetForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!AppState.activeHousehold) return;

        const monthlyBudget = Number(document.getElementById('monthlyBudgetInput')?.value);
        if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
            showToast('Ingresa un presupuesto mensual mayor que cero.', 'error');
            return;
        }

        const { error } = await saveHouseholdBudget(AppState.activeHousehold.id, monthlyBudget);
        if (error) {
            showToast('No se pudo guardar el presupuesto. Verifica la migración y el acceso al hogar.', 'error');
            return;
        }

        await syncNotificationsForActiveHousehold();
        showToast('Presupuesto mensual actualizado.', 'success');
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        void unsubscribeFromNotificationChanges(notificationChannel);
        notificationChannel = null;
        activeHouseholdId = null;
        activeUserId = null;
    });
}

export async function syncNotificationsForActiveHousehold() {
    const householdId = AppState.activeHousehold?.id || null;
    const userId = AppState.currentUser?.id || null;
    const requestId = ++notificationRequestId;

    if (!householdId || !userId) {
        await unsubscribeFromNotificationChanges(notificationChannel);
        notificationChannel = null;
        activeHouseholdId = null;
        activeUserId = null;
        document.querySelectorAll('#monthlyBudgetForm input, #monthlyBudgetForm button').forEach((control) => {
            control.disabled = true;
        });
        const bell = document.getElementById('notificationBellBtn');
        if (bell) bell.disabled = true;
        renderNotificationList([]);
        renderBudgetOverview(null);
        const badge = document.getElementById('notificationUnreadCount');
        if (badge) badge.classList.add('hidden');
        return;
    }

    if (householdId !== activeHouseholdId || userId !== activeUserId) {
        await unsubscribeFromNotificationChanges(notificationChannel);
        activeHouseholdId = householdId;
        activeUserId = userId;
        notificationChannel = subscribeToNotificationChanges(userId, () => {
            const eventRequestId = ++notificationRequestId;
            void refreshNotificationHistory(householdId, userId, eventRequestId);
        });
    }

    const bell = document.getElementById('notificationBellBtn');
    if (bell) bell.disabled = false;

    const [budgetResult, membershipRole] = await Promise.all([
        getHouseholdBudget(householdId),
        getHouseholdMembershipRole(userId, householdId)
    ]);
    if (requestId !== notificationRequestId) return;
    const canManageBudget = membershipRole === 'admin';
    if (budgetResult.error) {
        renderBudgetOverview(null);
        const status = document.getElementById('budgetStatusText');
        if (status) status.textContent = 'No se pudo cargar el presupuesto. Verifica que la migración de Supabase esté aplicada.';
    } else {
        renderBudgetOverview(Number(budgetResult.data?.monthly_budget || 0));
    }
    document.querySelectorAll('#monthlyBudgetForm input, #monthlyBudgetForm button').forEach((control) => {
        control.disabled = !canManageBudget;
    });
    const budgetInput = document.getElementById('monthlyBudgetInput');
    const budgetSubmit = document.querySelector('#monthlyBudgetForm button[type="submit"]');
    if (budgetInput) budgetInput.title = canManageBudget ? '' : 'Solo el administrador del hogar puede cambiar el presupuesto.';
    if (budgetSubmit) budgetSubmit.title = canManageBudget ? '' : 'Solo el administrador del hogar puede cambiar el presupuesto.';

    await refreshNotificationHistory(householdId, userId, requestId);
}
