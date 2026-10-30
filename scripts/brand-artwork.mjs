// Outlined artwork reconstructed from the owner's approved imageFYLOGIA.png.
// Coordinates retain the reference's tapered serif, curved spine and two paper leaves.
const stem =
  "M562 82C563 108 541 121 506 121H471C415 121 383 151 383 210V314C383 342 400 361 423 369H315V365C340 356 344 338 344 307V142C344 122 342 113 319 111V109L363 94C381 88 394 87 415 87H529C544 87 556 85 562 82Z";
const upperRim =
  "M423 369C399 348 391 321 391 279C389 221 393 181 429 163C468 143 527 170 560 122C564 169 547 202 514 210C481 217 446 209 426 244C408 276 408 333 423 369Z";
const upper =
  "M423 369C403 340 397 310 399 271C400 215 410 185 443 173C479 159 532 174 560 128C560 168 545 193 519 201C487 211 452 203 433 231C410 264 411 329 423 369Z";
const lowerRim =
  "M423 369C406 346 401 307 415 268C430 229 453 223 489 224C522 224 549 220 566 211C568 254 553 291 523 302C489 313 451 298 423 369Z";
const lower =
  "M423 369C413 341 416 308 436 284C466 249 528 268 566 216C563 254 549 281 524 291C496 303 463 292 443 320C434 333 427 350 423 369Z";
export function mark({ light = false, mono = false } = {}) {
  const ink = light ? "#0A1018" : "#F7EFDA";
  return `${mono ? "" : `<defs><linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${light ? "#182A30" : "#FFF8E8"}"/><stop offset="1" stop-color="${light ? "#0A1018" : "#E8DFC5"}"/></linearGradient><linearGradient id="sage" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#C8D7B7"/><stop offset=".58" stop-color="#82A78A"/><stop offset="1" stop-color="#345F50"/></linearGradient><linearGradient id="forest" x1="1" y1="0" x2="0" y2="1"><stop stop-color="#A3C3A1"/><stop offset=".65" stop-color="#527F67"/><stop offset="1" stop-color="#254E42"/></linearGradient></defs>`}<path fill="${mono ? ink : "url(#paper)"}" d="${stem}"/><path fill="${mono ? ink : "#F4ECD5"}" d="${upperRim}"/><path fill="${mono ? ink : "url(#sage)"}" d="${upper}"/><path fill="${mono ? ink : "#F0E7CE"}" d="${lowerRim}"/><path fill="${mono ? ink : "url(#forest)"}" d="${lower}"/>${mono ? "" : '<path d="M423 367C407 318 411 228 448 204C470 190 503 195 532 177M424 365C427 320 448 294 478 286C508 278 533 281 552 253" fill="none" stroke="#E5EBD4" stroke-opacity=".23" stroke-width="1.4"/>'}`;
}
export function logoSvg(options = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320"><title>Fylogia</title><g transform="translate(-286 -65)">${mark(options)}</g></svg>`;
}
export function iconSvg({ maskable = false, light = false } = {}) {
  const scale = maskable ? 1 : 1.25;
  // Maskable mark's most distant corner lies inside the central 80% circle.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 512 512"><title>Fylogia</title><rect width="512" height="512" fill="${light ? "#F7F5ED" : "#0A1018"}"/><g transform="translate(256 256) scale(${scale}) translate(-441 -225.5)">${mark({ light })}</g></svg>`;
}
export function socialSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0A1018"/><g transform="translate(285 308) scale(1.05) translate(-441 -225.5)">${mark()}</g><text x="510" y="318" fill="#F7EFDA" font-family="Georgia,serif" font-size="106" font-weight="700" letter-spacing="-5">Fylogia</text><text x="513" y="378" fill="#A6BEA5" font-family="Georgia,serif" font-size="27">Your World, One Page at a Time.</text><path d="M145 504H1055" stroke="#A6BEA5" stroke-opacity=".24"/><text x="600" y="548" text-anchor="middle" fill="#A6BEA5" font-family="sans-serif" font-size="20" letter-spacing="3">FYLOGIA.COM</text></svg>`;
}
