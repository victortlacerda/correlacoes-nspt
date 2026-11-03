/* Correlações SPT — interface */
(function () {
  'use strict';
  const SPT = window.SPT;
  const $ = (s, r) => (r || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ------------------------------------------------------------ estado */
  const DEFAULTS = {
    tab: 'calc', param: 'phi', N: '13', soil: 'areia_silt', silteComo: 'argiloso',
    B: '2', L: '2', Z: '', na: 'acima', sensivel: true, nu: '', esManual: '', mindlin: 'quad', n60: '',
    unit: {}, open: false, sel: {},
  };
  let S = Object.assign({}, DEFAULTS);
  const KEY = 'spt-correlacoes:v1';
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') S = Object.assign({}, DEFAULTS, saved, { tab: 'calc', open: false });
  } catch (e) { /* sem armazenamento: segue com o padrão */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignora */ }
  }
  const PARAM = (k) => SPT.PARAMS.find((p) => p.key === k);
  const inputs = () => ({
    N: S.N, soil: S.soil, silteComo: S.silteComo, B: S.B, L: S.L, Z: S.Z, na: S.na, sensivel: S.sensivel,
    nu: S.nu, EsManual: S.esManual, mindlin: S.mindlin, n60: S.n60, sel: S.sel,
  });

  /* ------------------------------------------------------------ valores */
  const fmt = SPT.fmtNum;
  function convFor(val, dim) {
    const u = S.unit[dim];
    return u ? SPT.convertValue(val, u) : val;
  }
  function altText(val, dim) {
    const list = SPT.DISPLAY_UNITS[dim] || [];
    if (!val || !val.u || list.length < 2 || S.unit[dim]) return '';
    if (!['pt', 'rng', 'gt', 'cmp'].includes(val.t)) return '';
    const parts = list.filter((u) => u !== val.u && SPT.conv(1, val.u, u) !== 1).map((u) => {
      const c = SPT.convertValue(val, u);
      const n = c.t === 'rng' ? fmt(c.lo) + ' a ' + fmt(c.hi) : (c.t === 'gt' ? '> ' : c.t === 'cmp' ? c.op + ' ' : '') + fmt(c.v);
      return n + ' ' + u;
    });
    return parts.join('  ·  ');
  }
  function numPart(val) {
    switch (val.t) {
      case 'pt': return fmt(val.v);
      case 'rng': return fmt(val.lo) + ' a ' + fmt(val.hi);
      case 'gt': return '> ' + fmt(val.v);
      case 'cmp': return esc(val.op) + ' ' + fmt(val.v);
      case 'txt': return esc(val.s);
      default: return '';
    }
  }
  function valHTML(val, dim) {
    if (!val) return '';
    if (val.t === 'na') return `<span class="na">${esc(val.msg)}</span>`;
    if (val.t === 'multi') {
      return '<div>' + val.items.map((it) => {
        const v = convFor(it.val, dim);
        if (v.t === 'na') return `<div class="mline"><span>${esc(it.label)}</span><span class="na-sm">${esc(v.msg)}</span></div>`;
        return `<div class="mline"><span>${esc(it.label)}</span><span>${numPart(v)}${v.u ? ' <small>' + esc(v.u) + '</small>' : ''}</span></div>`;
      }).join('') + '</div>';
    }
    const v = convFor(val, dim);
    const alt = altText(val, dim);
    return `<span class="big">${numPart(v)}</span>${v.u ? `<span class="unit">${esc(v.u)}</span>` : ''}${alt ? `<span class="alt">${esc(alt)}</span>` : ''}`;
  }
  function valText(val, dim) {
    if (!val) return '';
    if (val.t === 'multi') return val.items.map((i) => `${i.label}: ${valText(i.val, dim)}`).join('; ');
    return SPT.fmtVal(convFor(val, dim));
  }

  /* ------------------------------------------------------------ resultado */
  const WARN_LABEL = { range: 'Faixa de validade', print: 'Como impresso', apply: 'Aplicabilidade', assume: 'Premissa' };
  function refCites(r) {
    return r.refs.map((id) => SPT.REFS[id]).filter(Boolean).map((x) => x.cite);
  }
  function cardHTML(r, dim, idx) {
    const flags = r.warns.length
      ? `<div class="flags">${r.warns.map((w) => `<div class="flag ${w.type === 'assume' ? 'assume' : ''}"><i aria-hidden="true"></i><span><b>${WARN_LABEL[w.type] || 'Aviso'}.</b> ${esc(w.text)}</span></div>`).join('')}</div>`
      : '';
    const sel = r.select
      ? `<div class="sel"><label for="sel-${esc(r.select.key)}">${esc(r.select.label)}</label><select class="input" id="sel-${esc(r.select.key)}" data-sel="${esc(r.select.key)}"><option value="">${esc(r.select.empty || 'Selecione…')}</option>${r.select.options.map((o) => `<option value="${esc(o.v)}"${String(r.select.value) === o.v ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select></div>`
      : '';
    const extra = r.extra && r.extra.length ? r.extra.map((e) => `<div class="mline"><span>${esc(e.label)}</span><span>${esc(e.text)}</span></div>`).join('') : '';
    let mem = '<div class="mem">';
    r.memo.forEach((m) => {
      if (m.v === '') { mem += `<div class="sub">${esc(m.k.replace(/^—\s*/, ''))}</div>`; return; }
      mem += `<div class="${/Fórmula/.test(m.k) ? 'is-f' : ''}"><div class="k">${esc(m.k)}</div><div class="v">${esc(m.v)}</div></div>`;
    });
    if (!r.memo.length) mem += '<div class="refs">Sem cálculo para os dados informados.</div>';
    if (r.notes && r.notes.length) mem += `<div><div class="k">Observações</div><ul>${r.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul></div>`;
    mem += `<div><div class="k">Referência bibliográfica</div><div class="refs">${r.refs.map((id) => (SPT.REFS[id] ? `<div>${esc(SPT.REFS[id].full)}</div>` : '')).join('')}</div></div>`;
    mem += `<div><div class="k">Onde no material enviado</div><div class="refs">${esc(r.where)}</div></div></div>`;
    return `<article class="card rc" data-i="${idx}">
      <div class="rc-top">
        <div class="rc-title"><h3>${esc(r.title)}</h3><p class="rc-author">${esc(r.author)}</p><p class="rc-author">Ref.: ${esc(refCites(r).slice(0, 3).join('; '))}</p></div>
        <div class="rc-val">${r.value && r.value.t !== 'multi' ? valHTML(r.value, dim) : ''}</div>
      </div>
      ${r.value && r.value.t === 'multi' ? `<div style="margin-top:8px">${valHTML(r.value, dim)}</div>` : ''}
      ${extra ? `<div style="margin-top:8px">${extra}</div>` : ''}
      ${sel}${flags}
      <details class="memo" data-id="${esc(r.id)}"${S.open || OPEN.has(r.id) ? ' open' : ''}><summary>Memória de cálculo</summary>${mem}</details>
    </article>`;
  }

  let LAST = null;
  const OPEN = new Set();
  function renderResults() {
    const p = PARAM(S.param);
    const out = SPT.compute(S.param, inputs());
    LAST = out;
    const c = out.ctx;
    const pill = $('#pill');
    if (pill) {
      pill.innerHTML = Number.isFinite(c.N)
        ? `<span><b>${esc(c.soil.name)}</b> · N = ${SPT.nm(c.N)}</span><span>→ <b>${esc(c.clsName)}</b></span><span>${esc(c.groupLabel)} · NBR 6484:2001 (${esc(c.clsLim)})</span>${c.group === 'argiloso' && c.clayton.length ? `<span>Clayton et al. (1995), N60 = ${SPT.nm(c.N60)}: <b>${esc(c.clayton.join(' ou '))}</b></span>` : ''}`
        : '<span>Informe o N do SPT.</span>';
    }
    const dim = p.dim;
    const units = SPT.DISPLAY_UNITS[dim] || [];
    const seg = units.length
      ? `<div class="seg" role="group" aria-label="Unidade de exibição"><button type="button" data-unit="" aria-pressed="${!S.unit[dim]}">Como na fonte</button>${units.map((u) => `<button type="button" data-unit="${esc(u)}" aria-pressed="${S.unit[dim] === u}">${esc(u)}</button>`).join('')}</div>`
      : '';
    $('#results').innerHTML = `
      <div class="rbar">
        <div class="rsum"><b>${esc(p.label)} (${esc(p.sym)})</b> · ${out.results.length} método${out.results.length === 1 ? '' : 's'}${p.key === 'phi' ? ' · em graus' : ''}</div>
        <div class="tools">${seg}<button class="btn" type="button" id="toggle-memo">${S.open ? 'Recolher memórias' : 'Abrir todas as memórias'}</button><button class="btn" type="button" id="copy">Copiar memória</button></div>
      </div>
      <div class="results">${out.results.map((r, i) => cardHTML(r, dim, i)).join('')}</div>`;
  }

  /* ------------------------------------------------------------ formulário */
  function renderForm() {
    const isKv = S.param === 'Kv';
    const soil = SPT.SOILS.find((s) => s.key === S.soil);
    $('#params').innerHTML = SPT.PARAMS.map((p) => `<button type="button" class="pchip" data-param="${p.key}" aria-pressed="${p.key === S.param}"><span class="sym">${esc(p.sym)}</span><span class="lbl">${esc(p.label)}</span></button>`).join('');
    $('#form').innerHTML = `
      <div class="row">
        <div class="field"><label for="N">N do SPT</label>
          <div class="stepper"><button type="button" data-step="-1" aria-label="Diminuir N">−</button><input class="input" id="N" inputmode="decimal" autocomplete="off" value="${esc(S.N)}"><button type="button" data-step="1" aria-label="Aumentar N">+</button></div>
          <span class="hint">Golpes dos 30 cm finais (ou N médio do bulbo)</span></div>
        <div class="field"><label for="soil">Tipo de solo</label>
          <select class="input" id="soil">${SPT.SOILS.map((s) => `<option value="${s.key}"${s.key === S.soil ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <span class="hint">Lista de Silveira e Piancastelli</span></div>
      </div>
      ${soil.key === 'silte' ? `<div class="field"><label for="silteComo">Silte sem qualificação: classificar como</label><select class="input" id="silteComo"><option value="argiloso"${S.silteComo === 'argiloso' ? ' selected' : ''}>Argiloso (consistência)</option><option value="arenoso"${S.silteComo === 'arenoso' ? ' selected' : ''}>Arenoso (compacidade)</option></select><span class="hint">A NBR 6484 só classifica siltes arenosos e argilosos.</span></div>` : ''}
      <div class="pill" id="pill"></div>
      ${!isKv && PARAM(S.param).n60 ? `<details class="adv"><summary>Opções avançadas</summary><div class="field"><label for="n60">N60 informado (opcional)</label><input class="input" id="n60" inputmode="decimal" placeholder="= N do SPT" value="${esc(S.n60)}"><span class="hint">Usado nos métodos que pedem N60 (Hatanaka &amp; Uchida, Look, Bowles Su = k·N60). O material não traz a correção de energia; sem valor, usa-se N60 = N.</span></div></details>` : ''}
      ${isKv ? `
      <div class="sep"></div>
      <div class="lab" style="font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2)">Dados da fundação</div>
      <div class="row three">
        <div class="field"><label for="B">B (m)</label><input class="input" id="B" inputmode="decimal" value="${esc(S.B)}"><span class="hint">menor lado</span></div>
        <div class="field"><label for="L">L (m)</label><input class="input" id="L" inputmode="decimal" value="${esc(S.L)}"><span class="hint">maior lado</span></div>
        <div class="field"><label for="Z">Z (m)</label><input class="input" id="Z" inputmode="decimal" placeholder="2B" value="${esc(S.Z)}"><span class="hint">solo deformável</span></div>
      </div>
      <div class="row">
        <div class="field"><label for="na">Areia em relação ao N.A.</label><select class="input" id="na"><option value="acima"${S.na === 'acima' ? ' selected' : ''}>Acima do N.A.</option><option value="abaixo"${S.na === 'abaixo' ? ' selected' : ''}>Abaixo do N.A.</option></select><span class="hint">Usado na tabela de Terzaghi</span></div>
        <div class="field"><span class="lab">Construção</span><label class="check" style="margin-top:8px"><input type="checkbox" id="sensivel"${S.sensivel ? ' checked' : ''}><span>Sensível a recalques<br><span class="hint">Padrão do manual TQS. Afeta a correção da NBR 6122.</span></span></label></div>
      </div>
      <details class="adv"><summary>Opções avançadas</summary>
        <div class="row">
          <div class="field"><label for="nu">ν informado (opcional)</label><input class="input" id="nu" inputmode="decimal" placeholder="Tab. 5.7" value="${esc(S.nu)}"><span class="hint">Métodos de elasticidade e Boussinesq</span></div>
          <div class="field"><label for="esManual">Es informado, tf/m² (opcional)</label><input class="input" id="esManual" inputmode="decimal" placeholder="Silveira × N" value="${esc(S.esManual)}"><span class="hint">Método de Piancastelli, p.ex. média ponderada</span></div>
        </div>
        <div class="field" style="margin-top:12px"><label for="mindlin">b e L na fórmula de Mindlin</label><select class="input" id="mindlin"><option value="quad"${S.mindlin === 'quad' ? ' selected' : ''}>Metade da fundação (quadrante da Fig. 5.3a)</option><option value="full"${S.mindlin === 'full' ? ' selected' : ''}>Dimensões totais (como no texto)</option></select><span class="hint">O texto do manual e a figura divergem; veja a aba Referências.</span></div>
      </details>` : ''}`;
  }

  /* ------------------------------------------------------------ referências e validação */
  const NOTES = [
    ['Tabela da pág. 1 de correlacoes.pdf', 'Sem fonte. Imprime "Pouco fofa", φ da areia compacta como "40 - 35" e c da argila dura como "150". Usada exatamente assim.'],
    ['Tabela 1 do artigo de 2024', 'Traz "2,5 - 2,5" para o c da argila média e chama o segundo bloco de "Argilas e Solos Arenosos". Usada como impressa.'],
    ['Teixeira (1996), σ', 'O artigo chama o resultado de σr e fala em capacidade de carga; o manuscrito chama de σadm. Foi usado como σadm.'],
    ['Alonso e Teixeira (1996)', 'O slide de Alonso indica 2 ≤ N ≤ 20 e o manuscrito indica 5 < N < 20. O aviso de faixa cita as duas.'],
    ['Tab. 5.6 (TQS)', 'Imprime "Areia normal adensada: E = 5 (SPT+5)" e "Argila mole (SPT 2 a 5)", que se sobrepõe a "muito mole (SPT ≤ 2)". Usada como impressa.'],
    ['Tab. 5.3 (NBR 6122:1996)', 'A legenda do PDF deixa em branco a largura de validade dos valores. A norma foi revisada em 2010.'],
    ['Tabela 1 de Sherif', 'Está impressa com Z/B = 2,0 saltando de 1,00 para 1,23 em L/B = 20, e com f = 1,09 em Z/B = 5,0 (L/B = 2,0) maior que 1,03 em Z/B = 6,0. Usada como impressa.'],
    ['Piancastelli, exemplos', 'No caso A do Exemplo 2, o f impresso é 0,29, mas o Cr = 530 corresponde a f ≈ 0,46, que é o valor interpolado. No Exemplo 3 o Es aparece em tf/m³. No Exemplo 4 a camada 3 é chamada de silte argiloso no texto, mas o cálculo usa 225 (silte arenoso). O app calcula tudo pela fórmula e pela tabela.'],
    ['Rausch & Cestelli Guidi', 'O texto cita kgf/cm³ e a fórmula traz tf/m³. O app usa E0 em tf/m² (×10) para obter tf/m³. Veja o aviso no cartão.'],
    ['Mindlin / Steinbrenner', 'O item 11 do manual TQS, que descreve o procedimento de Steinbrenner, não está nos PDFs. O app aplica d(0) − d(z) para uma camada. O texto define b como menor largura da fundação, mas a Fig. 5.3a mostra um quadrante (2B × 2L) e a fórmula com o fator 4 só fecha com b = B/2. O padrão segue a figura; a opção avançada permite usar o texto.'],
    ['Peso específico de Godoy (1972)', 'O texto de Cintra diz que o valor da areia saturada "refere-se ao peso específico submerso" e que é preciso descontar o da água. Os valores foram mantidos como impressos.'],
    ['Classificação do manuscrito', 'O manuscrito traz outra classificação de argilas (rija 11 a 15, muito rija 20 a 30, dura > 30). O app usa a NBR 6484:2001, que aparece em quatro lugares do material.'],
    ['Joppert Jr., Tab. 13', 'Imprime E = 1000 t/m² para silte arenoso com SPT de 9 a 18, entre 8000 e 15000 nas linhas vizinhas. Usado como impresso. A tabela não associa seus tipos de solo aos da lista; o cartão mostra todos ou o que você escolher.'],
    ['Tab. 2 do Cap. 3', 'A coluna φ das areias traz números idênticos aos de Su em kgf/cm² (< 0,1; 0,1 a 0,25 ...), que não são ângulos. Entra como impressa, com aviso.'],
    ['Tab. 3 (UFMG) × artigo de 2024', 'É a mesma tabela. No artigo a argila média tem c = "2,5 - 2,5"; na Tab. 3 está 2,5 a 5,0. Os dois cartões de c ficam, cada um como impresso.'],
    ['Teixeira (1996)', 'Aparece com √(20·N) + 15° (Cintra e Silveira) e com √(24·N) + 15° (Schnaid & Odebrecht, 2012). As duas expressões entram, cada uma no seu cartão.'],
    ['N60 e N55', 'Hatanaka & Uchida, Look e Bowles (Su) pedem N60; a Tab. 2.19 de Clayton cita N60 e a Tab. 2.20 de Bowles cita N55. O material não traz a correção de energia. O app usa o N informado (ou o N60 digitado em Opções avançadas).'],
    ['Alonso (1943 e 2010)', 'As tabelas têm faixas que se tocam (N = 4, 10, 30, 50 em 1943) ou deixam lacunas (2 a 4 e 5 a 8, em 2010). Quando N está num limite, as duas linhas aparecem; para N não inteiro vale o inteiro mais próximo.'],
    ['Moraes (1978)', 'Para argila dura a pág. 86 traz qu de 4,00 a 8,00 e a pág. 87 traz "> 4,00". A pág. 86 imprime só "2" para o N da argila muito mole; foi lido como N ≤ 2.'],
    ['Bowles (1997), Su = k·N60', 'A fonte não dá a unidade de k nem de Su. Foi tomado kPa. O k de Mello (1971), de 0,4 a 20, é mostrado como faixa.'],
    ['Bowles (1997), Tab. 4', 'Cada classe traz um único SPT (0, 4, 10, 30, 50 nas areias). Foi lido como o início da faixa. O γ das argilas só está impresso para mole, média e muito rija; qu vem sem unidade.'],
    ['Unidades do capítulo "Parâmetros dos Solos"', 'O item 3.3 usa 1 kgf/cm² = 100 kPa; o app converte com 98,0665 kPa. Para t/ft² vale a conversão impressa de 107,3 kN/m². O texto escreve tsf, t/ft² e tf/ft² para a mesma grandeza.'],
    ['Danziger et al. (1988), Tab. 2.24', 'Em Alonso (1980) e Velloso (1981) a tabela empilha solos e valores na mesma célula. Foram pareados na ordem em que aparecem. Chang (1988) está impresso com "erenoso".'],
    ['Ferrent (1963) e Kulhawy & Mayne (1990)', 'Ferrent depende de ν e Kulhawy & Mayne depende de pa, e as imagens não dizem o valor. O app usa ν da Tab. 5.7 do TQS (ou o informado) e pa = 100 kPa, com aviso no cartão.'],
    ['Begemann (1974)', 'A fonte imprime as expressões só para N > 15 e N < 15; N = 15 fica sem resultado. C vai de 3 (silte com areia) a 12 (pedregulho com areia); os dois extremos são mostrados.'],
    ['Clayton et al. (1995), Tab. 2.21', 'As faixas de N60 se tocam (4, 8, 15, 30, 60). Quando N60 está no limite, as duas classes aparecem no resumo do solo.'],
    ['Silveira', 'A página enviada não tem título, ano nem autor impresso; a atribuição segue o seu aviso e a Tabela 2 de Piancastelli, que cita J.E. Silva Silveira.'],
  ];
  const REPEATED = [
    'c = 10·N kPa aparece três vezes (págs. 2 e 5 e, em tf/m², no Silveira); entra uma vez, como Teixeira & Godoy (1996).',
    'φ de Godoy e de Teixeira aparece nas págs. 2 e 6; φ do Silveira repete a de Teixeira.',
    'Classes de compacidade e consistência da NBR 6484:2001 aparecem quatro vezes; é a classificação usada por todo o app.',
    'A Tabela 2 de Piancastelli (Es) é igual à tabela de E do Silveira.',
    'A tabela da pág. 1 e a Tabela 1 do artigo de 2024 são a mesma tabela em unidades diferentes; ficam em dois cartões, cada um com os números como impressos.',
    'Pesos específicos de Godoy aparecem na pág. 3 (faixas) e nas págs. 7 e 8 (Tabs. 2.4 e 2.5); entram no mesmo cartão.',
    'Os pesos específicos de Godoy (1972) reaparecem nas Tabs. 1.12 e 1.13 e na pág. 85 do capítulo "Parâmetros dos Solos"; já estão no cartão de Godoy.',
    'c = 10·N kPa, φ = 28° + 0,4·N e √(20·N) + 15° reaparecem na pág. 85 do capítulo "Parâmetros dos Solos" (Cintra et al., 2003); já estão nos seus cartões.',
    'A Tab. 1 do capítulo "Parâmetros dos Solos" (NBR 7250) tem as mesmas faixas da NBR 6484:2001 usadas pelo app.',
    'Tabs. 3, 5 e 6 de Cintra et al. (2003) (α, K e ν de Teixeira & Godoy) repetem as Tabs. 5.8, 5.9 e 5.7 do manual TQS; os cartões de E, qc e ν usam esses valores.',
    'A Tab. 3 (UFMG) repete a Tabela 1 do artigo de 2024; só o cartão de c é novo, porque o valor impresso difere.',
    'Tab. 5.6 do TQS e Tab. 6 da UFV são tabelas de E diferentes; ficam em cartões separados.',
  ];
  function refsView() {
    const ids = Object.keys(SPT.REFS);
    return `
      <section class="block"><h2>Referências citadas</h2>
        <div class="card">${ids.map((id) => { const r = SPT.REFS[id]; return `<div class="refitem"><b>${esc(r.cite)}</b><p>${esc(r.full)}</p><small>Arquivo: ${esc(r.pdf)}</small></div>`; }).join('')}</div>
        <p class="foot">As citações seguem o que está escrito nos PDFs. Autores completos, editoras e anos que as páginas não trazem não foram preenchidos.</p></section>
      <section class="block"><h2>Valores impressos que merecem conferência</h2>
        <div class="card panel"><p>Nada abaixo foi corrigido. Fórmulas e valores entram como estão nos PDFs, e cada autor mantém o seu resultado.</p><ul>${NOTES.map((n) => `<li><b>${esc(n[0])}.</b> ${esc(n[1])}</li>`).join('')}</ul></div></section>
      <section class="block"><h2>Repetições no material</h2>
        <div class="card panel"><ul>${REPEATED.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></section>
      <section class="block"><h2>Ficou de fora</h2>
        <div class="card panel"><ul>
          <li>Métodos de Kv do manual TQS que dependem de gráficos ou de perfil completo da sondagem (Schultze &amp; Sherif, Parry e módulo edométrico por camadas).</li>
          <li>Molas axiais de estacas, modo de ruptura c × φ e o gráfico de φ de Mello (1971), que não têm fórmula ou tabela numérica nos PDFs.</li>
          <li>Figuras 1 a 10 do capítulo "Parâmetros dos Solos": Peck e Meyerhof, Gibbs e Holtz, Saxena e Srinivasulu, Mello (1967), Navfac (Su × N), Schultz e Melzer, Schmertmann (1975), Sanglerat (1965) e Trofimenkov (1974). Dependem de ler gráficos.</li>
          <li>Índice de consistência e grau de compacidade (IC, GC) e Cc = 0,009·(LL − 10%) do mesmo capítulo, que não são parâmetros do app.</li>
        </ul></div></section>`;
  }
  const PRINTED = {
    ex1: [['Ex. 1', 210 * 13, 22.4, 28, 9, 0.30, 406]],
    ex2: [['Ex. 2 · A', 210 * 13, 11.2, 14, 9, 0.29, 530], ['Ex. 2 · B', 210 * 13, 5.6, 7, 9, 0.63, 774], ['Ex. 2 · C(1)', 210 * 13, 2.24, 2.8, 9, 0.81, 1505], ['Ex. 2 · C(2)', 210 * 13, 2.24, 2.8, 4.48, 0.68, 1792], ['Ex. 2 · D(1)', 210 * 13, 1.12, 1.4, 9, 0.88, 2770], ['Ex. 2 · D(2)', 210 * 13, 1.12, 1.4, 2.24, 0.68, 3584]],
    ex3: [['Ex. 3 · a-1 areia siltosa', 210 * 13, 0.56, 0.7, 1.12, 0.68, 7169], ['Ex. 3 · a-2 argila siltosa', 100 * 13, 0.56, 0.7, 1.12, 0.68, 3414], ['Ex. 3 · a-3 silte argiloso', 125 * 13, 0.56, 0.7, 1.12, 0.68, 4267]],
    ex4: [['Ex. 4 (Es ponderado)', 881, 4, 4, 8, 0.64, 344]],
  };
  function validView() {
    const rows = [].concat(PRINTED.ex1, PRINTED.ex2, PRINTED.ex3, PRINTED.ex4).map((r) => {
      const c = SPT.piancastelliCr(r[1], r[2], r[3], r[4]);
      const ok = Math.abs(c.Cr - r[6]) <= 1;
      return `<tr><td>${esc(r[0])}</td><td>${fmt(r[1])}</td><td>${SPT.nm(r[2])} × ${SPT.nm(r[3])}</td><td>${SPT.nm(r[4])}</td><td>${r[5].toFixed(2).replace('.', ',')}</td><td>${c.f.toFixed(2).replace('.', ',')}</td><td>${fmt(r[6])}</td><td>${fmt(c.Cr)}</td><td class="${ok ? 'ok' : 'bad'}">${ok ? 'confere' : 'difere'}</td></tr>`;
    }).join('');
    return `<section class="block"><h2>Exemplos de Piancastelli (2012)</h2>
      <div class="card"><div class="scroll"><table class="vt"><thead><tr><th>Caso</th><th>Es tf/m²</th><th>B × L m</th><th>Z m</th><th>f impresso</th><th>f app</th><th>Cr impresso</th><th>Cr app tf/m³</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <p class="foot">Cr = Es / (B·f), com f da Tabela 1 de Sherif interpolada em L/B e Z/B e arredondada a duas casas, como nos exemplos do autor. "Confere" quer dizer diferença de até 1 tf/m³ em relação ao impresso. No caso A do Exemplo 2 o f impresso (0,29) não é o que produz o Cr impresso; o valor interpolado é 0,46.</p></section>`;
  }

  /* ------------------------------------------------------------ cópia */
  function reportText() {
    if (!LAST) return '';
    const p = PARAM(S.param), dim = p.dim, c = LAST.ctx;
    const L = [];
    L.push(`Correlações SPT — ${p.label} (${p.sym})`);
    L.push(`N = ${SPT.nm(c.N)} · ${c.soil.name} · ${c.groupLabel}: ${c.clsName}`);
    if (S.param === 'Kv' && c.geo) L.push(`Fundação: B = ${SPT.nm(c.geo.B)} m; L = ${SPT.nm(c.geo.L)} m; Z = ${SPT.nm(c.geo.Z)} m`);
    L.push('');
    LAST.results.forEach((r) => {
      L.push(`■ ${r.title} — ${r.author}`);
      L.push(`  Resultado: ${valText(r.value, dim)}`);
      r.memo.forEach((m) => L.push(m.v === '' ? `  ${m.k}` : `  ${m.k}: ${m.v.replace(/\n/g, '\n    ')}`));
      r.warns.forEach((w) => L.push(`  (${WARN_LABEL[w.type] || 'Aviso'}) ${w.text}`));
      r.refs.forEach((id) => { if (SPT.REFS[id]) L.push(`  Ref.: ${SPT.REFS[id].full}`); });
      L.push('');
    });
    return L.join('\n');
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('on'), 1800);
  }
  function copy(text) {
    const done = () => toast('Memória copiada');
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Não foi possível copiar'); }
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  /* ------------------------------------------------------------ abas */
  function renderTab() {
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === S.tab)));
    const v = $('#view');
    if (S.tab === 'calc') {
      v.innerHTML = `
        <section class="block"><h2>Parâmetro</h2><div class="pgrid" id="params"></div></section>
        <section class="block"><h2>Dados do ensaio</h2><div class="card form" id="form"></div></section>
        <section class="block" id="results" aria-live="polite"></section>
        <p class="foot">Correlações empíricas para uso preliminar. Cada método mostra o valor da sua própria fonte, e valores diferentes entre autores são esperados.</p>`;
      renderForm();
      renderResults();
    } else if (S.tab === 'refs') v.innerHTML = refsView();
    else v.innerHTML = validView();
  }

  /* ------------------------------------------------------------ eventos */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.tab) { S.tab = t.dataset.tab; renderTab(); window.scrollTo(0, 0); return; }
    if (t.dataset.param) { S.param = t.dataset.param; save(); renderForm(); renderResults(); return; }
    if (t.dataset.step) {
      const n = parseFloat(String(S.N).replace(',', '.'));
      S.N = String(Math.max(0, (Number.isFinite(n) ? n : 0) + Number(t.dataset.step)));
      $('#N').value = S.N; save(); renderResults(); return;
    }
    if (t.dataset.unit !== undefined && t.closest('.seg')) {
      const dim = PARAM(S.param).dim;
      S.unit[dim] = t.dataset.unit || null; save(); renderResults(); return;
    }
    if (t.id === 'toggle-memo') { S.open = !S.open; OPEN.clear(); renderResults(); return; }
    if (t.id === 'copy') copy(reportText());
  });
  document.addEventListener('input', (e) => {
    const t = e.target;
    const map = { N: 'N', B: 'B', L: 'L', Z: 'Z', nu: 'nu', esManual: 'esManual', n60: 'n60' };
    if (t.id in map && t.tagName === 'INPUT' && t.type !== 'checkbox') { S[map[t.id]] = t.value; save(); renderResults(); }
  });
  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.id === 'soil') { S.soil = t.value; save(); renderForm(); renderResults(); }
    else if (t.id === 'silteComo') { S.silteComo = t.value; save(); renderResults(); }
    else if (t.id === 'na') { S.na = t.value; save(); renderResults(); }
    else if (t.id === 'mindlin') { S.mindlin = t.value; save(); renderResults(); }
    else if (t.id === 'sensivel') { S.sensivel = t.checked; save(); renderResults(); }
    else if (t.dataset && t.dataset.sel) { S.sel = Object.assign({}, S.sel, { [t.dataset.sel]: t.value }); save(); renderResults(); }
  });

  document.addEventListener('toggle', (e) => {
    const d = e.target;
    if (d && d.matches && d.matches('details.memo') && !S.open) { if (d.open) OPEN.add(d.dataset.id); else OPEN.delete(d.dataset.id); }
  }, true);

  renderTab();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !window.__PREVIEW__) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
