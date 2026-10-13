# Renders a few example clips into the videos folder with ffmpeg's built-in generators,
# then rebuilds videos/library.js. Needs ffmpeg on PATH (winget install Gyan.FFmpeg).
$ErrorActionPreference = 'Stop'
$videos = Join-Path $PSScriptRoot '..\videos'
New-Item -ItemType Directory -Force $videos | Out-Null

$clips = [ordered]@{
  'Mandelbrot Dive' = 'mandelbrot=s=960x540:r=30:start_scale=3:end_scale=0.004:end_pts=360:maxiter=2000:outer=normalized_iteration_count'
  'Game of Life'    = 'gradients=s=960x540:r=30:speed=0.01:n=4:seed=2[bg];life=s=192x108:r=10:mold=10:ratio=0.25:death_color=#3a1c71:life_color=#ffd166:mold_color=#06d6a0,scale=960:540:flags=neighbor,fps=30[fg];[bg][fg]blend=all_mode=screen[out0]'
  'Plasma'          = "nullsrc=s=320x180:r=30,geq=r='128+127*sin(X/19+T*2)':g='128+127*sin(Y/13+T*1.3+X/41)':b='128+127*sin((X+Y)/29-T*1.7)',scale=960:540:flags=bicubic"
  'Gradient Swirl'  = 'gradients=s=960x540:r=30:speed=0.015:n=6:type=spiral:seed=7'
  'Sierpinski'      = 'gradients=s=960x540:r=30:speed=0.02:n=5:type=radial:seed=4[bg];sierpinski=s=960x540:r=30:type=carpet:jump=40:seed=3[fg];[bg][fg]blend=all_mode=multiply[out0]'
}

foreach ($name in $clips.Keys) {
  $out = Join-Path $videos "$name.mp4"
  Write-Host "Rendering $name..."
  ffmpeg -y -hide_banner -loglevel error -f lavfi -i $clips[$name] -t 12 `
    -vf format=yuv420p -c:v libx264 -preset medium -crf 22 -movflags +faststart -an $out
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed for $name" }
}

& (Join-Path $PSScriptRoot 'scan-videos.ps1')
