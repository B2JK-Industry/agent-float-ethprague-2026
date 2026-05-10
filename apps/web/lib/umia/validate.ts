// Ajv-based runtime validator for the Umia venture-apply payload.
// Pure function, no side effects — instantiates a singleton Ajv and
// returns a structured pass/fail. Drives the form's Download CTA gate.

import Ajv from "ajv";
import addFormats from "ajv-formats";

import schemaJson from "./umia-venture-apply.schema.json";
import type { UmiaVenturePayload } from "./types";

let ajv: Ajv | null = null;
let validator: ReturnType<Ajv["compile"]> | null = null;

function getValidator(): ReturnType<Ajv["compile"]> {
  if (validator !== null) return validator;
  ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  validator = ajv.compile(schemaJson);
  return validator;
}

export interface UmiaValidationOk {
  readonly kind: "ok";
  readonly payload: UmiaVenturePayload;
}

export interface UmiaValidationError {
  readonly kind: "error";
  readonly errors: ReadonlyArray<{
    readonly path: string;
    readonly message: string;
  }>;
}

export type UmiaValidationResult = UmiaValidationOk | UmiaValidationError;

export function validateUmiaPayload(payload: unknown): UmiaValidationResult {
  const validate = getValidator();
  const ok = validate(payload);
  if (ok) return { kind: "ok", payload: payload as UmiaVenturePayload };
  const errs = (validate.errors ?? []).map((e) => ({
    path: e.instancePath || "<root>",
    message: `${e.keyword}: ${e.message ?? "(no message)"}`,
  }));
  return { kind: "error", errors: errs };
}
