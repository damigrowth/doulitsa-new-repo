import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getSavedItems } from '@/actions/saved';
import ServiceCard from '@/components/shared/service-card';
import { ArchiveProfileCard } from '@/components/archives/archive-profile-card';
import SavedPagination from '@/components/dashboard/saved/saved-pagination';
import { Heart } from 'lucide-react';
import { getDashboardMetadata } from '@/lib/seo/pages';

export const metadata = getDashboardMetadata('Αποθηκευμένα');

interface SavedPageProps {
  searchParams: Promise<{
    servicesPage?: string;
    servicesLimit?: string;
    profilesPage?: string;
    profilesLimit?: string;
  }>;
}

export default async function SavedPage({ searchParams }: SavedPageProps) {
  // Await searchParams
  const params = await searchParams;

  // Parse pagination params
  const servicesPage = parseInt(params.servicesPage || '1');
  const servicesLimit = parseInt(params.servicesLimit || '12');
  const profilesPage = parseInt(params.profilesPage || '1');
  const profilesLimit = parseInt(params.profilesLimit || '12');

  // Fetch saved items server-side with pagination
  const result = await getSavedItems({
    servicesPage,
    servicesLimit,
    profilesPage,
    profilesLimit,
  });

  // Handle errors
  if (!result.success) {
    return (
      <div className='space-y-6 p-2 pr-0'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Αποθηκευμένα</h1>
          <p className='text-gray-600 mt-1'>
            Αποθηκευμένες υπηρεσίες και επαγγελματικά προφίλ
          </p>
        </div>

        <Card>
          <CardContent className='p-6'>
            <div className='text-center py-8'>
              <p className='text-red-600'>{result.error}</p>
              <p className='text-gray-500 mt-2'>
                Παρακαλώ ανανεώστε τη σελίδα ή δοκιμάστε ξανά αργότερα.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const {
    services,
    profiles,
    servicesTotal = 0,
    profilesTotal = 0,
    servicesTotalPages = 1,
    profilesTotalPages = 1,
  } = result.data;

  return (
    <div className='space-y-6 p-2 pr-0'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Αποθηκευμένα</h1>
        <p className='text-gray-600 mt-1'>
          Αποθηκευμένες υπηρεσίες και επαγγελματικά προφίλ
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue='services' className='w-full'>
        <TabsList className='grid w-full max-w-md grid-cols-2 bg-muted/50 p-1.5 px-3 rounded-xl h-auto'>
          <TabsTrigger
            value='services'
            className='rounded-lg py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all'
          >
            Υπηρεσίες ({servicesTotal})
          </TabsTrigger>
          <TabsTrigger
            value='profiles'
            className='rounded-lg py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all'
          >
            Προφίλ ({profilesTotal})
          </TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value='services' className='mt-6 space-y-6'>
          {services.length === 0 ? (
            <Card>
              <CardContent className='p-12'>
                <div className='text-center'>
                  <Heart className='w-12 h-12 text-gray-300 mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                    Δεν υπάρχουν αποθηκευμένες υπηρεσίες
                  </h3>
                  <p className='text-gray-600'>
                    Αποθήκευσε τις υπηρεσίες που σε ενδιαφέρουν πατώντας την
                    καρδιά
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6'>
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    showProfile={true}
                  />
                ))}
              </div>

              {/* Pagination */}
              {servicesTotalPages > 1 && (
                <SavedPagination
                  currentPage={servicesPage}
                  totalPages={servicesTotalPages}
                  currentLimit={servicesLimit}
                  type='services'
                />
              )}
            </>
          )}
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value='profiles' className='mt-6 space-y-6'>
          {profiles.length === 0 ? (
            <Card>
              <CardContent className='p-12'>
                <div className='text-center'>
                  <Heart className='w-12 h-12 text-gray-300 mx-auto mb-4' />
                  <h3 className='text-lg font-semibold text-gray-900 mb-2'>
                    Δεν υπάρχουν αποθηκευμένα προφίλ
                  </h3>
                  <p className='text-gray-600'>
                    Αποθήκευσε τα επαγγελματικά προφίλ που σε ενδιαφέρουν
                    πατώντας την καρδιά
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6'>
                {profiles.map((profile) => (
                  <ArchiveProfileCard
                    key={profile.id}
                    profile={profile}
                    variant='vertical'
                  />
                ))}
              </div>

              {/* Pagination */}
              {profilesTotalPages > 1 && (
                <SavedPagination
                  currentPage={profilesPage}
                  totalPages={profilesTotalPages}
                  currentLimit={profilesLimit}
                  type='profiles'
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
