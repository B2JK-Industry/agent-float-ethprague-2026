# Mentor Questions

## Sourcify

1. Which API endpoint should we use for verification status, metadata, ABI, and storage layout?
2. What Sourcify feature do you most want hackers to showcase beyond a basic verified/unverified check?
3. Should partial verification be shown as `REVIEW` or `SIREN`?
4. Is storage-layout comparison a good bounty fit, or should we focus on metadata/source links and bytecode evidence?
5. What is the best demo contract pattern for judges to inspect quickly?
6. Are there rate limits or endpoint caveats for a live booth demo?
7. Does the "unverified implementation becomes public SIREN" loop feel like a useful Sourcify adoption flywheel?

## ENS

1. Does `upgrade-siren:*` make sense as a collision-reduced prototype namespace for upgrade-risk metadata?
2. Should `upgrade-siren:upgrade_manifest` be a text record, `contenthash`, or CCIP-Read response?
3. Is ENSIP-26 `agent-context` + `agent-endpoint[web]` appropriate as the standards-compatible layer?
4. Is a hierarchy like `v1.vault.demo.upgradesiren.eth` and `latest.vault.demo.upgradesiren.eth` compelling?
5. Would wildcard/offchain subnames make this more creative, or too risky for the timeframe?
6. What should we avoid putting in public ENS records?
7. What would make this bounty submission feel central to ENS rather than decorative?

## ETHPrague / Future Society

1. Does a public upgrade alarm fit Future Society better than a venture due-diligence story?
2. Should the demo focus on DAO voting, wallet warnings, or public funding review?
3. What Solarpunk language lands without sounding vague?

## Umia Optional

Ask only if Daniel decides to pursue Umia:

1. Would an agent that performs venture contract due diligence qualify as an agentic venture?
2. Does Umia need pre-funding checks, post-funding monitoring, or both?
3. What output should Siren Agent produce for a venture profile?
4. Would signed reports be useful inside the Umia flow?
