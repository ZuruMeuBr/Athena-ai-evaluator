export function estimateTokens(text: string): number {
  const normalizedText = text.trim();

  if (normalizedText === "") {
    return 0;
  }

  return Math.max(1, Math.ceil(normalizedText.length / 4));
}
