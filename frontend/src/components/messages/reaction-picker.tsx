'use client';

import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  EmojiPicker,
  EmojiPickerSearch,
  EmojiPickerContent,
  EmojiPickerFooter,
} from '@/components/ui/emoji-picker';
import { Button } from '@/components/ui/button';

interface ReactionPickerProps {
  currentReaction: string | null;
  onSelectEmoji: (emoji: string) => void;
  isOwnMessage: boolean;
}

// Quick reaction emojis (6 most common)
const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '👍'];

export function ReactionPicker({
  currentReaction,
  onSelectEmoji,
  isOwnMessage,
}: ReactionPickerProps) {
  const [showFullPicker, setShowFullPicker] = useState(false);

  const handleEmojiSelect = ({ emoji }: { emoji: string }) => {
    onSelectEmoji(emoji);
    setShowFullPicker(false);
  };

  const handleQuickReaction = (emoji: string) => {
    onSelectEmoji(emoji);
  };

  return (
    <div
      className={
        currentReaction
          ? 'opacity-100'
          : 'opacity-0 transition-opacity group-hover:opacity-100'
      }
      onMouseEnter={(e) => e.stopPropagation()}
    >
      <Popover open={showFullPicker} onOpenChange={setShowFullPicker}>
        <div className='relative'>
          {/* Heart button that shows quick reactions on hover */}
          <div className='group/heart relative'>
            <Button
              variant='ghost'
              size='sm'
              className='h-6 w-6 p-0 relative z-10'
              title='React'
              onClick={(e) => {
                e.stopPropagation();
                if (!currentReaction) {
                  // No reaction yet, add a heart
                  handleQuickReaction('❤️');
                } else {
                  // Already has a reaction, remove it
                  onSelectEmoji(currentReaction);
                }
              }}
            >
              {currentReaction ? (
                <span className='text-base'>{currentReaction}</span>
              ) : (
                <Heart className='h-4 w-4' />
              )}
            </Button>

            {/* Quick reactions hover menu - positioned above button */}
            <div
              className={`absolute bottom-full pb-2 opacity-0 invisible group-hover/heart:opacity-100 group-hover/heart:visible transition-opacity duration-300 pointer-events-none group-hover/heart:pointer-events-auto z-[5] ${isOwnMessage ? '-right-12' : '-left-12'}`}
            >
              <div className='pb-1'>
                <div className='bg-background border rounded-full shadow-lg px-2 py-1.5 flex items-center gap-1 whitespace-nowrap'>
                  {/* 6 quick reactions */}
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickReaction(emoji);
                      }}
                      className='flex h-8 w-8 items-center justify-center rounded-full text-lg transition-colors hover:bg-muted'
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}

                  {/* Plus button to open full picker */}
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullPicker(true);
                      }}
                      className='flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted border-l ml-1'
                      title='More reactions'
                    >
                      <Plus className='h-4 w-4' />
                    </button>
                  </PopoverTrigger>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full emoji picker popover using Frimousse */}
        <PopoverContent
          className='w-fit p-0'
          align='center'
          side='top'
          sideOffset={8}
        >
          <EmojiPicker className='h-[342px]' onEmojiSelect={handleEmojiSelect}>
            <EmojiPickerSearch />
            <EmojiPickerContent />
            <EmojiPickerFooter />
          </EmojiPicker>
        </PopoverContent>
      </Popover>
    </div>
  );
}
