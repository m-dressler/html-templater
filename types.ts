/** Helper utility for a value or array of the value */
export type MaybeArray<T> = T | ReadonlyArray<T>;
/** Helper utility that makes T partial if it's a {@link CSSStyleDeclaration} */
type PartialIfStylesheet<T> = T extends CSSStyleDeclaration ? Partial<T> : T;
/** Helper utility for all valid HTML tag names*/
type HTMLElementTags = keyof HTMLElementTagNameMap;
/** Helper utility for all specific HTML Element types */
type AnyHTMLElement = HTMLElementTagNameMap[HTMLElementTags];

/**
 * Allows for either the type of value directly or a mapper function taking the existing value and modifying it.
 *
 * If `null` is provided, the attribute will be removed.
 *
 * @example
 * ```ts
 * const mappers: Record<string, TemplateAttributeChange<string | CSSStyleDeclaration>> = {
 *   textContent: "Hello World",
 *   style: (v) => ({ ...v, color: "red" }),
 * }
 */
export type TemplateAttributeChange<T> =
  | PartialIfStylesheet<T>
  | ((previous: T) => PartialIfStylesheet<T>)
  | null;

/**
 * Maps HTML element attributes to their respective mapper functions or values.
 *
 * @example
 * ```ts
 * const attributeMapper: TemplateAttributeMapper<HTMLImageElement> = {
 *   src: "image.png",
 *   alt: (v) => v + " - Updated",
 *   style: { width: "100px", height: "100px" },
 * }
 * ```
 */
export type TemplateAttributeMapper<T extends AnyHTMLElement> =
  & { [attr in keyof T]?: TemplateAttributeChange<T[attr]> }
  & // Include data-* attributes
  { [attr: `data-${string}`]: TemplateAttributeChange<string> }
  & // Allow any additional attributes as unknowns
  { [additional: string]: TemplateAttributeChange<unknown> };

/**
 * Maps query selectors to their respective attribute mappers.
 *
 * @example
 * ```ts
 * const elementMappers: TemplateElementMapper = {
 *   img: { src: "image.png", alt: "An image" },
 *   h2: { textContent: (v) => v + " - Updated" },
 *   ".my-class": { style: { color: "blue" } },
 * }
 * ```
 */
export type TemplateElementMapper =
  & {
    [tag in HTMLElementTags]?: TemplateAttributeMapper<
      HTMLElementTagNameMap[tag]
    >;
  }
  & { [querySelector: string]: TemplateAttributeMapper<HTMLElement> };
