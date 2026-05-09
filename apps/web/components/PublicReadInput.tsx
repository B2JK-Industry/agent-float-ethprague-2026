"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type PublicReadInputProps = {
  initialValue?: string;
};

const HEX_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
const INVALID_ERROR =
  "Enter a 0x-prefixed Ethereum address (40 hex chars) or an ENS name containing a dot.";

function classifyInput(raw: string): "address" | "ens" | "invalid" {
  const trimmed = raw.trim();
  if (HEX_ADDRESS_REGEX.test(trimmed)) return "address";
  if (trimmed.includes(".") && trimmed.length >= 3) return "ens";
  return "invalid";
}

export function PublicReadInput({
  initialValue = "",
}: PublicReadInputProps): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState<string>(initialValue);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = value.trim();
    const kind = classifyInput(trimmed);

    if (kind === "invalid") {
      setError(INVALID_ERROR);
      return;
    }

    setError(null);
    const target =
      kind === "address" ? trimmed : encodeURIComponent(trimmed);
    router.push(`/r/${target}?mode=public-read`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-3"
      aria-label="Public-read fallback lookup"
    >
      <label
        htmlFor="public-read-input"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3"
      >
        Address or ENS name
      </label>
      <input
        id="public-read-input"
        name="public-read"
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        placeholder="0x87870Bca…fA4E2 · aave.eth · letadlo.eth"
        className="border border-border-strong bg-bg px-4 py-3 font-mono text-sm text-t1 placeholder:text-t3 focus:border-accent focus:outline-none"
        aria-invalid={error !== null}
        aria-describedby={error ? "public-read-error" : undefined}
      />
      {error !== null ? (
        <p
          id="public-read-error"
          role="alert"
          className="font-mono text-xs text-verdict-siren"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 border border-accent bg-bg px-5 py-3 font-mono text-sm uppercase tracking-[0.18em] text-accent hover:bg-accent hover:text-bg"
      >
        Read public verdict
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
