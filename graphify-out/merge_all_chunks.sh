#!/bin/bash
set -e

OUTPUT="/Users/artemmac/dev/awesome-everything/graphify-out/knowledge-graph.json"
TEMP="/tmp/graphify_merge_$$.json"

python3 << 'PYEOF'
import json
from pathlib import Path
from collections import defaultdict

chunks_dir = Path("/Users/artemmac/dev/awesome-everything/graphify-out")
chunks = []

# Load all chunks
for i in range(1, 7):
    path = chunks_dir / f".graphify_chunk_{i:02d}.json"
    if path.exists():
        with open(path) as f:
            chunks.append(json.load(f))
        print(f"✓ Loaded chunk {i}", flush=True)
    else:
        print(f"✗ Chunk {i} missing", flush=True)

if not chunks:
    print("ERROR: No chunks found")
    exit(1)

# Merge all
all_nodes = {}
all_edges = {}
all_hyperedges = {}

for chunk in chunks:
    for node in chunk.get("nodes", []):
        all_nodes[node["id"]] = node

    for edge in chunk.get("edges", []):
        key = (edge["source"], edge["target"], edge["relation"])
        if key not in all_edges:
            all_edges[key] = edge
        else:
            # Keep highest confidence
            if edge["confidence_score"] > all_edges[key]["confidence_score"]:
                all_edges[key] = edge

    for he in chunk.get("hyperedges", []):
        all_hyperedges[he["id"]] = he

# Output
result = {
    "nodes": list(all_nodes.values()),
    "edges": list(all_edges.values()),
    "hyperedges": list(all_hyperedges.values()),
    "metadata": {
        "total_nodes": len(all_nodes),
        "total_edges": len(all_edges),
        "total_hyperedges": len(all_hyperedges),
        "chunks_merged": len(chunks),
        "generated_at": "2026-05-16T00:00:00Z"
    }
}

with open("/tmp/graphify_merge_temp.json", "w") as f:
    json.dump(result, f, indent=2)

print(f"✓ Merged {len(chunks)} chunks")
print(f"  Nodes: {len(all_nodes)}")
print(f"  Edges: {len(all_edges)}")
print(f"  Hyperedges: {len(all_hyperedges)}")
PYEOF

# Move to final
mv /tmp/graphify_merge_temp.json "$OUTPUT"
echo "✓ Written to $OUTPUT"
