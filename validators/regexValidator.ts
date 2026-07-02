export function matchesExpectedRegex(actual: string, expected: string): boolean {
  const regex = new RegExp(expected);

  return regex.test(actual);
}
