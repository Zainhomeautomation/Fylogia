# Fylogia Apple programme test report

Date: 2026-11-02, Asia/Muscat. Use PASS / FAIL / NOT RUN explicitly; prior release results are not new native validation.

## Phase 1 frozen website

| Check                              | Status                          | Evidence                                                                                                     |
| ---------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Personal GitHub ownership          | PASS                            | Zainhomeautomation/Fylogia, owner type User.                                                                 |
| Live/GitHub source consistency     | PASS at freeze                  | Both `26fd37f27bd70cd7495f33209b823796770d9c22`; live build dirty=false.                                     |
| Golden tag                         | PASS                            | Annotated tag object `ca205e79dcecbd891522984a83289eb3f34a835d` points to frozen source.                     |
| Tag update/delete protection       | PASS configuration verification | Active exact-tag ruleset 26345306, no bypass actors; no destructive deletion test attempted.                 |
| Local production build             | PASS                            | 57 canonical sitemap URLs, 295 source editions, distribution checks pass.                                    |
| Live asset/security comparison     | PASS                            | Compiled JS/CSS match live assets; manifest icons load; private sync status remains 401 without credentials. |
| Independent source bundle          | PASS                            | Complete-history bundle verification and SHA256SUMS outside checkout.                                        |
| Recovery checkout build/unit tests | RUNNING                         | Detached checkout restored from the bundle; cached locked dependencies reused.                               |
| Full tag regression suite          | RUNNING                         | GitHub Actions workflow_dispatch run 41394627737; no production deployment job.                              |
| Live rollback                      | NOT RUN intentionally           | Current site remains unchanged. Recovery is rehearsed in isolation.                                          |

## Apple environment

| Check                                                      | Status       | Evidence                                                                                               |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| Xcode installation discovery                               | UNAVAILABLE  | No full Xcode application found; selected developer directory is CommandLineTools.                     |
| Simulator inventory                                        | FAIL tooling | XcodeBuildMCP reports simctl unavailable.                                                              |
| Native app build/launch                                    | NOT RUN      | No native app exists yet; sequential phase gate not reached.                                           |
| Actual standalone iOS/iPadOS PWA performance               | NOT RUN      | Host-specific reproduction/profiling required in Phase 3; desktop display-mode emulation is not proof. |
| Physical iPhone/iPad/iPhone Duo/Apple Pencil               | NOT RUN      | No physical hardware test performed.                                                                   |
| Native haptics/audio/widgets/intents/notifications/iCloud  | NOT RUN      | Later sequential phases, not implemented or claimed.                                                   |
| Instruments/VoiceOver/Dynamic Type/native memory profiling | NOT RUN      | Requires usable Apple toolchain and implemented native app.                                            |

The owner-reported Home Screen PWA slowdown remains open. No root cause, permanent correction, App Store readiness or native frame-rate guarantee is claimed from the website baseline tests.
