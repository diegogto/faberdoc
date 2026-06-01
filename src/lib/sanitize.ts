/**
 * Simple and robust HTML sanitizer to prevent XSS (cross-site scripting) injections.
 * It permits only a specific list of formatting tags: b, i, u, p, br, ul, ol, li, h1, h2, h3.
 * It strips all scripts, style blocks, iframe/embed tags, and any event handler attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return "";

  // 1. Remove script blocks entirely
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // 2. Remove style blocks entirely
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // 3. Remove other dangerous tags like iframe, object, embed, applet, meta, link, form
  clean = clean.replace(/<(?:iframe|object|embed|applet|meta|link|form|input|button|textarea)\b[^>]*>/gi, "");
  clean = clean.replace(/<\/(?:iframe|object|embed|applet|meta|link|form|input|button|textarea)>/gi, "");

  // 4. Clean attributes inside allowed tags:
  // We match tags and clean their attributes. We strip any event handler starting with "on" (e.g. onclick)
  // and any href/src containing "javascript:".
  clean = clean.replace(/<([a-z1-3]+)(\s+[^>]*)?>/gi, (match, tagName, attributes) => {
    const allowedTags = ["b", "i", "u", "p", "br", "ul", "ol", "li", "h1", "h2", "h3"];
    if (!allowedTags.includes(tagName.toLowerCase())) {
      // If tag is not allowed, strip it entirely
      return "";
    }

    if (!attributes) {
      return `<${tagName}>`;
    }

    // Filter attributes to allow only safe ones, stripping event handlers and javascript URIs
    let cleanAttrs = attributes.replace(/\s*on[a-z]+\s*=\s*(['"][^'"]*['"]|[^\s>]+)/gi, "");
    cleanAttrs = cleanAttrs.replace(/href\s*=\s*(['"]\s*javascript:[^'"]*['"]|javascript:[^\s>]+)/gi, "");
    cleanAttrs = cleanAttrs.replace(/src\s*=\s*(['"]\s*javascript:[^'"]*['"]|javascript:[^\s>]+)/gi, "");

    return `<${tagName}${cleanAttrs}>`;
  });

  // Also clean closing tags for unallowed elements
  clean = clean.replace(/<\/([a-z1-3]+)>/gi, (match, tagName) => {
    const allowedTags = ["b", "i", "u", "p", "br", "ul", "ol", "li", "h1", "h2", "h3"];
    return allowedTags.includes(tagName.toLowerCase()) ? `</${tagName}>` : "";
  });

  return clean.trim();
}
