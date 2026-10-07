import zlib, struct

def decode_png(path):
    with open(path, "rb") as f:
        data = f.read()
    pos = 8
    idat = bytearray()
    while pos < len(data):
        l, t = struct.unpack(">I4s", data[pos:pos+8])
        pos += 8
        c = data[pos:pos+l]
        pos += l + 4
        if t == b"IHDR":
            w, h, bit_depth, color_type = struct.unpack(">IIBB", c[:10])
        elif t == b"IDAT":
            idat.extend(c)
        elif t == b"IEND":
            break
    decomp = zlib.decompress(idat)
    bpp = 4
    stride = 1 + w * bpp
    out = bytearray(w * h * 4)
    prev_row = bytearray(w * 4)
    def paeth(a, b, c):
        p = a + b - c
        pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
        if pa <= pb and pa <= pc: return a
        elif pb <= pc: return b
        else: return c
    for y in range(h):
        row = decomp[y * stride : (y + 1) * stride]
        filter_type = row[0]
        cur_row = bytearray(w * 4)
        for x in range(w * 4):
            val = row[1 + x]
            a = cur_row[x - 4] if x >= 4 else 0
            b = prev_row[x]
            c = prev_row[x - 4] if x >= 4 else 0
            if filter_type == 0: res = val
            elif filter_type == 1: res = (val + a) & 0xff
            elif filter_type == 2: res = (val + b) & 0xff
            elif filter_type == 3: res = (val + ((a + b) >> 1)) & 0xff
            elif filter_type == 4: res = (val + paeth(a, b, c)) & 0xff
            else: res = val
            cur_row[x] = res
        out[y * w * 4 : (y + 1) * w * 4] = cur_row
        prev_row = cur_row
    return w, h, out

w, h, pixels = decode_png("mobile/assets/icon.png")
bg_color = (11, 31, 51)
near_bg = 0
for y in range(h):
    for x in range(w):
        idx = (y * w + x) * 4
        r, g, b, a = pixels[idx:idx+4]
        if a > 0:
            diff = max(abs(r - bg_color[0]), abs(g - bg_color[1]), abs(b - bg_color[2]))
            if diff <= 5:
                near_bg += 1

print(f"Total pixels: {w*h}")
print(f"Near background: {near_bg} ({near_bg/(w*h)*100:.1f}%)")
