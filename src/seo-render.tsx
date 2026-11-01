import { parseHTML } from "linkedom";
import { renderToString } from "react-dom/server";
import { Onboarding } from "./Onboarding";
import { defaults } from "./catalog";
import { DiscoveryPage, DiscoveryNotFound } from "./DiscoveryPage";
import { discoveryPages } from "./discovery-catalog";
import "./App.css";
const noop = () => {};
export function renderHome() {
  const markup = renderToString(
    <Onboarding
      initial={defaults}
      statuses={[]}
      onComplete={noop}
      onArticles={noop}
    />,
  );
  // Static onboarding is readable immediately, but controls must not accept a
  // click before the local library is ready and React installs their handlers.
  const { document } = parseHTML(
    "<html><body><div id=preview>" + markup + "</div></body></html>",
  );
  for (const control of document.querySelectorAll(
    "button,input,select,textarea",
  ))
    control.setAttribute("disabled", "");
  return document.getElementById("preview")!.innerHTML;
}
export function renderCollection(path: string) {
  const page = discoveryPages.find((p) => p.path === path);
  if (!page) throw new Error("Unknown discovery route");
  return renderToString(<DiscoveryPage page={page} />);
}
export function renderNotFound() {
  return renderToString(<DiscoveryNotFound />);
}
