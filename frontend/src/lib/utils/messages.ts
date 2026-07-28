import {
  ChatWithRelations,
  ChatListItem,
  ChatListLastMessage,
  MessageWithRelations,
  ChatMessageItem,
  MessageReaction,
} from '@/lib/types/messages';
import { formatInitials } from '@/lib/utils/format';
import {
  timeAgo,
  formatMessageTime,
  formatCompactMessageTime,
} from '@/lib/utils/formatting/time';

// ============================================================================
// Chat Transformation Functions
// ============================================================================

/** Coerce an ISO string / Date / null to a `Date` (or null). */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Transform database chat with relations to UI-ready chat list item
 * @param chat - Chat from database with members and lastMessage
 * @param currentUserId - Current user's ID to filter out from members
 * @returns ChatListItem ready for UI display
 */
export function transformChatForList(
  chat: ChatWithRelations,
  currentUserId: string,
): ChatListItem {
  // Find the other member (not current user)
  const otherMember = chat.members.find((m) => m.user.id !== currentUserId);

  // Get display name with Greek fallback for deleted/unavailable users
  let displayName = 'Χρήστης'; // Default for deleted/missing user

  if (otherMember?.user) {
    if (otherMember.user.displayName) {
      displayName = otherMember.user.displayName;
    } else if (otherMember.user.firstName || otherMember.user.lastName) {
      // Fallback to first/last name if no display name
      displayName = [otherMember.user.firstName, otherMember.user.lastName]
        .filter(Boolean)
        .join(' ') || 'Χρήστης';
    } else {
      displayName = 'Χρήστης';
    }
  }

  const image = otherMember?.user.image || null;
  const lastMessage: ChatListLastMessage | null = chat.lastMessage
    ? {
        id: chat.lastMessage.id,
        chatId: chat.lastMessage.chatId,
        authorId: chat.lastMessage.authorUid,
        authorUid: chat.lastMessage.authorUid,
        content: chat.lastMessage.deleted ? null : chat.lastMessage.content,
        deleted: chat.lastMessage.deleted,
        edited: chat.lastMessage.edited,
        editedAt: chat.lastMessage.editedAt,
        replyToId: chat.lastMessage.replyToId,
        reactions: chat.lastMessage.reactions,
        read: chat.lastMessage.read,
        createdAt: chat.lastMessage.createdAt,
      }
    : null;

  return {
    id: chat.id,
    cid: chat.cid,
    name: displayName,
    displayName,
    image,
    avatar: image,
    username: null,
    lastMessage,
    lastActivity: toDate(chat.lastActivity),
    unread: 0, // Will be computed with separate query
    unreadCount: 0,
    online: otherMember?.online || false,
    otherUserId: otherMember?.user.id ?? null,
    otherMemberId: otherMember?.user.id ?? null,
  };
}

// ============================================================================
// Message Transformation Functions
// ============================================================================

/**
 * Transform database message with relations to UI-ready message item
 * @param message - Message from database with author
 * @param currentUserId - Current user's ID to determine ownership and check read status
 * @returns ChatMessageItem ready for UI display
 */
export function transformMessageForChat(
  message: MessageWithRelations,
  currentUserId: string,
): ChatMessageItem {
  // Check if current user has read this message
  // For own messages, always considered read
  // For other users' messages, check the read field
  const isRead = message.authorUid === currentUserId || message.read;

  // Transform reply data if exists
  let replyTo = null;
  if (message.replyTo) {
    const authorName = message.replyTo.author.displayName || 'Unknown';

    replyTo = {
      id: message.replyTo.id,
      content: message.replyTo.content,
      authorName,
      author: message.replyTo.author,
    };
  }

  // Transform reactions from JSON to MessageReaction[]
  const reactions: MessageReaction[] = [];
  if (message.reactions) {
    const reactionsJson = message.reactions as Record<string, string[]>;
    for (const [emoji, userIds] of Object.entries(reactionsJson)) {
      reactions.push({
        emoji,
        userIds,
        count: userIds.length,
        hasReacted: userIds.includes(currentUserId),
      });
    }
  }

  return {
    id: message.id,
    content: message.content,
    createdAt: toDate(message.createdAt) ?? new Date(),
    edited: message.edited,
    editedAt: toDate(message.editedAt),
    deleted: message.deleted,
    authorUid: message.authorUid,
    isOwn: message.authorUid === currentUserId,
    isRead,
    replyToId: message.replyToId,
    replyTo,
    reactions,
    author: message.author,
  };
}

// ============================================================================
// Display Name & Initials
// ============================================================================

/**
 * Get display name from profile (only displayName, not computed)
 * @param profile - Profile object with displayName
 * @returns Display name string
 */
export function getDisplayName(profile: {
  displayName: string | null;
}): string {
  return profile.displayName || 'Χρήστης';
}

/**
 * Get initials for avatar fallback using existing utility
 * @param displayName - Display name
 * @param firstName - First name (fallback)
 * @param lastName - Last name (fallback)
 * @returns Initials (up to 2 characters)
 */
export function getInitials(
  displayName?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  return formatInitials(
    firstName || undefined,
    lastName || undefined,
    displayName || undefined,
  );
}

// ============================================================================
// Profile URL Helper
// ============================================================================

/**
 * Get profile URL from username
 * @param username - User's username
 * @returns Profile URL path
 */
export function getProfileUrl(username: string | null): string {
  if (!username) {
    return '#'; // Fallback if no username
  }
  return `/profile/${username}`;
}

// ============================================================================
// Date/Time Formatting Functions (using existing utils)
// ============================================================================

/**
 * Format timestamp for message bubble (HH:MM format)
 * Uses existing Greek-aware formatting
 */
export { formatMessageTime, formatCompactMessageTime, timeAgo };

/**
 * Format date divider in chat (e.g., "Today", "Yesterday", "15 Ιανουαρίου 2024")
 * @param date - Date object to format
 * @returns Formatted date string in Greek
 */
export function formatChatDateDivider(date: Date | null | undefined): string {
  // Defensive: a message with an unparseable/missing createdAt must not crash
  // the whole chat page.
  if (!date || Number.isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Reset time to midnight for accurate comparison
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const todayOnly = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const yesterdayOnly = new Date(
    yesterday.getFullYear(),
    yesterday.getMonth(),
    yesterday.getDate(),
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Σήμερα';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Χθες';
  } else {
    // Format as "15 Ιανουαρίου 2024" in Greek
    return new Intl.DateTimeFormat('el-GR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
