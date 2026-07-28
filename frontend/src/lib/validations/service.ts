/**
 * SERVICE VALIDATION SCHEMAS
 * Service entity validation schemas
 */

import { z } from 'zod';
import { stripHtmlTags } from '@/lib/utils/text/html';
import { paginationSchema } from './shared';
import {
  serviceAddonSchema,
  serviceFaqSchema,
  serviceTypeSchema,
  cloudinaryResourceSchema,
} from '@/lib/prisma/json-types';
/**
 * Prisma-generated enums replaced with literal unions — Prisma client is no
 * longer in the runtime bundle. Same string values as before so the API
 * payloads stay identical.
 */
const SubscriptionType = {
  month: 'month', year: 'year', per_case: 'per_case',
  per_hour: 'per_hour', per_session: 'per_session',
} as const;
const Status = {
  draft: 'draft', pending: 'pending', published: 'published',
  rejected: 'rejected', approved: 'approved', inactive: 'inactive',
} as const;

// =============================================
// SERVICE ADDON & FAQ SCHEMAS
// =============================================

// Import schemas from JSON types - these match Prisma JSON field definitions
// Using imported schemas: serviceAddonSchema, serviceFaqSchema, serviceTypeSchema, cloudinaryResourceSchema

// Add validation refinements for form-specific requirements
export const formServiceAddonSchema = z.object({
  title: z
    .string()
    .min(
      5,
      'Ο τίτλος της extra υπηρεσίας πρέπει να είναι τουλάχιστον 5 χαρακτήρες',
    )
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z
    .string()
    .min(
      10,
      'Η περιγραφή της extra υπηρεσίας πρέπει να είναι τουλάχιστον 10 χαρακτήρες',
    )
    .max(500, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες'),
  price: z
    .number()
    .min(5, 'Η ελάχιστη τιμή είναι 5€')
    .max(5000, 'Η μέγιστη τιμή είναι 5.000€'),
});

export const formServiceFaqSchema = z.object({
  question: z
    .string()
    .min(10, 'Η ερώτηση πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
    .max(200, 'Η ερώτηση δεν μπορεί να ξεπερνά τους 200 χαρακτήρες'),
  answer: z
    .string()
    .min(2, 'Η απάντηση πρέπει να είναι τουλάχιστον 2 χαρακτήρες')
    .max(1000, 'Η απάντηση δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες'),
});

// Draft versions with relaxed validation
export const draftServiceAddonSchema = z.object({
  title: z
    .string()
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες')
    .optional(),
  description: z
    .string()
    .max(500, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες')
    .optional(),
  price: z
    .number()
    .min(0, 'Η τιμή δεν μπορεί να είναι αρνητική')
    .max(5000, 'Η τιμή δεν μπορεί να ξεπερνά τα 5.000€')
    .optional(),
});

export const draftServiceFaqSchema = z.object({
  question: z
    .string()
    .max(200, 'Η ερώτηση δεν μπορεί να ξεπερνά τους 200 χαρακτήρες')
    .optional(),
  answer: z
    .string()
    .max(1000, 'Η απάντηση δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες')
    .optional(),
});

// =============================================
// SERVICE TAXONOMY SCHEMAS
// =============================================

// Custom validator function to check if taxonomy fields have valid IDs
const hasValidId = (field) => {
  if (!field) return false;
  if (field.id === 0 || field.id === '0') return false;
  return true;
};

export const serviceTaxonomySchema = z.union([
  z
    .object({
      id: z.union([z.string(), z.number()]),
      label: z.string().optional(),
    })
    .refine(hasValidId, {
      message: 'Αυτό το πεδίο είναι υποχρεωτικό',
      path: ['id'],
    }),
  z.string().min(1, 'Αυτό το πεδίο είναι υποχρεωτικό'),
  z.null(),
]);

export const serviceTagSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  isNewTerm: z.boolean().optional(),
  data: z.any().optional(),
  attributes: z.any().optional(),
});

// =============================================
// SERVICE CRUD SCHEMAS
// =============================================

// Comprehensive service edit schema (from legacy with Greek messages)
export const serviceEditSchema = z.object({
  title: z
    .string()
    .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες')
    .optional(),
  description: z
    .string()
    .refine(
      (val) => stripHtmlTags(val).length >= 80,
      'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
    )
    .refine(
      (val) => stripHtmlTags(val).length <= 5000,
      'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
    )
    .optional(),
  price: z
    .number()
    .refine((val) => val === 0 || val >= 10, {
      message: 'Η τιμή πρέπει να είναι 0 ή τουλάχιστον 10€',
    })
    .optional(),
  status: z.nativeEnum(Status).optional(),
  category: serviceTaxonomySchema,
  subcategory: serviceTaxonomySchema,
  subdivision: serviceTaxonomySchema,
  tags: z.union([z.array(serviceTagSchema), z.array(z.string())]).optional(),
  addons: z
    .array(formServiceAddonSchema)
    .max(3, 'Μέγιστος αριθμός extra υπηρεσιών: 3')
    .optional()
    .superRefine((addons, ctx) => {
      if (!addons || addons.length === 0) return;

      // Check for duplicate titles
      const titles = addons.map((addon) => addon.title.toLowerCase().trim());
      const titleIndexMap = new Map<string, number[]>();

      titles.forEach((title, index) => {
        if (!titleIndexMap.has(title)) {
          titleIndexMap.set(title, []);
        }
        titleIndexMap.get(title)!.push(index);
      });

      titleIndexMap.forEach((indices) => {
        if (indices.length > 1) {
          indices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
              path: [index, 'title'],
            });
          });
        }
      });

      // Check for duplicate descriptions
      const descriptions = addons.map((addon) =>
        addon.description.toLowerCase().trim(),
      );
      const descriptionIndexMap = new Map<string, number[]>();

      descriptions.forEach((description, index) => {
        if (!descriptionIndexMap.has(description)) {
          descriptionIndexMap.set(description, []);
        }
        descriptionIndexMap.get(description)!.push(index);
      });

      descriptionIndexMap.forEach((indices) => {
        if (indices.length > 1) {
          indices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message:
                'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
              path: [index, 'description'],
            });
          });
        }
      });

      // Check that all addon prices are at least 5€
      addons.forEach((addon, index) => {
        if (addon.price < 5) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Η ελάχιστη τιμή είναι 5€',
            path: [index, 'price'],
          });
        }
      });
    }),
  faq: z
    .array(formServiceFaqSchema)
    .max(5, 'Μέγιστος αριθμός ερωτήσεων: 5')
    .optional()
    .superRefine((faqs, ctx) => {
      if (!faqs || faqs.length === 0) return;

      // Check for duplicate questions
      const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
      const questionIndexMap = new Map<string, number[]>();

      questions.forEach((question, index) => {
        if (!questionIndexMap.has(question)) {
          questionIndexMap.set(question, []);
        }
        questionIndexMap.get(question)!.push(index);
      });

      questionIndexMap.forEach((indices) => {
        if (indices.length > 1) {
          indices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
              path: [index, 'question'],
            });
          });
        }
      });

      // Check for duplicate answers
      const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
      const answerIndexMap = new Map<string, number[]>();

      answers.forEach((answer, index) => {
        if (!answerIndexMap.has(answer)) {
          answerIndexMap.set(answer, []);
        }
        answerIndexMap.get(answer)!.push(index);
      });

      answerIndexMap.forEach((indices) => {
        if (indices.length > 1) {
          indices.forEach((index) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
              path: [index, 'answer'],
            });
          });
        }
      });
    }),
});

