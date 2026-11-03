# Regras do projeto

1. **Nenhuma fórmula ou valor tabelado é alterado ou harmonizado entre métodos.** Correlações de autores diferentes dão resultados diferentes, e isso é esperado: cada autor mantém o seu valor.
2. **Valores impressos que parecem erro entram exatamente como impressos**, com aviso (⚠) no cartão e nota na aba Referências.
3. **Todo método mostra a referência bibliográfica**, a fórmula, a substituição numérica e o resultado (memória de cálculo). Dados que o material não traz (autor completo, editora, ano) não são inventados.
4. **Premissas ficam explícitas.** Quando o material não diz algo (por exemplo N60, pa, qual ν usar), o app usa um valor padrão e avisa no cartão.
5. **Métodos que dependem de ler gráficos ficam de fora.** Só entram fórmulas e tabelas numéricas.
6. **Classificação de compacidade e consistência:** ABNT NBR 6484:2001.

## Como adicionar uma correlação

- Em `engine.js`, registre o método com `add({ id, params, title, author, refs, where, run })`, ou use `tableCard` (tabelas por faixa de N) e `listCard` (listas de linhas/fórmulas).
- Inclua a fonte em `REFS`.
- Se a fonte imprime algo estranho, descreva em `NOTES` (em `app.js`) e dê o aviso no cartão.
- Crie ao menos uma verificação em `tests/validate.js` e rode `npm test`.
