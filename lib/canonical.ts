const FIELD_ALIASES: Record<string, string> = {
  type: "source",
  itemtype: "item",
  dollar_vallue: "dollar_value",
};

export function canonicalFieldName(fieldName: string) {
  return FIELD_ALIASES[fieldName] ?? fieldName;
}

export function splitTextList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function containsAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}