export const serviceQuerySchema = z
  .object({
    search: z.string().optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    minPrice: z.coerce.number().min(0).optional(),
    maxPrice: z.coerce.number().min(0).optional(),
    pricingType: z.string().optional(),
    location: z.string().optional(),
    published: z.boolean().optional(),
    featured: z.boolean().optional(),
  })
  .merge(paginationSchema);

// =============================================
// SERVICE PACKAGE SCHEMAS
// =============================================

export const servicePackageFeatureSchema = z.object({
  title: z.string().min(1, 'Ο τίτλος της λειτουργίας είναι υποχρεωτικός'),
  description: z.string().optional(),
  included: z.boolean().default(true),
});

export const servicePackageSchema = z.object({
  name: z.string().min(1, 'Το όνομα του πακέτου είναι υποχρεωτικό'),
  description: z
    .string()
    .min(
      10,
      'Η περιγραφή του πακέτου πρέπει να είναι τουλάχιστον 10 χαρακτήρες',
    ),
  price: z.number().min(0, 'Η τιμή πρέπει να είναι 0 ή θετική'),
  deliveryTime: z.string().optional(),
  revisions: z.number().int().min(0).optional(),
  features: z.array(servicePackageFeatureSchema).optional(),
});

// =============================================
// SERVICE MEDIA SCHEMAS
// =============================================

export const serviceMediaSchema = z.object({
  url: z.string().url('Άκυρο URL πολυμέσου'),
  type: z.enum(['image', 'video', 'audio', 'document']),
  title: z.string().optional(),
  description: z.string().optional(),
  order: z.number().int().min(0).optional(),
  featured: z.boolean().default(false),
});

// =============================================
// SERVICE STATUS SCHEMAS
// =============================================

export const serviceStatusSchema = z.nativeEnum(Status);

export const updateServiceStatusSchema = z.object({
  status: serviceStatusSchema,
  reason: z.string().optional(), // For rejection reasons
});

// =============================================
// SERVICE REPORTING SCHEMA
// =============================================

// Simple service report form schema for the report dialog
export const reportServiceFormSchema = z.object({
  serviceId: z.number(),
  serviceTitle: z.string(),
  serviceSlug: z.string(),
  description: z
    .string()
    .min(10, 'Η περιγραφή πρέπει να έχει τουλάχιστον 10 χαρακτήρες')
    .max(500, 'Η περιγραφή δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες'),
});

// Keep the original complex schemas for potential future use
export const reportServiceSchema = z.object({
  id: z.string().min(1, 'Το ID της υπηρεσίας είναι υποχρεωτικό'),
  title: z.string().min(1, 'Ο τίτλος της υπηρεσίας είναι υποχρεωτικός'),
});

