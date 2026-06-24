// ── CRC32 (polynomial 0xEDB88320, table-driven) ──────────────────────────────

const CRC32_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    t[i] = c;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC32_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Disk: in-memory growable byte buffer ─────────────────────────────────────
//
// `data` always returns the SAME Uint8Array view of the live buffer, so a test
// can flip a byte in the returned view and the WAL will see the mutation when
// it next calls `disk.data`.

export class Disk {
  // Single backing Uint8Array; doubled in capacity on overflow.
  private _buf: Uint8Array = new Uint8Array(64);
  private _size = 0;

  append(bytes: Uint8Array): void {
    const needed = this._size + bytes.length;
    if (needed > this._buf.length) {
      let cap = this._buf.length;
      while (cap < needed) cap *= 2;
      const next = new Uint8Array(cap);
      next.set(this._buf.subarray(0, this._size));
      this._buf = next;
    }
    this._buf.set(bytes, this._size);
    this._size += bytes.length;
  }

  /** Lop off everything at or after offset — simulates a torn write / crash. */
  crashTruncate(offset: number): void {
    this._size = Math.max(0, Math.min(offset, this._size));
  }

  /**
   * Returns a Uint8Array view into the live backing buffer (not a copy).
   * Mutations to the returned array are reflected in future replay() calls.
   */
  get data(): Uint8Array {
    return this._buf.subarray(0, this._size);
  }

  get size(): number {
    return this._size;
  }
}

// ── WAL: length-framed + CRC32 records over a Disk ───────────────────────────
//
// Frame layout (all big-endian u32):
//   [4 bytes: body length] [4 bytes: crc32(body)] [body bytes…]

const HEADER_SIZE = 8; // 4 (len) + 4 (crc)

function writeU32BE(n: number, out: Uint8Array, offset: number): void {
  out[offset]     = (n >>> 24) & 0xff;
  out[offset + 1] = (n >>> 16) & 0xff;
  out[offset + 2] = (n >>>  8) & 0xff;
  out[offset + 3] =  n         & 0xff;
}

function readU32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset]     << 24 |
     data[offset + 1] << 16 |
     data[offset + 2] <<  8 |
     data[offset + 3]) >>> 0
  );
}

export class WAL {
  private _disk: Disk;
  private checkpointOffset = 0;

  constructor(disk: Disk) {
    this._disk = disk;
  }

  append(body: Uint8Array | string): void {
    const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
    const crc = crc32(bytes);
    const frame = new Uint8Array(HEADER_SIZE + bytes.length);
    writeU32BE(bytes.length, frame, 0);
    writeU32BE(crc,          frame, 4);
    frame.set(bytes, HEADER_SIZE);
    this._disk.append(frame);
  }

  replay(): Uint8Array[] {
    const data = this._disk.data;
    const results: Uint8Array[] = [];
    let pos = this.checkpointOffset;

    while (pos + HEADER_SIZE <= data.length) {
      const bodyLen = readU32BE(data, pos);
      const storedCrc = readU32BE(data, pos + 4);

      // Incomplete frame: body extends beyond buffer
      if (pos + HEADER_SIZE + bodyLen > data.length) break;

      const body = data.slice(pos + HEADER_SIZE, pos + HEADER_SIZE + bodyLen);
      const computedCrc = crc32(body);

      // Corrupt frame: CRC mismatch → stop here
      if (computedCrc !== storedCrc) break;

      results.push(body);
      pos += HEADER_SIZE + bodyLen;
    }

    return results;
  }

  /** Advance the replay floor to the current end of log. */
  checkpoint(): void {
    this.checkpointOffset = this._disk.size;
  }

  /**
   * Trim the buffer to remove pre-checkpoint bytes.
   * After compact(), checkpointOffset resets to 0 and the Disk is smaller.
   */
  compact(): void {
    if (this.checkpointOffset === 0) return;
    const full = this._disk.data;
    const tail = full.slice(this.checkpointOffset); // copy so we can reset disk
    this._disk.crashTruncate(0);
    this._disk.append(tail);
    this.checkpointOffset = 0;
  }

  get disk(): Disk {
    return this._disk;
  }
}
