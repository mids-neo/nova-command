// Headless smoke test: stub DOM/canvas, run the game loop, watch for crashes.
const fs = require('fs');
const vm = require('vm');

const noop = () => {};
function seededMath(seed){
  let a=seed>>>0;
  const M=Object.create(Math);
  M.random=()=>{ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  return M;
}

// Callable self-returning proxy: any property access or call yields the proxy,
// so gradient chains (createRadialGradient().addColorStop()) work in the stub.
const ctxStub = new Proxy(function () {}, {
  get: (t, p) => (p === Symbol.toPrimitive ? undefined : ctxStub),
  set: () => true,
  apply: () => ctxStub,
});
function makeEl() {
  return {
    style: {}, innerHTML: '', textContent: '',
    children: [],
    classList: { toggle: noop, contains: () => false, add: noop },
    appendChild(c) { this.children.push(c); },
    removeChild(c) { this.children = this.children.filter(x => x !== c); },
    get firstChild() { return this.children[0]; },
    onclick: null,
    getContext: () => ctxStub,
    addEventListener: noop,
  };
}
const els = {};
const canvasEl = Object.assign(makeEl(), {
  getContext: () => ctxStub,
  addEventListener: noop,
  width: 0, height: 0,
});

let rafCb = null;
const sandbox = {
  console, setTimeout, clearTimeout, Math: seededMath(42), JSON,
  performance: { now: () => simNow },
  requestAnimationFrame: cb => { rafCb = cb; },
  addEventListener: noop,
  innerWidth: 1440, innerHeight: 900,
  window: {},
  document: {
    getElementById: id => (id === 'game' ? canvasEl : (els[id] ||= makeEl())),
    createElement: () => makeEl(),
  },
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const html = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*)<\/script>/)[1];

let simNow = 0;
vm.runInContext(js, sandbox, { filename: 'game.js' });
vm.runInContext('startSolo()', sandbox);

// Drive the loop: 24000 frames x 50ms = 20 sim-minutes
let frames = 0;
try {
  while (frames < 24000 && rafCb) {
    simNow += 50;
    const cb = rafCb; rafCb = null;
    cb(simNow);
    frames++;
    if (frames % 4800 === 0) {
      const t = vm.runInContext('({time, units: units.length, buildings: buildings.length, gameOver, pM: res[0].m, aiM: res[1].m, waveSize: ai.waveSize})', sandbox);
      console.log(`t=${Math.round(t.time)}s units=${t.units} buildings=${t.buildings} playerMin=${Math.round(t.pM)} aiMin=${Math.round(t.aiM)} wave=${t.waveSize} over=${t.gameOver}`);
    }
    if (vm.runInContext('gameOver', sandbox)) {
      const t = vm.runInContext('({time, title: document.getElementById("overTitle").textContent})', sandbox);
      console.log(`GAME OVER at t=${Math.round(t.time)}s → "${t.title}" (player was idle, so DEFEAT expected)`);
      break;
    }
  }
  console.log(`SMOKE OK — ${frames} frames, no runtime errors`);
} catch (e) {
  console.error(`CRASH at frame ${frames}:`, e);
  process.exit(1);
}
