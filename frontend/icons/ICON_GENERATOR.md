# PWA Icon Generation Guide

## Quick Icon Generation

You need to create app icons in these sizes for PWA support:
- 72x72
- 96x96
- 128x128
- 144x144
- 152x152
- 192x192
- 384x384
- 512x512

## Option 1: Use Online Tools (Easiest)

### PWA Asset Generator
1. Visit: https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 PNG image with your logo
3. Download all generated icons
4. Extract to `frontend/icons/` folder

### Favicon.io
1. Visit: https://favicon.io/favicon-generator/
2. Create an icon with text "AD" or download icon
3. Generate and download all sizes

## Option 2: Use ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
# Create a base 512x512 icon first (icon-512x512.png)
convert icon-512x512.png -resize 72x72 icon-72x72.png
convert icon-512x512.png -resize 96x96 icon-96x96.png
convert icon-512x512.png -resize 128x128 icon-128x128.png
convert icon-512x512.png -resize 144x144 icon-144x144.png
convert icon-512x512.png -resize 152x152 icon-152x152.png
convert icon-512x512.png -resize 192x192 icon-192x192.png
convert icon-512x512.png -resize 384x384 icon-384x384.png
```

## Option 3: Simple SVG Icon (Temporary)

Create a simple SVG icon and convert it to PNG:

**icon.svg:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00f7ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7b2cbf;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad1)" rx="100"/>
  <text x="50%" y="60%" font-family="Arial, sans-serif" font-size="220" font-weight="bold" fill="white" text-anchor="middle">AD</text>
</svg>
```

Then convert to PNG using online tools or ImageMagick.

## Recommended Design

For best results, your icon should:
- Have a transparent or colored background
- Be simple and recognizable
- Include your app name initials ("AD" for AnyDownloader)
- Use your app's color scheme (#00f7ff cyan and #7b2cbf purple)
- Be square (1:1 aspect ratio)
- Have some padding from edges (safe zone)

## File Naming Convention

All icons should be named as:
- `icon-72x72.png`
- `icon-96x96.png`
- `icon-128x128.png`
- `icon-144x144.png`
- `icon-152x152.png`
- `icon-192x192.png`
- `icon-384x384.png`
- `icon-512x512.png`

Place all icons in the `frontend/icons/` directory.

## Testing Your Icons

After generating icons:
1. Open your app in Chrome/Edge
2. Open DevTools (F12)
3. Go to Application tab
4. Check "Manifest" section
5. Verify all icons load correctly

## Quick Placeholder (For Development)

Until you create proper icons, the app will work but show a default browser icon. The PWA will still be installable.

