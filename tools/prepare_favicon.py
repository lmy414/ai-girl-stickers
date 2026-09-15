from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
source = ROOT / "assets" / "ai-nya-favicon_20260915_140054_1.png"
transparent = ROOT / "assets" / "ai-nya-favicon-transparent.png"
favicon_png = ROOT / "dist" / "favicon.png"
favicon_ico = ROOT / "dist" / "favicon.ico"


image = Image.open(source).convert("RGBA")
pixels = image.load()
width, height = image.size


def is_background(pixel):
    red, green, blue, _ = pixel
    return min(red, green, blue) > 205 and max(red, green, blue) - min(red, green, blue) < 24


queue = deque()
seen = set()
for x in range(width):
    queue.extend(((x, 0), (x, height - 1)))
for y in range(height):
    queue.extend(((0, y), (width - 1, y)))

while queue:
    x, y = queue.popleft()
    if (x, y) in seen or not is_background(pixels[x, y]):
        continue
    seen.add((x, y))
    for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1),
                   (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1), (x + 1, y + 1)):
        if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
            queue.append((nx, ny))

for x, y in seen:
    red, green, blue, _ = pixels[x, y]
    pixels[x, y] = (red, green, blue, 0)

image.save(transparent)
image.resize((512, 512), Image.Resampling.LANCZOS).save(favicon_png, optimize=True)
image.save(favicon_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print(f"transparent pixels: {len(seen)}")
print(f"saved: {transparent}")
print(f"saved: {favicon_png}")
print(f"saved: {favicon_ico}")
