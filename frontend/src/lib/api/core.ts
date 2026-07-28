/** Core API — home, health, maintenance. */
import { api } from './client';

export const getHomePageData = () => api.get('/home', { anonymous: true });

export const getHealth = () => api.get('/health', { anonymous: true });
