export const VIEW = { W: 800, H: 450 } as const;

export type Pt = { x: number; y: number };

export type Prim =
  | { k: "genre"; text: string; x: number; y: number }                 // mono caps top-left label
  | { k: "formula"; text: string; x: number; y: number }               // mono formula strip
  | { k: "axis"; x0: number; x1: number; y: number; arrow: boolean }   // horizontal line, optional arrowhead at x1
  | { k: "arc"; from: Pt; to: Pt; lift: number }                       // dashed quadratic arc, control lifted by `lift`
  | { k: "node"; x: number; y: number; fill: "hollow" | "solid"; d?: number }
  | { k: "dropLine"; x: number; y0: number; y1: number }               // vertical tick from node to axis
  | { k: "tick"; x: number; y: number; label?: string }                // axis tick + optional caption under it
  | { k: "label"; text: string; x: number; y: number; weight?: "mono" | "ink" }
  | { k: "hero"; text: string; x: number; y: number }                  // serif emphasis word
  | { k: "caption"; text: string; x: number; y: number }               // small italic note
  | { k: "chip"; text: string; x: number; y: number; w?: number; tone?: "ink" | "accent" | "warn" }
  | { k: "arrow"; from: Pt; to: Pt }                                    // connector with arrowhead
  | { k: "divider"; x: number; y0: number; y1: number }
  | { k: "pulse"; x: number; y: number; w: number };                   // underline that pulses

// `order` drives the CSS draw/reveal stagger (0-based step index).
export type Scene = { prims: Array<Prim & { order?: number }> };
