"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type EnsLookupFormProps = {
  initialValue?: string;
};

const NO_DOT_ERROR =
  "Enter a full ENS name (must contain a dot, e.g. vault.demo.upgradesiren.eth).";

export function EnsLookupForm({
  initialValue = "",
}: EnsLookupFormProps): React.JSX.Element {
  const router = useRouter();
  const [value, setValue] = useState<string>(initialValue);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.includes(".")) {
      setError(NO_DOT_ERROR);
      return;
    }
    setError(null);
    // US-131: route through /lookup/[name] for server-side mode
    // detection. The lookup handler 307-redirects to /r/[name] when
    // upgrade-siren:proxy is present (existing single-contract flow,
    // unchanged) or to /b/[name] for Bench Mode otherwise.
    router.push(`/lookup/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-md flex-col gap-2"
      aria-label="ENS lookup"
    >
      <label htmlFor="ens-lookup-input" className="text-sm">
        ENS name
      </label>
      <input
        id="ens-lookup-input"
        name="ens-name"
        type="text"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        placeholder="vault.demo.upgradesiren.eth"
        className="rounded border border-border bg-raised px-3 py-2 text-sm"
        aria-invalid={error !== null}
        aria-describedby={error ? "ens-lookup-error" : undefined}
      />
      {error !== null ? (
        <p
          id="ens-lookup-error"
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
        Look up verdict
      </button>
    </form>
  );
}
