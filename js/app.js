/**
 * FinanceHome — Orquestador Principal (Application Layer)
 * Punto de entrada de la aplicación modular.
 * Conecta las capas de datos, negocio y presentación.
 */

import { initAuthUI } from './ui/auth.ui.js';
import { initDashboardUI, renderHouseholdSelector, renderAllDashboard } from './ui/dashboard.ui.js';
import { initModalsUI } from './ui/modals.ui.js';
import { initAdminUI, checkSuperAdminRole } from './ui/admin.ui.js';
import { initNotificationsUI, syncNotificationsForActiveHousehold } from './ui/notifications.ui.js';

import { getExistingSession, syncAndLoadUser } from './services/auth.service.js';
import { loadUserHouseholds, selectHousehold } from './services/household.service.js';
import { loadTransactions, loadInstallments } from './services/finance.service.js';

import AppState from './state.js';

/**
 * Inicializa el soporte para modo oscuro con persistencia.
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    document.querySelectorAll('.themeToggleBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    });
}

/**
 * Recarga y re-renderiza los datos financieros del hogar activo.
 */
async function refreshDashboard() {
    await Promise.all([
        loadTransactions(),
        loadInstallments()
    ]);
    renderAllDashboard();
    await syncNotificationsForActiveHousehold();
}

/**
 * Inicia o reinicia el flujo completo del Dashboard.
 */
async function launchDashboard() {
    await loadUserHouseholds();
    selectHousehold();
    renderHouseholdSelector();
    await refreshDashboard();
}

/**
 * Inicialización general de la aplicación.
 */
async function initApp() {
    initTheme();

    // Inicializar capas de UI
    initAuthUI(async () => {
        checkSuperAdminRole();
        await launchDashboard();
    });

    initDashboardUI(async () => {
        await refreshDashboard();
    });

    initNotificationsUI();

    initModalsUI(async () => {
        await refreshDashboard();
    });

    initAdminUI();

    // Comprobar si existe una sesión previa en Supabase
    try {
        const session = await getExistingSession();
        if (session && session.user) {
            await syncAndLoadUser(session.user);

            // Transición a vista principal
            document.getElementById('authContainer')?.classList.add('hidden');
            document.getElementById('superAdminView')?.classList.add('hidden');
            document.getElementById('standardUserView')?.classList.remove('hidden');
            document.getElementById('dashboardContainer')?.classList.remove('hidden');

            const welcomeEl = document.getElementById('userWelcomeText');
            if (welcomeEl && AppState.currentUser) {
                welcomeEl.textContent = `Hola, ${AppState.currentUser.full_name}`;
            }

            checkSuperAdminRole();
            await launchDashboard();
        }
    } catch (e) {
        console.warn('Sin sesión previa activa:', e);
    }
}

// Arrancar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
