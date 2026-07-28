// 'use client';

// import React, { createContext, useContext, useEffect, useState } from 'react';
// import {
//   AuthUser,
//   AuthSessionData,
//   AuthContextType,
//   ProfileWithRelations,
// } from '@/lib/types/auth';
// import { convertImageData } from '@/lib/utils/media';
// import { useSession } from '@/lib/auth/client';

// const AuthContext = createContext<AuthContextType | undefined>(undefined);

// interface AuthProviderProps {
//   children: React.ReactNode;
//   initialUser?: AuthUser | null;
//   initialProfile?: ProfileWithRelations | null;
//   initialSession?: AuthSessionData | null;
// }

// const initialState: Omit<
//   AuthContextType,
//   'initialize' | 'refreshAuth' | 'clearAuth' | 'hasRole' | 'checkRole'
// > = {
//   // User fields
//   id: null,
//   email: null,
//   emailVerified: false,
//   name: null,
//   createdAt: null,
//   updatedAt: null,
//   step: null,
//   confirmed: false,
//   blocked: false,
//   username: null,
//   displayName: null,
//   banExpires: null,
//   banReason: null,
//   banned: false,
//   role: null,

//   // Session fields
//   sessionId: null,
//   userId: null,
//   expiresAt: null,
//   token: null,
//   sessionCreatedAt: null,
//   sessionUpdatedAt: null,
//   ipAddress: null,
//   userAgent: null,

//   // Profile fields
//   profileId: null,
//   uid: null,
//   type: null,
//   tagline: null,
//   bio: null,
//   website: null,
//   experience: null,
//   rate: null,
//   size: null,
//   skills: null,
//   speciality: null,
//   category: null,
//   subcategory: null,
//   firstName: null,
//   lastName: null,
//   phone: null,
//   coverage: null,
//   image: null,
//   portfolio: null,
//   verified: false,
//   featured: false,
//   rating: 0,
//   reviewCount: 0,
//   published: false,
//   isActive: false,
//   profileCreatedAt: null,
//   profileUpdatedAt: null,

//   // Additional profile fields
//   commencement: null,
//   contactMethods: null,
//   paymentMethods: null,
//   settlementMethods: null,
//   budget: null,
//   industries: null,
//   terms: null,
//   billing: null,

//   // Presentation fields
//   visibility: null,
//   socials: null,
//   viber: null,
//   whatsapp: null,

//   // Relations
//   services: [],
//   reviews: [],
//   chatMemberships: [],

//   // State management
//   isLoading: true,
//   error: null,

//   // Computed auth status
//   isAuthenticated: false,
//   isConfirmed: false,
//   needsEmailVerification: false,
//   needsOnboarding: false,
//   hasAccess: false,
//   canAccessDashboard: false,

//   // Role checks
//   isAdmin: false,
//   isProfessional: false,
//   isSimpleUser: false,
//   isFreelancer: false,
//   isCompany: false,

//   // Profile status
//   hasProfile: false,
// };

// export function AuthProvider({ children }: { children: React.ReactNode }) {
//   // Use Better Auth's hook directly - this has built-in caching
//   const { data: session, isPending, error } = useSession();

//   const [state, setState] = useState(() => ({
//     ...initialState,
//     isLoading: true,
//   }));

//   const updateAuthState = (
//     user: AuthUser | null,
//     session: AuthSessionData | null,
//     profile: ProfileWithRelations | null = null,
//   ) => {
//     try {
//       // Derive auth states directly from user data
//       const isAuthenticated = !!user;
//       const needsEmailVerification = !user?.emailVerified;
//       const needsOnboarding =
//         user?.step === 'ONBOARDING' &&
//         (user?.role === 'freelancer' || user?.role === 'company');
//       const canAccessDashboard =
//         user?.emailVerified &&
//         user?.confirmed &&
//         user?.step === 'DASHBOARD' &&
//         !user?.blocked;
//       const hasAccess = user?.step === 'DASHBOARD' || user?.role === 'admin';

//       // Role checks
//       const isAdmin = user?.role === 'admin';
//       const isFreelancer = user?.role === 'freelancer';
//       const isCompany = user?.role === 'company';
//       const isProfessional = isFreelancer || isCompany;
//       const isSimpleUser = user?.role === 'user';

//       // Only professional users with completed onboarding have profiles
//       const hasProfile = isProfessional && user?.step === 'DASHBOARD';
//       const profileData = hasProfile ? profile : null;

//       setState((prev) => ({
//         ...prev,
//         // User fields (flattened)
//         id: user?.id || null,
//         email: user?.email || null,
//         emailVerified: user?.emailVerified || false,
//         name: user?.name || null,
//         createdAt: user?.createdAt || null,
//         updatedAt: user?.updatedAt || null,
//         step: user?.step || null,
//         confirmed: user?.confirmed || false,
//         blocked: user?.blocked || false,
//         username: user?.username || null,
//         displayName: user?.displayName || null,
//         banExpires: user?.banExpires || null,
//         banReason: user?.banReason || null,
//         banned: user?.banned || false,
//         role: user?.role || null,

//         // Session fields (flattened)
//         sessionId: session?.id || null,
//         userId: session?.userId || null,
//         expiresAt: session?.expiresAt || null,
//         token: session?.token || null,
//         sessionCreatedAt: session?.createdAt || null,
//         sessionUpdatedAt: session?.updatedAt || null,
//         ipAddress: session?.ipAddress || null,
//         userAgent: session?.userAgent || null,

