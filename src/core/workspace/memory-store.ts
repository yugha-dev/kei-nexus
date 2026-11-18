import fs from 'node:fs';
import path from 'node:path';

export interface MemoryEntry {
  key: string;
  value: unknown;
  tags: string[];
  updatedAt: string;
}

/**
 * MemoryStore manages episodic and semantic memory persistence in .workspace/memory/store.json
 */
export class MemoryStore {
  private readonly storeFile: string;
  private cache: Map<string, MemoryEntry> = new Map();

  constructor(memoryDir: string) {
    this.storeFile = path.join(memoryDir, 'store.json');
    this.load();
  }

  private load(): void {
    if (fs.existsSync(this.storeFile)) {
      try {
        const raw = fs.readFileSync(this.storeFile, 'utf-8');
        const data = JSON.parse(raw) as Record<string, MemoryEntry>;
        this.cache = new Map(Object.entries(data));
      } catch {
        this.cache = new Map();
      }
    }
  }

  private save(): void {
    const parentDir = path.dirname(this.storeFile);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    const serialized = Object.fromEntries(this.cache.entries());
    fs.writeFileSync(this.storeFile, JSON.stringify(serialized, null, 2), 'utf-8');
  }

  public set(key: string, value: unknown, tags: string[] = []): void {
    this.cache.set(key, {
      key,
      value,
      tags,
      updatedAt: new Date().toISOString(),
    });
    this.save();
  }

  public get<T = unknown>(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry ? (entry.value as T) : undefined;
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result) this.save();
    return result;
  }

  public searchByTag(tag: string): MemoryEntry[] {
    const lower = tag.toLowerCase();
    return Array.from(this.cache.values()).filter((e) =>
      e.tags.some((t) => t.toLowerCase() === lower)
    );
  }

  public listAll(): MemoryEntry[] {
    return Array.from(this.cache.values());
  }

  public clear(): void {
    this.cache.clear();
    this.save();
  }
}
