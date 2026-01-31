
export function getTopElementInnerHTML(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const topElement = doc.body.firstElementChild;
  if (!topElement) return "";

  return topElement.innerHTML.trim();
}

type AttributeResult = {
  attributeValue: string;
  elementId: string | null;
};

type Output = Record<string, AttributeResult[]>;

export function extractMultipleAttributes(
  html: string,
  attributes: string[]
): Output {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const result: Output = {};

  for (const attr of attributes) {
    const elements = Array.from(doc.querySelectorAll(`[${attr}]`));

    result[attr] = elements.map(el => ({
      attributeValue: el.getAttribute(attr) || "",
      elementId: el.getAttribute("id")
    }));
  }

  return result;
}

export type IndexRecord = {
  index: string;
  [key: string]: any;
};

// wrote this function to enable tracking functionality in indices tab of the SEctoral pulse 
export function findIndexName(
  data: IndexRecord[],
  search: string
): string | null {
  const term = search.trim().toLowerCase();

  const match = data.find(item =>
    item.index.trim().toLowerCase() === term
  );

  return match ? match.index : null;
}
