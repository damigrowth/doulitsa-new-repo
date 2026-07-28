import { toast } from 'sonner';

/**
 * A simple hook that wraps Sonner's toast functionality
 * for consistent usage across the application
 */
export const useToast = () => {
  return {
    toast: {
      success: (message: string, options?: Parameters<typeof toast.success>[1]) => 
        toast.success(message, options),
      error: (message: string, options?: Parameters<typeof toast.error>[1]) => 
        toast.error(message, options),
      info: (message: string, options?: Parameters<typeof toast.info>[1]) => 
        toast.info(message, options),
      warning: (message: string, options?: Parameters<typeof toast.warning>[1]) => 
        toast.warning(message, options),
      loading: (message: string, options?: Parameters<typeof toast.loading>[1]) => 
        toast.loading(message, options),
      custom: (jsx: Parameters<typeof toast>[0], options?: Parameters<typeof toast>[1]) => 
        toast(jsx, options),
      dismiss: (id?: string | number) => toast.dismiss(id),
      promise: toast.promise,
    },
  };
};