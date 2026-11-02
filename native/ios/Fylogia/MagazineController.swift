import AVFoundation
import UIKit

@MainActor
final class MagazineController: UIViewController, UIPageViewControllerDataSource,
  UIPageViewControllerDelegate
{
  let library: Library
  private(set) var pages: [PrintedPage] = []
  private var book: UIPageViewController?
  private var pageIndex = 0
  private var columns = 1
  private var lastSize = CGSize.zero
  private var turning = false
  private var pendingLayout = false
  private let container = UIView()
  private let counter = UILabel()
  private let hint = UILabel()
  private let nextButton = UIButton(type: .system)
  private let previousButton = UIButton(type: .system)
  private let saveButton = UIButton(type: .system)
  private var sound: AVAudioPlayer?
  private let testMode = ProcessInfo.processInfo.arguments.contains("--ui-testing")
  init() {
    if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
      let defaults = UserDefaults(suiteName: "com.fylogia.native.tests")!
      if ProcessInfo.processInfo.arguments.contains("--reset-test-state") {
        defaults.removePersistentDomain(forName: "com.fylogia.native.tests")
      }
      library = Library(defaults: defaults)
      library.stories = Story.fixtures
    } else {
      library = Library()
      library.loadCache()
    }
    super.init(nibName: nil, bundle: nil)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = UIColor(red: 10 / 255, green: 16 / 255, blue: 24 / 255, alpha: 1)
    view.tintColor = UIColor(red: 0.72, green: 0.81, blue: 0.68, alpha: 1)
    let title = UILabel()
    title.text = "Fylogia"
    title.font = UIFont(name: "Georgia-Bold", size: 28)
    title.textColor = .init(white: 0.96, alpha: 1)
    let logo = UIImageView(image: UIImage(named: "Brand"))
    logo.contentMode = .scaleAspectFit
    logo.widthAnchor.constraint(equalToConstant: 35).isActive = true
    let home = control("house", "For You", action: #selector(homeTapped))
    home.accessibilityIdentifier = "home"
    let options = control(
      "slider.horizontal.3", "Reading preferences", action: #selector(preferences))
    let original = control(
      "arrow.up.right.square", "Open original publisher", action: #selector(openOriginal))
    original.accessibilityIdentifier = "original"
    configure(saveButton, symbol: "bookmark", label: "Save story", action: #selector(save))
    saveButton.accessibilityIdentifier = "save"
    let header = UIStackView(arrangedSubviews: [logo, title, UIView(), home, saveButton, options])
    header.spacing = 8
    header.alignment = .center
    configure(
      previousButton, symbol: "chevron.left", label: "Previous page", action: #selector(previous))
    previousButton.accessibilityIdentifier = "previous"
    configure(
      nextButton, symbol: "chevron.right", label: "Next page", action: #selector(nextTapped))
    nextButton.accessibilityIdentifier = "next"
    counter.font = .preferredFont(forTextStyle: .caption1)
    counter.textAlignment = .center
    counter.textColor = .white
    counter.accessibilityIdentifier = "pageProgress"
    hint.text =
      library.defaults.bool(forKey: "turnTutorialSeen.v1")
      ? "" : "Drag a page corner, or use the arrows"
    hint.font = .preferredFont(forTextStyle: .caption1)
    hint.textColor = view.tintColor
    hint.textAlignment = .center
    hint.accessibilityIdentifier = "turnHint"
    let footer = UIStackView(arrangedSubviews: [previousButton, counter, original, nextButton])
    footer.spacing = 10
    footer.alignment = .center
    let stack = UIStackView(arrangedSubviews: [header, container, hint, footer])
    stack.axis = .vertical
    stack.spacing = 10
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 12),
      stack.trailingAnchor.constraint(
        equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -12),
      stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 8),
      stack.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -8),
      header.heightAnchor.constraint(equalToConstant: 48),
      footer.heightAnchor.constraint(equalToConstant: 48),
    ])
    NotificationCenter.default.addObserver(
      self, selector: #selector(textSizeChanged), name: UIContentSizeCategory.didChangeNotification,
      object: nil)
    if !testMode { Task { await refresh() } }
  }
  func configure(_ button: UIButton, symbol: String, label: String, action: Selector) {
    button.setImage(UIImage(systemName: symbol), for: .normal)
    button.accessibilityLabel = label
    button.addTarget(self, action: action, for: .touchUpInside)
    button.widthAnchor.constraint(equalToConstant: 44).isActive = true
    button.heightAnchor.constraint(equalToConstant: 44).isActive = true
  }
  func control(_ symbol: String, _ label: String, action: Selector) -> UIButton {
    let b = UIButton(type: .system)
    configure(b, symbol: symbol, label: label, action: action)
    return b
  }
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    let size = container.bounds.size
    guard size.width > 100, size.height > 120, size != lastSize else { return }
    if turning {
      pendingLayout = true
      return
    }
    rebuild(size)
  }
  @objc private func textSizeChanged() {
    lastSize = .zero
    view.setNeedsLayout()
  }
  private func rebuild(_ size: CGSize) {
    let anchor = library.anchor
    lastSize = size
    let scale = UIFont.preferredFont(forTextStyle: .body).pointSize / 17
    columns = Pagination.columns(width: size.width, textScale: scale)
    pages = Pagination.pages(
      stories: library.stories,
      size: CGSize(width: size.width / CGFloat(columns), height: size.height))
    pageIndex = Pagination.index(for: anchor, in: pages)
    if columns == 2 { pageIndex -= pageIndex % 2 }
    if let old = book {
      old.willMove(toParent: nil)
      old.view.removeFromSuperview()
      old.removeFromParent()
    }
    let reduced =
      UIAccessibility.isReduceMotionEnabled
      || ProcessInfo.processInfo.arguments.contains("--reduce-motion")
    let newBook = UIPageViewController(
      transitionStyle: reduced ? .scroll : .pageCurl, navigationOrientation: .horizontal,
      options: reduced
        ? nil
        : [
          .spineLocation: NSNumber(
            value: columns == 2
              ? UIPageViewController.SpineLocation.mid.rawValue
              : UIPageViewController.SpineLocation.min.rawValue)
        ])
    // Scroll style supports one controller only. Reduced motion uses a single composite spread.
    newBook.isDoubleSided = !reduced && columns == 2
    newBook.dataSource = self
    newBook.delegate = self
    addChild(newBook)
    container.addSubview(newBook.view)
    newBook.view.frame = container.bounds
    newBook.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    newBook.didMove(toParent: self)
    book = newBook
    if !pages.isEmpty {
      newBook.setViewControllers(controllers(at: pageIndex), direction: .forward, animated: false)
    }
    updateControls()
  }
  private var reduced: Bool { book?.transitionStyle == .scroll }
  private func controllers(at index: Int) -> [UIViewController] {
    if reduced && columns == 2 {
      let spread = PaperController(index: index, page: nil)
      let row = UIStackView()
      row.distribution = .fillEqually
      row.frame = container.bounds
      row.autoresizingMask = [.flexibleWidth, .flexibleHeight]
      for i in index...index + 1 {
        let paper = PaperView()
        paper.page = pages.indices.contains(i) ? pages[i] : nil
        row.addArrangedSubview(paper)
      }
      spread.view.addSubview(row)
      return [spread]
    }
    return (index..<index + (reduced ? 1 : columns)).map {
      PaperController(index: $0, page: pages.indices.contains($0) ? pages[$0] : nil)
    }
  }
  private func updateControls() {
    counter.text =
      pages.isEmpty
      ? "Loading news…"
      : "\(pageIndex + 1)–\(min(pageIndex + columns, pages.count)) of \(pages.count)"
    counter.accessibilityValue =
      "\(columns) pages; \(library.anchor?.storyID ?? "none"); offset \(library.anchor?.offset ?? 0)"
    nextButton.isEnabled = !turning && pageIndex + columns < pages.count
    previousButton.isEnabled = !turning && pageIndex > 0
    if pages.indices.contains(pageIndex) {
      let saved = library.saved.contains(pages[pageIndex].story.id)
      saveButton.setImage(UIImage(systemName: saved ? "bookmark.fill" : "bookmark"), for: .normal)
      saveButton.accessibilityLabel = saved ? "Unsave story" : "Save story"
    }
    saveButton.isEnabled = !pages.isEmpty
    hint.isHidden = pages.count <= 1 || library.defaults.bool(forKey: "turnTutorialSeen.v1")
  }
  @objc private func nextTapped() { turn(forward: true) }
  @objc private func previous() { turn(forward: false) }
  private func turn(forward: Bool) {
    guard !turning, let book else { return }
    let index = pageIndex + (forward ? columns : -columns)
    guard pages.indices.contains(index) else { return }
    turning = true
    updateControls()
    let start = Date()
    book.setViewControllers(
      controllers(at: index), direction: forward ? .forward : .reverse, animated: !reduced
    ) { [weak self] finished in
      guard let self else { return }
      if finished { self.commit(index) }
      self.finishTransition()
      print(
        "FYLOGIA turn completed=\(finished) milliseconds=\(Int(Date().timeIntervalSince(start)*1000))"
      )
    }
  }
  private func commit(_ index: Int) {
    pageIndex = min(index, max(0, pages.count - 1))
    if pages.indices.contains(pageIndex) { library.anchor = pages[pageIndex].anchor }
    library.defaults.set(true, forKey: "turnTutorialSeen.v1")
    if library.defaults.bool(forKey: "haptics.v1") {
      UISelectionFeedbackGenerator().selectionChanged()
    }
    if library.defaults.bool(forKey: "sound.v1"),
      let url = Bundle.main.url(forResource: "page-turn", withExtension: "wav")
    {
      try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
      sound = try? AVAudioPlayer(contentsOf: url)
      sound?.volume = 0.12
      sound?.play()
    }
  }
  private func finishTransition() {
    turning = false
    if pendingLayout {
      pendingLayout = false
      lastSize = .zero
      view.setNeedsLayout()
    }
    updateControls()
  }
  func pageViewController(
    _ pageViewController: UIPageViewController,
    viewControllerBefore viewController: UIViewController
  ) -> UIViewController? {
    guard let page = viewController as? PaperController else { return nil }
    let i = page.index - (reduced ? columns : 1)
    return i >= 0
      ? (reduced ? controllers(at: i).first : PaperController(index: i, page: pages[i])) : nil
  }
  func pageViewController(
    _ pageViewController: UIPageViewController, viewControllerAfter viewController: UIViewController
  ) -> UIViewController? {
    guard let page = viewController as? PaperController else { return nil }
    let i = page.index + (reduced ? columns : 1)
    guard i < pages.count + (columns == 2 && pages.count % 2 == 1 ? 1 : 0) else { return nil }
    return reduced
      ? controllers(at: i).first
      : PaperController(index: i, page: pages.indices.contains(i) ? pages[i] : nil)
  }
  func pageViewController(
    _ pageViewController: UIPageViewController,
    willTransitionTo pendingViewControllers: [UIViewController]
  ) {
    turning = true
    updateControls()
  }
  func pageViewController(
    _ pageViewController: UIPageViewController, didFinishAnimating finished: Bool,
    previousViewControllers: [UIViewController], transitionCompleted completed: Bool
  ) {
    if completed,
      let first = pageViewController.viewControllers?.compactMap({ ($0 as? PaperController)?.index }
      ).min()
    {
      commit(first)
    }
    finishTransition()
  }
  @objc private func homeTapped() {
    guard !turning, !pages.isEmpty else { return }
    library.anchor = pages[0].anchor
    lastSize = .zero
    view.setNeedsLayout()
  }
  @objc private func save() {
    guard pages.indices.contains(pageIndex) else { return }
    let id = pages[pageIndex].story.id
    if library.saved.contains(id) { library.saved.remove(id) } else { library.saved.insert(id) }
    updateControls()
  }
  @objc private func openOriginal() {
    guard pages.indices.contains(pageIndex), let url = URL(string: pages[pageIndex].story.url),
      url.scheme == "https"
    else { return }
    UIApplication.shared.open(url)
  }
  @objc private func preferences() {
    let alert = UIAlertController(
      title: "Reading preferences",
      message: "Sound and haptics are optional. Your reading position is saved on this device.",
      preferredStyle: .actionSheet)
    for (name, key) in [("Page-turn sound", "sound.v1"), ("Haptics", "haptics.v1")] {
      alert.addAction(
        UIAlertAction(
          title: "\(name): \(library.defaults.bool(forKey:key) ? "On" : "Off")", style: .default
        ) { [weak self] _ in
          guard let self else { return }
          self.library.defaults.set(!self.library.defaults.bool(forKey: key), forKey: key)
        })
    }
    alert.addAction(
      UIAlertAction(title: "Refresh news", style: .default) { [weak self] _ in
        Task { await self?.refresh() }
      })
    alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
    alert.popoverPresentationController?.sourceView = view
    alert.popoverPresentationController?.sourceRect = CGRect(
      x: view.bounds.maxX - 60, y: 70, width: 1, height: 1)
    present(alert, animated: true)
  }
  private func refresh() async {
    do {
      try await library.refresh()
      if !turning {
        lastSize = .zero
        view.setNeedsLayout()
      } else {
        pendingLayout = true
      }
    } catch {
      if pages.isEmpty {
        counter.text = "News unavailable — retry in preferences"
      } else {
        counter.text = "Offline · saved edition"
      }
    }
  }
}
