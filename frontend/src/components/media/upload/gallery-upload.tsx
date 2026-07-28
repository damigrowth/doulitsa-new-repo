'use client';

import React, { memo, useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  isPendingResource,
  CloudinaryResourceOrPending,
  generateAcceptString,
  MediaType,
} from '@/lib/utils/media';
import { GalleryUploadProps } from '@/lib/types/components';
import ResourcePreview from './resource-preview';

interface SortableResourceProps {
  resource: CloudinaryResourceOrPending;
  index: number;
  onRemove: (publicId: string) => void;
}

// Helper function to generate stable IDs
const generateStableId = (resource: CloudinaryResourceOrPending, index: number): string => {
  if (resource.public_id) {
    return resource.public_id;
  }
  // For pending resources, use a combination of properties that won't change
  if (isPendingResource(resource)) {
    return `pending-${resource._pending}-${index}`;
  }
  return `resource-${index}`;
};

const SortableResource = memo<SortableResourceProps>(
  ({ resource, index, onRemove }) => {
    const stableId = generateStableId(resource, index);
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: stableId,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const handleRemove = useCallback(
      (publicId: string) => {
        // If it's a pending resource, also handle as queue removal
        if (isPendingResource(resource)) {
          const fileId = publicId.startsWith('pending_')
            ? publicId.replace('pending_', '')
            : publicId;
          onRemove(fileId);
        } else {
          onRemove(publicId);
        }
      },
      [resource, onRemove],
    );

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className='touch-none'
      >
        <ResourcePreview
          resource={resource}
          index={index}
          onRemove={handleRemove}
          isDragging={isDragging}
          dragHandleProps={{ 'data-cy': 'drag-handle' }}
        />
      </div>
    );
  },
);

SortableResource.displayName = 'SortableResource';

