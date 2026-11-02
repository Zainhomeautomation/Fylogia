import SwiftUI

@main struct FylogiaApp: App {
  var body: some Scene {
    WindowGroup { NativeReader().ignoresSafeArea().preferredColorScheme(.dark) }
  }
}
struct NativeReader: UIViewControllerRepresentable {
  func makeUIViewController(context: Context) -> MagazineController { MagazineController() }
  func updateUIViewController(_ controller: MagazineController, context: Context) {}
}
