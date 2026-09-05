/** Core API — home, health, maintenance. */
import { api } from './client';

export const getHomePageData = () =>
  api.get('/home', { anonymous: true, revalidate: 300, tags: ['page:home'] });

export const getHealth = () => api.get('/health', { anonymous: true });
