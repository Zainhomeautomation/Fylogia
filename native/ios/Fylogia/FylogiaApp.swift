import SwiftUI

@main struct FylogiaApp: App {
  var body: some Scene {
    WindowGroup {
      Group {
        if ProcessInfo.processInfo.arguments.contains("--native-reader")
          || ProcessInfo.processInfo.arguments.contains("--ui-testing")
        {
          NativeReader().ignoresSafeArea().preferredColorScheme(.dark)
        } else {
          GoldenReader().ignoresSafeArea()
        }
      }
      .onOpenURL { url in
        guard let route = FylogiaWidgetDeepLink.route(from: url) else { return }
        FylogiaShortcutHandoff.queue(route: route)
        NotificationCenter.default.post(name: .fylogiaShortcutAvailable, object: nil)
      }
    }
  }
}
struct NativeReader: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> MagazineController { MagazineController() }
  func updateUIViewController(_ controller: MagazineController, context: Context) {}
}

struct GoldenReader: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> HybridController { HybridController() }
  func updateUIViewController(_ controller: HybridController, context: Context) {}
}
