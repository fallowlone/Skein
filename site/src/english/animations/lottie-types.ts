// Loose-but-useful TS surface for the Bodymovin docs our generators emit.
// Not exhaustive — only what the builder/player/gate touch.
export type Vec = number[];
export type Scalar = number;

export type Prop<T = Vec | Scalar> =
  | { a: 0; k: T }
  | { a: 1; k: Array<{ t: number; s: number[]; i?: { x: number[] | number; y: number[] | number }; o?: { x: number[] | number; y: number[] | number } }> };

export type ShapeItem = Record<string, unknown> & { ty: string };

export type TextDoc = { s: number; f: string; t: string; j: number; tr: number; lh: number; ls: number; fc: number[] };

export type Layer = {
  ty: 0 | 1 | 2 | 4 | 5;
  nm?: string;
  ip: number;
  op: number;
  st: number;
  ks: {
    o: Prop; p: Prop; a: Prop; s: Prop; r: Prop;
  };
  shapes?: ShapeItem[];
  t?: { d: { k: Array<{ t: number; s: TextDoc }> }; p: Record<string, unknown>; m: Record<string, unknown>; a: unknown[] };
};

export type LottieDoc = {
  v: "5.7.0";
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  assets: unknown[];
  fonts?: { list: Array<{ fName: string; fFamily: string; fStyle: string; fWeight: string; ascent: number }> };
  layers: Layer[];
};
