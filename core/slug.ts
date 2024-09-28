// deno-lint-ignore no-explicit-any
export type Matches = Record<string, string>;

export class Slug {
  raw: string;

  constructor(slugFromPath: string) {
    this.raw = slugFromPath.slice(1, -1);
  }

  static isSlug(part: string): boolean {
    return part.startsWith("[") && part.endsWith("]") && part.length > 2;
  }

}
