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
      className="flex w-full flex-col gap-3"
      aria-label="ENS lookup"
    >
      <label
        htmlFor="ens-lookup-input"
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-t3"
      >
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
        placeholder="safe.upgrade-siren-demo.eth"
        className="border border-border-strong bg-bg px-4 py-3 font-mono text-sm text-t1 placeholder:text-t3 focus:border-accent focus:outline-none"
        aria-invalid={error !== null}
        aria-describedby={error ? "ens-lookup-error" : undefined}
      />
      {error !== null ? (
        <p
          id="ens-lookup-error"
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
        Look up verdict
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}
