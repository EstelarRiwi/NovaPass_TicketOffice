<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="csrf-token" content="{{ csrf_token() }}" />
    <title>NovaPass — Taquilla</title>
    @viteReactRefresh
    @vite('resources/js/main.tsx')
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
