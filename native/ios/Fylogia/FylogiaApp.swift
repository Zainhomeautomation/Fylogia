import SwiftUI

@main struct FylogiaApp: App {
  var body: some Scene {
    WindowGroup {
      if ProcessInfo.processInfo.arguments.contains("--native-reader")
        || ProcessInfo.processInfo.arguments.contains("--ui-testing")
      {
        NativeReader().ignoresSafeArea().preferredColorScheme(.dark)
      } else {
        GoldenReader().ignoresSafeArea()
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
