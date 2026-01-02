/// <reference lib="deno.ns" />
import { DOMParser, Element, type HTMLDocument } from "@b-fuze/deno-dom";
import { HTMLTemplater, HTMLTemplaterError } from "@md/html-templater";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";

/** Helper utility to add the `style` property to Elements as per open [issue](https://github.com/b-fuze/deno-dom/issues/194) */
const addStyleToElement = (el: Element) => {
  const toCamel = (str: string) =>
    str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());

  const toKebab = (str: string) =>
    str.replace(/([A-Z])/g, (_, char) => `-${char.toLowerCase()}`);

  Object.defineProperty(el, "style", {
    get() {
      // Parse existing style attribute into an object
      const styleAttr = el.getAttribute("style") || "";
      const styleObj: Record<string, string> = {};
      styleAttr.split(";").forEach((rule) => {
        const [key, value] = rule.split(":").map((s) => s.trim());
        if (key && value) styleObj[toCamel(key)] = value;
      });

      // Proxy to update style attribute on set
      return new Proxy(styleObj, {
        set(target, prop, value) {
          if (typeof prop !== "string") return false;

          target[prop] = value as string;
          const styleString = Object.entries(target)
            .map(([k, v]) => `${toKebab(k)}: ${v}`)
            .join("; ");
          el.setAttribute("style", styleString);
          return true;
        },
      });
    },
    enumerable: true,
    configurable: true,
  });
};

/** A helper assert function to define input, transformation, and expected output of the HTMLTemplater */
const assertTemplated = ({
  inputHTML,
  runTemplater,
  outputHTML,
}: {
  inputHTML: string;
  runTemplater: (dom: HTMLDocument) => unknown;
  outputHTML: string;
}) => {
  const dom = new DOMParser().parseFromString(
    `<body>${inputHTML}</body>`,
    "text/html",
  );

  // Apply `style` property as attributes as per open [issue](https://github.com/b-fuze/deno-dom/issues/194)
  dom.querySelectorAll("*").forEach(addStyleToElement);
  // @ts-expect-error Also apply to template content clones
  dom.querySelectorAll<HTMLTemplateElement>("template").forEach((el) => {
    const originalClone = el.content.cloneNode;
    el.content.cloneNode = (...props) => {
      const cloned = originalClone.apply(el.content, props);
      (cloned as unknown as Element)
        .querySelectorAll("*")
        .forEach(addStyleToElement);

      return cloned;
    };
  });

  // Define globals for HTMLTemplater as we're testing in Deno and not in a browser
  globalThis.document = dom as unknown as Document;
  // @ts-ignore deno-dom doesn't have HTMLElement defined properly so simply use Element
  globalThis.HTMLElement = Element as unknown as HTMLElement;

  runTemplater(dom);
  assertEquals(dom.body.innerHTML.trim(), outputHTML.trim());
};

Deno.test("Instantiates template from selector", () => {
  assertTemplated({
    inputHTML: `<template id="example-template"><div>Item</div></template>`,
    runTemplater: () =>
      new HTMLTemplater("#example-template").instantiate({
        div: { textContent: "Hello World" },
      }),
    outputHTML: `<div>Hello World</div>`,
  });
});

Deno.test("Instantiates template from reference", () => {
  assertTemplated({
    inputHTML: `<template><div>Item</div></template>`,
    runTemplater: (dom) =>
      new HTMLTemplater(dom.querySelector("template")!).instantiate({
        div: { textContent: "Hello World" },
      }),
    outputHTML: `<div>Hello World</div>`,
  });
});

Deno.test("Keeps template in DOM when configured", () => {
  assertTemplated({
    inputHTML: `<template><div>Item</div></template>`,
    runTemplater: () =>
      new HTMLTemplater("template", { removeFromDom: false }).instantiate({
        div: { textContent: "Hello World" },
      }),
    outputHTML: `<template><div>Item</div></template><div>Hello World</div>`,
  });
});

Deno.test("Not appended to DOM if disabled", () => {
  assertTemplated({
    inputHTML: `<template><div>Item</div></template>`,
    runTemplater: () =>
      new HTMLTemplater("template", { appendToParent: false }).instantiate({
        div: { textContent: "Hello World" },
      }),
    outputHTML: ``,
  });
});

Deno.test("Can manually append to DOM elsewhere", () => {
  assertTemplated({
    inputHTML: `<template><div>Item</div></template><div id="container"></div>`,
    runTemplater: () =>
      new HTMLTemplater("template", { appendToParent: false })
        .instantiate({ div: { textContent: "Hello World" } })
        .appendTo("#container"),
    outputHTML: `<div id="container"><div>Hello World</div></div>`,
  });
});

Deno.test("Can overwrite attributes", () => {
  assertTemplated({
    inputHTML:
      `<template><input class="item" data-id="0" data-remove style="color: red;"></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        input: {
          className: "no-class",
          dataset: { id: "1" },
          style: { color: "blue" },
          "data-new-attr": "new-value",
          "data-remove": null,
        },
      }),
    outputHTML:
      `<input class="no-class" data-id="1" style="color: blue" data-new-attr="new-value">`,
  });
});

Deno.test("Can modify attributes", () => {
  assertTemplated({
    inputHTML:
      `<template><input class="item" data-id="0" style="color: red;"></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        input: {
          className: (v) => v + " item-1",
          dataset: (v) => ({ ...v, id: Number(v.id) + 1 + "" }),
          style: (v) => ({ ...v, background: "blue" }),
        },
      }),
    outputHTML:
      `<input class="item item-1" data-id="1" style="color: red; background: blue">`,
  });
});

