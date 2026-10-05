#!/usr/bin/env python3
import os
import subprocess
import shutil

def generate_icons():
    svg_path = "assets/icon.svg"
    if not os.path.exists(svg_path):
        print(f"Error: {svg_path} not found.")
        return

    # 1. Generate master PNG 512x512 and 1024x1024
    subprocess.run(["rsvg-convert", "-w", "1024", "-h", "1024", svg_path, "-o", "assets/icon-1024.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "512", "-h", "512", svg_path, "-o", "assets/icon-512.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "256", "-h", "256", svg_path, "-o", "assets/icon-256.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "128", "-h", "128", svg_path, "-o", "assets/icon-128.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "64", "-h", "64", svg_path, "-o", "assets/icon-64.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "32", "-h", "32", svg_path, "-o", "assets/icon-32.png"], check=True)
    subprocess.run(["rsvg-convert", "-w", "16", "-h", "16", svg_path, "-o", "assets/icon-16.png"], check=True)

    # 2. Generate macOS .icns using iconutil
    iconset_dir = "assets/icon.iconset"
    os.makedirs(iconset_dir, exist_ok=True)
    
    sizes = [
        (16, "icon_16x16.png"),
        (32, "icon_16x16@2x.png"),
        (32, "icon_32x32.png"),
        (64, "icon_32x32@2x.png"),
        (128, "icon_128x128.png"),
        (256, "icon_128x128@2x.png"),
        (256, "icon_256x256.png"),
        (512, "icon_256x256@2x.png"),
        (512, "icon_512x512.png"),
        (1024, "icon_512x512@2x.png"),
    ]
    for size, name in sizes:
        shutil.copyfile(f"assets/icon-{size}.png", os.path.join(iconset_dir, name))
    
    subprocess.run(["iconutil", "-c", "icns", iconset_dir, "-o", "assets/icon.icns"], check=True)
    shutil.rmtree(iconset_dir)
    print("Created assets/icon.icns")

    # 3. Generate Windows .ico using Pillow or sips/rsvg
    try:
        from PIL import Image
        img = Image.open("assets/icon-512.png")
        img.save("assets/icon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
        print("Created assets/icon.ico using Pillow")
    except ImportError:
        # If pillow not installed in current env, install or fallback
        subprocess.run(["sips", "-s", "format", "ico", "assets/icon-256.png", "--out", "assets/icon.ico"], check=False)

    # Clean up intermediate pngs except 512
    for s in [1024, 256, 128, 64, 32, 16]:
        p = f"assets/icon-{s}.png"
        if os.path.exists(p):
            os.remove(p)

if __name__ == "__main__":
    generate_icons()
