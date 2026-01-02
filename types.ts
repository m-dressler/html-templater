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
export type TemplateAttributeChange<Input, Output = Input> =
  | PartialIfStylesheet<Output>
  | ((previous: Input) => PartialIfStylesheet<Output>)
  | null;

/**
 * Maps HTML element attributes to their respective {@link TemplateAttributeChange} or values.
 *
 * If null is provided, the element will be removed. If string is provided, textContents will be set.
 *
 * The `classList` attribute is handled in the following ways, given what's provided:
 *  - `string[]`: All values get **appended**
 *  - `{[className: string]: boolean }`: True values get added, false get removed, unspecified remain unchanged
 *  - `(prev: DOMTokenList) => DOMTokenList | ...`: Can modify (and return) existing list, create and return new list, or return any of the above values
 *
 * The `eventListeners` attribute allows attaching event listeners with proper event type inference:
 *  - Standard events like `click`, `input`, `keydown` are typed with their specific event types
 *  - Custom events fall back to generic `Event` type
 *
 * @example
 * ```ts
 * const attributeMapper: TemplateAttributeMapper<HTMLImageElement> = {
 *   src: "image.png",
 *   alt: (v) => v + " - Updated",
 *   style: { width: "100px", height: "100px" },
 *   eventListeners: { click: (e) => console.log(e.clientX) },
 * }
 * ```
 */
export type TemplateAttributeMapper<T extends AnyHTMLElement> =
  | (
    & {
      [attr in Exclude<keyof T, "classList">]?: TemplateAttributeChange<
        T[attr]
      >;
    }
    & // Include data-* attributes
    { [attr: `data-${string}`]: TemplateAttributeChange<string> }
    & // Allow any additional attributes as unknowns
    { [additional: string]: TemplateAttributeChange<unknown> }
    & // Additional separately handled properties
    {
      // classList is handled as a string[]
      classList?: TemplateAttributeChange<
        DOMTokenList,
        DOMTokenList | string[] | { [className: string]: boolean }
      >;
      // Event listeners to attach
      eventListeners?: {
        [K in keyof HTMLElementEventMap]?: (
          event: HTMLElementEventMap[K],
        ) => unknown;
      };
    }
  )
  | null
  | string
  | ((element: Element) => unknown);

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
