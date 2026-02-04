import { useEffect } from 'react';
import { useStoreSettings } from './useStoreSettings';

/**
 * Hook to dynamically update page title, favicon, and meta tags
 * based on store settings from the database
 */
export function useDynamicMeta() {
  const { data: settings } = useStoreSettings();

  useEffect(() => {
    if (!settings) return;

    // Update document title
    if (settings.store_name) {
      document.title = settings.store_name;
    }

    // Update favicon
    if (settings.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }

    // Update meta description
    if (settings.meta_description) {
      let meta = document.querySelector<HTMLMetaElement>("meta[name='description']");
      if (meta) {
        meta.content = settings.meta_description;
      }
    }

    // Update OG tags
    if (settings.store_name) {
      const ogTitle = document.querySelector<HTMLMetaElement>("meta[property='og:title']");
      if (ogTitle) {
        ogTitle.content = settings.store_name;
      }
    }

    if (settings.meta_description) {
      const ogDesc = document.querySelector<HTMLMetaElement>("meta[property='og:description']");
      if (ogDesc) {
        ogDesc.content = settings.meta_description;
      }
    }

    if (settings.banner_url) {
      const ogImage = document.querySelector<HTMLMetaElement>("meta[property='og:image']");
      if (ogImage) {
        ogImage.content = settings.banner_url;
      }
      
      const twitterImage = document.querySelector<HTMLMetaElement>("meta[name='twitter:image']");
      if (twitterImage) {
        twitterImage.content = settings.banner_url;
      }
    }
  }, [settings]);

  return settings;
}
