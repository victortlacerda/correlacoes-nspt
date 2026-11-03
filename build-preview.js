/* Gera dist/preview.html (página única, sem service worker) a partir dos arquivos do PWA. */
const fs = require('fs');
const css = fs.readFileSync('styles.css', 'utf8');
const engine = fs.readFileSync('engine.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const body = fs.readFileSync('index.html', 'utf8').match(/<body>([\s\S]*)<\/body>/)[1]
  .replace(/<script src="[^"]+"><\/script>\s*/g, '');
const html = `<title>Correlações SPT</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
${css}
</style>
${body}
<script>window.__PREVIEW__ = true;</script>
<script>
${engine}
</script>
<script>
${app}
</script>
`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/preview.html', html);
console.log('dist/preview.html', html.length, 'bytes');
