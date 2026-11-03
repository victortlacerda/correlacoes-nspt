/* Validação do motor contra os exemplos de Piancastelli (2012) e checagens independentes.
 * Uso: node tests/validate.js */
const SPT = require('../engine.js');

let fails = 0;
const rows = [];
function check(name, got, expected, tol, unit) {
  const ok = Math.abs(got - expected) <= tol;
  if (!ok) fails++;
  rows.push([ok ? 'OK ' : 'ERRO', name, got, expected, unit || '']);
}

/* ---- Piancastelli, Exemplo 1 (radier 22,4 × 28 m, Es = 210 × 13) */
const Es13 = 210 * 13;
check('Ex.1  Cr', SPT.piancastelliCr(Es13, 22.4, 28, 9).Cr, 406, 0.6, 'tf/m³');

/* ---- Exemplo 2, casos A a D (Z = 9 m; Z = 2B quando 2B < 9) */
const ex2 = [
  ['A', 11.2, 14.0, 9.0, 530],
  ['B', 5.6, 7.0, 9.0, 774],
  ['C(1)', 2.24, 2.8, 9.0, 1505],
  ['C(2)', 2.24, 2.8, 4.48, 1792],
  ['D(1)', 1.12, 1.4, 9.0, 2770],
  ['D(2)', 1.12, 1.4, 2.24, 3584],
];
ex2.forEach(([n, B, L, Z, cr]) => check('Ex.2  ' + n, SPT.piancastelliCr(Es13, B, L, Z).Cr, cr, 1.0, 'tf/m³'));

/* ---- Exemplo 3 (sapata 0,56 × 0,70; Z = 2B = 1,12) */
check('Ex.3  a-1 areia siltosa', SPT.piancastelliCr(210 * 13, 0.56, 0.7, 1.12).Cr, 7169, 1.0, 'tf/m³');
check('Ex.3  a-2 argila siltosa', SPT.piancastelliCr(100 * 13, 0.56, 0.7, 1.12).Cr, 3414, 1.0, 'tf/m³');
check('Ex.3  a-3 silte argiloso', SPT.piancastelliCr(125 * 13, 0.56, 0.7, 1.12).Cr, 4267, 1.0, 'tf/m³');

/* ---- Exemplo 4 (média ponderada de Es) */
const es1 = (210 * (5 + 7)) / 2, es2 = (100 * (3 + 5)) / 2, es3 = (225 * (13 + 14 + 14 + 16 + 18)) / 5;
check('Ex.4  Es camada 1', es1, 1260, 0.01, 'tf/m²');
check('Ex.4  Es camada 2', es2, 400, 0.01, 'tf/m²');
check('Ex.4  Es camada 3', es3, 3375, 0.01, 'tf/m²');
const esPond = (1260 * (10 + 9) + 400 * (8 + 7)) / (10 + 9 + 8 + 7);
check('Ex.4  Es ponderado', esPond, 881, 0.5, 'tf/m²');
check('Ex.4  Cr', SPT.piancastelliCr(881, 4, 4, 8).Cr, 344, 0.5, 'tf/m³');

/* ---- Pelo caminho completo (compute) para o Exemplo 1 */
{
  const r = SPT.compute('Kv', { N: 13, soil: 'areia_silt', B: 22.4, L: 28, Z: 9 });
  const m = r.results.find((x) => x.id === 'kv_piancastelli');
  check('compute Ex.1 (kgf/cm³)', m.value.v, 0.406, 0.0006, 'kgf/cm³');
}
{
  const r = SPT.compute('Kv', { N: 13, soil: 'areia_silt', B: 2.24, L: 2.8, Z: 9 });
  const m = r.results.find((x) => x.id === 'kv_piancastelli');
  check('compute Ex.2 C faixa (inferior)', m.value.lo, 1.505, 0.0015, 'kgf/cm³');
  check('compute Ex.2 C faixa (superior)', m.value.hi, 1.792, 0.0015, 'kgf/cm³');
}
{
  const r = SPT.compute('Kv', { N: 13, soil: 'areia_silt', B: 4, L: 4, Z: 8, EsManual: 881 });
  const m = r.results.find((x) => x.id === 'kv_piancastelli');
  check('compute Ex.4 (Es informado)', m.value.v, 0.344, 0.0006, 'kgf/cm³');
}

