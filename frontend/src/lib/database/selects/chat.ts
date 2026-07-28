/**
 * Centralized Prisma SELECT constants for Chat and Message queries
 *
 * These SELECT statements optimize data transfer for real-time messaging features
 * by fetching only required fields for chat lists and message displays.
 *
 * Used in: /dashboard/messages, chat interface
 */

/**
 * Chat list with members, last message, and counts
 * Used for displaying user's chat list with unread indicators
 */
export const CHAT_LIST_SELECT = {
  id: true,
  cid: true,
  name: true,
  published: true,
  createdAt: true,
  updatedAt: true,
  creatorUid: true,
  lastMessageId: true,
  lastActivity: true,
  lastMessage: {
    where: {
      deleted: false,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          firstName: true,
          lastName: true,
          username: true,
          image: true,
        },
      },
    },
  },
  messages: {
    where: {
      deleted: false,
    },
    select: {
      id: true,
    },
    take: 1,
  },
  _count: {
    select: {
      messages: {
        where: {
          deleted: false,
        },
      },
    },
  },
} as const;

/**
 * Message with author and reply-to data
 * Used when creating/sending messages to return full message context
 */
export const MESSAGE_WITH_AUTHOR_INCLUDE = {
  author: {
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      image: true,
    },
  },
  replyTo: {
    include: {
      author: {
        select: {
          displayName: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} as const;
