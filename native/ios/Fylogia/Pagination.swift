import CoreText
import ImageIO
import UIKit

struct PrintedPage {
  let story: Story
  let text: NSAttributedString
  let range: NSRange
  let textSize: CGSize
  let number: Int
  let imageHeight: CGFloat
  var anchor: ReadingAnchor { ReadingAnchor(storyID: story.id, offset: range.location) }
}

@MainActor enum Pagination {
  static func columns(width: CGFloat, textScale: CGFloat = 1) -> Int {
    width >= max(760, 680 * textScale) ? 2 : 1
  }
  static func pages(stories: [Story], size: CGSize) -> [PrintedPage] {
    let started = Date()
    var result: [PrintedPage] = []
    let bodyFont = UIFontMetrics(forTextStyle: .body).scaledFont(
      for: UIFont(name: "Georgia", size: 19) ?? .systemFont(ofSize: 19))
    let titleFont = UIFontMetrics(forTextStyle: .title1).scaledFont(
      for: UIFont(name: "Georgia-Bold", size: 31) ?? .boldSystemFont(ofSize: 31))
    for story in stories {
      let paragraph = NSMutableParagraphStyle()
      paragraph.lineSpacing = 5
      paragraph.paragraphSpacing = 12
      let label = story.permittedFullText ? "FULL ARTICLE" : "PUBLISHER PREVIEW"
      let text = NSMutableAttributedString(
        string: story.source.uppercased() + " · " + label + "\n\n",
        attributes: [
          .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
          .foregroundColor: UIColor.darkGray,
        ])
      text.append(
        NSAttributedString(
          string: story.title + "\n\n",
          attributes: [
            .font: titleFont, .foregroundColor: UIColor(white: 0.08, alpha: 1),
            .paragraphStyle: paragraph,
          ]))
      text.append(
        NSAttributedString(
          string: story.body,
          attributes: [
            .font: bodyFont, .foregroundColor: UIColor(white: 0.12, alpha: 1),
            .paragraphStyle: paragraph,
          ]))
      let setter = CTFramesetterCreateWithAttributedString(text)
      let width = max(100, size.width - 48)
      var offset = 0
      while offset < text.length {
        let imageHeight: CGFloat =
          offset == 0 && story.image != nil ? min(220, size.height * 0.27) : 0
        let textSize = CGSize(width: width, height: max(80, size.height - 60 - imageHeight))
        let frame = CTFramesetterCreateFrame(
          setter, CFRange(location: offset, length: 0),
          CGPath(rect: CGRect(origin: .zero, size: textSize), transform: nil), nil)
        let visible = CTFrameGetVisibleStringRange(frame)
        guard visible.length > 0 else { break }
        result.append(
          PrintedPage(
            story: story, text: text, range: NSRange(location: offset, length: visible.length),
            textSize: textSize, number: result.count, imageHeight: imageHeight))
        offset += visible.length
      }
    }
    print(
      "FYLOGIA pagination pages=\(result.count) milliseconds=\(Int(Date().timeIntervalSince(started)*1000))"
    )
    return result
  }
  static func index(for anchor: ReadingAnchor?, in pages: [PrintedPage]) -> Int {
    guard let anchor else { return 0 }
    return pages.firstIndex {
      $0.story.id == anchor.storyID && NSLocationInRange(anchor.offset, $0.range)
    }
      ?? pages.firstIndex { $0.story.id == anchor.storyID } ?? 0
  }
}

final class PaperView: UIView {
  private var image: UIImage?
  private var imageTask: URLSessionDataTask?
  var page: PrintedPage? {
    didSet {
      loadImage()
      setNeedsDisplay()
      accessibilityLabel = page.map { $0.text.attributedSubstring(from: $0.range).string }
      isAccessibilityElement = true
      accessibilityTraits = .staticText
    }
  }
  private func loadImage() {
    imageTask?.cancel()
    image = nil
    guard let page, page.imageHeight > 0, let raw = page.story.image, let url = URL(string: raw),
      url.scheme == "https"
    else { return }
    let identifier = page.story.id
    // Ephemeral session: remote publisher photos are not silently made offline downloads.
    let session = URLSession(configuration: .ephemeral)
    imageTask = session.dataTask(with: url) { [weak self] data, response, _ in
      defer { session.finishTasksAndInvalidate() }
      guard let data, data.count <= 8_000_000, (response as? HTTPURLResponse)?.statusCode == 200,
        let source = CGImageSourceCreateWithData(data as CFData, nil),
        let cg = CGImageSourceCreateThumbnailAtIndex(
          source, 0,
          [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceThumbnailMaxPixelSize: 1000,
            kCGImageSourceCreateThumbnailWithTransform: true,
          ] as CFDictionary)
      else { return }
      DispatchQueue.main.async {
        guard let self, self.page?.story.id == identifier else { return }
        self.image = UIImage(cgImage: cg)
        self.setNeedsDisplay()
      }
    }
    imageTask?.resume()
  }
  deinit { imageTask?.cancel() }
  override func draw(_ rect: CGRect) {
    guard let page, let context = UIGraphicsGetCurrentContext() else { return }
    UIColor(red: 0.97, green: 0.95, blue: 0.89, alpha: 1).setFill()
    context.fill(bounds)
    if page.imageHeight > 0 {
      let box = CGRect(x: 24, y: 20, width: bounds.width - 48, height: page.imageHeight - 16)
      UIColor(red: 0.83, green: 0.86, blue: 0.79, alpha: 1).setFill()
      context.fill(box)
      if let image {
        let factor = max(box.width / image.size.width, box.height / image.size.height)
        let size = CGSize(width: image.size.width * factor, height: image.size.height * factor)
        context.saveGState()
        context.clip(to: box)
        image.draw(
          in: CGRect(
            x: box.midX - size.width / 2, y: box.midY - size.height / 2, width: size.width,
            height: size.height))
        context.restoreGState()
      }
    }
    context.saveGState()
    context.translateBy(x: 24, y: bounds.height - 30)
    context.scaleBy(x: 1, y: -1)
    let setter = CTFramesetterCreateWithAttributedString(page.text)
    let frame = CTFramesetterCreateFrame(
      setter, CFRange(location: page.range.location, length: page.range.length),
      CGPath(rect: CGRect(origin: .zero, size: page.textSize), transform: nil), nil)
    CTFrameDraw(frame, context)
    context.restoreGState()
  }
}
final class PaperController: UIViewController {
  let index: Int
  init(index: Int, page: PrintedPage?) {
    self.index = index
    super.init(nibName: nil, bundle: nil)
    let paper = PaperView()
    paper.page = page
    paper.backgroundColor = UIColor(red: 0.97, green: 0.95, blue: 0.89, alpha: 1)
    view = paper
    view.accessibilityIdentifier = "paper.\(index)"
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }
}
