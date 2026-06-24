// Tiny Stack VM — reference solution
// ISA: PUSH n | ADD | SUB | MUL | DUP | SWAP | ROT | JMP label |
//      JMPIF label | CALL label | RET | HALT

// Opcodes (numeric encoding)
const OP = {
  PUSH:  0,
  ADD:   1,
  SUB:   2,
  MUL:   3,
  DUP:   4,
  SWAP:  5,
  ROT:   6,
  JMP:   7,
  JMPIF: 8,
  CALL:  9,
  RET:   10,
  HALT:  11,
} as const;

/**
 * Two-pass assembler.
 * Pass 1: collect label → instruction-index positions.
 * Pass 2: emit opcodes, resolving label references.
 * Returns a flat number[] ready for run().
 */
export function assemble(src: string): number[] {
  const lines = src.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // ── Pass 1: count instructions and record label positions ──────────────
  const labels = new Map<string, number>();
  let instrIdx = 0;
  for (const line of lines) {
    if (line.endsWith(":")) {
      labels.set(line.slice(0, -1), instrIdx);
    } else {
      const mnemonic = line.split(/\s+/)[0].toUpperCase();
      instrIdx++;
      // PUSH, JMP, JMPIF, CALL each consume one extra word (operand)
      if (["PUSH", "JMP", "JMPIF", "CALL"].includes(mnemonic)) instrIdx++;
    }
  }

  // ── Pass 2: emit ────────────────────────────────────────────────────────
  const code: number[] = [];
  for (const line of lines) {
    if (line.endsWith(":")) continue; // label definition, skip

    const parts = line.split(/\s+/);
    const mnemonic = parts[0].toUpperCase();

    switch (mnemonic) {
      case "PUSH":
        code.push(OP.PUSH, Number(parts[1]));
        break;
      case "ADD":  code.push(OP.ADD);  break;
      case "SUB":  code.push(OP.SUB);  break;
      case "MUL":  code.push(OP.MUL);  break;
      case "DUP":  code.push(OP.DUP);  break;
      case "SWAP": code.push(OP.SWAP); break;
      case "ROT":  code.push(OP.ROT);  break;
      case "JMP": {
        const addr = labels.get(parts[1]);
        if (addr === undefined) throw new Error(`Unknown label: ${parts[1]}`);
        code.push(OP.JMP, addr);
        break;
      }
      case "JMPIF": {
        const addr = labels.get(parts[1]);
        if (addr === undefined) throw new Error(`Unknown label: ${parts[1]}`);
        code.push(OP.JMPIF, addr);
        break;
      }
      case "CALL": {
        const addr = labels.get(parts[1]);
        if (addr === undefined) throw new Error(`Unknown label: ${parts[1]}`);
        code.push(OP.CALL, addr);
        break;
      }
      case "RET":  code.push(OP.RET);  break;
      case "HALT": code.push(OP.HALT); break;
      default:
        throw new Error(`Unknown mnemonic: ${mnemonic}`);
    }
  }

  return code;
}

/**
 * Fetch-decode-execute loop.
 * Returns the top of the value stack when HALT is executed.
 * Throws "stack underflow" when a binary op needs 2 values but fewer exist.
 */
export function run(code: number[]): number {
  const stack: number[] = [];
  // Call stack stores return addresses (indices into code[])
  const callStack: number[] = [];
  let ip = 0; // instruction pointer (index into code[])

  function pop2(): [number, number] {
    if (stack.length < 2) throw new Error("stack underflow");
    const b = stack.pop()!;
    const a = stack.pop()!;
    return [a, b];
  }

  while (ip < code.length) {
    const op = code[ip++];
    switch (op) {
      case OP.PUSH:
        stack.push(code[ip++]);
        break;
      case OP.ADD: { const [a, b] = pop2(); stack.push(a + b); break; }
      case OP.SUB: { const [a, b] = pop2(); stack.push(a - b); break; }
      case OP.MUL: { const [a, b] = pop2(); stack.push(a * b); break; }
      case OP.DUP:
        if (stack.length < 1) throw new Error("stack underflow");
        stack.push(stack[stack.length - 1]);
        break;
      case OP.SWAP: {
        if (stack.length < 2) throw new Error("stack underflow");
        const top = stack[stack.length - 1];
        stack[stack.length - 1] = stack[stack.length - 2];
        stack[stack.length - 2] = top;
        break;
      }
      case OP.ROT: {
        // ( a b c -- b c a )  where c is top; a is deepest of the three
        if (stack.length < 3) throw new Error("stack underflow");
        const c = stack.pop()!;
        const b = stack.pop()!;
        const a = stack.pop()!;
        stack.push(b, c, a);
        break;
      }
      case OP.JMP:
        ip = code[ip];
        break;
      case OP.JMPIF: {
        const target = code[ip++];
        const cond = stack.pop();
        if (cond === undefined) throw new Error("stack underflow");
        if (cond !== 0) ip = target;
        break;
      }
      case OP.CALL: {
        const target = code[ip++];
        callStack.push(ip); // return address = instruction after CALL operand
        ip = target;
        break;
      }
      case OP.RET:
        if (callStack.length === 0) throw new Error("call stack underflow");
        ip = callStack.pop()!;
        break;
      case OP.HALT:
        if (stack.length === 0) throw new Error("stack underflow at HALT");
        return stack[stack.length - 1];
      default:
        throw new Error(`Unknown opcode: ${op}`);
    }
  }

  throw new Error("program ran off the end without HALT");
}
