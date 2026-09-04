import { OrderedEntry, CatalogItem } from "./types";

/**
 * The user's chronological, drag-reorderable selection list. This — not the
 * catalog's `catalogOrder` — is what ultimately drives the Field Parameter's
 * applied ordering.
 */
export class OrderedSelectionModel {
    private entries: OrderedEntry[] = [];

    getAll(): readonly OrderedEntry[] {
        return this.entries;
    }

    getKeys(): string[] {
        return this.entries.map(e => e.key);
    }

    has(key: string): boolean {
        return this.entries.some(e => e.key === key);
    }

    indexOf(key: string): number {
        return this.entries.findIndex(e => e.key === key);
    }

    /** Replaces the whole list. Defensive-copies entries. */
    replace(entries: readonly OrderedEntry[]): void {
        this.entries = entries.map(e => ({ ...e }));
    }

    add(item: CatalogItem, now: number = Date.now()): boolean {
        if (this.has(item.key)) {
            return false;
        }
        this.entries.push({ key: item.key, label: item.label, value: item.value, selectedAt: now });
        return true;
    }

    remove(key: string): boolean {
        const before = this.entries.length;
        this.entries = this.entries.filter(e => e.key !== key);
        return this.entries.length !== before;
    }

    /** Adds if absent, removes if present. Returns true if now selected. */
    toggle(item: CatalogItem, now: number = Date.now()): boolean {
        if (this.has(item.key)) {
            this.remove(item.key);
            return false;
        }
        this.add(item, now);
        return true;
    }

    reorder(fromIndex: number, toIndex: number): boolean {
        if (fromIndex < 0 || fromIndex >= this.entries.length) {
            return false;
        }
        if (toIndex < 0 || toIndex >= this.entries.length) {
            return false;
        }
        if (fromIndex === toIndex) {
            return false;
        }
        const moved = this.entries.splice(fromIndex, 1)[0];
        if (!moved) {
            return false;
        }
        this.entries.splice(toIndex, 0, moved);
        return true;
    }

    moveByKey(key: string, toIndex: number): boolean {
        const fromIndex = this.indexOf(key);
        if (fromIndex < 0) {
            return false;
        }
        return this.reorder(fromIndex, toIndex);
    }

    moveUp(key: string): boolean {
        const index = this.indexOf(key);
        if (index <= 0) {
            return false;
        }
        return this.reorder(index, index - 1);
    }

    moveDown(key: string): boolean {
        const index = this.indexOf(key);
        if (index < 0 || index >= this.entries.length - 1) {
            return false;
        }
        return this.reorder(index, index + 1);
    }

    clear(): boolean {
        if (this.entries.length === 0) {
            return false;
        }
        this.entries = [];
        return true;
    }

    /** Drops entries whose key no longer exists in the current tree. Returns true if anything changed. */
    pruneToValidKeys(validKeys: ReadonlySet<string>): boolean {
        const before = this.entries.length;
        this.entries = this.entries.filter(e => validKeys.has(e.key));
        return this.entries.length !== before;
    }
}
