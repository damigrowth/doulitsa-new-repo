import { TaxonomyEditPage } from '@/components/admin/taxonomy-edit-page';
import { EditSkillForm } from '@/components/admin/forms/edit-skill-form';
import { getSkills, getProTaxonomies } from '@/lib/taxonomies';

export const dynamic = 'force-dynamic';

interface SkillDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SkillDetailPage({
  params,
}: SkillDetailPageProps) {
  const { id } = await params;
  const skills = getSkills();

  return (
    <TaxonomyEditPage
      id={id}
      items={skills}
      entityName='Skill'
      backPath='/admin/taxonomies/skills'
      backLabel='Back to Skills'
      description='Update skill label, slug, and description'
      customFindItem={(items, id) => items.find((s) => s.id === id)}
    >
      {(skill) => (
        <EditSkillForm
          skill={skill}
          existingItems={skills}
          categories={getProTaxonomies()}
        />
      )}
    </TaxonomyEditPage>
  );
}
