import { requirePermission, getSession } from '@/actions/auth/server';
import { getUser } from '@/actions/admin';
import { redirect, notFound } from 'next/navigation';
import { ADMIN_RESOURCES } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, ExternalLink, Shield, UserCog } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils/date';
import {
  EditUserStatusForm,
  EditUserBanForm,
  RevokeSessionsForm,
  DeleteUserForm,
} from '@/components/admin/forms';
import { SiteHeader } from '@/components/admin/site-header';
import { NextLink } from '@/components';
import { AccountForm } from '@/components/forms';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  // Verify permission to view users
  await requirePermission(ADMIN_RESOURCES.USERS, '/admin/users');

  // Get current user session
  const sessionResult = await getSession({ revalidate: true });
  const currentUserRole = sessionResult.success && sessionResult.data.user
    ? sessionResult.data.user.role
    : undefined;

  // Get user ID from params
  const { id: userId } = await params;

  // Fetch the user
  const userDataResult = await getUser(userId);

  if (!userDataResult.success || !userDataResult.data) {
    notFound();
  }

  const user = userDataResult.data as any;

  return (
    <>
      <SiteHeader
        title={user.name || user.email}
        actions={
          <>
            <Button variant='ghost' size='sm' asChild>
              <NextLink href='/admin/users'>
                <ArrowLeft className='h-4 w-4' />
                Users
              </NextLink>
            </Button>
            {user.profile && (
              <>
                <Button variant='outline' size='sm' asChild>
                  <NextLink href={`/admin/profiles/${user.profile.id}`}>
                    <ExternalLink className='h-4 w-4' />
                    Profile
                  </NextLink>
                </Button>
                <Button variant='outline' size='sm' asChild>
                  <NextLink
                    href={`/profile/${user.profile.username}`}
                    target='_blank'
                  >
                    <Eye className='h-4 w-4' />
                    Public Profile
                  </NextLink>
                </Button>
              </>
            )}
          </>
        }
      />
      <div className='flex flex-col gap-4 pb-6 pt-4 md:gap-6'>
        <div className='px-4 lg:px-6'>
          <div className='space-y-6 pb-16'>
            {/* User Overview - 4 Tables */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {/* Account Information */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Account Information</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        User ID
                      </span>
                      <span className='text-xs font-mono'>
                        {user.id.slice(0, 12)}...
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Email
                      </span>
                      <span className='text-xs font-medium truncate max-w-[140px]'>
                        {user.email}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Name
                      </span>
                      <span className='text-xs font-medium'>
                        {user.name || '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Username
                      </span>
                      <span className='text-xs font-medium'>
                        {user.username || '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Display Name
                      </span>
                      <span className='text-xs font-medium'>
                        {user.displayName || '-'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Status & Security */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Status & Security</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Role
                      </span>
                      <Badge variant='outline' className='text-xs h-5'>
                        {user.role}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Type
                      </span>
                      <Badge variant='outline' className='text-xs h-5'>
                        {user.type}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Provider
                      </span>
                      <Badge variant='secondary' className='text-xs h-5'>
                        {user.provider}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Step
                      </span>
                      <Badge variant='secondary' className='text-xs h-5'>
                        {user.step}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Email Verified
                      </span>
                      <Badge
                        variant={user.emailVerified ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {user.emailVerified ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Confirmed
                      </span>
                      <Badge
                        variant={user.confirmed ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {user.confirmed ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Blocked
                      </span>
                      <Badge
                        variant={user.blocked ? 'destructive' : 'outline'}
                        className='text-xs h-5'
                      >
                        {user.blocked ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ban Information */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Ban Information</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Banned
                      </span>
                      <Badge
                        variant={user.banned ? 'destructive' : 'outline'}
                        className='text-xs h-5'
                      >
                        {user.banned ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className='flex flex-col gap-1 px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Ban Reason
                      </span>
                      <span className='text-xs font-medium'>
                        {user.banReason || '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Ban Expires
                      </span>
                      <span className='text-xs font-medium'>
                        {user.banExpires
                          ? formatDateTime(user.banExpires)
                          : '-'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Image
                      </span>
                      <span className='text-xs font-medium'>
                        {user.image ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Active Sessions
                      </span>
                      <span className='text-xs font-medium'>
                        {user.sessions?.length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile & Activity */}
              <Card>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>Profile & Activity</CardTitle>
                </CardHeader>
                <CardContent className='p-0'>
                  <div className='divide-y'>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Has Profile
                      </span>
                      <Badge
                        variant={user.profile ? 'default' : 'outline'}
                        className='text-xs h-5'
                      >
                        {user.profile ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    {user.profile && (
                      <>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Services
                          </span>
                          <span className='text-xs font-medium'>
                            {user.profile._count?.services || 0}
                          </span>
                        </div>
                        <div className='flex items-center justify-between px-6 py-2'>
                          <span className='text-xs text-muted-foreground'>
                            Reviews
                          </span>
                          <span className='text-xs font-medium'>
                            {user.profile._count?.reviews || 0}
                          </span>
                        </div>
                      </>
                    )}
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Connected Accounts
                      </span>
                      <span className='text-xs font-medium'>
                        {user.accounts?.length || 0}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Created
                      </span>
                      <span className='text-xs font-medium'>
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between px-6 py-2'>
                      <span className='text-xs text-muted-foreground'>
                        Updated
                      </span>
                      <span className='text-xs font-medium'>
                        {formatDate(user.updatedAt)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Information Sections */}
            <div className='grid gap-6 md:grid-cols-2'>
              {/* Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Shield className='h-5 w-5' />
                    Active Sessions ({user.sessions?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.sessions && user.sessions.length > 0 ? (
                    <div className='space-y-3'>
                      {user.sessions.map((session: any) => (
                        <div
                          key={session.id}
                          className='rounded-lg border p-3 space-y-2'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-sm font-medium'>
                              Session ID
                            </span>
                            <span className='text-xs font-mono'>
                              {session.id.slice(0, 12)}...
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-muted-foreground'>
                              Created
                            </span>
                            <span className='text-xs'>
                              {formatDateTime(session.createdAt)}
                            </span>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-muted-foreground'>
                              Expires
                            </span>
                            <span className='text-xs'>
                              {formatDateTime(session.expiresAt)}
                            </span>
                          </div>
                          {session.ipAddress && (
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-muted-foreground'>
                                IP Address
                              </span>
                              <span className='text-xs font-mono'>
                                {session.ipAddress}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No active sessions
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Accounts (OAuth providers) */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <UserCog className='h-5 w-5' />
                    Connected Accounts ({user.accounts?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {user.accounts && user.accounts.length > 0 ? (
                    <div className='space-y-3'>
                      {user.accounts.map((account: any) => (
                        <div
                          key={account.id}
                          className='rounded-lg border p-3 space-y-2'
                        >
                          <div className='flex items-center justify-between'>
                            <span className='text-sm font-medium'>
                              Provider
                            </span>
                            <Badge variant='outline'>
                              {account.providerId}
                            </Badge>
                          </div>
                          <div className='flex items-center justify-between'>
                            <span className='text-sm text-muted-foreground'>
                              Account ID
                            </span>
                            <span className='text-xs font-mono'>
                              {account.accountId}
                            </span>
                          </div>
                          {account.createdAt && (
                            <div className='flex items-center justify-between'>
                              <span className='text-sm text-muted-foreground'>
                                Connected
                              </span>
                              <span className='text-xs'>
                                {formatDateTime(account.createdAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className='text-sm text-muted-foreground'>
                      No connected accounts
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* User Management Forms - LAST SECTION */}
            <div className='mx-auto w-full max-w-5xl px-4 lg:px-6 space-y-6'>
              <div>
                <h2>User Management</h2>
                <p className='text-muted-foreground'>
                  Edit user information, manage account status, and control
                  access
                </p>
              </div>

              <div className='space-y-6'>
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Account Information
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Update user's profile image, display name, email, and
                      username
                    </p>
                  </CardHeader>
                  <CardContent>
                    <AccountForm
                      initialUser={user as any}
                      adminMode={true}
                      hideCard={true}
                    />
                  </CardContent>
                </Card>

                {/* Account Status & Role */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Account Status & Role
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Manage user role, type, verification status, and account
                      flags
                    </p>
                  </CardHeader>
                  <CardContent>
                    <EditUserStatusForm user={user} currentUserRole={currentUserRole || ''} />
                  </CardContent>
                </Card>

                {/* Ban Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>Ban Management</CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Ban or unban users with optional reason and expiration
                    </p>
                  </CardHeader>
                  <CardContent>
                    <EditUserBanForm user={user} />
                  </CardContent>
                </Card>

                {/* Session Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className='text-lg'>
                      Session Management
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Revoke all active sessions to force user logout
                    </p>
                  </CardHeader>
                  <CardContent>
                    <RevokeSessionsForm user={user} />
                  </CardContent>
                </Card>

                {/* Delete User - DANGER ZONE */}
                <Card className='border-destructive'>
                  <CardHeader className='bg-destructive/10'>
                    <CardTitle className='text-lg text-destructive'>
                      Danger Zone: Delete User
                    </CardTitle>
                    <p className='text-sm text-muted-foreground'>
                      Permanently delete this user and all associated data. This
                      action cannot be undone.
                    </p>
                  </CardHeader>
                  <CardContent className='pt-6'>
                    <DeleteUserForm user={user} />
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
