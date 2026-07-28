// Global type declarations for window object extensions

// Google Analytics gtag function
interface Window {
  gtag?: (
    command: 'config' | 'event' | 'js' | 'set',
    targetId: string | Date,
    config?: {
      event_category?: string;
      event_label?: string;
      event_value?: number;
      [key: string]: any;
    }
  ) => void;
  dataLayer?: any[];
}
