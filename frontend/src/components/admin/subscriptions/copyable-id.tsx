'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyableIdProps {
  id: string | null;
  label?: string;
}

export function CopyableId({ id, label }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  if (!id) return <span className='text-xs text-muted-foreground'>—</span>;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayText = id.length > 20 ? `${id.slice(0, 8)}...${id.slice(-8)}` : id;

  return (
    <div
      className='group flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors'
      onClick={handleCopy}
      title={`Click to copy: ${id}`}
    >
      <span className='text-xs font-mono truncate max-w-[150px]'>
        {displayText}
      </span>
      {copied ? (
        <Check className='h-3 w-3 text-green-600 flex-shrink-0' />
      ) : (
        <Copy className='h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0' />
      )}
    </div>
  );
}
