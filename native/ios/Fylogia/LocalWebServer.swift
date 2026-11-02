import Foundation
import Network
import UniformTypeIdentifiers

/// Loopback-only, read-only bundled app origin. Never binds to the LAN.
final class LocalWebServer {
  static let port: UInt16 = 18765
  private var listener: NWListener?
  private let queue = DispatchQueue(label: "com.fylogia.web-server")
  let root: URL
  let offline: Bool
  init(root: URL, offline: Bool) {
    self.root = root
    self.offline = offline
  }
  func start(ready: @escaping (Result<Void, Error>) -> Void) throws {
    let parameters = NWParameters.tcp
    parameters.requiredLocalEndpoint = .hostPort(
      host: "127.0.0.1", port: NWEndpoint.Port(rawValue: Self.port)!)
    let listener = try NWListener(using: parameters)
    self.listener = listener
    listener.stateUpdateHandler = { state in
      switch state {
      case .ready: ready(.success(()))
      case .failed(let error): ready(.failure(error))
      default: break
      }
    }
    listener.newConnectionHandler = { [weak self] connection in
      connection.start(queue: self?.queue ?? .main)
      self?.receive(connection, buffer: Data())
    }
    listener.start(queue: queue)
  }
  deinit { listener?.cancel() }
  private func receive(_ connection: NWConnection, buffer: Data) {
    connection.receive(minimumIncompleteLength: 1, maximumLength: 16_384) {
      [weak self] data, _, complete, error in
      guard let self else {
        connection.cancel()
        return
      }
      var buffer = buffer
      buffer.append(data ?? Data())
      guard buffer.count <= 32768, error == nil else {
        connection.cancel()
        return
      }
      if let request = String(data: buffer, encoding: .utf8), request.contains("\r\n\r\n") {
        self.respond(connection, request: request)
      } else if !complete {
        self.receive(connection, buffer: buffer)
      } else {
        connection.cancel()
      }
    }
  }
  private func respond(_ connection: NWConnection, request: String) {
    let lines = request.components(separatedBy: "\r\n")
    let tokens = (lines.first ?? "").split(separator: " ")
    guard tokens.count == 3, ["GET", "HEAD"].contains(String(tokens[0])),
      lines.contains(where: { $0.lowercased() == "host: 127.0.0.1:\(Self.port)" }),
      let components = URLComponents(string: String(tokens[1])), components.scheme == nil,
      !components.path.contains(".."), !components.path.contains("\\")
    else {
      send(connection, status: 403, data: Data("Unsupported local request".utf8))
      return
    }
    let path = components.path
    if path.hasPrefix("/api/") {
      // Cloud pairing requires a separately reviewed origin/credential design. No proxy bypass.
      send(
        connection, status: 503,
        data: Data("{\"error\":\"This native integration is not connected yet\"}".utf8),
        mime: "application/json")
      return
    }
    let head = tokens[0] == "HEAD"
    if path == "/data/edition.json", !offline,
      !ProcessInfo.processInfo.arguments.contains("--parity-testing")
    {
      let task = URLSession.shared.dataTask(
        with: URL(string: "https://fylogia.com/data/edition.json")!
      ) { [weak self] data, response, _ in
        guard let self else { return }
        if let data, data.count < 30_000_000, (response as? HTTPURLResponse)?.statusCode == 200 {
          self.send(connection, data: data, mime: "application/json", head: head)
        } else {
          self.file(connection, path: path, head: head)
        }
      }
      task.resume()
      return
    }
    file(connection, path: path, head: head)
  }
  private func file(_ connection: NWConnection, path: String, head: Bool) {
    var url = root.appendingPathComponent(path == "/" ? "index.html" : String(path.dropFirst()))
      .standardizedFileURL
    guard url.path.hasPrefix(root.standardizedFileURL.path + "/") else {
      send(connection, status: 403, data: Data())
      return
    }
    if !FileManager.default.fileExists(atPath: url.path), url.pathExtension.isEmpty {
      url = root.appendingPathComponent("index.html")
    }
    guard let data = try? Data(contentsOf: url) else {
      send(connection, status: 404, data: Data())
      return
    }
    let mime: String
    switch url.pathExtension {
    case "js", "mjs": mime = "text/javascript"
    case "css": mime = "text/css"
    case "html": mime = "text/html"
    case "json": mime = "application/json"
    case "svg": mime = "image/svg+xml"
    case "wasm": mime = "application/wasm"
    default:
      mime =
        UTType(filenameExtension: url.pathExtension)?.preferredMIMEType
        ?? "application/octet-stream"
    }
    send(connection, data: data, mime: mime, head: head)
  }
  private func send(
    _ connection: NWConnection, status: Int = 200, data: Data, mime: String = "text/plain",
    head: Bool = false
  ) {
    let headers =
      "HTTP/1.1 \(status) \(status == 200 ? "OK" : "Unavailable")\r\nContent-Type: \(mime)\r\nContent-Length: \(data.count)\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n"
    var bytes = Data(headers.utf8)
    if !head { bytes.append(data) }
    connection.send(content: bytes, completion: .contentProcessed { _ in connection.cancel() })
  }
}
