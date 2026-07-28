'use server';

import { api } from '@/lib/api/client';
import { ApiError } from '@/lib/api/client';
import type { ActionResult } from '@/lib/types/api';

export interface AdminNotification {
  id: string;
  type: 'user' | 'taxonomy' | 'verification' | 'service' | 'report';
  title: string;
  message: string;
  createdAt: string | null;
  time: string;
  priority: 'low' | 'medium' | 'high';
  status: 'unread' | 'read';
  href?: string;
}

export interface AdminNotificationsBundle {
  notifications: AdminNotification[];
  total: number;
  unread: number;
  highPriority: number;
}

export async function getAdminNotifications(): Promise<ActionResult<AdminNotificationsBundle>> {
  try {
    const data = (await api.get('/admin/notifications')) as AdminNotificationsBundle;
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof ApiError ? err.message : 'Σφάλμα δικτύου',
    };
  }
}
