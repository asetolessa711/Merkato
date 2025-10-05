import { useEffect } from 'react';

/**
 * Lightweight SEO head manager.
 * - Sets document.title when provided
 * - Ensures a single <link rel="canonical"> exists with the provided href
 */
export default function SeoHead({ title, canonical, ogImage, twitterImage }) {
  useEffect(() => {
    try {
      if (title) document.title = title;
    } catch (_) {}
  }, [title]);

  useEffect(() => {
    try {
      if (!canonical) return;
      const head = document.head || document.getElementsByTagName('head')[0];
      if (!head) return;
      let link = head.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    } catch (_) {}
  }, [canonical]);

  // Ensure exactly one og:image and twitter:image based on props
  useEffect(() => {
    const setMeta = (selector, attrs) => {
      try {
        const head = document.head || document.getElementsByTagName('head')[0];
        if (!head) return;
        let tag = head.querySelector(selector);
        if (!tag) {
          tag = document.createElement('meta');
          Object.entries(attrs).forEach(([k, v]) => tag.setAttribute(k, v));
          head.appendChild(tag);
        } else {
          // update only the content attribute; keep name/property
          if (attrs.content) tag.setAttribute('content', attrs.content);
        }
      } catch (_) {}
    };
    if (ogImage) setMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage });
    if (twitterImage) setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: twitterImage });
  }, [ogImage, twitterImage]);

  return null;
}
