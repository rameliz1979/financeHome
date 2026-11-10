/**
 * FinanceHome — UI de Modales (UI Layer)
 * Manejo de apertura, cierre e interacción de modales:
 * - Crear Hogar
 * - Unirse a Hogar
 * - Agregar Movimiento (Ingreso / Gasto)
 * - Registrar Compra a Cuotas
 * - Perfil de Usuario
 */

import { createHousehold, joinHousehold } from '../services/household.service.js';
import {
    addTransaction,
    addInstallment,
    updateTransaction,
    deleteTransaction,
    updateInstallmentRecord,
    deleteInstallment
} from '../services/finance.service.js';
import { updateUserProfile } from '../services/auth.service.js';
import { renderHouseholdSelector } from './dashboard.ui.js';
import { showToast } from '../utils.js';
import AppState from '../state.js';

let onReloadDashboard = null;
let editingTransactionId = null;
let editingInstallmentId = null;

function syncTransactionTypeStyles(type) {
    const lblIncome = document.getElementById('lblTypeIncome');
    const lblExpense = document.getElementById('lblTypeExpense');
    const incomeRadio = document.querySelector('input[name="txType"][value="income"]');
    const expenseRadio = document.querySelector('input[name="txType"][value="expense"]');

    if (incomeRadio) incomeRadio.checked = type === 'income';
    if (expenseRadio) expenseRadio.checked = type === 'expense';

    if (type === 'income') {
        if (lblIncome) lblIncome.className = "flex items-center justify-center py-2.5 border rounded-xl cursor-pointer text-xs font-bold transition-all border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
        if (lblExpense) lblExpense.className = "flex items-center justify-center py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer text-xs font-bold transition-all text-gray-600 dark:text-gray-300";
    } else {
        if (lblExpense) lblExpense.className = "flex items-center justify-center py-2.5 border rounded-xl cursor-pointer text-xs font-bold transition-all border-rose-500 text-rose-600 bg-rose-50 dark:bg-rose-950/40";
        if (lblIncome) lblIncome.className = "flex items-center justify-center py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer text-xs font-bold transition-all text-gray-600 dark:text-gray-300";
    }
}

function setTransactionModalMode(mode) {
    const title = document.getElementById('txModalTitle');
    const submitBtn = document.getElementById('txSubmitBtn');
    if (title) title.innerHTML = `<i class="fas fa-coins text-brand-600"></i> ${mode === 'edit' ? 'Editar Movimiento' : 'Agregar Movimiento'}`;
    if (submitBtn) submitBtn.textContent = mode === 'edit' ? 'Actualizar Movimiento' : 'Guardar Movimiento';
}

function setInstallmentModalMode(mode) {
    const title = document.getElementById('installmentModalTitle');
    const submitBtn = document.getElementById('installmentSubmitBtn');
    if (title) title.innerHTML = `<i class="fas fa-credit-card text-amber-500"></i> ${mode === 'edit' ? 'Editar Cuota o Crédito' : 'Registrar Compra a Cuotas'}`;
    if (submitBtn) submitBtn.textContent = mode === 'edit' ? 'Actualizar Compromiso' : 'Guardar Compromiso';
}

function openTransactionModalForCreate(txModal) {
    editingTransactionId = null;
    document.getElementById('txForm')?.reset();
    syncTransactionTypeStyles('income');
    setTransactionModalMode('create');
    txModal?.classList.remove('hidden');
}

function openTransactionModalForEdit(id, txModal) {
    const tx = AppState.householdTransactions.find(item => item.id === id);
    if (!tx || tx.user_id !== AppState.currentUser?.id) {
        showToast('Solo puedes editar movimientos creados por ti.', 'error');
        return;
    }

    editingTransactionId = id;
    document.getElementById('txConcept').value = tx.concept || '';
    document.getElementById('txAmount').value = tx.amount || '';
    document.getElementById('txCategory').value = tx.category_name || 'Otro';
    syncTransactionTypeStyles(tx.type || 'expense');
    setTransactionModalMode('edit');
    txModal?.classList.remove('hidden');
}

function openInstallmentModalForCreate(instModal) {
    editingInstallmentId = null;
    document.getElementById('installmentForm')?.reset();
    setInstallmentModalMode('create');
    instModal?.classList.remove('hidden');
}

