'use client';

import { useEffect, useRef, useState } from 'react';
import { CloudinaryResource } from '@/lib/types/cloudinary';

interface CloudinaryUploadWidgetProps {
  value: CloudinaryResource | string | null;
  onChange: (resource: CloudinaryResource | null) => void;
  onUploadStart?: () => void;
  onUploadComplete?: () => void;
  folder?: string;
  uploadPreset?: string;
  signed?: boolean;
  signatureEndpoint?: string;
  croppingAspectRatio?: number;
  showSkipCropButton?: boolean;
  maxFileSize?: number;
  minImageWidth?: number;
  minImageHeight?: number;
  className?: string;
  children: (params: {
    open: () => void;
    isLoading: boolean;
    error: string | null;
  }) => React.ReactNode;
}

/**
 * Cloudinary Upload Widget with Cropping Support
 *
 * Provides a professional image upload experience with:
 * - Built-in cropping interface
 * - Face detection and auto-centering
 * - Drag to reposition crop area
 * - Mobile-friendly touch interface
 * - Signed upload support
 */
export function CloudinaryUploadWidget({
  value,
  onChange,
  onUploadStart,
  onUploadComplete,
  folder = 'uploads',
  uploadPreset = 'ml_default',
  signed = true,
  signatureEndpoint = '/api/sign-cloudinary-params',
  croppingAspectRatio = 1, // Square crop by default
  showSkipCropButton = false, // Force cropping for profile images
  maxFileSize = 10000000, // 10MB default
  minImageWidth = 400, // Minimum image width (400x400 for profile images)
  minImageHeight = 400, // Minimum image height (400x400 for profile images)
  className = '',
  children,
}: CloudinaryUploadWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<any>(null);
  const scriptLoaded = useRef(false);
  const originalOverflowRef = useRef<string>('');

  useEffect(() => {
    // Load Cloudinary Upload Widget script
    if (!scriptLoaded.current) {
      const script = document.createElement('script');
      script.src = 'https://upload-widget.cloudinary.com/global/all.js';
      script.async = true;
      script.onload = () => {
        scriptLoaded.current = true;
      };
      document.body.appendChild(script);
    }

    // Cleanup widget on unmount
    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
      }
    };
  }, []);

  /**
   * Restore body overflow to fix scroll blocking issue
   * Cloudinary widget sets body overflow to 'hidden' when open
   * Sometimes fails to restore it properly when destroyed
   */
  const restoreBodyOverflow = () => {
    // Use setTimeout to ensure this runs after Cloudinary's internal cleanup
    setTimeout(() => {
      if (originalOverflowRef.current) {
        document.body.style.overflow = originalOverflowRef.current;
      } else {
        // Fallback: remove overflow restriction entirely
        document.body.style.overflow = '';
      }
    }, 100);
  };

  const createWidget = () => {
    if (!window.cloudinary) {
      setError('Cloudinary script not loaded');
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      setError('Cloudinary configuration missing');
      return;
    }

    // Store original overflow value before widget opens
    if (!originalOverflowRef.current) {
      originalOverflowRef.current = document.body.style.overflow || '';
    }

    // Widget configuration
    const widgetOptions: any = {
      cloudName,
      uploadPreset: signed ? undefined : uploadPreset,
      sources: ['local', 'camera'],
      multiple: false,
      maxFileSize,
      resourceType: 'image',
      clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
      folder,
      // Minimum image dimensions validation
      minImageWidth,
      minImageHeight,
      cropping: true,
      croppingAspectRatio,
      croppingShowDimensions: true,
      croppingCoordinatesMode: 'custom',
      showSkipCropButton,
      croppingDefaultSelectionRatio: 1,
      showAdvancedOptions: false,
      showCompletedButton: true,
      showUploadMoreButton: false,
      // Greek language support
      language: 'el',
      text: {
        el: {
          // Menu items
          menu: {
            files: 'Τα Αρχεία Μου',
            camera: 'Κάμερα',
          },
          // Local file upload
          local: {
            browse: 'Επιλογή Αρχείου',
            dd_title_single: 'Σύρε μια εικόνα εδώ',
            dd_title_multi: 'Σύρε εικόνες εδώ',
            drop_title_single: 'Άφησε το αρχείο για μεταφόρτωση',
            drop_title_multi: 'Άφησε τα αρχεία για μεταφόρτωση',
          },
          // Camera
          camera: {
            capture: 'Λήψη',
            cancel: 'Ακύρωση',
            take_pic: 'Βγάλε μια φωτογραφία',
            explanation:
              'Βεβαιώσου ότι η κάμερα είναι συνδεδεμένη και ότι το πρόγραμμα περιήγησης επιτρέπει τη λήψη φωτογραφιών.',
            camera_error: 'Αποτυχία σύνδεσης με την κάμερα',
            retry: 'Δοκίμασε ξανά',
          },
          // Cropping
          crop: {
            title: 'Περικοπή',
            crop_btn: 'Περικοπή',
            skip_btn: 'Παράλειψη',
            reset_btn: 'Επαναφορά',
            close_btn: 'Ναι',
            close_prompt:
              'Η ακύρωση θα διαγράψει όλες τις μεταφορτώσεις. Είσαι σίγουρος;',
            image_error: 'Σφάλμα φόρτωσης εικόνας',
            corner_tooltip: 'Σύρε τη γωνία για αλλαγή μεγέθους',
            handle_tooltip: 'Σύρε τη γωνία για αλλαγή μεγέθους',
          },
          // Queue / Upload progress
          queue: {
            title: 'Σειρά Μεταφόρτωσης',
            title_uploading_with_counter: 'Μεταφόρτωση {{num}} αρχείων',
            title_processing_with_counter: 'Επεξεργασία {{num}} αρχείων',
            title_uploading: 'Μεταφόρτωση αρχείων',
            title_processing: 'Επεξεργασία αρχείων',
            mini_title: 'Μεταφορτώθηκε',
            mini_title_uploading: 'Μεταφόρτωση',
            mini_title_processing: 'Επεξεργασία',
            done: 'Ολοκληρώθηκε',
            mini_upload_count: '{{num}} μεταφορτώθηκαν',
            statuses: {
              uploading: 'Μεταφόρτωση...',
              processing: 'Επεξεργασία...',
              timeout:
                'Ένα μεγάλο αρχείο μεταφορτώνεται. Μπορεί να πάρει λίγο χρόνο για να εμφανιστεί.',
              error: 'Σφάλμα',
              uploaded: 'Ολοκληρώθηκε',
              aborted: 'Ακυρώθηκε',
            },
            abort_all: 'Ακύρωση όλων',
            upload_more: 'Μεταφόρτωση περισσότερων',
            abort: 'Ακύρωση',
            retry_failed: 'Επανάληψη αποτυχημένων',
            retry: 'Επανάληψη',
          },
          // Notifications
          notifications: {
            general_error: 'Παρουσιάστηκε σφάλμα',
            general_prompt: 'Είσαι σίγουρος;',
            limit_reached: 'Δεν μπορείς να επιλέξεις περισσότερα αρχεία.',
            invalid_add_url: 'Η διεύθυνση URL δεν είναι έγκυρη.',
            invalid_public_id: 'Μη έγκυρο Public ID.',
            no_new_files: 'Τα αρχεία έχουν ήδη μεταφορτωθεί.',
            image_purchased: 'Η εικόνα αγοράστηκε',
            video_purchased: 'Το βίντεο αγοράστηκε',
            purchase_failed: 'Η αγορά απέτυχε. Παρακαλώ δοκίμασε ξανά.',
            service_logged_out: 'Η υπηρεσία αποσυνδέθηκε λόγω σφάλματος',
            great: 'Τέλεια',
            image_converted: 'Εικόνα μετατράπηκε σε {{dest_format}}.',
          },
          // Errors
          errors: {
            max_file_size:
              'Το μέγεθος του αρχείου υπερβαίνει το επιτρεπόμενο όριο ({{size}})',
            allowed_formats: 'Μη αποδεκτός τύπος αρχείου',
            max_number_of_files: 'Υπέρβαση μέγιστου αριθμού αρχείων',
            min_dimensions:
              'Οι διαστάσεις της εικόνας είναι πολύ μικρές. Ελάχιστες διαστάσεις: {{minWidth}}x{{minHeight}}',
            max_dimensions: 'Οι διαστάσεις της εικόνας είναι πολύ μεγάλες',
          },
          // Global actions
          actions: {
            upload: 'Μεταφόρτωση',
            next: 'Επόμενο',
            clear_all: 'Καθαρισμός όλων',
            log_out: 'Αποσύνδεση',
          },
          // Or divider
          or: 'Ή',
          // Back button
          back: 'Πίσω',
          // Close button
          close: 'Κλείσιμο',
          // No assets
          no_assets: 'Δεν υπάρχουν αρχεία',
          // Search
          search: 'Αναζήτηση',
        },
      },
      styles: {
        palette: {
          window: '#FFFFFF',
          windowBorder: '#E5E7EB',
          tabIcon: '#1F4B3F',
          menuIcons: '#6B7280',
          textDark: '#111827',
          textLight: '#FFFFFF',
          link: '#1F4B3F',
          action: '#1F4B3F',
          inactiveTabIcon: '#9CA3AF',
          error: '#EF4444',
          inProgress: '#1F4B3F',
          complete: '#10B981',
          sourceBg: '#F9FAFB',
        },
        fonts: {
          default: null,
          "'Inter', sans-serif": {
            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
            active: true,
          },
        },
      },
    };

    // Add signed upload configuration if enabled
    if (signed) {
      widgetOptions.uploadSignature = async (
        callback: (signature: string) => void,
        paramsToSign: any,
      ) => {
        try {
          const response = await fetch(signatureEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paramsToSign),
          });

          if (!response.ok) {
            throw new Error('Failed to get upload signature');
          }

          const data = await response.json();
          callback(data.signature);
        } catch (error) {
          setError('Failed to authenticate upload');
          console.error('Upload signature error:', error);
        }
      };

      widgetOptions.apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    }

    // Create widget with callback
    widgetRef.current = window.cloudinary.createUploadWidget(
      widgetOptions,
      (error: any, result: any) => {
        if (error) {
          // Check if error is about minimum dimensions - check multiple possible formats
          const errorString = JSON.stringify(error).toLowerCase();
          const errorMessage = error.message || error.statusText || '';

          const isDimensionError =
            errorMessage.includes('minimum required') ||
            errorMessage.includes('image dimensions') ||
            errorString.includes('minimum') ||
            errorString.includes('dimensions') ||
            error.status === 'invalid_dimensions';

          const finalErrorMessage = isDimensionError
            ? `Αποτυχία μεταφόρτωσης εικόνας. Ελάχιστες διαστάσεις: ${minImageWidth}x${minImageHeight} pixels.`
            : errorMessage || 'Αποτυχία μεταφόρτωσης';

          setError(finalErrorMessage);
          setIsLoading(false);
          onUploadComplete?.();
          return;
        }

        // Handle different upload events
        switch (result.event) {
          case 'upload-added':
            // Validate crop dimensions if cropping is enabled
            if (result.info?.coordinates?.custom) {
              const crop = result.info.coordinates.custom[0];
              // Crop format: [x, y, width, height]
              const cropWidth = crop[2];
              const cropHeight = crop[3];

              if (cropWidth < minImageWidth || cropHeight < minImageHeight) {
                setError(
                  `Η διαστάσεις της εικόνας πρέπει να είναι τουλάχιστον ${minImageWidth}x${minImageHeight} pixels`,
                );
                setIsLoading(false);
                onUploadComplete?.();
                // Close widget to force re-selection
                setTimeout(() => {
                  if (widgetRef.current) {
                    widgetRef.current.close();
                  }
                }, 100);
                return;
              }
            }

            setIsLoading(true);
            setError(null);
            onUploadStart?.();
            break;

          case 'success':
            const asset = result.info;

            // Cloudinary applies the incoming transformation (c_crop,g_custom + resize)
            // during upload, so asset.secure_url already contains the final cropped image
            const resource: CloudinaryResource = {
              public_id: asset.public_id,
              secure_url: asset.secure_url,
              url: asset.url,
              width: asset.width,
              height: asset.height,
              resource_type: asset.resource_type,
              format: asset.format,
              bytes: asset.bytes,
              original_filename: asset.original_filename,
            };

            onChange(resource);
            setIsLoading(false);
            onUploadComplete?.();

            // Restore body overflow before destroying widget
            restoreBodyOverflow();

            // Destroy widget after successful upload to ensure fresh state on next upload
            if (widgetRef.current) {
              widgetRef.current.destroy();
              widgetRef.current = null;
            }
            break;

          case 'close':
            setIsLoading(false);
            onUploadComplete?.();

            // Restore body overflow before destroying widget
            restoreBodyOverflow();

            // Destroy widget when closed to allow fresh widget on next attempt
            if (widgetRef.current) {
              widgetRef.current.destroy();
              widgetRef.current = null;
            }
            break;

          case 'abort':
            setIsLoading(false);
            setError('Ακύρωση μεταφόρτωσης');
            onUploadComplete?.();
            break;
        }
      },
    );
  };

  const openWidget = () => {
    if (!widgetRef.current) {
      createWidget();
    }

    if (widgetRef.current) {
      widgetRef.current.open();
    }
  };

  return (
    <div className={className}>
      {children({ open: openWidget, isLoading, error })}
    </div>
  );
}
