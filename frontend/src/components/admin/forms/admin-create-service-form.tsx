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
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Auth and utilities
import { populateFormData } from '@/lib/utils/form';
import { useToast } from '@/lib/hooks/ui/use-toast';

// Validation schemas
import {
  adminServiceValidationSchema,
  presenceOnlineSchema,
  onbaseOnsiteSchema,
  oneoffSubscriptionSchema,
  serviceDetailsSchema,
  adminAddonsAndFaqSchema,
  serviceMediaUploadSchema,
  type CreateServiceInput,
} from '@/lib/validations/service';

// Server actions
import { createServiceForProfile } from '@/actions/admin/services';

// Step components
import {
  PresenceOnlineStep,
  OnsiteOnbaseStep,
  OneoffSubscriptionStep,
  ServiceDetailsStep,
  AddonsFaqStep,
  MediaStep,
} from '@/components/forms/service/steps';
import { TaxonomyDataContext } from '@/components/forms/service/form-service-create';
import { ServerSearchCombobox } from '@/components/ui/server-search-combobox';
import { searchProfilesForServiceCreation } from '@/actions/admin/profiles';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { AdminProfileRow } from '@/lib/types/admin';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Save,
  User,
  Globe,
  MapPin,
  Building,
  Home,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { DatasetItem } from '@/lib/types/datasets';

const STEPS = [
  {
    id: 1,
    title: 'Επιλογή Προφίλ',
    description: 'Επιλέξτε ποιο προφίλ θα είναι ιδιοκτήτης αυτής της υπηρεσίας',
  },
  {
    id: 2,
    title: 'Τύπος υπηρεσίας',
    description:
      'Η συγκεκριμένη υπηρεσία παρέχεται με την φυσική σας παρουσία ή online (απομακρυσμένα);',
  },
  {
    id: 3,
    title: 'Τρόπος παροχής',
    description: 'Με ποιον τρόπο παρέχεται η συγκεκριμένη υπηρεσία;',
  },
  {
    id: 4,
    title: 'Στοιχεία υπηρεσίας',
    description: 'Συμπληρώστε τα βασικά στοιχεία της υπηρεσίας',
  },
  {
    id: 5,
    title: 'Extra υπηρεσίες & FAQ',
    description: 'Προσθέστε extra υπηρεσίες και συχνές ερωτήσεις (προαιρετικό)',
  },
  {
    id: 6,
    title: 'Πολυμέσα',
    description: 'Ανεβάστε εικόνες ή βίντεο για την υπηρεσία σας (προαιρετικό)',
  },
];

// Step-specific validation schemas
const STEP_SCHEMAS = {
  2: presenceOnlineSchema,
  3: onbaseOnsiteSchema.or(oneoffSubscriptionSchema),
  4: serviceDetailsSchema,
  5: adminAddonsAndFaqSchema,
  6: serviceMediaUploadSchema,
} as const;

/**
 * The profile-selection rows returned by the admin "search for services"
 * endpoint (`_admin_profile_row`). `coverage` is only present on the
 * profile-detail payload, so it is optional here.
 */
type SelectedProfile = AdminProfileRow & {
  coverage?: AppJson.Coverage | null;
};

interface AdminCreateServiceFormProps {
  serviceTaxonomies: DatasetItem[];
  allSubdivisions: Array<{
    id: string;
    label: string;
    subdivision: any;
    subcategory: any;
    category: any;
  }>;
  availableTags: Array<{ value: string; label: string }>;
}

