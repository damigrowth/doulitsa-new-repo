// 'use client';

// import { createContext, useContext, useState, useCallback } from 'react';
// import {
//   ProfileWithRelations,
//   DashboardContextType,
//   AuthUser,
// } from '@/lib/types/auth';
// import { User } from '@/lib/prisma-types';
// import { convertImageData } from '@/lib/utils/media';
// import { getProfileByUserId } from '@/actions/profiles/get-profile';

// const DashboardContext = createContext<DashboardContextType | undefined>(
//   undefined,
// );

// export function DashboardProvider({
//   children,
//   initialProfile,
//   initialUser,
// }: {
//   children: React.ReactNode;
//   initialProfile: ProfileWithRelations | null;
//   initialUser: AuthUser | null;
// }) {
//   const [profile, setProfile] = useState(initialProfile);
//   const [user, setUser] = useState(initialUser);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const updateProfile = useCallback((newProfile: ProfileWithRelations) => {
//     setProfile(newProfile);
//   }, []);

//   const refreshProfile = useCallback(async () => {
//     if (user?.id) {
//       console.log(
//         '🔄 [DASHBOARD-PROVIDER] Starting profile refresh for user:',
//         user.id,
//       );
//       setIsLoading(true);
//       setError(null);
//       try {
//         const result = await getProfileByUserId(user.id);
//         if (result.success) {
//           console.log(
//             '✅ [DASHBOARD-PROVIDER] Profile data received from server:',
//             {
//               phone: result.data?.phone,
//               updatedAt: result.data?.updatedAt,
//             },
//           );
//           setProfile(result.data);
//           console.log(
//             '✅ [DASHBOARD-PROVIDER] Profile state updated successfully',
//           );
//         } else {
//           console.error(
//             '❌ [DASHBOARD-PROVIDER] Profile refresh failed:',
//             result.error,
//           );
//           setError(result.error || 'Failed to refresh profile');
//         }
//       } catch (err) {
//         console.error('❌ [DASHBOARD-PROVIDER] Profile refresh error:', err);
//         setError('Failed to refresh profile');
//       } finally {
//         setIsLoading(false);
//         console.log(
//           '✅ [DASHBOARD-PROVIDER] Profile refresh completed, isLoading set to false',
//         );
//       }
//     } else {
//       console.warn(
//         '⚠️ [DASHBOARD-PROVIDER] No user ID available for profile refresh',
//       );
//     }
//   }, [user?.id]);

//   const refreshAuth = useCallback(async () => {
//     setError(null);
//     // For dashboard, we just refresh profile since user comes from server
//     await refreshProfile();
//   }, [refreshProfile]);

//   const clearAuth = useCallback(() => {
//     setProfile(null);
//     setUser(null);
//     setError(null);
//     setIsLoading(false);
//   }, []);

//   const hasRole = useCallback(
//     (roles: string | string[]) => {
//       if (!user?.role) return false;
//       const roleArray = Array.isArray(roles) ? roles : [roles];
//       return roleArray.includes(user.role);
//     },
//     [user?.role],
//   );

//   const checkRole = useCallback(
//     (role: string) => {
//       return user?.role === role;
//     },
//     [user?.role],
//   );

//   // Computed auth status
//   const isAuthenticated = !!user;
//   const isConfirmed = user?.emailVerified || false;
//   const needsEmailVerification = !user?.emailVerified;
//   const needsOnboarding =
//     user?.step === 'ONBOARDING' &&
//     (user?.role === 'freelancer' || user?.role === 'company');
//   const canAccessDashboard =
//     user?.emailVerified &&
//     user?.confirmed &&
//     user?.step === 'DASHBOARD' &&
//     !user?.blocked;
//   const hasAccess = user?.step === 'DASHBOARD' || user?.role === 'admin';

//   // Role checks
//   const isAdmin = user?.role === 'admin';
//   const isFreelancer = user?.role === 'freelancer';
//   const isCompany = user?.role === 'company';
//   const isProfessional = isFreelancer || isCompany;
//   const isSimpleUser = user?.role === 'user';

//   // Profile status
//   const hasProfile = isProfessional && user?.step === 'DASHBOARD';

//   // Create flattened context value
//   const contextValue: DashboardContextType = {
//     // Raw objects
//     profile,
//     user,

