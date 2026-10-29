import DOMPurify from "dompurify";
export function plain(html: string) {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}