/* ---- Fórmulas simples (conferência manual) */
const g = (p, inp) => SPT.compute(p, inp).results;
const val = (rs, id) => rs.find((x) => x.id === id).value;
check('φ Godoy N=13', val(g('phi', { N: 13, soil: 'areia' }), 'phi_godoy').v, 33.2, 1e-9, '°');
check('φ Teixeira N=20', val(g('phi', { N: 20, soil: 'areia' }), 'phi_teixeira').v, 35, 1e-9, '°');
check('φ Silveira N=20 (arenoso)', val(g('phi', { N: 20, soil: 'areia' }), 'phi_silveira').v, 35, 1e-9, '°');
check('Cu T&G N=8', val(g('cu', { N: 8, soil: 'argila_silt' }), 'c_tg').v, 80, 1e-9, 'kN/m²');
check('c Silveira N=8 (argila)', val(g('c', { N: 8, soil: 'argila_silt' }), 'c_silveira').v, 8, 1e-9, 'tf/m²');
check('E Silveira areia N=10', val(g('E', { N: 10, soil: 'areia' }), 'e_silveira').v, 2700, 1e-9, 'tf/m²');
check('E Schmertmann areia N=10', val(g('E', { N: 10, soil: 'areia' }), 'e_schmertmann').v, 27, 1e-9, 'MPa');
check('E T&G argila siltosa N=10', val(g('E', { N: 10, soil: 'argila_silt' }), 'e_tg').v, 14, 1e-9, 'MPa');
check('E0 S&M areia N=10 (linha "Areia")', val(g('E0', { N: 10, soil: 'areia' }), 'e0_schultze').items[2].val.v, 84, 1e-9, 'bar');

/* ---- Equivalência Silveira × Schmertmann (3·K em MPa → tf/m²) */
{
  const s = g('E', { N: 1, soil: 'areia' });
  const sil = val(s, 'e_silveira').v; // tf/m²
  const sch = SPT.convertValue(val(s, 'e_schmertmann'), 'tf/m²').v;
  check('Silveira ≈ Schmertmann (areia, N=1, tf/m²)', sch, sil, 6, 'tf/m² (diferença esperada: arredondamento de 3·K em MPa)');
}

/* ---- Mello (1975): σadm = 0,1·(√N − 1) MPa; N = 16 → 0,3 MPa = 3,058 kgf/cm² */
{
  const m = g('Kv', { N: 16, soil: 'areia', B: 2, L: 2 }).find((x) => x.id === 'kv_mello');
  const sigKgf = 0.3 * 1000 / 98.0665;
  check('Mello N=16 → Kv (Morrison)', m.value.v, SPT.morrisonKv(sigKgf).kv, 1e-9, 'kgf/cm³');
}


