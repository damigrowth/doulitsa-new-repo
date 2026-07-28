import fs from 'fs/promises';
import path from 'path';
import prettier from 'prettier';

/**
 * Shared function to format taxonomy files with Prettier
 * Ensures consistent formatting across all taxonomy files
 */
export async function formatTaxonomyFile(
  taxonomies: any[],
  exportVariableName: string,
  headerComments: string[],
): Promise<string> {
  const timestamp = new Date().toISOString();
  const header = `// Generated on ${timestamp}
${headerComments.join('\n')}

`;

  // Generate unformatted content
  const unformattedContent = `${header}export const ${exportVariableName} = ${JSON.stringify(taxonomies, null, 2)};`;

  // Format with Prettier using explicit config matching .prettierrc
  try {
    const prettierConfigPath = path.join(process.cwd(), '.prettierrc');
    const configExists = await fs
      .access(prettierConfigPath)
      .then(() => true)
      .catch(() => false);

    let prettierConfig: prettier.Options;
    if (configExists) {
      const configContent = await fs.readFile(prettierConfigPath, 'utf-8');
      prettierConfig = JSON.parse(configContent);
    } else {
      // Fallback config matching project style
      prettierConfig = {
        parser: 'typescript',
        singleQuote: true,
        trailingComma: 'all',
        tabWidth: 2,
        semi: true,
      };
    }

    const formatted = await prettier.format(unformattedContent, {
      ...prettierConfig,
      parser: 'typescript',
    });

    return formatted;
  } catch (error) {
    // Fallback to manual formatting if Prettier fails
    const dataString = JSON.stringify(taxonomies, null, 2)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, "'");
    return `${header}export const ${exportVariableName} = ${dataString};\n`;
  }
}
