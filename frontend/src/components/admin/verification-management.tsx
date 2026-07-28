'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { NextLink } from '@/components';
import UserAvatar from '@/components/shared/user-avatar';
import { toast } from 'sonner';
import {
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import { AdminVerificationsDataTable } from './admin-verifications-data-table';
import {
  approveVerificationFormSchema,
  rejectVerificationFormSchema,
  type ApproveVerificationFormInput,
  type RejectVerificationFormInput,
} from '@/lib/validations/admin';
import {
  listVerifications,
  updateVerificationStatus,
  deleteVerification,
  getVerificationStats,
} from '@/actions/admin/verifications';
import { formatDate } from '@/lib/utils/date';
import type {
  AdminVerificationRow,
  AdminVerificationStats,
} from '@/lib/types/admin';

type Verification = AdminVerificationRow;
type VerificationStats = AdminVerificationStats;

export function VerificationManagement() {
  // State management
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<VerificationStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVerification, setSelectedVerification] =
    useState<Verification | null>(null);

  // Form initialization
  const approveForm = useForm<ApproveVerificationFormInput>({
    resolver: zodResolver(approveVerificationFormSchema),
    defaultValues: {
      verificationId: '',
      notes: '',
    },
  });

  const rejectForm = useForm<RejectVerificationFormInput>({
    resolver: zodResolver(rejectVerificationFormSchema),
    defaultValues: {
      verificationId: '',
      reason: '',
    },
  });

  // Data loading
  const loadVerifications = async () => {
    try {
      setLoading(true);
      const filters: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy: 'createdAt',
        sortDirection: 'desc' as const,
      };

      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      const result = await listVerifications(filters);

      if (result.success && result.data) {
        setVerifications(result.data.verifications);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || 'Failed to load verifications');
      }
    } catch (error) {
      toast.error('Failed to load verifications');
      console.error('Error loading verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getVerificationStats();

      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading verification stats:', error);
    }
  };

  useEffect(() => {
    loadVerifications();
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  // Action handlers
  const handleView = (verification: Verification) => {
    setSelectedVerification(verification);
    setViewDialogOpen(true);
  };

  const handleApproveClick = (verification: Verification) => {
    setSelectedVerification(verification);
    approveForm.reset({
      verificationId: verification.id,
      notes: '',
    });
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (verification: Verification) => {
    setSelectedVerification(verification);
    rejectForm.reset({
      verificationId: verification.id,
      reason: '',
    });
    setRejectDialogOpen(true);
  };

  const handleDeleteClick = (verification: Verification) => {
    setSelectedVerification(verification);
    setDeleteDialogOpen(true);
  };

  const handleApprove = async (data: ApproveVerificationFormInput) => {
    if (!selectedVerification) return;

    try {
      const result = await updateVerificationStatus({
        verificationId: selectedVerification.id,
        status: 'APPROVED',
        notes: data.notes,
      });

      if (result.success) {
        toast.success('Verification approved successfully');
        setApproveDialogOpen(false);
        setSelectedVerification(null);
        approveForm.reset();
        loadVerifications();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to approve verification');
      }
    } catch (error) {
      toast.error('Failed to approve verification');
      console.error('Error approving verification:', error);
    }
  };

  const handleReject = async (data: RejectVerificationFormInput) => {
    if (!selectedVerification) return;

    try {
      const result = await updateVerificationStatus({
        verificationId: selectedVerification.id,
        status: 'REJECTED',
        notes: data.reason,
      });

      if (result.success) {
        toast.success('Verification rejected');
        setRejectDialogOpen(false);
        setSelectedVerification(null);
        rejectForm.reset();
        loadVerifications();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to reject verification');
      }
    } catch (error) {
      toast.error('Failed to reject verification');
      console.error('Error rejecting verification:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedVerification) return;

    try {
      const result = await deleteVerification({
        verificationId: selectedVerification.id,
      });

      if (result.success) {
        toast.success('Verification deleted successfully');
        setDeleteDialogOpen(false);
        setSelectedVerification(null);
        loadVerifications();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to delete verification');
      }
    } catch (error) {
      toast.error('Failed to delete verification');
      console.error('Error deleting verification:', error);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Verifications</h1>
          <p className='text-muted-foreground'>
            Manage profile verification requests
          </p>
        </div>
        <Button onClick={() => loadVerifications()} variant='outline' size='sm'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Verifications
            </CardTitle>
            <FileCheck className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
            <p className='text-xs text-muted-foreground'>
              All verification requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pending</CardTitle>
            <AlertCircle className='h-4 w-4 text-yellow-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>
              {stats.pending}
            </div>
            <p className='text-xs text-muted-foreground'>Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Approved</CardTitle>
            <CheckCircle2 className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.approved}
            </div>
            <p className='text-xs text-muted-foreground'>
              {stats.total > 0
                ? ((stats.approved / stats.total) * 100).toFixed(0)
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Rejected</CardTitle>
            <XCircle className='h-4 w-4 text-red-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {stats.rejected}
            </div>
            <p className='text-xs text-muted-foreground'>Declined requests</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex gap-4'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Αναζήτηση με ΑΦΜ ή επωνυμία...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1); // Reset to first page on search
                  }}
                  className='pl-8'
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1); // Reset to first page on filter change
              }}
            >
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='All Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='PENDING'>Pending</SelectItem>
                <SelectItem value='APPROVED'>Approved</SelectItem>
                <SelectItem value='REJECTED'>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Verifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Verifications
            <span className='text-sm font-normal text-muted-foreground ml-2'>
              ({total})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminVerificationsDataTable
            data={verifications}
            loading={loading}
            onView={handleView}
            onApprove={handleApproveClick}
            onReject={handleRejectClick}
            onDelete={handleDeleteClick}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className='flex items-center justify-between mt-4'>
              <p className='text-sm text-muted-foreground'>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total}{' '}
                verifications
              </p>

              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
            <DialogDescription>
              View complete verification information
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className='space-y-4'>
              {/* Status */}
              <div>
                <Label>Status</Label>
                <div className='mt-1'>
                  <Badge
                    variant={
                      selectedVerification.status === 'APPROVED'
                        ? 'default'
                        : selectedVerification.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {selectedVerification.status}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Business Information */}
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <Label className='text-muted-foreground'>AFM</Label>
                  <p className='text-sm font-medium mt-1'>
                    {selectedVerification.afm || '—'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Business Name</Label>
                  <p className='text-sm font-medium mt-1'>
                    {selectedVerification.name || '—'}
                  </p>
                </div>
                <div className='col-span-2'>
                  <Label className='text-muted-foreground'>Address</Label>
                  <p className='text-sm font-medium mt-1'>
                    {selectedVerification.address || '—'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Phone</Label>
                  <p className='text-sm font-medium mt-1'>
                    {selectedVerification.phone || '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Profile & User Info */}
              <div>
                <Label className='text-muted-foreground mb-2 block'>
                  Related Profile
                </Label>
                <NextLink
                  href={`/admin/profiles?id=${selectedVerification.profile.id}`}
                  className='hover:underline'
                >
                  <div className='flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors'>
                    <UserAvatar
                      displayName={selectedVerification.profile.displayName ?? undefined}
                      size='md'
                      className='h-10 w-10'
                      showBorder={false}
                      showShadow={false}
                    />
                    <div className='flex-1'>
                      <p className='font-medium'>
                        {selectedVerification.profile.displayName}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {selectedVerification.profile.email ??
                          selectedVerification.user?.email}
                      </p>
                    </div>
                  </div>
                </NextLink>
              </div>

              <Separator />

              {/* Timestamps */}
              <div className='grid grid-cols-2 gap-4 text-sm'>
                <div>
                  <Label className='text-muted-foreground'>Created</Label>
                  <p className='mt-1'>
                    {selectedVerification.createdAt
                      ? formatDate(selectedVerification.createdAt)
                      : '—'}
                  </p>
                </div>
                <div>
                  <Label className='text-muted-foreground'>Updated</Label>
                  <p className='mt-1'>
                    {selectedVerification.updatedAt
                      ? formatDate(selectedVerification.updatedAt)
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Verification</DialogTitle>
            <DialogDescription>
              Approve {selectedVerification?.name}? This will mark the profile
              as verified.
            </DialogDescription>
          </DialogHeader>

          <Form {...approveForm}>
            <form
              onSubmit={approveForm.handleSubmit(handleApprove)}
              className='space-y-4'
            >
              <FormField
                control={approveForm.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='Add any notes about this approval...'
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setApproveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit'>Approve</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Reject {selectedVerification?.name}? Please provide a reason for
              rejection.
            </DialogDescription>
          </DialogHeader>

          <Form {...rejectForm}>
            <form
              onSubmit={rejectForm.handleSubmit(handleReject)}
              className='space-y-4'
            >
              <FormField
                control={rejectForm.control}
                name='reason'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejection Reason *</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder='Explain why this verification is being rejected...'
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type='submit' variant='destructive'>
                  Reject
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this verification? This action
              cannot be undone and will also unverify the profile.
            </DialogDescription>
          </DialogHeader>

          {selectedVerification && (
            <div className='p-4 border rounded-lg bg-muted/50'>
              <p className='font-medium'>{selectedVerification.name}</p>
              <p className='text-sm text-muted-foreground'>
                AFM: {selectedVerification.afm}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
