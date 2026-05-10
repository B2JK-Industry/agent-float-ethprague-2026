export type {
  EncodedHookData,
  PermitDomain,
  ServerPermitMessage,
  SignedServerPermit,
} from './types.js';

export {
  SERVER_PERMIT_TYPE_FLAG,
  UMIA_VALIDATION_HOOK_DOMAIN_NAME,
  UMIA_VALIDATION_HOOK_DOMAIN_VERSION,
} from './types.js';

export type {
  ServerPermitTypedData,
  ServerPermitTypedDataTypes,
} from './typedData.js';

export {
  SERVER_PERMIT_TYPED_DATA_TYPES,
  buildServerPermitDomain,
  buildServerPermitTypedData,
} from './typedData.js';

export type { SignServerPermitInput } from './sign.js';
export { signServerPermit } from './sign.js';

export { encodeHookData } from './encode.js';

export type { VerifyServerPermitInput } from './verify.js';
export { recoverServerPermitSigner } from './verify.js';
