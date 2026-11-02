import UIKit

/// A persistent, spine-bound UIKit book. Web links remain accessible beneath its edge-only hit region.
final class BookEdgeView: UIView {
  var turning = false
  override func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
    guard bounds.contains(point), turning || point.x < 38 || point.x > bounds.width - 38 else {
      return nil
    }
    return super.hitTest(point, with: event)
  }
}
final class BoundLeaf: UIViewController {
  let index: Int
  init(index: Int, image: UIImage) {
    self.index = index
    super.init(nibName: nil, bundle: nil)
    let sheet = UIImageView(image: image)
    sheet.isUserInteractionEnabled = true
    sheet.contentMode = .scaleToFill
    sheet.backgroundColor = UIColor(red: 0.97, green: 0.95, blue: 0.89, alpha: 1)
    view = sheet
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
@MainActor
final class BoundBookController: UIViewController, UIPageViewControllerDataSource,
  UIPageViewControllerDelegate
{
  let spread: Int
  let images: [Int: UIImage]
  let completed: (Bool) -> Void
  let cancelled: () -> Void
  private(set) var turning = false
  private let book: UIPageViewController
  private let edge = BookEdgeView()
  private var leaves: [Int: BoundLeaf] = [:]
  private var limitingDrag = false
  // Public UIKit offers no mesh controls. Cancel a gesture at the physical book
  // boundary instead of feeding it unbounded coordinates or using private APIs.
  static func validDrag(_ point: CGPoint, in bounds: CGRect) -> Bool {
    point.x.isFinite && point.y.isFinite && point.x >= bounds.minX
      && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY
  }
  @objc private func constrainDrag(_ recognizer: UIGestureRecognizer) {
    guard !limitingDrag, recognizer.state == .changed,
      !Self.validDrag(recognizer.location(in: book.view), in: book.view.bounds)
    else { return }
    limitingDrag = true
    print("FYLOGIA bound drag boundary: cancelling outside book")
    recognizer.isEnabled = false
    recognizer.isEnabled = true
    DispatchQueue.main.async { [weak self] in self?.limitingDrag = false }
  }
  init(
    current: UIImage, previous: UIImage?, next: UIImage?, spread: Int,
    completed: @escaping (Bool) -> Void, cancelled: @escaping () -> Void
  ) {
    self.spread = spread
    self.completed = completed
    self.cancelled = cancelled
    var images: [Int: UIImage] = [:]
    for (base, image) in [(-spread, previous), (0, Optional(current)), (spread, next)] {
      guard let image, let cg = image.cgImage else { continue }
      for i in 0..<spread {
        let left = cg.width * i / spread
        let right = cg.width * (i + 1) / spread
        if let crop = cg.cropping(to: CGRect(x: left, y: 0, width: right - left, height: cg.height))
        {
          images[base + i] = UIImage(cgImage: crop, scale: image.scale, orientation: .up)
        }
      }
    }
    self.images = images
    book = UIPageViewController(
      transitionStyle: .pageCurl, navigationOrientation: .horizontal,
      options: [
        .spineLocation: NSNumber(
          value: spread == 2
            ? UIPageViewController.SpineLocation.mid.rawValue
            : UIPageViewController.SpineLocation.min.rawValue)
      ])
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  override func loadView() { view = edge }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 0.97, green: 0.95, blue: 0.89, alpha: 1)
    view.clipsToBounds = true
    view.accessibilityElementsHidden = true
    if ProcessInfo.processInfo.arguments.contains("--parity-testing") {
      view.accessibilityElementsHidden = false
      view.isAccessibilityElement = true
      view.accessibilityLabel = "Native bound magazine"
      view.accessibilityValue = "spread=\(spread);spine=\(spread == 2 ? "mid" : "min")"
    }
    leaves = Dictionary(
      uniqueKeysWithValues: images.map { ($0.key, BoundLeaf(index: $0.key, image: $0.value)) })
    book.isDoubleSided = spread == 2
    book.dataSource = self
    book.delegate = self
    addChild(book)
    view.addSubview(book.view)
    book.view.frame = view.bounds
    book.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    book.didMove(toParent: self)
    book.view.backgroundColor = view.backgroundColor
    book.view.clipsToBounds = true
    book.setViewControllers((0..<spread).compactMap(leaf), direction: .forward, animated: false)
    for gesture in book.gestureRecognizers {
      gesture.addTarget(self, action: #selector(constrainDrag(_:)))
    }
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    book.view.frame = view.bounds
  }
  private func leaf(_ index: Int) -> UIViewController? {
    leaves[index]
  }
  func turn(forward: Bool) {
    guard !turning else { return }
    let start = forward ? spread : -spread
    let controllers = (start..<start + spread).compactMap(leaf)
    guard controllers.count == spread else {
      cancelled()
      return
    }
    turning = true
    print("FYLOGIA bound gesture begin spine=\(spread==2 ? "mid":"min")")
    edge.turning = true
    book.setViewControllers(
      controllers, direction: forward ? .forward : .reverse,
      animated: !UIAccessibility.isReduceMotionEnabled
    ) { [weak self] done in
      guard let self else { return }
      self.turning = false
      self.edge.turning = false
      if done { self.completed(forward) } else { self.cancelled() }
    }
  }
  func pageViewController(
    _ pageViewController: UIPageViewController,
    spineLocationFor orientation: UIInterfaceOrientation
  ) -> UIPageViewController.SpineLocation {
    // Layout chooses spread from content width; orientation must not move the spine.
    spread == 2 ? .mid : .min
  }
  func pageViewController(
    _ pageViewController: UIPageViewController,
    viewControllerBefore viewController: UIViewController
  ) -> UIViewController? {
    guard let page = viewController as? BoundLeaf else { return nil }
    return leaf(page.index - 1)
  }
  func pageViewController(
    _ pageViewController: UIPageViewController, viewControllerAfter viewController: UIViewController
  ) -> UIViewController? {
    guard let page = viewController as? BoundLeaf else { return nil }
    return leaf(page.index + 1)
  }
  func pageViewController(
    _ pageViewController: UIPageViewController,
    willTransitionTo pendingViewControllers: [UIViewController]
  ) {
    turning = true
    print("FYLOGIA bound gesture begin spine=\(spread==2 ? "mid":"min")")
    edge.turning = true
  }
  func pageViewController(
    _ pageViewController: UIPageViewController, didFinishAnimating finished: Bool,
    previousViewControllers: [UIViewController], transitionCompleted didComplete: Bool
  ) {
    turning = false
    edge.turning = false
    print("FYLOGIA bound gesture complete=\(didComplete)")
    if didComplete,
      let index = pageViewController.viewControllers?.compactMap({ ($0 as? BoundLeaf)?.index })
        .min()
    {
      completed(index >= spread)
    } else {
      cancelled()
    }
  }
}
