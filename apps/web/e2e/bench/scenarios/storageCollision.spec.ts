// US-129: storage-collision scenario — fixture data shaped to trigger
// COLLISION in US-119's hygiene aggregator.
//
// Per EPIC §8.1: when the previous and current implementation share a
// slot+offset but differ in type, classifySlot returns 'collision' and
// the per-pair hygiene score is 0.0. The proxy hygiene aggregate then
// drops below 1.0, which is what GATE-31 requires the Sourcify drawer
// to render (red collision row).
//
// This scenario is the visible proof that US-119 (hygiene aggregator)
// is doing real work — without this assertion, an aggregator that
// silently always returned 1.0 could pass every other test.

import { test, expect } from "../../fixtures/bench-test.js";
import {
    computeProxyHygiene,
    computeSubjectHygiene,
} from "../../../../../packages/evidence/src/diff/storageHygiene.js";
import type { StorageLayout } from "../../../../../packages/evidence/src/diff/storage.js";

const PROXY = "0x4444444444444444444444444444444444444444";
const IMPL_PREV = "0xaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const IMPL_CURR = "0xbbbb1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

// VaultV1-shaped layout: slot 0 = owner (address), slot 1 = balances mapping.
function layoutV1(): StorageLayout {
    return {
        storage: [
            { slot: "0", offset: 0, type: "t_address", label: "owner" },
            {
                slot: "1",
                offset: 0,
                type: "t_mapping(t_address,t_uint256)",
                label: "balances",
            },
        ],
        types: {
            t_address: { encoding: "inplace", label: "address", numberOfBytes: "20" },
            "t_mapping(t_address,t_uint256)": {
                encoding: "mapping",
                label: "mapping(address => uint256)",
                key: "t_address",
                value: "t_uint256",
                numberOfBytes: "32",
            },
            t_uint256: { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
        },
    };
}

// Deliberately incompatible upgrade: slots 0 and 1 are SWAPPED in type.
// slot 0 is now a mapping head (was an address), slot 1 is now an address
// (was a mapping head). Both slot+offset positions match V1 → classifier
// returns 'collision' for both, not 'safe' or 'soft_rename'.
function layoutCollision(): StorageLayout {
    return {
        storage: [
            {
                slot: "0",
                offset: 0,
                type: "t_mapping(t_address,t_uint256)",
                label: "balances",
            },
            { slot: "1", offset: 0, type: "t_address", label: "owner" },
        ],
        types: {
            t_address: { encoding: "inplace", label: "address", numberOfBytes: "20" },
            "t_mapping(t_address,t_uint256)": {
                encoding: "mapping",
                label: "mapping(address => uint256)",
                key: "t_address",
                value: "t_uint256",
                numberOfBytes: "32",
            },
            t_uint256: { encoding: "inplace", label: "uint256", numberOfBytes: "32" },
        },
    };
}

test.describe("US-129 storage-collision scenario — hygiene < 1.0 + collision row visible (GATE-31)", () => {
    test("computeProxyHygiene flags collision on both slots; proxy.score === 0.0", async ({
        msw: _msw,
    }) => {
        const proxyHygiene = computeProxyHygiene(PROXY, 11155111, [
            { address: IMPL_PREV, layout: layoutV1() },
            { address: IMPL_CURR, layout: layoutCollision() },
        ]);

        // Exactly one upgrade pair.
        expect(proxyHygiene.pairs.length).toBe(1);
        const pair = proxyHygiene.pairs[0]!;

        // Both slots collide (slot 0 type address→mapping; slot 1 type
        // mapping→address). The classifier visits position 0 and position 1
        // and returns 'collision' for both.
        const collisions = pair.slots.filter((s) => s.classification === "collision");
        expect(collisions.length).toBe(2);

        // Per-pair score is the average over scoreable slots; both
        // collisions contribute 0.0 → pair score 0.0.
        expect(pair.score).toBe(0.0);

        // Per-proxy aggregate is the avg over pairs → 0.0.
        expect(proxyHygiene.score).toBe(0.0);
    });

    test("computeSubjectHygiene aggregate is below 1.0 when one proxy collides (GATE-31 cap)", async ({
        msw: _msw,
    }) => {
        const collidingProxy = computeProxyHygiene(PROXY, 11155111, [
            { address: IMPL_PREV, layout: layoutV1() },
            { address: IMPL_CURR, layout: layoutCollision() },
        ]);
        const cleanProxy = computeProxyHygiene(
            "0x5555555555555555555555555555555555555555",
            11155111,
            [], // no upgrades observed → score 1.0 per EPIC step 5
        );

        const subject = computeSubjectHygiene([collidingProxy, cleanProxy]);

        expect(subject.score).not.toBeNull();
        expect(subject.score!).toBeLessThan(1.0);
        // With one 0.0 and one 1.0 → average 0.5.
        expect(subject.score!).toBeCloseTo(0.5, 6);

        // Drawer renders the collision row red — i.e. the data US-135
        // needs to render that row exists in the proxyHygiene structure.
        const collidingProxyInSubject = subject.proxies.find(
            (p) => p.proxyAddress === PROXY,
        );
        expect(collidingProxyInSubject).toBeDefined();
        const collisionSlots = collidingProxyInSubject!.pairs[0]!.slots.filter(
            (s) => s.classification === "collision",
        );
        expect(collisionSlots.length).toBeGreaterThan(0);
    });
});
