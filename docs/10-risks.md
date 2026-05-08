# Risks

## Top Risks

| Risk | Severity | Why it matters | Mitigation |
|---|---:|---|---|
| Looks like generic scanner | High | Crowded and weak pitch | Keep upgrade-specific, ENS-named, Sourcify-backed |
| Sourcify data too thin for demo | High | Primary sponsor fit collapses | Build fixtures with verified implementations and known metadata |
| ENS feels decorative | High | ENS bounty requires central use | Make app break without ENS records |
| Storage layout unavailable | Medium | Diff may look shallow | Show honest `REVIEW`; emphasize verification and ABI diff |
| Overbuilding agent story | Medium | Umia can distract from stronger Sourcify/ENS path | Keep Siren Agent optional |
| Demo contracts too artificial | Medium | Judges may discount it | Deploy real fixtures, link Sourcify pages, show live reads |
| False confidence | High | Security tooling must be honest | Say verification is necessary, not sufficient |
| Time pressure | High | Deadline is close | Build three strong scenarios, not a broad platform |
| Mentor answers arrive too late | High | Sponsor-specific endpoint or ENS namespace advice may miss build window | Front-load Sourcify and ENS mentor sweeps; treat Umia as optional |
| Booth Wi-Fi fails | High | Live ENS/Sourcify/RPC demo can fail despite correct code | Prepare hotspot, pre-warmed cache, Anvil/local fallback, and recorded demo |
| RPC rate limits | High | EIP-1967 reads and ENS resolution can fail during judging | Use Alchemy mainnet/Sepolia RPC, retry logic, and cached demo fixtures |
| Sourcify rate limits or outage | High | Primary evidence source may be unavailable at booth time | Cache demo fixture responses and label cache state honestly |
| ENS registration delay | Medium | Brand parent may not be registered before demo | Use chosen parent as soon as possible; fall back to available alternate or Sepolia/demo parent |
| Vercel env/config failure | Medium | Production deploy can be live but unable to resolve RPC/API data | Add env checklist, `/health` endpoint, and preview deploy smoke test |
| Shared schema race | Medium | Evidence engine and web UI may diverge on Siren Report JSON | Make `packages/shared` schema a P0 cross-stream item before UI integration |
| Reviewer bottleneck | Medium | PR reviewer can over-block or miss critical issues | Daniel spot-checks high-risk PRs and can override with explicit comment |
| Unsigned report spoofing | High | Hash-only report validation proves integrity but not authority | Require EIP-712 signature by `siren:owner`; reject unsigned production reports |
| Multi-record ENS desync | Medium | Separate upgrade records can temporarily disagree and create false `SIREN` or false confidence | Use one atomic `siren:upgrade_manifest` JSON record with hash-chain |

## Kill Signals

- Product works without ENS.
- Product works without Sourcify.
- Verdict is only an LLM summary.
- No live chain read.
- Production report lacks valid EIP-712 signature from `siren:owner`.
- Demo cannot show an unverified implementation.
- Pitch says "AI auditor".
- UI is too dense for non-auditors.
- Booth demo requires live services but has no fallback.
- Vercel production deploy lacks required environment variables.

## Strong Signals

- Judge understands the red-screen moment in under 10 seconds.
- Sourcify mentor sees their data as core evidence.
- ENS mentor sees contract/version/report discovery as central.
- DAO voter workflow feels real.
- Optional Umia story sounds like due diligence, not a forced launchpad.