export const serviceReportSchema = z.object({
  description: z
    .string()
    .min(1, 'Η περιγραφή είναι υποχρεωτική')
    .max(1000, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 1000 χαρακτήρες'),
  currentUrl: z.string().url('Άκυρο URL'),
  reporter: z.object({
    id: z.string().min(1, 'Το ID του αναφέροντα είναι υποχρεωτικό'),
    email: z.string().email('Άκυρο email αναφέροντα').optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
  }),
  reported: z.object({
    id: z.string().min(1, 'Το ID του αναφερόμενου χρήστη είναι υποχρεωτικό'),
    email: z.string().email('Άκυρο email αναφερόμενου χρήστη').optional(),
    displayName: z.string().optional(),
    username: z.string().optional(),
  }),
  service: reportServiceSchema,
});

// =============================================
// MULTI-STEP SERVICE CREATION SCHEMAS
// =============================================

// Use the imported serviceTypeSchema from JSON types
export const serviceTypeConfigSchema = serviceTypeSchema;

// Step 1: Service Type Schema
export const presenceOnlineSchema = z.object({
  type: serviceTypeConfigSchema.refine(
    (data) => {
      return data.presence || data.online;
    },
    {
      message: 'Επιλέξτε τύπο υπηρεσίας',
    },
  ),
});

// Step 2a: Presence Location Schema
export const onbaseOnsiteSchema = z.object({
  type: serviceTypeConfigSchema.refine(
    (data) => {
      if (data.presence) {
        return data.onbase || data.onsite;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τόπο παροχής υπηρεσίας',
    },
  ),
});

// Step 2b: Online Delivery Schema
export const oneoffSubscriptionSchema = z
  .object({
    type: serviceTypeConfigSchema.refine(
      (data) => {
        if (data.online) {
          return data.oneoff || data.subscription;
        }
        return true;
      },
      {
        message: 'Επιλέξτε τύπο παράδοσης για online υπηρεσίες',
      },
    ),
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),
  })
  .refine(
    (data) => {
      // Only require subscription period if subscription type is selected
      if (data.type.subscription) {
        return data.subscriptionType !== undefined;
      }
      return true;
    },
    {
      message: 'Επιλέξτε περίοδο συνδρομής',
      path: ['subscriptionType'],
    },
  );

// Step 3: Service Details Schema
export const serviceDetailsSchema = z
  .object({
    title: z
      .string()
      .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
      .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
    description: z
      .string()
      .refine(
        (val) => stripHtmlTags(val).length >= 80,
        'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
      )
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
      ),
    category: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    subcategory: z.string().min(1, 'Η υποκατηγορία είναι υποχρεωτική'),
    subdivision: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    tags: z
      .array(z.string())
      .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
      .default([]),
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),
    type: serviceTypeConfigSchema.optional(),
  })
  .refine(
    (data) => {
      // Price is required when fixed is true (default state, showing price)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  )
  .refine(
    (data) => {
      // Price must be at least 5€ when fixed is true (showing price)
      if (data.fixed && data.price !== undefined && data.price < 5) {
        return false;
      }
      return true;
    },
    {
      message: 'Η τιμή πρέπει να είναι τουλάχιστον 5€',
      path: ['price'],
    },
  );

// Step 4: Addons and FAQ Schema (optional) - DASHBOARD VERSION
// Uses .refine() for array-level validation (works for dashboard forms)
// Step 4: Addons and FAQ Schema - Dashboard version with field-level validation
// Uses .superRefine() for field-level validation (shows errors on specific fields)
export const addonsAndFaqSchema = z
  .object({
    addons: z
      .array(formServiceAddonSchema)
      .max(3, 'Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες')
      .optional()
      .default([])
      .superRefine((addons, ctx) => {
        if (!addons || addons.length === 0) return;

        // Check for duplicate titles
        const titles = addons.map((addon) => addon.title.toLowerCase().trim());
        const titleIndexMap = new Map<string, number[]>();

        titles.forEach((title, index) => {
          if (!titleIndexMap.has(title)) {
            titleIndexMap.set(title, []);
          }
          titleIndexMap.get(title)!.push(index);
        });

        titleIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
                path: [index, 'title'],
              });
            });
          }
        });

        // Check for duplicate descriptions
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        const descriptionIndexMap = new Map<string, number[]>();

        descriptions.forEach((description, index) => {
          if (!descriptionIndexMap.has(description)) {
            descriptionIndexMap.set(description, []);
          }
          descriptionIndexMap.get(description)!.push(index);
        });

        descriptionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
                path: [index, 'description'],
              });
            });
          }
        });

        // Check that all addon prices are at least 5€
        addons.forEach((addon, index) => {
          if (addon.price < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Η ελάχιστη τιμή είναι 5€',
              path: [index, 'price'],
            });
          }
        });
      }),
    faq: z
      .array(formServiceFaqSchema)
      .max(5, 'Μπορείτε να προσθέσετε έως 5 συχνές ερωτήσεις')
      .optional()
      .default([])
      .superRefine((faqs, ctx) => {
        if (!faqs || faqs.length === 0) return;

        // Check for duplicate questions
        const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
        const questionIndexMap = new Map<string, number[]>();

        questions.forEach((question, index) => {
          if (!questionIndexMap.has(question)) {
            questionIndexMap.set(question, []);
          }
          questionIndexMap.get(question)!.push(index);
        });

        questionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
                path: [index, 'question'],
              });
            });
          }
        });

        // Check for duplicate answers
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        const answerIndexMap = new Map<string, number[]>();

        answers.forEach((answer, index) => {
          if (!answerIndexMap.has(answer)) {
            answerIndexMap.set(answer, []);
          }
          answerIndexMap.get(answer)!.push(index);
        });

        answerIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
                path: [index, 'answer'],
              });
            });
          }
        });
      }),
  })
  .passthrough();

