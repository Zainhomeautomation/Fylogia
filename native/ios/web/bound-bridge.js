(() => {
  const host = window.webkit?.messageHandlers?.fylogia;
  if (!host) return;
  const entries = new Map();
  let active,
    preparing = false,
    ready = false,
    pending,
    timer,
    lastSignature = "";
  const post = (value) => host.postMessage(value);
  const finish = () => {
    document
      .querySelectorAll("[data-native-preview]")
      .forEach((n) => n.remove());
    preparing = false;
  };
  const update = () => {
    if (
      document.querySelector(
        ".sidebar.open, .news-pages-mode.native-tools-open, .reader-options-panel:not([hidden]), .summary-backdrop",
      )
    ) {
      finish();
      ready = false;
      post({ action: "boundHide" });
      return;
    }
    if (preparing) return;
    const reader = [...document.querySelectorAll(".reader")].at(-1);
    const entry = [...entries.values()]
      .reverse()
      .find(
        (e) =>
          e.surface.isConnected &&
          !e.surface.closest('[inert], [aria-hidden="true"]') &&
          (!reader || reader.contains(e.surface)) &&
          e.options().enabled &&
          e.surface.getBoundingClientRect().width > 100,
      );
    if (!entry) {
      ready = false;
      post({ action: "boundHide" });
      return;
    }
    const rect = entry.surface.getBoundingClientRect(),
      o = entry.options();
    if (
      rect.top < 0 ||
      rect.bottom > innerHeight ||
      o.interaction?.blocked?.() ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      ready = false;
      post({ action: "boundHide" });
      return;
    }
    const signature = JSON.stringify([
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      o.page,
      entry.surface.innerHTML,
      document.documentElement.dataset.theme,
      document.documentElement.dataset.nativePaper,
    ]);
    if (ready && signature === lastSignature) return;
    lastSignature = signature;
    active = entry;
    ready = false;
    preparing = true;
    post({
      action: "boundPrepare",
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      spread: Number(
        entry.surface.dataset.paperSpread || entry.surface.dataset.spread || 1,
      ),
      previous: !!o.interaction?.previous,
      next: !!o.interaction?.next,
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(update, 150);
  };
  window.__fylogiaRegisterBound = (surface, options, prepare) => {
    entries.set(surface, { surface, options, prepare });
    schedule();
  };
  window.__fylogiaUnregisterBound = (surface) => {
    entries.delete(surface);
    schedule();
  };
  window.__fylogiaPrepareBound = async (forward) => {
    if (!active?.surface.isConnected) return false;
    preparing = true;
    const node = await active.prepare(forward, new AbortController().signal);
    if (!node) {
      finish();
      return false;
    }
    node.dataset.nativePreview = "true";
    node.classList.add("turn-content-native");
    node.style.cssText +=
      ";position:absolute;inset:0;margin:0;width:100%;height:100%;z-index:10000;pointer-events:none;";
    active.surface.append(node);
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    return true;
  };
  window.__fylogiaClearBoundPreview = () => {
    document
      .querySelectorAll("[data-native-preview]")
      .forEach((n) => n.remove());
  };
  window.__fylogiaBoundReady = () => {
    finish();
    ready = true;
  };
  window.__fylogiaCommitBound = (forward) => {
    ready = false;
    finish();
    if (pending) {
      const turn = pending;
      pending = undefined;
      turn();
    } else active?.options().interaction?.step(forward);
    schedule();
  };
  window.__fylogiaCancelBound = () => {
    pending = undefined;
    finish();
    ready = true;
  };
  window.__fylogiaNativeTurn = (forward, turn, surface, axis) => {
    if (!ready || active?.surface !== surface || axis !== "horizontal")
      return false;
    if (pending) return true;
    pending = turn;
    post({ action: "boundTurn", forward });
    return true;
  };
  new MutationObserver((records) => {
    if (preparing) return;
    if (
      records.some((r) => {
        const nodes = [...r.addedNodes, ...r.removedNodes];
        if (
          nodes.length &&
          nodes.every(
            (n) => n instanceof Element && n.matches("[data-native-preview]"),
          )
        )
          return false;
        return (
          !(r.target instanceof Element) ||
          !r.target.closest("[data-native-preview],.native-options")
        );
      })
    )
      schedule();
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "data-theme",
      "data-native-paper",
      "class",
      "hidden",
      "data-native-text-scale",
    ],
  });
  addEventListener(
    "scroll",
    () => {
      if (ready) {
        ready = false;
        post({ action: "boundHide" });
      }
      schedule();
    },
    { passive: true, capture: true },
  );
  window.__fylogiaSuspendBound = () => {
    pending = undefined;
    ready = false;
    lastSignature = "";
    finish();
    post({ action: "boundHide" });
  };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) window.__fylogiaSuspendBound();
    else schedule();
  });
  addEventListener("resize", schedule);
  addEventListener(
    "load",
    () => {
      lastSignature = "";
      schedule();
    },
    true,
  );
})();
