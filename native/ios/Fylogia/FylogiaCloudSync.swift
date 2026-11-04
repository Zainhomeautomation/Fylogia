import CloudKit
import Foundation

enum FylogiaSyncCollection: String, Codable, CaseIterable, Sendable {
  case bookmark
  case savedArticle
  case readingProgress
  case preference
}

/// A durable mutation. Deleted records remain as tombstones so removals can
/// propagate to another device without racing an older copy back into view.
struct FylogiaSyncRecord: Codable, Equatable, Identifiable, Sendable {
  var collection: FylogiaSyncCollection
  var key: String
  var payload: Data
  var updatedAt: Date
  var origin: String
  var isDeleted: Bool

  var id: String { "\(collection.rawValue):\(key)" }

  static func wins(_ lhs: Self, over rhs: Self) -> Bool {
    if lhs.updatedAt != rhs.updatedAt { return lhs.updatedAt > rhs.updatedAt }
    if lhs.isDeleted != rhs.isDeleted { return lhs.isDeleted }
    return lhs.origin > rhs.origin
  }
}

enum FylogiaSyncError: Error {
  case invalidKey
  case oversizedPayload
  case notConfigured
  case iCloudUnavailable
  case malformedCloudRecord
}

/// Local-first sync journal stored separately from the existing library keys.
/// Seeding only fills missing entries; it never overwrites existing user data.
actor FylogiaLocalSyncStore {
  private let defaults: UserDefaults
  private let storageKey: String
  private var records: [String: FylogiaSyncRecord]
  private let origin: String

  init(
    defaults: UserDefaults = .standard,
    storageKey: String = "com.fylogia.native.sync-journal.v1",
    origin: String = UUID().uuidString
  ) {
    self.defaults = defaults
    self.storageKey = storageKey
    self.origin = origin
    if let data = defaults.data(forKey: storageKey),
      let stored = try? JSONDecoder().decode([FylogiaSyncRecord].self, from: data)
    {
      records = Dictionary(uniqueKeysWithValues: stored.map { ($0.id, $0) })
    } else {
      records = [:]
    }
  }

  func snapshot() -> [FylogiaSyncRecord] {
    records.values.sorted { $0.id < $1.id }
  }

  func put(
    _ collection: FylogiaSyncCollection, key: String, payload: Data, at date: Date = .now
  ) throws {
    guard Self.valid(key) else { throw FylogiaSyncError.invalidKey }
    guard payload.count <= 512 * 1024 else { throw FylogiaSyncError.oversizedPayload }
    records["\(collection.rawValue):\(key)"] = FylogiaSyncRecord(
      collection: collection, key: key, payload: payload, updatedAt: date, origin: origin,
      isDeleted: false)
    persist()
  }

  func delete(_ collection: FylogiaSyncCollection, key: String, at date: Date = .now) throws {
    guard Self.valid(key) else { throw FylogiaSyncError.invalidKey }
    records["\(collection.rawValue):\(key)"] = FylogiaSyncRecord(
      collection: collection, key: key, payload: Data(), updatedAt: date, origin: origin,
      isDeleted: true)
    persist()
  }

  @discardableResult
  func seedIfMissing(_ record: FylogiaSyncRecord) -> Bool {
    guard records[record.id] == nil else { return false }
    records[record.id] = record
    persist()
    return true
  }

  func merge(_ incoming: [FylogiaSyncRecord]) {
    var changed = false
    for record in incoming where Self.valid(record.key) && record.payload.count <= 512 * 1024 {
      if let current = records[record.id] {
        if FylogiaSyncRecord.wins(record, over: current) {
          records[record.id] = record
          changed = true
        }
      } else {
        records[record.id] = record
        changed = true
      }
    }
    if changed { persist() }
  }

  private func persist() {
    guard let data = try? JSONEncoder().encode(snapshot()) else { return }
    defaults.set(data, forKey: storageKey)
  }

  private static func valid(_ key: String) -> Bool {
    !key.isEmpty && key.utf8.count <= 200 && !key.contains("\0")
  }
}

/// Private database only. This does not enable an iCloud capability or create
/// a production container; callers must opt in and the signed app must carry
/// an approved CloudKit entitlement before any network operation can occur.
final class FylogiaCloudKitSync {
  static let recordType = "FylogiaSyncMutation"
  private let container: CKContainer
  private let database: CKDatabase

