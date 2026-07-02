export function containsExpectedEntity(actual: string, entity?: string): boolean {
  if (entity === undefined) {
    return true;
  }

  return actual.toLocaleLowerCase().includes(entity.toLocaleLowerCase());
}
