// Serialized into the generated worker. Online launches receive current HTML;
// failed/offline launches retain the atomically installed, versioned shell.
export async function freshNavigation(
  request,
  fetcher,
  fallback,
  timeout = 2500,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(
      new Request(request, { cache: "no-store", signal: controller.signal }),
    );
    if (response.ok) return response;
  } catch {
    // Airplane Mode or a stalled connection must not trap the library opening.
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
  }
  return fallback();
}
