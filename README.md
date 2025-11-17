# @md/html-templater

Easily instantiate html <templates> from JavaScript.

Note by default the template is removed from the DOM and instances are directly
appended to the templates parent element. This can be changed in the constructor
([see Custom Appending](#custom-appending)).

## Examples

### Simple Instantiation

```ts
new HTMLTemplater("#my-template").instantiate(
  {
    img: { src: "image1.png", alt: "Image 1" },
    h2: { textContent: (v) => v + "(Title 2)" },
    "my-query-selector": { style: { animationName: "item-2" } },
  },
  {
    img: { src: "image2.png", alt: "Image 2" },
    h2: { textContent: (v) => v + "(Title 2)" },
    "my-query-selector": { style: { animationName: "item-2" } },
  },
);
```

### Mapped Instantiation

```ts
const array = new Array(10).fill(0).map((_, i) => i);
new HTMLTemplater("#my-template").instantiate(
  array.map((i) => ({
    img: { src: `image${i}.png`, alt: `Image ${i}` },
    h2: { textContent: (v) => v + `(Title ${i})` },
    "my-query-selector": { style: { animationName: "item-2" } },
  })),
);
```

### Type-safe Templating

```ts
type MyTemplateMapper = {
  img: { src: string; alt: string };
  h2: { textContent: AttributeMapper<string> };
  "my-query-selector": ElementMapper<HTMLDivElement>;
};
const templater = new HTMLTemplater<MyTemplateMapper>("#my-template");
templater.instantiate({
  img: { src: "imageX.png", alt: "Image X" },
  h2: { textContent: (v) => v + "(Title X)" },
  "my-query-selector": { style: { animationName: "item-X" } },
});
```

### Custom Appending

```ts
new HTMLTemplater("#my-template", { appendToParent: false })
  .instantiate({ h2: { textContent: "Hello World" } })
  .appendTo(document.getElementById("container")!);
```
