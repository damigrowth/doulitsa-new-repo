import { requirePermission } from '@/actions/auth/server';
import { getProfile } from '@/actions/admin/profiles';
import { redirect, notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NextLink } from '@/components';
import {
  AccountForm,
  BasicInfoForm,
  AdditionalInfoForm,
  PresentationInfoForm,
  PortfolioForm,
  CoverageForm,
  BillingForm,
} from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/admin/site-header';
import { EditProfileSettingsForm } from '@/components/admin/forms/edit-profile-settings-form';
import { getProTaxonomies, getLocations, getSkills } from '@/lib/taxonomies';
import type { DatasetOption, DatasetWithCategory } from '@/lib/types/datasets';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminProfileEditPage({ params }: PageProps) {
  // Verify permission to view profiles
  await requirePermission(ADMIN_RESOURCES.PROFILES, '/admin/profiles');

  // Get profile ID from params
  const { id: profileId } = await params;

  // Fetch the profile
  const profileResult = await getProfile(profileId);

  if (!profileResult.success || !profileResult.data) {
    notFound();
  }

  const profile = profileResult.data as any;

  // Prepare taxonomy data server-side to prevent client-side bundle bloat
  const proTaxonomies = getProTaxonomies();
  const skillsDataset = getSkills();

  // Create a mock user object for the forms (they expect AuthUser)
  const mockUser = {
    id: profile.uid,
    email: profile.user.email,
    name: profile.user.name || profile.displayName,
    username: profile.user.username || profile.username,
    displayName: profile.user.displayName || profile.displayName,
    image: profile.user.image || profile.image,
    role: profile.user.role,
    step: profile.user.step || 'DASHBOARD',
    emailVerified: true,
    banned: profile.user.banned,
    blocked: profile.user.blocked,
    createdAt: profile.user.createdAt || profile.createdAt,
    updatedAt: profile.user.updatedAt || profile.updatedAt,
  };

  return (
    <>
      <SiteHeader
        title={profile.displayName || profile.username || 'Unnamed Profile'}
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/profiles'>
                <ArrowLeft className='h-4 w-4' />
                Profiles
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink href={`/admin/users/${profile.uid}`}>
                <ExternalLink className='h-4 w-4' />
                User
              </NextLink>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <NextLink href={`/profile/${profile.username}`} target='_blank'>
                <Eye className='h-4 w-4' />
                Public Profile
              </NextLink>
            </Button>
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6 pb-16'>
            {/* Profile Overview - 3 Tables */}
            <div className='grid gap-4 md:grid-cols-3'>
              {/* Profile Information Table */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Πληροφορίες Προφίλ</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Display Name
                      </span>
                      <span className='text-xs font-medium'>
                        {profile.displayName || '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Username
                      </span>
                      <span className='text-xs font-medium'>
                        {profile.username || '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Type
                      </span>
                      <Badge variant='outline' className='text-xs h-5'>
                        {profile.type || 'Not Set'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>UID</span>
                      <span className='text-xs font-mono'>
                        {profile.uid.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status Flags Table */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Status Flags</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Published
                      </span>
                      <Badge
                        variant={profile.published ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {profile.published ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Featured
                      </span>
                      <Badge
                        variant={profile.featured ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {profile.featured ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Verified
                      </span>
                      <Badge
                        variant={profile.verified ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {profile.verified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Top Level
                      </span>
                      <Badge
                        variant={profile.top ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {profile.top ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Active
                      </span>
                      <Badge
                        variant={profile.isActive ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {profile.isActive ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics & Dates Table */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Statistics & Dates</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Services
                      </span>
                      <span className='text-xs font-medium'>
                        {profile._count?.services || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Reviews
                      </span>
                      <span className='text-xs font-medium'>
                        {profile.reviewCount || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Rating
                      </span>
                      <span className='text-xs font-medium'>
                        {profile.rating?.toFixed(1) || 'N/A'} ⭐
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Created
                      </span>
                      <span className='text-xs font-medium'>
                        {new Date(profile.createdAt).toLocaleDateString(
                          'el-GR',
                        )}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Updated
                      </span>
                      <span className='text-xs font-medium'>
                        {new Date(profile.updatedAt).toLocaleDateString(
                          'el-GR',
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Profile Management Forms */}
            <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 space-y-6'>
              <div>
                <h2>Διαχείριση Προφίλ</h2>
              </div>
              <div className='space-y-6'>
                {/* Profile Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Ρυθμίσεις Προφίλ</CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Κατάσταση δημοσίευσης, προβολής και επαλήθευσης
                    </p>
                  </CardHeader>
                  <CardContent>
                    <EditProfileSettingsForm profile={profile} />
                  </CardContent>
                </Card>

                {/* Account Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Λογαριασμός</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AccountForm
                      initialUser={mockUser as any}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Βασικά στοιχεία</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BasicInfoForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      proTaxonomies={proTaxonomies as DatasetOption[]}
                      skillsDataset={skillsDataset as DatasetWithCategory[]}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Coverage */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Περιοχές Κάλυψης</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CoverageForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      locationOptions={getLocations()}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Additional Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Πρόσθετα Στοιχεία</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AdditionalInfoForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Contact Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Επικοινωνία</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PresentationInfoForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Portfolio */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Portfolio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PortfolioForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      showHeading={false}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Billing */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Στοιχεία Τιμολόγησης
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BillingForm
                      initialUser={mockUser as any}
                      initialProfile={profile}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
