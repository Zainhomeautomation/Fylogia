// Pairing links contain only a five-minute, single-use code, never a device credential.
const hash = new URLSearchParams(location.hash.slice(1));
const candidate = hash.get("pair") || "";
export const incomingPairCode = /^[A-Z2-9]{5}-?[A-Z2-9]{5}$/i.test(candidate)
  ? candidate.toUpperCase()
  : "";
if (hash.has("pair"))
  history.replaceState(history.state, "", location.pathname + location.search);
