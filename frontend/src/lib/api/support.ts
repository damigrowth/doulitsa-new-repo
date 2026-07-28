/** Support API — contact form + feedback. */
import { api } from './client';

export const submitContact = (body: {
  name: string;
  email: string;
  message: string;
  subject?: string;
  captchaToken?: string;
}) => api.post('/support/contact', body, { anonymous: true });

export const submitFeedback = (body: {
  issueType: 'bug' | 'feature' | 'question' | 'other';
  description: string;
  pageUrl?: string;
}) => api.post('/support/feedback', body);
