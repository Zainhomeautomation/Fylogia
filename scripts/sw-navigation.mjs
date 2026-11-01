// Serialized into the generated worker. Online launches receive current HTML;
// failed/offline launches retain the atomically installed, versioned shell.
export async function freshNavigation(
  request,
  fetcher,
  fallback,
  timeout = 2500,
) {
  // Static hosts may canonicalise /privacy.html to /privacy. Cached responses
  // retain that redirected flag, which browsers reject for manual-redirect
  // service-worker navigation requests. Rewrap the known cached HTML response
  // without changing its body/status/headers or touching downloaded content.
  const navigationResponse = (response) =>
    response.redirected
      ? new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
        })
      : response;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (request.signal.aborted) abort();
  else request.signal.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetcher(
      new Request(request, { cache: "no-store", signal: controller.signal }),
    );
    if (response.ok || response.status === 404 || response.status === 410)
      return navigationResponse(response);
  } catch {
    // Airplane Mode or a stalled connection must not trap the library opening.
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", abort);
  }
  return navigationResponse(await fallback());
}
