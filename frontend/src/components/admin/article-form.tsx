'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createArticleSchema } from '@/lib/validations/blog';
import { createSlug } from '@/lib/utils/text/slug';
import {
  createArticle,
  updateArticle,
  deleteArticle,
} from '@/actions/blog/manage-articles';
import { getMediaLibraryToken } from '@/actions/cloudinary/get-media-library-token';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { CloudinaryMediaPicker } from '@/components/media/cloudinary-media-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LazyCombobox,
  type LazyComboboxOption,
} from '@/components/ui/lazy-combobox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';

type CreateInput = z.input<typeof createArticleSchema>;

interface ArticleFormProps {
  article?: any;
  categories: any[];
  profileOptions: LazyComboboxOption[];
}

export function ArticleForm({
  article,
  categories,
  profileOptions,
}: ArticleFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const imageInsertFnRef = useRef<((url: string) => void) | null>(null);
  const mlRef = useRef<any>(null);

  async function handleInsertImage(insertFn: (url: string) => void) {
    imageInsertFnRef.current = insertFn;

    if (!window.cloudinary) {
      toast.error('Cloudinary δεν έχει φορτωθεί. Δοκιμάστε ξανά.');
      return;
    }

    const result = await getMediaLibraryToken();
    if (!result.success || !result.data) {
      toast.error('Σφάλμα αυθεντικοποίησης Cloudinary');
      return;
    }

    const { signature, timestamp, apiKey, cloudName } = result.data;

    if (mlRef.current) {
      mlRef.current.hide();
    }

    mlRef.current = window.cloudinary.createMediaLibrary(
      {
        cloud_name: cloudName,
        api_key: apiKey,
        timestamp,
        signature,
        multiple: false,
        max_files: 1,
      },
      {
        insertHandler: (data: any) => {
          const url = data.assets?.[0]?.secure_url;
          if (url && imageInsertFnRef.current) {
            imageInsertFnRef.current(url);
          }
        },
      },
    );

    mlRef.current.show();
  }

  const isEditing = !!article;

  const form = useForm<CreateInput>({
    resolver: zodResolver(createArticleSchema),
    defaultValues: {
      title: article?.title || '',
      slug: article?.slug || '',
      excerpt: article?.excerpt || '',
      content: article?.content || '',
      coverImage: article?.coverImage || null,
      categorySlug: article?.categorySlug || '',
      authorProfileIds: article?.authors?.map((a: any) => a.profileId) || [],
      status: article?.status || 'draft',
      featured: article?.featured || false,
    },
  });

  function onSubmit(data: CreateInput) {
    startTransition(async () => {
      try {
        let result;
        if (isEditing) {
          result = await updateArticle({ id: article.id, ...data });
        } else {
          result = await createArticle({
            ...data,
            status: data.status ?? 'draft',
            featured: data.featured ?? false,
          });
        }

        if (result.success) {
          toast.success(
            isEditing
              ? 'Το άρθρο ενημερώθηκε επιτυχώς'
              : 'Το άρθρο δημιουργήθηκε επιτυχώς',
          );
          router.push('/admin/articles');
          router.refresh();
        } else {
          toast.error(result.error || 'Σφάλμα αποθήκευσης');
        }
      } catch (e) {
        toast.error('Unexpected error');
      }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteArticle(article.id);
      if (result.success) {
        toast.success('Το άρθρο διαγράφηκε');
        router.push('/admin/articles');
        router.refresh();
      } else {
        toast.error(result.error || 'Σφάλμα διαγραφής');
      }
      setShowDeleteDialog(false);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        {/* Header */}
        <div className='mb-4'>
          <h1 className='text-2xl font-bold text-gray-900'>
            {article ? 'Επεξεργασία Άρθρου' : 'Δημιουργία Άρθρου'}
          </h1>
          <p className='text-gray-600 mt-1'>
            {article
              ? 'Επεξεργαστείτε τα στοιχεία του άρθρου'
              : 'Δημιουργήστε ένα νέο άρθρο για το blog'}
          </p>
        </div>

        {/* Title */}
        <FormField
          control={form.control}
          name='title'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Τίτλος *</FormLabel>
              <FormControl>
                <Input
                  placeholder='Τίτλος άρθρου'
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value);
                    // Auto-generate slug from title if slug is empty or matches previous auto-slug
                    const currentSlug = form.getValues('slug');
                    const previousTitle = field.value || '';
                    if (
                      !currentSlug ||
                      currentSlug === createSlug(previousTitle)
                    ) {
                      form.setValue('slug', createSlug(value));
                    }
                  }}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Slug */}
        <FormField
          control={form.control}
          name='slug'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder='article-slug'
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                URL-friendly αναγνωριστικό (δημιουργείται αυτόματα από τον τίτλο)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Excerpt */}
        <FormField
          control={form.control}
          name='excerpt'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Περίληψη</FormLabel>
              <FormControl>
                <Textarea
                  placeholder='Σύντομη περιγραφή του άρθρου'
                  rows={3}
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Content (Rich Text) */}
        <FormField
          control={form.control}
          name='content'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Περιεχόμενο *</FormLabel>
              <FormControl>
                <RichTextEditor
                  value={field.value}
                  onChange={(html) => field.onChange(html)}
                  placeholder='Γράψτε το περιεχόμενο του άρθρου...'
                  minHeight='300px'
                  onInsertImage={handleInsertImage}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Cover Image */}
        <FormField
          control={form.control}
          name='coverImage'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Εικόνα Εξωφύλλου</FormLabel>
              <FormControl>
                <CloudinaryMediaPicker
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name='categorySlug'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Κατηγορία *</FormLabel>
              <FormControl>
                <LazyCombobox
                  options={categories.map((cat: any) => ({
                    id: cat.slug,
                    label: cat.label,
                  }))}
                  value={field.value}
                  onSelect={(option) => field.onChange(option.id)}
                  onClear={() => field.onChange('')}
                  clearable
                  placeholder='Επιλέξτε κατηγορία...'
                  searchPlaceholder='Αναζήτηση κατηγορίας...'
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Author Profiles */}
        <FormField
          control={form.control}
          name='authorProfileIds'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Συγγραφείς</FormLabel>
              <FormControl>
                <LazyCombobox
                  trigger='search'
                  multiple
                  options={profileOptions}
                  values={field.value || []}
                  onSelect={() => {}}
                  onMultiSelect={(selected) =>
                    field.onChange(selected.map((o) => o.id))
                  }
                  placeholder='Αναζήτηση προφίλ...'
                  searchPlaceholder='Αναζήτηση προφίλ...'
                  formatLabel={(option) => (
                    <div className='flex items-center gap-3'>
                      <Avatar className='h-6 w-6'>
                        <AvatarImage src={option.image || ''} />
                        <AvatarFallback>
                          {(option.label || 'U')[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className='flex flex-col'>
                        <span className='font-medium'>{option.label}</span>
                        {option.email && (
                          <span className='text-xs text-muted-foreground'>
                            {option.email}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Προαιρετικό. Αν δεν επιλεχθεί συγγραφέας, θα εμφανίζεται το "Doulitsa Team".
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status + Featured row */}
        <div className='flex flex-wrap gap-6'>
          <FormField
            control={form.control}
            name='status'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Κατάσταση</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value='draft'>Πρόχειρο</SelectItem>
                    <SelectItem value='pending'>Υπό Έλεγχο</SelectItem>
                    <SelectItem value='published'>Δημοσιευμένο</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='featured'
            render={({ field }) => (
              <FormItem>
                <FormLabel>Featured</FormLabel>
                <div className='flex items-center gap-2 pt-1'>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isPending}
                    />
                  </FormControl>
                  <span className='text-sm text-muted-foreground'>
                    {field.value ? 'Ναι' : 'Όχι'}
                  </span>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => router.push('/admin/articles')}
          >
            Ακύρωση
          </Button>
          <Button type='submit' disabled={isPending}>
            {isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isEditing ? 'Αποθήκευση' : 'Δημιουργία'}
          </Button>
        </div>
      </form>

      {/* Delete - below the form */}
      {isEditing && (
        <section className='pt-5'>
          <Button
            type='button'
            variant='black'
            size='lg'
            className='w-full sm:w-auto'
            onClick={() => setShowDeleteDialog(true)}
            disabled={isPending}
          >
            Διαγραφή άρθρου
          </Button>
        </section>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Διαγραφή Άρθρου</AlertDialogTitle>
            <AlertDialogDescription>
              Αυτή η ενέργεια δεν μπορεί να αναιρεθεί. Το άρθρο θα διαγραφεί
              οριστικά.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending}>
              {isPending && <Loader2 className='h-4 w-4 animate-spin mr-2' />}
              Διαγραφή
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
