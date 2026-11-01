const links = [
  ["discover", "All collections"],
  ["discover/news/technology", "Technology"],
  ["discover/news/apple", "Apple"],
  ["discover/news/ai", "AI"],
  ["discover/news/travel", "Travel"],
  ["discover/news/fashion", "Fashion"],
  ["discover/news/sports", "Sports"],
  ["discover/magazines", "Magazines"],
];
export function DiscoveryLinks() {
  return (
    <nav
      className="discovery-links"
      aria-label="Public news and magazine collections"
    >
      {links.map(([path, label]) => (
        <a key={path} href={import.meta.env.BASE_URL + path}>
          {label}
        </a>
      ))}
    </nav>
  );
}
