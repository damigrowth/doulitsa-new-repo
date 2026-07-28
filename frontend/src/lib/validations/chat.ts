/**
 * CHAT & MESSAGE VALIDATION SCHEMAS
 * Chat and messaging system validation schemas
 */

import { z } from 'zod';
import { paginationSchema, idSchema } from './shared';

// =============================================
// CHAT SCHEMAS
// =============================================

export const createChatSchema = z.object({
  name: z.string().max(100).optional(),
  participantUid: z.string().min(1, 'Participant user ID is required'),
  published: z.boolean().default(true),
});

export const updateChatSchema = z.object({
  name: z.string().max(100).optional(),
  published: z.boolean().optional(),
});

export const chatQuerySchema = z
  .object({
    search: z.string().optional(),
    published: z.boolean().optional(),
  })
  .merge(paginationSchema);

// =============================================
// MESSAGE SCHEMAS
// =============================================

export const createMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(1000),
  chatId: idSchema,
  authorUid: idSchema, // User ID of author
  published: z.boolean().default(true),
});

export const updateMessageSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  published: z.boolean().optional(),
});

export const messageQuerySchema = z
  .object({
    chatId: z.string().optional(),
    authorUid: z.string().optional(),
    read: z.boolean().optional(),
    published: z.boolean().optional(),
    search: z.string().optional(),
  })
  .merge(paginationSchema);

// =============================================
// MESSAGE STATUS SCHEMAS
// =============================================

export const markMessageReadSchema = z.object({
  messageId: idSchema,
  read: z.boolean().default(true),
});

export const markChatReadSchema = z.object({
  chatId: idSchema,
});

export const getUnreadCountSchema = z.object({
  userId: idSchema.optional(),
  chatId: idSchema.optional(),
});

// =============================================
// MESSAGE ATTACHMENT SCHEMAS
// =============================================

export const messageAttachmentSchema = z.object({
  messageId: idSchema,
  type: z.enum(['image', 'file', 'audio', 'video']),
  url: z.string().url('Invalid attachment URL'),
  name: z.string().min(1, 'Attachment name is required'),
  size: z.number().int().min(0).optional(),
  mimeType: z.string().optional(),
});

export const createMessageWithAttachmentsSchema = z.object({
  content: z.string().min(1, 'Message content is required').max(1000),
  chatId: idSchema,
  authorUid: idSchema,
  attachments: z
    .array(messageAttachmentSchema)
    .max(5, 'Maximum 5 attachments per message')
    .optional(),
});

// =============================================
// CHAT PARTICIPANT SCHEMAS
// =============================================

export const addChatParticipantSchema = z.object({
  chatId: idSchema,
  uid: idSchema,
  role: z.enum(['member', 'admin', 'moderator']).default('member'),
});

export const removeChatParticipantSchema = z.object({
  chatId: idSchema,
  uid: idSchema,
});

export const updateChatParticipantSchema = z.object({
  chatId: idSchema,
  uid: idSchema,
  role: z.enum(['member', 'admin', 'moderator']).optional(),
  muted: z.boolean().optional(),
  blocked: z.boolean().optional(),
});

// =============================================
// CHAT SETTINGS SCHEMAS
// =============================================

export const chatSettingsSchema = z.object({
  chatId: idSchema,
  settings: z.object({
    notifications: z.boolean().default(true),
    soundEnabled: z.boolean().default(true),
    theme: z.enum(['light', 'dark', 'auto']).default('auto'),
    fontSize: z.enum(['small', 'medium', 'large']).default('medium'),
  }),
});

export const updateChatSettingsSchema = z.object({
  chatId: idSchema,
  settings: z.object({
    notifications: z.boolean().optional(),
    soundEnabled: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
  }),
});

// =============================================
// CHAT MODERATION SCHEMAS
// =============================================

export const reportChatSchema = z.object({
  chatId: idSchema,
  reason: z.enum([
    'spam',
    'harassment',
    'inappropriate_content',
    'fake_profile',
    'scam',
    'other',
  ]),
  description: z.string().min(10, 'Please provide more details').max(500),
  reporterEmail: z.string().email().optional(),
});

export const blockChatParticipantSchema = z.object({
  chatId: idSchema,
  uid: idSchema,
  reason: z.string().max(200).optional(),
});

// =============================================
// CHAT SEARCH & FILTER SCHEMAS
// =============================================

export const chatSearchSchema = z
  .object({
    query: z.string().min(1, 'Search query is required'),
    chatId: idSchema.optional(), // Search within specific chat
    authorUid: idSchema.optional(), // Search messages from specific author
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    messageType: z.enum(['text', 'image', 'file', 'all']).default('all'),
  })
  .merge(paginationSchema);

// =============================================
// TYPE EXPORTS
// =============================================

export type CreateChatInput = z.infer<typeof createChatSchema>;
export type UpdateChatInput = z.infer<typeof updateChatSchema>;
export type ChatQueryInput = z.infer<typeof chatQuerySchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
export type MessageQueryInput = z.infer<typeof messageQuerySchema>;
export type MarkMessageReadInput = z.infer<typeof markMessageReadSchema>;
export type MarkChatReadInput = z.infer<typeof markChatReadSchema>;
export type GetUnreadCountInput = z.infer<typeof getUnreadCountSchema>;
export type MessageAttachmentInput = z.infer<typeof messageAttachmentSchema>;
export type CreateMessageWithAttachmentsInput = z.infer<
  typeof createMessageWithAttachmentsSchema
>;
export type AddChatParticipantInput = z.infer<typeof addChatParticipantSchema>;
export type RemoveChatParticipantInput = z.infer<
  typeof removeChatParticipantSchema
>;
export type UpdateChatParticipantInput = z.infer<
  typeof updateChatParticipantSchema
>;
export type ChatSettingsInput = z.infer<typeof chatSettingsSchema>;
export type UpdateChatSettingsInput = z.infer<typeof updateChatSettingsSchema>;
export type ReportChatInput = z.infer<typeof reportChatSchema>;
export type BlockChatParticipantInput = z.infer<
  typeof blockChatParticipantSchema
>;
export type ChatSearchInput = z.infer<typeof chatSearchSchema>;
