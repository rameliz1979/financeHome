/**
 * FinanceHome — Servicio de Autenticación (Service Layer)
 * Reglas de negocio para registro, verificación OTP, login, perfil y sesión.
 */

import { getSupabaseClient } from '../data/supabase.client.js';
import { findUserById, upsertUser, updateUser } from '../data/user.repository.js';
import { OTP_LENGTH, SUPER_ADMIN_EMAIL, DEFAULT_PHONE } from '../config.js';
import AppState from '../state.js';

/**
 * Solicita el registro de un usuario en Supabase Auth y envía el OTP.
 * @param {string} email
 * @param {string} password
 * @param {string} userName
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function signUp(email, password, userName) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { full_name: userName } }
        });

        if (error) {
            console.error('Error en Supabase signUp:', error);
            return { success: false, message: error.message };
        }

        if (data?.user?.identities && data.user.identities.length === 0) {
            return {
                success: false,
                message: 'Este correo ya existe. Inicia sesión o reenvía el código.'
            };
        }

        return {
            success: true,
            message: `Código OTP de ${OTP_LENGTH} dígitos enviado a ${email}. Revisa tu correo o Spam.`
        };

    } catch (err) {
        console.error('Error inesperado en registro:', err);
        return { success: false, message: err.message || 'Error de conexión' };
    }
}

/**
 * Reenvía el código OTP al correo.
 * @param {string} email
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function resendOtp(email) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const { error } = await client.auth.resend({
            type: 'signup',
            email
        });

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: `Nuevo código de ${OTP_LENGTH} dígitos enviado.` };

    } catch (err) {
        return { success: false, message: `Error: ${err.message}` };
    }
}

function getPasswordResetOptions() {
    if (typeof window === 'undefined') return undefined;
    if (!['http:', 'https:'].includes(window.location.protocol)) return undefined;

    return {
        redirectTo: `${window.location.origin}${window.location.pathname}`
    };
}

/**
 * Envía un código OTP o enlace seguro de recuperación al correo del usuario,
 * según la plantilla configurada en Supabase.
 * Supabase no permite consultar ni enviar la contraseña actual porque se almacena hasheada.
 * @param {string} email
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendPasswordRecoveryOtp(email) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const { error } = await client.auth.resetPasswordForEmail(email, getPasswordResetOptions());

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: 'Si el correo está registrado, recibirás un código OTP para crear una nueva contraseña.' };
    } catch (err) {
        console.error('Error enviando recuperación de contraseña:', err);
        return { success: false, message: 'No fue posible enviar el correo de recuperación.' };
    }
}

/**
 * Verifica el OTP de recuperación y abre una sesión temporal para cambiar contraseña.
 * @param {string} email
 * @param {string} token
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyPasswordRecoveryOtp(email, token) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const { error } = await client.auth.verifyOtp({
            email,
            token,
            type: 'recovery'
        });

        if (error) {
            return { success: false, message: 'Código incorrecto o vencido: ' + error.message };
        }

        return { success: true, message: 'Código verificado. Ahora crea tu nueva contraseña.' };
    } catch (err) {
        console.error('Error verificando OTP de recuperación:', err);
        return { success: false, message: 'No fue posible verificar el código de recuperación.' };
    }
}

/**
 * Actualiza la contraseña tras abrir el enlace de recuperación enviado por Supabase.
 * @param {string} newPassword
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updatePasswordFromRecovery(newPassword) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible' };

    try {
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) {
            return { success: false, message: error.message };
        }

        await client.auth.signOut();
        AppState.resetAll();

        return { success: true, message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' };
    } catch (err) {
        console.error('Error actualizando contraseña recuperada:', err);
        return { success: false, message: 'No fue posible actualizar la contraseña.' };
    }
}

/**
 * Registra un listener para detectar cuando el usuario vuelve desde el enlace de recuperación.
 * @param {Function} callback
 */
export function onPasswordRecovery(callback) {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            callback(session);
        }
    });

    return data?.subscription || null;
}

/**
 * Verifica el código OTP y activa la cuenta.
 * @param {string} email
 * @param {string} token
 * @param {object} pendingData - { name, email }
 * @returns {Promise<{success: boolean, message: string, user: object|null}>}
 */