/* ---- Novas correlações (imagens + capítulo "Parâmetros dos Solos") ---- */
{
  const run = (param, inp) => SPT.compute(param, Object.assign({ soil: 'areia_silt' }, inp)).results;
  const one = (rs, id) => rs.find((x) => x.id === id).value;
  const item = (v, part) => v.items.find((i) => i.label.includes(part)).val;
  check('φ Hatanaka N60=N=13', one(run('phi', { N: 13 }), 'phi_hatanaka').v, 20 + Math.sqrt(15.4 * 13), 1e-9, '°');
  check('φ Hatanaka N60 informado = 20', one(run('phi', { N: 13, n60: '20' }), 'phi_hatanaka').v, 20 + Math.sqrt(15.4 * 20), 1e-9, '°');
  check('φ Teixeira (24) N=24', one(run('phi', { N: 24 }), 'phi_teixeira24').v, 15 + Math.sqrt(24 * 24), 1e-9, '°');
  check('φ Alonso 1943 N=10 → duas linhas', one(run('phi', { N: 10 }), 'phi_alonso1943').items.length, 2, 0, '');
  check('φ Alonso 1943 N=13', one(run('phi', { N: 13 }), 'phi_alonso1943').lo, 35, 0, '°');
  check('φ US Army Corps ID=60, finas bem graduadas', item(one(run('phi', { N: 13, sel: { usace: '60' } }), 'phi_usace'), 'finas · bem').v, 38, 0, '°');
  check('φ Bowles Tab. 4 N=10 (início da faixa)', one(run('phi', { N: 10 }), 'phi_bowles').lo, 30, 0, '°');
  check('φ Moraes média/grossa angulares (intermediária)', item(one(run('phi', { N: 13 }), 'phi_moraes1978'), 'angulares').v >= 0 ? item(one(run('phi', { N: 13 }), 'phi_moraes1978'), 'Média e grossa · angulares').v : 0, 38, 0, '°');
  check('c Berbearian N=7', one(run('c', { N: 7, soil: 'argila_silt' }), 'c_berbearian').v, 20, 1e-9, 'kPa');
  check('Su Bowles k=12, N60=5', item(one(run('cu', { N: 5, soil: 'argila_silt' }), 'cu_bowles1997'), 'k = 12').v, 60, 1e-9, 'kPa');
  check('Su Look N60=7', one(run('cu', { N: 7, soil: 'argila_silt' }), 'cu_look2007').lo, 25, 0, 'kPa');
  check('c Alonso 2010 N=3', one(run('c', { N: 3, soil: 'argila_silt' }), 'c_alonso2010').lo, 10, 0, 'kPa');
  check('c Alonso 2010 N=5', one(run('c', { N: 5, soil: 'argila_silt' }), 'c_alonso2010').lo, 25, 0, 'kPa');
  check('c Moraes N=3 (kgf/cm², mole)', one(run('c', { N: 3, soil: 'argila_silt' }), 'c_moraes1978').hi, 0.25, 1e-9, 'kgf/cm²');
  check('c Joppert Tab.13, argila siltosa N=4', item(one(run('c', { N: 4, soil: 'argila_silt' }), 'c_joppert'), 'Argila siltosa').v, 1.5, 0, 'tf/m²');
  check('γ Joppert N=7 areia pouco siltosa (natural)', item(one(run('gamma', { N: 7 }), 'gamma_joppert'), 'Areia pouco siltosa / pouco argilosa · SPT 5 a 8 · natural').v, 1.8, 0, 'tf/m³');
  check('γ Bowles N=7 (fofa, tf/m³)', one(run('gamma', { N: 7 }), 'gamma_bowles').lo, 1.44, 0, 'tf/m³');
  check('E PUC-Rio N=10', one(run('E', { N: 10 }), 'e_puc').v, 31.7, 1e-9, 'MPa');
  check('E Blight N=10', one(run('E', { N: 10 }), 'e_blight').v, 16, 1e-9, 'MPa');
  check('E Clayton N=10 média (inferior)', item(one(run('E', { N: 10 }), 'e_clayton1986'), 'média').lo, 2.2, 0, 'MPa');
  check('E Clayton N=13 → linhas vizinhas (6)', one(run('E', { N: 13 }), 'e_clayton1986').items.length, 6, 0, '');
  check('E Clayton N=2 fora da faixa', one(run('E', { N: 2 }), 'e_clayton1986').t === 'na' ? 1 : 0, 1, 0, '');
  check('E Bowles 2001 areia NC 500·(N+15), N=10', item(one(run('E', { N: 10 }), 'e_bowles2001'), '500·(N+15)').v, 12500, 1e-9, 'kPa');
  check('E Bowles 2001 areia siltosa 300·(N+6), N=10', item(one(run('E', { N: 10 }), 'e_bowles2001'), '300·(N+6)').v, 4800, 1e-9, 'kPa');
  check('E Bowles 2001 cascalho N>15 (600·(N+6)+2000), N=20', item(one(run('E', { N: 20 }), 'e_bowles2001'), 'N > 15').v, 600 * 26 + 2000, 1e-9, 'kPa');
  check('E Webb N=10', one(run('E', { N: 10 }), 'e_webb').v, 479 * 25, 1e-9, 'kN/m²');
  check('E Ferrent N=10, ν informado 0,3', one(run('E', { N: 10, nu: '0.3' }), 'e_ferrent').v, 718 * (1 - 0.09) * 10, 1e-9, 'kN/m²');
  check('E Begemann N=20, C=3', item(one(run('E', { N: 20 }), 'e_begemann'), 'C = 3').v, 40 + 3 * 14, 1e-9, 'kgf/cm²');
  check('E Begemann N=10, C=12', item(one(run('E', { N: 10 }), 'e_begemann'), 'C = 12').v, 12 * 16, 1e-9, 'kgf/cm²');
  check('E Begemann N=15 sem expressão', one(run('E', { N: 15 }), 'e_begemann').t === 'na' ? 1 : 0, 1, 0, '');
  check('E Kulhawy & Mayne N60=20, areia limpa NC', item(one(run('E', { N: 20 }), 'e_kulhawy'), 'normalmente').v, 10 * 20 * 100, 1e-9, 'kPa');
  check('qc = K·N (areia siltosa, N=10)', one(run('qc', { N: 10 }), 'qc_tg').v, 7, 1e-9, 'MPa');
  check('qc Danziger, Viana da Fonseca N=10', item(one(run('qc', { N: 10 }), 'qc_danziger'), 'Viana da Fonseca').v, 7, 1e-9, 'MPa');
  check('Kv σadm N/5 (argila siltosa), N=10 → σ = 2,0 kgf/cm²', item(one(run('Kv', { N: 10, soil: 'argila_silt' }), 'kv_moraes1978'), 'N/5').v, SPT.morrisonKv(2.0).kv, 1e-9, 'kgf/cm³');
  check('Navfac Su = N/(2A), A = 13,5, N=27', item(one(run('cu', { N: 27, soil: 'argila_silt' }), 'cu_navfac'), '13,5 · Su').v, 1, 1e-9, 't/ft²');
  check('t/ft² → kN/m² (107,3)', SPT.convertValue({ t: 'pt', v: 1, u: 't/ft²' }, 'kN/m²').v, 107.3, 1e-9, 'kN/m²');
  check('Clayton et al. (1995) N60=8 → duas classes', SPT.claytonClass(8).length, 2, 0, '');
  check('Clayton et al. (1995) N60=10 → firme', SPT.claytonClass(10)[0].startsWith('firme') ? 1 : 0, 1, 0, '');
  check('N não inteiro usa o inteiro mais próximo (Alonso 2010, N=4,6 → 5 a 8)', one(run('c', { N: 4.6, soil: 'argila_silt' }), 'c_alonso2010').lo, 25, 0, 'kPa');
}

