/**
 * Permission utility helper
 */

export const getStoredUser = () => {
    try {
        const userStr =
            localStorage.getItem("user") ||
            sessionStorage.getItem("user") ||
            localStorage.getItem("auth_user") ||
            sessionStorage.getItem("auth_user");
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

/**
 * Check if the user is Super Admin
 */
export const isSuperAdmin = (user = null) => {
    const currentUser = user || getStoredUser();
    if (!currentUser) return false;

    const roleSlug = String(
        currentUser.role?.slug ||
        currentUser.role ||
        currentUser.role_name ||
        currentUser.roleSlug ||
        ""
    ).toLowerCase();

    return (
        Boolean(currentUser.is_super_admin) ||
        currentUser.is_super_admin === 1 ||
        currentUser.is_super_admin === "1" ||
        currentUser.is_super_admin === true ||
        roleSlug === "super_admin" ||
        roleSlug === "superadmin" ||
        currentUser.role === "super_admin" ||
        currentUser.role_name === "Super Admin" ||
        currentUser.roleSlug === "super_admin" ||
        currentUser.role_id === 1 ||
        currentUser.id === 1
    );
};

/**
 * Check if the user has a specific permission
 * @param {string} permission - e.g. "bots.view"
 * @param {object} [user] - optional user object
 */
export const hasPermission = (permission, user = null) => {
    if (!permission) return true;

    const currentUser = user || getStoredUser();
    // If user is inside protected area, don't lock them out completely
    if (!currentUser) return true;

    // Super Admin has unrestricted access to everything
    if (isSuperAdmin(currentUser)) return true;

    const roleSlug = String(
        currentUser.role?.slug ||
        currentUser.role ||
        currentUser.role_name ||
        currentUser.roleSlug ||
        ""
    ).toLowerCase();

    // Platform-level features are strictly reserved for Super Admin
    const superAdminOnly = [
        "platform_settings.view",
        "clients.view",
        "client_users.view",
        "system_logs.view",
        "roles.view",
        //  "bots.view",
         
    
    ];

    if (superAdminOnly.includes(permission)) {
        return false;
    }

    // Client Admin and Client roles have access to all tenant operational features
    if (roleSlug === "client" || roleSlug === "admin") {
        return true;
    }

    // Check explicit permissions array from backend
    const permissions = currentUser.permissions;
    if (Array.isArray(permissions) && permissions.length > 0) {
        if (permissions.includes(permission)) return true;
    }

    // Default allowed routes for any authenticated team member
    const defaultAllowed = [
        "dashboard.view",
        "bots.view",
        "workflows.view",
        "whatsapp_accounts.view",
        "whatsapp_simulator.view",
        "usage.view",
        "contacts.view",
        "templates.view",
        "failed_workflows.view",
    ];

    return defaultAllowed.includes(permission);
};

/**
 * Check if the user has any of the listed permissions
 * @param {string[]} permissions - e.g. ["bots.view", "bots.create"]
 * @param {object} [user] - optional user object
 */
export const hasAnyPermission = (permissions = [], user = null) => {
    if (!permissions || permissions.length === 0) return true;

    const currentUser = user || getStoredUser();
    if (!currentUser) return true;

    if (isSuperAdmin(currentUser)) return true;

    return permissions.some((p) => hasPermission(p, currentUser));
};