// Step 4: Addons and FAQ Schema (optional) - ADMIN VERSION
// Uses .superRefine() for field-level validation (shows errors on specific fields)
export const adminAddonsAndFaqSchema = z
  .object({
    addons: z
      .array(formServiceAddonSchema)
      .max(3, 'Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες')
      .optional()
      .default([])
      .superRefine((addons, ctx) => {
        if (!addons || addons.length === 0) return;

        // Check for duplicate titles
        const titles = addons.map((addon) => addon.title.toLowerCase().trim());
        const titleIndexMap = new Map<string, number[]>();

        titles.forEach((title, index) => {
          if (!titleIndexMap.has(title)) {
            titleIndexMap.set(title, []);
          }
          titleIndexMap.get(title)!.push(index);
        });

        titleIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
                path: [index, 'title'],
              });
            });
          }
        });

        // Check for duplicate descriptions
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        const descriptionIndexMap = new Map<string, number[]>();

        descriptions.forEach((description, index) => {
          if (!descriptionIndexMap.has(description)) {
            descriptionIndexMap.set(description, []);
          }
          descriptionIndexMap.get(description)!.push(index);
        });

        descriptionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
                path: [index, 'description'],
              });
            });
          }
        });

        // Check that all addon prices are at least 5€
        addons.forEach((addon, index) => {
          if (addon.price < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Η ελάχιστη τιμή είναι 5€',
              path: [index, 'price'],
            });
          }
        });
      }),
    faq: z
      .array(formServiceFaqSchema)
      .max(5, 'Μπορείτε να προσθέσετε έως 5 συχνές ερωτήσεις')
      .optional()
      .default([])
      .superRefine((faqs, ctx) => {
        if (!faqs || faqs.length === 0) return;

        // Check for duplicate questions
        const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
        const questionIndexMap = new Map<string, number[]>();

        questions.forEach((question, index) => {
          if (!questionIndexMap.has(question)) {
            questionIndexMap.set(question, []);
          }
          questionIndexMap.get(question)!.push(index);
        });

        questionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
                path: [index, 'question'],
              });
            });
          }
        });

        // Check for duplicate answers
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        const answerIndexMap = new Map<string, number[]>();

        answers.forEach((answer, index) => {
          if (!answerIndexMap.has(answer)) {
            answerIndexMap.set(answer, []);
          }
          answerIndexMap.get(answer)!.push(index);
        });

        answerIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
                path: [index, 'answer'],
              });
            });
          }
        });
      }),
  })
  .passthrough();

