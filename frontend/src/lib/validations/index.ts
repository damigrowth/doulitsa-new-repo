/**
 * CENTRALIZED VALIDATION SCHEMAS
 * Main export file for all validation schemas organized by feature
 */

// Core validation patterns
export * from './shared';

// Feature-specific validations
export * from './auth';
export * from './user';
export * from './profile';
export * from './service';
// export * from './review';
export * from './chat';
export * from './media';

// Admin validations
export * from './admin';
