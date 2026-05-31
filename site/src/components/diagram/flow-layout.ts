export type RawNode = { id: string; label: string; col?: number; row?: number; sub?: string };
export type PlacedNode = { id: string; label: string; col: number; row: number; sub?: string };

/** Auto-place nodes left-to-right, wrapping every `perRow`, unless col/row are explicit. */
export function placeNodes(nodes: RawNode[], perRow: number): PlacedNode[] {
  let auto = 0;
  return nodes.map((n) => {
    if (n.col != null && n.row != null) return { ...n, col: n.col, row: n.row };
    const col = auto % perRow;
    const row = Math.floor(auto / perRow);
    auto++;
    return { ...n, col, row };
  });
}
