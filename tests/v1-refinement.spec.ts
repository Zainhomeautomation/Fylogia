import { test, mockEdition } from "./edition-fixture";
import { expect, type Page } from "@playwright/test";
import { defaults, type Article } from "../src/catalog";
async function seed(page: Page) {
  const e = await (await page.request.get("data/edition.json")).json();
  const sample = (
    id: string,
    sourceId: string,
    title: string,
    extra: Partial<Article> = {},
  ): Article => ({
    id,
    url: `https://example.test/${id}`,
    sourceId,
    source:
      sourceId === "bbc-tech"
        ? "BBC Technology"
        : sourceId === "nasa"
          ? "NASA"
          : "The Verge",
    title,
    categories: ["AI"],
    region: "Worldwide",
    published: new Date().toISOString(),
    excerpt: "Original test document.",
    content: "<p>Original refinement fixture, not production news.</p>",
    full: false,
    ...extra,
  });
  const seen = sample("seen", "nasa", "Previously read robotics story", {
      publisherTags: ["Robotics"],
    }),
    related = sample("related", "bbc-tech", "Fresh research dispatch", {
      publisherTags: ["Robotics"],
    }),
    other = sample("other", "verge", "New device launch", {
      categories: ["Technology"],
    });
  await mockEdition(page, { ...e, articles: [seen, other, related] });
  await page.addInitScript(
    ({ prefs, seen, related }) => {
      if (localStorage.getItem("folio.v1.preferences")) return;
      localStorage.setItem("folio.v1.preferences", JSON.stringify(prefs));
      localStorage.setItem("folio.v1.history", JSON.stringify([seen]));
      localStorage.setItem("folio.v1.saved", JSON.stringify([related]));
      localStorage.setItem("folio.v1.progress", JSON.stringify({ seen: 0.5 }));
    },
    {
      prefs: {
        ...defaults,
        complete: true,
        interests: ["Technology", "AI"],
        sourceIds: ["nasa", "bbc-tech", "verge"],
      },
      seen,
      related,
    },
  );
}
async function nav(page: Page, name: string) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("navigation", { name: "Main navigation", exact: true })
    .getByRole("button", { name, exact: true })
    .click();
}
const library = (page: Page) =>
  page.evaluate(() =>
    ["preferences", "saved", "history", "progress"].map((key) => {
      const raw = localStorage.getItem("folio.v1." + key);
      // Property order can change during normal startup normalization. Keep
      // every field/value in the comparison; invalid JSON must still fail.
      return raw === null ? null : JSON.parse(raw);
    }),
  );

