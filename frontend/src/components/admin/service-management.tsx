'use client';

import { useState, useEffect } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Star,
  TrendingUp,
  Layers,
  AlertCircle,
  XCircle,
  FileCheck,
} from 'lucide-react';

import type { AdminServiceRow } from '@/lib/types/admin';
import {
  listServices,
  getService,
  updateService,
  togglePublished,
  toggleFeatured,
  updateServiceStatus,
  deleteService,
  getServiceStats,
} from '@/actions/admin/services';

import { AdminServicesDataTable } from './admin-services-data-table';

interface ServiceStatsResponse {
  total: number;
  published: number;
  draft: number;
  pending: number;
  rejected: number;
  approved: number;
  inactive: number;
  featured: number;
  byCategory?: Array<{ category: string; count: number }>;
}

export function ServiceManagement() {
  // State management
  const [services, setServices] = useState<AdminServiceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<ServiceStatsResponse>({
    total: 0,
    published: 0,
    draft: 0,
    pending: 0,
    rejected: 0,
    approved: 0,
    inactive: 0,
    featured: 0,
    byCategory: [],
  });
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [featuredFilter, setFeaturedFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Dialog states
  const [deleteServiceOpen, setDeleteServiceOpen] = useState(false);
  const [statusUpdateOpen, setStatusUpdateOpen] = useState(false);
  const [selectedService, setSelectedService] =
    useState<AdminServiceRow | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Data loading
  const loadServices = async () => {
    try {
      setLoading(true);
      const filters: any = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
        sortBy: 'createdAt' as const,
        sortDirection: 'desc' as const,
      };

      if (searchQuery) {
        filters.searchQuery = searchQuery;
      }

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (featuredFilter !== 'all') {
        filters.featured = featuredFilter;
      }

      if (categoryFilter && categoryFilter !== 'all') {
        filters.category = categoryFilter;
      }

      const result = await listServices(filters);

      if (result.success && result.data) {
        setServices(result.data.services);
        setTotal(result.data.total);
      } else {
        toast.error(result.error || 'Failed to load services');
      }
    } catch (error) {
      toast.error('Failed to load services');
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getServiceStats();
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadServices();
    loadStats();
  }, [currentPage, searchQuery, statusFilter, featuredFilter, categoryFilter]);

  // Action handlers
  const handleTogglePublished = async (serviceId: number) => {
    try {
      const result = await togglePublished({ serviceId });
      if (result.success) {
        toast.success(result.message || 'Service status updated');
        loadServices();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Failed to update service');
      console.error('Error toggling published:', error);
    }
  };

  const handleToggleFeatured = async (serviceId: number) => {
    try {
      const result = await toggleFeatured({ serviceId });
      if (result.success) {
        toast.success(result.message || 'Service featured status updated');
        loadServices();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Failed to update service');
      console.error('Error toggling featured:', error);
    }
  };

  const handleUpdateStatus = (
    service: AdminServiceRow,
    status: string,
  ) => {
    setSelectedService(service);
    setSelectedStatus(status);
    setRejectionReason('');
    setStatusUpdateOpen(true);
  };

  const confirmUpdateStatus = async () => {
    if (!selectedService) return;

    try {
      const result = await updateServiceStatus({
        serviceId: selectedService.id,
        status: selectedStatus as any,
        rejectionReason: rejectionReason || undefined,
      });

      if (result.success) {
        toast.success(result.message || 'Service status updated');
        setStatusUpdateOpen(false);
        setSelectedService(null);
        setSelectedStatus('');
        setRejectionReason('');
        loadServices();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to update service status');
      }
    } catch (error) {
      toast.error('Failed to update service status');
      console.error('Error updating status:', error);
    }
  };

  const handleDeleteService = (service: AdminServiceRow) => {
    setSelectedService(service);
    setDeleteServiceOpen(true);
  };

  const confirmDeleteService = async () => {
    if (!selectedService) return;

    try {
      const result = await deleteService({ serviceId: selectedService.id });
      if (result.success) {
        toast.success('Service deleted successfully');
        setDeleteServiceOpen(false);
        setSelectedService(null);
        loadServices();
        loadStats();
      } else {
        toast.error(result.error || 'Failed to delete service');
      }
    } catch (error) {
      toast.error('Failed to delete service');
      console.error('Error deleting service:', error);
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleRefresh = () => {
    loadServices();
    loadStats();
  };

  // TODO: Get unique categories from service taxonomies (currently unused - dead code)
  const categories: string[] = [];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Services</h1>
          <p className='text-muted-foreground'>
            Manage services, approvals, and featured listings
          </p>
        </div>
        <Button onClick={handleRefresh} variant='outline'>
          <RefreshCw className='mr-2 h-4 w-4' />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Services
            </CardTitle>
            <Layers className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
            <p className='text-xs text-muted-foreground'>
              All services in system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Published</CardTitle>
            <CheckCircle2 className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.published}</div>
            <p className='text-xs text-muted-foreground'>
              {total > 0 ? ((stats.published / total) * 100).toFixed(0) : 0}% of
              total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Pending Approval
            </CardTitle>
            <AlertCircle className='h-4 w-4 text-yellow-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.pending}</div>
            <p className='text-xs text-muted-foreground'>Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Featured</CardTitle>
            <Star className='h-4 w-4 text-yellow-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.featured}</div>
            <p className='text-xs text-muted-foreground'>Premium listings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Services</CardTitle>
          <CardDescription>
            Search and filter services by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='relative'>
              <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='Αναζήτηση υπηρεσιών...'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className='pl-8'
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='draft'>Draft</SelectItem>
                <SelectItem value='pending'>Pending</SelectItem>
                <SelectItem value='published'>Published</SelectItem>
                <SelectItem value='approved'>Approved</SelectItem>
                <SelectItem value='rejected'>Rejected</SelectItem>
                <SelectItem value='inactive'>Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={featuredFilter}
              onValueChange={(value) => {
                setFeaturedFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Featured' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Services</SelectItem>
                <SelectItem value='featured'>Featured Only</SelectItem>
                <SelectItem value='not-featured'>Not Featured</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>Services ({total})</CardTitle>
          <CardDescription>
            Manage service listings and approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='h-6 w-6 animate-spin text-muted-foreground' />
            </div>
          ) : (
            <AdminServicesDataTable data={services} loading={loading} />
          )}

          {/* Pagination */}
          {total > 0 && (
            <div className='mt-4 flex items-center justify-between'>
              <p className='text-sm text-muted-foreground'>
                Showing {(currentPage - 1) * pageSize + 1} to{' '}
                {Math.min(currentPage * pageSize, total)} of {total} services
              </p>
              <div className='flex items-center space-x-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className='text-sm'>
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Status Dialog */}
      <Dialog open={statusUpdateOpen} onOpenChange={setStatusUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service Status</DialogTitle>
            <DialogDescription>
              Update the status of "{selectedService?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='text-sm font-medium'>New Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className='mt-1'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='draft'>Draft</SelectItem>
                  <SelectItem value='pending'>Pending</SelectItem>
                  <SelectItem value='approved'>Approved</SelectItem>
                  <SelectItem value='published'>Published</SelectItem>
                  <SelectItem value='rejected'>Rejected</SelectItem>
                  <SelectItem value='inactive'>Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedStatus === 'rejected' && (
              <div>
                <label className='text-sm font-medium'>
                  Rejection Reason (Optional)
                </label>
                <Input
                  className='mt-1'
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder='Enter reason for rejection'
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setStatusUpdateOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Dialog */}
      <Dialog open={deleteServiceOpen} onOpenChange={setDeleteServiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedService?.title}"? This
              action cannot be undone and will also delete all associated
              reviews.
            </DialogDescription>
          </DialogHeader>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              This is a permanent action and cannot be reversed.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteServiceOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={confirmDeleteService}>
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
