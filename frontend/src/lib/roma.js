export const ROMA_COORDS = {"Appio-Latino":[41.866,12.516],"Aurelio":[41.898,12.430],"Aventino":[41.882,12.480],"Balduina":[41.918,12.435],"Centocelle":[41.886,12.567],"Centro Storico":[41.898,12.476],"Cinecittà":[41.857,12.575],"Della Vittoria":[41.918,12.453],"Esquilino":[41.895,12.503],"EUR":[41.831,12.469],"Flaminio":[41.926,12.476],"Garbatella":[41.864,12.488],"Gianicolense":[41.880,12.456],"Marconi":[41.852,12.464],"Monte Sacro":[41.945,12.532],"Monteverde":[41.881,12.456],"Monti":[41.895,12.494],"Nomentano":[41.912,12.516],"Ostiense":[41.870,12.476],"Parioli":[41.921,12.494],"Pigneto":[41.886,12.534],"Pinciano":[41.913,12.492],"Portuense":[41.860,12.455],"Prati":[41.910,12.466],"Prenestino":[41.890,12.555],"Salario":[41.918,12.499],"San Giovanni":[41.886,12.510],"San Lorenzo":[41.901,12.515],"San Paolo":[41.857,12.475],"Talenti":[41.937,12.547],"Testaccio":[41.879,12.476],"Tiburtino":[41.913,12.547],"Tor di Quinto":[41.946,12.475],"Trastevere":[41.889,12.469],"Trieste":[41.917,12.510],"Trionfale":[41.929,12.450],"Tuscolano":[41.870,12.530]};
export const ROMA_CENTER = [41.9028, 12.4964];

export function nearestQuartiere(lat, lng) {
  let best = null, bestD = Infinity;
  for (const [name, [la, ln]] of Object.entries(ROMA_COORDS)) {
    const d = (la - lat) ** 2 + (ln - lng) ** 2;
    if (d < bestD) { bestD = d; best = name; }
  }
  return best;
}
