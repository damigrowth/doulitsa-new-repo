'use client';

import { createSkillSchema, type CreateSkillInput } from '@/lib/validations/admin';
import { createSkillAction } from '@/actions/admin/skills';
import { TaxonomyFormWrapper } from './taxonomy-form-wrapper';
import { LabelField, SlugField, CategoryField } from './taxonomy-form-fields';
import { useSlugHandlers } from './use-slug-handlers';
import type { DatasetItem } from '@/lib/types/datasets';
import type { UseFormReturn } from 'react-hook-form';

interface CreateSkillFormProps {
  existingItems: DatasetItem[];
  categories: DatasetItem[];
}

// Separate component to handle form fields with hooks
function CreateSkillFormFields({
  form,
  isPending,
  existingItems,
  categories,
}: {
  form: UseFormReturn<CreateSkillInput>;
  isPending: boolean;
  existingItems: DatasetItem[];
  categories: DatasetItem[];
}) {
  const { handleLabelChange, handleSlugRegenerate } = useSlugHandlers(form);

  return (
    <>
      <LabelField
        form={form}
        isPending={isPending}
        onLabelChange={handleLabelChange}
        placeholder='Enter skill label'
        description='The display name for this skill'
      />

      <SlugField
        form={form}
        isPending={isPending}
        placeholder='skill-slug'
        description='The URL-friendly identifier for this skill (auto-generated from label)'
        existingItems={existingItems}
        onRegenerate={handleSlugRegenerate}
      />

      <CategoryField
        form={form}
        isPending={isPending}
        categories={categories}
        label='Category'
        description='Select the professional category for this skill'
      />
    </>
  );
}

export function CreateSkillForm({ existingItems, categories }: CreateSkillFormProps) {
  return (
    <TaxonomyFormWrapper<CreateSkillInput>
      schema={createSkillSchema}
      action={createSkillAction}
      defaultValues={{
        label: '',
        slug: '',
        category: '',
      }}
      successMessage='Skill created'
      redirectPath='/admin/taxonomies/skills'
      stringFields={['label', 'slug', 'category']}
    >
      {(form, isPending) => (
        <CreateSkillFormFields
          form={form}
          isPending={isPending}
          existingItems={existingItems}
          categories={categories}
        />
      )}
    </TaxonomyFormWrapper>
  );
}
