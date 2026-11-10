/**
 * FinanceHome — Servicio de Finanzas (Service Layer)
 * Reglas de negocio para transacciones, cuotas y métricas financieras.
 */

import { getTransactionsByHousehold, insertTransaction, updateTransactionById, deleteTransactionById } from '../data/transaction.repository.js';
import { getInstallmentsByHousehold, insertInstallment, updateInstallment, deleteInstallmentById } from '../data/installment.repository.js';
import { todayISO } from '../utils.js';
import AppState from '../state.js';

function isCurrentUserRecord(record) {
    return Boolean(record && AppState.currentUser && record.user_id === AppState.currentUser.id);
}

/**
 * Carga las transacciones del hogar activo.
 */
export async function loadTransactions() {
    if (!AppState.activeHousehold) {
        AppState.householdTransactions = [];
        return;
    }

    try {
        AppState.householdTransactions = await getTransactionsByHousehold(AppState.activeHousehold.id);
    } catch (e) {
        console.error('Error cargando movimientos:', e);
        AppState.householdTransactions = [];
    }
}

/**
 * Carga las cuotas del hogar activo.
 */
export async function loadInstallments() {
    if (!AppState.activeHousehold) {
        AppState.householdInstallments = [];
        return;
    }

    try {
        AppState.householdInstallments = await getInstallmentsByHousehold(AppState.activeHousehold.id);
    } catch (e) {
        console.error('Error cargando cuotas:', e);
        AppState.householdInstallments = [];
    }
}

/**
 * Calcula las métricas financieras (Ingresos, Gastos, Cuotas, Balance).
 * @returns {{income: number, expense: number, installments: number, balance: number}}
 */
export function calculateMetrics() {
    let income = 0;
    let expense = 0;
    let installments = 0;

    AppState.householdTransactions.forEach(t => {
        if (t.type === 'income') income += Number(t.amount || 0);
        if (t.type === 'expense') expense += Number(t.amount || 0);
    });

    AppState.householdInstallments.forEach(i => {
        installments += Number(i.amount_per_month || 0);
    });

    const balance = income - expense - installments;

    return { income, expense, installments, balance };
}

/**
 * Registra un nuevo movimiento (Ingreso o Gasto).
 * @param {object} params - { concept, amount, type, category }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addTransaction({ concept, amount, type, category }) {
    if (!AppState.activeHousehold || !AppState.currentUser) {
        return { success: false, message: 'Sin hogar o usuario activo' };
    }

    const newTx = {
        id: crypto.randomUUID(),
        household_id: AppState.activeHousehold.id,
        user_id: AppState.currentUser.id,
        concept,
        amount,
        type,
        category_name: category,
        responsable_name: AppState.currentUser.full_name,
        transaction_date: todayISO()
    };

    try {
        const { error } = await insertTransaction(newTx);
        if (error) {
            return { success: false, message: 'Error guardando movimiento: ' + error.message };
        }
        return { success: true, message: 'Movimiento guardado exitosamente' };
    } catch (err) {
        console.error('Error insertando movimiento:', err);
        return { success: false, message: 'Error inesperado' };
    }
}

/**
 * Actualiza un movimiento creado por el usuario actual.
 * @param {object} params - { id, concept, amount, type, category }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateTransaction({ id, concept, amount, type, category }) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
    }

    const tx = AppState.householdTransactions.find(item => item.id === id);
    if (!isCurrentUserRecord(tx)) {
        return { success: false, message: 'Solo puedes administrar movimientos creados por ti.' };
    }

    try {
        const { error } = await updateTransactionById(id, {
            concept,
            amount,
            type,
            category_name: category
        }, AppState.currentUser.id);

        if (error) {
            return { success: false, message: 'Error actualizando movimiento: ' + error.message };
        }

        return { success: true, message: 'Movimiento actualizado exitosamente' };
    } catch (err) {
        console.error('Error actualizando movimiento:', err);
        return { success: false, message: 'Error inesperado' };
    }
}

/**
 * Elimina un movimiento creado por el usuario actual.
 * @param {string} id
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteTransaction(id) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
    }

    const tx = AppState.householdTransactions.find(item => item.id === id);
    if (!isCurrentUserRecord(tx)) {
        return { success: false, message: 'Solo puedes eliminar movimientos creados por ti.' };
    }

    try {
        const { error } = await deleteTransactionById(id, AppState.currentUser.id);

        if (error) {
            return { success: false, message: 'Error eliminando movimiento: ' + error.message };
        }

        return { success: true, message: 'Movimiento eliminado exitosamente' };
    } catch (err) {
        console.error('Error eliminando movimiento:', err);
        return { success: false, message: 'Error inesperado' };
    }
}

/**
 * Registra un nuevo compromiso de compra a cuotas.
 * @param {object} params - { concept, amount, totalCuotas, dueDate }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function addInstallment({ concept, amount, totalCuotas, dueDate }) {
    if (!AppState.activeHousehold || !AppState.currentUser) {
        return { success: false, message: 'Sin hogar o usuario activo' };
    }

    const newInst = {
        id: crypto.randomUUID(),
        household_id: AppState.activeHousehold.id,
        user_id: AppState.currentUser.id,
        concept,
        amount_per_month: amount,
        total_cuotas: totalCuotas,
        paid_cuotas: 1,
        category_name: 'Hogar y Servicios',
        responsable_name: AppState.currentUser.full_name,
        next_due_date: dueDate,
        status: 'active'
    };

    try {
        const { error } = await insertInstallment(newInst);
        if (error) {
            return { success: false, message: 'Error guardando compromiso: ' + error.message };
        }
        return { success: true, message: 'Compromiso a cuotas registrado' };
    } catch (err) {
        console.error('Error insertando cuota:', err);
        return { success: false, message: 'Error inesperado' };
    }
}

/**
 * Actualiza una cuota creada por el usuario actual.
 * @param {object} params - { id, concept, amount, totalCuotas, dueDate }
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateInstallmentRecord({ id, concept, amount, totalCuotas, dueDate }) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
    }

    const inst = AppState.householdInstallments.find(item => item.id === id);
    if (!isCurrentUserRecord(inst)) {
        return { success: false, message: 'Solo puedes administrar cuotas creadas por ti.' };
    }

    try {
        const { error } = await updateInstallment(id, {
            concept,
            amount_per_month: amount,
            total_cuotas: totalCuotas,
            next_due_date: dueDate
        }, AppState.currentUser.id);

        if (error) {
            return { success: false, message: 'Error actualizando cuota: ' + error.message };
        }

        return { success: true, message: 'Cuota actualizada exitosamente' };
    } catch (err) {
        console.error('Error actualizando cuota:', err);
        return { success: false, message: 'Error inesperado' };
    }
}

/**
 * Elimina una cuota creada por el usuario actual.
 * @param {string} id
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function deleteInstallment(id) {
    if (!AppState.currentUser) {
        return { success: false, message: 'Usuario no autenticado' };
    }

    const inst = AppState.householdInstallments.find(item => item.id === id);
    if (!isCurrentUserRecord(inst)) {
        return { success: false, message: 'Solo puedes eliminar cuotas creadas por ti.' };
    }

    try {
        const { error } = await deleteInstallmentById(id, AppState.currentUser.id);

        if (error) {
            return { success: false, message: 'Error eliminando cuota: ' + error.message };
        }

        return { success: true, message: 'Cuota eliminada exitosamente' };
    } catch (err) {
        console.error('Error eliminando cuota:', err);
        return { success: false, message: 'Error inesperado' };
    }
}
