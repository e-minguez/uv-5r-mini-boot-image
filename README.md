# Baofeng UV-R5 Mini — Boot Screen Image Converter

> ⚠️ **VIBECODED** ⚠️
> This entire project was vibecoded. No guarantees of correctness, safety, or sanity. Use at your own risk.

A client-side web app that converts images to the 128×138px 24-bit BMP format required by the Baofeng UV-R5 Mini walkie-talkie boot screen.

## Usage

Open `index.html` in any modern browser — no server or installation needed.

1. Drop an image onto the panel (or click to browse). Accepted formats: **JPG, PNG, BMP**.
2. The image is converted to 128×138px automatically.
3. Adjust options if needed:
   - **Keep aspect ratio** (default on): fits the image inside the target dimensions and fills the unused area with the chosen fill color.
   - Uncheck to stretch the image to exactly 128×138.
4. Click **Export BMP** to download `baofeng_boot.bmp`.

Transfer the file to the radio using the Baofeng software and a programming cable.

## Output format

| Property | Value |
|---|---|
| Width | 128 px |
| Height | 138 px |
| Color depth | 24-bit (RGB) |
| Compression | None (BI_RGB) |
| File size | ~53 KB |

## Technical notes

All processing happens in the browser via the Canvas API. A custom BMP encoder writes the file header, DIB header, and bottom-up BGR pixel data directly into an `ArrayBuffer` — no server upload, no external libraries.
