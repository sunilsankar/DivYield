#!/usr/bin/env python3
import os
import subprocess
import shutil

# SVG templates
# 1. Adaptive Icon Foreground: Transparent background, emblem scaled to ~72% and centered in 512x512
# Emblem center is (256, 256). Scale 0.72 around (256, 256):
# transform="translate(256, 256) scale(0.72) translate(-256, -256)"
FOREGROUND_SVG = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <path d="M136 140 L216 140 C316 140 376 200 376 256 C376 312 316 372 216 372 L136 372 Z"
          fill="none" stroke="#F5B301" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M186 320 L236 270 L276 300 L326 240"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M326 240 L296 240 M326 240 L326 270"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
"""

# 2. Adaptive Icon Background: Solid #0B1F33
BACKGROUND_SVG = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0B1F33"/>
</svg>
"""

# 3. Legacy Round Icon: Circle #0B1F33 with centered emblem
ROUND_ICON_SVG = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="252" fill="#0B1F33"/>
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <path d="M136 140 L216 140 C316 140 376 200 376 256 C376 312 316 372 216 372 L136 372 Z"
          fill="none" stroke="#F5B301" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M186 320 L236 270 L276 300 L326 240"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M326 240 L296 240 M326 240 L326 270"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
"""

# 4. Legacy Squircle / Standard Icon: Rounded rectangle #0B1F33 with centered emblem
STANDARD_ICON_SVG = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="8" width="496" height="496" rx="104" fill="#0B1F33"/>
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <path d="M136 140 L216 140 C316 140 376 200 376 256 C376 312 316 372 216 372 L136 372 Z"
          fill="none" stroke="#F5B301" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M186 320 L236 270 L276 300 L326 240"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M326 240 L296 240 M326 240 L326 270"
          fill="none" stroke="#12B886" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
"""

# 5. Monochrome Icon: White emblem on transparent background for themed icons
MONOCHROME_SVG = """<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    <path d="M136 140 L216 140 C316 140 376 200 376 256 C376 312 316 372 216 372 L136 372 Z"
          fill="none" stroke="#FFFFFF" stroke-width="36" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M186 320 L236 270 L276 300 L326 240"
          fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M326 240 L296 240 M326 240 L326 270"
          fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
"""

def render_svg_to_png(svg_str, out_png, width, height):
    tmp_svg = out_png + ".svg"
    with open(tmp_svg, "w") as f:
        f.write(svg_str)
    subprocess.run(["rsvg-convert", "-w", str(width), "-h", str(height), tmp_svg, "-o", out_png], check=True)
    os.remove(tmp_svg)

def png_to_webp(in_png, out_webp):
    subprocess.run(["cwebp", "-lossless", "-q", "100", in_png, "-o", out_webp], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def generate_all():
    base_dir = "/Users/sunil/Gitcode/DivYield"
    mobile_assets = os.path.join(base_dir, "mobile/assets")
    res_dir = os.path.join(base_dir, "mobile/android/app/src/main/res")

    # 1. Generate master mobile/assets PNGs
    print("Generating mobile/assets master PNGs...")
    render_svg_to_png(FOREGROUND_SVG, os.path.join(mobile_assets, "android-icon-foreground.png"), 512, 512)
    render_svg_to_png(BACKGROUND_SVG, os.path.join(mobile_assets, "android-icon-background.png"), 512, 512)
    render_svg_to_png(MONOCHROME_SVG, os.path.join(mobile_assets, "android-icon-monochrome.png"), 432, 432)
    
    # 2. Densities for Android mipmaps
    # Adaptive foreground size is 108dp * density
    # Legacy icon size is 48dp * density
    densities = {
        "mdpi": {"fg": 108, "icon": 48},
        "hdpi": {"fg": 162, "icon": 72},
        "xhdpi": {"fg": 216, "icon": 96},
        "xxhdpi": {"fg": 324, "icon": 144},
        "xxxhdpi": {"fg": 432, "icon": 192},
    }

    print("Generating native Android mipmap WEBP icons...")
    for density, sizes in densities.items():
        folder = os.path.join(res_dir, f"mipmap-{density}")
        os.makedirs(folder, exist_ok=True)
        
        # Adaptive foreground
        fg_png = os.path.join(folder, "ic_launcher_foreground.png")
        fg_webp = os.path.join(folder, "ic_launcher_foreground.webp")
        render_svg_to_png(FOREGROUND_SVG, fg_png, sizes["fg"], sizes["fg"])
        png_to_webp(fg_png, fg_webp)
        os.remove(fg_png)

        # Legacy standard icon
        ic_png = os.path.join(folder, "ic_launcher.png")
        ic_webp = os.path.join(folder, "ic_launcher.webp")
        render_svg_to_png(STANDARD_ICON_SVG, ic_png, sizes["icon"], sizes["icon"])
        png_to_webp(ic_png, ic_webp)
        os.remove(ic_png)

        # Legacy round icon
        round_png = os.path.join(folder, "ic_launcher_round.png")
        round_webp = os.path.join(folder, "ic_launcher_round.webp")
        render_svg_to_png(ROUND_ICON_SVG, round_png, sizes["icon"], sizes["icon"])
        png_to_webp(round_png, round_webp)
        os.remove(round_png)

    print("All Android icons successfully generated!")

if __name__ == "__main__":
    generate_all()
