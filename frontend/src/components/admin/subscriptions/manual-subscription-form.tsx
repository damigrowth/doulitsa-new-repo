'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ServerSearchCombobox } from '@/components/ui/server-search-combobox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {
  adminCreateManualSubscriptionSchema,
  type AdminCreateManualSubscriptionInput,
} from '@/lib/validations/admin';
import { searchProfilesForSelection } from '@/actions/admin/profiles';
import { createManualSubscription } from '@/actions/admin/subscriptions';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import type { AdminProfileRow } from '@/lib/types/admin';

export function ManualSubscriptionForm(): React.JSX.Element {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] =
    useState<AdminProfileRow | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [, startTransition] = useTransition();

  const form = useForm<AdminCreateManualSubscriptionInput>({
    resolver: zodResolver(adminCreateManualSubscriptionSchema),
    mode: 'onChange',
    defaultValues: {
      profileId: '',
      endDate: '',
    },
  });

  const handleProfileSelect = (profile: AdminProfileRow | null) => {
    setSelectedProfile(profile);
    form.setValue('profileId', profile?.id || '', { shouldValidate: true });
  };

  const handleSubmit = async (data: AdminCreateManualSubscriptionInput) => {
    if (!selectedProfile) {
      toast.error('Παρακαλώ επιλέξτε ένα προφίλ');
      return;
    }

    setIsPending(true);

    startTransition(async () => {
      const result = await createManualSubscription({
        profileId: selectedProfile.id,
        endDate: data.endDate,
      });

      setIsPending(false);

      if ('error' in result) {
        toast.error(result.error || 'Αποτυχία δημιουργίας συνδρομής');
        return;
      }

      toast.success('Η χειροκίνητη συνδρομή δημιουργήθηκε επιτυχώς');
      router.push('/admin/subscriptions');
      router.refresh();
    });
  };

  return (
    <div className='mx-auto w-full max-w-5xl'>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
          <Card>
            <CardContent className='space-y-4 pt-6'>
              <div className='space-y-2'>
                <FormLabel>Επιλογή Προφίλ</FormLabel>
                <ServerSearchCombobox
                  value={selectedProfile}
                  onSelect={handleProfileSelect}
                  onSearch={async (query) => {
                    const result = await searchProfilesForSelection(query);
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
                          {profile.displayName ||
                            profile.username ||
                            profile.email}
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
                          {profile.displayName ||
                            profile.username ||
                            profile.email}
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
              </div>

              <FormField
                control={form.control}
                name='endDate'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ημερομηνία Λήξης</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={
                          field.value
                            ? (() => {
                                const [y, m, d] = field.value
                                  .split('-')
                                  .map(Number);
                                return new Date(y, m - 1, d);
                              })()
                            : undefined
                        }
                        onChange={(date) =>
                          field.onChange(
                            date ? format(date, 'yyyy-MM-dd') : '',
                          )
                        }
                        placeholder='Επιλέξτε ημερομηνία'
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        locale={el}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className='flex justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => {
                form.reset();
                setSelectedProfile(null);
              }}
              disabled={isPending}
            >
              Καθαρισμός
            </Button>
            <Button
              type='submit'
              disabled={
                isPending || !selectedProfile || !form.formState.isValid
              }
            >
              {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              Δημιουργία Συνδρομής
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