const GalleryUpload = memo<GalleryUploadProps>(
  ({
    resources,
    queuedFiles,
    onFilesSelected,
    onRemoveResource,
    onRemoveFromQueue,
    onReorderResources,
    isUploading,
    error,
    maxFiles,
    maxFileSize,
    formats,
    canAddMore,
    className = '',
    type,
  }) => {
    // Client-side rendering protection for drag and drop
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
      setIsMounted(true);
    }, []);
    
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      }),
    );

    const handleDragEnd = useCallback(
      (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
          const oldIndex = resources.findIndex(
            (item, index) => generateStableId(item, index) === active.id,
          );
          const newIndex = resources.findIndex(
            (item, index) => generateStableId(item, index) === over.id,
          );

          if (oldIndex !== -1 && newIndex !== -1) {
            const reorderedResources = arrayMove(resources, oldIndex, newIndex);
            onReorderResources(reorderedResources);
          }
        }
      },
      [resources, onReorderResources],
    );

    const handleRemove = useCallback(
      (publicId: string) => {
        // Check if it's a queued file or resource
        const queuedFile = queuedFiles.find((qf) => qf.id === publicId);
        const pendingResource = resources.find(
          (r) =>
            isPendingResource(r) &&
            (r.public_id === `pending_${publicId}` ||
              r.public_id?.replace('pending_', '') === publicId),
        );

        if (queuedFile || pendingResource) {
          onRemoveFromQueue(publicId);
        } else {
          onRemoveResource(publicId);
        }
      },
      [queuedFiles, resources, onRemoveFromQueue, onRemoveResource],
    );

    const totalFiles =
      resources.filter((r) => !isPendingResource(r)).length +
      queuedFiles.length;

    // Generate stable sortable IDs for resources
    const resourceIds = resources.map((resource, index) => 
      generateStableId(resource, index)
    );

    return (
      <div
        className={`bg-secondary/5 hover:bg-secondary/10 border-2 border-dashed border-primary/60 hover:border-primary/90 transition-colors rounded-xl p-8 mb-8 shadow-sm ${
          isUploading ? 'opacity-50 pointer-events-none' : ''
        } ${className}`}
      >
        {/* Dropzone */}
        <div className='relative'>
          {/* Hidden file input for the entire dropzone */}
          <input
            type='file'
            accept={generateAcceptString(
              type === 'image'
                ? (['image'] as MediaType[])
                : (['image', 'video', 'audio'] as MediaType[]),
              false,
            )}
            multiple={true}
            onChange={(e) => {
              if (e.target.files) {
                onFilesSelected(e.target.files);
              }
            }}
            className='hidden'
            disabled={!canAddMore || isUploading}
            ref={(input) => {
              if (input) {
                (window as any).portfolioFileInput = input;
              }
            }}
          />

          {/* Clickable dropzone area */}
          <div
            className='relative w-full text-center cursor-pointer'
            onClick={() => {
              if (canAddMore && !isUploading) {
                (window as any).portfolioFileInput?.click();
              }
            }}
          >
            <span className='text-3xl mb-4 block'>📁</span>

            <div className='mt-2'>
              {totalFiles === 0 ? (
                <p className='text-sm mb-0 text-gray-700'>Επιλογή αρχείων</p>
              ) : (
                <p className='text-sm text-gray-700'>
                  Έχετε επιλέξει {totalFiles}{' '}
                  {totalFiles === 1 ? 'αρχείο' : 'αρχεία'}
                </p>
              )}
              {totalFiles < 1 && (
                <p className='text-base mb-1 mt-1 text-gray-600'>
                  Σύρετε τα αρχεία σας εδώ, ή κάντε κλικ για να τα επιλέξετε
                </p>
              )}

              <div className='mt-3 space-y-1'>
                <p className='text-xs mb-0 text-gray-600'>
                  Το μέγιστο επιτρεπτό μέγεθος αρχείων είναι{' '}
                  <span className='font-semibold'>
                    {Math.round(maxFileSize / 1024 / 1024)}MB
                  </span>{' '}
                  (Τρέχον μέγεθος:{' '}
                  <span className='font-semibold'>
                    {(
                      (queuedFiles.reduce((sum, f) => sum + f.size, 0) +
                        resources
                          .filter((r) => !isPendingResource(r))
                          .reduce((sum, r) => sum + (r.bytes || 0), 0)) /
                      1024 /
                      1024
                    ).toFixed(2)}
                    MB
                  </span>
                  )
                </p>
                <p className='text-xs mb-0 text-gray-600'>
                  Μέχρι <span className='font-semibold'>{maxFiles}</span> αρχεία
                  (εικόνας, ήχου ή βίντεο)
                </p>
                <p className='text-xs mb-0 text-gray-500'>
                  Υποστηριζόμενοι τύποι: {formats.join(', ')}
                </p>
                <div
                  className='text-red-600 text-xs'
                  style={{ height: '10px' }}
                >
                  {error || ' '}
                </div>
              </div>

              {/* Gallery Grid - Inside Clickable Section */}
              {resources.length > 0 && (
                <div
                  className='flex flex-wrap justify-center gap-4 w-fit place-self-center mt-6'
                  onClick={(e) => e.stopPropagation()}
                >
                  {!isMounted ? (
                    // Server-side rendering fallback without drag and drop
                    <div className='flex flex-wrap justify-center gap-4'>
                      {resources.map((resource, index) => (
                        <div key={generateStableId(resource, index)}>
                          <ResourcePreview
                            resource={resource}
                            index={index}
                            onRemove={handleRemove}
                            isDragging={false}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Client-side rendering with drag and drop
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={resourceIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {resources.map((resource, index) => (
                          <SortableResource
                            key={generateStableId(resource, index)}
                            resource={resource}
                            index={index}
                            onRemove={handleRemove}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Status */}
        {isUploading && (
          <div className='flex items-center justify-center py-6 mt-6'>
            <Loader2 className='w-5 h-5 animate-spin text-primary mr-2' />
            <span className='text-primary font-medium'>
              Uploading files...
            </span>
          </div>
        )}
      </div>
    );
  },
);

GalleryUpload.displayName = 'GalleryUpload';

export default GalleryUpload;
