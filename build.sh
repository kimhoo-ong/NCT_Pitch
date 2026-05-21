#!/usr/bin/env bash
# build.sh — Produces dist/index.html from src/ files.
# No external tooling required: plain bash + cat.
# Usage: bash build.sh            (or: chmod +x build.sh && ./build.sh)
# Requires: Node.js (for reconciliation tests only — not needed to run dist/index.html)

set -e  # Exit immediately on any error

DIST="dist/index.html"

echo "=== NCT Feasibility Simulator — Build ==="
echo ""

# ── Step 1: Run reconciliation tests ────────────────────────────────────────
echo "[1/3] Running reconciliation tests..."
if ! node src/tests/reconciliation.js; then
  echo ""
  echo "ERROR: Reconciliation tests failed. Build blocked."
  echo "Fix the issues listed in BLOCKERS.md before building."
  exit 1
fi
echo "      Tests passed."
echo ""

# ── Step 2: Assemble single HTML file ───────────────────────────────────────
echo "[2/3] Assembling dist/index.html..."

mkdir -p dist

# Build order matters (matches browser dependency graph):
#   baseline.js → calculations.js → formatters.js → data-loader.js
#   → ui modules → reconciliation inline (dev mode only) → app boot

cat > "$DIST" << 'HTML_OPEN'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NCT Feasibility Simulator — Emira Shah Alam</title>
  <style>
HTML_OPEN

# Inline CSS
cat src/styles.css >> "$DIST"

cat >> "$DIST" << 'HTML_STYLE_END'
  </style>
</head>
<body>
HTML_STYLE_END

# Inline HTML shell
cat src/index.html >> "$DIST"

cat >> "$DIST" << 'SCRIPTS_OPEN'
<script>
/* ── Data ─────────────────────────────────────────────────────────────── */
SCRIPTS_OPEN

# Strip Node.js module.exports shims from each JS file before inlining.
# The shim pattern is: if (typeof module !== 'undefined') { module.exports = ...; }
strip_node_shim() {
  sed '/if (typeof module/,/^}/d' "$1"
}

strip_node_shim src/data/baseline.js     >> "$DIST"
strip_node_shim src/lib/calculations.js  >> "$DIST"
strip_node_shim src/lib/formatters.js    >> "$DIST"
strip_node_shim src/lib/data-loader.js   >> "$DIST"

echo "" >> "$DIST"
echo "/* ── UI ──────────────────────────────────────────────────────────────── */" >> "$DIST"

strip_node_shim src/ui/tabs.js        >> "$DIST"
strip_node_shim src/ui/levers.js      >> "$DIST"
strip_node_shim src/ui/kpis.js        >> "$DIST"
strip_node_shim src/ui/cost-detail.js >> "$DIST"
strip_node_shim src/ui/summary.js     >> "$DIST"
strip_node_shim src/ui/export.js      >> "$DIST"

echo "" >> "$DIST"
echo "/* ── App boot ────────────────────────────────────────────────────────── */" >> "$DIST"
cat src/app.js >> "$DIST"

cat >> "$DIST" << 'SCRIPTS_CLOSE'
</script>
</body>
</html>
SCRIPTS_CLOSE

echo "      Assembled: $DIST"
echo ""

# ── Step 3: File size check ──────────────────────────────────────────────────
echo "[3/3] Checking file size..."
SIZE_BYTES=$(wc -c < "$DIST")
SIZE_KB=$(( SIZE_BYTES / 1024 ))
MAX_KB=200

echo "      Size: ${SIZE_KB} KB  (limit: ${MAX_KB} KB)"

if [ "$SIZE_KB" -gt "$MAX_KB" ]; then
  echo ""
  echo "ERROR: dist/index.html exceeds 200 KB budget (${SIZE_KB} KB)."
  echo "Optimize CSS/JS before shipping."
  exit 1
fi

echo ""
echo "=== Build complete: $DIST (${SIZE_KB} KB) ==="
