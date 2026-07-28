export function generateSitemapXml(urls) {
  // Shared helper function to generate sitemap XML structure
  /**
   * Generates the XML content for a sitemap URL set, including only loc and lastmod.
   * @param {Array<{url: string, lastModified: Date}>} urls - Array of URL objects.
   * @returns {string} - The generated XML string.
   */
  const urlEntries = urls
    .map(
      // Only include loc and lastmod
      ({ url, lastModified }) => `
  <url>
    <loc>${url}</loc>
    <lastmod>${lastModified.toISOString()}</lastmod>
  </url>`,
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}
