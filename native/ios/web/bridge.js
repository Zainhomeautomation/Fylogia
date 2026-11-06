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
  // Keep the existing preference value intact, but use the validated native
  // scroll-only reader until curl animation receives visual acceptance.
  const nativeReadingMode = () =>
    (document.documentElement.dataset.nativeReadingMode = "scroll");
  const nativeViewport = () =>
    document.documentElement.style.setProperty(
      "--fylogia-native-viewport-height",
      `${window.innerHeight}px`,
    );
  paper();
  nativeReadingMode();
  nativeViewport();
  addEventListener("resize", nativeViewport, { passive: true });
  const send = (value) => native?.postMessage(value);
  let pending, timer;
  window.__fylogiaNativeTurn = (forward, turn, surface, axis) => {
    if (
      !native ||
      document.documentElement.dataset.nativeReadingMode === "scroll" ||
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
    const readingMode = document.createElement("section");
    readingMode.className = "native-reading-mode";
    const readingHeading = document.createElement("h2");
    readingHeading.textContent = "Reading mode";
    readingMode.append(readingHeading);
    const readingDescription = document.createElement("p");
    readingDescription.textContent =
      "Scroll vertically in portrait. In wide layouts, browse two facing stories with horizontal scrolling. Articles and PDFs use continuous scrolling.";
    readingMode.append(readingDescription);
    settings.append(readingMode);
    const notifications = document.createElement("section");
    notifications.className = "native-notifications";
    const notificationHeading = document.createElement("h2");
    notificationHeading.textContent = "Daily briefing";
    notifications.append(notificationHeading);
    const enabledRow = document.createElement("label");
    const enabled = document.createElement("input");
    enabled.type = "checkbox";
    enabled.checked =
      localStorage.getItem("fylogia.native.dailyBriefing") === "true";
    enabledRow.append(
      enabled,
      document.createTextNode(" Optional daily summary"),
    );
    notifications.append(enabledRow);
    const timeRow = document.createElement("label");
    timeRow.append(document.createTextNode("Delivery time"));
    const time = document.createElement("input");
    time.type = "time";
    time.value = localStorage.getItem("fylogia.native.briefingTime") || "08:00";
    timeRow.append(time);
    notifications.append(timeRow);
    const topicField = document.createElement("fieldset");
    const topicLegend = document.createElement("legend");
    topicLegend.textContent = "Include topics";
    topicField.append(topicLegend);
    let selectedTopics = new Set();
    try {
      const storedTopics = JSON.parse(
        localStorage.getItem("fylogia.native.briefingTopics") || "[]",
      );
      if (Array.isArray(storedTopics))
        selectedTopics = new Set(
          storedTopics.filter((topic) =>
            ["World News", "Technology", "Science"].includes(topic),
          ),
        );
    } catch {}
    const topicInputs = [];
    for (const topic of ["World News", "Technology", "Science"]) {
      const row = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = topic;
      input.checked = selectedTopics.has(topic);
      row.append(input, document.createTextNode(topic));
      topicField.append(row);
      topicInputs.push(input);
    }
    notifications.append(topicField);
    const publishNotifications = () => {
      const topics = topicInputs
        .filter((input) => input.checked)
        .map((input) => input.value);
      localStorage.setItem(
        "fylogia.native.dailyBriefing",
        String(enabled.checked),
      );
      localStorage.setItem(
        "fylogia.native.briefingTime",
        time.value || "08:00",
      );
      localStorage.setItem(
        "fylogia.native.briefingTopics",
        JSON.stringify(topics),
      );
      let headlines = [];
      try {
        const available = JSON.parse(
          localStorage.getItem("fylogia.native.dailyHeadlines") || "[]",
        );
        headlines = enabled.checked
          ? available
              .filter(
                (story) =>
                  !topics.length ||
                  topics.some((topic) => story.categories.includes(topic)),
              )
              .map((story) => story.title)
              .filter(Boolean)
              .slice(0, 2)
          : [];
      } catch {}
      send({
        action: "notificationPreferences",
        enabled: enabled.checked,
        time: time.value || "08:00",
        topics,
        headlines,
      });
    };
    for (const input of [enabled, time, ...topicInputs])
      input.addEventListener("change", publishNotifications);
    window.__fylogiaNotificationAuthorization = (accepted) => {
      if (!accepted) {
        enabled.checked = false;
        localStorage.setItem("fylogia.native.dailyBriefing", "false");
      }
    };
    settings.append(notifications);
    const breaking = document.createElement("section");
    breaking.className = "native-notifications native-breaking";
    const breakingHeading = document.createElement("h2");
    breakingHeading.textContent = "Breaking news alerts";
    breaking.append(breakingHeading);
    const breakingOptInRow = document.createElement("label");
    const breakingOptIn = document.createElement("input");
    breakingOptIn.type = "checkbox";
    breakingOptIn.checked =
      localStorage.getItem("fylogia.native.breakingOptIn") === "true";
    breakingOptInRow.append(
      breakingOptIn,
      document.createTextNode(" Notify me about high-confidence breaking news"),
    );
    breaking.append(breakingOptInRow);
    const breakingTopics = document.createElement("fieldset");
    const breakingLegend = document.createElement("legend");
    breakingLegend.textContent = "Alert topics";
    breakingTopics.append(breakingLegend);
    let selectedBreakingTopics = new Set();
    try {
      const savedTopics = JSON.parse(
        localStorage.getItem("fylogia.native.breakingTopics") || "[]",
      );
      if (Array.isArray(savedTopics))
        selectedBreakingTopics = new Set(
          savedTopics.filter((topic) =>
            ["World News", "Technology", "Science"].includes(topic),
          ),
        );
    } catch {}
    const breakingTopicInputs = [];
    for (const topic of ["World News", "Technology", "Science"]) {
      const row = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = topic;
      input.checked = selectedBreakingTopics.has(topic);
      row.append(input, document.createTextNode(topic));
      breakingTopics.append(row);
      breakingTopicInputs.push(input);
    }
    breaking.append(breakingTopics);
    const publishBreakingPreferences = () => {
      const topics = breakingTopicInputs
        .filter((input) => input.checked)
        .map((input) => input.value);
      localStorage.setItem(
        "fylogia.native.breakingOptIn",
        String(breakingOptIn.checked),
      );
      localStorage.setItem(
        "fylogia.native.breakingTopics",
        JSON.stringify(topics),
      );
      send({
        action: "breakingPreferences",
        optedIn: breakingOptIn.checked,
        topics,
      });
    };
    for (const input of [breakingOptIn, ...breakingTopicInputs])
      input.addEventListener("change", publishBreakingPreferences);
    window.__fylogiaBreakingAuthorization = (accepted) => {
      if (!accepted) {
        breakingOptIn.checked = false;
        localStorage.setItem("fylogia.native.breakingOptIn", "false");
      }
    };
    settings.append(breaking);
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
