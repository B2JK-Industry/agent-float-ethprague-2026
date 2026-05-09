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
      className="flex w-full max-w-md flex-col gap-2"
      aria-label="Public-read fallback lookup"
    >
      <label htmlFor="public-read-input" className="text-sm">
        Address or ENS name (public-read)
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
        placeholder="0x... or aave.eth"
        className="rounded border border-border bg-raised px-3 py-2 text-sm font-mono"
        aria-invalid={error !== null}
        aria-describedby={error ? "public-read-error" : undefined}
      />
      {error !== null ? (
        <p
          id="public-read-error"
          role="alert"
          className="text-sm text-verdict-siren"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="rounded border border-t1 px-3 py-2 text-sm hover:bg-raised"
      >
        Read public verdict
      </button>
    </form>
  );
}