  init(container: CKContainer = .default()) {
    self.container = container
    database = container.privateCloudDatabase
  }

  func synchronize(store: FylogiaLocalSyncStore, optedIn: Bool) async throws {
    guard optedIn else { return }
    guard hasConfiguredContainer else { throw FylogiaSyncError.notConfigured }
    let account: CKAccountStatus = try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<CKAccountStatus, Error>) in
      container.accountStatus { status, error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: status)
        }
      }
    }
    guard account == .available else { throw FylogiaSyncError.iCloudUnavailable }

    let remote = try await fetchAll()
    await store.merge(remote.compactMap(Self.decode))
    for mutation in await store.snapshot() {
      try await save(mutation)
    }
  }

  private var hasConfiguredContainer: Bool {
    guard
      let configuredID = Bundle.main.object(
        forInfoDictionaryKey: "FylogiaCloudKitContainerIdentifier") as? String,
      !configuredID.isEmpty
    else { return false }
    return configuredID == container.containerIdentifier
  }

  private func fetchAll() async throws -> [CKRecord] {
    var all: [CKRecord] = []
    var cursor: CKQueryOperation.Cursor?
    repeat {
      let (page, next): ([CKRecord], CKQueryOperation.Cursor?) =
        try await withCheckedThrowingContinuation {
          (continuation: CheckedContinuation<([CKRecord], CKQueryOperation.Cursor?), Error>) in
          let operation: CKQueryOperation
          if let cursor {
            operation = CKQueryOperation(cursor: cursor)
          } else {
            operation = CKQueryOperation(
              query: CKQuery(recordType: Self.recordType, predicate: NSPredicate(value: true)))
          }
          let lock = NSLock()
          var records: [CKRecord] = []
          var recordError: Error?
          operation.recordMatchedBlock = { _, result in
            lock.lock()
            defer { lock.unlock() }
            switch result {
            case .success(let record): records.append(record)
            case .failure(let error): recordError = error
            }
          }
          operation.queryResultBlock = { result in
            lock.lock()
            let values = records
            let error = recordError
            lock.unlock()
            if let error {
              continuation.resume(throwing: error)
              return
            }
            switch result {
            case .success(let nextCursor): continuation.resume(returning: (values, nextCursor))
            case .failure(let error): continuation.resume(throwing: error)
            }
          }
          database.add(operation)
        }
      all.append(contentsOf: page)
      cursor = next
    } while cursor != nil
    return all
  }

  private func save(_ mutation: FylogiaSyncRecord) async throws {
    let name = Data(mutation.id.utf8).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
    let recordID = CKRecord.ID(recordName: String(name.prefix(240)))
    let record: CKRecord = try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<CKRecord, Error>) in
      database.fetch(withRecordID: recordID) { existing, error in
        if let existing {
          continuation.resume(returning: existing)
        } else if let error = error as? CKError, error.code == .unknownItem {
          continuation.resume(returning: CKRecord(recordType: Self.recordType, recordID: recordID))
        } else {
          continuation.resume(throwing: error ?? FylogiaSyncError.malformedCloudRecord)
        }
      }
    }
    record["collection"] = mutation.collection.rawValue as CKRecordValue
    record["key"] = mutation.key as CKRecordValue
    record["payload"] = mutation.payload as CKRecordValue
    record["updatedAt"] = mutation.updatedAt as CKRecordValue
    record["origin"] = mutation.origin as CKRecordValue
    record["isDeleted"] = NSNumber(value: mutation.isDeleted)
    try await withCheckedThrowingContinuation {
      (continuation: CheckedContinuation<Void, Error>) in
      database.save(record) { _, error in
        if let error {
          continuation.resume(throwing: error)
        } else {
          continuation.resume(returning: ())
        }
      }
    }
  }

  private static func decode(_ record: CKRecord) -> FylogiaSyncRecord? {
    guard let rawCollection = record["collection"] as? String,
      let collection = FylogiaSyncCollection(rawValue: rawCollection),
      let key = record["key"] as? String,
      let payload = record["payload"] as? Data,
      let updatedAt = record["updatedAt"] as? Date,
      let origin = record["origin"] as? String
    else { return nil }
    return FylogiaSyncRecord(
      collection: collection, key: key, payload: payload, updatedAt: updatedAt,
      origin: origin, isDeleted: record["isDeleted"] as? Bool ?? false)
  }
}
