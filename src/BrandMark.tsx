// Decorative beside the visible Fylogia name or a labeled loading/empty state.
// Fixed dimensions reserve space; CSS follows the existing explicit/system theme.
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img
        className="brand-mark-dark"
        src={import.meta.env.BASE_URL + "brand/fylogia-mark.svg"}
        width="40"
        height="40"
        alt=""
      />
      <img
        className="brand-mark-light"
        src={import.meta.env.BASE_URL + "brand/fylogia-mark-light.svg"}
        width="40"
        height="40"
        alt=""
      />
    </span>
  );
}
