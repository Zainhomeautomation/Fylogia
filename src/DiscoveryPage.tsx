import { BrandMark } from "./BrandMark";
import { DiscoveryLinks } from "./DiscoveryLinks";
import {
  discoveryPages,
  discoverySources,
  type DiscoveryPage as Page,
} from "./discovery-catalog";
const href = (path: string) => import.meta.env.BASE_URL + path;
export function DiscoveryPage({ page }: { page: Page }) {
  const related = discoveryPages.filter((p) => p.parent === page.path);
  const publishers = discoverySources(page).slice(0, 18);
  const showNasa =
    page.kind === "magazines" &&
    (!page.category ||
      ["Science", "Space", "Engineering"].includes(page.category));
  const showHackspace =
    page.kind === "magazines" &&
    (!page.category ||
      [
        "Technology",
        "Computing",
        "3D Printing",
        "Engineering",
        "Photography",
      ].includes(page.category));
  const pathParts = page.path.split("/");
  return (
    <div className="discovery-page">
      <header className="discovery-header">
        <div className="brand-lockup">
          <a
            className="brand-name"
            href={href("")}
            aria-label="Fylogia — Go to homepage"
          >
            <BrandMark />
            <span className="wordmark">Fylogia</span>
          </a>
          <span className="brand-tagline">Your World, One Page at a Time.</span>
        </div>
        <a className="secondary" href={href(page.action)}>
          Open reader
        </a>
      </header>
      <main id="main">
        <nav className="discovery-breadcrumbs" aria-label="Breadcrumb">
          <a href={href("")}>Fylogia</a>
          {pathParts.map((_, i) => {
            const path = pathParts.slice(0, i + 1).join("/");
            const p = discoveryPages.find((p) => p.path === path);
            return (
              <span key={path}>
                {" "}
                /{" "}
                {i === pathParts.length - 1 ? (
                  <span aria-current="page">{page.name}</span>
                ) : (
                  <a href={href(path)}>{p?.name}</a>
                )}
              </span>
            );
          })}
        </nav>
        <p className="eyebrow">NEWS & MAGAZINE COLLECTIONS</p>
        <h1>{page.name}</h1>
        <p className="discovery-intro">{page.intro}</p>
        <p>
          Read in a responsive magazine layout, save stories and download
          permitted articles for offline reading. No mandatory registration is
          needed. Your interests, sources and reading preferences stay yours.
        </p>
        <a className="primary discovery-action" href={href(page.action)}>
          {page.kind === "magazines"
            ? "Open the magazine library"
            : "Read in Fylogia"}{" "}
          →
        </a>
        {!!related.length && (
          <section aria-labelledby="collection-heading">
            <h2 id="collection-heading">Choose a collection</h2>
            <div className="discovery-grid">
              {related.map((p) => (
                <a className="discovery-card" key={p.path} href={href(p.path)}>
                  <h3>{p.name}</h3>
                  <p>{p.intro.split(/(?<=\.) /)[0]}</p>
                </a>
              ))}
            </div>
          </section>
        )}
        {page.kind === "hub" && (
          <section>
            <h2>A personal library, with room to explore</h2>
            <p>
              Choose interests and sources, then create your own Daily Edition.
              The same reader adapts between single pages and comfortable
              facing-page layouts. Optional scrolling, bookmarks and offline
              downloads are available inside the application.
            </p>
            <p>
              Local News uses an approximate country only when requested in the
              reader. Regional News follows your manually selected region. The
              public collections here are identical for all visitors and contain
              no private library information.
            </p>
          </section>
        )}
        {(showNasa || showHackspace) && (
          <section aria-labelledby="editions-heading">
            <h2 id="editions-heading">Original editions in the library</h2>
            <ul className="discovery-editions">
              {showNasa && (
                <li>
                  <h3>NASA Spinoff 2025</h3>
                  <p>
                    NASA's 2025 annual edition about applications of space
                    technology. The reader preserves the original PDF layout and
                    publisher credits. Individual third-party rights remain
                    applicable.
                  </p>
                  <a href="https://spinoff.nasa.gov/">
                    NASA — original publisher
                  </a>
                </li>
              )}
              {showHackspace && (
                <li>
                  <h3>HackSpace 75</h3>
                  <p>
                    February 2024 · Raspberry Pi Ltd. Original issue about
                    electronics, making, photography and 3D printing,
                    distributed under CC BY-NC-SA 3.0 except where noted.
                  </p>
                  <a href="https://magazine.raspberrypi.com/hackspace/issues/75">
                    HackSpace — official issue page
                  </a>
                </li>
              )}
            </ul>
            <p>
              These are identified original editions, not current monthly
              releases or collections of RSS stories. Some publications remain
              available only from their publishers.
            </p>
          </section>
        )}
        {!!publishers.length && (
          <section aria-labelledby="publishers-heading">
            <h2 id="publishers-heading">
              {page.kind === "magazines"
                ? "Official magazine publishers"
                : "Publisher sources"}
            </h2>
            <p>
              {page.kind === "magazines"
                ? "Visit the official publisher for available editions and its access conditions. Fylogia may offer attributed articles or previews; a listing is not a promise of free complete issues."
                : "Explore the publishers represented in this collection. Article availability varies: complete text appears in the reader only when the source policy and the individual item permit it; otherwise a preview links to the publisher."}
            </p>
            <ul className="discovery-publishers">
              {publishers.map((s) => (
                <li key={s.id}>
                  <a href={s.site}>
                    {s.name} <span aria-hidden="true">↗</span>
                  </a>
                  <small>{s.categories.join(" · ")}</small>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="discovery-note">
          <h2>Reporting belongs to its original publisher</h2>
          <p>
            Fylogia organises news and publications; it does not claim these
            publishers' reporting as original Fylogia journalism. Publisher
            names and original links remain visible. The reader does not bypass
            paywalls, and publicly accessible feeds do not automatically grant
            republication rights.
          </p>
          <p>
            Offline copies, saved stories and reading history are personal
            library features, not public web pages.{" "}
            <a href={href("privacy")}>Read the privacy notice</a>.
          </p>
        </section>
      </main>
      <DiscoveryLinks />
    </div>
  );
}
export function DiscoveryNotFound() {
  return (
    <main className="discovery-page">
      <h1>That page isn't here.</h1>
      <p>
        Explore Fylogia's public collections or return to your reading library.
      </p>
      <a href={href("discover")}>Browse collections</a> ·{" "}
      <a href={href("")}>Go to homepage</a>
    </main>
  );
}
