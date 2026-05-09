"use client";

import { useState } from "react";
import type { EnsResolutionResult } from "@upgrade-siren/evidence";

export type EnsRecordsPanelProps = {
  ens: EnsResolutionResult;
};

type RecordRow = {
  readonly key: string;
  readonly label: string;
  readonly value: string | null;
};

const STABLE_RECORD_LABELS: Array<{
  readonly key: string;
  readonly label: string;
  readonly select: (
    ens: Extract<EnsResolutionResult, { kind: "ok" }>,
  ) => string | null;
}> = [
  {
    key: "upgrade-siren:chain_id",
    label: "chain_id",
    select: (e) => e.records.chainId,
  },
  {
    key: "upgrade-siren:proxy",
    label: "proxy",
    select: (e) => e.records.proxy,
  },
  {
    key: "upgrade-siren:owner",
    label: "owner",
    select: (e) => e.records.owner,
  },
  {
    key: "upgrade-siren:schema",
    label: "schema",
    select: (e) => e.records.schema,
  },
];

function RecordItem({ row }: { row: RecordRow }): React.JSX.Element {
  const present = row.value !== null;
  return (
    <li
      data-record-key={row.key}
      data-present={present ? "true" : "false"}
      className={
        present
          ? "flex flex-col gap-0.5"
          : "flex flex-col gap-0.5 opacity-60"
      }
    >
      <span className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
        {row.label}
      </span>
      {present ? (
        <code className="break-all font-mono text-sm">{row.value}</code>
      ) : (
        <span
          data-state="absent"
          className="inline-block w-fit rounded border border-dashed border-[color:var(--color-border)] px-1.5 py-0.5 text-xs uppercase text-[color:var(--color-text-muted)]"
        >
          absent
        </span>
      )}
    </li>
  );
}

function ManifestBlock({ raw }: { raw: string | null }): React.JSX.Element {
  const [expanded, setExpanded] = useState<boolean>(false);

  if (raw === null) {
    return (
      <li data-record-key="upgrade-siren:upgrade_manifest" data-present="false" className="opacity-60">
        <span className="text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]">
          upgrade_manifest
        </span>
        <span
          data-state="absent"
          className="ml-2 inline-block rounded border border-dashed border-[color:var(--color-border)] px-1.5 py-0.5 text-xs uppercase text-[color:var(--color-text-muted)]"
        >
          absent
        </span>
      </li>
    );
  }

  let pretty = raw;
  try {
    pretty = JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    // keep raw if not valid JSON
  }

  return (
    <li data-record-key="upgrade-siren:upgrade_manifest" data-present="true">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="manifest-json"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-[color:var(--color-text-muted)]"
      >
        <span aria-hidden>{expanded ? "▼" : "▶"}</span>
        upgrade_manifest
      </button>
      {expanded ? (
        <pre
          id="manifest-json"
          className="mt-1 overflow-x-auto rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-2 font-mono text-xs"
        >
          {pretty}
        </pre>
      ) : null}
    </li>
  );
}

export function EnsRecordsPanel({
  ens,
}: EnsRecordsPanelProps): React.JSX.Element {
  if (ens.kind === "error") {
    return (
      <section
        aria-label="ENS records"
        data-state="error"
        className="rounded border border-[color:var(--color-siren)] p-3"
      >
        <h3 className="text-sm font-bold">ENS resolution error</h3>
        <p className="text-xs text-[color:var(--color-siren)]">
          {ens.reason}: {ens.message}
        </p>
      </section>
    );
  }

  const stableRows: RecordRow[] = STABLE_RECORD_LABELS.map((entry) => ({
    key: entry.key,
    label: entry.label,
    value: entry.select(ens),
  }));

  const ensip26Present =
    ens.flags.agentContextPresent ||
    ens.flags.agentEndpointWebPresent ||
    ens.flags.agentEndpointMcpPresent;

  return (
    <section
      aria-label="ENS records"
      data-state={ens.anyUpgradeSirenRecordPresent ? "signed-manifest" : "public-read"}
      className="flex flex-col gap-3"
    >
      <header className="flex items-baseline gap-2">
        <h3 className="text-sm font-bold">ENS records</h3>
        <code className="font-mono text-xs text-[color:var(--color-text-muted)]">
          {ens.name}
        </code>
      </header>

      <ul className="flex flex-col gap-2">
        {stableRows.map((row) => (
          <RecordItem key={row.key} row={row} />
        ))}
        <ManifestBlock raw={ens.records.upgradeManifestRaw} />
      </ul>

      {ensip26Present ? (
        <section aria-label="ENSIP-26 records" className="flex flex-col gap-2 border-t border-[color:var(--color-border)] pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider">
            ENSIP-26
          </h4>
          <ul className="flex flex-col gap-2">
            {ens.flags.agentContextPresent ? (
              <RecordItem
                row={{
                  key: "agent-context",
                  label: "agent-context",
                  value: ens.agentContext,
                }}
              />
            ) : null}
            {ens.flags.agentEndpointWebPresent ? (
              <RecordItem
                row={{
                  key: "agent-endpoint[web]",
                  label: "agent-endpoint[web]",
                  value: ens.agentEndpointWeb,
                }}
              />
            ) : null}
            {ens.flags.agentEndpointMcpPresent ? (
              <RecordItem
                row={{
                  key: "agent-endpoint[mcp]",
                  label: "agent-endpoint[mcp]",
                  value: ens.agentEndpointMcp,
                }}
              />
            ) : null}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
