'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllowedRolesDisplayInfo } from '@/lib/auth/roles';

interface RoleSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  currentUserRole: string; // The admin user's role (admin or support)
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Role select component that shows only the roles the current user can assign
 *
 * - Admin: Can see and assign all 6 roles (user, freelancer, company, admin, support, editor)
 * - Support: Can see and assign only 3 roles (user, freelancer, company)
 * - Editor: Cannot assign any roles (empty select)
 */
export function RoleSelect({
  value,
  onValueChange,
  currentUserRole,
  disabled,
  placeholder = 'Select role',
}: RoleSelectProps) {
  const allowedRoles = getAllowedRolesDisplayInfo(currentUserRole);

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(allowedRoles).map(([role, info]) => (
          <SelectItem key={role} value={role}>
            {info.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
