/**
 * FinanceHome — UI de Autenticación (UI Layer)
 * Manejo de eventos e interactividad para Login, Registro y Verificación OTP.
 */

import {
    signUp,
    resendOtp,
    verifyOtp,
    signIn,
    signOut,
    sendPasswordRecoveryOtp,
    verifyPasswordRecoveryOtp,
    updatePasswordFromRecovery,
    onPasswordRecovery
} from '../services/auth.service.js';
import { OTP_LENGTH } from '../config.js';
import { showToast } from '../utils.js';
import AppState from '../state.js';

let onAuthSuccessCallback = null;
let pendingRecoveryEmail = null;

/**
 * Inicializa los eventos de la interfaz de autenticación.
 * @param {Function} onAuthSuccess - Función a ejecutar tras autenticación exitosa
 */
export function initAuthUI(onAuthSuccess) {
    onAuthSuccessCallback = onAuthSuccess;

    const authContainer = document.getElementById('authContainer');
    const registerCard = document.getElementById('registerCard');
    const verifyCard = document.getElementById('verifyCard');
    const loginCard = document.getElementById('loginCard');

    const registerForm = document.getElementById('registerForm');
    const loginForm = document.getElementById('loginForm');
    const verifyForm = document.getElementById('verifyForm');
    const recoverPasswordModal = document.getElementById('recoverPasswordModal');
    const recoverPasswordForm = document.getElementById('recoverPasswordForm');
    const verifyRecoveryOtpForm = document.getElementById('verifyRecoveryOtpForm');
    const setNewPasswordModal = document.getElementById('setNewPasswordModal');
    const setNewPasswordForm = document.getElementById('setNewPasswordForm');
    const regPasswordInput = document.getElementById('regPassword');
    const regSubmitBtn = document.getElementById('regSubmitBtn');

    const reqs = {
        length: document.getElementById('req-length'),
        upper: document.getElementById('req-upper'),
        lower: document.getElementById('req-lower'),
        number: document.getElementById('req-number'),
        special: document.getElementById('req-special')
    };

    // Validación de contraseña en tiempo real
    regPasswordInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        const checks = {
            length: val.length >= 8,
            upper: /[A-Z]/.test(val),
            lower: /[a-z]/.test(val),
            number: /[0-9]/.test(val),
            special: /[^A-Za-z0-9]/.test(val)
        };

        let isValid = true;
        for (const key in checks) {
            const el = reqs[key];
            if (el) {
                if (checks[key]) {
                    el.className = 'flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold';
                    el.querySelector('i').className = 'fas fa-check-circle text-xs';
                } else {
                    el.className = 'flex items-center gap-1.5 text-gray-500 dark:text-gray-400';
                    el.querySelector('i').className = 'fas fa-circle text-[8px]';
                    isValid = false;
                }
            }
        }

        regSubmitBtn.disabled = !isValid;
        if (isValid) {
            regSubmitBtn.className = 'w-full py-3 sm:py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg cursor-pointer transition-all flex items-center justify-center gap-2';
        } else {
            regSubmitBtn.className = 'w-full py-3 sm:py-3.5 bg-gray-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg cursor-not-allowed transition-all flex items-center justify-center gap-2';
        }
    });

    // Toggle de visualización de contraseñas
    document.getElementById('toggleRegPassword')?.addEventListener('click', function () {
        const type = regPasswordInput.type === 'password' ? 'text' : 'password';
        regPasswordInput.type = type;
        this.querySelector('i').className = type === 'password' ? 'fas fa-eye text-xs sm:text-sm' : 'fas fa-eye-slash text-xs sm:text-sm';
    });

    document.getElementById('toggleLoginPassword')?.addEventListener('click', function () {
        const pwdInput = document.getElementById('loginPassword');
        const type = pwdInput.type === 'password' ? 'text' : 'password';
        pwdInput.type = type;
        this.querySelector('i').className = type === 'password' ? 'fas fa-eye text-xs sm:text-sm' : 'fas fa-eye-slash text-xs sm:text-sm';
    });

    // Recuperación de contraseña
    document.getElementById('openRecoverPasswordBtn')?.addEventListener('click', () => {
        const email = document.getElementById('loginEmail')?.value.trim().toLowerCase() || '';
        const recoverEmail = document.getElementById('recoverEmail');
        const msgEl = document.getElementById('recoverPasswordMsg');
        const otpMsgEl = document.getElementById('verifyRecoveryOtpMsg');

        pendingRecoveryEmail = null;
        recoverPasswordForm?.reset();
        verifyRecoveryOtpForm?.reset();
        if (recoverEmail) recoverEmail.value = email;
        if (msgEl) msgEl.classList.add('hidden');
        if (otpMsgEl) otpMsgEl.classList.add('hidden');
        verifyRecoveryOtpForm?.classList.add('hidden');
        recoverPasswordModal?.classList.remove('hidden');
    });

    document.querySelectorAll('.closeAuthModalBtn').forEach(btn => {
        btn.addEventListener('click', () => {
            recoverPasswordModal?.classList.add('hidden');
            pendingRecoveryEmail = null;
        });
    });

    recoverPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('recoverEmail').value.trim().toLowerCase();
        const msgEl = document.getElementById('recoverPasswordMsg');
        const submitBtn = document.getElementById('recoverPasswordSubmitBtn');

        if (!email) return;

        if (msgEl) {
            msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-blue-50 text-blue-600';
            msgEl.textContent = 'Enviando código de recuperación...';
            msgEl.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = true;

        const result = await sendPasswordRecoveryOtp(email);

        if (msgEl) {
            msgEl.className = result.success
                ? 'text-xs text-center font-bold p-2.5 rounded-xl bg-emerald-50 text-emerald-600'
                : 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
            msgEl.textContent = result.message;
        }
        if (result.success) {
            pendingRecoveryEmail = email;
            verifyRecoveryOtpForm?.classList.remove('hidden');
            document.getElementById('recoverOtpInput')?.focus();
            if (submitBtn) submitBtn.textContent = 'Reenviar Código de Recuperación';
        }
        if (submitBtn) submitBtn.disabled = false;
    });

    verifyRecoveryOtpForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = pendingRecoveryEmail || document.getElementById('recoverEmail').value.trim().toLowerCase();
        const otp = document.getElementById('recoverOtpInput').value.trim();
        const msgEl = document.getElementById('verifyRecoveryOtpMsg');
        const submitBtn = document.getElementById('verifyRecoveryOtpSubmitBtn');
        const otpRegex = new RegExp(`^\\d{${OTP_LENGTH}}$`);

        if (!email) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = 'Primero solicita el código de recuperación.';
                msgEl.classList.remove('hidden');
            }
            return;
        }

        if (!otpRegex.test(otp)) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = `Ingresa el código OTP de ${OTP_LENGTH} dígitos.`;
                msgEl.classList.remove('hidden');
            }
            return;
        }

        if (msgEl) {
            msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-blue-50 text-blue-600';
            msgEl.textContent = 'Verificando código de recuperación...';
            msgEl.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = true;

        const result = await verifyPasswordRecoveryOtp(email, otp);

        if (submitBtn) submitBtn.disabled = false;

        if (!result.success) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = result.message;
            }
            return;
        }

        recoverPasswordModal?.classList.add('hidden');
        setNewPasswordForm?.reset();
        document.getElementById('setNewPasswordMsg')?.classList.add('hidden');
        setNewPasswordModal?.classList.remove('hidden');
        document.getElementById('resetNewPassword')?.focus();
    });

    onPasswordRecovery(() => {
        document.getElementById('dashboardContainer')?.classList.add('hidden');
        authContainer?.classList.remove('hidden');
        registerCard?.classList.add('hidden');
        verifyCard?.classList.add('hidden');
        loginCard?.classList.remove('hidden');
        recoverPasswordModal?.classList.add('hidden');
        setNewPasswordForm?.reset();
        document.getElementById('setNewPasswordMsg')?.classList.add('hidden');
        setNewPasswordModal?.classList.remove('hidden');
    });

    setNewPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('resetNewPassword').value;
        const confirmPassword = document.getElementById('resetConfirmPassword').value;
        const msgEl = document.getElementById('setNewPasswordMsg');
        const submitBtn = document.getElementById('setNewPasswordSubmitBtn');

        if (password.length < 8) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = 'La contraseña debe tener mínimo 8 caracteres.';
                msgEl.classList.remove('hidden');
            }
            return;
        }

        if (password !== confirmPassword) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = 'Las contraseñas no coinciden.';
                msgEl.classList.remove('hidden');
            }
            return;
        }

        if (msgEl) {
            msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-blue-50 text-blue-600';
            msgEl.textContent = 'Actualizando contraseña...';
            msgEl.classList.remove('hidden');
        }
        if (submitBtn) submitBtn.disabled = true;

        const result = await updatePasswordFromRecovery(password);

        if (submitBtn) submitBtn.disabled = false;

        if (!result.success) {
            if (msgEl) {
                msgEl.className = 'text-xs text-center font-bold p-2.5 rounded-xl bg-rose-50 text-rose-600';
                msgEl.textContent = result.message;
            }
            return;
        }

        setNewPasswordModal?.classList.add('hidden');
        document.getElementById('dashboardContainer')?.classList.add('hidden');
        authContainer?.classList.remove('hidden');
        registerCard?.classList.add('hidden');
        verifyCard?.classList.add('hidden');
        loginCard?.classList.remove('hidden');
        loginForm?.reset();
        setNewPasswordForm?.reset();
        showToast(result.message, 'success');
    });

    // Navegación entre tarjetas de Auth
    document.getElementById('goToLoginBtn')?.addEventListener('click', () => {
        registerCard.classList.add('hidden');
        verifyCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    document.getElementById('goToRegisterBtn')?.addEventListener('click', () => {
        loginCard.classList.add('hidden');
        verifyCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    document.getElementById('backToRegisterBtn')?.addEventListener('click', () => {
        verifyCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    // Formulario de Registro
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim().toLowerCase();
        const password = document.getElementById('regPassword').value;
        const errEl = document.getElementById('regErrorMsg');
        errEl.classList.add('hidden');

        if (!name || !email || !password) {
            errEl.textContent = 'Por favor completa todos los campos requeridos.';
            errEl.classList.remove('hidden');
            return;
        }

        AppState.pendingRegistrationData = { name, email, password };
        registerCard.classList.add('hidden');
        document.getElementById('verifyTargetEmail').textContent = email;
        verifyCard.classList.remove('hidden');

        const statusEl = document.getElementById('emailSendingStatus');
        if (statusEl) {
            statusEl.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Solicitando código OTP a Supabase Auth...`;
        }

        const result = await signUp(email, password, name);
        if (statusEl) {
            if (result.success) {
                statusEl.innerHTML = `<i class="fas fa-circle-check text-emerald-500"></i> ${result.message}`;
            } else {
                statusEl.innerHTML = `<span class="text-rose-500 font-bold"><i class="fas fa-circle-xmark"></i> ${result.message}</span>`;
            }
        }
    });

    // Reenviar Código OTP
    document.getElementById('resendCodeBtn')?.addEventListener('click', async () => {
        if (!AppState.pendingRegistrationData) return;
        const statusEl = document.getElementById('emailSendingStatus');
        if (statusEl) statusEl.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Reenviando código OTP...`;

        const result = await resendOtp(AppState.pendingRegistrationData.email);
        if (statusEl) {
            if (result.success) {
                statusEl.innerHTML = `<i class="fas fa-circle-check text-emerald-500"></i> ${result.message}`;
            } else {
                statusEl.innerHTML = `<span class="text-rose-500 font-bold"><i class="fas fa-circle-xmark"></i> ${result.message}</span>`;
            }
        }
    });

    // Formulario de Verificación OTP
    verifyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputCode = document.getElementById('otpInput').value.trim();
        const errEl = document.getElementById('verifyErrorMsg');
        errEl.classList.add('hidden');

        const otpRegex = new RegExp(`^\\d{${OTP_LENGTH}}$`);
        if (!otpRegex.test(inputCode)) {
            errEl.textContent = `Ingresa el código OTP de ${OTP_LENGTH} dígitos que recibiste.`;
            errEl.classList.remove('hidden');
            return;
        }

        const result = await verifyOtp(
            AppState.pendingRegistrationData.email,
            inputCode,
            AppState.pendingRegistrationData
        );

        if (!result.success) {
            errEl.textContent = result.message;
            errEl.classList.remove('hidden');
            return;
        }

        authContainer.classList.add('hidden');
        document.getElementById('superAdminView').classList.add('hidden');
        document.getElementById('standardUserView').classList.remove('hidden');
        document.getElementById('dashboardContainer').classList.remove('hidden');
        document.getElementById('userWelcomeText').textContent = `Hola, ${AppState.currentUser.full_name}`;

        if (onAuthSuccessCallback) await onAuthSuccessCallback();
    });

    // Formulario de Inicio de Sesión
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim().toLowerCase();
        const password = document.getElementById('loginPassword').value;
        const errEl = document.getElementById('loginErrorMsg');
        errEl.classList.add('hidden');

        if (!email || !password) {
            errEl.textContent = 'Por favor ingresa tu correo y contraseña.';
            errEl.classList.remove('hidden');
            return;
        }

        const result = await signIn(email, password);
        if (!result.success) {
            errEl.textContent = result.message;
            errEl.classList.remove('hidden');
            return;
        }

        authContainer.classList.add('hidden');
        document.getElementById('superAdminView').classList.add('hidden');
        document.getElementById('standardUserView').classList.remove('hidden');
        document.getElementById('dashboardContainer').classList.remove('hidden');
        document.getElementById('userWelcomeText').textContent = `Hola, ${AppState.currentUser.full_name}`;

        if (onAuthSuccessCallback) await onAuthSuccessCallback();
    });

    // Cierre de sesión
    document.getElementById('logoutBtn')?.addEventListener('click', async () => {
        await signOut();
        document.getElementById('dashboardContainer').classList.add('hidden');
        authContainer.classList.remove('hidden');
        loginCard.classList.add('hidden');
        verifyCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
        registerForm.reset();
        loginForm.reset();
    });
}