export function AdminCreateServiceForm({
  serviceTaxonomies,
  allSubdivisions,
  availableTags,
}: AdminCreateServiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile | null>(null);

  // Alert dialog states
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Media upload ref
  const mediaRef = useRef<any>(null);

  // Loading states - separated for better UX control
  const [isPreparingSubmit, setIsPreparingSubmit] = useState(false); // Preparing FormData
  const [isPending, setIsPending] = useState(false); // Server action executing
  const [isDraftPending, setIsDraftPending] = useState(false); // Draft save executing
  const [isRedirecting, setIsRedirecting] = useState(false); // Success redirect
  const [, startTransition] = useTransition();

  // Initialize form with react-hook-form and zod
  const form = useForm<CreateServiceInput>({
    resolver: zodResolver(adminServiceValidationSchema),
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
      title: '',
      description: '',
      category: '',
      subcategory: '',
      subdivision: '',
      fixed: true,
      price: 0,
      duration: 0,
      tags: [],
      addons: [],
      faq: [],
      media: [],
    },
  });

  // Watch form values for reactive validation
  const { watch, getValues } = form;
  const watchedType = watch('type');
  const watchedSubscriptionType = watch('subscriptionType');
  const watchedTitle = watch('title');
  const watchedCategory = watch('category');
  const watchedSubcategory = watch('subcategory');
  const watchedSubdivision = watch('subdivision');
  const watchedPrice = watch('price');
  const watchedFixed = watch('fixed');

  // Extract coverage from selected profile
  const coverage = selectedProfile?.coverage as AppJson.Coverage | undefined;

  // Calculate disabled options based on coverage (same logic as dashboard form)
  const disabledOptions = {
    // Step 2: presence/online options
    presence: !coverage?.onsite && !coverage?.onbase, // Disable presence if both onsite and onbase are false
    online: !coverage?.online, // Disable online if coverage.online is false

    // Step 3: onsite/onbase options (for presence services)
    onsite: !coverage?.onsite, // Disable onsite if coverage.onsite is false
    onbase: !coverage?.onbase, // Disable onbase if coverage.onbase is false
  };

  // Check if current step is valid and ready to proceed
  const isCurrentStepValid = (): boolean => {
    const type = watchedType || getValues('type');
    const subscriptionType =
      watchedSubscriptionType || getValues('subscriptionType');

    switch (currentStep) {
      case 1:
        return !!selectedProfile;

      case 2:
        return type.presence || type.online;

      case 3:
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

      case 4:
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

      case 5:
      case 6:
        // Steps 5 and 6 are optional
        return true;

      default:
        return false;
    }
  };

  // Smart validation for optional steps (dashboard pattern)
  const validateCurrentStep = async (): Promise<boolean> => {
    // Step 1: Profile selection
    if (currentStep === 1) {
      if (!selectedProfile) {
        toast.error('Παρακαλώ επιλέξτε ένα προφίλ για να συνεχίσετε');
        return false;
      }
      return true;
    }

    // Step 5: Addons & FAQ - only validate if user added content
    if (currentStep === 5) {
      const formValues = getValues();
      const hasAddons = formValues.addons && formValues.addons.length > 0;
      const hasFaq = formValues.faq && formValues.faq.length > 0;

      // If no content, allow progression (it's optional)
      if (!hasAddons && !hasFaq) {
        return true;
      }

      // If content exists, validate it with React Hook Form
      const isValid = await form.trigger(['addons', 'faq']);
      if (!isValid) {
        return false;
      }

      // Additional schema validation
      try {
        const stepSchema = STEP_SCHEMAS[5];
        stepSchema.parse(formValues);
        return true;
      } catch (error) {
        return false;
      }
    }

    // Step 6: Media - always allow progression (it's optional)
    if (currentStep === 6) {
      return true;
    }

    // Steps 2-4: Validate using step-specific schemas
    const stepSchema = STEP_SCHEMAS[currentStep as keyof typeof STEP_SCHEMAS];
    if (!stepSchema) {
      return true;
    }

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

  const handleNext = async () => {
    // Validate current step
    const isValid = await validateCurrentStep();

    if (!isValid) {
      toast.error('Παρακαλώ διορθώστε τα σφάλματα πριν συνεχίσετε');
      return;
    }

    // Mark step as completed and proceed
    setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    form.reset();
    setSelectedProfile(null);
    setCurrentStep(1);
    setCompletedSteps([]);
    setShowResetDialog(false);
  };

  // Navigate to a specific step (from dashboard pattern)
  const goToStep = (step: number) => {
    if (step >= 1 && step <= STEPS.length) {
      setCurrentStep(step);
    }
  };

  // Extract FormData preparation for reuse (dashboard pattern)
  const prepareFormData = async () => {
    if (!selectedProfile) {
      throw new Error('Δεν έχει επιλεγεί προφίλ');
    }

    // Handle media uploads if needed (async operation - wait for completion)
    if (mediaRef.current?.hasFiles()) {
      await mediaRef.current.uploadFiles();
    }

    // Get all form values (media will be in form state after upload)
    const allValues = form.getValues();

    // Create FormData with explicit field type handling
    const formData = new FormData();
    formData.append('profileId', selectedProfile.id);
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
    // Same preparation logic for drafts
    return await prepareFormData();
  };

  const handleSubmit = async (data: CreateServiceInput) => {
    try {
      setIsPreparingSubmit(true);
      const formData = await prepareFormData();
      setIsPreparingSubmit(false);
      setIsPending(true);

      startTransition(async () => {
        const result = await createServiceForProfile(null, formData);

        setIsPending(false);

        if (result.success) {
          toast.success(
            result.message || 'Η υπηρεσία δημιουργήθηκε με επιτυχία',
          );

          setIsRedirecting(true);
          setTimeout(() => {
            router.push('/admin/services');
            router.refresh();
          }, 500);
        } else {
          toast.error(result.error || 'Αποτυχία δημιουργίας υπηρεσίας');
        }
      });
    } catch (error) {
      setIsPreparingSubmit(false);
      setIsPending(false);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Προέκυψε ένα απρόσμενο σφάλμα',
      );
    }
  };

  // TODO: Implement draft save action
  const handleDraftSubmit = async () => {
    try {
      setIsDraftPending(true);
      const formData = await prepareDraftData();

      // TODO: Create saveServiceAsDraftForProfile action
      // const result = await saveServiceAsDraftForProfile(null, formData);

      setIsDraftPending(false);
      toast.info('Draft save not yet implemented');
      setShowDraftDialog(false);
    } catch (error) {
      setIsDraftPending(false);
      toast.error('Αποτυχία αποθήκευσης προσχεδίου');
      setShowDraftDialog(false);
    }
  };

  // Get step 3 component based on step 2 selection (dashboard pattern)
  const getStep3Component = () => {
    const typeValue = form.watch('type');
    if (typeValue?.presence) {
      return <OnsiteOnbaseStep disabledOptions={disabledOptions} />;
    } else if (typeValue?.online) {
      return <OneoffSubscriptionStep />;
    }
    // Fallback message if neither is selected
    return (
      <div className='text-center text-muted-foreground py-8'>
        Παρακαλώ επιλέξτε τύπο υπηρεσίας στο βήμα 2
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <ServerSearchCombobox<SelectedProfile>
            value={selectedProfile}
            onSelect={setSelectedProfile}
            onSearch={async (query) => {
              const result = await searchProfilesForServiceCreation(query);
              return result.success && result.data ? result.data : [];
            }}
            getLabel={(profile) =>
              profile.displayName ||
              profile.username ||
              profile.email ||
              profile.user?.email ||
              'Unknown'
            }
            getKey={(profile) => profile.id}
            renderSelected={(profile) => (
              <div className='flex items-center gap-3'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage src={profile.image || ''} />
                  <AvatarFallback>
                    {(
                      profile.displayName?.[0] ||
                      profile.username?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                  <p className='text-sm font-medium'>
                    {profile.displayName || profile.username || profile.email}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {profile.email || profile.user?.email || ''}
                  </p>
                </div>
              </div>
            )}
            renderItem={(profile) => (
              <div className='flex items-center gap-3'>
                <Avatar className='h-8 w-8'>
                  <AvatarImage src={profile.image || ''} />
                  <AvatarFallback>
                    {(
                      profile.displayName?.[0] ||
                      profile.username?.[0] ||
                      'U'
                    ).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>
                    {profile.displayName || profile.username || profile.email}
                  </p>
                  <p className='text-xs text-muted-foreground truncate'>
                    {profile.email || profile.user?.email || ''}
                  </p>
                </div>
              </div>
            )}
            placeholder='Αναζήτηση profile...'
            emptyMessage='Δεν βρέθηκαν προφίλ'
            clearable
          />
        );
      case 2:
        return <PresenceOnlineStep disabledOptions={disabledOptions} />;
      case 3:
        return getStep3Component();
      case 4:
        return <ServiceDetailsStep />;
      case 5:
        return <AddonsFaqStep />;
      case 6:
        return (
          <MediaStep username={selectedProfile.username} mediaRef={mediaRef} />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length;

  // Helper to check if step is completed
  const isStepCompleted = (step: number): boolean => {
    return completedSteps.includes(step);
  };

  return (
    <TaxonomyDataContext.Provider
      value={{ serviceTaxonomies, allSubdivisions, availableTags, pendingTagIds: new Set<string>() }}
    >
      <div className='mx-auto w-full max-w-5xl space-y-6'>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
          {/* Header with Action Icons (dashboard pattern) */}
          <div className='flex items-center justify-between mb-4'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>
                Δημιουργία Υπηρεσίας
              </h1>
              <p className='text-gray-600 mt-1'>
                Δημιουργήστε μια νέα υπηρεσία και αναθέστε την σε ένα προφίλ
              </p>
            </div>
            <div className='flex items-center space-x-2'>
              {/* Reset Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
                    onClick={() => setShowResetDialog(true)}
                    disabled={isPreparingSubmit || isPending || isRedirecting}
                  >
                    <RotateCcw className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Καθαρισμός φόρμας</p>
                </TooltipContent>
              </Tooltip>

              {/* Draft Save Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className={`h-8 w-8 p-0 ${
                      currentStep >= 4 &&
                      watchedTitle &&
                      watchedTitle.length >= 10
                        ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                    onClick={() => setShowDraftDialog(true)}
                    disabled={
                      currentStep < 4 ||
                      !watchedTitle ||
                      watchedTitle.length < 10 ||
                      isDraftPending ||
                      isPreparingSubmit ||
                      isPending
                    }
                  >
                    {isDraftPending ? (
                      <div className='animate-spin h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full' />
                    ) : (
                      <Save className='h-4 w-4' />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {currentStep >= 4 &&
                    watchedTitle &&
                    watchedTitle.length >= 10
                      ? 'Αποθήκευση ως προσχέδιο'
                      : 'Διαθέσιμο στο βήμα 4 μετά τη συμπλήρωση τίτλου'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Rich Step Navigation (dashboard pattern) */}
          <div className='relative overflow-x-clip'>
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

          {/* Current Step with Contextual Icons */}
          <Card className='relative'>
            {/* Loading Overlay (dashboard pattern) */}
            {isRedirecting && (
              <div className='absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center'>
                <div className='text-center space-y-3'>
                  <div className='w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto'></div>
                  <p className='text-sm text-gray-600'>Ανακατεύθυνση...</p>
                </div>
              </div>
            )}

            <CardHeader>
              <CardTitle className='flex items-center space-x-2'>
                {/* Contextual icons based on step */}
                {currentStep === 1 && <User className='w-5 h-5' />}
                {currentStep === 2 && <Globe className='w-5 h-5' />}
                {currentStep === 3 && watch('type')?.presence && (
                  <MapPin className='w-5 h-5' />
                )}
                {currentStep === 3 && watch('type')?.online && (
                  <Globe className='w-5 h-5' />
                )}
                {currentStep === 4 && <Building className='w-5 h-5' />}
                {(currentStep === 5 || currentStep === 6) && (
                  <Home className='w-5 h-5' />
                )}
                <span>{STEPS[currentStep - 1].title}</span>
              </CardTitle>
              <CardDescription>
                {STEPS[currentStep - 1].description}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderStep()}</CardContent>
          </Card>

          {/* Navigation */}
          <div className='flex justify-between gap-4'>
            <Button
              type='button'
              variant='outline'
              onClick={handleBack}
              disabled={
                currentStep === 1 ||
                isPreparingSubmit ||
                isPending ||
                isRedirecting
              }
            >
              <ArrowLeft className='h-4 w-4 mr-2' />
              Πίσω
            </Button>

            {isLastStep ? (
              <FormButton
                text='Δημιουργία Υπηρεσίας'
                type='submit'
                loading={isPreparingSubmit || isPending || isRedirecting}
                disabled={!isCurrentStepValid() || isDraftPending}
              />
            ) : (
              <Button
                type='button'
                onClick={handleNext}
                disabled={
                  !isCurrentStepValid() ||
                  isPreparingSubmit ||
                  isPending ||
                  isRedirecting ||
                  isDraftPending
                }
              >
                Επόμενο
                <ArrowRight className='h-4 w-4 ml-2' />
              </Button>
            )}
          </div>
          </form>
        </Form>

        {/* Reset Dialog */}
        <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Καθαρισμός Φόρμας;</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτό θα διαγράψει όλα τα δεδομένα της φόρμας και θα επιστρέψει στο
              πρώτο βήμα. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReset}
              className='bg-red-600 hover:bg-red-700'
            >
              Καθαρισμός
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Draft Save Dialog (dashboard pattern) */}
      <AlertDialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Αποθήκευση ως Προσχέδιο</AlertDialogTitle>
            <AlertDialogDescription>
              Θέλετε να αποθηκεύσετε την υπηρεσία ως προσχέδιο; Μπορείτε να την
              επεξεργαστείτε αργότερα.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDraftPending}>
              Ακύρωση
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDraftSubmit();
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
    </TaxonomyDataContext.Provider>
  );
}
