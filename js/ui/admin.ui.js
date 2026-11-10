/**
 * FinanceHome — UI de SuperAdministrador (UI Layer)
 * Manejo de vista global, métricas del sistema, gestión de usuarios,
 * suspensión/activación y configuración dinámica de roles.
 */

import {
    loadSuperAdminMetrics,
    toggleUserStatus,
    createAdminUser,
    createCustomRole
} from '../services/admin.service.js';
import { SUPER_ADMIN_EMAIL, SUPER_ADMIN_ROLE } from '../config.js';
import { formatCurrency } from '../utils.js';
import AppState from '../state.js';

/**
 * Verifica si el usuario actual tiene permisos de SuperAdministrador
 * y muestra/oculta el botón correspondiente en la cabecera.
 */
export function checkSuperAdminRole() {
    const superAdminBtn = document.getElementById('superAdminTabBtn');
    if (!superAdminBtn) return;

    if (AppState.currentUser && (AppState.currentUser.is_superadmin || AppState.currentUser.email === SUPER_ADMIN_EMAIL)) {
        AppState.isSuperAdmin = true;
        superAdminBtn.classList.remove('hidden');
    } else {
        AppState.isSuperAdmin = false;
        superAdminBtn.classList.add('hidden');
    }
}

/**
 * Actualiza dinámicamente el selector desplegable de perfiles de rol.
 */
export function updateRoleSelectOptions() {
    const select = document.getElementById('adminNewRole');
    if (!select) return;
    select.innerHTML = '';

    AppState.systemRoles.forEach(r => {
        if (r.name === SUPER_ADMIN_ROLE) return;
        const opt = document.createElement('option');
        opt.value = r.name;
        opt.textContent = r.name;
        select.appendChild(opt);
    });

    if (AppState.isSuperAdmin) {
        const superOpt = document.createElement('option');
        superOpt.value = SUPER_ADMIN_ROLE;
        superOpt.textContent = SUPER_ADMIN_ROLE;
        select.appendChild(superOpt);
    }
}

/**
 * Renderiza las tarjetas de roles y permisos configurados.
 */
