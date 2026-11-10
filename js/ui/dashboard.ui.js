/**
 * FinanceHome — UI del Dashboard (UI Layer)
 * Renderizado de métricas, movimientos, cuotas, miembros y gráficos.
 */

import { calculateMetrics } from '../services/finance.service.js';
import { CHART_COLORS } from '../config.js';
import { formatCurrency } from '../utils.js';
import AppState from '../state.js';

let onDashboardReload = null;

function updateHouseholdAccessUI() {
    const hasHousehold = AppState.userHouseholds.length > 0;

    ['btnOpenCreateHousehold', 'bannerCreateBtn', 'bannerJoinBtn', 'btnOpenInviteModal'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;

        btn.disabled = hasHousehold;
        btn.setAttribute('aria-disabled', String(hasHousehold));
        btn.classList.toggle('hidden', hasHousehold);
    });

    document.getElementById('btnOpenCreateHousehold')?.setAttribute('title', hasHousehold ? 'Ya perteneces a un hogar' : 'Crear Nuevo Hogar');
    document.getElementById('btnOpenInviteModal')?.setAttribute('title', hasHousehold ? 'Ya perteneces a un hogar' : 'Unirse a un Hogar');
}

/**
 * Renderiza los 4 cuadros de métricas superiores.
 */
export function renderDashboardMetrics() {
    const { income, expense, installments, balance } = calculateMetrics();

    document.getElementById('metricBalance').textContent = formatCurrency(balance);
    document.getElementById('metricIncome').textContent = formatCurrency(income);
    document.getElementById('metricExpense').textContent = formatCurrency(expense);
    document.getElementById('metricInstallments').textContent = formatCurrency(installments);
}

/**
 * Renderiza la tabla de movimientos (ingresos y gastos).
 */
export function renderTransactionsTable() {
    const tbody = document.getElementById('transactionsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (AppState.householdTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">No hay movimientos registrados en este hogar.</td></tr>`;
        return;
    }

    AppState.householdTransactions.forEach(t => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors';
        const isInc = t.type === 'income';
        const canManage = t.user_id === AppState.currentUser?.id;

        tr.innerHTML = `
            <td class="py-3 px-3 font-semibold text-gray-900 dark:text-white break-anywhere">${t.concept}</td>
            <td class="py-3 px-3">
                <span class="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${isInc ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}">
                    ${isInc ? 'Ingreso' : 'Gasto'}
                </span>
            </td>
            <td class="py-3 px-3 text-gray-500 break-anywhere">${t.category_name}</td>
            <td class="py-3 px-3 text-gray-500 break-anywhere">${t.responsable_name}</td>
            <td class="py-3 px-3 text-right font-extrabold ${isInc ? 'text-emerald-600' : 'text-rose-600'}">
                ${isInc ? '+' : '-'}${formatCurrency(t.amount)}
            </td>
            <td class="py-3 px-3 text-right">
                ${canManage ? `
                    <div class="flex items-center justify-end gap-1.5">
                        <button type="button" data-tx-edit="${t.id}" class="px-2 py-1 text-[10px] font-bold rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">Editar</button>
                        <button type="button" data-tx-delete="${t.id}" class="px-2 py-1 text-[10px] font-bold rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Eliminar</button>
                    </div>
                ` : '<span class="text-[10px] text-gray-400">Solo lectura</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-tx-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('financehome:edit-transaction', { detail: { id: btn.getAttribute('data-tx-edit') } }));
        });
    });

    tbody.querySelectorAll('[data-tx-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('financehome:delete-transaction', { detail: { id: btn.getAttribute('data-tx-delete') } }));
        });
    });
}

/**
 * Renderiza los compromisos a cuotas con botón directo de WhatsApp.
 */
export function renderInstallmentsList() {
    const container = document.getElementById('installmentsContainer');
    if (!container) return;
    container.innerHTML = '';

    if (AppState.householdInstallments.length === 0) {
        container.innerHTML = `<p class="text-xs text-center text-gray-400 py-6">No hay compromisos a cuotas registrados.</p>`;
        return;
    }

    AppState.householdInstallments.forEach(inst => {
        const div = document.createElement('div');
        div.className = 'p-3 sm:p-3.5 bg-white/60 dark:bg-gray-800/60 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 min-w-0';
        const canManage = inst.user_id === AppState.currentUser?.id;

        const message = encodeURIComponent(`Hola, te envío un recordatorio del pago para FinanceHome:\n📌 Compromiso: ${inst.concept}\n💰 Cuota Mensual: ${formatCurrency(inst.amount_per_month)}\n📅 Fecha Límite: ${inst.next_due_date}\n👤 Responsable: ${inst.responsable_name}`);
        const waUrl = `https://wa.me/573127200361?text=${message}`;

        div.innerHTML = `
            <div class="space-y-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 min-w-0">
                    <span class="font-bold text-xs text-gray-900 dark:text-white break-anywhere">${inst.concept}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">${inst.paid_cuotas}/${inst.total_cuotas} Cuotas</span>
                </div>
                <p class="text-[11px] text-gray-500 break-anywhere">Próximo Vencimiento: <strong>${inst.next_due_date}</strong> (${inst.responsable_name})</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 w-full xs:w-auto justify-between xs:justify-end">
                <span class="font-extrabold text-xs sm:text-sm text-amber-600 dark:text-amber-400">${formatCurrency(inst.amount_per_month)}/mes</span>
                <a href="${waUrl}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] rounded-xl shadow flex items-center gap-1.5 transition-all">
                    <i class="fab fa-whatsapp text-sm"></i> <span>Recordar</span>
                </a>
                ${canManage ? `
                    <button type="button" data-inst-edit="${inst.id}" class="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30">Editar</button>
                    <button type="button" data-inst-delete="${inst.id}" class="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">Eliminar</button>
                ` : '<span class="text-[10px] text-gray-400">Solo lectura</span>'}
            </div>
        `;
        container.appendChild(div);
    });

    container.querySelectorAll('[data-inst-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('financehome:edit-installment', { detail: { id: btn.getAttribute('data-inst-edit') } }));
        });
    });

    container.querySelectorAll('[data-inst-delete]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('financehome:delete-installment', { detail: { id: btn.getAttribute('data-inst-delete') } }));
        });
    });
}