test("For You favors new related reading while retaining private bookmarks and history", async ({
  page,
}) => {
  await seed(page);
  await page.goto("./");
  await page
    .getByRole("combobox", { name: "Sort stories", exact: true })
    .selectOption("relevant");
  await expect(page.locator(".story h2").first()).toHaveText(
    "Fresh research dispatch",
  );
  await expect(page.locator(".story")).toHaveCount(3);
  const before = await library(page);
  await nav(page, "Explore");
  await nav(page, "For You");
  await expect(page.locator(".story h2").first()).toHaveText(
    "Fresh research dispatch",
  );
  expect(await library(page)).toEqual(before);
  const order = await page.locator(".story h2").allTextContents();
  await page.locator(".story-open").first().click();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(page.locator(".story h2")).toHaveText(order);
  await page
    .getByRole("button", { name: "Refresh edition", exact: true })
    .click();
  await expect(page.locator(".story h2").first()).toHaveText(
    "New device launch",
  );
  expect((await library(page))[1]).toEqual(before[1]);
});
test("search finds category and publisher tags, ranks relevant titles and keeps its state after Back", async ({
  page,
}) => {
  await seed(page);
  await page.goto("./explore");
  await page
    .getByRole("combobox", { name: "Sort stories", exact: true })
    .selectOption("relevant");
  await expect(page.locator(".story")).toHaveCount(3);
  const search = page.getByRole("textbox", { name: "Search stories" });
  const enter = async (text: string) => {
    if (await search.inputValue())
      await page
        .getByRole("button", { name: "Clear search", exact: true })
        .click();
    await expect(search).toHaveValue("");
    await search.pressSequentially(text);
    await expect(search).toHaveValue(text);
  };
  await enter("robotics");
  await expect(page.locator(".story")).toHaveCount(2);
  await expect(page.locator(".story h2").first()).toHaveText(
    "Previously read robotics story",
  );
  await page.locator(".story-open").first().click();
  await page
    .getByRole("button", { name: "Back to previous section", exact: true })
    .click();
  await expect(search).toHaveValue("robotics");
  await enter("AI");
  await expect(page.locator(".story")).toHaveCount(2);
  await enter("BBC research");
  await expect(page.locator(".story h2")).toHaveText("Fresh research dispatch");
});
test("reading settings explain live Reduce Motion without changing the saved preference or sync status", async ({
  page,
}) => {
  await seed(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./settings");
  const before = await library(page);
  await expect(
    page.getByText(/Your device’s Reduce Motion setting is on/),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(
    page.getByText(/Your device’s Reduce Motion setting is on/),
  ).toHaveCount(0);
  await page.getByText("Advanced settings", { exact: true }).click();
  await expect(
    page.getByText(/Optional device sync shares private library metadata/),
  ).toBeVisible();
  await expect(page.getByText(/Secure device pairing is planned/)).toHaveCount(
    0,
  );
  expect(await library(page)).toEqual(before);
});
test("a simulated worker replacement gives one passive notice, not a first-install notice or forced reload", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(() => {
    let controller: any = null;
    Object.defineProperty(navigator.serviceWorker, "controller", {
      get: () => controller,
    });
    (window as any).replaceController = () => {
      controller = {};
      navigator.serviceWorker.dispatchEvent(new Event("controllerchange"));
    };
  });
  await page.goto("./");
  await expect(page.locator(".story")).toHaveCount(3);
  await page.waitForLoadState("load");
  await page
    .getByRole("combobox", { name: "Sort stories", exact: true })
    .selectOption("relevant");
  await page.evaluate(() => (window as any).replaceController());
  await expect(page.getByText(/A new version of Fylogia is ready/)).toHaveCount(
    0,
  );
  await page.locator(".story-open").first().click();
  await expect(page.locator(".reader-content h1")).toHaveText(
    "Fresh research dispatch",
  );
  const started = await page.evaluate(
    () => ((window as any).__documentIdentity = crypto.randomUUID()),
  );
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  const before = await library(page);
  await page.evaluate(() => (window as any).replaceController());
  await expect(page.locator(".reader-content h1")).toHaveText(
    "Fresh research dispatch",
  );
  expect(await page.evaluate(() => (window as any).__documentIdentity)).toBe(
    started,
  );
  await expect(
    page.getByText(/A new version of Fylogia is ready/),
  ).toBeVisible();
  expect(await library(page)).toEqual(before);
  await expect(page.locator(".story")).toHaveCount(3);
});

test("Reduce Motion status resamples a change between render and subscription without editing the library", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(() => {
    const native = window.matchMedia.bind(window);
    let reduced = true,
      subscribed = false;
    window.matchMedia = (query: string) => {
      if (query !== "(prefers-reduced-motion: reduce)") return native(query);
      return {
        media: query,
        get matches() {
          return reduced;
        },
        onchange: null,
        addEventListener(type: string) {
          if (type === "change" && !subscribed) {
            // Model an OS change during mounting, before an event subscription
            // can observe it. The current snapshot must still be reconciled.
            reduced = false;
            subscribed = true;
            (window as any).__motionSubscriptionRace = true;
          }
        },
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        dispatchEvent() {
          return true;
        },
      } as MediaQueryList;
    };
  });
  await page.goto("./settings");
  await expect(
    page.getByRole("heading", { name: "Settings", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).__motionSubscriptionRace))
    .toBe(true);
  await expect(
    page.getByText(/Your device’s Reduce Motion setting is on/),
  ).toHaveCount(0);
  const before = await library(page);
  await page.getByText("Advanced settings", { exact: true }).click();
  expect(await library(page)).toEqual(before);
});