//         // Profile fields (only included for professional users with completed onboarding)
//         ...(hasProfile && profileData
//           ? {
//               profileId: profileData.id,
//               uid: profileData.uid,
//               type: profileData.type,
//               tagline: profileData.tagline,
//               bio: profileData.bio,
//               website: profileData.website,
//               experience: profileData.experience,
//               rate: profileData.rate,
//               size: profileData.size,
//               skills: profileData.skills,
//               speciality: profileData.speciality,
//               category: profileData.category,
//               subcategory: profileData.subcategory,
//               firstName: profileData.firstName,
//               lastName: profileData.lastName,
//               phone: profileData.phone,
//               coverage: profileData.coverage,
//               image: convertImageData(profileData.image),
//               portfolio: profileData.portfolio,
//               verified: profileData.verified,
//               featured: profileData.featured,
//               rating: profileData.rating,
//               reviewCount: profileData.reviewCount,
//               published: profileData.published,
//               isActive: profileData.isActive,
//               profileCreatedAt: profileData.createdAt,
//               profileUpdatedAt: profileData.updatedAt,
//               // Additional profile fields
//               commencement: profileData.commencement,
//               contactMethods: profileData.contactMethods,
//               paymentMethods: profileData.paymentMethods,
//               settlementMethods: profileData.settlementMethods,
//               budget: profileData.budget,
//               industries: profileData.industries,
//               terms: profileData.terms,
//               billing: profileData.billing,
//               // Presentation fields
//               visibility: profileData.visibility,
//               socials: profileData.socials,
//               viber: profileData.viber,
//               whatsapp: profileData.whatsapp,
//               // Relations
//               services: profileData.services || [],
//               reviews: profileData.reviews || [],
//               chatMemberships: profileData.chatMemberships || [],
//             }
//           : {}),

//         // State management
//         isLoading: false,
//         error: null,

//         // Computed auth status
//         isAuthenticated,
//         isConfirmed: user?.emailVerified || false,
//         needsEmailVerification,
//         needsOnboarding,
//         hasAccess,
//         canAccessDashboard,

//         // Role checks
//         isAdmin,
//         isProfessional,
//         isSimpleUser,
//         isFreelancer,
//         isCompany,

//         // Profile status
//         hasProfile,
//       }));
//     } catch (error) {
//       console.error('Update auth state error:', error);
//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: 'Failed to update authentication state',
//       }));
//     }
//   };

//   const refreshAuth = async () => {
//     // Better Auth's useSession hook handles refreshing automatically
//     setState((prev) => ({ ...prev, error: null }));
//   };

//   const clearAuth = () => {
//     setState((prev) => ({
//       ...prev,
//       ...initialState,
//       isLoading: false,
//     }));
//   };

//   const hasRole = (roles: string | string[]) => {
//     if (!state.role) return false;
//     const roleArray = Array.isArray(roles) ? roles : [roles];
//     return roleArray.includes(state.role);
//   };

//   const checkRole = (role: string) => {
//     return state.role === role;
//   };

//   // Update state when Better Auth session changes
//   useEffect(() => {
//     if (!isPending) {
//       if (session?.user) {
//         // Get profile data if user is professional and has completed onboarding
//         const loadProfile = async () => {
//           let profile = null;
//           if (session.user.id && (session.user.role === 'freelancer' || session.user.role === 'company') && session.user.step === 'DASHBOARD') {
//             try {
//               const { getProfileByUserId } = await import('@/actions/profiles/get-profile');
//               const profileResult = await getProfileByUserId(session.user.id);
//               if (profileResult.success) {
//                 profile = profileResult.data;
//               }
//             } catch (profileError) {
//               console.error('Failed to fetch profile:', profileError);
//             }
//           }
//           updateAuthState(session.user, session, profile);
//         };

//         loadProfile();
//       } else {
//         setState((prev) => ({
//           ...prev,
//           ...initialState,
//           isLoading: false,
//           error: error?.message || null,
//         }));
//       }
//     }
//   }, [session, isPending, error]); // Run when session data changes

//   const contextValue: AuthContextType = {
//     ...state,
//     refreshAuth,
//     clearAuth,
//     hasRole,
//     checkRole,
//   };

//   return (
//     <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }

// // Performance-optimized selectors
// export function useAuthUser() {
//   const { id, email, name, username, displayName, role, step } = useAuth();
//   return { id, email, name, username, displayName, role, step };
// }

// export function useAuthLoading() {
//   const { isLoading } = useAuth();
//   return isLoading;
// }

// export function useAuthPermissions() {
//   const {
//     isAuthenticated,
//     hasAccess,
//     canAccessDashboard,
//     isAdmin,
//     isProfessional,
//   } = useAuth();
//   return {
//     isAuthenticated,
//     hasAccess,
//     canAccessDashboard,
//     isAdmin,
//     isProfessional,
//   };
// }

// export function useAuthUserInfo() {
//   const { username, displayName, firstName, lastName, image, name } = useAuth();
//   return {
//     username,
//     displayName,
//     firstName,
//     lastName,
//     image,
//     name,
//   };
// }
