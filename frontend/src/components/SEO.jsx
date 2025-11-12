import { useEffect } from 'react';

const ensureMeta = (name, attr, content) => {
  let el = document.querySelector(`meta[${name}="${attr}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(name, attr);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const ensureLink = (rel, href) => {
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

export default function SEO({
  title,
  description,
  image = '/app-icon.png',
  url,
}) {
  useEffect(() => {
    const currentUrl = url || window.location.origin + window.location.pathname;
    const fullTitle = title ? `${title} | Money Keeper` : 'Money Keeper - Quản lý Chi tiêu Thông minh';
    document.title = fullTitle;
    if (description) {
      ensureMeta('name', 'description', description);
    }
    // Canonical
    ensureLink('canonical', currentUrl);
    // Open Graph
    ensureMeta('property', 'og:title', fullTitle);
    if (description) ensureMeta('property', 'og:description', description);
    ensureMeta('property', 'og:type', 'website');
    ensureMeta('property', 'og:image', image);
    ensureMeta('property', 'og:url', currentUrl);
    ensureMeta('property', 'og:site_name', 'Money Keeper');
    ensureMeta('property', 'og:locale', 'vi_VN');
    // Twitter
    ensureMeta('name', 'twitter:card', 'summary_large_image');
    ensureMeta('name', 'twitter:title', fullTitle);
    if (description) ensureMeta('name', 'twitter:description', description);
    ensureMeta('name', 'twitter:image', image);
  }, [title, description, image, url]);
  return null;
}


