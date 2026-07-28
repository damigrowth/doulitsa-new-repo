'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Mail, Chrome } from 'lucide-react';

interface UserAuthFlowProps {
  byStep: {
    EMAIL_VERIFICATION: number;
    OAUTH_SETUP: number;
    ONBOARDING: number;
    DASHBOARD: number;
  };
  byProvider: {
    email: number;
    google: number;
  };
}

export function UserAuthFlow({ byStep, byProvider }: UserAuthFlowProps) {
  /**
   * AUTH FLOW:
   * Email: Register → EMAIL_VERIFICATION → ONBOARDING (pros) → DASHBOARD
   * OAuth: Google Auth → OAUTH_SETUP → ONBOARDING (pros) → DASHBOARD
   */

  const totalUsers = byProvider.email + byProvider.google;
  const emailPercentage =
    totalUsers > 0 ? Math.round((byProvider.email / totalUsers) * 100) : 0;
  const googlePercentage =
    totalUsers > 0 ? Math.round((byProvider.google / totalUsers) * 100) : 0;

  // Combined first step (Email Verification + OAuth Setup)
  const firstStepTotal = byStep.EMAIL_VERIFICATION + byStep.OAUTH_SETUP;

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Journey Flow</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Auth Providers */}
        <div>
          <h3 className='text-sm font-medium mb-3 text-muted-foreground'>
            Authentication Providers
          </h3>
          <div className='grid grid-cols-2 gap-4'>
            <div className='flex items-center space-x-3 p-4 border rounded-lg'>
              <div className='flex-shrink-0'>
                <Mail className='h-5 w-5 text-muted-foreground' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-sm font-medium'>Email/Password</p>
                  <Badge variant='secondary'>{emailPercentage}%</Badge>
                </div>
                <p className='text-2xl font-bold'>{byProvider.email}</p>
                <p className='text-xs text-muted-foreground'>users</p>
              </div>
            </div>

            <div className='flex items-center space-x-3 p-4 border rounded-lg'>
              <div className='flex-shrink-0'>
                <Chrome className='h-5 w-5 text-muted-foreground' />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between mb-1'>
                  <p className='text-sm font-medium'>Google OAuth</p>
                  <Badge variant='secondary'>{googlePercentage}%</Badge>
                </div>
                <p className='text-2xl font-bold'>{byProvider.google}</p>
                <p className='text-xs text-muted-foreground'>users</p>
              </div>
            </div>
          </div>
        </div>

        {/* Unified Journey Flow */}
        <div>
          <h3 className='text-sm font-medium mb-3 text-muted-foreground'>
            Registration Journey
          </h3>
          <div className='flex items-center justify-between'>
            {/* Step 1: Verification/Setup */}
            <div className='flex items-center flex-1'>
              <div className='flex-1'>
                <div className='p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors'>
                  <div className='flex items-center justify-between mb-2'>
                    <Badge variant='outline' className='text-xs'>
                      Step 1
                    </Badge>
                    <span className='text-2xl font-bold'>{firstStepTotal}</span>
                  </div>
                  <h4 className='font-medium text-sm mb-2'>Initial Setup</h4>

                  {/* Email path */}
                  <div className='flex items-center gap-2 mb-1'>
                    <Mail className='h-3 w-3 text-muted-foreground' />
                    <span className='text-xs text-muted-foreground'>
                      Email Verification: {byStep.EMAIL_VERIFICATION}
                    </span>
                  </div>

                  {/* Google path */}
                  <div className='flex items-center gap-2'>
                    <Chrome className='h-3 w-3 text-muted-foreground' />
                    <span className='text-xs text-muted-foreground'>
                      OAuth Setup: {byStep.OAUTH_SETUP}
                    </span>
                  </div>
                </div>
              </div>

              <div className='flex items-center justify-center px-3'>
                <ArrowRight className='h-5 w-5 text-muted-foreground' />
              </div>
            </div>

            {/* Step 2: Onboarding */}
            <div className='flex items-center flex-1'>
              <div className='flex-1'>
                <div className='p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors'>
                  <div className='flex items-center justify-between mb-2'>
                    <Badge variant='outline' className='text-xs'>
                      Step 2
                    </Badge>
                    <span className='text-2xl font-bold'>{byStep.ONBOARDING}</span>
                  </div>
                  <h4 className='font-medium text-sm mb-1'>Professional Onboarding</h4>
                  <p className='text-xs text-muted-foreground'>
                    Setting up professional profile
                  </p>
                </div>
              </div>

              <div className='flex items-center justify-center px-3'>
                <ArrowRight className='h-5 w-5 text-muted-foreground' />
              </div>
            </div>

            {/* Step 3: Dashboard/Active */}
            <div className='flex-1'>
              <div className='p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors'>
                <div className='flex items-center justify-between mb-2'>
                  <Badge variant='outline' className='text-xs'>
                    Step 3
                  </Badge>
                  <span className='text-2xl font-bold'>{byStep.DASHBOARD}</span>
                </div>
                <h4 className='font-medium text-sm mb-1'>Active Users</h4>
                <p className='text-xs text-muted-foreground'>
                  Using the platform
                </p>
              </div>
            </div>
          </div>

          {/* Conversion Stats */}
          <div className='mt-4 pt-4 border-t'>
            <div className='grid grid-cols-3 gap-4 text-sm'>
              <div>
                <p className='text-muted-foreground mb-1'>Setup → Onboarding</p>
                <p className='font-medium'>
                  {totalUsers > 0
                    ? Math.round((byStep.ONBOARDING / totalUsers) * 100)
                    : 0}
                  % converted
                </p>
              </div>
              <div>
                <p className='text-muted-foreground mb-1'>Onboarding → Active</p>
                <p className='font-medium'>
                  {byStep.ONBOARDING > 0
                    ? Math.round((byStep.DASHBOARD / (byStep.ONBOARDING + byStep.DASHBOARD)) * 100)
                    : 0}
                  % completed
                </p>
              </div>
              <div>
                <p className='text-muted-foreground mb-1'>Overall Completion</p>
                <p className='font-medium'>
                  {totalUsers > 0
                    ? Math.round((byStep.DASHBOARD / totalUsers) * 100)
                    : 0}
                  % active
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
