import type { HTMLTemplater } from "@md/html-templater";

export class HTMLTemplaterError extends Error {
  constructor(public readonly htmlTemplater: HTMLTemplater, message: string) {
    super(`HTMLTemplater Error: ${message}`);
    this.name = "HTMLTemplaterError";
  }
}
