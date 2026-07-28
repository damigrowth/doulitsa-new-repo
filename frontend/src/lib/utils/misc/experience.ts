/**
 * Get years of experience from stored value or calculated from commencement
 * @param commencement - Year when business/professional activity started
 * @param experience - Stored experience value (optional)
 * @returns Years of experience or null if cannot be determined
 */
export const getYearsOfExperience = (
  commencement: string | number | null | undefined,
  experience?: number | null
): number | null => {
  // Prefer stored experience if available
  if (experience !== null && experience !== undefined) {
    return experience;
  }

  // Fallback: Calculate from commencement
  if (!commencement) return null;

  const currentYear = new Date().getFullYear();
  return currentYear - parseInt(String(commencement));
};
