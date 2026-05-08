# Upgrade Siren Wiki

Upgrade Siren is a public upgrade-risk alarm for named Ethereum contracts.

Tagline:

> No source, no upgrade.

## Start Here

1. [Project Overview](./Project-Overview.md)
2. [Product Architecture](./Product-Architecture.md)
3. [Business Architecture](./Business-Architecture.md)
4. [Sponsor Strategy](./Sponsor-Strategy.md)
5. [Demo Script](./Demo-Script.md)
6. [Risk Register](./Risk-Register.md)

## Current Status

Documentation has been pivoted from the previous Agent Float concept to Upgrade Siren. Code remains blocked until Daniel locks this as the build scope.

## Core Idea

When an upgradeable contract changes implementation, Upgrade Siren resolves the protocol's ENS contract map, reads the live proxy state, checks Sourcify evidence, and returns a public verdict:

- `SAFE`
- `REVIEW`
- `SIREN`

## Sponsor Targets

| Priority | Target |
|---|---|
| 1 | Sourcify |
| 2 | ENS Most Creative Use |
| 3 | ETHPrague Future Society |
| Optional | Umia through Siren Agent due diligence |