/* ---- Tabela de Morrison */
check('Morrison σ=1,00', SPT.morrisonKv(1.0).kv, 2.2, 1e-9, 'kgf/cm³');
check('Morrison σ=2,00', SPT.morrisonKv(2.0).kv, 4.0, 1e-9, 'kgf/cm³');
check('Morrison σ=4,00', SPT.morrisonKv(4.0).kv, 8.0, 1e-9, 'kgf/cm³');
check('Morrison σ=0,525 (interp.)', SPT.morrisonKv(0.525).kv, (1.30 + 1.39) / 2, 1e-9, 'kgf/cm³');
check('Morrison σ=0,20 (extrap.)', SPT.morrisonKv(0.2).kv, 2.6 * 0.2, 1e-9, 'kgf/cm³');
check('Morrison σ=5,00 (extrap.)', SPT.morrisonKv(5.0).kv, 10.0, 1e-9, 'kgf/cm³');

/* ---- Terzaghi */
check('Terzaghi argila B=100cm k30=2,4', SPT.terzaghiCorr('argila', 2.4, 1.0), 0.72, 1e-9, 'kgf/cm³');
check('Terzaghi areia B=30cm (kv = k30)', SPT.terzaghiCorr('areia', 4.2, 0.3), 4.2, 1e-9, 'kgf/cm³');

/* ---- Mindlin: caso limite n = 0, m = 1 → centro de quadrado flexível, 1,12·p·B·(1−ν²)/E, com B = 2b */
{
  const b = 100, E = 500, nu = 0.3;
  const d0 = SPT.mindlinD(1, b, b, 0, E, nu).d;
  const ref = (1.122 * (2 * b) * (1 - nu * nu)) / E; // fórmula clássica
  check('Mindlin d(0) quadrado vs 1,122·B·p·(1−ν²)/E', d0, ref, 0.002 * ref, 'cm');
  const dz = SPT.mindlinD(1, b, b, 4 * b, E, nu).d;
  check('Mindlin d(z) decresce com z (positivo e menor que d(0))', dz > 0 && dz < d0 ? 1 : 0, 1, 0, '');
}

/* ---- Cobertura: todos os métodos rodam para todos os parâmetros e solos, sem exceção ---- */
{
  let n = 0, bad = 0;
  SPT.PARAMS.forEach((p) => {
    SPT.SOILS.forEach((s) => {
      [0, 1, 2, 4, 5, 8, 13, 18, 19, 25, 40, 41, 60].forEach((N) => {
        const out = SPT.compute(p.key, { N, soil: s.key, B: 2, L: 3, sel: { beton: '5', k30: '1', e0: '2' } });
        out.results.forEach((r) => {
          n++;
          const v = r.value;
          const finite = (x) => Number.isFinite(x);
          const okv = v && (v.t === 'na' || v.t === 'txt' || (v.t === 'pt' && finite(v.v)) || (v.t === 'rng' && finite(v.lo) && finite(v.hi)) || (v.t === 'gt' && finite(v.v)) || (v.t === 'cmp' && finite(v.v)) ||
            (v.t === 'multi' && v.items.every((i) => i.val.t !== 'pt' || finite(i.val.v))));
          if (!okv) { bad++; console.log('  valor inválido:', p.key, s.key, N, r.id, JSON.stringify(v)); }
        });
      });
    });
  });
  check('Cobertura (' + n + ' cálculos sem valor inválido)', bad, 0, 0, '');
}

/* ---- Saída */
const w = (s, n) => String(s).padEnd(n);
rows.forEach((r) => {
  const f = (x) => (typeof x === 'number' ? (Math.abs(x) >= 100 ? x.toFixed(1) : x.toPrecision(5)) : x);
  console.log(w(r[0], 5), w(r[1], 62), w(f(r[2]), 12), w(f(r[3]), 12), r[4]);
});
console.log(fails ? `\n${fails} verificação(ões) com erro.` : `\nTodas as ${rows.length} verificações passaram.`);
process.exit(fails ? 1 : 0);
