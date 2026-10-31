let ready = false;
const listeners = new Set<() => void>();
export const updateReady = () => ready;
export const subscribeToUpdates = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
// First installation is not an update. Never reload a reader or interrupt saves.
export function observeWorkerUpdates(
  container: Pick<
    ServiceWorkerContainer,
    "controller" | "addEventListener" | "removeEventListener"
  >,
) {
  let previous = container.controller;
  const change = () => {
    const next = container.controller;
    if (previous && next && next !== previous && !ready) {
      ready = true;
      for (const listener of listeners) listener();
    }
    previous = next;
  };
  container.addEventListener("controllerchange", change);
  return () => container.removeEventListener("controllerchange", change);
}
