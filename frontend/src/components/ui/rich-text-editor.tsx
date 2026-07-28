'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { stripHtmlTags } from '@/lib/utils/text/html';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Undo,
  Redo,
  ImagePlus,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxLength?: number;
  disabled?: boolean;
  className?: string;
  onInsertImage?: (insertFn: (url: string) => void) => void;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = '120px',
  maxLength,
  disabled = false,
  className,
  onInsertImage,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
        strike: false,
      }),
      ...(onInsertImage ? [Image.configure({ inline: false })] : []),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'outline-none',
        'data-placeholder': placeholder || '',
      },
    },
  });

  // Sync external value changes (e.g. form reset)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const charCount = editor
    ? stripHtmlTags(editor.getHTML()).length
    : stripHtmlTags(value).length;

  if (!editor) {
    return (
      <div
        className={cn(
          'w-full rounded-md border-2 border-input bg-white shadow',
          className,
        )}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div
      className={cn(
        'w-full rounded-md border-2 border-input bg-white shadow focus-within:ring-1 focus-within:ring-ring',
        disabled && 'cursor-not-allowed opacity-25',
        className,
      )}
    >
      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1.5'>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={disabled}
          title='Έντονα'
        >
          <Bold className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={disabled}
          title='Πλάγια'
        >
          <Italic className='h-4 w-4' />
        </ToolbarButton>

        <div className='w-px h-5 bg-border mx-1' />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          active={editor.isActive('heading', { level: 2 })}
          disabled={disabled}
          title='Επικεφαλίδα 2'
        >
          <Heading2 className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          active={editor.isActive('heading', { level: 3 })}
          disabled={disabled}
          title='Επικεφαλίδα 3'
        >
          <Heading3 className='h-4 w-4' />
        </ToolbarButton>

        <div className='w-px h-5 bg-border mx-1' />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          disabled={disabled}
          title='Λίστα'
        >
          <List className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          disabled={disabled}
          title='Αριθμημένη λίστα'
        >
          <ListOrdered className='h-4 w-4' />
        </ToolbarButton>

        <div className='w-px h-5 bg-border mx-1' />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={disabled || !editor.can().undo()}
          title='Αναίρεση'
        >
          <Undo className='h-4 w-4' />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={disabled || !editor.can().redo()}
          title='Επανάληψη'
        >
          <Redo className='h-4 w-4' />
        </ToolbarButton>

        {onInsertImage && (
          <>
            <div className='w-px h-5 bg-border mx-1' />
            <ToolbarButton
              onClick={() =>
                onInsertImage((url) =>
                  editor.chain().focus().setImage({ src: url }).run(),
                )
              }
              disabled={disabled}
              title='Εισαγωγή εικόνας'
            >
              <ImagePlus className='h-4 w-4' />
            </ToolbarButton>
          </>
        )}
      </div>

      {/* Editor Content */}
      <div
        className='rich-text-editor'
        style={{ minHeight }}
        onClick={() => editor.chain().focus().run()}
      >
        <EditorContent editor={editor} className='px-3 py-2 text-base md:text-sm' />
      </div>

      {/* Character Count */}
      {maxLength !== undefined && (
        <div className='px-3 pb-2 text-xs text-gray-500'>
          {charCount}/{maxLength} χαρακτήρες
        </div>
      )}
    </div>
  );
}