export async function verifyOtp(email, token, pendingData) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible', user: null };

    try {
        const { data, error } = await client.auth.verifyOtp({
            email,
            token,
            type: 'email'
        });

        if (error) {
            return { success: false, message: 'Código incorrecto o vencido: ' + error.message, user: null };
        }

        const authenticatedUser = data.user;
        const newUserObj = {
            id: authenticatedUser.id,
            full_name: pendingData.name,
            email: pendingData.email,
            phone: DEFAULT_PHONE,
            is_active: true,
            is_superadmin: pendingData.email === SUPER_ADMIN_EMAIL
        };

        await upsertUser(newUserObj);
        AppState.currentUser = newUserObj;
        AppState.isSuperAdmin = newUserObj.is_superadmin;

        return { success: true, message: '¡Cuenta verificada y activada con éxito!', user: newUserObj };

    } catch (err) {
        console.error('Error en verificación OTP:', err);
        return { success: false, message: 'No fue posible verificar el código OTP.', user: null };
    }
}

/**
 * Inicia sesión con email y contraseña.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, message: string, user: object|null}>}
 */
export async function signIn(email, password) {
    const client = getSupabaseClient();
    if (!client) return { success: false, message: 'Supabase no disponible', user: null };

    try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('Error en inicio de sesión Supabase:', error);
            let message = 'Correo o contraseña incorrectos.';
            if (error.message.includes('Email not confirmed')) {
                message = 'Tu cuenta aún no ha sido verificada. Revisa el código OTP enviado a tu correo.';
            }
            return { success: false, message, user: null };
        }

        const profileData = await findUserById(data.user.id);

        const user = {
            id: data.user.id,
            email: data.user.email,
            full_name: profileData?.full_name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
            phone: profileData?.phone || DEFAULT_PHONE,
            role_profile: data.user.user_metadata?.role_profile || 'Administrador de Hogar',
            is_superadmin: Boolean(profileData?.is_superadmin || data.user.user_metadata?.is_superadmin || data.user.email === SUPER_ADMIN_EMAIL)
        };

        if (!profileData) {
            await upsertUser({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone: user.phone,
                is_active: true,
                is_superadmin: user.is_superadmin
            });
        }

        AppState.currentUser = user;
        AppState.isSuperAdmin = user.is_superadmin;

        return { success: true, message: '¡Sesión iniciada correctamente!', user };

    } catch (err) {
        console.error('Error general en login:', err);
        return { success: false, message: 'Error al iniciar sesión. Inténtalo de nuevo.', user: null };
    }
}

/**
 * Actualiza el perfil de usuario (nombre, teléfono y contraseña opcional).
 * @param {string} newName
 * @param {string} newPhone
 * @param {string} [newPassword]
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function updateUserProfile(newName, newPhone, newPassword) {
    const client = getSupabaseClient();
    if (!client || !AppState.currentUser) {
        return { success: false, message: 'Sesión no iniciada' };
    }

    try {
        // Actualizar en tabla pública `users`
        const { error: dbErr } = await updateUser(AppState.currentUser.id, {
            full_name: newName,
            phone: newPhone
        });

        if (dbErr) throw dbErr;

        // Si ingresó contraseña nueva, actualizar en Supabase Auth
        if (newPassword && newPassword.length >= 8) {
            const { error: authErr } = await client.auth.updateUser({ password: newPassword });
            if (authErr) throw authErr;
        }

        AppState.currentUser.full_name = newName;
        AppState.currentUser.phone = newPhone;

        return { success: true, message: '¡Perfil actualizado con éxito!' };

    } catch (err) {
        console.error('Error actualizando perfil:', err);
        return { success: false, message: 'Error actualizando perfil: ' + err.message };
    }
}

/**
 * Cierra la sesión activa.
 */
export async function signOut() {
    const client = getSupabaseClient();
    if (client) await client.auth.signOut();
    AppState.resetAll();
}

/**
 * Verifica si existe una sesión activa persistida en Supabase.
 * @returns {Promise<object|null>}
 */
export async function getExistingSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    const { data } = await client.auth.getSession();
    return data?.session?.user || null;
}

/**
 * Sincroniza y carga el usuario en AppState.
 * @param {object} authUser
 * @returns {Promise<object>}
 */
export async function syncAndLoadUser(authUser) {
    const profileData = await findUserById(authUser.id);

    const user = {
        id: authUser.id,
        email: authUser.email,
        full_name: profileData?.full_name || authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        phone: profileData?.phone || DEFAULT_PHONE,
        role_profile: authUser.user_metadata?.role_profile || 'Administrador de Hogar',
            is_superadmin: Boolean(profileData?.is_superadmin || authUser.user_metadata?.is_superadmin || authUser.email === SUPER_ADMIN_EMAIL)
    };

    if (!profileData) {
        await upsertUser({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone: user.phone,
            is_active: true,
            is_superadmin: user.is_superadmin
        });
    }

    AppState.currentUser = user;
    AppState.isSuperAdmin = user.is_superadmin;
    return user;
}
