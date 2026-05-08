# Demo Script

## Five-Second Moment

Enter `vault.demo.upgradesiren.eth`.

The app resolves ENS, reads the proxy, fetches Sourcify evidence, and the verdict turns red:

> SIREN: current implementation is unverified.

Line:

> Same protocol name, same proxy, different code. No source, no upgrade.

## Three-Minute Booth Script

### 0:00 Hook

"Upgradeable contracts can change underneath users while the address and brand stay the same. Upgrade Siren makes that moment public."

### 0:20 ENS Lookup

Show the lookup field and enter:

```text
vault.demo.upgradesiren.eth
```

Explain:

"ENS is not cosmetic here. It is the public contract map: stable proxy and owner records, ENSIP-26 discovery, and one atomic upgrade manifest."

### 0:45 Live Chain Check

Show:

- proxy address
- manifest-declared previous implementation
- current implementation from EIP-1967 slot
- manifest-declared current implementation
- match or mismatch

### 1:10 Sourcify Evidence

Open the evidence drawer:

- previous implementation verified
- current implementation verified or unverified
- report hash matches fetched bytes
- EIP-712 signature recovers to `siren:owner`
- ABI diff
- storage-layout result
- Sourcify links

### 1:45 Three Scenarios

Run the three prepared examples:

| Scenario | Expected screen |
|---|---|
| Safe upgrade | `SAFE` |
| Dangerous upgrade | `SIREN` |
| Unverified upgrade | `SIREN` |

### 2:20 Governance Comment

Click "Copy governance comment".

Show that a delegate can paste a concise reason:

```text
I cannot support this upgrade yet. Upgrade Siren reports that the current implementation is not verified on Sourcify and does not match the ENS-declared implementation.
```

### 2:45 Sponsor Close

"For Sourcify, verified source is the evidence layer. For ENS, names become a contract/version/report map. For ETHPrague, this is public-good safety infrastructure for DAO voters and users."

## Optional Umia Add-On

If pitching Umia, show Siren Agent:

- watchlist of venture contracts
- due-diligence verdict before funding
- post-launch alert when an implementation changes

Line:

> Siren Agent gives launch platforms a contract-risk monitor around funded ventures.

## Failure Demo

Keep one intentionally bad case:

- ENS manifest says current implementation is `0xA`
- live proxy slot points to `0xB`
- Sourcify cannot verify `0xB`
- UI returns `SIREN`

This is the strongest judge moment.