export function renderRolesCards() {
    const container = document.getElementById('rolesListContainer');
    if (!container) return;
    container.innerHTML = '';

    AppState.systemRoles.forEach(r => {
        const card = document.createElement('div');
        card.className = 'p-3.5 sm:p-4 rounded-2xl bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2';
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-purple-700 dark:text-purple-400">${r.name}</span>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600">${r.perms.length} Permisos</span>
            </div>
            <p class="text-[11px] text-gray-500 dark:text-gray-400">${r.desc}</p>
            <div class="flex flex-wrap gap-1 pt-1">
                ${r.perms.map(p => `<span class="px-1.5 py-0.5 text-[9px] font-bold bg-gray-200 dark:bg-gray-700 rounded">${p}</span>`).join('')}
            </div>
        `;
        container.appendChild(card);
    });

    updateRoleSelectOptions();
}

/**
 * Renderiza la tabla de usuarios en el panel de SuperAdmin.
 * @param {object[]} users
 */
export function renderAdminUsersTable(users) {
    const tbody = document.getElementById('adminUsersTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!users || users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-gray-400">No hay usuarios registrados.</td></tr>`;
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors';
        const isSuper = u.email === SUPER_ADMIN_EMAIL || u.is_superadmin;
        const active = u.is_active !== false;
        const displayRole = isSuper ? 'SuperAdministrador' : (u.role_profile || 'Administrador de Hogar');

        tr.innerHTML = `
            <td class="py-3 px-3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div class="w-6 h-6 rounded-full bg-purple-500/20 text-purple-600 text-xs flex items-center justify-center font-bold shrink-0">
                    ${u.full_name?.charAt(0) || 'U'}
                </div>
                <span class="truncate max-w-[120px] xs:max-w-none">${u.full_name || 'Sin Nombre'}</span>
                ${isSuper ? '<span class="px-1.5 py-0.5 text-[9px] font-extrabold bg-purple-500 text-white rounded shrink-0">SUPER</span>' : ''}
            </td>
            <td class="py-3 px-3 text-gray-500 truncate max-w-[140px]">${u.email}</td>
            <td class="py-3 px-3 font-bold text-purple-600 text-[11px]">${displayRole}</td>
            <td class="py-3 px-3 text-right">
                ${!isSuper ? `
                    <button data-user-id="${u.id}" data-active="${active}" class="btnToggleStatus px-2 py-1 text-[10px] font-bold rounded-lg border ${active ? 'border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30' : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'}">
                        ${active ? 'Suspender' : 'Activar'}
                    </button>
                ` : '<span class="text-[10px] text-gray-400">Protegido</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Delegación de eventos para suspender / activar
    tbody.querySelectorAll('.btnToggleStatus').forEach(btn => {
        btn.addEventListener('click', async () => {
            const uId = btn.getAttribute('data-user-id');
            const isActive = btn.getAttribute('data-active') === 'true';
            btn.disabled = true;
            await toggleUserStatus(uId, isActive);
            await loadAndRenderSuperAdmin();
        });
    });
}

/**
 * Renderiza la tabla de hogares en el panel de SuperAdmin.
 * @param {object[]} households
 */
export function renderAdminHouseholdsTable(households) {
    const tbody = document.getElementById('adminHouseholdsTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!households || households.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-400">No hay hogares creados.</td></tr>`;
        return;
    }

    households.forEach(h => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors';
        const dateStr = h.created_at ? new Date(h.created_at).toLocaleDateString('es-CO') : '---';

        tr.innerHTML = `
            <td class="py-3 px-3 font-semibold text-gray-900 dark:text-white">${h.name}</td>
            <td class="py-3 px-3 font-mono font-bold text-brand-600 dark:text-brand-400">${h.invite_code}</td>
            <td class="py-3 px-3 text-gray-400 text-[11px]">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Carga las métricas y llena las tablas del panel de SuperAdmin.
 */
export async function loadAndRenderSuperAdmin() {
    const { users, households, transactions, totalVolume } = await loadSuperAdminMetrics();

    const elUsers = document.getElementById('adminTotalUsers');
    const elHouseholds = document.getElementById('adminTotalHouseholds');
    const elTx = document.getElementById('adminTotalTxCount');
    const elVol = document.getElementById('adminTotalVolume');

    if (elUsers) elUsers.textContent = users.length;
    if (elHouseholds) elHouseholds.textContent = households.length;
    if (elTx) elTx.textContent = transactions.length;
    if (elVol) elVol.textContent = formatCurrency(totalVolume);

    renderAdminUsersTable(users);
    renderAdminHouseholdsTable(households);
}

/**
 * Inicializa los eventos del panel de SuperAdministrador.
 */
export function initAdminUI() {
    // Cambio a vista de SuperAdmin
    document.getElementById('superAdminTabBtn')?.addEventListener('click', async () => {
        if (!AppState.isSuperAdmin) return;
        document.getElementById('standardUserView')?.classList.add('hidden');
        document.getElementById('superAdminView')?.classList.remove('hidden');
        await loadAndRenderSuperAdmin();
        renderRolesCards();
    });

    // Regresar a la vista de usuario estándar
    document.getElementById('toggleBackToUserView')?.addEventListener('click', () => {
        document.getElementById('superAdminView')?.classList.add('hidden');
        document.getElementById('standardUserView')?.classList.remove('hidden');
    });

    // Abrir modal de creación de usuario
    document.getElementById('btnOpenAdminCreateUser')?.addEventListener('click', () => {
        updateRoleSelectOptions();
        const msgEl = document.getElementById('adminCreateUserMsg');
        if (msgEl) msgEl.classList.add('hidden');
        document.getElementById('adminCreateUserForm')?.reset();
        document.getElementById('adminCreateUserModal')?.classList.remove('hidden');
    });

    // Formulario de creación de usuario por Admin
    document.getElementById('adminCreateUserForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('adminNewName').value.trim();
        const email = document.getElementById('adminNewEmail').value.trim().toLowerCase();
        const password = document.getElementById('adminNewPassword').value;
        const role = document.getElementById('adminNewRole').value;
        const msgEl = document.getElementById('adminCreateUserMsg');

        if (msgEl) {
            msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-purple-50 text-purple-600';
            msgEl.textContent = 'Creando usuario en Supabase...';
            msgEl.classList.remove('hidden');
        }

        const result = await createAdminUser({ name, email, password, role });

        if (result.success) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-emerald-50 text-emerald-600';
                msgEl.textContent = result.message;
            }
            setTimeout(async () => {
                document.getElementById('adminCreateUserModal')?.classList.add('hidden');
                await loadAndRenderSuperAdmin();
            }, 1200);
        } else {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = result.message;
            }
        }
    });

    // Abrir modal de creación de rol
    document.getElementById('btnOpenCreateRoleModal')?.addEventListener('click', () => {
        document.getElementById('adminCreateRoleForm')?.reset();
        document.getElementById('adminCreateRoleModal')?.classList.remove('hidden');
    });

    // Formulario de creación de rol
    document.getElementById('adminCreateRoleForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('roleName').value.trim();
        const desc = document.getElementById('roleDesc').value.trim();

        const perms = [];
        if (document.getElementById('perm_create_household')?.checked) perms.push('Crear Hogar');
        if (document.getElementById('perm_add_tx')?.checked) perms.push('Movimientos');
        if (document.getElementById('perm_add_installment')?.checked) perms.push('Cuotas');
        if (document.getElementById('perm_invite')?.checked) perms.push('Invitar');

        createCustomRole(name, desc, perms);
        document.getElementById('adminCreateRoleModal')?.classList.add('hidden');

        renderRolesCards();
        updateRoleSelectOptions();
    });

    // Inicializar select de roles por defecto
    updateRoleSelectOptions();
}
