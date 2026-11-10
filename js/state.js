/**
 * FinanceHome — Estado Centralizado
 * Almacén reactivo del estado global de la aplicación.
 */

import { DEFAULT_SYSTEM_ROLES } from './config.js';

const AppState = {
    currentUser: null,
    userHouseholds: [],
    activeHousehold: null,
    householdTransactions: [],
    householdInstallments: [],
    pendingRegistrationData: null,
    chartInstance: null,
    isSuperAdmin: false,
    systemRoles: [...DEFAULT_SYSTEM_ROLES],

    /** Resetea el estado del dashboard */
    resetDashboardState() {
        this.householdTransactions = [];
        this.householdInstallments = [];
    },

    /** Resetea todo el estado de la aplicación (logout) */
    resetAll() {
        this.currentUser = null;
        this.userHouseholds = [];
        this.activeHousehold = null;
        this.pendingRegistrationData = null;
        this.isSuperAdmin = false;
        this.resetDashboardState();
    }
};

export default AppState;
