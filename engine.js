/* Correlações SPT — motor de cálculo
 * Todas as fórmulas e valores tabelados estão como impressos nos PDFs de origem.
 * Nenhum valor é harmonizado entre autores: cada método devolve o resultado da sua própria fonte.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SPT = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ unidades */
  const G = 9.80665; // 1 tf = 9,80665 kN
  const DIMS = {
    stress: { 'kN/m²': 1, 'kPa': 1, 'MPa': 1000, 'tf/m²': G, 'kgf/cm²': 98.0665, 'bar': 100, 't/ft²': 107.3 },
    gamma: { 'kN/m³': 1, 'tf/m³': G },
    kv: { 'kN/m³': 1, 'tf/m³': G, 'kgf/cm³': 9806.65 },
    angle: { '°': 1 },
    nu: { '': 1 },
  };
  const DISPLAY_UNITS = {
    stress: ['kN/m²', 'MPa', 'tf/m²', 'kgf/cm²'],
    gamma: ['kN/m³', 'tf/m³'],
    kv: ['kgf/cm³', 'tf/m³', 'kN/m³'],
    angle: [],
    nu: [],
  };
  function dimOf(u) {
    for (const d in DIMS) if (u in DIMS[d]) return d;
    return null;
  }
  function conv(v, from, to) {
    const d = dimOf(from);
    return (v * DIMS[d][from]) / DIMS[d][to];
  }

  /* ------------------------------------------------------------------ valores */
  const pt = (v, u) => ({ t: 'pt', v, u });
  const rng = (lo, hi, u) => ({ t: 'rng', lo, hi, u });
  const gt = (v, u) => ({ t: 'gt', v, u });
  const txt = (s, u) => ({ t: 'txt', s, u });
  const na = (msg) => ({ t: 'na', msg });
  const multi = (items) => ({ t: 'multi', items }); // items: [{label, val}]
  const cmp = (op, v, u) => ({ t: 'cmp', op, v, u }); // valor impresso como "< x" ou "≥ x"

  function convertValue(val, to) {
    if (!val || !to) return val;
    if (val.t === 'multi') return multi(val.items.map((i) => ({ label: i.label, val: convertValue(i.val, to) })));
    if (!val.u || dimOf(val.u) !== dimOf(to) || val.t === 'txt') return val;
    if (val.t === 'pt') return pt(conv(val.v, val.u, to), to);
    if (val.t === 'gt') return gt(conv(val.v, val.u, to), to);
    if (val.t === 'cmp') return cmp(val.op, conv(val.v, val.u, to), to);
    if (val.t === 'rng') return rng(conv(val.lo, val.u, to), conv(val.hi, val.u, to), to);
    return val;
  }

  /* ------------------------------------------------------------------ formatação pt-BR */
  function nf(x, min, max) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max }).format(x);
  }
  function fmtNum(x) {
    if (!isFinite(x)) return '∞';
    const a = Math.abs(x);
    const d = a === 0 ? 0 : a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : a >= 0.1 ? 3 : 4;
    return nf(x, 0, d);
  }
  /** número para memória de cálculo (mais casas, sem zeros à direita) */
  function nm(x, d) {
    if (!isFinite(x)) return '∞';
    const a = Math.abs(x);
    const max = d != null ? d : a >= 1000 ? 1 : a >= 100 ? 2 : a >= 10 ? 3 : 4;
    return nf(x, 0, max);
  }
  function fmtUnit(u) {
    return u || '';
  }
  function fmtVal(val) {
    if (!val) return '—';
    const u = val.u ? ' ' + val.u : '';
    switch (val.t) {
      case 'pt': return fmtNum(val.v) + u;
      case 'rng': return fmtNum(val.lo) + ' a ' + fmtNum(val.hi) + u;
      case 'gt': return '> ' + fmtNum(val.v) + u;
      case 'cmp': return val.op + ' ' + fmtNum(val.v) + u;
      case 'txt': return val.s + u;
      case 'na': return val.msg;
      default: return '';
    }
  }

  /* ------------------------------------------------------------------ solos e classes */
  const SOILS = [
    { key: 'areia_ped', name: 'Areia com pedregulhos', noun: 'areia', group: 'arenoso', es: 330, K: 1.10, alpha: 3 },
    { key: 'areia', name: 'Areia', noun: 'areia', group: 'arenoso', es: 270, K: 0.90, alpha: 3 },
    { key: 'areia_silt', name: 'Areia siltosa', noun: 'areia', group: 'arenoso', es: 210, K: 0.70, alpha: 3 },
    { key: 'areia_arg', name: 'Areia argilosa', noun: 'areia', group: 'arenoso', es: 165, K: 0.55, alpha: 3 },
    { key: 'silte_aren', name: 'Silte arenoso', noun: 'silte', group: 'arenoso', es: 225, K: 0.45, alpha: 5 },
    { key: 'silte', name: 'Silte', noun: 'silte', group: 'argiloso', es: 175, K: 0.35, alpha: 5 },
    { key: 'silte_arg', name: 'Silte argiloso', noun: 'silte', group: 'argiloso', es: 125, K: 0.25, alpha: 5 },
    { key: 'argila_aren', name: 'Argila arenosa', noun: 'argila', group: 'argiloso', es: 210, K: 0.30, alpha: 7 },
    { key: 'argila_silt', name: 'Argila siltosa', noun: 'argila', group: 'argiloso', es: 100, K: 0.20, alpha: 7 },
  ];
  const GROUP_LABEL = { arenoso: 'Areias e siltes arenosos', argiloso: 'Argilas e siltes argilosos' };
  const CLS = {
    arenoso: ['Fofa(o)', 'Pouco compacta(o)', 'Medianamente compacta(o)', 'Compacta(o)', 'Muito compacta(o)'],
    argiloso: ['Muito mole', 'Mole', 'Média(o)', 'Rija(o)', 'Dura(o)'],
  };
  const CLS_LIM = {
    arenoso: ['N ≤ 4', '5 a 8', '9 a 18', '19 a 40', 'N > 40'],
    argiloso: ['N ≤ 2', '3 a 5', '6 a 10', '11 a 19', 'N > 19'],
  };
  function clsIndex(N, group) {
    const t = group === 'arenoso' ? [4, 8, 18, 40] : [2, 5, 10, 19];
    let i = 0;
    while (i < 4 && N > t[i]) i++;
    return i;
  }

  /* ------------------------------------------------------------------ referências */
  const REFS = {
    SILVEIRA: { cite: 'SILVEIRA, J.E.S.', full: 'SILVEIRA, J. E. da S. Tabelas de γ, E, μ, c e φ em função do SPT (itens 4.4.1 e 4.4.2). Arquivo "José Ernani da Silva Silveira.pdf", pág. 1. A página enviada não traz título nem ano.', pdf: 'José Ernani da Silva Silveira.pdf' },
    PIANCASTELLI: { cite: 'PIANCASTELLI, E.M. (2012)', full: 'PIANCASTELLI, É. M. Tópicos em Estruturas de Fundação e Contenção: coeficiente de recalque vertical e constante de mola para solos sob fundações diretas (itens 1 a 8). SEI Engenharia de Projetos Ltda., dezembro de 2012.', pdf: 'Élvio Mosci Piancastelli.pdf' },
    SHERIF: { cite: 'SHERIF, G. (apud Piancastelli, 2012)', full: 'SHERIF, G. Tabela 1: valores de f = (1 − μ²)·I·α, reproduzida em PIANCASTELLI (2012), itens 6 e 8.', pdf: 'Élvio Mosci Piancastelli.pdf' },
    GODOY1972: { cite: 'GODOY, N.S. (1972) apud Cintra (2011)', full: 'GODOY (1972). Tabelas 2.4 e 2.5 (peso específico de solos argilosos e arenosos), reproduzidas em Cintra (2011), item 2.9.3.', pdf: 'correlacoes.pdf' },
    GODOY1983: { cite: 'GODOY, N.S. (1983) apud Cintra (2011)', full: 'GODOY (1983). φ = 28° + 0,4·N, citado em Cintra (2011), item 2.9.2.', pdf: 'correlacoes.pdf' },
    TEIXEIRA1996: { cite: 'TEIXEIRA, A.H. (1996) apud Cintra (2011)', full: 'TEIXEIRA (1996). φ = √(20·N) + 15°, citado em Cintra (2011), item 2.9.2. Também em Silveira.', pdf: 'correlacoes.pdf' },
    TG1996: { cite: 'TEIXEIRA, A.H.; GODOY, N.S. (1996)', full: 'TEIXEIRA, A. H.; GODOY, N. S. Análise, projeto e execução de fundações rasas. In: HACHICH, W. et al. (ed.). Fundações: teoria e prática. São Paulo: Pini, 1996. Citado nos PDFs enviados por Cintra (2011) e pelo manual TQS (CRV – Sapatas e Tubulões).', pdf: 'correlacoes.pdf / kvespt.pdf' },
    CINTRA2011: { cite: 'CINTRA (2011)', full: 'CINTRA (2011). Fundações diretas, itens 2.9.1 a 2.9.4 (páginas escaneadas e manuscrito em correlacoes.pdf). Autores completos e editora não aparecem nas páginas enviadas.', pdf: 'correlacoes.pdf' },
    CINTRA2003: { cite: 'CINTRA et al. (2003)', full: 'CINTRA et al. (2003), citado pelo manual TQS como fonte das Tabelas 5.3 e 5.8.', pdf: 'correlacoes.pdf / kvespt.pdf' },
    NBR6484: { cite: 'ABNT NBR 6484:2001, Anexo A', full: 'ABNT NBR 6484:2001. Solo: sondagens de simples reconhecimento com SPT. Anexo A (informativo): estados de compacidade e de consistência.', pdf: 'correlacoes.pdf' },
    NBR6122: { cite: 'ABNT NBR 6122:1996', full: 'ABNT NBR 6122:1996. Projeto e execução de fundações. Tensões básicas (Tab. 5.3 do manual TQS) e prescrições para solos granulares e argilosos. A norma foi revisada em 2010.', pdf: 'correlacoes.pdf / kvespt.pdf' },
    ART2024: { cite: 'Contribuciones a Las Ciencias Sociales (2024)', full: 'Contribuciones a Las Ciencias Sociales, São José dos Pinhais, v. 17, n. 10, p. 01-17, 2024. Tabela 1 e Equações 3 e 4. Autores não identificados na página enviada.', pdf: 'correlacoes.pdf' },
    PAG1: { cite: 'Tabela da pág. 1 (sem referência)', full: 'Tabela da pág. 1 de correlacoes.pdf (γ, c, φ, E, ν por compacidade e consistência). A página não traz fonte.', pdf: 'correlacoes.pdf' },
    TQS: { cite: 'TQS Docs, CRV – Sapatas e Tubulões', full: 'TQS. CRV – Sapatas e Tubulões (SISEs). docs.tqs.com.br/Docs/Details?id=3828. Impresso em 22/10/2026.', pdf: 'correlacoes.pdf / kvespt.pdf' },
    MORRISON: { cite: 'SAFE, MORRISON (1993)', full: 'MORRISON (1993). Tabela 5.2.2: valores de Kv × tensão admissível (SAFE). Citado no manual TQS.', pdf: 'correlacoes.pdf' },
    MORAES: { cite: 'MORAES (1981)', full: 'MORAES (1981). Fonte citada pelo manual TQS para a tabela de Béton-Kalender (1962), os valores de E0 de Cestelli Guidi e o método de Rausch & Cestelli Guidi.', pdf: 'correlacoes.pdf' },
    BETON: { cite: 'Béton-Kalender (1962)', full: 'Béton-Kalender (1962), Tabela 5.1, via MORAES (1981).', pdf: 'correlacoes.pdf' },
    TERZAGHI: { cite: 'TERZAGHI (1955)', full: 'TERZAGHI (1955). Tabela 5.4 (k30) e correções por dimensão, via VELLOSO & LOPES (1996).', pdf: 'correlacoes.pdf' },
    VELLOSO: { cite: 'VELLOSO & LOPES (1996)', full: 'VELLOSO & LOPES (1996), citado pelo manual TQS no método de Terzaghi.', pdf: 'correlacoes.pdf' },
    K30: { cite: 'ACI (1988), CALAVERA (2000), BOWLES (1997)', full: 'Tabela 5.5 (k30 propostos por outros autores): ACI (1988), CALAVERA (2000), BOWLES (1997).', pdf: 'correlacoes.pdf' },
    POULOS: { cite: 'POULOS & DAVIS (1974); POULOS (1967)', full: 'POULOS & DAVIS (1974): expressões de Mindlin. POULOS (1967): procedimento de Steinbrenner. Citados pelo manual TQS.', pdf: 'kvespt.pdf' },
    SCHMERTMANN: { cite: 'SCHMERTMANN (1978)', full: 'SCHMERTMANN (1978): E = 3·K·SPT (MPa), com K de TEIXEIRA (1993), Tab. 5.8.', pdf: 'correlacoes.pdf' },
    TEIXEIRA1993: { cite: 'TEIXEIRA (1993)', full: 'TEIXEIRA (1993): valores de K da Tab. 5.8, citados pelo manual TQS.', pdf: 'correlacoes.pdf' },
    TROFIMENKOV: { cite: 'TROFIMENKOV (1974)', full: 'TROFIMENKOV (1974): coeficiente α que relaciona qc e SPT (Tab. 5.9), citado pelo manual TQS.', pdf: 'correlacoes.pdf' },
    SCHULTZE: { cite: 'SCHULTZE & MENZENBACH (1961)', full: 'SCHULTZE & MENZENBACH (1961): (E0) = C1 + C2·SPT, Tab. 5.12 (constantes em bar/golpe).', pdf: 'correlacoes.pdf' },
    CESTELLI: { cite: 'CESTELLI GUIDI (Moraes, 1981)', full: 'CESTELLI GUIDI, citado em MORAES (1981): Tab. 5.11, valores de E0.', pdf: 'correlacoes.pdf' },
    BOUSSINESQ: { cite: 'BOUSSINESQ; MORAES (1981)', full: 'Método de Boussinesq para placa circular rígida: kv = 2·E0 / (R·π·(1 − ν²)). Manual TQS, com MORAES (1981).', pdf: 'correlacoes.pdf' },
    ALONSO: { cite: 'ALONSO (Método Urbano R. Alonso)', full: 'Método Urbano R. Alonso: σadm = NSPT/50 (MPa) para sapatas. Slide sem autor e ano na página enviada.', pdf: 'correlacoes.pdf' },
    WCOSTA: { cite: 'WILSON COSTA (Goiânia)', full: 'Método Wilson Costa (Goiânia): σadm = NSPT/30, /40 ou /50 (MPa). Slide sem autor e ano na página enviada.', pdf: 'correlacoes.pdf' },
    MELLO1975: { cite: 'MELLO (1975)', full: 'MELLO (1975): σadm = 0,1·(√NSPT − 1), em MPa, sem distinção do tipo de solo, com NSPT entre 4 e 16. Equação 4 do artigo de 2024 e manuscrito.', pdf: 'correlacoes.pdf' },
    WEBB1969: { cite: 'WEBB (1969)', full: 'WEBB (1969): E ≈ 479·(N + 15) kN/m² para areia e areia argilosa. Imagem enviada, em inglês; obra de origem não aparece.', pdf: 'imagem enviada' },
    FERRENT1963: { cite: 'FERRENT (1963)', full: 'FERRENT (1963), grafia como impressa: E ≈ 718·(1 − ν²)·N kN/m². Imagem enviada; obra de origem não aparece.', pdf: 'imagem enviada' },
    BEGEMANN1974: { cite: 'BEGEMANN (1974)', full: 'BEGEMANN (1974): E em função de N para silte com areia até pedregulho com areia, com C = 3 a 12. Imagem enviada; obra de origem não aparece.', pdf: 'imagem enviada' },
    KULHAWY1990: { cite: 'KULHAWY & MAYNE (1990)', full: 'KULHAWY e MAYNE (1990): E/pa = 5·N60, 10·N60 ou 15·N60 conforme o tipo de areia. Imagem enviada; obra de origem não aparece.', pdf: 'imagem enviada' },
    PARAMSOLOS: { cite: 'Cap. 3 – Parâmetros dos Solos para Cálculo de Fundações (págs. 74-89)', full: 'Capítulo "3 – Parâmetros dos Solos para Cálculo de Fundações", págs. 74 a 89 do arquivo parâmetros-dos-solos-cálculo-de-fundações.pdf. Autor e obra não aparecem nas páginas enviadas. Traz as Tabs. 1 a 7, a tabela de Moraes (1978) e trechos de Cintra et al. (2003).', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    UFMG: { cite: 'UFMG (fls. 47), via Cap. 3', full: 'Tab. 3 do capítulo "Parâmetros dos Solos para Cálculo de Fundações" (pág. 83), com a legenda "Valores UFMG fls. 47". É a mesma tabela da Tabela 1 do artigo de 2024.', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    BOWLES1997T4: { cite: 'BOWLES (1997), Tab. 4 do Cap. 3', full: 'BOWLES (1997). Tab. 4 do capítulo "Parâmetros dos Solos para Cálculo de Fundações" (pág. 83): densidade relativa, SPT, φ, γ e qu por compacidade e consistência.', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    SIMONS: { cite: 'SIMONS (Tab. 5 do Cap. 3)', full: 'SIMONS. Tab. 5 do capítulo "Parâmetros dos Solos para Cálculo de Fundações" (pág. 84): relação entre consistência e resistência não drenada a partir de verificação no campo. Ano e obra não aparecem.', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    UFV: { cite: 'UFV (Tabs. 6 e 7 do Cap. 3)', full: 'UFV. Tabs. 6 e 7 do capítulo "Parâmetros dos Solos para Cálculo de Fundações" (pág. 84): módulo de elasticidade (kgf/cm²) e coeficiente de Poisson por tipo de solo.', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    MORAES1978: { cite: 'MORAES (1978)', full: 'MORAES (1978), "Segundo Moraes, 1978", págs. 86 e 87 do capítulo "Parâmetros dos Solos para Cálculo de Fundações": relações de Terzaghi e Peck (consistência × N × compressão simples), tensão admissível de solos coesivos e tabelas de φ de areias e de c de argilas.', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    TP1948: { cite: 'TERZAGHI & PECK (1948)', full: 'TERZAGHI e PECK (1948): α da ordem de 15 em c ≅ N/α. Págs. 77 e 78 do capítulo "Parâmetros dos Solos para Cálculo de Fundações".', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    NAVFAC: { cite: 'NAVFAC – DM7 (1971)', full: 'Manual NAVFAC DM-7 (1971): qu ≅ N/A e Su ≅ N/(2A), com A ≅ 13,5; 6,5 e 4,0 conforme a plasticidade. Pág. 78 do capítulo "Parâmetros dos Solos para Cálculo de Fundações".', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
    JOPPERT: { cite: 'JOPPERT JR., I. – Fundações e contenções de edifícios, Tab. 13, p. 99', full: 'JOPPERT JR., Ivan. Fundações e contenções de edifícios. Tabela nº 13 – Parâmetros médios do solo (pág. 99). Imagem enviada; editora e ano não aparecem na imagem.', pdf: 'imagem enviada' },
    SCHNAID2012: { cite: 'SCHNAID & ODEBRECHT (2012), via trabalho enviado', full: 'SCHNAID, F.; ODEBRECHT, E. (2012), citados no item 2.8 do trabalho enviado (imagem), que reproduz as Eqs. (3) e (4). Título e autoria do trabalho não aparecem na imagem.', pdf: 'imagem enviada' },
    HATANAKA: { cite: 'HATANAKA & UCHIDA (1996), via Schnaid & Odebrecht (2012)', full: 'HATANAKA e UCHIDA (1996): φ = 20° + √(15,4·N60), Eq. (3) do item 2.8 do trabalho enviado, segundo Schnaid e Odebrecht (2012).', pdf: 'imagem enviada' },
    USACE1993: { cite: 'US ARMY CORPS OF ENGINEERS (1993), citado por Matos Fernandes (2011)', full: 'US ARMY CORPS OF ENGINEERS (1993), citado por MATOS FERNANDES (2011): Tabela 2.18, φ′ de areias de quartzo em função de ID. Imagem enviada.', pdf: 'imagem enviada' },
    PUCRIO: { cite: 'Ensaios de placa da PUC-Rio', full: 'Expressão E (MPa) = 2,9·N + 2,7 (Eq. 2.28), obtida de ensaios de carga em placa realizados na Universidade Católica do Rio de Janeiro. Autor do ajuste não aparece na imagem.', pdf: 'imagem enviada' },
    BLIGHT1997: { cite: 'BLIGHT (1997)', full: 'BLIGHT (1997): E (MPa) = 1,6·N para solos residuais (Eq. 2.29). Imagem enviada.', pdf: 'imagem enviada' },
    CLAYTON1986: { cite: 'CLAYTON (1986), citado por Filho (2010)', full: 'CLAYTON (1986), com dados de BURLAND e BURBIDGE (1985), citado por FILHO (2010): Tabela 2.19, E (MPa) × N_SPT (N60) para areias. Imagem enviada.', pdf: 'imagem enviada' },
    BOWLES2001: { cite: 'BOWLES (2001)', full: 'BOWLES (2001): Tabela 2.20, E (kPa) em função de N_SPT (N55) para diversos tipos de solo. Imagem enviada.', pdf: 'imagem enviada' },
    CLAYTON1995: { cite: 'CLAYTON et al. (1995), citado por Matos Fernandes (2011)', full: 'CLAYTON et al. (1995), citado por MATOS FERNANDES (2011): Tabela 2.21, N60 × consistência das argilas. Imagem enviada.', pdf: 'imagem enviada' },
    DANZIGER: { cite: 'DANZIGER et al. (1988), citado por Duarte (2002)', full: 'DANZIGER et al. (1988), citado por DUARTE (2002): Tabela 2.24, correlações entre SPT e CPT (qc/N em MPa por pancada por 0,3 m). Imagem enviada.', pdf: 'imagem enviada' },
    ALONSO1943: { cite: 'ALONSO (1943)', full: 'ALONSO (1943): Tabela 1 (coesão de argilas) e Tabela 2 (φ de areias) em função de N_SPT, item 2.9.2 do trabalho enviado. Imagens enviadas.', pdf: 'imagem enviada' },
    ALONSO2010: { cite: 'ALONSO (2010)', full: 'ALONSO (2010): Tabela 4, coesão das argilas por N. Imagem enviada.', pdf: 'imagem enviada' },
    LOOK2007: { cite: 'LOOK (2007)', full: 'LOOK (2007): Tabela 3, valores de correlação entre Su e N_SPT,60. Imagem enviada.', pdf: 'imagem enviada' },
    BOWLES1997SU: { cite: 'BOWLES (1997); MELLO (1971)', full: 'BOWLES (1997): Su = k·N_SPT,60, Eq. (8), item 2.9.7 do trabalho enviado; Bowles indica k = 12. MELLO (1971) indica k entre 0,4 e 20. Imagem enviada.', pdf: 'imagem enviada' },
    BERBEARIAN: { cite: 'BERBEARIAN (2015)', full: 'BERBEARIAN (2015): c = N/0,35, em kPa (Eq. 2). Imagem enviada.', pdf: 'imagem enviada' },
    MAYNE1999: { cite: 'MAYNE & POULOS (1999); SIMONS & MENZIES (1981)', full: 'MAYNE e POULOS (1999): ν′ = 0,15 ± 0,05 para carregamento drenado e ν = 0,5 para carregamento rápido em argilas saturadas. SIMONS e MENZIES (1981): ν varia do valor não drenado ao drenado. Citados por Cintra et al. (2003), pág. 89 do capítulo "Parâmetros dos Solos para Cálculo de Fundações".', pdf: 'parâmetros-dos-solos-cálculo-de-fundações.pdf' },
  };

  /* ------------------------------------------------------------------ tabelas */
  // Tabela 1 de Sherif (Piancastelli, 2012). Colunas L/B: 1; 1,5; 2; 3; 5; 10; 20; infinito
  const SH_Z = [0.2, 0.4, 0.6, 0.8, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 14.0, 20.0];
  const SH_L = [1, 1.5, 2, 3, 5, 10, 20];
  const SH = [
    [0.18, 0.18, 0.18, 0.19, 0.19, 0.19, 0.19, 0.19],
    [0.29, 0.31, 0.32, 0.33, 0.33, 0.34, 0.34, 0.34],
    [0.37, 0.40, 0.42, 0.44, 0.45, 0.45, 0.46, 0.46],
    [0.44, 0.47, 0.50, 0.53, 0.56, 0.57, 0.57, 0.57],
    [0.49, 0.53, 0.57, 0.61, 0.64, 0.67, 0.67, 0.67],
    [0.58, 0.65, 0.70, 0.75, 0.81, 0.86, 0.87, 0.88],
    [0.64, 0.72, 0.78, 0.85, 0.93, 1.00, 1.23, 1.24],
    [0.70, 0.82, 0.89, 0.99, 1.09, 1.20, 1.25, 1.28],
    [0.74, 0.87, 0.96, 1.07, 1.19, 1.33, 1.43, 1.45],
    [0.76, 0.90, 1.09, 1.13, 1.27, 1.43, 1.54, 1.59],
    [0.78, 0.93, 1.03, 1.17, 1.33, 1.58, 1.68, 1.71],
    [0.80, 0.95, 1.06, 1.23, 1.40, 1.61, 1.75, 1.89],
    [0.81, 0.97, 1.09, 1.26, 1.45, 1.68, 1.85, 2.03],
    [0.82, 0.98, 1.11, 1.29, 1.50, 1.79, 2.00, 2.25],
    [0.82, 0.98, 1.12, 1.32, 1.57, 1.89, 2.12, 2.48],
  ];

  // Tabela 5.2.2 (SAFE, Morrison 1993): σ de 0,25 a 4,00 kgf/cm², passo 0,05 → Kv (kgf/cm³)
  const MORRISON_KV = [
    0.65, 0.78, 0.91, 1.04, 1.17, 1.30, 1.39, 1.48, 1.57, 1.66, 1.75, 1.84, 1.93, 2.02, 2.11, 2.2, 2.29, 2.38, 2.47,
    2.56, 2.65, 2.74, 2.83, 2.92, 3.01, 3.10, 3.19, 3.28, 3.37, 3.46, 3.55, 3.64, 3.73, 3.82, 3.91,
    4.0, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.0,
    6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.0,
  ];
  const MORRISON_S0 = 0.25, MORRISON_DS = 0.05;

  const BETON = [
    ['Turfa leve-solo pantanoso', 1.0], ['Turfa pesada-solo pantanoso', 1.5], ['Areia fina de praia', 1.5],
    ['Aterro de silte, areia e cascalho', 2.0], ['Argila molhada', 3.0], ['Argila úmida', 5.0], ['Argila seca', 8.0],
    ['Argila seca endurecida', 10.0], ['Silte compactado com areia e pedra', 10.0],
    ['Silte compactado com areia e muita pedra', 12.0], ['Cascalho miúdo com areia fina', 12.0],
    ['Cascalho médio com areia fina', 12.0], ['Cascalho grosso com areia grossa', 15.0],
    ['Cascalho grosso com pouca areia', 20.0], ['Cascalho grosso com pouca areia compactada', 25.0],
  ];
  const K30_OUTROS = [
    ['Areia fina de praia', 1.5], ['Areia fofa seca úmida', 3.0], ['Areia média seca úmida', 9.0],
    ['Areia compacta seca úmida', 20.0], ['Areia pedregulhosa fofa', 8.0], ['Areia pedregulhosa compacta', 25.0],
    ['Pedregulho arenoso fofo', 12.0], ['Pedregulho arenoso compacto', 30.0],
    ['Rochas brandas ou alteradas (saprólito)', 500.0], ['Rocha sã', 30000.0],
  ];
  const E0_TAB511 = [
    ['Turfa', 5], ['Argila molhada', 40], ['Argila plástica', 80], ['Argila endurecida – plástica', 150],
    ['Areia solta', 200], ['Areia compacta', 800],
  ];
  const E0_TAB512 = [
    ['Areia fina abaixo do lençol de água', 71, 4.9], ['Areia fina acima do lençol de água', 52, 3.3],
    ['Areia', 39, 4.5], ['Areia argilosa', 43.8, 11.8], ['Areia e argila', 38, 10.5], ['Areia fofa', 24, 5.3],
  ];
  // Tab. 5.6 (E em kgf/cm²) por classe
  const E_TAB56 = { arenoso: [50, 200, 500, 700, 900], argiloso: [10, 20, 50, 80, 150] };
  // Tab. 5.3 NBR 6122:1996 (σs em MPa)
  const NBR_ROWS = {
    areia: { 2: ['Areia med. compacta (9 ≤ SPT ≤ 18)', 0.2], 3: ['Areia compacta (19 ≤ SPT ≤ 40)', 0.4], 4: ['Areia muito compacta (SPT > 40)', 0.5] },
    argila: { 2: ['Argila média (6 ≤ SPT ≤ 10)', 0.1], 3: ['Argila rija (11 ≤ SPT ≤ 19)', 0.2], 4: ['Argila dura (SPT > 19)', 0.3] },
    silte: { 2: ['Silte médio (medianamente compacto)', 0.1], 3: ['Silte compactos (ou rijos)', 0.3], 4: ['Silte muito compacto (ou duros)', 0.3] },
  };

  /* ------------------------------------------------------------------ utilidades numéricas */
  function lerp(x0, x1, y0, y1, x) {
    return x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  const num = (x) => (x === '' || x == null ? NaN : Number(String(x).replace(',', '.')));

  /* ------------------------------------------------------------------ faixas impressas nas tabelas por N */
  // Aceita: "<4", "≤2", ">50", "≥30", "4-10" (extremos incluídos), "[4,10)" e "[50,inf)".
  function parseRange(s) {
    s = String(s).replace(/\s+/g, '');
    let m;
    if ((m = /^<([\d.]+)$/.exec(s))) return { lo: -Infinity, hi: +m[1], loInc: true, hiInc: false };
    if ((m = /^≤([\d.]+)$/.exec(s))) return { lo: -Infinity, hi: +m[1], loInc: true, hiInc: true };
    if ((m = /^>([\d.]+)$/.exec(s))) return { lo: +m[1], hi: Infinity, loInc: false, hiInc: true };
    if ((m = /^≥([\d.]+)$/.exec(s))) return { lo: +m[1], hi: Infinity, loInc: true, hiInc: true };
    if ((m = /^([[(])([\d.]+),([\d.]+|inf)([\])])$/.exec(s))) return { lo: +m[2], hi: m[3] === 'inf' ? Infinity : +m[3], loInc: m[1] === '[', hiInc: m[4] === ']' };
    if ((m = /^([\d.]+)[-–]([\d.]+)$/.exec(s))) return { lo: +m[1], hi: +m[2], loInc: true, hiInc: true };
    if ((m = /^([\d.]+)$/.exec(s))) return { lo: +m[1], hi: +m[1], loInc: true, hiInc: true };
    throw new Error('faixa inválida: ' + s);
  }
  function showRange(s) {
    const r = parseRange(s), f = (x) => nf(x, 0, 2);
    if (r.lo === -Infinity) return (r.hiInc ? '≤ ' : '< ') + f(r.hi);
    if (r.hi === Infinity) return (r.loInc ? '≥ ' : '> ') + f(r.lo);
    if (r.loInc && r.hiInc) return r.lo === r.hi ? f(r.lo) : f(r.lo) + ' a ' + f(r.hi);
    return (r.loInc ? '≥ ' : '> ') + f(r.lo) + ' e ' + (r.hiInc ? '≤ ' : '< ') + f(r.hi);
  }
  const inRange = (x, r) => (x > r.lo || (r.loInc && x === r.lo)) && (x < r.hi || (r.hiInc && x === r.hi));
  /** rows: [{n: '4-10', ...}]. Devolve todas as linhas cuja faixa contém x (limites compartilhados dão mais de uma). */
  function matchRows(x, rows) {
    const rg = (r) => r._rg || (r._rg = parseRange(r.n));
    let hits = rows.filter((r) => inRange(x, rg(r)));
    let rounded = null;
    if (!hits.length && Number.isFinite(x) && !Number.isInteger(x)) {
      const x2 = Math.round(x);
      hits = rows.filter((r) => inRange(x2, rg(r)));
      if (hits.length) rounded = x2;
    }
    return { hits, rounded };
  }
  /** valor impresso → objeto de valor: "<10", ">200", "≥5", "12-25", "30", "–" */
  function pv(s, u) {
    if (typeof s === 'number') return pt(s, u);
    s = String(s).trim();
    let m;
    if (s === '–' || s === '-') return na('A tabela imprime "–" nesta célula.');
    if ((m = /^<\s*([\d.]+)$/.exec(s))) return cmp('<', +m[1], u);
    if ((m = /^≤\s*([\d.]+)$/.exec(s))) return cmp('≤', +m[1], u);
    if ((m = /^≥\s*([\d.]+)$/.exec(s))) return cmp('≥', +m[1], u);
    if ((m = /^>\s*([\d.]+)$/.exec(s))) return gt(+m[1], u);
    if ((m = /^([\d.]+)\s*[-–]\s*([\d.]+)$/.exec(s))) return rng(+m[1], +m[2], u);
    if (/^[\d.]+$/.test(s)) return pt(+s, u);
    return txt(s, u);
  }
  // Tabela 2.21 (Clayton et al., 1995, citado por Matos Fernandes, 2011): consistência das argilas × N60
  const CLAYTON95 = [
    { lab: 'muito mole', n: '0-4' }, { lab: 'mole', n: '4-8' }, { lab: 'firme', n: '8-15' },
    { lab: 'rija', n: '15-30' }, { lab: 'muito rija', n: '30-60' }, { lab: 'dura', n: '>60' },
  ];
  function claytonClass(n60) {
    return matchRows(n60, CLAYTON95).hits.map((h) => `${h.lab} (${showRange(h.n)})`);
  }

  function sherif(LB, ZB) {
    const notes = [];
    let zb = ZB;
    if (zb < SH_Z[0]) { notes.push('Z/B abaixo do intervalo da Tabela 1 (0,2 a 20): usado Z/B = 0,2.'); zb = SH_Z[0]; }
    if (zb > SH_Z[SH_Z.length - 1]) { notes.push('Z/B acima do intervalo da Tabela 1 (0,2 a 20): usado Z/B = 20.'); zb = SH_Z[SH_Z.length - 1]; }
    let r = 0;
    while (r < SH_Z.length - 2 && zb > SH_Z[r + 1]) r++;
    const rowVal = (row) => {
      if (LB > 20) return SH[row][7];
      let c = 0;
      while (c < SH_L.length - 2 && LB > SH_L[c + 1]) c++;
      return lerp(SH_L[c], SH_L[c + 1], SH[row][c], SH[row][c + 1], Math.max(LB, 1));
    };
    if (LB > 20) notes.push('L/B > 20: usada a coluna "infinito" da Tabela 1.');
    const raw = lerp(SH_Z[r], SH_Z[r + 1], rowVal(r), rowVal(r + 1), zb);
    const f = Math.round(raw * 100 + 1e-7) / 100;
    return { raw, f, notes };
  }
  function piancastelliCr(Es, B, L, Z) {
    const s = sherif(L / B, Z / B);
    const Cr = Es / (B * s.f);
    return { f: s.f, fRaw: s.raw, Cr, notes: s.notes, LB: L / B, ZB: Z / B };
  }

  function morrisonKv(sig) {
    // sig em kgf/cm². Interpolação linear na Tabela 5.2.2; fora da tabela, prolonga-se o segmento extremo.
    const n = MORRISON_KV.length;
    const pos = (sig - MORRISON_S0) / MORRISON_DS;
    let i = Math.floor(pos);
    let extrap = null;
    if (pos < 0) { i = 0; extrap = 'abaixo'; }
    else if (pos >= n - 1) { i = n - 2; extrap = pos > n - 1 ? 'acima' : null; }
    const s0 = MORRISON_S0 + i * MORRISON_DS;
    const kv = lerp(s0, s0 + MORRISON_DS, MORRISON_KV[i], MORRISON_KV[i + 1], sig);
    return { kv, extrap, s0, k0: MORRISON_KV[i], k1: MORRISON_KV[i + 1] };
  }

  /* Mindlin / Steinbrenner (manual TQS, item 5.4.1) — b, L e z em cm; p em kgf/cm²; E em kgf/cm² */
  function mindlinParts(b, L, z) {
    const m = L / b, n = z / b, R = Math.sqrt(1 + m * m + n * n);
    const A = (1 / (2 * Math.PI)) * (Math.log((R + m) / (R - m)) + m * Math.log((R + 1) / (R - 1)));
    const B = n === 0 ? 0 : (n / (2 * Math.PI)) * Math.atan(m / (n * R));
    return { m, n, R, A, B };
  }
  function mindlinD(p, b, L, z, E, nu) {
    const q = mindlinParts(b, L, z);
    const k = (1 - 2 * nu) / (1 - nu);
    const d = ((4 * p * b) / E) * (1 - nu * nu) * (q.A - k * q.B);
    return Object.assign({ d, k }, q);
  }

  /* ------------------------------------------------------------------ contexto */
  function prepare(inp) {
    const soil = SOILS.find((s) => s.key === inp.soil) || SOILS[2];
    let group = soil.group;
    if (soil.key === 'silte' && (inp.silteComo === 'arenoso' || inp.silteComo === 'argiloso')) group = inp.silteComo;
    const N = num(inp.N);
    const idx = Number.isFinite(N) ? clsIndex(N, group) : 0;
    const c = {
      inp, soil, group, N, idx,
      clsName: CLS[group][idx], clsLim: CLS_LIM[group][idx],
      groupLabel: GROUP_LABEL[group], sel: inp.sel || {},
    };
    let B = num(inp.B), L = num(inp.L);
    if (B > 0 && L > 0) {
      c.swapped = B > L;
      if (c.swapped) [B, L] = [L, B];
      c.geo = { B, L, A: B * L };
      const Z = num(inp.Z);
      c.geo.Zdefault = !(Z > 0);
      c.geo.Z = Z > 0 ? Z : 2 * B;
    }
    const n60 = num(inp.n60);
    c.n60User = n60 >= 0;
    c.N60 = c.n60User ? n60 : N;
    c.clayton = Number.isFinite(c.N60) ? claytonClass(c.N60) : [];
    const nuU = num(inp.nu);
    c.nuUser = nuU > 0 && nuU < 0.5 ? nuU : null;
    c.Es = num(inp.EsManual) > 0 ? num(inp.EsManual) : null;
    c.mind = inp.mindlin === 'full' ? 'full' : 'quad';
    c.sensivel = inp.sensivel !== false;
    c.na = inp.na === 'abaixo' ? 'abaixo' : 'acima';
    return c;
  }

  const classLine = (c) => ({ k: 'Classificação', v: `${c.groupLabel}: N = ${nm(c.N)} (${c.clsLim}) → ${c.clsName} (ABNT NBR 6484:2001)` });
  const W = (type, text) => ({ type, text });
  const needGeo = (c) => (c.geo ? null : na('Informe B e L na área "Dados da fundação".'));
  const granularWarn = (c) => (c.group === 'argiloso' ? [W('apply', 'Correlação indicada para areias; o solo selecionado é argiloso.')] : []);
  const clayWarn = (c) => (c.group === 'arenoso' ? [W('apply', 'Correlação indicada para argilas; o solo selecionado é arenoso.')] : []);
  const nuTab57 = (c) => (c.group === 'arenoso' ? 0.35 : 0.3);

  /* ------------------------------------------------------------------ métodos */
  const METHODS = [];
  const add = (m) => METHODS.push(m);

  /* ---------- γ ---------- */
  add({
    id: 'gamma_silveira', params: ['gamma'], title: 'Peso específico por compacidade/consistência',
    author: 'Silveira', refs: ['SILVEIRA', 'PIANCASTELLI', 'NBR6484'], where: 'José Ernani da Silva Silveira.pdf, pág. 1',
    run(c) {
      const t = c.group === 'arenoso' ? [1.6, 1.8, 1.9, 2.0, 2.1] : [1.3, 1.5, 1.7, 1.9, 2.0];
      const v = t[c.idx];
      return {
        value: pt(v, 'tf/m³'),
        memo: [classLine(c), { k: 'Tabela', v: `γ (${c.groupLabel.toLowerCase()}) = ${t.map((x) => nm(x, 2)).join(' | ')} tf/m³` }, { k: 'Resultado', v: `γ = ${nm(v, 2)} tf/m³` }],
      };
    },
  });
  add({
    id: 'gamma_godoy', params: ['gamma'], title: 'Peso específico (Tabelas 2.4 e 2.5)',
    author: 'Godoy (1972)', refs: ['GODOY1972', 'CINTRA2011', 'NBR6484'], where: 'correlacoes.pdf, págs. 3 e 8; também Tabs. 1.12 e 1.13 (imagem enviada) e pág. 85-86 do capítulo "Parâmetros dos Solos"',
    run(c) {
      if (c.group === 'argiloso') {
        const t = [13, 15, 17, 19, 21];
        return {
          value: pt(t[c.idx], 'kN/m³'),
          memo: [classLine(c), { k: 'Tabela 2.4 (solos argilosos)', v: `γ = 13 | 15 | 17 | 19 | 21 kN/m³ para N ≤ 2 | 3-5 | 6-10 | 11-19 | ≥ 20` }, { k: 'Resultado', v: `γ = ${t[c.idx]} kN/m³` }],
        };
      }
      const t = [[16, 18, 19], [16, 18, 19], [17, 19, 20], [18, 20, 21], [18, 20, 21]][c.idx];
      return {
        value: multi([{ label: 'Areia seca', val: pt(t[0], 'kN/m³') }, { label: 'Areia úmida', val: pt(t[1], 'kN/m³') }, { label: 'Areia saturada', val: pt(t[2], 'kN/m³') }]),
        memo: [classLine(c), { k: 'Tabela 2.5 (solos arenosos)', v: `seca | úmida | saturada = ${t.join(' | ')} kN/m³` }, { k: 'Resultado', v: `γseca = ${t[0]}, γúmida = ${t[1]}, γsat = ${t[2]} kN/m³` }],
        notes: [
          'O texto-fonte informa que, para areia saturada, o valor da Tab. 2.5 "refere-se ao peso específico submerso". Para a capacidade de carga o texto pede o peso específico efetivo e manda descontar o peso específico da água. Os valores acima estão como impressos.',
          'A pág. 3 do PDF traz os mesmos valores em faixas (16-19, 17-20, 18-21 kN/m³ para areias; 13, 15, 17, 19 e 21 para argilas), sem referência.',
        ],
      };
    },
  });
  add({
    id: 'gamma_pag1', params: ['gamma'], title: 'Faixas por compacidade/consistência (kN/m³)',
    author: 'Tabela da pág. 1', refs: ['PAG1', 'NBR6484'], where: 'correlacoes.pdf, pág. 1',
    run(c) {
      const v = c.group === 'arenoso' ? [pt(16, 'kN/m³'), pt(18, 'kN/m³'), pt(19, 'kN/m³'), pt(20, 'kN/m³'), gt(20, 'kN/m³')] : [pt(13, 'kN/m³'), pt(15, 'kN/m³'), pt(17, 'kN/m³'), pt(19, 'kN/m³'), gt(20, 'kN/m³')];
      return { value: v[c.idx], memo: [classLine(c), { k: 'Tabela', v: `${c.clsName}: ${fmtVal(v[c.idx])}` }, { k: 'Resultado', v: `γ = ${fmtVal(v[c.idx])}` }], warns: [W('print', 'Tabela sem fonte no material. A classe "Pouco compacta" aparece impressa como "Pouco fofa".')] };
    },
  });
  add({
    id: 'gamma_2024', params: ['gamma'], title: 'Faixas por compacidade/consistência (tf/m³)',
    author: 'Artigo de 2024, Tabela 1', refs: ['ART2024', 'UFMG', 'NBR6484'], where: 'correlacoes.pdf, pág. 7; mesma tabela na Tab. 3 (UFMG, fls. 47) do capítulo "Parâmetros dos Solos", pág. 83',
    run(c) {
      const v = c.group === 'arenoso' ? [pt(1.6, 'tf/m³'), pt(1.8, 'tf/m³'), pt(1.9, 'tf/m³'), pt(2.0, 'tf/m³'), gt(2.0, 'tf/m³')] : [pt(1.3, 'tf/m³'), pt(1.5, 'tf/m³'), pt(1.7, 'tf/m³'), pt(1.9, 'tf/m³'), gt(2.0, 'tf/m³')];
      return { value: v[c.idx], memo: [classLine(c), { k: 'Tabela 1 (uso limitado a estudos preliminares)', v: `${c.clsName}: ${fmtVal(v[c.idx])}` }, { k: 'Resultado', v: `γ = ${fmtVal(v[c.idx])}` }] };
    },
  });

  /* ---------- coesão ---------- */
  add({
    id: 'c_silveira', params: ['c', 'cu'], title: 'Coesão em solos argilosos',
    author: 'Silveira', refs: ['SILVEIRA'], where: 'José Ernani da Silva Silveira.pdf, pág. 1',
    run(c) {
      if (c.group === 'arenoso') {
        return { value: pt(0, 'tf/m²'), memo: [classLine(c), { k: 'Fórmula', v: 'Solos arenosos (areias e siltes arenosos): c = 0' }, { k: 'Resultado', v: 'c = 0' }] };
      }
      return {
        value: pt(c.N, 'tf/m²'),
        memo: [classLine(c), { k: 'Fórmula', v: 'Solos argilosos (argilas e siltes argilosos): c = N (tf/m²), com φ = 0' }, { k: 'Substituição', v: `c = ${nm(c.N)} tf/m²` }, { k: 'Resultado', v: `c = ${nm(c.N)} tf/m²` }],
      };
    },
  });
  add({
    id: 'c_tg', params: ['c', 'cu'], title: 'Coesão não drenada, Cu = 10·N',
    author: 'Teixeira & Godoy (1996)', refs: ['TG1996', 'CINTRA2011'], where: 'correlacoes.pdf, págs. 2 e 5 (Cintra, item 2.9.1)',
    run(c) {
      const v = 10 * c.N;
      return {
        value: pt(v, 'kN/m²'),
        memo: [{ k: 'Fórmula', v: 'Cu = 10·N  (kN/m²)' }, { k: 'Substituição', v: `Cu = 10 × ${nm(c.N)}` }, { k: 'Resultado', v: `Cu = ${nm(v)} kN/m²` }],
        warns: clayWarn(c),
        notes: ['O texto-fonte propõe a correlação para a estimativa da coesão não drenada quando não há ensaios de laboratório.'],
      };
    },
  });
  add({
    id: 'c_pag1', params: ['c'], title: 'Faixas de coesão (kN/m²)',
    author: 'Tabela da pág. 1', refs: ['PAG1', 'NBR6484'], where: 'correlacoes.pdf, pág. 1',
    run(c) {
      const v = c.group === 'arenoso' ? pt(0, 'kN/m²') : [rng(0, 12, 'kN/m²'), rng(12, 25, 'kN/m²'), rng(25, 50, 'kN/m²'), rng(50, 150, 'kN/m²'), pt(150, 'kN/m²')][c.idx];
      return { value: v, memo: [classLine(c), { k: 'Tabela', v: `${c.clsName}: c = ${fmtVal(v)}` }, { k: 'Resultado', v: `c = ${fmtVal(v)}` }], warns: [W('print', 'Tabela sem fonte no material. Para argila dura o valor está impresso como "150".')] };
    },
  });
  add({
    id: 'c_2024', params: ['c'], title: 'Faixas de coesão (tf/m²)',
    author: 'Artigo de 2024, Tabela 1', refs: ['ART2024', 'UFMG', 'NBR6484'], where: 'correlacoes.pdf, pág. 7; mesma tabela na Tab. 3 (UFMG, fls. 47) do capítulo "Parâmetros dos Solos", pág. 83',
    run(c) {
      const v = c.group === 'arenoso' ? pt(0, 'tf/m²') : [rng(0, 1.2, 'tf/m²'), rng(1.2, 2.5, 'tf/m²'), txt('2,5 - 2,5', 'tf/m²'), rng(5.0, 15.0, 'tf/m²'), gt(15.0, 'tf/m²')][c.idx];
      const warns = c.group === 'argiloso' && c.idx === 2 ? [W('print', 'Valor impresso na tabela exatamente como "2,5 - 2,5". Mantido como impresso.')] : [];
      return { value: v, memo: [classLine(c), { k: 'Tabela 1 (uso limitado a estudos preliminares)', v: `${c.clsName}: c = ${fmtVal(v)}` }, { k: 'Resultado', v: `c = ${fmtVal(v)}` }], warns };
    },
  });

  /* ---------- φ ---------- */
  add({
    id: 'phi_godoy', params: ['phi'], title: 'φ = 28° + 0,4·N',
    author: 'Godoy (1983)', refs: ['GODOY1983', 'CINTRA2011'], where: 'correlacoes.pdf, págs. 2 e 6 (Cintra, item 2.9.2)',
    run(c) {
      const v = 28 + 0.4 * c.N;
      return { value: pt(v, '°'), memo: [{ k: 'Fórmula', v: 'φ = 28° + 0,4·N' }, { k: 'Substituição', v: `φ = 28° + 0,4 × ${nm(c.N)}` }, { k: 'Resultado', v: `φ = ${nm(v)}°` }], warns: granularWarn(c) };
    },
  });
  add({
    id: 'phi_teixeira', params: ['phi'], title: 'φ = √(20·N) + 15°',
    author: 'Teixeira (1996)', refs: ['TEIXEIRA1996', 'CINTRA2011', 'SILVEIRA'], where: 'correlacoes.pdf, págs. 2 e 6; Silveira, pág. 1',
    run(c) {
      const r = Math.sqrt(20 * c.N), v = r + 15;
      return { value: pt(v, '°'), memo: [{ k: 'Fórmula', v: 'φ = √(20·N) + 15°' }, { k: 'Substituição', v: `φ = √(20 × ${nm(c.N)}) + 15° = ${nm(r)}° + 15°` }, { k: 'Resultado', v: `φ = ${nm(v)}°` }], warns: granularWarn(c), notes: ['A mesma expressão aparece em Silveira para solos arenosos (c = 0).'] };
    },
  });
  add({
    id: 'phi_silveira', params: ['phi'], title: 'φ por tipo de solo',
    author: 'Silveira', refs: ['SILVEIRA'], where: 'José Ernani da Silva Silveira.pdf, pág. 1',
    run(c) {
      if (c.group === 'argiloso') return { value: pt(0, '°'), memo: [classLine(c), { k: 'Fórmula', v: 'Solos argilosos (argilas e siltes argilosos): φ = 0' }, { k: 'Resultado', v: 'φ = 0°' }] };
      const r = Math.sqrt(20 * c.N), v = 15 + r;
      return { value: pt(v, '°'), memo: [classLine(c), { k: 'Fórmula', v: 'Solos arenosos (areias e siltes arenosos): φ = 15 + (20·N)^½  (°), com c = 0' }, { k: 'Substituição', v: `φ = 15 + (20 × ${nm(c.N)})^½ = 15 + ${nm(r)}` }, { k: 'Resultado', v: `φ = ${nm(v)}°` }] };
    },
  });
  add({
    id: 'phi_pag1', params: ['phi'], title: 'Faixas de φ por compacidade',
    author: 'Tabela da pág. 1', refs: ['PAG1', 'NBR6484'], where: 'correlacoes.pdf, pág. 1',
    run(c) {
      const v = c.group === 'arenoso' ? [rng(25, 30, '°'), rng(30, 35, '°'), rng(35, 40, '°'), txt('40 - 35', '°'), gt(45, '°')][c.idx] : pt(0, '°');
      const warns = [W('print', 'Tabela sem fonte no material.')];
      if (c.group === 'arenoso' && c.idx === 3) warns.push(W('print', 'Valor impresso exatamente como "40 - 35". A Tabela 1 do artigo de 2024 traz 40 - 45 para a mesma classe. Mantido como impresso.'));
      return { value: v, memo: [classLine(c), { k: 'Tabela', v: `${c.clsName}: φ = ${fmtVal(v)}` }, { k: 'Resultado', v: `φ = ${fmtVal(v)}` }], warns };
    },
  });
  add({
    id: 'phi_2024', params: ['phi'], title: 'Faixas de φ por compacidade',
    author: 'Artigo de 2024, Tabela 1', refs: ['ART2024', 'UFMG', 'NBR6484'], where: 'correlacoes.pdf, pág. 7; mesma tabela na Tab. 3 (UFMG, fls. 47) do capítulo "Parâmetros dos Solos", pág. 83',
    run(c) {
      const v = c.group === 'arenoso' ? [rng(25, 30, '°'), rng(30, 35, '°'), rng(35, 40, '°'), rng(40, 45, '°'), gt(45, '°')][c.idx] : pt(0, '°');
      return { value: v, memo: [classLine(c), { k: 'Tabela 1 (uso limitado a estudos preliminares)', v: `${c.clsName}: φ = ${fmtVal(v)}` }, { k: 'Resultado', v: `φ = ${fmtVal(v)}` }] };
    },
  });

  /* ---------- ν ---------- */
  add({
    id: 'nu_silveira', params: ['nu'], title: 'Módulo de Poisson',
    author: 'Silveira', refs: ['SILVEIRA'], where: 'José Ernani da Silva Silveira.pdf, pág. 1 (item 4.4.2)',
    run(c) {
      const memo = [classLine(c)];
      if (c.soil.noun === 'areia') {
        const t = [null, 0.2, 0.3, 0.4, null][c.idx];
        if (t == null) return { value: na(`A fonte não traz μ para areia ${c.idx === 0 ? 'fofa' : 'muito compacta'} (só pouco, medianamente e compacta).`), memo };
        memo.push({ k: 'Tabela', v: 'Areia pouco compacta 0,2 | medianamente compacta 0,3 | compacta 0,4' }, { k: 'Resultado', v: `μ = ${nm(t, 1)}` });
        return { value: pt(t, ''), memo };
      }
      if (c.soil.noun === 'silte') {
        memo.push({ k: 'Tabela', v: 'Silte: 0,3 a 0,5' }, { k: 'Resultado', v: 'μ = 0,3 a 0,5' });
        return { value: rng(0.3, 0.5, ''), memo };
      }
      memo.push({ k: 'Tabela', v: 'Argila saturada: 0,4 a 0,5 | Argila não saturada: 0,1 a 0,3' }, { k: 'Resultado', v: 'Depende do grau de saturação; os dois valores estão abaixo.' });
      return { value: multi([{ label: 'Argila saturada', val: rng(0.4, 0.5, '') }, { label: 'Argila não saturada', val: rng(0.1, 0.3, '') }]), memo };
    },
  });
  add({
    id: 'nu_pag1', params: ['nu'], title: 'Faixas de μ',
    author: 'Tabela da pág. 1', refs: ['PAG1'], where: 'correlacoes.pdf, pág. 1',
    run(c) {
      const v = c.group === 'arenoso' ? rng(0.3, 0.4, '') : rng(0.4, 0.5, '');
      return { value: v, memo: [classLine(c), { k: 'Tabela', v: `${c.groupLabel}: μ = ${fmtVal(v)}` }, { k: 'Resultado', v: `μ = ${fmtVal(v)}` }], warns: [W('print', 'Tabela sem fonte no material.')] };
    },
  });
  add({
    id: 'nu_2024', params: ['nu'], title: 'Faixas de μ',
    author: 'Artigo de 2024, Tabela 1', refs: ['ART2024'], where: 'correlacoes.pdf, pág. 7; mesma tabela na Tab. 3 (UFMG, fls. 47) do capítulo "Parâmetros dos Solos", pág. 83',
    run(c) {
      const v = c.group === 'arenoso' ? rng(0.3, 0.4, '') : rng(0.4, 0.5, '');
      return { value: v, memo: [classLine(c), { k: 'Tabela 1', v: `${c.groupLabel}: μ = ${fmtVal(v)}` }, { k: 'Resultado', v: `μ = ${fmtVal(v)}` }] };
    },
  });
  add({
    id: 'nu_tab57', params: ['nu'], title: 'Coeficiente de Poisson (Tab. 5.7)',
    author: 'Teixeira & Godoy (1996), via TQS', refs: ['TG1996', 'TQS'], where: 'correlacoes.pdf, pág. 16; kvespt.pdf, págs. 9-10',
    run(c) {
      const v = nuTab57(c);
      return { value: pt(v, ''), memo: [classLine(c), { k: 'Tabela 5.7', v: 'Areia (qualquer compacidade): 0,35 | Argila (qualquer consistência): 0,3' }, { k: 'Resultado', v: `ν = ${nm(v, 2)}` }], notes: ['O manual TQS indica a Tab. 5.7 como valores sugeridos por Teixeira & Godoy (1996). A tabela não tem linha para silte; aqui vale o grupo de comportamento (arenoso/argiloso).'] };
    },
  });

  /* ---------- E / Es ---------- */
  add({
    id: 'e_silveira', params: ['E', 'Es'], title: 'E = coeficiente × N',
    author: 'Silveira (Es em Piancastelli, Tab. 2)', refs: ['SILVEIRA', 'PIANCASTELLI'], where: 'Silveira, pág. 1 (item 4.4.1); Piancastelli, págs. 10 e 18 (Tabela 2)',
    run(c) {
      const v = c.soil.es * c.N;
      return { value: pt(v, 'tf/m²'), memo: [{ k: 'Solo', v: `${c.soil.name}: coeficiente = ${c.soil.es}` }, { k: 'Fórmula', v: 'E = coef. × N  (tf/m²)' }, { k: 'Substituição', v: `E = ${c.soil.es} × ${nm(c.N)}` }, { k: 'Resultado', v: `E = ${nm(v)} tf/m²` }], notes: ['A Tabela 2 de Piancastelli (Es) traz os mesmos coeficientes, atribuídos a J.E.S. Silveira.'] };
    },
  });
  add({
    id: 'e_schmertmann', params: ['E', 'Es'], title: 'E = 3·K·SPT',
    author: 'Schmertmann (1978); K de Teixeira (1993)', refs: ['SCHMERTMANN', 'TEIXEIRA1993', 'CINTRA2003', 'TQS'], where: 'correlacoes.pdf, pág. 17 (Tab. 5.8)',
    run(c) {
      const v = 3 * c.soil.K * c.N;
      return { value: pt(v, 'MPa'), memo: [{ k: 'Solo', v: `${c.soil.name}: K = ${nm(c.soil.K, 2)} MPa (Tab. 5.8)` }, { k: 'Fórmula', v: 'E = 3·K·SPT  (MPa)' }, { k: 'Substituição', v: `E = 3 × ${nm(c.soil.K, 2)} × ${nm(c.N)}` }, { k: 'Resultado', v: `E = ${nm(v)} MPa` }] };
    },
  });
  add({
    id: 'e_tg', params: ['E', 'Es'], title: 'E = α·K·SPT',
    author: 'Teixeira & Godoy (1996); α de Trofimenkov (1974)', refs: ['TG1996', 'TROFIMENKOV', 'TEIXEIRA1993', 'CINTRA2003'], where: 'correlacoes.pdf, pág. 18 (Tabs. 5.8 e 5.9)',
    run(c) {
      const v = c.soil.alpha * c.soil.K * c.N;
      return { value: pt(v, 'MPa'), memo: [{ k: 'Solo', v: `${c.soil.name}: K = ${nm(c.soil.K, 2)} MPa (Tab. 5.8); α = ${c.soil.alpha} (Tab. 5.9, ${c.soil.noun})` }, { k: 'Fórmula', v: 'E = α·K·SPT  (MPa)' }, { k: 'Substituição', v: `E = ${c.soil.alpha} × ${nm(c.soil.K, 2)} × ${nm(c.N)}` }, { k: 'Resultado', v: `E = ${nm(v)} MPa` }], notes: ['α da Tab. 5.9: areia 3, silte 5, argila 7. O solo da lista é associado pelo substantivo (por exemplo, silte arenoso → silte, argila siltosa → argila).'] };
    },
  });
  add({
    id: 'e_tab56', params: ['E', 'Es'], title: 'Valores típicos de E (Tab. 5.6)',
    author: 'Teixeira & Godoy (1996); Poulos & Davis (1974); Poulos (1967)', refs: ['TG1996', 'POULOS', 'TQS'], where: 'correlacoes.pdf, pág. 15; kvespt.pdf, págs. 9-10',
    run(c) {
      const cls = E_TAB56[c.group][c.idx];
      const items = [{ label: `Por classe: ${c.clsName}`, val: pt(cls, 'kgf/cm²') }];
      const memo = [classLine(c), { k: 'Tabela 5.6 (por classe)', v: `${c.clsName} = ${cls} kgf/cm²` }];
      if (c.group === 'arenoso') {
        const a = 5 * (c.N + 5), b = 180 + 7.5 * c.N;
        items.push({ label: 'Areia normalmente adensada', val: pt(a, 'kgf/cm²') }, { label: 'Areia sobreadensada', val: pt(b, 'kgf/cm²') });
        memo.push({ k: 'Areia normalmente adensada', v: `E = 5·(SPT + 5) = 5 × (${nm(c.N)} + 5) = ${nm(a)} kgf/cm²` }, { k: 'Areia sobreadensada', v: `E = 180 + (7,5·SPT) = 180 + 7,5 × ${nm(c.N)} = ${nm(b)} kgf/cm²` });
      } else {
        const t = 55.4 + 25.9 * c.N;
        items.push({ label: 'Argila terciária de SP', val: pt(t, 'kgf/cm²') });
        memo.push({ k: 'Argila terciária de SP', v: `E = 55,4 + (25,9·SPT) = 55,4 + 25,9 × ${nm(c.N)} = ${nm(t)} kgf/cm²` });
      }
      const warns = [];
      if (c.group === 'argiloso' && c.N === 2) warns.push(W('print', 'A tabela imprime "Argila mole (SPT 2 a 5)" e "Argila muito mole (SPT ≤ 2)": N = 2 cai nas duas. Aqui vale a NBR 6484 (N ≤ 2 → muito mole).'));
      if (c.group === 'arenoso') warns.push(W('print', 'A tabela imprime "Areia normal adensada: E = 5 (SPT+5)". Mantido como impresso.'));
      return { value: multi(items), memo, warns, notes: ['As fórmulas de areia e de argila terciária valem para essas condições específicas de solo. A unidade impressa no cabeçalho da tabela é kgf/cm².'] };
    },
  });
  add({
    id: 'e_pag1', params: ['E', 'Es'], title: 'Faixas de E (kN/m²)',
    author: 'Tabela da pág. 1', refs: ['PAG1', 'NBR6484'], where: 'correlacoes.pdf, pág. 1',
    run(c) {
      const v = c.group === 'arenoso'
        ? [rng(1000, 5000, 'kN/m²'), rng(5000, 14000, 'kN/m²'), rng(14000, 40000, 'kN/m²'), rng(40000, 70000, 'kN/m²'), gt(70000, 'kN/m²')][c.idx]
        : [rng(300, 1200, 'kN/m²'), rng(1200, 2800, 'kN/m²'), rng(2800, 5000, 'kN/m²'), rng(5000, 15000, 'kN/m²'), gt(15000, 'kN/m²')][c.idx];
      return { value: v, memo: [classLine(c), { k: 'Tabela', v: `${c.clsName}: E = ${fmtVal(v)}` }, { k: 'Resultado', v: `E = ${fmtVal(v)}` }], warns: [W('print', 'Tabela sem fonte no material.')], notes: c.group === 'argiloso' ? ['Nota da tabela: o módulo de elasticidade das argilas é estimado na condição não drenada.'] : [] };
    },
  });
  add({
    id: 'e_2024', params: ['E', 'Es'], title: 'Faixas de E (tf/m²)',
    author: 'Artigo de 2024, Tabela 1', refs: ['ART2024', 'UFMG', 'NBR6484'], where: 'correlacoes.pdf, pág. 7; mesma tabela na Tab. 3 (UFMG, fls. 47) do capítulo "Parâmetros dos Solos", pág. 83',
    run(c) {
      const v = c.group === 'arenoso'
        ? [rng(100, 500, 'tf/m²'), rng(500, 1400, 'tf/m²'), rng(1400, 4000, 'tf/m²'), rng(4000, 7000, 'tf/m²'), gt(7000, 'tf/m²')][c.idx]
        : [rng(30, 120, 'tf/m²'), rng(120, 280, 'tf/m²'), rng(280, 500, 'tf/m²'), rng(500, 1500, 'tf/m²'), gt(1500, 'tf/m²')][c.idx];
      return { value: v, memo: [classLine(c), { k: 'Tabela 1 (uso limitado a estudos preliminares)', v: `${c.clsName}: E = ${fmtVal(v)}` }, { k: 'Resultado', v: `E = ${fmtVal(v)}` }] };
    },
  });

  /* ---------- E0 ---------- */
  add({
    id: 'e0_schultze', params: ['E0'], title: 'E0 = C1 + C2·SPT',
    author: 'Schultze & Menzenbach (1961)', refs: ['SCHULTZE', 'TQS'], where: 'correlacoes.pdf, pág. 22; kvespt.pdf, págs. 21-22 (Tab. 5.12)',
    run(c) {
      const hit = c.soil.key === 'areia' ? 2 : c.soil.key === 'areia_arg' ? 3 : -1;
      const items = E0_TAB512.map((r, i) => ({ label: r[0] + (i === hit ? ' (corresponde ao solo escolhido)' : ''), val: pt(r[1] + r[2] * c.N, 'bar') }));
      const memo = [{ k: 'Fórmula', v: '(E0)i = C1 + C2·SPT  (bar), com C1 e C2 em bar e bar/golpe' }];
      E0_TAB512.forEach((r) => memo.push({ k: r[0], v: `E0 = ${nm(r[1])} + ${nm(r[2])} × ${nm(c.N)} = ${nm(r[1] + r[2] * c.N)} bar` }));
      return { value: multi(items), memo, notes: ['A tabela não associa linhas aos solos da lista. A linha "Areia" é marcada para areia e "Areia argilosa" para areia argilosa; as demais ficam para você escolher conforme o caso.'] };
    },
  });
  add({
    id: 'e0_cestelli', params: ['E0'], title: 'E0 por descrição do solo (Tab. 5.11)',
    author: 'Cestelli Guidi (Moraes, 1981)', refs: ['CESTELLI', 'MORAES', 'TQS'], where: 'correlacoes.pdf, pág. 19; kvespt.pdf, pág. 17',
    run(c) {
      const items = E0_TAB511.map((r) => ({ label: r[0], val: pt(r[1], 'kgf/cm²') }));
      return { value: multi(items), memo: [{ k: 'Tabela 5.11', v: E0_TAB511.map((r) => `${r[0]} = ${r[1]} kgf/cm²`).join('\n') }, { k: 'Observação', v: 'Os valores não dependem do SPT.' }], notes: ['Tabela por descrição do solo, sem relação com N. Os valores servem de entrada para os métodos de Boussinesq e de Rausch & Cestelli Guidi (Kv).'] };
    },
  });

  /* ---------- Kv ---------- */
  const kvPt = (v) => pt(v, 'kgf/cm³');
  const selOpts = (rows, fmt) => rows.map((r, i) => ({ v: String(i), t: fmt(r) }));
  const geoLines = (c) => [{ k: 'Fundação', v: `B = ${nm(c.geo.B)} m; L = ${nm(c.geo.L)} m; A = ${nm(c.geo.A)} m²` }];

  add({
    id: 'kv_piancastelli', params: ['Kv'], title: 'Cr = Es / (B·f)',
    author: 'Piancastelli (2012); f de Sherif; Es de Silveira', refs: ['PIANCASTELLI', 'SHERIF', 'SILVEIRA'], where: 'Piancastelli, págs. 8-18 (Eqs. 1 a 6; Tabelas 1 e 2)',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const { B, L, A } = c.geo;
      const Es = c.Es != null ? c.Es : c.soil.es * c.N;
      const esLine = c.Es != null ? { k: 'Es (informado)', v: `Es = ${nm(Es)} tf/m²` } : { k: 'Es (Tabela 2)', v: `Es = ${c.soil.es} × N = ${c.soil.es} × ${nm(c.N)} = ${nm(Es)} tf/m²  (${c.soil.name})` };
      const cases = [{ Z: c.geo.Z, label: `Z = ${nm(c.geo.Z)} m` }];
      if (c.geo.Z > 2 * B) cases.push({ Z: 2 * B, label: `Z = 2B = ${nm(2 * B)} m` });
      const memo = [...geoLines(c), esLine, { k: 'Fórmula', v: 'Cr = Es / (B·f)   (tf/m³)\nf = (1 − μ²)·I·α, da Tabela 1 (Sherif), interpolada em L/B e Z/B\nk = Cr·A   (tf/m)' }];
      const crs = [];
      const warns = [];
      cases.forEach((cs) => {
        const r = piancastelliCr(Es, B, L, cs.Z);
        crs.push(r.Cr);
        memo.push({ k: `Cálculo (${cs.label})`, v: `L/B = ${nm(L)}/${nm(B)} = ${nm(r.LB, 3)};  Z/B = ${nm(cs.Z)}/${nm(B)} = ${nm(r.ZB, 3)}\nf = ${nm(r.fRaw, 4)} (Tabela 1, interpolação) → ${nm(r.f, 2)} (2 casas, como nos exemplos do autor)\nCr = ${nm(Es)} / (${nm(B)} × ${nm(r.f, 2)}) = ${nm(r.Cr)} tf/m³` });
        r.notes.forEach((n) => { if (!warns.some((w) => w.text === n)) warns.push(W('assume', n)); });
      });
      const lo = Math.min(...crs), hi = Math.max(...crs);
      const kvlo = lo / 1000, kvhi = hi / 1000;
      memo.push({ k: 'Conversão', v: '1 kgf/cm³ = 1000 tf/m³' });
      memo.push({ k: 'Constante de mola', v: crs.map((x) => `k = ${nm(x)} × ${nm(A)} = ${nm(x * A)} tf/m`).join('\n') });
      const notes = [];
      if (cases.length > 1) notes.push('Como Z > 2B, o autor manda calcular um segundo Cr com Z = 2B; o valor inicial a adotar fica entre os dois.');
      const value = cases.length > 1 ? rng(kvlo, kvhi, 'kgf/cm³') : kvPt(kvlo);
      return { value, memo, warns, notes, extra: [{ label: 'Cr (tf/m³)', text: cases.length > 1 ? `${fmtNum(lo)} a ${fmtNum(hi)}` : fmtNum(lo) }, { label: 'k = Cr·A (tf/m)', text: cases.length > 1 ? `${fmtNum(lo * A)} a ${fmtNum(hi * A)}` : fmtNum(lo * A) }] };
    },
  });

  add({
    id: 'kv_beton', params: ['Kv'], title: 'Kv por tipo de solo',
    author: 'Béton-Kalender (1962)', refs: ['BETON', 'MORAES', 'TQS'], where: 'correlacoes.pdf, pág. 11 (Tab. 5.1); kvespt.pdf, págs. 2-3',
    run(c) {
      const select = { key: 'beton', label: 'Descrição do solo', options: selOpts(BETON, (r) => `${r[0]} (${nm(r[1], 1)})`), value: c.sel.beton ?? '' };
      if (select.value === '') return { value: na('Escolha a descrição do solo na lista do cartão.'), select };
      const r = BETON[Number(select.value)];
      return { value: kvPt(r[1]), select, memo: [{ k: 'Tabela 5.1', v: `${r[0]}: Kv = ${nm(r[1], 1)} kgf/cm³` }, { k: 'Resultado', v: `Kv = ${nm(r[1], 1)} kgf/cm³` }], notes: ['Valor tabelado por descrição, sem relação com o SPT.'] };
    },
  });

  function morrisonChain(c, sigKgf, sigMemo, extraWarns, notes) {
    const r = morrisonKv(sigKgf);
    const memo = [...sigMemo];
    memo.push({ k: 'Tabela 5.2.2 (Morrison, 1993)', v: `σ = ${nm(sigKgf, 4)} kgf/cm² → interpolação entre (${nm(r.s0, 2)}; ${nm(r.k0, 2)}) e (${nm(r.s0 + MORRISON_DS, 2)}; ${nm(r.k1, 2)})\nKv = ${nm(r.kv, 3)} kgf/cm³` });
    const warns = [...(extraWarns || [])];
    if (r.extrap) warns.push(W('assume', `σ ${r.extrap === 'abaixo' ? 'abaixo' : 'acima'} da faixa da Tabela 5.2.2 (0,25 a 4,00 kgf/cm²). O manual manda aproximar linearmente fora da tabela, sem dar o critério; aqui se prolonga o segmento extremo da própria tabela.`));
    return { value: kvPt(r.kv), memo, warns, notes: notes || [], extra: [{ label: 'σ adotada (kgf/cm²)', text: nm(sigKgf, 3) }] };
  }
  const MPA_KGF = 1000 / 98.0665; // 1 MPa em kgf/cm²

  add({
    id: 'kv_spt020', params: ['Kv'], title: 'σ = 0,20·SPT → tabela de Morrison',
    author: 'SAFE, Morrison (1993)', refs: ['MORRISON', 'TQS'], where: 'correlacoes.pdf, págs. 5 e 12; kvespt.pdf, págs. 3-5',
    run(c) {
      const sig = 0.2 * c.N;
      return morrisonChain(c, sig, [{ k: 'Tensão admissível', v: `σ = 0,20·SPTmédio (kgf/cm²) = 0,20 × ${nm(c.N)} = ${nm(sig, 3)} kgf/cm²` }], [], ['Para vários SPT dentro do bulbo de pressões, o manual usa a média dos valores; aqui N é o valor informado.']);
    },
  });
  add({
    id: 'kv_alonso', params: ['Kv'], title: 'σadm = N/50 → tabela de Morrison',
    author: 'Alonso (sapatas)', refs: ['ALONSO', 'MORRISON'], where: 'correlacoes.pdf, págs. 4, 9 e 12',
    run(c) {
      const s = c.N / 50, sig = s * MPA_KGF;
      const warns = [];
      if (c.N < 2 || c.N > 20) warns.push(W('range', 'N fora de 2 ≤ N ≤ 20 (faixa do slide). O manuscrito indica 5 < N < 20.'));
      else if (c.N <= 5) warns.push(W('range', 'N dentro da faixa do slide (2 ≤ N ≤ 20), mas fora da faixa do manuscrito (5 < N < 20).'));
      return morrisonChain(c, sig, [{ k: 'Tensão admissível', v: `σadm = NSPT/50 (MPa) = ${nm(c.N)}/50 = ${nm(s, 4)} MPa = ${nm(sig, 4)} kgf/cm²` }], warns, ['O slide traz também σadm = NSPT/30 (MPa) para tubulões; aqui só sapatas.']);
    },
  });
  add({
    id: 'kv_wcosta', params: ['Kv'], title: 'σadm = N/40 ou N/50 → tabela de Morrison',
    author: 'Wilson Costa (Goiânia)', refs: ['WCOSTA', 'MORRISON'], where: 'correlacoes.pdf, págs. 4 e 12',
    run(c) {
      const den = c.soil.noun === 'argila' ? 50 : 40;
      const lbl = c.soil.noun === 'argila' ? 'Argilas' : 'Areias e siltes';
      let s = c.N / den;
      const capped = s > 0.5;
      if (capped) s = 0.5;
      const sig = s * MPA_KGF;
      const warns = [];
      if (capped) warns.push(W('range', 'Limitado a σadm ≤ 500 kPa, conforme a observação do slide.'));
      if (c.soil.key === 'areia_ped') warns.push(W('apply', 'O slide traz N/30 para pedregulhos. "Areia com pedregulhos" foi tratada como areia (N/40).'));
      return morrisonChain(c, sig, [{ k: 'Tensão admissível', v: `${lbl}: σadm = NSPT/${den} (MPa) = ${nm(c.N)}/${den} = ${nm(c.N / den, 4)} MPa${capped ? ' → limitado a 0,5 MPa (500 kPa)' : ''}\nσadm = ${nm(sig, 4)} kgf/cm²` }], warns);
    },
  });
  add({
    id: 'kv_teixeira96', params: ['Kv'], title: 'σ de Teixeira (1996) → tabela de Morrison',
    author: 'Teixeira (1996)', refs: ['TEIXEIRA1996', 'ART2024', 'MORRISON'], where: 'correlacoes.pdf, págs. 7, 9 e 12 (Equação 3)',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const B = c.geo.B;
      const mpa = 0.05 + ((1 + 0.4 * B) * c.N) / 100, sig = mpa * MPA_KGF;
      const warns = [W('print', 'O artigo (2024) chama o resultado de σr e o descreve como capacidade de carga de fundações rasas; o manuscrito o chama de σadm. Aqui foi usado como σadm, como no manuscrito.')];
      if (c.N <= 5 || c.N >= 20) warns.push(W('range', 'N fora de 5 < N < 20 (faixa indicada no manuscrito).'));
      return morrisonChain(c, sig, [{ k: 'Tensão', v: `σ = [0,05 + (1 + 0,4·B)·N/100] × 1000 (kN/m²), B em m\nσ = [0,05 + (1 + 0,4 × ${nm(B)}) × ${nm(c.N)}/100] = ${nm(mpa, 4)} MPa = ${nm(mpa * 1000, 2)} kN/m² = ${nm(sig, 4)} kgf/cm²` }], warns);
    },
  });
  add({
    id: 'kv_mello', params: ['Kv'], title: 'σadm de Mello (1975) → tabela de Morrison',
    author: 'Mello (1975)', refs: ['MELLO1975', 'ART2024', 'MORRISON'], where: 'correlacoes.pdf, págs. 7, 9 e 12 (Equação 4 e manuscrito)',
    run(c) {
      if (c.N < 1) return { value: na('A expressão exige N ≥ 1.') };
      const mpa = 0.1 * (Math.sqrt(c.N) - 1), sig = mpa * MPA_KGF;
      const warns = [];
      if (c.N < 4 || c.N > 16) warns.push(W('range', 'N fora de 4 ≤ N ≤ 16 (faixa indicada pelo artigo).'));
      return morrisonChain(c, sig, [{ k: 'Tensão admissível', v: `σadm = 0,1·(√N − 1)  (MPa)\nσadm = 0,1 × (√${nm(c.N)} − 1) = ${nm(mpa, 4)} MPa = ${nm(mpa * 1000, 2)} kN/m² = ${nm(sig, 4)} kgf/cm²` }], warns, ['Sem distinção do tipo de solo.']);
    },
  });

  add({
    id: 'kv_nbr6122', params: ['Kv'], title: 'σ básica da NBR 6122:1996 → tabela de Morrison',
    author: 'NBR 6122:1996 (Tab. 5.3); Cintra et al. (2003)', refs: ['NBR6122', 'CINTRA2003', 'MORRISON', 'TQS'], where: 'correlacoes.pdf, pág. 13 (Tab. 5.3); kvespt.pdf, págs. 5-7',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const row = (NBR_ROWS[c.soil.noun] || {})[c.idx];
      const memo = [classLine(c)];
      if (!row) return { value: na(`A Tab. 5.3 não tem linha para ${c.soil.noun} ${c.clsName.toLowerCase()}.`), memo };
      const s0 = row[1];
      memo.push({ k: 'Tensão básica (Tab. 5.3)', v: `${row[0]}: σ0 = ${nm(s0, 1)} MPa` });
      let s = s0;
      const { B, A } = c.geo;
      const warns = [W('assume', 'Os valores da Tab. 5.3 valem para uma largura que a legenda do PDF deixa em branco; em outros casos a norma pede correção.')];
      if (c.group === 'arenoso') {
        const apply = !c.sensivel || B < 2;
        if (apply) {
          const f = 1 + (1.5 / 8) * (B - 2);
          const cap = 2.5;
          s = s0 * Math.min(f, cap);
          memo.push({ k: 'Correção (solo granular)', v: `σ0′ = σ0·[1 + (1,5/8)·(B − 2)] ≤ 2,5·σ0, B ≤ 10 m\nσ0′ = ${nm(s0, 1)} × [1 + (1,5/8) × (${nm(B)} − 2)] = ${nm(s, 4)} MPa` });
          if (B > 10) warns.push(W('range', 'B > 10 m: fora da faixa da expressão (B ≤ 10 m).'));
        } else memo.push({ k: 'Correção (solo granular)', v: 'Construção sensível a recalques com B ≥ 2 m: a norma manda verificar os recalques e não corrigir a tensão básica.' });
      } else {
        if (A >= 10) {
          const r = Math.sqrt(10 / A);
          s = Math.max(s0 * r, s0 / 2);
          memo.push({ k: 'Correção (solo argiloso)', v: `σ0′ = σ0·√(10/A), A ≥ 10 m²; se menor que σ0/2, usa-se σ0/2\nσ0′ = ${nm(s0, 1)} × √(10/${nm(A)}) = ${nm(s0 * r, 4)} → adotado ${nm(s, 4)} MPa` });
        } else memo.push({ k: 'Correção (solo argiloso)', v: `A = ${nm(A)} m² < 10 m²: sem redução.` });
      }
      const sig = s * MPA_KGF;
      memo.push({ k: 'Conversão', v: `σ = ${nm(s, 4)} MPa = ${nm(sig, 4)} kgf/cm²` });
      return morrisonChain(c, sig, memo, warns, ['Correções conforme o manual TQS (prescrições especiais para solos granulares e argilosos). Para construções não sensíveis a recalques use a opção em "Dados da fundação".']);
    },
  });

  function terzaghiCorr(kind, k30, Bm) {
    const Bcm = Bm * 100;
    return kind === 'argila' ? (30 / Bcm) * k30 : Math.pow((Bcm + 30) / (2 * Bcm), 2) * k30;
  }
  add({
    id: 'kv_terzaghi', params: ['Kv'], title: 'Kv a partir de k30 (placa de 30 cm)',
    author: 'Terzaghi (1955)', refs: ['TERZAGHI', 'VELLOSO', 'TQS'], where: 'correlacoes.pdf, pág. 14 (Tab. 5.4); kvespt.pdf, pág. 8',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const B = c.geo.B;
      const memo = [classLine(c)];
      let k30, desc, kind;
      if (c.group === 'argiloso') {
        kind = 'argila';
        const t = { 3: ['Rija', 2.4, '1,6 – 3,2'], 4: ['Dura', 9.6, '> 6,4'] }[c.idx];
        if (!t) return { value: na(`A tabela de Terzaghi traz argila rija, muito rija e dura. "${c.clsName}" não tem linha.`), memo };
        [desc, k30] = [t[0], t[1]];
        memo.push({ k: 'Tabela 5.4', v: `Argila ${desc.toLowerCase()}: faixa ${t[2]}; valor proposto k30 = ${nm(k30, 1)} kgf/cm³` });
      } else {
        kind = 'areia';
        const t = { 0: ['Fofa', 1.3, 0.8], 2: ['Med. compacta', 4.2, 2.6], 3: ['Compacta', 16, 9.6] }[c.idx];
        if (!t) return { value: na(`A tabela de Terzaghi traz areia fofa, medianamente compacta e compacta. "${c.clsName}" não tem linha.`), memo };
        desc = t[0];
        k30 = c.na === 'abaixo' ? t[2] : t[1];
        memo.push({ k: 'Tabela 5.4', v: `Areia ${desc.toLowerCase()}: acima do N.A. = ${t[1]}; abaixo do N.A. = ${t[2]} kgf/cm³ → usado "${c.na} do N.A.": k30 = ${nm(k30, 1)} kgf/cm³` });
      }
      const kv = terzaghiCorr(kind, k30, B);
      const Bcm = B * 100;
      memo.push({ k: 'Fórmula', v: kind === 'argila' ? 'Argilas: kv = (30/B)·k30, B em cm' : 'Areias: kv = ((B + 30)/(2·B))²·k30, B em cm' });
      memo.push({ k: 'Substituição', v: kind === 'argila' ? `kv = (30/${nm(Bcm)}) × ${nm(k30, 1)}` : `kv = ((${nm(Bcm)} + 30)/(2 × ${nm(Bcm)}))² × ${nm(k30, 1)}` });
      memo.push({ k: 'Resultado', v: `Kv = ${nm(kv, 3)} kgf/cm³` });
      const notes = ['Silte é tratado pelo grupo de comportamento (arenoso → areia; argiloso → argila).'];
      if (kind === 'argila') notes.push('A tabela tem também "muito rija" (k30 = 4,8; faixa 3,2 – 6,4), sem classe correspondente na NBR 6484:2001.');
      return { value: kvPt(kv), memo, notes };
    },
  });
  add({
    id: 'kv_k30outros', params: ['Kv'], title: 'Kv a partir de k30 por descrição do solo',
    author: 'ACI (1988), Calavera (2000), Bowles (1997)', refs: ['K30', 'TERZAGHI', 'TQS'], where: 'correlacoes.pdf, pág. 14 (Tab. 5.5); kvespt.pdf, págs. 8-9',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const select = { key: 'k30', label: 'Descrição do solo', options: selOpts(K30_OUTROS, (r) => `${r[0]} (k30 = ${nm(r[1], 1)})`), value: c.sel.k30 ?? '' };
      if (select.value === '') return { value: na('Escolha a descrição do solo na lista do cartão.'), select };
      const r = K30_OUTROS[Number(select.value)];
      const B = c.geo.B, Bcm = B * 100;
      const kv = terzaghiCorr('areia', r[1], B);
      return {
        value: kvPt(kv), select,
        memo: [{ k: 'Tabela 5.5', v: `${r[0]}: k30 = ${nm(r[1], 1)} kgf/cm³` }, { k: 'Fórmula', v: 'kv = ((B + 30)/(2·B))²·k30, B em cm (expressão de areias do item 5.3.1)' }, { k: 'Substituição', v: `kv = ((${nm(Bcm)} + 30)/(2 × ${nm(Bcm)}))² × ${nm(r[1], 1)}` }, { k: 'Resultado', v: `Kv = ${nm(kv, 3)} kgf/cm³` }],
        warns: [W('assume', 'O manual manda corrigir conforme as expressões do item 5.3.1 (argila ou areia). Todas as linhas da Tab. 5.5 são granulares ou rocha; foi usada a expressão de areias.')],
      };
    },
  });

  /* elasticidade (Mindlin / Steinbrenner) */
  function kvElastic(c, E, nu, eMemo) {
    if (!(E > 0)) return { kv: NaN, memo: [...eMemo], fail: 'E = 0 (N = 0): recalque infinito, Kv não definido.' };
    const { B, L, Z } = c.geo;
    const full = c.mind === 'full';
    const bcm = (full ? B : B / 2) * 100, Lcm = (full ? L : L / 2) * 100, zcm = Z * 100;
    const r0 = mindlinD(1, bcm, Lcm, 0, E, nu), rz = mindlinD(1, bcm, Lcm, zcm, E, nu);
    const d = r0.d - rz.d, kv = 1 / d;
    const memo = [...geoLines(c), ...eMemo];
    memo.push({ k: 'Fórmula (Poulos & Davis, 1974)', v: 'd = (4·p·b/E)·(1 − ν²)·(A − ((1 − 2ν)/(1 − ν))·B)\nA = 1/(2π)·[ln((√(1+m²+n²) + m)/(√(1+m²+n²) − m)) + m·ln((√(1+m²+n²) + 1)/(√(1+m²+n²) − 1))]\nB = n/(2π)·arctg(m/(n·√(1+m²+n²)));  m = L/b;  n = z/b\nKv = p/d, com p = 1 kgf/cm²' });
    memo.push({ k: 'Geometria da fórmula', v: full ? `b = ${nm(bcm)} cm e L = ${nm(Lcm)} cm (dimensões totais da fundação, como no texto)` : `b = B/2 = ${nm(bcm)} cm e L = L/2 = ${nm(Lcm)} cm (quadrante carregado da Fig. 5.3a)` });
    memo.push({ k: 'Na superfície (z = 0)', v: `m = ${nm(r0.m, 4)}; n = 0; A = ${nm(r0.A, 5)}; B = 0\nd(0) = ${nm(r0.d, 5)} cm` });
    memo.push({ k: `No indeslocável (z = ${nm(Z)} m)`, v: `n = ${nm(rz.n, 4)}; A = ${nm(rz.A, 5)}; B = ${nm(rz.B, 5)}\nd(z) = ${nm(rz.d, 5)} cm` });
    memo.push({ k: 'Recalque (Steinbrenner)', v: `d = d(0) − d(z) = ${nm(r0.d, 5)} − ${nm(rz.d, 5)} = ${nm(d, 5)} cm\nKv = 1/d = 1/${nm(d, 5)} = ${nm(kv, 3)} kgf/cm³` });
    return { kv, memo };
  }
  const steinbrennerWarn = () => W('assume', 'O manual TQS descreve o procedimento de Steinbrenner (Poulos, 1967) no seu item 11, que não está nos PDFs enviados. Foi aplicado o caso de uma camada: recalque = deslocamento em z = 0 menos o deslocamento na cota do indeslocável.');
  const nuPick = (c) => (c.nuUser != null ? { v: c.nuUser, line: `ν = ${nm(c.nuUser, 3)} (informado)` } : { v: nuTab57(c), line: `ν = ${nm(nuTab57(c), 2)} (Tab. 5.7: ${c.group === 'arenoso' ? 'areia' : 'argila'})` });
  const mpaToKgf = (mpa) => mpa * MPA_KGF;

  add({
    id: 'kv_tipico', params: ['Kv'], title: 'Teoria da elasticidade com E típico (Tab. 5.6)',
    author: 'Teixeira & Godoy (1996); Poulos & Davis (1974)', refs: ['TG1996', 'POULOS', 'TQS'], where: 'correlacoes.pdf, págs. 15-16; kvespt.pdf, págs. 9-12',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const nu = nuPick(c);
      const variants = [{ label: `E por classe (${c.clsName})`, E: E_TAB56[c.group][c.idx], txt: `E = ${E_TAB56[c.group][c.idx]} kgf/cm² (Tab. 5.6, ${c.clsName})` }];
      if (c.group === 'arenoso') {
        variants.push({ label: 'Areia normalmente adensada', E: 5 * (c.N + 5), txt: `E = 5·(SPT + 5) = ${nm(5 * (c.N + 5))} kgf/cm²` }, { label: 'Areia sobreadensada', E: 180 + 7.5 * c.N, txt: `E = 180 + (7,5·SPT) = ${nm(180 + 7.5 * c.N)} kgf/cm²` });
      } else variants.push({ label: 'Argila terciária de SP', E: 55.4 + 25.9 * c.N, txt: `E = 55,4 + (25,9·SPT) = ${nm(55.4 + 25.9 * c.N)} kgf/cm²` });
      const items = [], memo = [classLine(c), { k: 'Poisson', v: nu.line }];
      variants.forEach((v) => {
        const r = kvElastic(c, v.E, nu.v, [{ k: v.label, v: v.txt }]);
        items.push({ label: v.label, val: r.fail ? na('Kv não definido (E = 0)') : kvPt(r.kv) });
        memo.push({ k: `— ${v.label}`, v: '' }, ...r.memo.slice(1));
      });
      return { value: multi(items), memo, warns: [steinbrennerWarn()], notes: ['Cada linha usa um dos valores de E da Tab. 5.6. As fórmulas valem para as condições de solo indicadas.'] };
    },
  });
  add({
    id: 'kv_schmertmann', params: ['Kv'], title: 'Teoria da elasticidade com E = 3·K·SPT',
    author: 'Schmertmann (1978); K de Teixeira (1993)', refs: ['SCHMERTMANN', 'TEIXEIRA1993', 'POULOS', 'TQS'], where: 'correlacoes.pdf, pág. 17; kvespt.pdf, págs. 12-13',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const nu = nuPick(c);
      const mpa = 3 * c.soil.K * c.N, E = mpaToKgf(mpa);
      const r = kvElastic(c, E, nu.v, [{ k: 'Módulo E', v: `E = 3·K·SPT = 3 × ${nm(c.soil.K, 2)} × ${nm(c.N)} = ${nm(mpa)} MPa = ${nm(E)} kgf/cm²  (${c.soil.name})` }, { k: 'Poisson', v: nu.line }]);
      if (r.fail) return { value: na(r.fail), memo: r.memo };
      return { value: kvPt(r.kv), memo: r.memo, warns: [steinbrennerWarn(), W('assume', 'O manual não diz de onde vem ν neste método (o quadro-resumo pede que o usuário defina). Foi usado o da Tab. 5.7, ou o valor informado.')] };
    },
  });
  add({
    id: 'kv_tg', params: ['Kv'], title: 'Teoria da elasticidade com E = α·K·SPT',
    author: 'Teixeira & Godoy (1996)', refs: ['TG1996', 'TROFIMENKOV', 'TEIXEIRA1993', 'POULOS', 'TQS'], where: 'correlacoes.pdf, pág. 18; kvespt.pdf, págs. 13',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const nu = nuPick(c);
      const mpa = c.soil.alpha * c.soil.K * c.N, E = mpaToKgf(mpa);
      const r = kvElastic(c, E, nu.v, [{ k: 'Módulo E', v: `E = α·K·SPT = ${c.soil.alpha} × ${nm(c.soil.K, 2)} × ${nm(c.N)} = ${nm(mpa)} MPa = ${nm(E)} kgf/cm²  (${c.soil.name})` }, { k: 'Poisson', v: nu.line }]);
      if (r.fail) return { value: na(r.fail), memo: r.memo };
      return { value: kvPt(r.kv), memo: r.memo, warns: [steinbrennerWarn(), W('assume', 'O manual não diz de onde vem ν neste método (o quadro-resumo pede que o usuário defina). Foi usado o da Tab. 5.7, ou o valor informado.')] };
    },
  });

  function e0Select(c) {
    return { key: 'e0', label: 'E0 (Tab. 5.11)', options: selOpts(E0_TAB511, (r) => `${r[0]} (E0 = ${r[1]} kgf/cm²)`), value: c.sel.e0 ?? '' };
  }
  add({
    id: 'kv_boussinesq', params: ['Kv'], title: 'kv = 2·E0 / (R·π·(1 − ν²))',
    author: 'Boussinesq (placa circular rígida)', refs: ['BOUSSINESQ', 'CESTELLI', 'MORAES', 'TQS'], where: 'correlacoes.pdf, pág. 19; kvespt.pdf, pág. 17',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const select = e0Select(c);
      if (select.value === '') return { value: na('Escolha a descrição do solo (E0) na lista do cartão.'), select };
      const r = E0_TAB511[Number(select.value)];
      const nu = nuPick(c);
      const Rcm = Math.sqrt(c.geo.A / Math.PI) * 100;
      const kv = (2 * r[1]) / (Rcm * Math.PI * (1 - nu.v * nu.v));
      return {
        value: kvPt(kv), select,
        memo: [...geoLines(c), { k: 'E0', v: `${r[0]}: E0 = ${r[1]} kgf/cm² (Tab. 5.11)` }, { k: 'Poisson', v: nu.line }, { k: 'Raio equivalente', v: `R = √(A/π) = √(${nm(c.geo.A)}/π) = ${nm(Rcm / 100, 4)} m = ${nm(Rcm, 2)} cm` }, { k: 'Fórmula', v: 'kv = 2·E0 / (R·π·(1 − ν²))   (kgf/cm³)' }, { k: 'Substituição', v: `kv = 2 × ${r[1]} / (${nm(Rcm, 2)} × π × (1 − ${nm(nu.v, 3)}²))` }, { k: 'Resultado', v: `Kv = ${nm(kv, 3)} kgf/cm³` }],
        warns: [W('assume', 'O texto fala em "raio equivalente" sem dar a expressão. Foi usado o raio do círculo de mesma área.')],
      };
    },
  });
  add({
    id: 'kv_rausch', params: ['Kv'], title: 'kv = E0 / (f·√F)',
    author: 'Rausch & Cestelli Guidi', refs: ['MORAES', 'CESTELLI', 'TQS'], where: 'correlacoes.pdf, pág. 20; kvespt.pdf, pág. 18',
    run(c) {
      const g = needGeo(c); if (g) return { value: g };
      const select = e0Select(c);
      if (select.value === '') return { value: na('Escolha a descrição do solo (E0) na lista do cartão.'), select };
      const r = E0_TAB511[Number(select.value)];
      const e0tf = r[1] * 10; // 1 kgf/cm² = 10 tf/m²
      const kvtf = e0tf / (0.4 * Math.sqrt(c.geo.A));
      return {
        value: pt(kvtf, 'tf/m³'), select,
        memo: [...geoLines(c), { k: 'E0', v: `${r[0]}: E0 = ${r[1]} kgf/cm² = ${nm(e0tf)} tf/m² (Tab. 5.11)` }, { k: 'Fórmula', v: 'kv = E0 / (f·√F)   (tf/m³), com f = 0,4 e F = área da fundação em m²' }, { k: 'Substituição', v: `kv = ${nm(e0tf)} / (0,4 × √${nm(c.geo.A)})` }, { k: 'Resultado', v: `Kv = ${nm(kvtf)} tf/m³ = ${nm(kvtf / 1000, 3)} kgf/cm³` }],
        warns: [W('assume', 'O texto indica "kgf/cm3" na frase e "tf/m³" na fórmula. Foi usado E0 em tf/m² (1 kgf/cm² = 10 tf/m²) para obter tf/m³.')],
      };
    },
  });

  /* ================================================================== */
  /* Novas correlações: imagens enviadas + capítulo "Parâmetros dos Solos" */
  /* Só fórmulas e tabelas numéricas; métodos que dependem de ler gráficos ficam de fora. */
  /* ================================================================== */
  const MARK = '  ← solo/classe escolhido';
  const n60Warn = (c) => (c.n60User ? [] : [W('assume', 'O material não traz a correção de energia (N → N60). Foi usado N60 = N informado. Para outro valor, preencha "N60 informado" em Opções avançadas.')]);
  const n60Entry = (c) => `N60 = ${nm(c.N60)}${c.n60User ? ' (informado)' : ' (= N do SPT)'}`;
  const applyWarn = (c, only) => (only && c.group !== only ? [W('apply', only === 'arenoso' ? 'Correlação indicada para areias; o solo selecionado é argiloso.' : 'Correlação indicada para argilas; o solo selecionado é arenoso.')] : []);

  /** Tabela por faixas de N (ou N60). cfg.rows pode ser função de c. */
  function tableCard(cfg) {
    add({
      id: cfg.id, params: cfg.params, title: cfg.title, author: cfg.author, refs: cfg.refs, where: cfg.where,
      run(c) {
        const nlab = cfg.nLabel || 'N';
        const n = cfg.nOf ? cfg.nOf(c) : c.N;
        const rows = typeof cfg.rows === 'function' ? cfg.rows(c) : cfg.rows;
        const warns = applyWarn(c, cfg.only);
        const memo = [{ k: 'Entrada', v: cfg.nOf ? n60Entry(c) : `N = ${nm(n)}` }];
        if (!rows.length) return { value: na(cfg.noRows(c)), memo, warns };
        const txtOf = (r) => fmtVal(cfg.valOf(r, c));
        memo.push({ k: cfg.tableName || 'Tabela', v: rows.map((r) => `${r.lab} (${nlab} ${showRange(r.n)}): ${cfg.show ? cfg.show(r, c) : txtOf(r)}`).join('\n') });
        const m = matchRows(n, rows);
        if (cfg.nOf) warns.push(...n60Warn(c));
        if (m.rounded != null) warns.push(W('assume', `${nlab} = ${nm(n)} não é inteiro e cai entre faixas impressas (as faixas são de números inteiros). Foi usado ${nlab} = ${m.rounded}.`));
        if (m.hits.length > 1) warns.push(W('print', `${nlab} = ${nm(n)} está no limite de ${m.hits.length} faixas impressas (${m.hits.map((h) => showRange(h.n)).join(' e ')}). Todas são mostradas.`));
        if (cfg.warns) warns.push(...cfg.warns(c, m));
        let value, extra;
        if (!m.hits.length) {
          value = na(`${nlab} = ${nm(n)} fora das faixas impressas.`);
          memo.push({ k: 'Resultado', v: value.msg });
        } else {
          const ex = (h) => (cfg.extra ? cfg.extra(h, c) : []);
          if (m.hits.length === 1) {
            const h = m.hits[0];
            value = cfg.valOf(h, c);
            extra = [{ label: 'Linha da tabela', text: `${h.lab} (${nlab} ${showRange(h.n)})` }, ...ex(h)];
          } else value = multi(m.hits.map((h) => ({ label: `${h.lab} (${showRange(h.n)})`, val: cfg.valOf(h, c) })));
          memo.push({ k: 'Resultado', v: m.hits.map((h) => `${h.lab}: ${cfg.show ? cfg.show(h, c) : txtOf(h)}`).join('\n') });
          if (m.hits.length > 1) m.hits.forEach((h) => ex(h).forEach((e) => memo.push({ k: `${h.lab} · ${e.label}`, v: e.text })));
        }
        return { value, memo, warns, notes: cfg.notes || [], extra };
      },
    });
  }
  /** Lista de linhas/fórmulas mostradas juntas. cfg.items(c) → [{label, val, line, mark}] */
  function listCard(cfg) {
    add({
      id: cfg.id, params: cfg.params, title: cfg.title, author: cfg.author, refs: cfg.refs, where: cfg.where,
      run(c) {
        const items = cfg.items(c);
        const memo = cfg.pre ? cfg.pre(c) : [];
        if (cfg.formula) memo.push({ k: 'Fórmula', v: cfg.formula });
        items.forEach((i) => memo.push({ k: i.label, v: i.line || fmtVal(i.val) }));
        return {
          value: multi(items.map((i) => ({ label: i.label + (i.mark ? MARK : ''), val: i.val }))),
          memo, warns: [...(cfg.warns ? cfg.warns(c) : []), ...(cfg.only ? applyWarn(c, cfg.only) : [])], notes: cfg.notes || [],
        };
      },
    });
  }

  /* ---------- γ ---------- */
  const JOP = [
    { name: 'Areia pouco siltosa / pouco argilosa', soils: ['areia_silt', 'areia_arg'], rows: [['0-4', '2000-5000', 1.7, 1.8, 25, '–'], ['5-8', '4000-8000', 1.8, 1.9, 30, '–'], ['9-18', '5000-10000', 1.9, 2.0, 32, '–'], ['19-41', '8000-15000', 2.0, 2.1, 35, '–'], ['≥41', '16000-20000', 2.0, 2.1, 38, '–']] },
    { name: 'Areia média e fina muito argilosa', soils: ['areia_arg'], rows: [['0-4', 2000, 1.7, 1.8, 25, 0], ['5-8', 4000, 1.8, 1.9, 28, 0.5], ['9-18', 5000, 1.9, 2.0, 30, 0.75], ['19-41', 10000, 2.0, 2.1, 32, 1.0]] },
    { name: 'Argila porosa vermelha e amarela', soils: [], rows: [['0-2', '200-500', 1.5, 1.7, 20, 0.75], ['3-5', '500-1000', 1.6, 1.7, 23, 1.5], ['6-10', '1000-2000', 1.7, 1.8, 25, 3.0], ['≥10', '2000-3000', 1.8, 1.9, 25, '3.0-7.0']] },
    { name: 'Argila siltosa pouco arenosa (terciário)', soils: ['argila_silt'], rows: [['0-2', 100, 1.7, 1.8, 20, 0.75], ['3-5', '100-250', 1.8, 1.9, 23, 1.5], ['6-10', '250-500', 1.9, 1.9, 24, 2.0], ['11-19', '500-1000', 1.9, 1.9, 24, 3.0], ['20-30', '3000-10000', 2.0, 2.0, 25, 4.0], ['≥30', '10000-15000', 2.0, 2.0, 25, 5.0]] },
    { name: 'Argila arenosa pouco siltosa', soils: ['argila_aren'], rows: [['0-2', 500, 1.5, 1.7, 15, 1.0], ['3-5', '500-1500', 1.7, 1.8, 15, 2.0], ['6-10', '1500-2000', 1.8, 1.9, 18, 3.5], ['11-19', '2000-3500', 1.9, 1.9, 20, 5.0], ['≥20', '3500-5000', 2.0, 2.0, 25, 6.5]] },
    { name: 'Turfa / argila orgânica (quaternário)', soils: [], rows: [['0-1', '40-100', 1.1, 1.1, 15, 0.5], ['2-5', '100-150', 1.2, 1.2, 15, 1.0]] },
    { name: 'Silte arenoso pouco argiloso (residual)', soils: ['silte_aren'], rows: [['5-8', 8000, 1.8, 1.9, 25, 1.5], ['9-18', 1000, 1.9, 2.0, 26, 2.0], ['19-41', 15000, 2.0, 2.0, 27, 3.0], ['≥41', 20000, 2.1, 2.1, 28, 5.0]] },
  ];
  function joppertCard(param, id, title, pick) {
    add({
      id, params: param === 'E' ? ['E', 'Es'] : [param], title, author: 'Joppert Jr. (Tab. 13)', refs: ['JOPPERT'], where: 'imagem enviada: Tabela nº 13, pág. 99 de "Fundações e contenções de edifícios"',
      run(c) {
        const select = { key: 'jop', label: 'Tipo de solo (Tab. 13)', empty: 'Todos os tipos de solo', options: JOP.map((g, i) => ({ v: String(i), t: g.name })), value: c.sel.jop ?? '' };
        const groups = select.value === '' ? JOP : [JOP[Number(select.value)]];
        const items = [], memo = [{ k: 'Entrada', v: `Faixa de SPT: N = ${nm(c.N)}` }], warns = [];
        let rounded = false, shared = false;
        groups.forEach((g) => {
          const mark = g.soils.includes(c.soil.key) ? MARK : '';
          const rows = g.rows.map((r) => ({ n: r[0], r }));
          const fmtPick = (r) => pick(r).map(([s, v]) => `${s ? s + ': ' : ''}${fmtVal(v)}`).join('; ');
          memo.push({ k: g.name, v: rows.map((x) => `SPT ${showRange(x.n)}: ${fmtPick(x.r)}`).join('\n') });
          const m = matchRows(c.N, rows);
          if (m.rounded != null) rounded = true;
          if (m.hits.length > 1) shared = true;
          if (!m.hits.length) { items.push({ label: g.name + mark, val: na('N fora das faixas desta linha.') }); return; }
          m.hits.forEach((h) => {
            pick(h.r).forEach(([s, v]) => items.push({ label: `${g.name} · SPT ${showRange(h.n)}${s ? ' · ' + s : ''}${mark}`, val: v }));
            if (param === 'E' && g.name.startsWith('Silte arenoso') && h.n === '9-18') warns.push(W('print', 'Na linha "Silte arenoso, 9 - 18" o E está impresso como "1000", entre 8000 e 15000 nas linhas vizinhas. Mantido como impresso.'));
          });
        });
        if (rounded) warns.push(W('assume', `N = ${nm(c.N)} não é inteiro e cai entre faixas impressas. Para as linhas afetadas foi usado o inteiro mais próximo.`));
        if (shared) warns.push(W('print', 'Há N que está no limite de duas faixas impressas (por exemplo 41 em "19 - 41" e "≥ 41"). As duas linhas são mostradas.'));
        memo.push({ k: 'Resultado', v: items.map((i) => `${i.label.replace(MARK, '')}: ${fmtVal(i.val)}`).join('\n') });
        return { value: multi(items), memo, warns, select, notes: ['Tabela de parâmetros médios por tipo de solo e faixa de SPT. A tabela não diz como associar os seus tipos de solo aos da lista; use o seletor do cartão para ver só um deles.'] };
      },
    });
  }
  joppertCard('gamma', 'gamma_joppert', 'Peso específico por tipo de solo e SPT', (r) => [['natural', pt(r[2], 'tf/m³')], ['saturado', pt(r[3], 'tf/m³')]]);

  const BOWLES_SAND = [
    { lab: 'Muito fofa', n: '[0,4)', dr: '0', phi: '25-30', g: '1.12-1.60' }, { lab: 'Fofa', n: '[4,10)', dr: '0.15', phi: '27-32', g: '1.44-1.76' },
    { lab: 'Média', n: '[10,30)', dr: '0.35', phi: '30-35', g: '1.76-2.08' }, { lab: 'Compacta', n: '[30,50)', dr: '0.65', phi: '35-40', g: '1.76-2.24' },
    { lab: 'Muito compacta', n: '[50,inf)', dr: '0.85-1.0', phi: '38-43', g: '2.24-2.40' },
  ];
  const BOWLES_CLAY = [
    { lab: 'Muito mole', n: '[0,2)', qu: '0', g: '–' }, { lab: 'Mole', n: '[2,4)', qu: '0.25', g: '1.60-1.92' }, { lab: 'Média', n: '[4,8)', qu: '0.5', g: '1.76-2.08' },
    { lab: 'Rija', n: '[8,16)', qu: '1.0', g: '–' }, { lab: 'Muito rija', n: '[16,30)', qu: '2.0', g: '1.92-2.24' }, { lab: 'Dura', n: '[30,inf)', qu: '4.0', g: '–' },
  ];
  const bowlesPrem = () => W('assume', 'A tabela imprime um único SPT por classe (areias: 0, 4, 10, 30, 50; argilas: 0, 2, 4, 8, 16, 30). Foi tomado como o início da faixa de cada classe.');
  tableCard({
    id: 'gamma_bowles', params: ['gamma'], title: 'Peso específico por compacidade/consistência (tf/m³)', author: 'Bowles (1997), Tab. 4', refs: ['BOWLES1997T4', 'PARAMSOLOS'],
    where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 83 (Tab. 4)', tableName: 'Tab. 4 (Bowles, 1997)',
    rows: (c) => (c.group === 'arenoso' ? BOWLES_SAND : BOWLES_CLAY),
    valOf: (r) => pv(r.g, 'tf/m³'),
    show: (r) => `γ = ${fmtVal(pv(r.g, 'tf/m³'))}${r.dr != null ? `; Dr = ${r.dr.replace('.', ',')}` : `; qu = ${r.qu.replace('.', ',')} (unidade não impressa)`}`,
    extra: (r) => (r.dr != null ? [{ label: 'Densidade relativa (impressa)', text: r.dr.replace('.', ',') }] : [{ label: 'qu (impresso, sem unidade)', text: r.qu.replace('.', ',') }]),
    warns: () => [bowlesPrem(), W('print', 'Na tabela de argilas o γ só está impresso para mole, média e muito rija; nas outras classes a célula está em branco.')],
  });

  /* ---------- φ ---------- */
  add({
    id: 'phi_hatanaka', params: ['phi'], title: 'φ = 20° + √(15,4·N60)',
    author: 'Hatanaka & Uchida (1996)', refs: ['HATANAKA', 'SCHNAID2012'], where: 'imagem enviada: item 2.8, Eq. (3)',
    run(c) {
      const r = Math.sqrt(15.4 * c.N60), v = 20 + r;
      return {
        value: pt(v, '°'),
        memo: [{ k: 'Entrada', v: n60Entry(c) }, { k: 'Fórmula', v: 'φ = 20° + √(15,4·N60)' }, { k: 'Substituição', v: `φ = 20° + √(15,4 × ${nm(c.N60)}) = 20° + ${nm(r)}°` }, { k: 'Resultado', v: `φ = ${nm(v)}°` }],
        warns: [...granularWarn(c), ...n60Warn(c)],
        notes: ['N60 é o índice de resistência à penetração com 60% da eficiência mecânica padronizada internacionalmente.'],
      };
    },
  });
  add({
    id: 'phi_teixeira24', params: ['phi'], title: 'φ = 15° + √(24·N_SPT)',
    author: 'Teixeira (1996), como em Schnaid & Odebrecht (2012)', refs: ['SCHNAID2012', 'TEIXEIRA1996'], where: 'imagem enviada: item 2.8, Eq. (4)',
    run(c) {
      const r = Math.sqrt(24 * c.N), v = 15 + r;
      return {
        value: pt(v, '°'),
        memo: [{ k: 'Fórmula', v: 'φ = 15° + √(24·N_SPT)' }, { k: 'Substituição', v: `φ = 15° + √(24 × ${nm(c.N)}) = 15° + ${nm(r)}°` }, { k: 'Resultado', v: `φ = ${nm(v)}°` }],
        warns: [...granularWarn(c), W('print', 'Esta expressão de Teixeira (1996) traz 24 sob a raiz. Em Cintra (2011) e em Silveira a mesma autoria aparece com √(20·N) + 15°. Os dois cartões ficam como impressos.')],
      };
    },
  });
  const USACE = { 40: [34, 36, 36, 38, 38, 41], 60: [36, 38, 38, 41, 41, 43], 80: [39, 41, 41, 43, 43, 44], 100: [42, 43, 43, 44, 44, 46] };
  const USACE_COLS = ['Areias finas · uniformes', 'Areias finas · bem graduadas', 'Areias médias · uniformes', 'Areias médias · bem graduadas', 'Areias grossas · uniformes', 'Areias grossas · bem graduadas'];
  add({
    id: 'phi_usace', params: ['phi'], title: "φ′ de areias de quartzo em função de ID (Tab. 2.18)",
    author: 'US Army Corps of Engineers (1993)', refs: ['USACE1993'], where: 'imagem enviada: Tabela 2.18',
    run(c) {
      const select = { key: 'usace', label: 'Densidade relativa ID (%)', options: Object.keys(USACE).map((k) => ({ v: k, t: `ID = ${k}%` })), value: c.sel.usace ?? '' };
      const memo = [{ k: 'Tabela 2.18', v: Object.keys(USACE).map((k) => `ID = ${k}%: ${USACE[k].join(' | ')}°`).join('\n') + '\n(colunas: finas unif. | finas bem grad. | médias unif. | médias bem grad. | grossas unif. | grossas bem grad.)' }];
      const warns = applyWarn(c, 'arenoso');
      if (select.value === '') return { value: na('Escolha o ID (%) na lista do cartão.'), select, memo, warns, notes: ['A tabela relaciona φ′ com a densidade relativa ID, e não com o N do SPT; por isso o ID é escolhido no cartão.'] };
      const row = USACE[select.value];
      memo.push({ k: 'Resultado', v: USACE_COLS.map((l, i) => `${l}: φ′ = ${row[i]}°`).join('\n') });
      return { value: multi(USACE_COLS.map((l, i) => ({ label: l, val: pt(row[i], '°') }))), select, memo, warns, notes: ['A tabela relaciona φ′ com a densidade relativa ID, e não com o N do SPT; por isso o ID é escolhido no cartão.'] };
    },
  });
  tableCard({
    id: 'phi_alonso1943', params: ['phi'], title: 'φ de areias por N (Tabela 2)', author: 'Alonso (1943)', refs: ['ALONSO1943'], where: 'imagem enviada: item 2.9.2, Tabela 2',
    only: 'arenoso', tableName: 'Tabela 2 (Alonso, 1943)', span: '',
    rows: [{ lab: 'Fofa', n: '<4', v: '<30' }, { lab: 'Pouco compacta', n: '4-10', v: '30-35' }, { lab: 'Medianamente compacta', n: '10-30', v: '35-40' }, { lab: 'Compacta', n: '30-50', v: '40-45' }, { lab: 'Muito compacta', n: '>50', v: '>45' }],
    valOf: (r) => pv(r.v, '°'),
  });
  tableCard({
    id: 'phi_bowles', params: ['phi'], title: 'φ de areias por compacidade (Tab. 4)', author: 'Bowles (1997), Tab. 4', refs: ['BOWLES1997T4', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 83 (Tab. 4)',
    tableName: 'Tab. 4 (Bowles, 1997)',
    rows: (c) => (c.group === 'arenoso' ? BOWLES_SAND : []), noRows: () => 'A tabela de Bowles traz φ só para areias; para solos argilosos não há linha de φ.',
    valOf: (r) => pv(r.phi, '°'), show: (r) => `φ = ${r.phi.replace('-', ' a ')}°; Dr = ${r.dr.replace('.', ',')}`,
    extra: (r) => [{ label: 'Densidade relativa (impressa)', text: r.dr.replace('.', ',') }],
    warns: () => [bowlesPrem()],
  });
  joppertCard('phi', 'phi_joppert', 'φ efetivo por tipo de solo e SPT', (r) => [['', pt(r[4], '°')]]);
  tableCard({
    id: 'phi_paramsolos_tab2', params: ['phi'], title: 'φ por compacidade (Tab. 2, coluna φ)', author: 'Cap. 3, Tab. 2', refs: ['PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 82 (Tab. 2)',
    only: 'arenoso', tableName: 'Tab. 2 – areias (uso limitado a estudos preliminares)',
    rows: [{ lab: 'Muito fofa', n: '<4', v: '<0.1' }, { lab: 'Fofa', n: '4-10', v: '0.1-0.25' }, { lab: 'Média', n: '10-30', v: '0.25-0.5' }, { lab: 'Compacta', n: '30-50', v: '0.5-1.0' }, { lab: 'Muito compacta', n: '>50', v: '1.0-2.0' }],
    valOf: (r) => pv(r.v, '°'),
    warns: () => [W('print', 'Os números impressos na coluna "Ângulo de Atrito (φ)" são idênticos aos da coluna Su (kgf/cm²) das argilas e não são ângulos plausíveis. Mantidos exatamente como impressos, sem interpretação; use com cautela.')],
  });
  /* φ de areias, Moraes (1978) */
  const MORAES_PHI = { Fofa: [27, 28, 29, 33, 34], Intermediária: [30, 34, 33, 38, '37-39'], Compacta: [33, 36, 36, 44, '40-45'] };
  const MORAES_COLS = ['Fina · grãos esféricos', 'Fina · grãos angulares', 'Média e grossa · esféricos', 'Média e grossa · angulares', 'Com pedregulho'];
  add({
    id: 'phi_moraes1978', params: ['phi'], title: 'φ de areias por compacidade e granulometria', author: 'Moraes (1978)', refs: ['MORAES1978', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 87',
    run(c) {
      const names = Object.keys(MORAES_PHI);
      const select = { key: 'moraesphi', label: 'Compacidade (tabela de Moraes)', options: names.map((n, i) => ({ v: String(i), t: n })), value: c.sel.moraesphi ?? '' };
      const memo = [{ k: 'Tabela (uso limitado a estudos preliminares)', v: names.map((n) => `${n}: ${MORAES_PHI[n].join(' | ')}°`).join('\n') + '\n(colunas: fina esf. | fina ang. | média e grossa esf. | média e grossa ang. | com pedregulho)' }];
      const warns = applyWarn(c, 'arenoso');
      let i = select.value === '' ? -1 : Number(select.value);
      if (i < 0 && c.group === 'arenoso') {
        i = c.idx === 0 ? 0 : c.idx <= 2 ? 1 : 2;
        warns.push(W('assume', 'A tabela usa três compacidades (fofa, intermediária, compacta) sem dar limites de N. Foi associado: fofa → Fofa; pouco e medianamente compacta → Intermediária; compacta e muito compacta → Compacta. Troque no seletor se preferir.'));
        memo.push({ k: 'Classificação', v: `${c.clsName} (NBR 6484:2001) → ${names[i]}` });
      }
      if (i < 0) return { value: na('Escolha a compacidade na lista do cartão.'), select, memo, warns };
      const row = MORAES_PHI[names[i]];
      memo.push({ k: 'Resultado', v: MORAES_COLS.map((l, k) => `${l}: φ = ${fmtVal(pv(row[k], '°'))}`).join('\n') });
      return { value: multi(MORAES_COLS.map((l, k) => ({ label: l, val: pv(row[k], '°') }))), select, memo, warns };
    },
  });

  /* ---------- c / Cu ---------- */
  const CL_ALONSO = (n5) => [
    { lab: 'Muito mole', n: '<2', v: '<10' }, { lab: 'Mole', n: '2-4', v: '10-25' }, { lab: 'Média', n: n5 ? '5-8' : '4-8', v: '25-50' },
    { lab: 'Rija', n: n5 ? '9-15' : '8-15', v: '50-100' }, { lab: 'Muito rija', n: n5 ? '15-30' : '15-30', v: '100-200' }, { lab: 'Dura', n: '>30', v: '>200' },
  ];
  tableCard({
    id: 'c_alonso1943', params: ['c', 'cu'], title: 'Coesão de argilas por N (Tabela 1)', author: 'Alonso (1943)', refs: ['ALONSO1943'], where: 'imagem enviada: item 2.9.2, Tabela 1',
    only: 'argiloso', tableName: 'Tabela 1 (Alonso, 1943)', rows: CL_ALONSO(false), valOf: (r) => pv(r.v, 'kPa'),
  });
  tableCard({
    id: 'c_alonso2010', params: ['c', 'cu'], title: 'Coesão das argilas por N (Tabela 4)', author: 'Alonso (2010)', refs: ['ALONSO2010'], where: 'imagem enviada: Tabela 4',
    only: 'argiloso', tableName: 'Tabela 4 (Alonso, 2010)', rows: CL_ALONSO(true), valOf: (r) => pv(r.v, 'kPa'),
    warns: () => [W('print', 'As faixas impressas ("2 – 4", "5 – 8", "9 – 15") deixam N = 4,5 e 8,5 sem linha; para N não inteiro vale o inteiro mais próximo. A Tabela 1 de Alonso (1943) imprime 4 a 8 e 8 a 15.')],
  });
  tableCard({
    id: 'cu_look2007', params: ['cu', 'c'], title: 'Su por N60 (Tabela 3)', author: 'Look (2007)', refs: ['LOOK2007'], where: 'imagem enviada: Tabela 3',
    only: 'argiloso', nOf: (c) => c.N60, nLabel: 'N60', tableName: 'Tabela 3 (Look, 2007)',
    rows: [{ lab: 'Muito mole', n: '<2', v: '0-12' }, { lab: 'Mole', n: '2-5', v: '12-25' }, { lab: 'Média', n: '5-10', v: '25-50' }, { lab: 'Rija', n: '10-20', v: '50-100' }, { lab: 'Muito rija', n: '20-40', v: '100-200' }, { lab: 'Dura', n: '>40', v: '>200' }],
    valOf: (r) => pv(r.v, 'kPa'),
    extra: (h, c) => [{ label: 'Consistência de Clayton et al. (1995)', text: c.clayton.join(' ou ') || '—' }],
    notes: ['Look (2007) indica que k, da expressão Su = k·N, não é constante e criou esta tabela, que dá um intervalo de coesão não drenada.'],
  });
  add({
    id: 'cu_bowles1997', params: ['cu', 'c'], title: 'Su = k·N60', author: 'Bowles (1997); k de Mello (1971)', refs: ['BOWLES1997SU'], where: 'imagem enviada: item 2.9.7, Eq. (8)',
    run(c) {
      const n = c.N60, v = 12 * n, lo = 0.4 * n, hi = 20 * n;
      return {
        value: multi([{ label: 'Bowles (1997): k = 12', val: pt(v, 'kPa') }, { label: 'Mello (1971): k de 0,4 a 20', val: rng(lo, hi, 'kPa') }]),
        memo: [{ k: 'Entrada', v: n60Entry(c) }, { k: 'Fórmula', v: 'Su = k·N_SPT,60' }, { k: 'Bowles (1997)', v: `k = 12:  Su = 12 × ${nm(n)} = ${nm(v)}` }, { k: 'Mello (1971)', v: `k de 0,4 a 20:  Su = ${nm(lo)} a ${nm(hi)}` }],
        warns: [...clayWarn(c), ...n60Warn(c), W('assume', 'A fonte não informa a unidade de k nem de Su. Foi tomado kPa.')],
        notes: ['k é um coeficiente empírico obtido de estudos de laboratório com ensaios de campo. Mello (1971) indica que k varia de 0,4 a 20; Bowles (1997) indica k = 12.'],
      };
    },
  });
  add({
    id: 'c_berbearian', params: ['c', 'cu'], title: 'c = N / 0,35', author: 'Berbearian (2015)', refs: ['BERBEARIAN'], where: 'imagem enviada: Eq. (2)',
    run(c) {
      const v = c.N / 0.35;
      return { value: pt(v, 'kPa'), memo: [{ k: 'Fórmula', v: 'c = N / 0,35  (kPa)' }, { k: 'Substituição', v: `c = ${nm(c.N)} / 0,35` }, { k: 'Resultado', v: `c = ${nm(v)} kPa` }], warns: clayWarn(c) };
    },
  });
  tableCard({
    id: 'c_moraes1978', params: ['c', 'cu'], title: 'Consistência × N × compressão simples e coesão', author: 'Terzaghi & Peck, segundo Moraes (1978)', refs: ['MORAES1978', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, págs. 86 e 87',
    only: 'argiloso', tableName: 'Tabelas de Moraes (1978), kgf/cm²',
    rows: [
      { lab: 'Muito mole', n: '≤2', q1: '0.25', q2: '0-0.25', v: '0-0.12' }, { lab: 'Mole', n: '2-4', q1: '0.25-0.50', q2: '0.25-0.50', v: '0.13-0.25' },
      { lab: 'Média', n: '4-8', q1: '0.50-1.00', q2: '0.50-1.00', v: '0.25-0.50' }, { lab: 'Rija', n: '8-15', q1: '1.00-2.00', q2: '1.00-2.00', v: '0.50-1.00' },
      { lab: 'Muito rija', n: '15-30', q1: '2.00-4.00', q2: '2.00-4.00', v: '1.00-2.00' }, { lab: 'Dura', n: '>30', q1: '4.00-8.00', q2: '>4.00', v: '>2.00' },
    ],
    valOf: (r) => pv(r.v, 'kgf/cm²'),
    show: (r) => `c = ${fmtVal(pv(r.v, 'kgf/cm²'))}; qu = ${r.q1.replace('.', ',')} (pág. 86) / ${r.q2.replace('.', ',')} (pág. 87)`,
    extra: (r) => [{ label: 'qu, compressão simples (pág. 86)', text: r.q1.replace(/\./g, ',') + ' kgf/cm²' }, { label: 'qu, compressão simples (pág. 87)', text: r.q2.replace(/\./g, ',').replace('>', '> ') + ' kgf/cm²' }],
    warns: (c, m) => {
      const w = [];
      if (m.hits.some((h) => h.lab === 'Muito mole')) w.push(W('assume', 'A pág. 86 imprime apenas "2" como N do muito mole. Foi tomado como N ≤ 2 (a Tab. 2 do mesmo capítulo imprime ≤ 2).'));
      if (m.hits.some((h) => h.lab === 'Dura')) w.push(W('print', 'Para argila dura a pág. 86 imprime qu de 4,00 a 8,00 e a pág. 87 imprime "> 4,00". Os dois são mostrados como impressos.'));
      return w;
    },
    notes: ['A coesão vem da tabela da pág. 87, associada à consistência da tabela de N da pág. 86 (mesmos nomes de classe).'],
  });
  tableCard({
    id: 'cu_paramsolos_tab2', params: ['cu', 'c'], title: 'Su por N (Tab. 2, kgf/cm²)', author: 'Cap. 3, Tab. 2', refs: ['PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 82 (Tab. 2)',
    only: 'argiloso', tableName: 'Tab. 2 – argilas (uso limitado a estudos preliminares)',
    rows: [{ lab: 'Muito mole', n: '≤2', v: '<0.1' }, { lab: 'Mole', n: '2-4', v: '0.1-0.25' }, { lab: 'Média', n: '4-8', v: '0.25-0.5' }, { lab: 'Rija', n: '8-15', v: '0.5-1.0' }, { lab: 'Muito rija', n: '15-30', v: '1.0-2.0' }, { lab: 'Dura', n: '≥30', v: '>2.0' }],
    valOf: (r) => pv(r.v, 'kgf/cm²'),
    notes: ['Obs. da tabela: IC = (LL − w)/(LL − LP); GC = (e_máx − e_nat)/(e_máx − e_mín) = compacidade relativa (Dr).'],
  });
  const SIMONS = [
    { lab: 'Muito rija', crit: 'Quebradiça ou muito dura', v: '>150' }, { lab: 'Rija', crit: 'Não pode ser moldada com os dedos', v: '75-150' },
    { lab: 'Média', crit: 'Pode ser moldada com os dedos, fazendo-se a força', v: '40-75' }, { lab: 'Mole', crit: 'Facilmente moldável com os dedos', v: '20-40' },
    { lab: 'Muito mole', crit: 'Flui entre os dedos quando espremida', v: '<20' },
  ];
  listCard({
    id: 'cu_simons', params: ['cu', 'c'], title: 'Su por consistência verificada no campo (Tab. 5)', author: 'Simons', refs: ['SIMONS', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 84 (Tab. 5)',
    only: 'argiloso',
    items: (c) => {
      const cls = c.group === 'argiloso' ? ['Muito mole', 'Mole', 'Média', 'Rija', 'Muito rija'][c.idx] : null; // "Dura" (NBR) ↔ "Muito rija" (Simons)
      return SIMONS.map((r) => ({ label: r.lab, val: pv(r.v, 'kN/m²'), line: `${r.crit}: Su = ${fmtVal(pv(r.v, 'kN/m²'))}`, mark: cls === r.lab }));
    },
    pre: (c) => [{ k: 'Entrada', v: 'A tabela não depende do N: a consistência vem da verificação no campo (critério da 2ª coluna).' }],
    warns: (c) => (c.group === 'argiloso' && c.idx === 4 ? [W('assume', 'A NBR 6484 chama a classe mais consistente de "dura"; Simons chama de "muito rija". A correspondência marcada é uma suposição.')] : []),
    notes: ['Marcação: a classe da NBR 6484 correspondente ao N informado, só como sugestão. A tabela é de verificação de campo, não de SPT.'],
  });
  const TP_ALPHA = [['α = 27 (argilas de baixa plasticidade e siltes argilosos)', 27, ['silte_arg']], ['α = 13 (argilas medianamente plásticas)', 13, []], ['α = 8 (argilas altamente plásticas)', 8, []], ['α ≈ 15 (Terzaghi e Peck, 1948)', 15, []]];
  const TFT2 = 'Conversão do item 3.3 do material: 1 t/ft² = 107,3 kN/m².';
  const tftWarn = () => W('assume', 'O texto usa "tsf", "t/ft²" e "tf/ft²" para a mesma grandeza e imprime 1 t/ft² = 107,3 kN/m² (item 3.3). Foi usada essa conversão para as outras unidades.');
  listCard({
    id: 'c_tp_alpha', params: ['c', 'cu'], title: 'c ≅ N / α (em tsf)', author: 'Terzaghi & Peck (1948) e outros', refs: ['PARAMSOLOS', 'TP1948'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 77',
    only: 'argiloso', formula: 'c ≅ N/α  (tsf); c = metade da resistência à compressão simples',
    items: (c) => TP_ALPHA.map((a) => ({ label: a[0], val: pt(c.N / a[1], 't/ft²'), line: `c = ${nm(c.N)}/${a[1]} = ${nm(c.N / a[1])} t/ft²`, mark: a[2].includes(c.soil.key) })),
    pre: () => [{ k: 'Conversão', v: TFT2 }],
    warns: () => [tftWarn()],
    notes: ['O texto diz que α assume valores da ordem de 27 para argilas de baixa plasticidade e siltes argilosos, 13 para argilas medianamente plásticas e 8 para argilas altamente plásticas; a plasticidade não está na lista de solos, por isso todos os valores são mostrados.'],
  });
  const TP_QU = [{ lab: 'Muito mole', n: '<2', v: '<0.25' }, { lab: 'Mole', n: '2-4', v: '0.25-0.5' }, { lab: 'Média', n: '4-8', v: '0.5-1.0' }, { lab: 'Rija', n: '8-15', v: '1.0-2.0' }, { lab: 'Muito rija', n: '15-30', v: '2.0-4.0' }, { lab: 'Dura', n: '>30', v: '>4.0' }];
  add({
    id: 'cu_tp_su', params: ['cu', 'c'], title: 'Su = N/15 e qu = N/7,5 (tf/ft²)', author: 'Terzaghi & Peck', refs: ['PARAMSOLOS', 'TP1948'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 78',
    run(c) {
      const su = c.N / 15, qu = c.N / 7.5;
      const m = matchRows(c.N, TP_QU);
      const items = [{ label: 'Su = N/15', val: pt(su, 't/ft²') }, { label: 'qu = N/7,5 (compressão simples)', val: pt(qu, 't/ft²') }];
      m.hits.forEach((h) => items.push({ label: `Tabela: qu, ${h.lab.toLowerCase()} (N ${showRange(h.n)})`, val: pv(h.v, 't/ft²') }));
      const warns = [...clayWarn(c), tftWarn()];
      if (m.hits.length > 1) warns.push(W('print', 'N está no limite de duas faixas impressas; as duas linhas da tabela são mostradas.'));
      return {
        value: multi(items),
        memo: [{ k: 'Entrada', v: `N = ${nm(c.N)}` }, { k: 'Fórmula', v: 'qu (tf/ft²) = N/7,5   ou   Su (tf/ft²) = N/15' }, { k: 'Substituição', v: `Su = ${nm(c.N)}/15 = ${nm(su)} t/ft²;  qu = ${nm(c.N)}/7,5 = ${nm(qu)} t/ft²` }, { k: 'Tabela (qu em t/ft²)', v: TP_QU.map((r) => `${r.lab} (N ${showRange(r.n)}): qu ${fmtVal(pv(r.v, ''))}`).join('\n') }, { k: 'Conversão', v: TFT2 }],
        warns, notes: ['Obs. do texto: Su, nos ensaios não drenados e não confinados, é igual à metade de qu.'],
      };
    },
  });
  const NAVFAC_A = [['A ≅ 13,5 (argilas de baixa plasticidade e siltes argilosos)', 13.5, ['silte_arg']], ['A ≅ 6,5 (argilas de média plasticidade)', 6.5, []], ['A ≅ 4,0 (argilas de alta plasticidade)', 4.0, []]];
  add({
    id: 'cu_navfac', params: ['cu', 'c'], title: 'qu ≅ N/A e Su ≅ N/(2A) (t/ft²)', author: 'Manual Navfac DM-7 (1971)', refs: ['NAVFAC', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 78',
    run(c) {
      const items = [], memo = [{ k: 'Entrada', v: `N = ${nm(c.N)}` }, { k: 'Fórmula', v: 'qu ≅ N/A   ou   Su ≅ N/(2A)  (t/ft²)' }];
      NAVFAC_A.forEach((a) => {
        const mk = a[2].includes(c.soil.key) ? MARK : '';
        const qu = c.N / a[1], su = c.N / (2 * a[1]);
        items.push({ label: `${a[0].split(' (')[0]} · Su${mk}`, val: pt(su, 't/ft²') }, { label: `${a[0].split(' (')[0]} · qu`, val: pt(qu, 't/ft²') });
        memo.push({ k: a[0], v: `Su = ${nm(c.N)}/(2 × ${nm(a[1])}) = ${nm(su)} t/ft²;  qu = ${nm(c.N)}/${nm(a[1])} = ${nm(qu)} t/ft²` });
      });
      memo.push({ k: 'Conversão', v: TFT2 });
      return { value: multi(items), memo, warns: [...clayWarn(c), tftWarn()], notes: ['A plasticidade não está na lista de solos, por isso os três valores de A são mostrados.'] };
    },
  });
  joppertCard('c', 'c_joppert', 'Coesão efetiva por tipo de solo e SPT (tf/m²)', (r) => [['', pv(r[5], 'tf/m²')]]);
  add({
    id: 'c_ufmg', params: ['c'], title: 'Coesão por compacidade/consistência (tf/m²)', author: 'Tab. 3 (UFMG, fls. 47)', refs: ['UFMG', 'PARAMSOLOS', 'NBR6484'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 83 (Tab. 3)',
    run(c) {
      const v = c.group === 'arenoso' ? pt(0, 'tf/m²') : [rng(0, 1.2, 'tf/m²'), rng(1.2, 2.5, 'tf/m²'), rng(2.5, 5.0, 'tf/m²'), rng(5.0, 15.0, 'tf/m²'), gt(15.0, 'tf/m²')][c.idx];
      return { value: v, memo: [classLine(c), { k: 'Tab. 3 (uso limitado a estudos preliminares)', v: `${c.clsName}: c = ${fmtVal(v)}` }, { k: 'Resultado', v: `c = ${fmtVal(v)}` }], notes: ['É a mesma tabela da Tabela 1 do artigo de 2024. Aqui a argila média está impressa corretamente como 2,5 a 5,0; no artigo aparece "2,5 - 2,5". Os demais valores (γ, φ, E, ν) são iguais aos do artigo, e por isso estão nos cartões dele.'] };
    },
  });

  /* ---------- ν ---------- */
  add({
    id: 'nu_tg_tab5', params: ['nu'], title: 'Coeficiente de Poisson (Tabela 5)', author: 'Teixeira & Godoy (1996), via Cintra et al. (2003)', refs: ['TG1996', 'CINTRA2003', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 89 (Tabela 5)',
    run(c) {
      const memo = [classLine(c), { k: 'Tabela 5 (uso limitado a estudos preliminares)', v: 'Areia pouco compacta 0,2 | Areia compacta 0,4 | Silte 0,3-0,5 | Argila saturada 0,4-0,5 | Argila não saturada 0,1-0,3' }];
      if (c.soil.noun === 'areia') {
        const t = [null, 0.2, null, 0.4, null][c.idx];
        if (t == null) return { value: na(`A tabela só traz areia pouco compacta (0,2) e compacta (0,4). "${c.clsName}" não tem linha.`), memo };
        memo.push({ k: 'Resultado', v: `ν = ${nm(t, 1)}` });
        return { value: pt(t, ''), memo };
      }
      if (c.soil.noun === 'silte') { memo.push({ k: 'Resultado', v: 'ν = 0,3 a 0,5' }); return { value: rng(0.3, 0.5, ''), memo }; }
      memo.push({ k: 'Resultado', v: 'Depende do grau de saturação; os dois valores estão abaixo.' });
      return { value: multi([{ label: 'Argila saturada', val: rng(0.4, 0.5, '') }, { label: 'Argila não saturada', val: rng(0.1, 0.3, '') }]), memo };
    },
  });
  add({
    id: 'nu_mayne1999', params: ['nu'], title: "ν′ = 0,15 ± 0,05 (drenado) e ν = 0,5 (não drenado)", author: 'Mayne & Poulos (1999); Simons & Menzies (1981)', refs: ['MAYNE1999', 'CINTRA2003', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 89',
    run(c) {
      const items = [{ label: "Carregamento drenado, todos os solos (ν′)", val: txt('0,15 ± 0,05', '') }, { label: 'Carregamento rápido em argila saturada (νu)', val: pt(0.5, '') }];
      return {
        value: multi(items),
        memo: [classLine(c), { k: 'Fórmula', v: "ν′ = 0,15 ± 0,05  (carregamento drenado em todos os tipos de solo, areias e argilas)\nν = 0,5  (condições não drenadas, carregamentos rápidos em argilas saturadas)" }, { k: 'Resultado', v: "ν′ = 0,15 ± 0,05;  νu = 0,5" }],
        warns: c.group === 'arenoso' ? [W('apply', 'O valor de 0,5 vale para argilas saturadas em carregamento rápido; para areia vale o valor drenado.')] : [],
        notes: ['Simons e Menzies (1981): ν não é constante; varia do valor não drenado no momento do carregamento (νu = 0,5 no caso ideal) até os valores drenados no fim da dissipação do excesso de pressões neutras.', 'Segundo Mayne e Poulos (1999), pesquisas recentes mostram que os valores drenados são bem menores do que se acreditava.'],
      };
    },
  });
  const UFV7 = [
    ['Argila saturada', '0.4-0.5', []], ['Argila não-saturada', '0.1-0.3', []], ['Argila arenosa', '0.2-0.3', ['argila_aren']], ['Silte', '0.3-0.35', ['silte', 'silte_aren', 'silte_arg']],
    ['Areia compacta', '0.2-0.4', []], ['Areia grossa (e = 0,4 a 0,7)', 0.15, []], ['Areia fina (e = 0,4 a 0,7)', 0.25, []], ['Rocha (depende do tipo)', '0.1-0.4', []], ['Concreto', 0.15, []], ['Gelo', 0.36, []],
  ];
  listCard({
    id: 'nu_ufv_tab7', params: ['nu'], title: 'Coeficiente de Poisson por tipo de solo (Tab. 7)', author: 'UFV (Tab. 7)', refs: ['UFV', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 84 (Tab. 7)',
    items: (c) => UFV7.map((r) => ({ label: r[0], val: pv(r[1], ''), mark: r[2].includes(c.soil.key) })),
    pre: () => [{ k: 'Entrada', v: 'Tabela por tipo de solo, sem relação com o N. As linhas de rocha, concreto e gelo estão na tabela e foram mantidas.' }],
    notes: ['Tabela de uso limitado a estudos preliminares.'],
  });

  /* ---------- E / Es ---------- */
  add({
    id: 'e_puc', params: ['E', 'Es'], title: 'E (MPa) = 2,9·N + 2,7', author: 'Ensaios de placa da PUC-Rio', refs: ['PUCRIO'], where: 'imagem enviada: Eq. (2.28)',
    run(c) {
      const v = 2.9 * c.N + 2.7;
      return { value: pt(v, 'MPa'), memo: [{ k: 'Fórmula', v: 'E (MPa) = 2,9·N + 2,7' }, { k: 'Substituição', v: `E = 2,9 × ${nm(c.N)} + 2,7` }, { k: 'Resultado', v: `E = ${nm(v)} MPa` }], notes: ['Expressão obtida da análise de ensaios de carga em placa realizados na Universidade Católica do Rio de Janeiro.'] };
    },
  });
  add({
    id: 'e_blight', params: ['E', 'Es'], title: 'E (MPa) = 1,6·N', author: 'Blight (1997)', refs: ['BLIGHT1997'], where: 'imagem enviada: Eq. (2.29)',
    run(c) {
      const v = 1.6 * c.N;
      return { value: pt(v, 'MPa'), memo: [{ k: 'Fórmula', v: 'E (MPa) = 1,6·N' }, { k: 'Substituição', v: `E = 1,6 × ${nm(c.N)}` }, { k: 'Resultado', v: `E = ${nm(v)} MPa` }], notes: ['Blight (1997) refere esta correlação do N_SPT para solos residuais.'] };
    },
  });
  const CLAYTON86 = [[4, '1.6-2.4', '0.4-0.6', '3.5-5.3'], [10, '2.2-3.4', '0.7-1.1', '4.6-7.0'], [30, '3.7-5.6', '1.5-2.2', '6.6-10.0'], [60, '4.6-7.0', '2.3-3.5', '8.9-13.5']];
  add({
    id: 'e_clayton1986', params: ['E', 'Es'], title: 'E de areias por N (Tabela 2.19)', author: 'Clayton (1986), dados de Burland & Burbidge (1985)', refs: ['CLAYTON1986'], where: 'imagem enviada: Tabela 2.19',
    run(c) {
      const memo = [{ k: 'Entrada', v: `N = ${nm(c.N)}` }, { k: 'Tabela 2.19 (E em MPa)', v: CLAYTON86.map((r) => `N = ${r[0]}: média ${r[1].replace('-', ' a ')}; limite inferior ${r[2].replace('-', ' a ')}; limite superior ${r[3].replace('-', ' a ')}`).join('\n') }];
      const warns = [...granularWarn(c), W('assume', 'A legenda da tabela diz "N_SPT (N60)". Foi usado o N informado.')];
      const exact = CLAYTON86.find((r) => r[0] === c.N);
      let rows;
      if (exact) rows = [exact];
      else {
        const lo = [...CLAYTON86].reverse().find((r) => r[0] < c.N), hi = CLAYTON86.find((r) => r[0] > c.N);
        if (!lo || !hi) return { value: na(`N = ${nm(c.N)} está fora da faixa impressa (4 a 60).`), memo, warns };
        rows = [lo, hi];
        warns.push(W('range', 'A tabela só traz N = 4, 10, 30 e 60. Para N intermediário são mostradas as duas linhas vizinhas, sem interpolar.'));
      }
      const items = [];
      rows.forEach((r) => {
        items.push({ label: `N = ${r[0]} · média`, val: pv(r[1], 'MPa') }, { label: `N = ${r[0]} · limite inferior`, val: pv(r[2], 'MPa') }, { label: `N = ${r[0]} · limite superior`, val: pv(r[3], 'MPa') });
      });
      memo.push({ k: 'Resultado', v: items.map((i) => `${i.label}: ${fmtVal(i.val)}`).join('\n') });
      return { value: multi(items), memo, warns };
    },
  });
  listCard({
    id: 'e_bowles2001', params: ['E', 'Es'], title: 'E (kPa) por tipo de solo (Tabela 2.20)', author: 'Bowles (2001)', refs: ['BOWLES2001'], where: 'imagem enviada: Tabela 2.20', only: 'arenoso',
    items: (c) => {
      const N = c.N, ln = Math.log(N), k = 'kPa';
      const lnV = N >= 1 ? rng(15000 * ln, 22000 * ln, k) : na('ln N exige N ≥ 1.');
      const it = (label, expr, v, mark) => ({ label, val: v, line: `E = ${expr} = ${fmtVal(v)}`, mark: !!mark });
      return [
        it('Areia normalmente consolidada · 500·(N+15)', `500 × (${nm(N)} + 15)`, pt(500 * (N + 15), k)),
        it('Areia normalmente consolidada · 7000·√N', `7000 × √${nm(N)}`, pt(7000 * Math.sqrt(N), k)),
        it('Areia normalmente consolidada · 6000·N', `6000 × ${nm(N)}`, pt(6000 * N, k)),
        it('Areia normalmente consolidada · (15000 a 22000)·ln N', `(15000 a 22000) × ln ${nm(N)}`, lnV),
        it('Areia saturada · 250·(N+15)', `250 × (${nm(N)} + 15)`, pt(250 * (N + 15), k)),
        it('Areia sobreconsolidada · 40000 + 1050·N', `40000 + 1050 × ${nm(N)}`, pt(40000 + 1050 * N, k)),
        it('Cascalho arenoso · 1200·(N+6)', `1200 × (${nm(N)} + 6)`, pt(1200 * (N + 6), k), c.soil.key === 'areia_ped'),
        N <= 15 ? it('Cascalho arenoso · 600·(N+6), N ≤ 15', `600 × (${nm(N)} + 6)`, pt(600 * (N + 6), k), c.soil.key === 'areia_ped')
          : it('Cascalho arenoso · 600·(N+6) + 2000, N > 15', `600 × (${nm(N)} + 6) + 2000`, pt(600 * (N + 6) + 2000, k), c.soil.key === 'areia_ped'),
        it('Areia argilosa · 320·(N+15)', `320 × (${nm(N)} + 15)`, pt(320 * (N + 15), k), c.soil.key === 'areia_arg'),
        it('Areia siltosa · 300·(N+6)', `300 × (${nm(N)} + 6)`, pt(300 * (N + 6), k), c.soil.key === 'areia_silt'),
      ];
    },
    warns: () => [W('assume', 'A legenda da tabela diz "N_SPT (N55)". Foi usado o N informado.')],
    notes: ['Cada linha é uma correlação própria de um tipo de solo. A marcação só sugere a linha cujo nome coincide com o solo escolhido; "Areia com pedregulhos" foi associada a "Cascalho arenoso" por semelhança de nome.'],
  });
  joppertCard('E', 'e_joppert', 'E por tipo de solo e SPT (t/m²)', (r) => [['', pv(r[1], 'tf/m²')]]);
  const UFV6 = [
    ['Argila · muito mole', '3-30'], ['Argila · mole', '20-40'], ['Argila · média', '45-90'], ['Argila · dura', '70-200'], ['Argila · arenosa', '300-425'],
    ['Areia · siltosa', '50-200'], ['Areia · fofa', '100-250'], ['Areia · compacta', '500-1000'], ['Areia e pedregulho · compacto', '800-2000'], ['Areia e pedregulho · fofo', '500-1400'], ['Silte', '20-200'],
  ];
  listCard({
    id: 'e_ufv_tab6', params: ['E', 'Es'], title: 'E por tipo de solo (Tab. 6, kgf/cm²)', author: 'UFV (Tab. 6)', refs: ['UFV', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 84 (Tab. 6)',
    items: (c) => {
      const clay = c.soil.noun === 'argila' ? { 0: 'Argila · muito mole', 1: 'Argila · mole', 2: 'Argila · média', 4: 'Argila · dura' }[c.idx] : null;
      const byName = { argila_aren: ['Argila · arenosa'], areia_silt: ['Areia · siltosa'], silte: ['Silte'], silte_aren: ['Silte'], silte_arg: ['Silte'], areia_ped: ['Areia e pedregulho · compacto', 'Areia e pedregulho · fofo'] }[c.soil.key] || [];
      return UFV6.map((r) => ({ label: r[0], val: pv(r[1], 'kgf/cm²'), mark: byName.includes(r[0]) || clay === r[0] }));
    },
    pre: () => [{ k: 'Entrada', v: 'Tabela por tipo de solo, sem relação direta com o N.' }],
    notes: ['Tabela de uso limitado a estudos preliminares. A marcação é só uma sugestão pelo nome do solo e, nas argilas, pela classe da NBR 6484 (a tabela não tem "rija").'],
  });


  add({
    id: 'e_webb', params: ['E', 'Es'], title: 'E ≈ 479·(N + 15) kN/m²', author: 'Webb (1969)', refs: ['WEBB1969'], where: 'imagem enviada (Webb, 1969)',
    run(c) {
      const v = 479 * (c.N + 15);
      return { value: pt(v, 'kN/m²'), memo: [{ k: 'Fórmula', v: 'E ≈ 479·(N + 15)  (kN/m²), para areia e areia argilosa' }, { k: 'Substituição', v: `E = 479 × (${nm(c.N)} + 15)` }, { k: 'Resultado', v: `E = ${nm(v)} kN/m²` }], warns: granularWarn(c) };
    },
  });
  add({
    id: 'e_ferrent', params: ['E', 'Es'], title: 'E ≈ 718·(1 − ν²)·N kN/m²', author: 'Ferrent (1963)', refs: ['FERRENT1963'], where: 'imagem enviada (Ferrent, 1963)',
    run(c) {
      const nu = nuPick(c), v = 718 * (1 - nu.v * nu.v) * c.N;
      return {
        value: pt(v, 'kN/m²'),
        memo: [{ k: 'Poisson', v: nu.line }, { k: 'Fórmula', v: 'E ≈ 718·(1 − ν²)·N  (kN/m²)' }, { k: 'Substituição', v: `E = 718 × (1 − ${nm(nu.v, 3)}²) × ${nm(c.N)}` }, { k: 'Resultado', v: `E = ${nm(v)} kN/m²` }],
        warns: [W('assume', c.nuUser != null ? 'ν informado em Opções avançadas (aba Kv).' : 'A imagem não diz qual ν usar. Foi usado o da Tab. 5.7 do manual TQS (areia 0,35; argila 0,3). Informe ν em Opções avançadas do Kv se quiser outro; o valor vale em todos os cartões.')],
      };
    },
  });
  add({
    id: 'e_begemann', params: ['E', 'Es'], title: 'E = 40 + C·(N − 6) ou E = C·(N + 6) kgf/cm²', author: 'Begemann (1974)', refs: ['BEGEMANN1974'], where: 'imagem enviada (Begemann, 1974)',
    run(c) {
      const memo = [{ k: 'Entrada', v: `N = ${nm(c.N)}` }, { k: 'Fórmulas (silte com areia a pedregulho com areia)', v: 'N > 15:  E = 40 + C·(N − 6) kgf/cm²   ou   E ≈ 4000 + 100·C·(N − 6) kN/m²\nN < 15:  E = C·(N + 6) kgf/cm²   ou   E ≈ 100·C·(N + 6) kN/m²\nC = 3 (silte com areia) a 12 (pedregulho com areia)' }];
      if (c.N === 15) return { value: na('A fonte imprime as expressões para N > 15 e para N < 15; N = 15 não tem expressão.'), memo };
      const hi = c.N > 15;
      const E = (C) => (hi ? 40 + C * (c.N - 6) : C * (c.N + 6));
      const items = [3, 12].map((C) => ({ label: `C = ${C} (${C === 3 ? 'silte com areia' : 'pedregulho com areia'})${(C === 3 && c.soil.key === 'silte_aren') || (C === 12 && c.soil.key === 'areia_ped') ? MARK : ''}`, val: pt(E(C), 'kgf/cm²') }));
      [3, 12].forEach((C) => memo.push({ k: `C = ${C}`, v: `E = ${hi ? `40 + ${C} × (${nm(c.N)} − 6)` : `${C} × (${nm(c.N)} + 6)`} = ${nm(E(C))} kgf/cm²  ≈ ${nm(hi ? 4000 + 100 * C * (c.N - 6) : 100 * C * (c.N + 6))} kN/m²` }));
      return { value: multi(items), memo, warns: [W('assume', 'C vale de 3 a 12 conforme o solo; os dois extremos são mostrados, e qualquer C intermediário dá valor entre eles.')], notes: ['A fonte dá cada expressão em kgf/cm² e em kN/m² (com 1 kgf/cm² ≈ 100 kN/m²); os dois resultados aparecem na memória.'] };
    },
  });
  add({
    id: 'e_kulhawy', params: ['E', 'Es'], title: 'E/pa = 5·N60, 10·N60 ou 15·N60', author: 'Kulhawy & Mayne (1990)', refs: ['KULHAWY1990'], where: 'imagem enviada (Kulhawy e Mayne, 1990)',
    run(c) {
      const pa = 100, rows = [['Areia com finos', 5], ['Areia limpa normalmente consolidada', 10], ['Areia limpa sobreadensada', 15]];
      const items = rows.map((r) => ({ label: r[0] + ` (E/pa = ${r[1]}·N60)`, val: pt(r[1] * c.N60 * pa, 'kPa') }));
      return {
        value: multi(items),
        memo: [{ k: 'Entrada', v: n60Entry(c) }, { k: 'Fórmula', v: 'E/pa = 5·N60 (areia com finos);  10·N60 (areia limpa normalmente consolidada);  15·N60 (areia limpa sobreadensada)' }, { k: 'pa', v: 'pa = pressão atmosférica = 100 kPa (premissa)' }, ...rows.map((r) => ({ k: r[0], v: `E = ${r[1]} × ${nm(c.N60)} × ${pa} = ${nm(r[1] * c.N60 * pa)} kPa` }))],
        warns: [...granularWarn(c), ...n60Warn(c), W('assume', 'A imagem não dá o valor de pa. Foi usado pa = 100 kPa (≈ 1 kgf/cm², como no item 3.3 do capítulo "Parâmetros dos Solos"); com 101,3 kPa os resultados sobem 1,3%.')],
      };
    },
  });

  /* ---------- qc ---------- */
  add({
    id: 'qc_tg', params: ['qc'], title: 'qc = K·N', author: 'Teixeira & Godoy (1996), via Cintra et al. (2003)', refs: ['TG1996', 'CINTRA2003', 'TEIXEIRA1993', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, págs. 87 e 88 (Tabela 4)',
    run(c) {
      const v = c.soil.K * c.N;
      return { value: pt(v, 'MPa'), memo: [{ k: 'Solo', v: `${c.soil.name}: K = ${nm(c.soil.K, 2)} MPa (Tabela 4)` }, { k: 'Fórmula', v: 'qc = K·N' }, { k: 'Substituição', v: `qc = ${nm(c.soil.K, 2)} × ${nm(c.N)}` }, { k: 'Resultado', v: `qc = ${nm(v)} MPa` }], notes: ['O texto usa qc = K·N dentro de Es = α·qc (ver os cartões de E). O K da Tabela 4 é o mesmo da Tab. 5.8 do manual TQS.'] };
    },
  });
  const DANZ = [
    ['Barata et al. (1978)', 'Argila silto-arenosa', 'gnaisse; SPT manual; CPT mecânico', '0.15-0.25'], ['Barata et al. (1978)', 'Areia silto-argilosa', 'gnaisse; SPT manual; CPT mecânico', '0.20-0.35'],
    ['Alonso (1980)', 'Silte arenoso', 'gnaisse; SPT manual; CPT mecânico', '0.31-0.34'], ['Alonso (1980)', 'Areia e silte', 'gnaisse; SPT manual; CPT mecânico', '0.26-0.50'], ['Alonso (1980)', 'Argila siltosa', 'gnaisse; SPT manual; CPT mecânico', 0.72],
    ['Velloso (1981)', 'Areia siltosa', 'gnaisse; SPT manual; CPT mecânico', 0.5], ['Velloso (1981)', 'Silte arenoso', 'gnaisse; SPT manual; CPT mecânico', '0.40-0.47'],
    ['Rocha Filho & Carvalho (1988)', 'Areia siltosa', 'gnaisse; SPT manual; CPT elétrico', '0.3-0.5'],
    ['Ajayi & Balogun (1988), Nigéria', 'Argila arenosa (laterite)', 'SPT semiautomático; CPT mecânico', 0.32], ['Ajayi & Balogun (1988), Nigéria', 'Argila arenosa (saprólito)', 'SPT semiautomático; CPT mecânico', 0.42],
    ['Chang (1988), Singapura', 'Silte argilo-arenoso', 'granito e rocha sedimentar', 0.21], ['Chang (1988), Singapura', 'Silte argiloso e erenoso (sic)', 'granito e rocha sedimentar', 0.18],
    ['Viana da Fonseca (1996), Portugal', 'Areia siltosa', 'granito; SPT automático (Dando); CPT mecânico', 0.7],
  ];
  listCard({
    id: 'qc_danziger', params: ['qc'], title: 'qc = (qc/N)·N, correlações SPT × CPT (Tabela 2.24)', author: 'Danziger et al. (1988), citado por Duarte (2002)', refs: ['DANZIGER'], where: 'imagem enviada: Tabela 2.24',
    formula: 'qc = (qc/N)·N, com qc/N (média) em MPa por pancada por 0,3 m',
    items: (c) => DANZ.map((r) => {
      const v = typeof r[3] === 'number' ? pt(r[3] * c.N, 'MPa') : (() => { const [a, b] = r[3].split('-').map(Number); return rng(a * c.N, b * c.N, 'MPa'); })();
      const ratio = typeof r[3] === 'number' ? String(r[3]).replace('.', ',') : r[3].replace(/\./g, ',').replace('-', ' a ');
      const key = r[1].toLowerCase();
      return { label: `${r[0]} · ${r[1]}`, val: v, line: `${r[2]}\nqc/N = ${ratio}  →  qc = ${ratio} × ${nm(c.N)} = ${fmtVal(v)}`, mark: key.includes(c.soil.name.toLowerCase()) };
    }),
    pre: (c) => [{ k: 'Entrada', v: `N = ${nm(c.N)}` }],
    warns: () => [W('print', 'Nas linhas de Alonso (1980) e de Velloso (1981) a tabela empilha vários solos e valores na mesma célula. Os solos e os valores foram pareados na ordem em que aparecem. Chang (1988) está impresso com "erenoso" no segundo solo.')],
    notes: ['A tabela resume correlações em solos residuais de vários locais; cada linha vale para o seu solo, tipo de SPT e tipo de CPT.'],
  });

  /* ---------- Kv (σadm de solos coesivos de Moraes, 1978 → tabela de Morrison) ---------- */
  add({
    id: 'kv_moraes1978', params: ['Kv'], title: 'σadm de solos coesivos → tabela de Morrison', author: 'Moraes (1978)', refs: ['MORAES1978', 'MORRISON', 'PARAMSOLOS'], where: 'parâmetros-dos-solos-cálculo-de-fundações.pdf, pág. 86; Morrison: correlacoes.pdf, pág. 12',
    run(c) {
      const defs = [['Argila pura', 4, 'p = N/4', []], ['Argila siltosa', 5, 'p = N/5', ['argila_silt']], ['Argila arenosa siltosa', 7.5, 'p = N/7,5', ['argila_aren']]];
      const items = [], memo = [{ k: 'Entrada', v: `N = ${nm(c.N)}` }, { k: 'Fórmula', v: 'Tensão admissível de solos coesivos, em kgf/cm²:  argila pura p = N/4;  argila siltosa p = N/5;  argila arenosa siltosa p = N/7,5' }];
      const warns = [...clayWarn(c)];
      let extrap = false;
      defs.forEach((d) => {
        const sig = c.N / d[1], r = morrisonKv(sig);
        if (r.extrap) extrap = true;
        items.push({ label: `${d[0]} (${d[2]})`, val: kvPt(r.kv), mark: d[3].includes(c.soil.key) });
        memo.push({ k: d[0], v: `p = ${nm(c.N)}/${nm(d[1])} = ${nm(sig, 4)} kgf/cm²\nTabela 5.2.2: interpolação entre (${nm(r.s0, 2)}; ${nm(r.k0, 2)}) e (${nm(r.s0 + MORRISON_DS, 2)}; ${nm(r.k1, 2)})  →  Kv = ${nm(r.kv, 3)} kgf/cm³` });
      });
      if (extrap) warns.push(W('assume', 'Alguma tensão ficou fora da faixa da Tabela 5.2.2 (0,25 a 4,00 kgf/cm²). Prolonga-se o segmento extremo da própria tabela.'));
      return { value: multi(items), memo, warns, notes: ['O texto dá as relações em kg/cm² para o cálculo da tensão admissível ou capacidade de carga. Aqui cada uma alimenta a tabela de Morrison, como nos outros cartões de σadm. A marcação sugere a linha pelo nome do solo.'] };
    },
  });

  /* ------------------------------------------------------------------ API */
  const PARAMS = [
    { key: 'phi', sym: 'φ', label: 'Ângulo de atrito', dim: 'angle', unitHint: 'graus', n60: true },
    { key: 'c', sym: 'c', label: 'Coesão', dim: 'stress', n60: true },
    { key: 'cu', sym: 'Cu', label: 'Coesão não drenada', dim: 'stress', n60: true },
    { key: 'gamma', sym: 'γ', label: 'Peso específico', dim: 'gamma' },
    { key: 'nu', sym: 'ν', label: 'Coeficiente de Poisson', dim: 'nu' },
    { key: 'E', sym: 'E', label: 'Módulo de deformabilidade', dim: 'stress', n60: true },
    { key: 'Es', sym: 'Es', label: 'Módulo de elasticidade Es', dim: 'stress', n60: true },
    { key: 'E0', sym: 'E0', label: 'Módulo edométrico', dim: 'stress' },
    { key: 'qc', sym: 'qc', label: 'Resistência de ponta do cone', dim: 'stress' },
    { key: 'Kv', sym: 'Kv', label: 'Coeficiente de reação vertical', dim: 'kv' },
  ];
  function compute(param, inp) {
    const c = prepare(inp);
    const results = METHODS.filter((m) => m.params.includes(param)).map((m) => {
      let out;
      if (!Number.isFinite(c.N) || c.N < 0) out = { value: na('Informe um N SPT válido (≥ 0).') };
      else {
        try { out = m.run(c); } catch (e) { out = { value: na('Erro no cálculo: ' + e.message) }; }
      }
      return Object.assign({ id: m.id, title: m.title, author: m.author, refs: m.refs, where: m.where, memo: [], warns: [], notes: [] }, out);
    });
    return { ctx: c, results };
  }

  return {
    G, PARAMS, SOILS, CLS, CLS_LIM, GROUP_LABEL, REFS, METHODS, DISPLAY_UNITS,
    compute, prepare, claytonClass, parseRange, matchRows, convertValue, fmtVal, fmtNum, nm, nf, dimOf, conv,
    piancastelliCr, sherif, morrisonKv, mindlinD, mindlinParts, terzaghiCorr,
    data: { SH_Z, SH_L, SH, MORRISON_KV, BETON, K30_OUTROS, E0_TAB511, E0_TAB512, E_TAB56, NBR_ROWS },
  };
});
