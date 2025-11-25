import { HTMLTemplaterError } from "./html-templater-error.ts";
import type {
  MaybeArray,
  TemplateAttributeChange,
  TemplateAttributeMapper,
  TemplateElementMapper,
} from "./types.ts";

export { HTMLTemplaterError };
export type {
  TemplateAttributeChange,
  TemplateAttributeMapper,
  TemplateElementMapper,
};

/**
 * Wrap a {@link HTMLTemplateElement} with easy instantiation methods to substitute values.
 *
 * By default it appends directly to the parent of the template element, but this can be disabled in the constructor (see more in examples below).
 *
 * @example
 * ### Simple instantiation
 * ```ts
 * new HTMLTemplater("#my-template").instantiate(
 *   {
 *     img: { src: "image1.png", alt: "Image 1" },
 *     h2: { textContent: (v) => v + "(Title 2)" },
 *     "my-query-selector": { style: { animationName: "item-2" } },
 *   },
 *   {
 *     img: { src: "image2.png", alt: "Image 2" },
 *     h2: { textContent: (v) => v + "(Title 2)" },
 *     "my-query-selector": { style: { animationName: "item-2" } },
 *   },
 * );
 * ```
 *
 * @example
 * ### Mapped instantiation
 * ```ts
 * const array = new Array(10).fill(0).map((_, i) => i);
 * new HTMLTemplater("#my-template").instantiate(
 *   array.map((i) => ({
 *     img: { src: `image${i}.png`, alt: `Image ${i}` },
 *     h2: { textContent: (v) => v + `(Title ${i})` },
 *     "my-query-selector": { style: { animationName: "item-2" } },
 *   })),
 * );
 * ```
 *
 * @example
 * ### Type-safe templating
 * ```ts
 * type MyTemplateMapper = {
 *   img: { src: string; alt: string };
 *   h2: { textContent: AttributeMapper<string> };
 *   "my-query-selector": ElementMapper<HTMLDivElement>;
 * };
 * const templater = new HTMLTemplater<MyTemplateMapper>("#my-template");
 * templater.instantiate({
 *   img: { src: "imageX.png", alt: "Image X" },
 *   h2: { textContent: (v) => v + "(Title X)" },
 *   "my-query-selector": { style: { animationName: "item-X" } },
 * });
 * ```
 *
 * @example
 * ### Custom appending
 * ```ts
 * new HTMLTemplater("#my-template", { appendToParent: false })
 *  .instantiate({  h2: { textContent: "Hello World" } })
 *  .appendTo(document.getElementById("container")!);
 * ```
 */
export class HTMLTemplater<
  T extends TemplateElementMapper = TemplateElementMapper,
> {
  /** A list of all instances created from the template */
  public instances: ChildNode[] = [];
  /** The underlying `HTMLTemplateElement` */
  public readonly template: HTMLTemplateElement;
  /** The parent node of the {@link template} */
  public readonly parent: ParentNode | null;
  /** If the instances should directly be appended to {@link parent} */
  public readonly appendToParent: boolean;

  /**
   * @param template Either the template element or a selector string to find it
   * @param options
   * @param options.appendToParent Unless set to false, directly appends all instances to the templates parent.
   * @param options.removeFromDom Unless set to false, removes the template from the DOM only keeping the reference in this {@link HTMLTemplater}.
   */
  constructor(
    template: string | HTMLTemplateElement,
    options?: { appendToParent?: boolean; removeFromDom?: boolean },
  ) {
    const templateEl = typeof template === "string"
      ? document.querySelector<HTMLTemplateElement>(template)
      : template;
    if (!templateEl) {
      throw new HTMLTemplaterError(
        this,
        `Template with query selector "${template}" not found`,
      );
    }
    this.template = templateEl;

    this.parent = templateEl.parentElement;
    this.appendToParent = options?.appendToParent ?? true;
    if (this.appendToParent && !this.parent) {
      throw new HTMLTemplaterError(
        this,
        "`appendToParent` is true but template doesn't have a parent element",
      );
    }

    if (options?.removeFromDom !== false) this.template.remove();
  }

  /** Deeply applies all attributes from the {@link attributeMapper} to {@link el} */
  private applyAttributeMapper = (
    el: Element,
    attributeMapper: TemplateAttributeMapper<HTMLElement>,
  ): void => {
    for (const [attribute, value] of Object.entries(attributeMapper)) {
      // Handle mapper functions
      const resolvedValue = typeof value === "function"
        ? value(el[attribute as keyof Element] ?? el.getAttribute(attribute))
        : value;

      // Remove attribute if value is false or null/undefined
      if (resolvedValue === null) el.removeAttribute(attribute);
      // Handle nested objects (style, dataset)
      else if (
        (attribute === "style" || attribute === "dataset") &&
        typeof resolvedValue === "object" &&
        el instanceof HTMLElement
      ) {
        Object.assign(el[attribute], resolvedValue);
      } //  Update attribute directly if it exists on the element
      else if (attribute in el) {
        // @ts-expect-error TypeScript can't guarantee the attribute exists on the element
        el[attribute as keyof typeof el] = resolvedValue;
      } // Add attribute otherwise
      else el.setAttribute(attribute, String(resolvedValue));
    }
  };

  /** Clones the template and applies {@link mapper} to the clone */
  private createInstance(mapper: T): DocumentFragment {
    const clone = this.template.content.cloneNode(true) as DocumentFragment;

    // Apply all element mappers to the clone
    for (const [query, attributes] of Object.entries(mapper)) {
      clone
        .querySelectorAll(query)
        .forEach((el) => this.applyAttributeMapper(el, attributes));
    }

    return clone;
  }

  /** Creates a new instance(s) of the template and updates all the query selectors using the {@link TemplateElementMapper}(s). */
  public instantiate(...templateMappers: ReadonlyArray<MaybeArray<T>>): this {
    const fragments = (templateMappers.flat() as ReadonlyArray<T>).map(
      (mapper) => this.createInstance(mapper),
    );

    this.instances.push(...fragments.flatMap((f) => Array.from(f.childNodes)));
    if (this.appendToParent) this.parent?.append(...fragments);
    return this;
  }

  /** Appends all instances to the {@link parent} (can be query selector). Make sure to disable auto-append in the constructor (`new HTMLTemplater('query-selector', false)`) */
  public appendTo(parent: ParentNode | HTMLElement | string): this {
    const parentNode = typeof parent === "string"
      ? document.querySelector<HTMLElement>(parent)
      : parent;

    if (!parentNode) {
      throw new HTMLTemplaterError(this, `Parent node "${parent}" not found`);
    }

    for (const instance of this.instances) parentNode.appendChild(instance);
    return this;
  }

  /** Removes all instances created by this templater from the DOM and clears the instances list. */
  public clear(): this {
    for (const node of this.instances) node.remove();
    this.instances = [];
    return this;
  }
}
