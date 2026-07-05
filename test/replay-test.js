// Replay round-trip: record 60s of a solo game, play it back in a fresh
// instance, verify entities advance and playback ends cleanly.
const fs = require('fs'), vm = require('vm'), path = require('path');
const js = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')
  .match(/<script>([\s\S]*)<\/script>/)[1];

const noop = () => {};
function seededMath(seed) {
  let a = seed >>> 0;
  const M = Object.create(Math);
  M.random = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return M;
}
function mkSb(name) {
  const ctxStub = new Proxy(function () {}, {
    get: (t, p) => (p === Symbol.toPrimitive ? undefined : ctxStub),
    set: () => true, apply: () => ctxStub,
  });
  function makeEl() {
    return {
      style: {}, innerHTML: '', textContent: '', children: [],
      classList: { toggle: noop, contains: () => false, add: noop },
      appendChild(c) { this.children.push(c); },
      removeChild(c) { this.children = this.children.filter(x => x !== c); },
      get firstChild() { return this.children[0]; },
      onclick: null, getContext: () => ctxStub, addEventListener: noop,
    };
  }
  const els = {};
  const sb = {
    console, setTimeout, clearTimeout, Math: seededMath(42), JSON,
    performance: { now: () => sb.__now },
    requestAnimationFrame: cb => { sb.__raf = cb; },
    addEventListener: noop, innerWidth: 1440, innerHeight: 900, window: {},
    document: { getElementById: id => (els[id] ||= makeEl()), createElement: () => makeEl() },
    __now: 0, __raf: null,
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(js, sb, { filename: name + '.js' });
  return sb;
}

const rec = mkSb('rec');
vm.runInContext('startSolo()', rec);
for (let f = 0; f < 1200; f++) { rec.__now += 50; const cb = rec.__raf; rec.__raf = null; cb(rec.__now); }
const data = vm.runInContext('JSON.stringify({v:1,players:PLAYERS,snaps:REC.snaps})', rec);
console.log('recorded snaps:', JSON.parse(data).snaps.length, 'bytes:', data.length);

const play = mkSb('play');
vm.runInContext(`startReplay(JSON.parse(${JSON.stringify(data)}))`, play);
let peaked = 0;
for (let f = 0; f < 1400; f++) {
  play.__now += 50; const cb = play.__raf; play.__raf = null; cb(play.__now);
  peaked = Math.max(peaked, vm.runInContext('units.length', play));
}
const end = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent,spect:SPECT})', play);
console.log('end:', JSON.stringify(end), 'peak units:', peaked);
if (!end.over || end.title !== 'REPLAY ENDED' || !end.spect || peaked < 8) { console.error('FAIL'); process.exit(1); }
console.log('REPLAY TEST OK — recorded, played back, ended cleanly');
