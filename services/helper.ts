export function getTopElementInnerHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const topElement = doc.body.firstElementChild;
  if (!topElement) return "";

  return topElement.innerHTML.trim();
}