function openInstallmentModalForEdit(id, instModal) {
    const inst = AppState.householdInstallments.find(item => item.id === id);
    if (!inst || inst.user_id !== AppState.currentUser?.id) {
        showToast('Solo puedes editar cuotas creadas por ti.', 'error');
        return;
    }

    editingInstallmentId = id;
    document.getElementById('instConcept').value = inst.concept || '';
    document.getElementById('instAmount').value = inst.amount_per_month || '';
    document.getElementById('instTotal').value = inst.total_cuotas || '';
    document.getElementById('instDueDate').value = inst.next_due_date || '';
    setInstallmentModalMode('edit');
    instModal?.classList.remove('hidden');
}

function openCreateHouseholdModal(createModal) {
    if (AppState.userHouseholds.length > 0) {
        showToast('Ya perteneces a un hogar. No puedes crear otro.', 'error');
        return;
    }

    createModal?.classList.remove('hidden');
}

function openJoinHouseholdModal(joinModal) {
    if (AppState.userHouseholds.length > 0) {
        showToast('Ya perteneces a un hogar. No puedes unirte a otro.', 'error');
        return;
    }

    joinModal?.classList.remove('hidden');
}

/**
 * Cierra todos los modales abiertos en la vista.
 */
export function closeAllModals() {
    const modalIds = [
        'createHouseholdModal',
        'joinHouseholdModal',
        'txModal',
        'installmentModal',
        'userProfileModal',
        'adminCreateUserModal',
        'adminCreateRoleModal'
    ];
    modalIds.forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
    });
}

/**
 * Inicializa la UI de modales y sus formularios.
 * @param {Function} reloadDashboardFn - Función para recargar el dashboard tras mutaciones
 */
