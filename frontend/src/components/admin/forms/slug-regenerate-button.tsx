'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { createSlug, generateUniqueSlug } from '@/lib/utils/text/slug';
import type { DatasetItem } from '@/lib/types/datasets';

interface SlugRegenerateButtonProps {
  label: string;
  existingItems: DatasetItem[];
  onRegenerate: (slug: string) => void;
  disabled?: boolean;
}

export function SlugRegenerateButton({
  label,
  existingItems,
  onRegenerate,
  disabled = false,
}: SlugRegenerateButtonProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleRegenerate = () => {
    if (!label || !label.trim()) return;

    setIsRegenerating(true);

    // Small delay to show the animation
    setTimeout(() => {
      const baseSlug = createSlug(label);
      const uniqueSlug = generateUniqueSlug(baseSlug, existingItems);
      onRegenerate(uniqueSlug);
      setIsRegenerating(false);
    }, 300);
  };

  return (
    <Button
      type='button'
      variant='outline'
      size='icon'
      className='h-9 w-9 shrink-0'
      onClick={handleRegenerate}
      disabled={disabled || !label || !label.trim()}
      title='Regenerate unique slug'
    >
      <RotateCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
    </Button>
  );
}
