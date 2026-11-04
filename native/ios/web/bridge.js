(() => {
  const native = window.webkit?.messageHandlers?.fylogia;
  window.__fylogiaDeliverNativeShortcut = (route) => {
    if (typeof route !== "string") return;
    if (window.__fylogiaRouteNativeShortcut) {
      window.__fylogiaRouteNativeShortcut(route);
      return;
    }
    window.__fylogiaPendingNativeShortcut = route;
  };
  window.__fylogiaPendingNativeShortcut = undefined;
  const paper = () =>
    (document.documentElement.dataset.nativePaper =
      localStorage.getItem("fylogia.native.paper") || "cream");
  paper();
  const send = (value) => native?.postMessage(value);
  let pending, timer;
  window.__fylogiaNativeTurn = (forward, turn, surface, axis) => {
    if (
      !native ||
      axis !== "horizontal" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return false;
    if (pending) return true;
    const rect = surface.getBoundingClientRect();
    // Only animate a completely visible sheet; preserve golden curling for tall/scrolling pages.
    if (
      rect.top < 0 ||
      rect.bottom > innerHeight ||
      rect.width < 100 ||
      rect.height < 100
    )
      return false;
    pending = { turn, applied: false };
    timer = setTimeout(() => {
      window.__fylogiaApplyNativeTurn();
      window.__fylogiaFinishNativeTurn();
    }, 3000);
    send({
      action: "curl",
      forward,
      spread: surface.dataset.paperSpread === "2" ? 2 : 1,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    });
    return true;
  };
  window.__fylogiaApplyNativeTurn = () => {
    if (pending && !pending.applied) {
      pending.applied = true;
      pending.turn();
    }
    return new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve(true))),
    );
  };
  window.__fylogiaFinishNativeTurn = () => {
    clearTimeout(timer);
    pending = undefined;
  };
  window.__fylogiaNativeOptions = () => {
    let options = document.querySelector(".native-options");
    const settings = document.querySelector(".settings");
    if (!settings || options) return;
    options = document.createElement("section");
    options.className = "native-options";
    const heading = document.createElement("h2");
    heading.textContent = "Native reading";
    options.append(heading);
    for (const [key, label, checked] of [
      [
        "paper",
        "Warm cream paper",
        localStorage.getItem("fylogia.native.paper") !== "theme",
      ],
      [
        "haptics",
        "Page-turn haptics",
        localStorage.getItem("fylogia.native.haptics") === "true",
      ],
      [
        "sound",
        "Page-turn sound",
        localStorage.getItem("fylogia.native.sound") === "true",
      ],
    ]) {
      const row = document.createElement("label"),
        input = document.createElement("input");
      input.type = "checkbox";
      input.checked = checked;
      input.addEventListener("change", () => {
        localStorage.setItem(
          "fylogia.native." + key,
          key === "paper"
            ? input.checked
              ? "cream"
              : "theme"
            : String(input.checked),
        );
        paper();
        send({
          action: "preferences",
          haptics: localStorage.getItem("fylogia.native.haptics") === "true",
          sound: localStorage.getItem("fylogia.native.sound") === "true",
        });
      });
      row.append(input, document.createTextNode(label));
      options.append(row);
    }
    const tips = document.createElement("button");
    tips.textContent = "Reading tips";
    tips.addEventListener("click", () =>
      window.dispatchEvent(new Event("fylogia-reading-tips")),
    );
    options.append(tips);
    settings.append(options);
  };
  new MutationObserver(window.__fylogiaNativeOptions).observe(
    document.documentElement,
    { childList: true, subtree: true },
  );
  send({
    action: "preferences",
    haptics: localStorage.getItem("fylogia.native.haptics") === "true",
    sound: localStorage.getItem("fylogia.native.sound") === "true",
  });
})();