//     // Flattened user fields
//     id: user?.id || null,
//     email: user?.email || null,
//     emailVerified: user?.emailVerified || false,
//     displayName: user?.displayName || null,
//     username: user?.username || null,
//     role: user?.role || null,
//     step: user?.step || null,
//     confirmed: user?.confirmed || false,
//     blocked: user?.blocked || false,
//     banned: user?.banned || false,

//     // Flattened profile fields (only if hasProfile is true)
//     profileId: hasProfile ? profile?.id || null : null,
//     tagline: hasProfile ? profile?.tagline || null : null,
//     bio: hasProfile ? profile?.bio || null : null,
//     website: hasProfile ? profile?.website || null : null,
//     experience: hasProfile ? profile?.experience || null : null,
//     rate: hasProfile ? profile?.rate || null : null,
//     size: hasProfile ? profile?.size || null : null,
//     skills: hasProfile ? profile?.skills || null : null,
//     speciality: hasProfile ? profile?.speciality || null : null,
//     category: hasProfile ? profile?.category || null : null,
//     subcategory: hasProfile ? profile?.subcategory || null : null,
//     firstName: hasProfile ? profile?.firstName || null : null,
//     lastName: hasProfile ? profile?.lastName || null : null,
//     phone: hasProfile ? profile?.phone || null : null,
//     coverage: hasProfile ? profile?.coverage || null : null,
//     image: hasProfile ? convertImageData(profile?.image) : null,
//     portfolio: hasProfile
//       ? (typeof profile?.portfolio === 'string'
//           ? JSON.parse(profile.portfolio)
//           : profile?.portfolio) || null
//       : null,
//     verified: hasProfile ? profile?.verified || false : false,
//     featured: hasProfile ? profile?.featured || false : false,
//     rating: hasProfile ? profile?.rating || 0 : 0,
//     reviewCount: hasProfile ? profile?.reviewCount || 0 : 0,
//     published: hasProfile ? profile?.published || false : false,
//     isActive: hasProfile ? profile?.isActive || false : false,

//     // Additional profile fields
//     commencement: hasProfile ? profile?.commencement || null : null,
//     contactMethods: hasProfile ? profile?.contactMethods || null : null,
//     paymentMethods: hasProfile ? profile?.paymentMethods || null : null,
//     settlementMethods: hasProfile ? profile?.settlementMethods || null : null,
//     budget: hasProfile ? profile?.budget || null : null,
//     industries: hasProfile ? profile?.industries || null : null,
//     terms: hasProfile ? profile?.terms || null : null,
//     billing: hasProfile ? profile?.billing || null : null,

//     // Presentation fields (parse JSON strings like portfolio)
//     visibility: hasProfile
//       ? typeof profile?.visibility === 'string'
//         ? JSON.parse(profile.visibility)
//         : profile?.visibility
//       : null,
//     socials: hasProfile
//       ? typeof profile?.socials === 'string'
//         ? JSON.parse(profile.socials)
//         : profile?.socials
//       : null,
//     viber: hasProfile ? profile?.viber || null : null,
//     whatsapp: hasProfile ? profile?.whatsapp || null : null,

//     // Relations
//     services: hasProfile && profile?.services ? profile.services : [],
//     reviews:
//       hasProfile && profile?.reviews ? profile.reviews : [],
//     chatMemberships:
//       hasProfile && profile?.chatMemberships ? profile.chatMemberships : [],

//     // Computed auth status
//     isAuthenticated,
//     isConfirmed,
//     needsEmailVerification,
//     needsOnboarding,
//     hasAccess,
//     canAccessDashboard,

//     // Role checks
//     isAdmin,
//     isProfessional,
//     isSimpleUser,
//     isFreelancer,
//     isCompany,

//     // Profile status
//     hasProfile,

//     // Actions
//     updateProfile,
//     refreshProfile,
//     refreshAuth,
//     clearAuth,
//     hasRole,
//     checkRole,

//     // Loading states
//     isLoading,
//     error,
//   };

//   return (
//     <DashboardContext.Provider value={contextValue}>
//       {children}
//     </DashboardContext.Provider>
//   );
// }

// export function useDashboard(): DashboardContextType {
//   const context = useContext(DashboardContext);
//   if (!context) {
//     throw new Error('useDashboard must be used within DashboardProvider');
//   }
//   return context;
// }
