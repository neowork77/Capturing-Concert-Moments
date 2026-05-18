#!/bin/bash
# Batch optimize gallery images to WebP format
# Resizes to max 1920px wide and compresses to quality 80

ASSETS_DIR="$(cd "$(dirname "$0")/../src/assets" && pwd)"
OPTIMIZED_DIR="$ASSETS_DIR/optimized"

mkdir -p "$OPTIMIZED_DIR"

echo "🖼️  Optimizing images in $ASSETS_DIR..."
echo ""

for file in "$ASSETS_DIR"/gallery-*.{jpg,jpeg}; do
  [ -f "$file" ] || continue
  
  basename=$(basename "$file")
  name="${basename%.*}"
  output="$OPTIMIZED_DIR/${name}.webp"
  
  if [ -f "$output" ]; then
    echo "⏭️  Skip (exists): $basename"
    continue
  fi
  
  original_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
  original_mb=$(echo "scale=1; $original_size / 1048576" | bc)
  
  echo -n "🔄 Converting $basename (${original_mb}MB)..."
  
  # Use sips to resize to max 1920px wide, then convert to WebP with quality 80
  convert "$file" -resize "1920x1920>" -quality 80 -strip "$output" 2>/dev/null
  
  if [ -f "$output" ]; then
    new_size=$(stat -f%z "$output" 2>/dev/null || stat -c%s "$output" 2>/dev/null)
    new_kb=$(echo "scale=0; $new_size / 1024" | bc)
    savings=$(echo "scale=0; (1 - $new_size / $original_size) * 100" | bc)
    echo " ✅ ${new_kb}KB (${savings}% smaller)"
  else
    echo " ❌ Failed"
  fi
done

echo ""
echo "✨ Done! Optimized images are in: $OPTIMIZED_DIR"
echo ""

# Calculate total savings
original_total=0
optimized_total=0
for file in "$ASSETS_DIR"/gallery-*.{jpg,jpeg}; do
  [ -f "$file" ] || continue
  original_total=$((original_total + $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)))
done
for file in "$OPTIMIZED_DIR"/*.webp; do
  [ -f "$file" ] || continue
  optimized_total=$((optimized_total + $(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)))
done
orig_mb=$(echo "scale=1; $original_total / 1048576" | bc)
opt_mb=$(echo "scale=1; $optimized_total / 1048576" | bc)
echo "📊 Total: ${orig_mb}MB → ${opt_mb}MB"