/**
 * Renderiza la lista de miembros del hogar activo.
 */
export function renderMembersList() {
    const container = document.getElementById('membersList');
    if (!container) return;

    container.innerHTML = `
        <div class="flex items-center justify-between p-2 rounded-xl bg-white/40 dark:bg-gray-800/40">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-full bg-brand-500/20 text-brand-600 font-bold text-xs flex items-center justify-center shrink-0">
                    ${AppState.currentUser?.full_name?.charAt(0) || 'U'}
                </div>
                <span class="text-xs font-bold text-gray-800 dark:text-gray-200 truncate max-w-[150px]">${AppState.currentUser?.full_name || 'Usuario'} (Tú)</span>
            </div>
            <span class="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded shrink-0">Administrador de Hogar</span>
        </div>
    `;
}

/**
 * Renderiza la gráfica circular (Chart.js) de distribución financiera.
 */
export function renderChart() {
    const ctx = document.getElementById('financeChart')?.getContext('2d');
    if (!ctx) return;

    const { income, expense, installments, balance } = calculateMetrics();
    const available = Math.max(balance, 0);
    const spent = Math.min(income, expense + installments);

    if (AppState.chartInstance) AppState.chartInstance.destroy();

    AppState.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Dinero disponible', 'Gastado del total'],
            datasets: [{
                data: [available, spent],
                backgroundColor: [CHART_COLORS.income, CHART_COLORS.expense],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
            }
        }
    });
}

/**
 * Renderiza el selector de hogar activo en el header.
 */
export function renderHouseholdSelector() {
    const select = document.getElementById('householdSelect');
    const banner = document.getElementById('noHouseholdBanner');
    if (!select) return;
    select.innerHTML = '';

    if (AppState.userHouseholds.length === 0) {
        select.innerHTML = '<option value="">Sin Hogar Activo</option>';
        banner?.classList.remove('hidden');
        AppState.activeHousehold = null;
    } else {
        banner?.classList.add('hidden');
        AppState.userHouseholds.forEach(h => {
            const opt = document.createElement('option');
            opt.value = h.id;
            opt.textContent = h.name;
            select.appendChild(opt);
        });

        if (!AppState.activeHousehold || !AppState.userHouseholds.some(h => h.id === AppState.activeHousehold.id)) {
            AppState.activeHousehold = AppState.userHouseholds[0];
        }
        select.value = AppState.activeHousehold.id;
    }

    updateHouseholdAccessUI();
}

/**
 * Renderiza todas las secciones del dashboard.
 */
export function renderAllDashboard() {
    if (!AppState.activeHousehold) {
        document.getElementById('metricBalance').textContent = '$0';
        document.getElementById('metricIncome').textContent = '$0';
        document.getElementById('metricExpense').textContent = '$0';
        document.getElementById('metricInstallments').textContent = '$0';
        document.getElementById('inviteCodeDisplay').textContent = '---';
        document.getElementById('transactionsTbody').innerHTML = `<tr><td colspan="6" class="py-8 text-center text-gray-400">No hay un hogar seleccionado. Crea uno nuevo arriba.</td></tr>`;
        document.getElementById('installmentsContainer').innerHTML = `<p class="text-xs text-center text-gray-400 py-6">No hay compromisos a cuotas.</p>`;
        return;
    }

    document.getElementById('inviteCodeDisplay').textContent = AppState.activeHousehold.invite_code || '---';
    renderDashboardMetrics();
    renderTransactionsTable();
    renderInstallmentsList();
    renderMembersList();
    renderChart();
}

/**
 * Inicializa los eventos estáticos del Dashboard (se llama 1 sola vez).
 * @param {Function} reloadFn
 */
export function initDashboardUI(reloadFn) {
    onDashboardReload = reloadFn;

    // Listener de cambio de hogar
    document.getElementById('householdSelect')?.addEventListener('change', async (e) => {
        const hId = e.target.value;
        AppState.activeHousehold = AppState.userHouseholds.find(h => h.id === hId) || null;
        if (onDashboardReload) await onDashboardReload();
    });

    // Copiar código de invitación
    document.getElementById('copyInviteCodeBtn')?.addEventListener('click', () => {
        const code = document.getElementById('inviteCodeDisplay').textContent;
        navigator.clipboard.writeText(code);
        const btn = document.getElementById('copyInviteCodeBtn');
        if (btn) {
            btn.innerHTML = `<i class="fas fa-check text-emerald-500"></i> ¡Copiado!`;
            setTimeout(() => {
                btn.innerHTML = `<i class="fas fa-copy"></i> Copiar`;
            }, 2000);
        }
    });
}