// Admin Service Validation Schema - For real-time field-level validation in forms
// Uses .superRefine() for field-level validation on addons/FAQ (shows errors on specific fields)
// Note: For admin form submission, use adminCreateServiceSchema from admin.ts which adds profileId
export const adminServiceValidationSchema = z
  .object({
    // Service type configuration (Boolean object matching Prisma schema)
    type: serviceTypeConfigSchema,

    // Subscription period (only for subscription services)
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),

    // Step 3 data
    title: z
      .string()
      .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
      .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
    description: z
      .string()
      .refine(
        (val) => stripHtmlTags(val).length >= 80,
        'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
      )
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
      ),
    category: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    subcategory: z.string().min(1, 'Η υποκατηγορία είναι υποχρεωτική'),
    subdivision: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    tags: z
      .array(z.string())
      .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
      .default([])
      .optional(),
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),

    // Step 4 data - using .superRefine() for field-level validation
    addons: z
      .array(formServiceAddonSchema)
      .optional()
      .superRefine((addons, ctx) => {
        if (!addons || addons.length === 0) return;

        // Check for duplicate titles
        const titles = addons.map((addon) => addon.title.toLowerCase().trim());
        const titleIndexMap = new Map<string, number[]>();

        titles.forEach((title, index) => {
          if (!titleIndexMap.has(title)) {
            titleIndexMap.set(title, []);
          }
          titleIndexMap.get(title)!.push(index);
        });

        titleIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
                path: [index, 'title'],
              });
            });
          }
        });

        // Check for duplicate descriptions
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        const descriptionIndexMap = new Map<string, number[]>();

        descriptions.forEach((description, index) => {
          if (!descriptionIndexMap.has(description)) {
            descriptionIndexMap.set(description, []);
          }
          descriptionIndexMap.get(description)!.push(index);
        });

        descriptionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
                path: [index, 'description'],
              });
            });
          }
        });

        // Check that all addon prices are at least 5€
        addons.forEach((addon, index) => {
          if (addon.price < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Η ελάχιστη τιμή είναι 5€',
              path: [index, 'price'],
            });
          }
        });
      }),
    faq: z
      .array(formServiceFaqSchema)
      .optional()
      .superRefine((faqs, ctx) => {
        if (!faqs || faqs.length === 0) return;

        // Check for duplicate questions
        const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
        const questionIndexMap = new Map<string, number[]>();

        questions.forEach((question, index) => {
          if (!questionIndexMap.has(question)) {
            questionIndexMap.set(question, []);
          }
          questionIndexMap.get(question)!.push(index);
        });

        questionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
                path: [index, 'question'],
              });
            });
          }
        });

        // Check for duplicate answers
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        const answerIndexMap = new Map<string, number[]>();

        answers.forEach((answer, index) => {
          if (!answerIndexMap.has(answer)) {
            answerIndexMap.set(answer, []);
          }
          answerIndexMap.get(answer)!.push(index);
        });

        answerIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
                path: [index, 'answer'],
              });
            });
          }
        });
      }),

    // Step 5 data
    media: z
      .array(cloudinaryResourceSchema)
      .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Validate that at least one service type is selected
      const hasPresence = data.type.presence;
      const hasOnline = data.type.online;
      return hasPresence || hasOnline;
    },
    {
      message: 'Επιλέξτε τουλάχιστον έναν τύπο υπηρεσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate presence service location
      if (data.type.presence) {
        return data.type.onbase || data.type.onsite;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τόπο παροχής για υπηρεσίες φυσικής παρουσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate online service delivery type
      if (data.type.online) {
        return data.type.oneoff || data.type.subscription;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τύπο παράδοσης για online υπηρεσίες',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate subscription period for subscription services
      if (data.type.subscription) {
        return data.subscriptionType !== undefined;
      }
      return true;
    },
    {
      message: 'Επιλέξτε περίοδο συνδρομής',
      path: ['subscriptionType'],
    },
  )
  .refine(
    (data) => {
      // Price is required when fixed is true (default state, showing price)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  )
  .refine(
    (data) => {
      // Price must be at least 5€ when fixed is true (showing price)
      if (data.fixed && data.price !== undefined && data.price < 5) {
        return false;
      }
      return true;
    },
    {
      message: 'Η τιμή πρέπει να είναι τουλάχιστον 5€',
      path: ['price'],
    },
  );

// Step 5: Media Schema (optional)
export const serviceMediaUploadSchema = z.object({
  media: z
    .array(cloudinaryResourceSchema)
    .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία πολυμέσων')
    .nullable()
    .optional(),
});

// Service type configuration object (matches Prisma JSON field)

// Complete Multi-Step Service Creation Schema
export const createServiceSchema = z
  .object({
    // Service type configuration (Boolean object matching Prisma schema)
    type: serviceTypeConfigSchema,

    // Subscription period (only for subscription services)
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),

    // Step 3 data
    title: z
      .string()
      .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
      .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
    description: z
      .string()
      .refine(
        (val) => stripHtmlTags(val).length >= 80,
        'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
      )
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
      ),
    category: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    subcategory: z.string().min(1, 'Η υποκατηγορία είναι υποχρεωτική'),
    subdivision: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    tags: z
      .array(z.string())
      .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
      .default([])
      .optional(),
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),

    // Step 4 data
    addons: z
      .array(formServiceAddonSchema)
      .optional()
      .superRefine((addons, ctx) => {
        if (!addons || addons.length === 0) return;

        // Check for duplicate titles
        const titles = addons.map((addon) => addon.title.toLowerCase().trim());
        const titleIndexMap = new Map<string, number[]>();

        titles.forEach((title, index) => {
          if (!titleIndexMap.has(title)) {
            titleIndexMap.set(title, []);
          }
          titleIndexMap.get(title)!.push(index);
        });

        titleIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
                path: [index, 'title'],
              });
            });
          }
        });

        // Check for duplicate descriptions
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        const descriptionIndexMap = new Map<string, number[]>();

        descriptions.forEach((description, index) => {
          if (!descriptionIndexMap.has(description)) {
            descriptionIndexMap.set(description, []);
          }
          descriptionIndexMap.get(description)!.push(index);
        });

        descriptionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                  'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
                path: [index, 'description'],
              });
            });
          }
        });

        // Check that all addon prices are at least 5€
        addons.forEach((addon, index) => {
          if (addon.price < 5) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Η ελάχιστη τιμή είναι 5€',
              path: [index, 'price'],
            });
          }
        });
      }),
    faq: z
      .array(formServiceFaqSchema)
      .optional()
      .superRefine((faqs, ctx) => {
        if (!faqs || faqs.length === 0) return;

        // Check for duplicate questions
        const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
        const questionIndexMap = new Map<string, number[]>();

        questions.forEach((question, index) => {
          if (!questionIndexMap.has(question)) {
            questionIndexMap.set(question, []);
          }
          questionIndexMap.get(question)!.push(index);
        });

        questionIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
                path: [index, 'question'],
              });
            });
          }
        });

        // Check for duplicate answers
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        const answerIndexMap = new Map<string, number[]>();

        answers.forEach((answer, index) => {
          if (!answerIndexMap.has(answer)) {
            answerIndexMap.set(answer, []);
          }
          answerIndexMap.get(answer)!.push(index);
        });

        answerIndexMap.forEach((indices) => {
          if (indices.length > 1) {
            indices.forEach((index) => {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
                path: [index, 'answer'],
              });
            });
          }
        });
      }),

    // Step 5 data
    media: z
      .array(cloudinaryResourceSchema)
      .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      // Validate that at least one service type is selected
      const hasPresence = data.type.presence;
      const hasOnline = data.type.online;
      return hasPresence || hasOnline;
    },
    {
      message: 'Επιλέξτε τουλάχιστον έναν τύπο υπηρεσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate presence service location
      if (data.type.presence) {
        return data.type.onbase || data.type.onsite;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τόπο παροχής για υπηρεσίες φυσικής παρουσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate online service delivery type
      if (data.type.online) {
        return data.type.oneoff || data.type.subscription;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τύπο παράδοσης για online υπηρεσίες',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate subscription period for subscription services
      if (data.type.subscription) {
        return data.subscriptionType !== undefined;
      }
      return true;
    },
    {
      message: 'Επιλέξτε περίοδο συνδρομής',
      path: ['subscriptionType'],
    },
  )
  .refine(
    (data) => {
      // Price is required when fixed is true (default state, showing price)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  )
  .refine(
    (data) => {
      // Price must be at least 5€ when fixed is true (showing price)
      if (data.fixed && data.price !== undefined && data.price < 5) {
        return false;
      }
      return true;
    },
    {
      message: 'Η τιμή πρέπει να είναι τουλάχιστον 5€',
      path: ['price'],
    },
  );

// Draft Service Schema - All fields optional for saving incomplete work
export const createServiceDraftSchema = z.object({
  // Service type configuration (optional for drafts)
  type: serviceTypeConfigSchema.optional(),

  // Subscription period (optional)
  subscriptionType: z
    .enum(['month', 'year', 'per_case', 'per_hour', 'per_session'])
    .optional(),

  // Basic service info (all optional for drafts)
  title: z
    .string()
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες')
    .optional(),
  description: z
    .string()
    .refine(
      (val) => stripHtmlTags(val).length <= 5000,
      'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
    )
    .optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  subdivision: z.string().optional(),
  tags: z
    .array(z.string())
    .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
    .optional(),
  price: z
    .number()
    .int()
    .min(0, 'Η τιμή δεν μπορεί να είναι αρνητική')
    .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
    .optional(),
  fixed: z.boolean().optional(),
  duration: z
    .number()
    .int()
    .min(1, 'Η διάρκεια πρέπει να είναι τουλάχιστον 1 ημέρα')
    .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
    .optional(),

  // Addons and FAQ (optional) - using draft schemas with relaxed validation
  addons: z
    .array(draftServiceAddonSchema)
    .max(3, 'Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες')
    .optional()
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        const titles = addons.map((addon) => addon.title.toLowerCase().trim());
        return titles.length === new Set(titles).size;
      },
      {
        message: 'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
      },
    )
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        return descriptions.length === new Set(descriptions).size;
      },
      {
        message: 'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
      },
    ),
  faq: z
    .array(draftServiceFaqSchema)
    .max(5, 'Μπορείτε να προσθέσετε έως 5 συχνές ερωτήσεις')
    .optional()
    .refine(
      (faqs) => {
        if (!faqs || faqs.length === 0) return true;
        const questions = faqs.map((faq) => faq.question.toLowerCase().trim());
        return questions.length === new Set(questions).size;
      },
      {
        message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
      },
    )
    .refine(
      (faqs) => {
        if (!faqs || faqs.length === 0) return true;
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        return answers.length === new Set(answers).size;
      },
      {
        message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
      },
    ),

  // Media (optional)
  media: z
    .array(cloudinaryResourceSchema)
    .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία')
    .nullable()
    .optional(),
});

