export function nid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
