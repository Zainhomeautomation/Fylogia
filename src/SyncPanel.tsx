import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  cloudRequest,
  privateRequest,
  connectCloud,
  disconnectCloud,
  synchronize,
  getCloudStatus,
  subscribeCloud,
  latestSyncBackup,
} from "./cloud-sync";
import { incomingPairCode } from "./pair-link";
type Identity = {
  profileId: string;
  deviceId: string;
  recoveryKey?: string;
  resumed?: boolean;
};
type Device = { id: string; label: string; current: boolean; lastSeen: number };
type PairRequest = {
  id: string;
  label: string;
  challenge: string;
  approvedDeviceId: string | null;
};
export default function SyncPanel({ onClose }: { onClose: () => void }) {
  const cloud = useSyncExternalStore(subscribeCloud, getCloudStatus);
  const dialog = useRef<HTMLDialogElement>(null);
  const [label, setLabel] = useState(
    "My " +
      (/iPad/.test(navigator.userAgent)
        ? "iPad"
        : /iPhone/.test(navigator.userAgent)
          ? "iPhone"
          : "device"),
  );
  const [code, setCode] = useState(incomingPairCode),
    [recovery, setRecovery] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState(""),
    [pair, setPair] = useState<{ code: string; expiresAt: number }>();
  const [qr, setQr] = useState(""),
    [challenge, setChallenge] = useState("");
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [identity, setIdentity] = useState<Identity>(),
    [requests, setRequests] = useState<PairRequest[]>([]),
    [devices, setDevices] = useState<Device[]>([]);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const active = useRef(true);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    active.current = true;
    dialog.current?.showModal();
    return () => {
      active.current = false;
      previous?.focus({ preventScroll: true });
    };
  }, []);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Please try again when connected.",
      );
    } finally {
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    if (!cloud.connected) return;
    let stopped = false;
    async function refresh() {
      try {
        const [a, b] = await Promise.all([
          privateRequest<{ requests: PairRequest[] }>("requests"),
          privateRequest<{ devices: Device[] }>("devices"),
        ]);
        if (!stopped) {
          setRequests(a.requests);
          setDevices(b.devices);
        }
      } catch (e) {
        if (!stopped)
          setError(e instanceof Error ? e.message : "Unable to check devices.");
      }
    }
    void refresh();
    const timer = setInterval(
      () => {
        if (!document.hidden && navigator.onLine) void refresh();
      },
      pair ? 5000 : 60000,
    );
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [cloud.connected, pair]);
  useEffect(() => {
    if (!challenge || identity) return;
    let stopped = false;
    const timer = setInterval(async () => {
      if (!navigator.onLine || document.hidden) return;
      try {
        const result = await cloudRequest<Identity & { approved: boolean }>(
          "pending",
        );
        if (!stopped && result.approved) {
          setIdentity(result);
          setChallenge("");
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : "Pairing expired.");
          setChallenge("");
        }
      }
    }, 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [challenge, identity]);
  useEffect(() => {
    if (!pair) return;
    let stopped = false;
    void import("qrcode-generator")
      .then(({ default: QRCode }) => {
        const q = QRCode(0, "M");
        q.addData(
          location.origin +
            import.meta.env.BASE_URL +
            "settings#pair=" +
            pair.code,
        );
        q.make();
        if (!stopped) setQr(q.createDataURL(5, 4));
      })
      .catch(() => {
        if (!stopped) setMessage("Use the pairing code below.");
      });
    const timer = setTimeout(
      () => {
        if (!stopped) {
          setPair(undefined);
          setMessage(
            "The pairing code expired. Generate a new one to continue.",
          );
        }
      },
      Math.max(0, pair.expiresAt - Date.now()),
    );
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [pair]);
  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Copied. Keep recovery keys private.");
  }
  return (
    <dialog
      ref={dialog}
      className="sync-dialog"
      aria-labelledby="sync-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <button
          className="icon-button"
          aria-label="Back to Fylogia"
          title="Back to Fylogia"
          onClick={onClose}
        >
          <ArrowLeft />
        </button>
        <h2 id="sync-title">Your library, everywhere.</h2>
      </header>
      <div className="sync-content">
        <p>
          Optional private device sync. No email, password, or registration.
          Your articles and downloads stay on each device. Custom feed links
          containing query parameters stay local to protect private access
          codes.
        </p>
        {(error || cloud.error) && (
          <p className="notice" role="alert">
            {error || cloud.error}
          </p>
        )}
        {message && <p role="status">{message}</p>}
        {key && (
          <section className="sync-recovery">
            <h3>Save your recovery key</h3>
            {recoveryPending && (
              <p>
                Save this replacement key before confirming. Confirmation
                disconnects previous devices. If this screen closes before
                confirmation, your previous recovery key remains valid.
              </p>
            )}
            <p>
              This key reconnects your library if all devices are lost. Keep it
              somewhere private. It is shown only here and is never added to a
              link.
            </p>
            <input
              aria-label="Saved recovery key"
              readOnly
              type={showKey ? "text" : "password"}
              value={key}
              autoComplete="off"
            />
            <button className="secondary" onClick={() => setShowKey(!showKey)}>
              {showKey ? "Hide recovery key" : "Show recovery key"}
            </button>
            <button
              className="secondary"
              onClick={() => void act(() => copy(key))}
            >
              Copy recovery key
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  if (recoveryPending) {
                    const result =
                      await cloudRequest<Identity>("recover-confirm");
                    setIdentity(result);
                    setRecoveryPending(false);
                  }
                  setKey("");
                })
              }
            >
              I have saved my key
            </button>
          </section>
        )}
        {identity && !cloud.connected ? (
          <section>
            <h3>Combine your libraries</h3>
            <p>
              Combine saved links, sources, interests, and reading progress with
              the approved library. Its appearance settings take precedence. A
              local backup is saved before merging. Offline article files remain
              separate on each device.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await connectCloud(identity);
                  setIdentity(undefined);
                })
              }
            >
              Combine libraries and sync
            </button>
          </section>
        ) : null}
        {!cloud.connected && !identity && !challenge && !recoveryPending && (
          <>
            <label className="field">
              Device name
              <input
                value={label}
                maxLength={60}
                onChange={(e) => setLabel(e.target.value)}
                autoComplete="off"
              />
            </label>
            <section>
              <h3>Start a private library</h3>
              <p>
                Only reading metadata is sent to Fylogia’s Cloudflare backend.
                It is private to your linked devices, encrypted in transit and
                at rest, but is not end-to-end encrypted. Local reading remains
                available without sync.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const result = await cloudRequest<Identity>("create", {
                      label,
                    });
                    if (result.recoveryKey) setKey(result.recoveryKey);
                    if (result.resumed) setIdentity(result);
                    else await connectCloud(result);
                  })
                }
              >
                Enable private sync
              </button>
            </section>
            <section>
              <h3>Link to an existing device</h3>
              <p>
                On your original device, choose “Link another device.” Scan its
                QR code with your camera, or enter the code here. Check the
                matching number on both screens before approving.
              </p>
              <label className="field">
                Pairing code
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE-FG234"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={24}
                />
              </label>
              <button
                className="secondary"
                disabled={busy || !code.trim()}
                onClick={() =>
                  void act(async () => {
                    const result = await cloudRequest<{ challenge: string }>(
                      "join",
                      { code, label },
                    );
                    setChallenge(result.challenge);
                    setCode("");
                  })
                }
              >
                Request device link
              </button>
            </section>
            <details>
              <summary>Recover a library</summary>
              <p>
                Recovery rotates the key and disconnects previous devices. You
                will review the library merge before syncing this device.
              </p>
              <label className="field">
                Recovery key
                <input
                  type="password"
                  value={recovery}
                  onChange={(e) => setRecovery(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="secondary"
                disabled={busy || !recovery}
                onClick={() =>
                  void act(async () => {
                    const result = await cloudRequest<Identity>("recover", {
                      recoveryKey: recovery.trim(),
                      label,
                    });
                    setRecovery("");
                    setKey(result.recoveryKey || "");
                    setRecoveryPending(true);
                  })
                }
              >
                Recover and review library
              </button>
            </details>
          </>
        )}
        {challenge && (
          <section>
            <h3>Approve on your original device</h3>
            <p>Confirm that both devices show this matching number:</p>
            <output className="pair-code" aria-label="Matching number">
              {challenge}
            </output>
            <p>
              The request expires in five minutes. No library data is shared
              before approval.
            </p>
          </section>
        )}
        {cloud.connected && (
          <>
            <p role="status">
              {cloud.busy
                ? "Syncing your library…"
                : cloud.pending
                  ? `${cloud.pending} changes queued`
                  : "Library synchronized"}
              {cloud.lastSync
                ? " · " +
                  new Date(cloud.lastSync).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : ""}
            </p>
            <button
              className="secondary"
              disabled={busy || cloud.busy}
              onClick={() => void act(synchronize)}
            >
              <RefreshCw size={16} />
              Sync now
            </button>
            <section>
              <h3>Link another device</h3>
              <button
                className="primary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    setQr("");
                    setPair(await privateRequest("pair"));
                  })
                }
              >
                Create pairing code
              </button>
              {pair && (
                <div className="sync-pair">
                  {pair && qr && (
                    <img
                      src={qr}
                      alt="Scan with the camera on your other device to request a secure link"
                      width={240}
                      height={240}
                    />
                  )}
                  <output className="pair-code" aria-label="Pairing code">
                    {pair.code}
                  </output>
                  <p>
                    Single use · expires in five minutes. Approve only a request
                    you recognize.
                  </p>
                </div>
              )}
              {requests
                .filter((r) => !r.approvedDeviceId)
                .map((r) => (
                  <div className="sync-request" key={r.id}>
                    <strong>{r.label}</strong>
                    <output
                      className="pair-code"
                      aria-label="Requested matching number"
                    >
                      {r.challenge}
                    </output>
                    <p>
                      Approve only if this number matches your other device.
                    </p>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          await privateRequest("approve", { requestId: r.id });
                          setRequests((items) =>
                            items.filter((a) => a.id !== r.id),
                          );
                        })
                      }
                    >
                      Approve matching device
                    </button>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          await privateRequest("reject", { requestId: r.id });
                          setRequests((items) =>
                            items.filter((a) => a.id !== r.id),
                          );
                        })
                      }
                    >
                      Reject request
                    </button>
                  </div>
                ))}
            </section>
            <section>
              <h3>Linked devices</h3>
              {devices.map((d) => (
                <div className="sync-device" key={d.id}>
                  <span>
                    {d.label}
                    {d.current ? " (this device)" : ""}
                  </span>
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={() =>
                      void act(async () => {
                        if (d.current) await disconnectCloud();
                        else await privateRequest("revoke", { deviceId: d.id });
                        setDevices((items) =>
                          items.filter((a) => a.id !== d.id),
                        );
                      })
                    }
                  >
                    {d.current ? "Disconnect this device" : "Revoke device"}
                  </button>
                </div>
              ))}
              <p>
                Disconnecting keeps local articles and downloads. Revoked
                devices cannot access future cloud changes; copies already
                downloaded remain on them.
              </p>
            </section>
            <details>
              <summary>Recovery and cloud deletion</summary>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    const r = await privateRequest<{ recoveryKey: string }>(
                      "rotate-recovery",
                    );
                    setKey(r.recoveryKey);
                  })
                }
              >
                Create new recovery key
              </button>
              <p>
                Creating a key invalidates the old recovery key. Keep the new
                one private.
              </p>
              <label className="field">
                Type DELETE to remove the private cloud library
                <input
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                className="secondary"
                disabled={busy || confirmation !== "DELETE"}
                onClick={() =>
                  void act(async () => {
                    await disconnectCloud(true);
                    setConfirmation("");
                    setDevices([]);
                    setKey("");
                    setMessage(
                      "Cloud library deleted. Your local library and downloads are still available.",
                    );
                  })
                }
              >
                Delete cloud library
              </button>
            </details>
          </>
        )}
        <details>
          <summary>Local merge backup</summary>
          <p>
            The three most recent pre-sync backups remain on this device.
            Download a backup to import through Settings → Library management.
          </p>
          <button
            className="secondary"
            onClick={() =>
              void act(async () => {
                const backup = await latestSyncBackup();
                if (!backup)
                  throw new Error("No merge backup has been needed yet.");
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(backup, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "fylogia-before-sync.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              })
            }
          >
            Download pre-sync backup
          </button>
        </details>
      </div>
    </dialog>
  );
}
