'use client';

import React, { useState, useRef, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

import FormButton from '@/components/shared/button-form';
import { Form } from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
// Progress component removed
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Icons
import {
  Check,
  MapPin,
  Globe,
  Building,
  Home,
  RotateCcw,
  Save,
} from 'lucide-react';

// Auth and utilities
import { populateFormData } from '@/lib/utils/form';
import { useToast } from '@/lib/hooks/ui/use-toast';

// Validation schemas
import {
  createServiceSchema,
  presenceOnlineSchema,
  onbaseOnsiteSchema,
  oneoffSubscriptionSchema,
  serviceDetailsSchema,
  addonsAndFaqSchema,
  serviceMediaUploadSchema,
  type CreateServiceInput,
} from '@/lib/validations/service';

// Server actions
import {
  createServiceAction,
  saveServiceAsDraftAction,
} from '@/actions/services/create-service';

// Step components
import {
  PresenceOnlineStep,
  OnsiteOnbaseStep,
  OneoffSubscriptionStep,
  ServiceDetailsStep,
  AddonsFaqStep,
  MediaStep,
} from './steps';
import { AuthUser } from '@/lib/types/auth';
import { Profile } from '@/lib/prisma-types';
import type { DatasetItem } from '@/lib/types/datasets';

const STEPS = [
  {
    id: 1,
    title: 'Τύπος υπηρεσίας',
    description:
      'Η συγκεκριμένη υπηρεσία παρέχεται με την φυσική σας παρουσία ή online (απομακρυσμένα);',
  },
  {
    id: 2,
    title: 'Τρόπος παροχής',
    description: 'Με ποιον τρόπο παρέχεται η συγκεκριμένη υπηρεσία;',
  },
  {
    id: 3,
    title: 'Στοιχεία υπηρεσίας',
    description: 'Συμπληρώστε τα βασικά στοιχεία της υπηρεσίας',
  },
  {
    id: 4,
    title: 'Extra υπηρεσίες & FAQ',
    description: 'Προσθέστε extra υπηρεσίες και συχνές ερωτήσεις (προαιρετικό)',
  },
  {
    id: 5,
    title: 'Πολυμέσα',
    description: 'Ανεβάστε εικόνες ή βίντεο για την υπηρεσία σας (προαιρετικό)',
  },
];

// Step validation schemas
const STEP_SCHEMAS = {
  1: presenceOnlineSchema,
  2: onbaseOnsiteSchema.or(oneoffSubscriptionSchema),
  3: serviceDetailsSchema,
  4: addonsAndFaqSchema,
  5: serviceMediaUploadSchema,
} as const;

interface PendingTagItem {
  pendingId: string;
  label: string;
}

interface CreateServiceFormProps {
  initialUser: AuthUser | null;
  initialProfile: Profile | null; // Profile type with coverage data
  serviceTaxonomies: DatasetItem[];
  allSubdivisions: Array<{
    id: string;
    label: string;
    subdivision: any;
    subcategory: any;
    category: any;
  }>;
  availableTags: Array<{ value: string; label: string }>;
  pendingTags?: PendingTagItem[];
}

// Create context to pass taxonomy data to step components
export const TaxonomyDataContext = React.createContext<{
  serviceTaxonomies: DatasetItem[];
  allSubdivisions: Array<{
    id: string;
    label: string;
    subdivision: any;
    subcategory: any;
    category: any;
  }>;
  availableTags: Array<{ value: string; label: string }>;
  pendingTagIds: Set<string>;
} | null>(null);

export default function CreateServiceForm({
  initialUser,
  initialProfile,
  serviceTaxonomies,
  allSubdivisions,
  availableTags,
  pendingTags = [],
}: CreateServiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Alert dialog states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Media upload ref
  const mediaRef = useRef<any>(null);

  // Loading state for async preparation phase
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false);

  // Loading state to show overlay during redirect
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Transition for calling server actions properly
  const [, startTransition] = useTransition();

  // React Hook Form setup with zodResolver like other forms
  const form = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    mode: 'onChange',
    defaultValues: {
      type: {
        presence: false,
        online: false,
        oneoff: false,
        onbase: false,
        subscription: false,
        onsite: false,
      },
      subscriptionType: undefined,
      title: '',
      description: '',
      category: '',
      subcategory: '',
      subdivision: '',
      tags: [],
      price: 0,
      fixed: true,
      duration: undefined,
      addons: [],
      faq: [],
      media: [],
    },
  });

  // Server action state management - controlled manually for better success handling
  const [isPending, setIsPending] = useState(false);
  const [isDraftPending, setIsDraftPending] = useState(false);

  // Handle service creation
  const handleServiceSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      const result = await createServiceAction(null, formData);

      if (result.success && result.serviceId && result.serviceTitle) {
        // Success! Show toast and set redirecting state
        toast.success(
          result.message || 'Η υπηρεσία υποβλήθηκε για έγκριση επιτυχώς!',
        );

        // Set redirecting state to show loading overlay
        setIsRedirecting(true);

        // Small delay to ensure toast is visible
        setTimeout(() => {
          // Redirect to success page with service info
          const params = new URLSearchParams({
            id: result.serviceId.toString(),
            title: result.serviceTitle,
          });
          router.push(
            `/dashboard/services/create/success?${params.toString()}`,
          );
        }, 500);
      } else if (result.message) {
        // Error
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Σφάλμα κατά την υποβολή της υπηρεσίας');
    } finally {
      setIsPending(false);
    }
  };

  // Handle draft save
  const handleDraftSubmit = async (formData: FormData) => {
    setIsDraftPending(true);
    try {
      const result = await saveServiceAsDraftAction(null, formData);

      if (result.success && result.message) {
        toast.success('Η υπηρεσία αποθηκεύτηκε επιτυχώς!');
        setTimeout(() => {
          setShowDraftDialog(false);
          form.reset();
          setCurrentStep(1);
          setCompletedSteps([]);
        }, 1500);
      } else if (result.message) {
        toast.error(result.message);
        setTimeout(() => {
          setShowDraftDialog(false);
        }, 1000);
      }
    } catch (error) {
      toast.error('Σφάλμα κατά την αποθήκευση του προσχεδίου');
      setShowDraftDialog(false);
    } finally {
      setIsDraftPending(false);
    }
  };

  // Use initialUser prop
  const user = initialUser;
  const isLoading = false; // No loading state needed since user is passed as prop

  const { getValues, watch } = form;

  const { coverage } = initialProfile || {};

  // Calculate disabled options based on coverage
  const disabledOptions = {
    // Step 1: presence/online options
    presence: !coverage?.onsite && !coverage?.onbase, // Disable presence if both onsite and onbase are false
    online: !coverage?.online, // Disable online if coverage.online is false

    // Step 2a: onsite/onbase options (for presence services)
    onsite: !coverage?.onsite, // Disable onsite if coverage.onsite is false
    onbase: !coverage?.onbase, // Disable onbase if coverage.onbase is false
  };

  // Step navigation helpers
  const isStepCompleted = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  // Watch form values for reactive button state
  const watchedType = watch('type');
  const watchedSubscriptionType = watch('subscriptionType');
  const watchedTitle = watch('title');

  // Check if current step is valid and ready to proceed
  const isCurrentStepValid = (): boolean => {
    const type = watchedType || getValues('type');
    const subscriptionType =
      watchedSubscriptionType || getValues('subscriptionType');

    switch (currentStep) {
      case 1:
        return type.presence || type.online;

      case 2:
        if (type.presence) {
          return type.onbase || type.onsite;
        }
        if (type.online) {
          if (type.subscription) {
            return subscriptionType !== undefined;
          }
          return type.oneoff || type.subscription;
        }
        return false;

      case 3:
        const formValues = getValues();
        const isPriceValid = formValues.fixed
          ? formValues.price && formValues.price > 0
          : true;

        return !!(
          formValues.title &&
          formValues.title.length >= 10 &&
          formValues.description &&
          formValues.description.length >= 80 &&
          formValues.category &&
          formValues.subcategory &&
          formValues.subdivision &&
          isPriceValid
        );

      case 4:
      case 5:
        // Steps 4 and 5 are optional
        return true;

      default:
        return false;
    }
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    // For step 4, validate addons and faq if they have content
    if (currentStep === 4) {
      const formValues = getValues();
      const hasAddons = formValues.addons && formValues.addons.length > 0;
      const hasFaq = formValues.faq && formValues.faq.length > 0;

      // If no content, allow progression
      if (!hasAddons && !hasFaq) {
        return true;
      }

      // Validate using React Hook Form trigger to ensure field-level validation
      const isValid = await form.trigger(['addons', 'faq']);

      if (!isValid) {
        return false;
      }

      // Additional schema validation
      try {
        const stepSchema =
          STEP_SCHEMAS[currentStep as keyof typeof STEP_SCHEMAS];
        stepSchema.parse(formValues);
        return true;
      } catch (error) {
        return false;
      }
    }

    // For step 5 (media), always allow progression
    if (currentStep === 5) {
      return true;
    }

    // For other steps, validate using schema
    const stepSchema = STEP_SCHEMAS[currentStep as keyof typeof STEP_SCHEMAS];
    const formValues = getValues();

    try {
      stepSchema.parse(formValues);
      form.clearErrors();
      return true;
    } catch (error: any) {
      if (error.errors) {
        error.errors.forEach((err: any) => {
          const fieldPath = err.path.join('.');
          form.setError(fieldPath as any, {
            type: 'validation',
            message: err.message,
          });
        });
      }
      return false;
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  };

  const goNext = async () => {
    const isValid = await validateCurrentStep();

    if (isValid) {
      const { type, subscriptionType } = getValues();

      // Handle specific logic for subscription type
      if (
        currentStep === 2 &&
        type.subscription &&
        (!subscriptionType || subscriptionType.length === 0)
      ) {
        form.setError('subscriptionType', {
          type: 'manual',
          message: 'Please select at least one subscription type.',
        });
        return;
      }

      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps((prev) => [...prev, currentStep].sort());
      }

      // Implement conditional step logic
      let nextStep = currentStep + 1;

      if (currentStep === 1) {
        // Step 1 -> Step 2: Only if type.presence OR type.online is true
        if (!type.presence && !type.online) {
          return;
        }
        nextStep = 2;
      } else if (currentStep === 2) {
        // Step 2 -> Step 3: Check if ready to proceed
        if (type.presence && (type.onbase || type.onsite)) {
          nextStep = 3;
        } else if (type.online && (type.oneoff || type.subscription)) {
          // For subscription, ensure subscriptionType is selected
          if (type.subscription && !subscriptionType) {
            return;
          }
          nextStep = 3;
        } else {
          return;
        }
      }

      if (nextStep <= STEPS.length) {
        setCurrentStep(nextStep);
      }
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get step 2 component based on step 1 selection
  const getStep2Component = () => {
    const typeValues = watch('type');
    if (typeValues?.presence) {
      return <OnsiteOnbaseStep disabledOptions={disabledOptions} />;
    }
    if (typeValues?.online) {
      return <OneoffSubscriptionStep />;
    }
    // If neither is selected, show a message or default component
    return (
      <div className='text-center text-gray-500'>
        Please select a service type in step 1
      </div>
    );
  };

  const currentStepInfo = STEPS.find((step) => step.id === currentStep);
  const isLastStep = currentStep === 5; // Step 5 is the last actionable step

  // Form submission handler - prepare data but don't call action
  const prepareFormData = async () => {
    // Handle media uploads if needed (async operation - wait for completion)
    if (mediaRef.current?.hasFiles()) {
      await mediaRef.current.uploadFiles();
    }

    // Get all form values and populate FormData using ENHANCED utility
    const allValues = getValues();

    const formData = new FormData();
    populateFormData(formData, allValues, {
      stringFields: [
        'title',
        'description',
        'category',
        'subcategory',
        'subdivision',
        'subscriptionType',
      ],
      jsonFields: ['type', 'tags', 'addons', 'faq', 'media'],
      numericFields: ['price', 'duration'],
      booleanFields: ['fixed'],
      skipEmpty: true,
    });

    return formData;
  };

  const prepareDraftData = async () => {
    // Handle media uploads if needed (async operation - wait for completion)
    if (mediaRef.current?.hasFiles()) {
      await mediaRef.current.uploadFiles();
    }

    // Get all form values and populate FormData using ENHANCED utility
    const allValues = getValues();

    const formData = new FormData();
    populateFormData(formData, allValues, {
      stringFields: [
        'title',
        'description',
        'category',
        'subcategory',
        'subdivision',
        'subscriptionType',
      ],
      jsonFields: ['type', 'tags', 'addons', 'faq', 'media'],
      numericFields: ['price', 'duration'],
      booleanFields: ['fixed'],
      skipEmpty: true,
    });

    return formData;
  };

  const handleClearForm = () => {
    form.reset();
    setCurrentStep(1);
    setCompletedSteps([]);
    setShowResetDialog(false);

    // Clear any media uploads if needed
    if (mediaRef.current?.clearFiles) {
      mediaRef.current.clearFiles();
    }
  };

  const handleConfirmDraft = async () => {
    // Keep dialog open, start the save process
    const formData = await prepareDraftData();
    await handleDraftSubmit(formData);
  };

  // No useEffect needed anymore - everything is handled directly in the submit handlers!

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Φόρτωση...</p>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    // Show loading state when form is being submitted or preparing
    if (currentStep === 5 && (isPending || isPreparingSubmit)) {
      return (
        <div className='flex flex-col items-center justify-center py-12 space-y-4 w-full'>
          <div className='animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent'></div>
          <p className='text-lg font-medium text-gray-700'>
            {isPreparingSubmit
              ? 'Μεταφόρτωση πολυμέσων...'
              : 'Δημιουργία υπηρεσίας...'}
          </p>
          <p className='text-sm text-gray-500'>Παρακαλώ περιμένετε</p>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return <PresenceOnlineStep disabledOptions={disabledOptions} />;
      case 2:
        return getStep2Component();
      case 3:
        return <ServiceDetailsStep />;
      case 4:
        return <AddonsFaqStep />;
      case 5:
        return (
          <MediaStep username={initialProfile.username} mediaRef={mediaRef} />
        );
      default:
        return null;
    }
  };

  // Merge pending tags into available tags and compute pending IDs set
  const pendingTagIds = React.useMemo(
    () => new Set(pendingTags.map((p) => p.pendingId)),
    [pendingTags],
  );

  const availableTagsWithPending = React.useMemo(() => {
    const pendingAsOptions = pendingTags.map((p) => ({
      value: p.pendingId,
      label: p.label,
    }));
    return [...availableTags, ...pendingAsOptions];
  }, [availableTags, pendingTags]);

  return (
    <TaxonomyDataContext.Provider
      value={{
        serviceTaxonomies,
        allSubdivisions,
        availableTags: availableTagsWithPending,
        pendingTagIds,
      }}
    >
      <Form {...form}>
        <div className='max-w-5xl w-full mx-auto space-y-6 p-2 pr-0'>
        {/* Progress Header */}
        <div className='w-full mb-8'>
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                Δημιουργία Υπηρεσίας
              </h1>
              <p className='text-gray-600 mt-1'>
                Από αυτήν τη φόρμα μπορείτε να προσθέσετε κάθε υπηρεσία που
                προσφέρετε.
              </p>
            </div>
            <div className='flex items-center space-x-3'>
              {/* Action Icons */}
              <div className='flex items-center space-x-2'>
                {/* Clear Form Button */}
                <AlertDialog
                  open={showResetDialog}
                  onOpenChange={setShowResetDialog}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                          disabled={isLoading}
                        >
                          <RotateCcw className='h-4 w-4' />
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Καθαρισμός φόρμας</p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Καθαρισμός φόρμας</AlertDialogTitle>
                      <AlertDialogDescription>
                        Θέλετε να σβηστούν όλα τα δεδομένα της φόρμας που
                        συμπληρώσατε;
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearForm}
                        className='bg-red-600 hover:bg-red-700'
                      >
                        Καθαρισμός
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Save as Draft Button */}
                <AlertDialog
                  open={showDraftDialog}
                  onOpenChange={setShowDraftDialog}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className={`h-8 w-8 p-0 ${
                            currentStep === 3 &&
                            watchedTitle &&
                            watchedTitle.length >= 10
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          disabled={
                            currentStep !== 3 ||
                            !watchedTitle ||
                            watchedTitle.length < 10 ||
                            isDraftPending ||
                            isLoading
                          }
                        >
                          {isDraftPending ? (
                            <div className='animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full' />
                          ) : (
                            <Save className='h-4 w-4' />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {currentStep === 3 &&
                        watchedTitle &&
                        watchedTitle.length >= 10
                          ? 'Αποθήκευση ως προσχέδιο'
                          : 'Διαθέσιμο στο βήμα 3 μετά τη συμπλήρωση τίτλου'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Αποθήκευση ως προσχέδιο
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Θέλετε να αποθηκεύσετε την υπηρεσία ως προσχέδιο;
                        Μπορείτε να την επεξεργαστείτε αργότερα.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDraftPending}>
                        Ακύρωση
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={(e) => {
                          e.preventDefault();
                          handleConfirmDraft();
                        }}
                        disabled={isDraftPending}
                        className='bg-green-600 hover:bg-green-700 disabled:opacity-50'
                      >
                        {isDraftPending ? (
                          <>
                            <div className='animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2' />
                            Αποθήκευση...
                          </>
                        ) : (
                          'Αποθήκευση'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Removed step badge */}
            </div>
          </div>

          {/* Progress Bar removed */}

          {/* Steps Navigation */}
          <div className='relative overflow-x-clip mt-6'>
            <nav className='overflow-x-auto scrollbar-hide'>
              <div className='flex flex-nowrap gap-2'>
                {STEPS.map((step) => {
                  const isActive = currentStep === step.id;
                  const isCompleted = isStepCompleted(step.id);
                  const isAccessible =
                    step.id <= currentStep || isStepCompleted(step.id);

                  return (
                    <div
                      key={step.id}
                      className={`flex-1 flex-shrink-0 flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-primary/10 border-2 border-primary/30'
                          : isCompleted
                            ? 'bg-secondary/10 border-2 border-secondary/30'
                            : 'bg-muted border-2 border-border'
                      } ${!isAccessible ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (isAccessible) {
                          goToStep(step.id);
                        }
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : isCompleted
                              ? 'bg-secondary text-secondary-foreground'
                              : 'bg-muted-foreground text-muted'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className='w-3 h-3' />
                        ) : (
                          <span>{step.id}</span>
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div
                          className={`text-xs font-medium truncate ${
                            isActive
                              ? 'text-primary'
                              : isCompleted
                                ? 'text-secondary'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {step.title}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </nav>
            {/* Fade overlay on right edge - only on small screens */}
            <div className='absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-silver via-silver/60 to-transparent pointer-events-none lg:hidden' />
          </div>
        </div>

        {/* Current Step Content */}
        <Card className='relative bg-sidebar'>
          {!(currentStep === 5 && (isPending || isPreparingSubmit)) && (
            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                {currentStep === 1 && <Globe className='w-5 h-5' />}
                {currentStep === 2 && watch('type')?.presence && (
                  <MapPin className='w-5 h-5' />
                )}
                {currentStep === 2 && watch('type')?.online && (
                  <Globe className='w-5 h-5' />
                )}
                {currentStep === 3 && <Building className='w-5 h-5' />}
                {(currentStep === 4 || currentStep === 5) && (
                  <Home className='w-5 h-5' />
                )}
                <span>{currentStepInfo?.title}</span>
              </CardTitle>
              <CardDescription>{currentStepInfo?.description}</CardDescription>
            </CardHeader>
          )}
          <CardContent>
            {/* Loading overlay when redirecting */}
            {isRedirecting && (
              <div className='absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'>
                <div className='text-center space-y-3'>
                  <div className='w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto'></div>
                  <p className='text-sm text-gray-600'>
                    Ανακατεύθυνση στη σελίδα ολοκλήρωσης...
                  </p>
                </div>
              </div>
            )}

            <div className='transition-all duration-500 ease-in-out'>
              <div className='animate-in fade-in slide-in-from-right-4 duration-300'>
                <div className='space-y-6'>
                  {renderStepContent()}
                  {/* Step Navigation - Hide on loading state */}
                  {!(currentStep === 5 && (isPending || isPreparingSubmit)) && (
                    <div className='flex justify-between items-center mt-6 pt-6 border-t'>
                      <FormButton
                        type='button'
                        variant='outline'
                        text='Προηγουμένο'
                        onClick={goBack}
                        disabled={currentStep === 1}
                      />
                      <div className='flex gap-3'>
                        {isLastStep ? (
                          <FormButton
                            type='button'
                            text='Δημιουργία υπηρεσίας'
                            loading={isPending || isPreparingSubmit}
                            disabled={
                              isPending ||
                              isPreparingSubmit ||
                              !isCurrentStepValid() ||
                              isDraftPending
                            }
                            onClick={async () => {
                              setIsPreparingSubmit(true);
                              try {
                                const formData = await prepareFormData();
                                await handleServiceSubmit(formData);
                              } finally {
                                setIsPreparingSubmit(false);
                              }
                            }}
                          />
                        ) : (
                          <FormButton
                            type='button'
                            text='Επόμενο'
                            onClick={goNext}
                            disabled={isPending || !isCurrentStepValid()}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
    </TaxonomyDataContext.Provider>
  );
}
