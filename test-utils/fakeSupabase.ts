// Minimal in-memory fake of the Supabase client used by db/sync.tsx.
//
// SyncService only touches `supabase.from(table)` with:
//   - push: `.upsert(rows, opts?)` then `await` → { error }
//   - pull: `.select(...).eq().is().not().gt()` then `await` → { data, error }
//
// The fake records upsert payloads (so tests can assert the exact column
// projection sent to the server — the contract Phase 1 must preserve) and
// returns preset `remote` data for selects. Server-side filters (eq/is/gt/…)
// are no-ops; the test decides what a select "returns" via `store.remote`.
//
// Wire it in with:
//   jest.mock('@/utils/supabase', () => require('@/test-utils/fakeSupabase'));

type Row = Record<string, unknown>;

interface Store {
    /** Preset rows a select() on a table returns. */
    remote: Record<string, Row[]>;
    /** Captured upsert payloads per table. */
    upserts: Record<string, Row[]>;
    /** Tables whose upsert should return an error. */
    failUpsert: Set<string>;
    /** Tables whose select should return an error. */
    failSelect: Set<string>;
}

function createStore(): Store {
    return { remote: {}, upserts: {}, failUpsert: new Set(), failSelect: new Set() };
}

// Reassigned by resetSupabase(); the CommonJS `exports.store` binding tracks it.
// eslint-disable-next-line import/no-mutable-exports
export let store: Store = createStore();

export function resetSupabase(): void {
    store = createStore();
}

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
    private op: 'select' | 'upsert' | null = null;
    private payload: Row[] = [];

    constructor(private readonly table: string) {}

    select(): this { this.op = 'select'; return this; }

    upsert(rows: Row | Row[]): this {
        this.op = 'upsert';
        this.payload = Array.isArray(rows) ? rows : [rows];
        return this;
    }

    // Query filters are server-side in real Supabase; no-ops here.
    eq(): this { return this; }
    is(): this { return this; }
    not(): this { return this; }
    gt(): this { return this; }
    in(): this { return this; }
    order(): this { return this; }
    limit(): this { return this; }

    private run(): { data: Row[] | null; error: { message: string } | null } {
        if (this.op === 'upsert') {
            store.upserts[this.table] = (store.upserts[this.table] ?? []).concat(this.payload);
            if (store.failUpsert.has(this.table)) {
                return { data: null, error: { message: `upsert ${this.table} failed` } };
            }
            return { data: null, error: null };
        }
        if (store.failSelect.has(this.table)) {
            return { data: null, error: { message: `select ${this.table} failed` } };
        }
        return { data: store.remote[this.table] ?? [], error: null };
    }

    then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2> {
        return Promise.resolve(this.run()).then(onfulfilled, onrejected);
    }
}

export const supabase = {
    from(table: string): FakeQuery {
        return new FakeQuery(table);
    },
};
