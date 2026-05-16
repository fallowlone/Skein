#!/bin/bash
# Finalize merge when all 6 chunks available

OUTDIR="/Users/artemmac/dev/awesome-everything/graphify-out"
FINAL="$OUTDIR/knowledge-graph-final.json"
CHUNKS_OK=0

# Wait for all 6 chunks with 10min timeout
for i in {1..120}; do
  CHUNKS_OK=$(find "$OUTDIR" -name ".graphify_chunk_*.json" | wc -l)
  if [ "$CHUNKS_OK" -eq 6 ]; then
    echo "All 6 chunks ready" >&2
    break
  fi
  if [ $((i % 12)) -eq 0 ]; then
    echo "Waiting: $CHUNKS_OK/6 chunks ($((i/2))min)" >&2
  fi
  sleep 5
done

if [ "$CHUNKS_OK" -lt 6 ]; then
  echo "TIMEOUT: Only $CHUNKS_OK/6 chunks ready after 10min. Using partial merge." >&2
fi

# Merge all available
python3 << 'PYEOF'
import json
from pathlib import Path

chunks_dir = Path("/Users/artemmac/dev/awesome-everything/graphify-out")
all_nodes = {}
all_edges = {}
all_hyperedges = {}
chunk_count = 0

for i in range(1, 7):
    path = chunks_dir / f".graphify_chunk_{i:02d}.json"
    if not path.exists():
        continue

    with open(path) as f:
        chunk = json.load(f)
    chunk_count += 1

    for node in chunk.get("nodes", []):
        all_nodes[node["id"]] = node

    for edge in chunk.get("edges", []):
        key = (edge["source"], edge["target"], edge["relation"])
        if key not in all_edges:
            all_edges[key] = edge
        else:
            if edge["confidence_score"] > all_edges[key]["confidence_score"]:
                all_edges[key] = edge

    for he in chunk.get("hyperedges", []):
        all_hyperedges[he["id"]] = he

result = {
    "nodes": list(all_nodes.values()),
    "edges": list(all_edges.values()),
    "hyperedges": list(all_hyperedges.values()),
    "metadata": {
        "total_nodes": len(all_nodes),
        "total_edges": len(all_edges),
        "total_hyperedges": len(all_hyperedges),
        "chunks_merged": chunk_count,
        "generated_at": "2026-05-16T00:00:00Z"
    }
}

with open("/Users/artemmac/dev/awesome-everything/graphify-out/knowledge-graph-final.json", "w") as f:
    json.dump(result, f, indent=2)

print(f"Merged {chunk_count} chunks: {len(all_nodes)} nodes, {len(all_edges)} edges, {len(all_hyperedges)} hyperedges")
PYEOF

echo "✓ Final merge complete: $FINAL"
