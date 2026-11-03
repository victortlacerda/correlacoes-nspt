# Correlações SPT (PWA)

Calcula φ, c, Cu, γ, ν, E, Es, E0, qc e Kv a partir do N do SPT e do tipo de solo. Cada método mostra fórmula, substituição, resultado, avisos e referência bibliográfica. Nenhuma fórmula ou valor tabelado foi alterado ou harmonizado entre autores.

## Arquivos
- `index.html`, `styles.css`, `app.js`: interface.
- `engine.js`: todas as correlações e tabelas (sem dependências).
- `manifest.webmanifest`, `sw.js`, `icons/`: instalação e uso offline (PWA).
- `tests/validate.js`: conferência com os exemplos de Piancastelli (2012) e checagens independentes. Rodar com `npm test` (ou `node tests/validate.js`).
- `build-preview.js`: gera `dist/preview.html`, uma versão em página única (`npm run build:preview`).
- `docs/REGRAS.md`: regras do projeto e como adicionar uma correlação.
- `CHANGELOG.md`: histórico de versões.
- `.github/workflows/pages.yml`: roda os testes e publica no GitHub Pages a cada push na `main`.

## Publicar (GitHub Pages)
1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions** (uma vez só).
2. A cada `git push` na `main`, o workflow roda os testes e publica o site. O endereço aparece em Settings → Pages e em Actions.
3. A versão do cache do service worker é trocada automaticamente pelo commit publicado, então os aparelhos baixam a versão nova sozinhos.

Para outro hospedeiro (Netlify Drop, Cloudflare Pages), basta enviar `index.html`, `styles.css`, `app.js`, `engine.js`, `sw.js`, `manifest.webmanifest` e a pasta `icons/`. Nesse caso aumente o número em `const CACHE = 'spt-correlacoes-vN'` no `sw.js` a cada versão.

## Instalar no celular
- Android (Chrome): menu ⋮ → "Instalar app".
- iPhone (Safari): Compartilhar → "Adicionar à Tela de Início".

## Fluxo de atualização
```
git pull
# editar engine.js / app.js ...
npm test
git add -A
git commit -m "feat: descrição da mudança"
git push
```
Registre a mudança em `CHANGELOG.md`.

## Fontes
Os PDFs de origem e as páginas onde cada valor aparece estão listados na aba "Referências" do app e na memória de cada cálculo. Os PDFs não fazem parte do repositório.