export function initModalsUI(reloadDashboardFn) {
    onReloadDashboard = reloadDashboardFn;

    const createModal = document.getElementById('createHouseholdModal');
    const joinModal = document.getElementById('joinHouseholdModal');
    const txModal = document.getElementById('txModal');
    const instModal = document.getElementById('installmentModal');
    const userProfileModal = document.getElementById('userProfileModal');

    // Botones de apertura de modales de hogar
    document.getElementById('btnOpenCreateHousehold')?.addEventListener('click', () => openCreateHouseholdModal(createModal));
    document.getElementById('bannerCreateBtn')?.addEventListener('click', () => openCreateHouseholdModal(createModal));
    document.getElementById('bannerJoinBtn')?.addEventListener('click', () => openJoinHouseholdModal(joinModal));
    document.getElementById('btnOpenInviteModal')?.addEventListener('click', () => openJoinHouseholdModal(joinModal));

    // Botones de apertura de modales de finanzas
    document.getElementById('btnOpenTxModal')?.addEventListener('click', () => openTransactionModalForCreate(txModal));
    document.getElementById('btnOpenInstallmentModal')?.addEventListener('click', () => openInstallmentModalForCreate(instModal));

    // Botón de apertura de modal de perfil
    document.getElementById('btnOpenProfileModal')?.addEventListener('click', () => {
        if (!AppState.currentUser) return;
        document.getElementById('profName').value = AppState.currentUser.full_name || '';
        document.getElementById('profEmail').value = AppState.currentUser.email || '';
        document.getElementById('profPhone').value = AppState.currentUser.phone || '';
        document.getElementById('profPassword').value = '';
        const msgEl = document.getElementById('profStatusMsg');
        if (msgEl) msgEl.classList.add('hidden');
        userProfileModal?.classList.remove('hidden');
    });

    // Botones de cierre global en todos los modales
    document.querySelectorAll('.closeModalBtn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Selector de tipo de movimiento (Ingreso / Gasto)
    document.querySelectorAll('input[name="txType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            syncTransactionTypeStyles(e.target.value);
        });
    });

    document.addEventListener('financehome:edit-transaction', (e) => {
        openTransactionModalForEdit(e.detail?.id, txModal);
    });

    document.addEventListener('financehome:delete-transaction', async (e) => {
        const id = e.detail?.id;
        const tx = AppState.householdTransactions.find(item => item.id === id);
        if (!tx || tx.user_id !== AppState.currentUser?.id) {
            showToast('Solo puedes eliminar movimientos creados por ti.', 'error');
            return;
        }

        if (!window.confirm(`¿Eliminar el movimiento "${tx.concept}"?`)) return;

        const result = await deleteTransaction(id);
        if (result.success && onReloadDashboard) await onReloadDashboard();
        showToast(result.message, result.success ? 'success' : 'error');
    });

    document.addEventListener('financehome:edit-installment', (e) => {
        openInstallmentModalForEdit(e.detail?.id, instModal);
    });

    document.addEventListener('financehome:delete-installment', async (e) => {
        const id = e.detail?.id;
        const inst = AppState.householdInstallments.find(item => item.id === id);
        if (!inst || inst.user_id !== AppState.currentUser?.id) {
            showToast('Solo puedes eliminar cuotas creadas por ti.', 'error');
            return;
        }

        if (!window.confirm(`¿Eliminar la cuota "${inst.concept}"?`)) return;

        const result = await deleteInstallment(id);
        if (result.success && onReloadDashboard) await onReloadDashboard();
        showToast(result.message, result.success ? 'success' : 'error');
    });

    // Formulario: Crear Hogar
    document.getElementById('createHouseholdForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hName = document.getElementById('newHouseholdName').value.trim();
        if (!hName) return;

        const result = await createHousehold(hName);
        if (result.success) {
            createModal?.classList.add('hidden');
            document.getElementById('createHouseholdForm').reset();
            renderHouseholdSelector();
            if (onReloadDashboard) await onReloadDashboard();
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    });

    // Formulario: Unirse a Hogar
    document.getElementById('joinHouseholdForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('joinInviteCode').value.trim().toUpperCase();
        if (!code) return;

        const result = await joinHousehold(code);
        if (result.success) {
            joinModal?.classList.add('hidden');
            document.getElementById('joinHouseholdForm').reset();
            renderHouseholdSelector();
            if (onReloadDashboard) await onReloadDashboard();
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    });

    // Formulario: Guardar Movimiento
    document.getElementById('txForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const concept = document.getElementById('txConcept').value.trim();
        const amount = parseFloat(document.getElementById('txAmount').value);
        const category = document.getElementById('txCategory').value;
        const type = document.querySelector('input[name="txType"]:checked')?.value || 'expense';

        if (!concept || isNaN(amount) || amount <= 0) {
            showToast('Por favor ingresa un concepto y monto válido.', 'error');
            return;
        }

        const result = editingTransactionId
            ? await updateTransaction({ id: editingTransactionId, concept, amount, type, category })
            : await addTransaction({ concept, amount, type, category });

        if (result.success) {
            txModal?.classList.add('hidden');
            document.getElementById('txForm').reset();
            editingTransactionId = null;
            if (onReloadDashboard) await onReloadDashboard();
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    });

    // Formulario: Guardar Cuota
    document.getElementById('installmentForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const concept = document.getElementById('instConcept').value.trim();
        const amount = parseFloat(document.getElementById('instAmount').value);
        const totalCuotas = parseInt(document.getElementById('instTotal').value, 10);
        const dueDate = document.getElementById('instDueDate').value;

        if (!concept || isNaN(amount) || amount <= 0 || isNaN(totalCuotas) || totalCuotas < 1 || !dueDate) {
            showToast('Por favor completa los datos del compromiso a cuotas.', 'error');
            return;
        }

        const result = editingInstallmentId
            ? await updateInstallmentRecord({ id: editingInstallmentId, concept, amount, totalCuotas, dueDate })
            : await addInstallment({ concept, amount, totalCuotas, dueDate });

        if (result.success) {
            instModal?.classList.add('hidden');
            document.getElementById('installmentForm').reset();
            editingInstallmentId = null;
            if (onReloadDashboard) await onReloadDashboard();
            showToast(result.message, 'success');
        } else {
            showToast(result.message, 'error');
        }
    });

    // Formulario: Actualizar Perfil de Usuario
    document.getElementById('userProfileForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('profName').value.trim();
        const newPhone = document.getElementById('profPhone').value.trim();
        const newPassword = document.getElementById('profPassword').value;
        const msgEl = document.getElementById('profStatusMsg');

        if (msgEl) {
            msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-blue-50 text-blue-600';
            msgEl.textContent = 'Actualizando datos de perfil...';
            msgEl.classList.remove('hidden');
        }

        const result = await updateUserProfile(newName, newPhone, newPassword);

        if (result.success) {
            document.getElementById('userWelcomeText').textContent = `Hola, ${newName}`;
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-emerald-50 text-emerald-600';
                msgEl.textContent = result.message;
            }
            setTimeout(() => {
                userProfileModal?.classList.add('hidden');
            }, 1200);
        } else {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = result.message;
            }
        }
    });
}
