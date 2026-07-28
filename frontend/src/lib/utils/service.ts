/**
 * SERVICE UTILITY FUNCTIONS
 * Helper functions for service-related operations
 */

/**
 * Format service type JSON object into readable labels
 * Converts boolean flags into Greek labels matching create service flow
 *
 * @param type - Service type object with boolean flags
 * @returns Array of formatted type labels
 *
 * @example
 * formatServiceType({ presence: true, online: false, onsite: true, onbase: false, oneoff: false, subscription: false })
 * // Returns: ['Στον χώρο του πελάτη']
 *
 * @example
 * formatServiceType({ presence: true, online: false, onsite: true, onbase: true, oneoff: false, subscription: false })
 * // Returns: ['Στον χώρο του πελάτη', 'Στον χώρο μου']
 */
export function formatServiceType(type: AppJson.ServiceType): string[] {
  const types: string[] = [];

  // Presence-based services (physical location)
  if (type.presence) {
    if (type.onsite) {
      types.push('Στον χώρο του πελάτη');
    }
    if (type.onbase) {
      types.push('Στον χώρο μου');
    }
  }

  // Online services
  if (type.online) {
    if (type.oneoff) {
      types.push('Online - Μία φορά');
    }
    if (type.subscription) {
      types.push('Online - Συνδρομή');
    }
  }

  return types.length > 0 ? types : ['N/A'];
}
