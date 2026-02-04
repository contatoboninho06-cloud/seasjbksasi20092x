import { useDynamicMeta } from '@/hooks/useDynamicMeta';

/**
 * Component that updates document meta tags based on store settings
 * Renders nothing - just applies side effects
 */
export function DynamicMetaProvider() {
  useDynamicMeta();
  return null;
}