Deno.test("classList TemplateAttributeMapper updates classList with custom logic", () => {
  assertTemplated({
    inputHTML: `<template><input class="existing"></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        input: { classList: ["added"] },
      }),
    outputHTML: `<input class="existing added">`,
  });

  assertTemplated({
    inputHTML: `<template><input class="existing"></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        input: { classList: (v) => (v.add("added"), v) },
      }),
    outputHTML: `<input class="existing added">`,
  });

  assertTemplated({
    inputHTML:
      `<br class="other-class"><template><input class="existing"></template>`,
    runTemplater: (dom) =>
      new HTMLTemplater("template").instantiate({
        input: { classList: dom.querySelector("br")?.classList },
      }),
    outputHTML: `<br class="other-class"><input class="other-class">`,
  });

  assertTemplated({
    inputHTML: `<template><input class="removed"></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        input: { classList: { removed: false, added: true } },
      }),
    outputHTML: `<input class="added">`,
  });
});

Deno.test("eventListeners TemplateAttributeMapper adds listeners with custom logic", () => {
  const dom = new DOMParser().parseFromString(
    `<body><template><input></template></body>`,
    "text/html",
  );
  globalThis.document = dom as unknown as Document;

  let inputEventFired = false;
  let clickEventFired = false;

  new HTMLTemplater("template").instantiate({
    input: {
      eventListeners: {
        input: () => inputEventFired = true,
        click: () => clickEventFired = true,
      },
    },
  });

  const inputEl = dom.querySelector("input")!;

  inputEl.dispatchEvent(new Event("input"));
  assert(inputEventFired, "Input event fired");

  inputEl.dispatchEvent(new Event("click"));
  assert(clickEventFired, "Click event fired");
});

Deno.test("string TemplateAttributeMapper sets textContent", () => {
  assertTemplated({
    inputHTML: `<template><p></p></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({ p: "Test" }),
    outputHTML: `<p>Test</p>`,
  });
});

Deno.test("Function TemplateAttributeMapper provides element", () => {
  assertTemplated({
    inputHTML: `<template><p id="test"></p></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate({
        p: (e) => e.id += "-2",
      }),
    outputHTML: `<p id="test-2"></p>`,
  });
});

Deno.test("instantiate() w/o params creates single instance", () => {
  assertTemplated({
    inputHTML: `<template><br></template>`,
    runTemplater: () => new HTMLTemplater("template").instantiate(),
    outputHTML: `<br>`,
  });
});

Deno.test("Can remove elements", () => {
  assertTemplated({
    inputHTML: `<template><br><input></template>`,
    runTemplater: () => new HTMLTemplater("template").instantiate({}),
    outputHTML: `<br><input>`,
  });
  assertTemplated({
    inputHTML: `<template><br><input></template>`,
    runTemplater: () => new HTMLTemplater("template").instantiate({ br: null }),
    outputHTML: `<input>`,
  });
});

Deno.test("Can use spread constructor", () => {
  assertTemplated({
    inputHTML: `<template><input></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate(
        { input: { value: "1" } },
        { input: { value: "2" } },
      ),
    outputHTML: `<input value="1"><input value="2">`,
  });
});

Deno.test("Can use array constructor", () => {
  assertTemplated({
    inputHTML: `<template><input></template>`,
    runTemplater: () =>
      new HTMLTemplater("template").instantiate([
        { input: { value: "1" } },
        { input: { value: "2" } },
      ]),
    outputHTML: `<input value="1"><input value="2">`,
  });
});

Deno.test("Throws error when template selector not found", () => {
  const error = assertThrows(() =>
    assertTemplated({
      inputHTML: "",
      runTemplater: () => new HTMLTemplater("#missing"),
      outputHTML: "",
    })
  );
  assertInstanceOf(error, HTMLTemplaterError);
  assertEquals(
    error.message,
    'HTMLTemplater Error: Template with query selector "#missing" not found',
  );
});

Deno.test("Throws error when auto-append active and not in DOM", () => {
  const error = assertThrows(() =>
    assertTemplated({
      inputHTML: "",
      runTemplater: (dom) => {
        const template = dom.createElement(
          "template",
        ) as unknown as HTMLTemplateElement;
        new HTMLTemplater(template);
      },
      outputHTML: "",
    })
  );
  assertInstanceOf(error, HTMLTemplaterError);
  assertEquals(
    error.message,
    "HTMLTemplater Error: `appendToParent` is true but template doesn't have a parent element",
  );
});

Deno.test("Throws error when manually appending and selector not found", () => {
  const error = assertThrows(() =>
    assertTemplated({
      inputHTML: "<template><div/></template>",
      runTemplater: () =>
        new HTMLTemplater("template", { appendToParent: false }).appendTo(
          "#missing",
        ),
      outputHTML: "",
    })
  );
  assertInstanceOf(error, HTMLTemplaterError);
  assertEquals(
    error.message,
    'HTMLTemplater Error: Parent node "#missing" not found',
  );
});