// =============================================
// ADMIN EDIT SCHEMAS (Clean types without coercion)
// =============================================

// Admin edit schemas for forms that edit existing validated data
// These don't need coercion since data is already validated from DB
export const adminEditServiceAddonSchema = z.object({
  title: z
    .string()
    .min(
      5,
      'Ο τίτλος της extra υπηρεσίας πρέπει να είναι τουλάχιστον 5 χαρακτήρες',
    )
    .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
  description: z
    .string()
    .min(
      10,
      'Η περιγραφή της extra υπηρεσίας πρέπει να είναι τουλάχιστον 10 χαρακτήρες',
    )
    .max(500, 'Η περιγραφή δεν μπορεί να ξεπερνά τους 500 χαρακτήρες'),
  price: z
    .number()
    .min(5, 'Η ελάχιστη τιμή είναι 5€')
    .max(5000, 'Η μέγιστη τιμή είναι 5.000€'),
});

export const adminEditServiceAddonsSchema = z.object({
  addons: z
    .array(adminEditServiceAddonSchema)
    .max(3, 'Μπορείτε να προσθέσετε έως 3 extra υπηρεσίες')
    .optional(),
});

export const adminEditServicePricingSchema = z
  .object({
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),
  })
  .refine(
    (data) => {
      // Price is required when fixed is true (default state, showing price)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  );

// =============================================
// TYPE EXPORTS
// =============================================

export type ServiceEditInput = z.infer<typeof serviceEditSchema>;
export type ServiceQueryInput = z.infer<typeof serviceQuerySchema>;
export type ServiceAddonInput = z.infer<typeof formServiceAddonSchema>;
export type ServiceFaqInput = z.infer<typeof formServiceFaqSchema>;
export type ServicePackageInput = z.infer<typeof servicePackageSchema>;
export type ServiceMediaInput = z.infer<typeof serviceMediaSchema>;
export type ServiceReportInput = z.infer<typeof serviceReportSchema>;
export type ReportServiceFormValues = z.infer<typeof reportServiceFormSchema>;

// Multi-step form types
export type ServiceTypeInput = z.infer<typeof presenceOnlineSchema>;
export type PresenceLocationInput = z.infer<typeof onbaseOnsiteSchema>;
export type OnlineDeliveryInput = z.infer<typeof oneoffSubscriptionSchema>;
export type ServiceDetailsInput = z.infer<typeof serviceDetailsSchema>;
export type AddonsAndFaqInput = z.infer<typeof addonsAndFaqSchema>;
export type ServiceMediaUploadInput = z.infer<typeof serviceMediaUploadSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateServiceDraftInput = z.infer<typeof createServiceDraftSchema>;
export type ServiceTypeConfig = z.infer<typeof serviceTypeConfigSchema>;

// =============================================
// SERVICE UPDATE SCHEMAS
// =============================================

// Update service media only
export const updateServiceMediaSchema = z.object({
  media: z
    .array(cloudinaryResourceSchema)
    .max(10, 'Μπορείτε να ανεβάσετε έως 10 αρχεία')
    .nullable()
    .optional(),
});

// Update service info (everything except media)
// Note: Defined independently because .pick()/.omit() cannot be used on schemas with refinements
// All fields are optional for partial updates (cannot use .partial() on schemas with refinements)
export const updateServiceInfoSchema = z
  .object({
    // Service type configuration (Boolean object matching Prisma schema)
    type: serviceTypeConfigSchema.optional(),

    // Subscription period (only for subscription services)
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),

    // Step 3 data
    title: z
      .string()
      .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
      .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες')
      .optional(),
    description: z
      .string()
      .refine(
        (val) => stripHtmlTags(val).length >= 80,
        'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
      )
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
      )
      .optional(),
    category: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική').optional(),
    subcategory: z
      .string()
      .min(1, 'Η υποκατηγορία είναι υποχρεωτική')
      .optional(),
    subdivision: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική').optional(),
    tags: z
      .array(z.string())
      .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
      .default([])
      .optional(),
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean().optional(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),

    // Step 4 data (without field-level refinements for updateServiceInfoSchema)
    addons: z.array(formServiceAddonSchema).optional(),
    faq: z.array(formServiceFaqSchema).optional(),

    // media: explicitly excluded (only in createServiceSchema and updateServiceMediaSchema)
  })
  .refine(
    (data) => {
      // Validate that at least one service type is selected (skip if type not provided)
      if (!data.type) return true;
      const hasPresence = data.type.presence;
      const hasOnline = data.type.online;
      return hasPresence || hasOnline;
    },
    {
      message: 'Επιλέξτε τουλάχιστον έναν τύπο υπηρεσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate presence service location (skip if type not provided)
      if (!data.type) return true;
      if (data.type.presence) {
        return data.type.onbase || data.type.onsite;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τόπο παροχής για υπηρεσίες φυσικής παρουσίας',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate online service delivery type (skip if type not provided)
      if (!data.type) return true;
      if (data.type.online) {
        return data.type.oneoff || data.type.subscription;
      }
      return true;
    },
    {
      message: 'Επιλέξτε τύπο παράδοσης για online υπηρεσίες',
      path: ['type'],
    },
  )
  .refine(
    (data) => {
      // Validate subscription period for subscription services (skip if type not provided)
      if (!data.type) return true;
      if (data.type.subscription) {
        return data.subscriptionType !== undefined;
      }
      return true;
    },
    {
      message: 'Επιλέξτε περίοδο συνδρομής',
      path: ['subscriptionType'],
    },
  )
  .refine(
    (data) => {
      // Price is required when fixed is true (skip if fixed not provided)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  )
  .refine(
    (data) => {
      // Price must be at least 5€ when fixed is true (skip if fixed not provided)
      if (data.fixed && data.price !== undefined && data.price < 5) {
        return false;
      }
      return true;
    },
    {
      message: 'Η τιμή πρέπει να είναι τουλάχιστον 5€',
      path: ['price'],
    },
  );

// =============================================
// ADMIN EDIT SERVICE SCHEMAS (Independent schemas for partial updates)
// NOTE: Defined independently because .pick()/.omit() cannot be used on schemas with refinements in Zod 4.0
// These schemas must stay in sync with createServiceSchema fields and refinements
// =============================================

// Edit service taxonomy (category, subcategory, subdivision, tags)
// Includes relevant schema-level refinements for service type validation
export const editServiceTaxonomySchema = z
  .object({
    category: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    subcategory: z.string().min(1, 'Η υποκατηγορία είναι υποχρεωτική'),
    subdivision: z.string().min(1, 'Η κατηγορία είναι υποχρεωτική'),
    tags: z
      .array(z.string())
      .max(10, 'Μπορείτε να επιλέξετε έως 10 ετικέτες (tags)')
      .default([])
      .optional(),
  })
  .partial();

// Edit service basic info (title, description)
export const editServiceBasicSchema = z
  .object({
    title: z
      .string()
      .min(10, 'Ο τίτλος πρέπει να είναι τουλάχιστον 10 χαρακτήρες')
      .max(100, 'Ο τίτλος δεν μπορεί να ξεπερνά τους 100 χαρακτήρες'),
    description: z
      .string()
      .refine(
        (val) => stripHtmlTags(val).length >= 80,
        'Η περιγραφή πρέπει να είναι τουλάχιστον 80 χαρακτήρες',
      )
      .refine(
        (val) => stripHtmlTags(val).length <= 5000,
        'Η περιγραφή δεν μπορεί να ξεπερνά τους 5000 χαρακτήρες',
      ),
  })
  .partial();

// Edit service pricing (price, fixed, duration, subscriptionType)
// Includes price-related refinements from createServiceSchema
// All fields optional for partial updates (cannot use .partial() on schemas with refinements)
export const editServicePricingSchema = z
  .object({
    price: z
      .number()
      .int()
      .max(10000, 'Η τιμή δεν μπορεί να ξεπερνά τα 10.000€')
      .optional(),
    fixed: z.boolean().optional(),
    duration: z
      .number()
      .int()
      .min(0, 'Η διάρκεια δεν μπορεί να είναι αρνητική')
      .max(365, 'Η διάρκεια δεν μπορεί να ξεπερνά τις 365 ημέρες')
      .optional(),
    subscriptionType: z.nativeEnum(SubscriptionType).optional(),
  })
  .refine(
    (data) => {
      // Price is required when fixed is true (skip if fixed not provided)
      if (data.fixed && (!data.price || data.price === 0)) {
        return false;
      }
      return true;
    },
    {
      message: 'Πληκτρολογήστε τιμή',
      path: ['price'],
    },
  )
  .refine(
    (data) => {
      // Price must be at least 5€ when fixed is true (skip if fixed not provided)
      if (data.fixed && data.price !== undefined && data.price < 5) {
        return false;
      }
      return true;
    },
    {
      message: 'Η τιμή πρέπει να είναι τουλάχιστον 5€',
      path: ['price'],
    },
  );

// Edit service addons
// Includes all addon-specific refinements from createServiceSchema
// Field is already optional (cannot use .partial() on schemas with refinements)
export const editServiceAddonsSchema = z.object({
  addons: z
    .array(formServiceAddonSchema)
    .optional()
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        const titles = addons.map((addon) =>
          addon.title.toLowerCase().trim(),
        );
        return titles.length === new Set(titles).size;
      },
      {
        message: 'Οι τίτλοι των extra υπηρεσιών πρέπει να είναι μοναδικοί',
      },
    )
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        const descriptions = addons.map((addon) =>
          addon.description.toLowerCase().trim(),
        );
        return descriptions.length === new Set(descriptions).size;
      },
      {
        message:
          'Οι περιγραφές των extra υπηρεσιών πρέπει να είναι μοναδικές',
      },
    )
    .refine(
      (addons) => {
        if (!addons || addons.length === 0) return true;
        return addons.every((addon) => addon.price >= 5);
      },
      {
        message: 'Η ελάχιστη τιμή για κάθε extra υπηρεσία είναι 5€',
      },
    ),
});

