/**
 * LIGHTWEIGHT COMPONENTS BARREL
 *
 * IMPORTANT: This file ONLY re-exports lightweight, commonly-used components.
 * Heavy modules (admin, dashboard) must be imported directly to prevent bundle bloat.
 *
 * ❌ DO NOT ADD: admin, dashboard, or any components using @tanstack/react-table
 * ✅ SAFE TO ADD: Small utilities, guards, shared components
 */

// Lightweight shared components only
export { default as NextLink } from './shared/next-link';

// Guards (small, frequently used)
export * from './guards';

// Forms (needed across multiple routes, but NOT admin forms)
export * from './forms/auth';
export * from './forms/profile';
export * from './forms/service';

// DO NOT EXPORT:
// - './admin' → Use: import { Component } from '@/components/admin'
// - './dashboard' → Use: import { Component } from '@/components/dashboard'
// - './home' → Use: import Component from '@/components/home/...'
// - './profile' → Use: import { Component } from '@/components/profile'
// - './service' → Use: import { Component } from '@/components/service'
// - './shared' → Use: import { Component } from '@/components/shared'
