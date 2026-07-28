import { create } from 'zustand';
import { subscribeWithSelector, persist } from 'zustand/middleware';

// Import centralized types
import type { AuthType, ProRole, ConsentType } from '@/lib/types/auth';

/**
 * Role option for dropdown selection
 */
export interface RoleOption {
  value: ProRole;
  label: string;
}

/**
 * Registration flow store state and actions interface
 */
export interface RegistrationState {
  // Registration flow state
  /** Initial state object for backward compatibility */
  initialState: Record<string, any>;
  /** Authentication type selection: '' = none, 'user' = user, 'pro' = professional */
  type: AuthType;
  /** User role selection: 'freelancer', 'company', null = not selected */
  role: ProRole;
  /** Current step in the registration process */
  step: number;
  /** User consent status - can be boolean or array of consent types */
  consent: ConsentType;
  /** Available role options for selection */
  roles: RoleOption[];

  // Registration flow actions
  /** Set user consent status */
  setConsent: (consent: ConsentType) => void;
  /** Set authentication type */
  setAuthType: (type: AuthType) => void;
  /** Set user role */
  setAuthRole: (role: ProRole) => void;
  /** Set current step */
  setStep: (step: number) => void;
  /** Reset registration state to initial values */
  resetAuth: () => void;
}

/**
 * Registration flow store using Zustand with persistence
 */
const registrationStore = create<RegistrationState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Registration flow state
        initialState: {},
        type: '',
        role: null,
        step: 0,
        consent: false,
        roles: [
          {
            value: 'company',
            label: 'Επιχείρηση',
          },
          {
            value: 'freelancer',
            label: 'Επαγγελματίας',
          },
        ],

        // Registration flow actions
        setConsent: (consent: ConsentType) => set({ consent }),
        setAuthType: (payload: AuthType) => set(() => ({ type: payload })),
        setAuthRole: (payload: ProRole) => set(() => ({ role: payload })),
        setStep: (step: number) => set({ step }),
        resetAuth: () =>
          set({
            type: '',
            role: null,
            step: 0,
            consent: false,
            initialState: {},
          }),
      }),
      {
        name: 'auth-registration-store',
        // Only persist the essential auth flow data
        partialize: (state) => ({ 
          type: state.type, 
          role: state.role 
        }),
      }
    )
  )
);

/**
 * Helper functions for type-safe auth operations
 */
export const authHelpers = {
  /** Check if user has selected a type */
  hasSelectedType: (type: AuthType): boolean => type !== '',

  /** Check if user has selected a role (for professional accounts) */
  hasSelectedRole: (role: ProRole): boolean => role !== null,

  /** Check if user is selecting professional account */
  isProfessionalType: (type: AuthType): boolean => type === 'pro',

  /** Check if user is selecting simple user account */
  isUserType: (type: AuthType): boolean => type === 'user',

  /** Check if role is freelancer */
  isFreelancerRole: (role: ProRole): boolean => role === 'freelancer',

  /** Check if role is company */
  isCompanyRole: (role: ProRole): boolean => role === 'company',

  /** Convert role to string (already string, for compatibility) */
  roleToString: (role: ProRole): string | null => role,

  /** Check if consent includes terms */
  hasTermsConsent: (consent: ConsentType): boolean => {
    if (typeof consent === 'boolean') return consent;
    return Array.isArray(consent) && consent.includes('terms');
  },
};

/**
 * Main registration store hook
 * @example
 * const { type, setAuthType, role, setAuthRole } = useRegistrationStore();
 */
export const useRegistrationStore = registrationStore;

/**
 * Hook for backward compatibility - maps to useRegistrationStore
 * @deprecated Use useRegistrationStore for clarity
 */
export const useAuthStore = registrationStore;

export default registrationStore;
