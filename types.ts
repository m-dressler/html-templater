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
 * Maps HTML element attributes to their respective {@link TemplateAttributeChange} or values.
 *
 * If null is provided, the element will be removed. If string is provided, textContents will be set.
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
  | (
    & { [attr in keyof T]?: TemplateAttributeChange<T[attr]> }
    & // Include data-* attributes
    { [attr: `data-${string}`]: TemplateAttributeChange<string> }
    & // Allow any additional attributes as unknowns
    { [additional: string]: TemplateAttributeChange<unknown> }
  )
  | null
  | string;

/**
 * Maps query selectors to their respective {@link TemplateAttributeMapper}.
 *
 * @example
 * ```ts
 * const elementMappers: TemplateElementMapper = {
 *   img: { src: "image.png", alt: "An image" },
 *   h2: { textContent: (v) => v + " - Updated" },
 *   ".my-class": { style: { color: "blue" } },
 *  ".to-remove": null,
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