// Edit service FAQ
// Includes all FAQ-specific refinements from createServiceSchema
// Field is already optional (cannot use .partial() on schemas with refinements)
export const editServiceFaqSchema = z.object({
  faq: z
    .array(formServiceFaqSchema)
    .optional()
    .refine(
      (faqs) => {
        if (!faqs || faqs.length === 0) return true;
        const questions = faqs.map((faq) =>
          faq.question.toLowerCase().trim(),
        );
        return questions.length === new Set(questions).size;
      },
      {
        message: 'Οι ερωτήσεις πρέπει να είναι μοναδικές',
      },
    )
    .refine(
      (faqs) => {
        if (!faqs || faqs.length === 0) return true;
        const answers = faqs.map((faq) => faq.answer.toLowerCase().trim());
        return answers.length === new Set(answers).size;
      },
      {
        message: 'Οι απαντήσεις πρέπει να είναι μοναδικές',
      },
    ),
});

// Edit service settings (admin only - status and featured)
export const editServiceSettingsSchema = z
  .object({
    status: z
      .enum([
        'draft',
        'pending',
        'published',
        'rejected',
        'approved',
        'inactive',
      ])
      .optional(),
    featured: z.boolean().optional(),
  })
  .partial();

export type UpdateServiceMediaInput = z.infer<typeof updateServiceMediaSchema>;
export type UpdateServiceInfoInput = z.infer<typeof updateServiceInfoSchema>;
export type EditServiceTaxonomyInput = z.infer<
  typeof editServiceTaxonomySchema
>;
export type EditServiceBasicInput = z.infer<typeof editServiceBasicSchema>;
export type EditServicePricingInput = z.infer<typeof editServicePricingSchema>;
export type EditServiceAddonsInput = z.infer<typeof editServiceAddonsSchema>;
export type EditServiceFaqInput = z.infer<typeof editServiceFaqSchema>;
export type EditServiceSettingsInput = z.infer<
  typeof editServiceSettingsSchema
>;

// =============================================
// DELETE SERVICE SCHEMA
// =============================================

export const deleteServiceSchema = z.object({
  serviceId: z.number().int().min(1, 'Service ID is required'),
});

export type DeleteServiceInput = z.infer<typeof deleteServiceSchema>;
