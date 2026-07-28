import { TaxonomyCreatePage } from '@/components/admin/taxonomy-create-page';
import { CreateSkillForm } from '@/components/admin/forms/create-skill-form';
import { getTaxonomyData } from '@/actions/admin/taxonomy-helpers';
import { isSuccess } from '@/lib/types/server-actions';

export const dynamic = 'force-dynamic';

export default async function CreateSkillPage() {
  // Fetch taxonomy data from Git
  const skillsResult = await getTaxonomyData('skills');
  const proResult = await getTaxonomyData('pro-categories');

  if (!isSuccess(skillsResult)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{skillsResult.error.message}</p>
      </div>
    );
  }

  if (!isSuccess(proResult)) {
    return (
      <div className="p-4">
        <h1 className="text-lg font-semibold text-destructive">Error</h1>
        <p className="text-sm text-muted-foreground">{proResult.error.message}</p>
      </div>
    );
  }

  const skills = skillsResult.data;
  const proTaxonomies = proResult.data;

  return (
    <TaxonomyCreatePage
      title='Create Skill'
      backPath='/admin/taxonomies/skills'
      backLabel='Back to Skills'
      description='Add a new skill with label, slug, and optional category'
    >
      <CreateSkillForm existingItems={skills} categories={proTaxonomies} />
    </TaxonomyCreatePage>
  );
}
