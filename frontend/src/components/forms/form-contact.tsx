'use client';

import React, { useActionState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import ReCAPTCHA from 'react-google-recaptcha';

// Standard shadcn/ui imports
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons (lucide-react only)
import { AlertCircle, CheckCircle } from 'lucide-react';

// Custom components
import FormButton from '@/components/shared/button-form';

// Utilities
import { populateFormData } from '@/lib/utils/form';

// Validation schema and server action
import {
  contactSchema,
  type ContactFormValues,
} from '@/lib/validations/contact';
import { submitContactForm } from '@/actions/messages/contact';

interface ContactFormProps {
  formData: {
    title: string;
    description: string;
    nameLabel: string;
    namePlaceholder: string;
    emailLabel: string;
    emailPlaceholder: string;
    messageLabel: string;
    messagePlaceholder: string;
    buttonText: string;
  };
  siteKey?: string;
}

const initialState = {
  success: false,
  message: '',
};

export default function ContactForm({ formData, siteKey }: ContactFormProps) {
  const [state, action, isPending] = useActionState(
    submitContactForm,
    initialState,
  );

  const [captcha, setCaptcha] = React.useState<string | null>(null);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      message: '',
    },
    mode: 'onChange', // Real-time validation
  });

  const {
    formState: { errors, isValid, isDirty },
    getValues,
    reset,
  } = form;

  // Handle successful form submission
  useEffect(() => {
    if (state.success) {
      // console.log('Contact form submitted successfully');
      // Reset form on successful submission
      reset();
    }
  }, [state.success, reset]);

  // Form submission handler
  const handleFormSubmit = (formData: FormData) => {
    // Get all form values and populate FormData using utility
    const allValues = getValues();

    populateFormData(formData, allValues, {
      stringFields: ['name', 'email', 'message'],
      skipEmpty: false, // Don't skip empty for contact form
    });

    // Add captcha token to form data
    if (captcha) {
      formData.append('captchaToken', captcha);
    }

    // Call server action directly (no await)
    action(formData);
  };

  return (
    <div className='relative lg:absolute top-0 lg:-top-40 w-full bg-white shadow-sm border border-border rounded-lg p-5 lg:p-12 mb-8 lg:mb-0 overflow-hidden'>
      <h4 className='text-xl font-semibold mb-6 text-foreground'>
        {formData.title}
      </h4>
      <p className='text-body mb-8'>{formData.description}</p>

      <Form {...form}>
        <form action={handleFormSubmit} className='space-y-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Name Field */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formData.nameLabel}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={formData.namePlaceholder}
                      {...field}
                      className='w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email Field */}
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formData.emailLabel}</FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder={formData.emailPlaceholder}
                      {...field}
                      className='w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent'
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Message Field */}
          <FormField
            control={form.control}
            name='message'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{formData.messageLabel}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={6}
                    placeholder={formData.messagePlaceholder}
                    {...field}
                    className='w-full px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error Display */}
          {state.message && !state.success && (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {/* Success Display */}
          {state.message && state.success && (
            <Alert className='border-green-200 bg-green-50 text-green-800'>
              <CheckCircle className='h-4 w-4' />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          {/* ReCAPTCHA */}
          {siteKey && (
            <div
              className='flex flex-1 w-full scale-50 xs:scale-75 lg:scale-100'
              style={{ transformOrigin: '0 0' }}
            >
              <ReCAPTCHA sitekey={siteKey} onChange={setCaptcha} />
            </div>
          )}

          {/* Submit Button */}
          <FormButton
            type='submit'
            text={formData.buttonText}
            loadingText='Αποστολή...'
            loading={isPending}
            disabled={isPending || !isValid}
            className='bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-6 rounded-lg transition-colors'
          />
        </form>
      </Form>
    </div>
  );
}
