import { createPublicClient, custom, type EIP1193Parameters, type PublicRpcSchema } from 'viem';
import { sepolia } from 'viem/chains';
import { describe, expect, it } from 'vitest';

import {
  EIP1967_IMPLEMENTATION_SLOT,
  extractImplementationFromSlot,
  readImplementationSlot,
} from '../../src/chain/eip1967.js';

type RpcRequest = EIP1193Parameters<PublicRpcSchema>;

function makeClient(handler: (req: RpcRequest) => Promise<unknown>) {
  return createPublicClient({
    chain: sepolia,
    transport: custom({
      async request(args) {
        return handler(args as RpcRequest);
      },
    }),
  });
}

const PROXY: `0x${string}` = '0x1111111111111111111111111111111111111111';
const IMPL: `0x${string}` = '0x222222222222222222222222222222222222BEEF';
const ZERO_32 = '0x0000000000000000000000000000000000000000000000000000000000000000' as const;
const PADDED_IMPL = `0x000000000000000000000000${IMPL.slice(2).toLowerCase()}` as const;

describe('EIP-1967 slot constant', () => {
  it('matches the canonical keccak256("eip1967.proxy.implementation") - 1', () => {
    expect(EIP1967_IMPLEMENTATION_SLOT).toBe(
      '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc',
    );
  });
});

describe('extractImplementationFromSlot', () => {
  it('extracts the rightmost 20 bytes as a checksummed address', () => {
    const result = extractImplementationFromSlot(PADDED_IMPL);
    expect(result?.toLowerCase()).toBe(IMPL.toLowerCase());
    // EIP-55 checksum: result must contain at least one uppercase hex char
    // when the address has non-trivial bytes.
    expect(result).toMatch(/[A-F]/);
  });

  it('returns null when the slot is all zero', () => {
    expect(extractImplementationFromSlot(ZERO_32)).toBeNull();
  });

  it('handles a slot value with non-zero high bytes by taking only the low 20', () => {
    const noisy = `0xdeadbeefcafef00d000000000000${IMPL.slice(2).toLowerCase()}` as const;
    const result = extractImplementationFromSlot(noisy);
    expect(result?.toLowerCase()).toBe(IMPL.toLowerCase());
  });
});

describe('readImplementationSlot', () => {
  it('reads the slot, returns the implementation address, and echoes the slot value', async () => {
    let observedSlot: string | undefined;
    let observedAddress: string | undefined;
    const client = makeClient(async (req) => {
      if (req.method === 'eth_getStorageAt') {
        const params = req.params as readonly [string, string, string];
        observedAddress = params[0];
        observedSlot = params[1];
        return PADDED_IMPL;
      }
      throw new Error(`unmocked rpc method: ${req.method}`);
    });

    const result = await readImplementationSlot(sepolia.id, PROXY, { client });

    expect(observedSlot).toBe(EIP1967_IMPLEMENTATION_SLOT);
    expect(observedAddress?.toLowerCase()).toBe(PROXY.toLowerCase());
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.implementation?.toLowerCase()).toBe(IMPL.toLowerCase());
      expect(result.slotValue).toBe(PADDED_IMPL);
    }
  });

  it('returns implementation: null when the slot is zero (proxy not initialized)', async () => {
    const client = makeClient(async (req) => {
      if (req.method === 'eth_getStorageAt') return ZERO_32;
      throw new Error(`unmocked rpc method: ${req.method}`);
    });

    const result = await readImplementationSlot(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('ok');
    if (result.kind === 'ok') {
      expect(result.implementation).toBeNull();
      expect(result.slotValue).toBe(ZERO_32);
    }
  });

  it('returns rpc_error when the underlying transport throws', async () => {
    const client = makeClient(async () => {
      throw new Error('boom: provider unavailable');
    });

    const result = await readImplementationSlot(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('rpc_error');
      expect(result.message).toContain('boom');
    }
  });

  it('returns invalid_slot_value when the RPC echoes garbage', async () => {
    const client = makeClient(async () => 'not-hex' as unknown as `0x${string}`);

    const result = await readImplementationSlot(sepolia.id, PROXY, { client });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.reason).toBe('invalid_slot_value');
    }
  });

  it('returns unsupported_chain for an unknown chainId without calling the network', async () => {
    let networkCalls = 0;
    const client = makeClient(async () => {
      networkCalls += 1;
      return ZERO_32;
    });

    const result = await readImplementationSlot(999_999, PROXY, { client });
    expect(result.kind).toBe('ok');
    expect(networkCalls).toBe(1);

    const result2 = await readImplementationSlot(999_999, PROXY);
    expect(result2.kind).toBe('error');
    if (result2.kind === 'error') {
      expect(result2.reason).toBe('unsupported_chain');
    }
  });
});
