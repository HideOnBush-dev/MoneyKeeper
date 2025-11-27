# PWA Icon Generator Script
# This creates a simple colored SVG that can be used as app icon

$iconSVG = @"
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6366F1;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#grad)"/>
  <g transform="translate(128, 128)">
    <path d="M256 32c-17.673 0-32 14.327-32 32v352c0 17.673 14.327 32 32 32s32-14.327 32-32V64c0-17.673-14.327-32-32-32z" fill="white"/>
    <path d="M176 160c-17.673 0-32 14.327-32 32v224c0 17.673 14.327 32 32 32s32-14.327 32-32V192c0-17.673-14.327-32-32-32z" fill="white" opacity="0.8"/>
    <circle cx="128" cy="192" r="48" fill="white"/>
    <circle cx="200" cy="128" r="40" fill="white" opacity="0.9"/>
    <path d="M100 300 L140 280 L180 320 L220 260" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>
"@

# Create public/img directory if it doesn't exist
$imgDir = Join-Path $PSScriptRoot "public\img"
if (-not (Test-Path $imgDir)) {
    New-Item -ItemType Directory -Path $imgDir -Force
}

# Save the SVG file
$svgPath = Join-Path $imgDir "icon.svg"
$iconSVG | Out-File -FilePath $svgPath -Encoding UTF8

Write-Host "Icon SVG created at: $svgPath" -ForegroundColor Green
Write-Host ""
Write-Host "To generate PNG icons in different sizes, you can:" -ForegroundColor Yellow
Write-Host "1. Use an online converter like https://convertio.co/svg-png/" -ForegroundColor Cyan
Write-Host "2. Or use ImageMagick: magick convert -background none icon.svg -resize 192x192 icon-192x192.png" -ForegroundColor Cyan
Write-Host ""
Write-Host "Required icon sizes for PWA:" -ForegroundColor Yellow
Write-Host "- 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512" -ForegroundColor Cyan
