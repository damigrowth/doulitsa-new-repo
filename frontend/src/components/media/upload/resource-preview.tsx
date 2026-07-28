'use client';

import React, { memo } from 'react';
import { CldImage } from 'next-cloudinary';
import { Video, Music, X } from 'lucide-react';
import { 
  detectMediaType, 
  isPendingResource,
  getResourceDisplayName 
} from '@/lib/utils/media';
import { ResourcePreviewProps } from '@/lib/types/components';

const ResourcePreview = memo<ResourcePreviewProps>(({ 
  resource, 
  index, 
  onRemove, 
  isDragging = false,
  dragHandleProps,
  width = 190,
  height = 166
}) => {
  const mediaType = detectMediaType(resource);
  const isPending = isPendingResource(resource);
  
  const renderMediaContent = () => {
    switch (mediaType) {
      case 'image':
        return isPending ? (
          <img
            src={resource.secure_url}
            alt={resource.original_filename || 'Uploaded image'}
            className="object-cover w-full h-full"
          />
        ) : resource.public_id && resource.resource_type === 'image' ? (
          <CldImage
            width={width}
            height={height}
            src={resource.public_id}
            alt={resource.original_filename || 'Uploaded image'}
            className="object-cover w-full h-full"
          />
        ) : (
          <img
            src={resource.secure_url || resource.url}
            alt={resource.original_filename || 'Uploaded image'}
            className="object-cover w-full h-full"
          />
        );
        
      case 'video':
        return (
          <div className="relative w-full h-full bg-black">
            <video
              className="object-cover w-full h-full"
              controls
              preload="metadata"
              playsInline
            >
              <source
                src={resource.secure_url || resource.url}
                type={resource.format ? `video/${resource.format}` : 'video/mp4'}
              />
              <span className="text-white">
                Video cannot be played
              </span>
            </video>
            <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded flex items-center">
              <Video className="w-3 h-3 mr-1" />
              Video
            </div>
          </div>
        );
        
      case 'audio':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-100 to-pink-100">
            <div className="bg-white p-4 rounded-full shadow-lg mb-3">
              <Music className="w-8 h-8 text-purple-600" />
            </div>
            <div className="w-full text-center px-2">
              <p className="text-sm font-medium text-gray-700 mb-2 truncate w-full">
                {getResourceDisplayName(resource)}
              </p>
              <audio
                controls
                className="w-full h-8"
                preload="metadata"
              >
                <source
                  src={resource.secure_url || resource.url}
                  type={resource.format ? `audio/${resource.format}` : 'audio/mpeg'}
                />
                Your browser does not support audio playback.
              </audio>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-gray-400 mb-2">📄</div>
              <p className="text-xs text-gray-600 truncate max-w-full px-2">
                {getResourceDisplayName(resource)}
              </p>
            </div>
          </div>
        );
    }
  };

  const renderStatusBadge = () => {
    const position = mediaType === 'video' ? 'bottom-2 left-2' : 'top-2 left-2';
    const bgColor = isPending ? 'bg-yellow-500' : 'bg-green-500';
    const text = isPending ? 'Pending' : 'Uploaded';
    
    return (
      <div className={`absolute ${position} ${bgColor} text-white text-xs px-2 py-1 rounded`}>
        {text}
      </div>
    );
  };

  return (
    <div
      key={resource.public_id || `resource-${index}`}
      className={`relative flex items-center transition-all duration-300 ease-in-out hover:scale-105 z-20 ${
        isDragging ? 'opacity-50 transform rotate-2' : ''
      }`}
      {...dragHandleProps}
    >
      <div
        className="relative overflow-hidden rounded border bg-white"
        style={{ width, height }}
      >
        {renderMediaContent()}
        {renderStatusBadge()}
        
        {/* Delete Button */}
        <button
          type="button"
          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-md text-sm z-40"
          onClick={(e) => {
            e.stopPropagation();
            const publicId = isPending 
              ? resource.public_id?.replace('pending_', '') || ''
              : resource.public_id || `resource-${index}`;
            onRemove(publicId);
          }}
          aria-label={`Remove ${getResourceDisplayName(resource)}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
});

ResourcePreview.displayName = 'ResourcePreview';

export default ResourcePreview;