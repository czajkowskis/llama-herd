export interface CatalogItem {
  name: string;
  tag: string;
  size?: number;
  family: string;
  quant?: string;
  description?: string;
  notes?: string;
  pullCount?: number; // camelCase for TypeScript
  pull_count?: number; // snake_case from backend
  lastUpdated?: string;
}

/**
 * Derives a human-readable model name from a tag
 * @param tag - The model tag (e.g., "llama2:7b", "codellama:13b")
 * @returns A formatted model name
 */
export function deriveModelName(tag: string): string {
  if (!tag) return 'Unknown Model';
  
  // Handle tags like "llama2:7b" -> "Llama 2 7B"
  const parts = tag.split(':');
  if (parts.length >= 2) {
    const baseName = parts[0];
    const variant = parts[1];
    
    // Convert to title case and handle common patterns
    const formattedBase = baseName
      .split(/(?=[A-Z])/)
      .join(' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    const formattedVariant = variant
      .replace(/(\d+)([a-zA-Z]+)/, '$1 $2')
      .toUpperCase();
    
    return `${formattedBase} ${formattedVariant}`;
  }
  
  // Fallback: just capitalize the tag
  return tag
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Groups models by their base name (e.g., "llama2", "codellama")
 * @param models - Array of catalog items
 * @returns Object with base names as keys and arrays of models as values
 */
export function groupModelsByBaseName(models: CatalogItem[]): Record<string, CatalogItem[]> {
  const groups: Record<string, CatalogItem[]> = {};
  
  models.forEach(model => {
    const baseName = model.tag.split(':')[0] || 'unknown';
    
    if (!groups[baseName]) {
      groups[baseName] = [];
    }
    
    groups[baseName].push(model);
  });
  
  // Sort models within each group by size (largest first), handling undefined sizes
  Object.keys(groups).forEach(baseName => {
    groups[baseName].sort((a, b) => {
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      return sizeB - sizeA;
    });
  });
  
  return groups;
}

/**
 * Filters models based on search criteria
 * @param models - Array of catalog items
 * @param query - Search query
 * @param family - Model family filter
 * @param quant - Quantization filter
 * @returns Filtered array of models
 */
export function filterModels(
  models: CatalogItem[],
  query: string = '',
  family: string = '',
  quant: string = ''
): CatalogItem[] {
  return models.filter(model => {
    // Text search
    if (query) {
      const searchLower = query.toLowerCase();
      const matchesQuery = 
        model.name.toLowerCase().includes(searchLower) ||
        model.tag.toLowerCase().includes(searchLower) ||
        model.description?.toLowerCase().includes(searchLower) ||
        deriveModelName(model.tag).toLowerCase().includes(searchLower);
      
      if (!matchesQuery) return false;
    }
    
    // Family filter
    if (family && model.family !== family) {
      return false;
    }
    
    // Quantization filter
    if (quant && model.quant !== quant) {
      return false;
    }
    
    return true;
  });
}

/**
 * Gets unique families from a list of models
 * @param models - Array of catalog items
 * @returns Array of unique family names
 */
export function getUniqueFamilies(models: CatalogItem[]): string[] {
  const families = new Set(models.map(model => model.family));
  return Array.from(families).sort();
}

/**
 * Gets unique quantizations from a list of models
 * @param models - Array of catalog items
 * @returns Array of unique quantization types
 */
export function getUniqueQuantizations(models: CatalogItem[]): string[] {
  const quants = new Set(models.map(model => model.quant).filter((quant): quant is string => Boolean(quant)));
  return Array.from(quants).sort();
}
