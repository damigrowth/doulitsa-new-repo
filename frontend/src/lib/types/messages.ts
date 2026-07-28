
import { User } from '@/lib/prisma-types';
import type { MessageReaction } from '@/lib/prisma/json-types';

// Re-export MessageReaction for external use
export type { MessageReaction };

// ============================================================================
// Base messaging models
// ============================================================================
// These mirror the Django messaging tables (apps/messaging/models/chat.py).
// Prisma no longer owns these tables, so the shapes are declared here. Date
// columns arrive over the wire as ISO strings; the server actions coerce them
// to `Date` via `toDate(...)` before building the UI view models below.

/** A conversation between two (or more) users. */
export interface Chat {
  id: string;
  cid: string | null;
  name: string | null;
  published: boolean;
  creatorId: string | null;
  lastMessageId: string | null;
  lastActivity: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Membership/presence row linking a `User` to a `Chat`. */
export interface ChatMember {
  id: string;
  chatId: string;
  userId: string;
  joinedAt: string | Date;
  lastSeen: string | Date;
  muted: boolean;
  online: boolean;
}

/** A single message within a `Chat`. */
export interface Message {
  id: string;
  content: string;
  read: boolean;
  published: boolean;
  chatId: string;
  authorUid: string;
  deleted: boolean;
  deletedAt: string | Date | null;
  deletedBy: string | null;
  edited: boolean;
  editedAt: string | Date | null;
  replyToId: string | null;
  reactions: MessageReaction[] | Record<string, string[]> | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ============================================================================
// Chat Types
// ============================================================================

/**
 * Chat with all necessary relations for displaying in chat list
 */
export type ChatWithRelations = Chat & {
  lastMessage: Message | null;
  members: (ChatMember & {
    user: Pick<User, 'id' | 'displayName' | 'firstName' | 'lastName' | 'image'>;
  })[];
  _count: {
    messages: number;
  };
};

/**
 * Last-message card nested in a chat-list row.
 * Mirrors Django's `_msg_card` (apps/messaging/services/chat_ops.py:413), with
 * date columns coerced to `Date` by `getChats` (actions/messages/chats.ts).
 */
export interface ChatListLastMessage {
  id: string;
  chatId: string;
  authorId: string;
  authorUid: string;
  content: string | null;
  deleted: boolean;
  edited: boolean;
  editedAt: string | Date | null;
  replyToId: string | null;
  reactions: MessageReaction[] | Record<string, string[]> | null;
  read: boolean;
  createdAt: string | Date | null;
}

/**
 * Transformed chat data for UI display in chat list.
 * Matches the Django `list_chats` payload (apps/messaging/services/chat_ops.py:126):
 * the OTHER member's `displayName`/`image` plus OLD-style `name`/`avatar`
 * aliases, the nested `lastMessage` card, and the unread badge count. Date
 * columns are coerced to `Date` by `getChats` (actions/messages/chats.ts).
 */
export interface ChatListItem {
  id: string; // Chat.id
  cid: string | null; // Chat.cid (for URL routing) - nullable during migration
  name: string | null; // Other member's displayName, falling back to Chat.name
  displayName: string | null; // Other member's displayName
  image: string | null; // Other member's image (NEW key)
  avatar: string | null; // Other member's image (OLD key alias)
  username: string | null; // Other member's username
  lastMessage: ChatListLastMessage | null; // Nested last-message card
  lastActivity: string | Date | null; // Chat.lastActivity (ISO string → Date)
  unread: number; // Computed count of unread messages
  unreadCount: number; // Alias of `unread`
  online: boolean; // From ChatMember.online (other member)
  otherUserId: string | null; // User.id of the other participant (NEW key)
  otherMemberId: string | null; // User.id of the other participant (OLD key alias)
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message with all necessary relations for displaying in chat
 */
export type MessageWithRelations = Message & {
  author: Pick<User, 'id' | 'displayName' | 'firstName' | 'lastName' | 'image'>;
  replyTo:
    | (Message & {
        author: Pick<User, 'displayName' | 'firstName' | 'lastName'>;
      })
    | null;
};

/**
 * Transformed message data for UI display in chat messages
 */
export interface ChatMessageItem {
  id: string; // Message.id
  content: string; // Message.content
  createdAt: Date; // Message.createdAt
  edited: boolean; // Message.edited
  editedAt: Date | null; // Message.editedAt
  deleted: boolean; // Message.deleted
  authorUid: string; // Message.authorUid
  isOwn: boolean; // Computed: authorUid === currentUserId
  isRead: boolean; // Computed: message.read or message is own
  replyToId: string | null; // Message.replyToId
  replyTo: {
    // For displaying quoted message
    id: string;
    content: string;
    author: Pick<User, 'displayName' | 'firstName' | 'lastName'> | null;
  } | null;
  reactions: MessageReaction[]; // Transformed reactions for display
  author: Pick<
    User,
    'id' | 'displayName' | 'firstName' | 'lastName' | 'image'
  > | null;
}

// ============================================================================
// User Types for Chat
// ============================================================================

/**
 * Chat participant with presence info
 */
export interface ChatParticipant {
  userId: string; // User.id
  displayName: string | null; // User.displayName
  firstName: string | null; // User.firstName
  lastName: string | null; // User.lastName
  image: string | null; // User.image
  username: string | null; // User.username
  online: boolean; // ChatMember.online
  lastSeen: Date; // ChatMember.lastSeen
}

/**
 * Minimal user info for chat header
 */
export interface ChatHeaderUser {
  userId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  username: string | null;
  online: boolean;
  phone: string | null; // From User.profile.phone
  type: string | null; // User type: 'user' or 'pro'
}
