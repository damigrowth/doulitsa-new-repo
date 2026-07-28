'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { NextLink } from '@/components';
import UserAvatar from '@/components/shared/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Star,
  Euro,
  Calendar,
  User,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  Tag,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';
import {
  togglePublished,
  toggleFeatured,
  updateServiceStatus,
  deleteService,
} from '@/actions/admin/services';
// Tag labels are resolved server-side (service.tagsData) — no client taxonomy
// import, so the 4.7 MB taxonomy map is never bundled into the browser.

interface ServiceDetailViewProps {
  service: any; // Use proper type from your schema
}

export function ServiceDetailView({ service }: ServiceDetailViewProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(service.status);

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        label: string;
      }
    > = {
      draft: { variant: 'outline', label: 'Draft' },
      pending: { variant: 'secondary', label: 'Pending' },
      published: { variant: 'default', label: 'Published' },
      approved: { variant: 'default', label: 'Approved' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      inactive: { variant: 'outline', label: 'Inactive' },
    };
    return variants[status] || { variant: 'outline', label: status };
  };

  const handleTogglePublished = async () => {
    try {
      const result = await togglePublished({ serviceId: service.id });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleToggleFeatured = async () => {
    try {
      const result = await toggleFeatured({ serviceId: service.id });
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Failed to update service');
    }
  };

  const handleUpdateStatus = async () => {
    try {
      const result = await updateServiceStatus({
        serviceId: service.id,
        status: selectedStatus as any,
      });
      if (result.success) {
        toast.success(result.message);
        setStatusDialogOpen(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    try {
      const result = await deleteService({ serviceId: service.id });
      if (result.success) {
        toast.success('Service deleted successfully');
        router.push('/admin/services');
      } else {
        toast.error(result.error || 'Failed to delete service');
      }
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    return (
      <div className='flex items-center gap-0.5'>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars
                ? 'fill-yellow-400 text-yellow-400'
                : i === fullStars && hasHalfStar
                  ? 'fill-yellow-200 text-yellow-400'
                  : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const statusInfo = getStatusBadge(service.status);

  return (
    <div className='space-y-6'>
      {/* Action Buttons */}
      <div className='flex items-center justify-end gap-2'>
        <Button variant='outline' onClick={handleTogglePublished}>
          {service.status === 'published' ? (
            <>
              <XCircle className='mr-2 h-4 w-4' />
              Unpublish
            </>
          ) : (
            <>
              <CheckCircle2 className='mr-2 h-4 w-4' />
              Publish
            </>
          )}
        </Button>
        <Button variant='outline' onClick={handleToggleFeatured}>
          <Star
            className={`mr-2 h-4 w-4 ${service.featured ? 'fill-yellow-400 text-yellow-400' : ''}`}
          />
          {service.featured ? 'Unfeature' : 'Feature'}
        </Button>
        <Button variant='destructive' onClick={() => setDeleteDialogOpen(true)}>
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </Button>
      </div>

      {/* Service Overview */}
      <div className='grid gap-6 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <div className='flex items-start justify-between'>
              <div className='flex-1'>
                <div className='flex items-center gap-2 mb-2'>
                  <CardTitle>{service.title}</CardTitle>
                  {service.featured && (
                    <Badge
                      variant='default'
                      className='bg-yellow-500 text-yellow-900'
                    >
                      Featured
                    </Badge>
                  )}
                </div>
                <CardDescription>Service Information</CardDescription>
              </div>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <h4 className='text-sm font-medium mb-1'>Description</h4>
              <p className='text-sm text-muted-foreground'>
                {service.description}
              </p>
            </div>

            <Separator />

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <h4 className='text-sm font-medium mb-1 flex items-center gap-1'>
                  <Tag className='h-3 w-3' />
                  Category
                </h4>
                <Badge variant='outline'>{service.category}</Badge>
              </div>

              <div>
                <h4 className='text-sm font-medium mb-1'>Subcategory</h4>
                <p className='text-sm text-muted-foreground'>
                  {service.subcategory}
                </p>
              </div>
            </div>

            {service.subdivision && (
              <div>
                <h4 className='text-sm font-medium mb-1'>Subdivision</h4>
                <p className='text-sm text-muted-foreground'>
                  {service.subdivision}
                </p>
              </div>
            )}

            <Separator />

            <div className='grid grid-cols-2 gap-4'>
              <div>
                <h4 className='text-sm font-medium mb-1 flex items-center gap-1'>
                  <Euro className='h-3 w-3' />
                  Price
                </h4>
                <p className='text-lg font-bold'>
                  {service.fixed ? '€' : 'From €'}
                  {service.price}
                </p>
              </div>

              {service.duration && (
                <div>
                  <h4 className='text-sm font-medium mb-1 flex items-center gap-1'>
                    <Clock className='h-3 w-3' />
                    Duration
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    {service.duration} days
                  </p>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h4 className='text-sm font-medium mb-2'>Rating & Reviews</h4>
              <div className='flex items-center gap-2'>
                {renderStars(service.rating)}
                <span className='text-sm font-medium'>
                  {service.rating.toFixed(1)}
                </span>
                <span className='text-sm text-muted-foreground'>
                  ({service._count.reviews} reviews)
                </span>
              </div>
            </div>

            {service.tags && service.tags.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className='text-sm font-medium mb-2'>Tags</h4>
                  <div className='flex flex-wrap gap-2'>
                    {(
                      (service.tagsData as Array<{ label?: string }> | undefined) ??
                      (service.tags as string[]).map((t) => ({ label: t }))
                    ).map((tagData, index) => (
                      <Badge key={index} variant='outline'>
                        {tagData?.label ?? service.tags[index]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Profile Owner Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Owner</CardTitle>
            <CardDescription>
              Information about the service provider
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex items-start space-x-4'>
              <UserAvatar
                displayName={service.profile.displayName || 'Unnamed Profile'}
                image={service.profile.image}
                size='lg'
                className='h-16 w-16'
                showBorder={false}
                showShadow={false}
              />
              <div className='flex-1'>
                <h4 className='font-semibold'>
                  {service.profile.displayName || 'Unnamed Profile'}
                </h4>
                {service.profile.username && (
                  <p className='text-sm text-muted-foreground'>
                    @{service.profile.username}
                  </p>
                )}
                {service.profile.type && (
                  <Badge variant='outline' className='mt-1'>
                    {service.profile.type}
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-sm'>
                <User className='h-4 w-4 text-muted-foreground' />
                <span>{service.profile.user.name || 'No name'}</span>
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <Mail className='h-4 w-4 text-muted-foreground' />
                <span>{service.profile.user.email}</span>
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <Badge variant='outline'>{service.profile.user.role}</Badge>
              </div>
            </div>

            <Separator />

            <div className='flex gap-2'>
              <Button variant='outline' size='sm' asChild className='flex-1'>
                <NextLink href={`/admin/profiles?id=${service.profile.id}`}>
                  View Profile
                </NextLink>
              </Button>
              <Button variant='outline' size='sm' asChild className='flex-1'>
                <NextLink
                  href={`/profiles/${service.profile.username || service.pid}`}
                  target='_blank'
                >
                  View Public
                </NextLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Service Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid gap-4 md:grid-cols-3'>
            <div>
              <h4 className='text-sm font-medium mb-1 flex items-center gap-1'>
                <Calendar className='h-3 w-3' />
                Created
              </h4>
              <p className='text-sm text-muted-foreground'>
                {formatDate(new Date(service.createdAt))}
              </p>
            </div>
            <div>
              <h4 className='text-sm font-medium mb-1'>Last Updated</h4>
              <p className='text-sm text-muted-foreground'>
                {formatDate(new Date(service.updatedAt))}
              </p>
            </div>
            <div>
              <h4 className='text-sm font-medium mb-1'>Service ID</h4>
              <p className='text-sm text-muted-foreground font-mono'>
                {service.id}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Management Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Service Status</DialogTitle>
            <DialogDescription>
              Change the status of this service
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
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>
              This will permanently delete the service and all associated
              reviews.
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleDelete}>
              Delete Service
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
