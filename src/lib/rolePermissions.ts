/**
 * Role Permission System
 *
 * Hierarchical role system to prevent privilege escalation:
 * - super-admin (100): Can manage admins and users, full system access
 * - admin (50): Can manage regular users and content
 * - user (1): Regular employee
 */

import type { Employee, Role } from '@/types';

/**
 * Get the hierarchy level for a role
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    'super-admin': 100,
    'admin': 50,
    'user': 1
  };
  return levels[role] || 0;
}

/**
 * Check if a user can modify another user's role
 */
export function canModifyUserRole(
  modifier: Employee | null,
  targetUser: Employee,
  newRole: Role
): boolean {
  if (!modifier) return false;

  if (modifier.role === 'super-admin') {
    // Super Admin can modify anyone except maybe themselves (handled in validation)
    return true;
  }

  if (modifier.role === 'admin') {
    return targetUser.role === 'user' && newRole === 'user';
  }

  return false;
}

/**
 * Check if a user can delete another user
 */
export function canDeleteUser(
  modifier: Employee | null,
  targetUser: Employee
): boolean {
  if (!modifier) return false;

  if (modifier.role === 'super-admin') {
    // Super admin can delete anyone except self (usually handled in UI/confirmation)
    return modifier.id !== targetUser.id;
  }

  if (modifier.role === 'admin') {
    return targetUser.role === 'user';
  }

  return false;
}

/**
 * Check if a user can modify another user's profile
 */
export function canModifyUserProfile(
  modifier: Employee | null,
  targetUser: Employee
): boolean {
  if (!modifier) return false;

  if (modifier.id === targetUser.id) {
    return true;
  }

  if (modifier.role === 'super-admin') {
    return targetUser.role !== 'super-admin' || modifier.id === targetUser.id;
  }

  if (modifier.role === 'admin') {
    return targetUser.role === 'user';
  }

  return false;
}

/**
 * Get assignable roles for a user
 */
export function getAssignableRoles(modifier: Employee | null): Role[] {
  if (!modifier) return [];

  switch (modifier.role) {
    case 'super-admin':
      return ['super-admin', 'admin', 'user'];
    case 'admin':
      return ['user'];
    default:
      return [];
  }
}

/**
 * Check if user has admin privileges
 */
export function isAdmin(user: Employee | null): boolean {
  if (!user) return false;
  return ['super-admin', 'admin'].includes(user.role);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(user: Employee | null): boolean {
  if (!user) return false;
  return user.role === 'super-admin';
}

/**
 * Check if user is any admin
 */
export function isAnyAdmin(user: Employee | null): boolean {
  if (!user) return false;
  return ['super-admin', 'admin'].includes(user.role);
}

export function isAdministrativeAccount(id: string | undefined): boolean {
  if (!id) return false;

  // Specific known administrative/system accounts that should be excluded from employee-only reports
  const adminIds = ['rsijsp', 'admin', 'superadmin', 'owner'];
  if (adminIds.includes(id.toLowerCase())) return true;

  // Previously, this regex /[^0-9]/.test(id) was used, but it's dangerous 
  // as many hospitals use alphanumeric NIPs like 'P-123' or 'MED001'.
  // We now only exclude confirmed non-employee accounts.
  return false;
}

/**
 * Get role display configuration
 */
export function getRoleDisplay(role: Role): {
  label: string;
  color: string;
  bgColor: string;
  level: number;
} {
  const roleConfig: Record<Role, { label: string; color: string; bgColor: string; level: number; }> = {
    'super-admin': {
      label: 'Super Admin',
      color: 'text-red-700',
      bgColor: 'bg-red-100',
      level: 100
    },
    'admin': {
      label: 'Admin',
      color: 'text-orange-700',
      bgColor: 'bg-orange-100',
      level: 50
    },
    'user': {
      label: 'User',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      level: 1
    }
  };

  return roleConfig[role];
}

/**
 * Validate role change
 */
export function validateRoleChange(
  modifier: Employee | null,
  targetUser: Employee,
  newRole: Role
): string | null {
  if (!canModifyUserRole(modifier, targetUser, newRole)) {
    const modifierRole = modifier?.role || 'user';
    const targetRole = targetUser.role;

    if (modifierRole === 'admin' && targetRole === 'admin') {
      return 'Admin tidak dapat mengubah role admin lain';
    }
    if (modifierRole === 'super-admin' && targetRole === 'super-admin' && (!modifier || modifier.id !== targetUser.id)) {
      return 'Super Admin tidak dapat mengubah Super Admin lain';
    }
    if (modifierRole === 'super-admin' && newRole === 'super-admin') {
      // Allow super-admin to promote to super-admin
      return null;
    }
    if (modifierRole === 'admin' && newRole !== 'user') {
      return 'Admin hanya dapat menetapkan role: User';
    }
    return 'Anda tidak memiliki izin untuk mengubah role user ini';
  }

  if (modifier && modifier.id === targetUser.id && newRole !== modifier.role) {
    return 'Anda tidak dapat mengubah role sendiri';
  }

  return null;
}
