// Smoke test 2: scripted competent player — expect VICTORY.
// Covers: supply/depots, barracks x2, factory + siege, an attack upgrade, defend-then-push.
const fs = require('fs');
const vm = require('vm');

const noop = () => {};
function seededMath(seed){
  let a=seed>>>0;
  const M=Object.create(Math);
  M.random=()=>{ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  return M;
}

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
const canvasEl = Object.assign(makeEl(), { width: 0, height: 0 });

let rafCb = null;
let simNow = 0;
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
vm.runInContext(js, sandbox, { filename: 'game.js' });
vm.runInContext('startSolo()', sandbox);

const driver = `
(function(){
  const cc=buildings.find(b=>b.owner===0&&b.type==='command'&&!b.dead&&b.done);
  if(!cc) return {dead:true};
  const w=units.filter(u=>u.owner===0&&!u.dead&&u.type==='worker');
  if(w.length<8 && cc.queue.length===0) train(cc,'worker');
  // depots when supply-tight
  const su=supplyUsed(0), sc=supplyCap(0);
  const depotPending=buildings.some(b=>b.owner===0&&!b.dead&&b.type==='depot'&&!b.done);
  if(su>=sc-1&&sc<60&&!depotPending&&res[0].m>=100){
    for(let k=0;k<10;k++){
      const x=cc.x-160+k*80, y=cc.y+300;
      if(placementValid('depot',x,y)){
        res[0].m-=100;
        const b=makeBuilding(0,'depot',x,y,false); buildings.push(b);
        const wb=w.find(q=>q.order&&q.order.kind==='harvest'); if(wb)wb.order={kind:'build',b};
        break;
      }
    }
  }
  const raxes=buildings.filter(b=>b.owner===0&&b.type==='barracks'&&!b.dead);
  if(!raxes.length && res[0].m>=150 && time>5){
    const x=cc.x+60, y=cc.y+190;
    if(placementValid('barracks',x,y)){
      res[0].m-=150;
      const b=makeBuilding(0,'barracks',x,y,false); buildings.push(b);
      if(w[0]) w[0].order={kind:'build',b};
    }
  }
  if(raxes.length===1&&raxes[0].done&&res[0].m>=350){
    const x=cc.x+60, y=cc.y-190;
    if(placementValid('barracks',x,y)){
      res[0].m-=150;
      const b=makeBuilding(0,'barracks',x,y,false); buildings.push(b);
      if(w[1]) w[1].order={kind:'build',b};
    }
  }
  const fac=buildings.find(b=>b.owner===0&&b.type==='factory'&&!b.dead);
  if(!fac&&raxes.length>=2&&res[0].m>=350){
    for(let k=0;k<8;k++){
      const x=cc.x+190+k*60, y=cc.y+190;
      if(placementValid('factory',x,y)){
        res[0].m-=200;
        const b=makeBuilding(0,'factory',x,y,false); buildings.push(b);
        const wb=w.find(q=>q.order&&q.order.kind==='harvest'); if(wb)wb.order={kind:'build',b};
        break;
      }
    }
  }
  for(const r of raxes){ if(r.done && r.queue.length<2) train(r,'marine'); }
  if(fac&&fac.done&&fac.queue.length<1) train(fac,'siege');
  if(time>200&&atkLvl[0]<1&&cc.queue.length===0&&res[0].m>=150) startUpgrade(cc,'atk');
  const m=units.filter(u=>u.owner===0&&!u.dead&&u.type!=='worker');
  const ecc=buildings.find(b=>b.owner===1&&b.type==='command'&&!b.dead);
  const intruder=units.find(u=>u.owner===1&&!u.dead&&Math.hypot(u.x-cc.x,u.y-cc.y)<520);
  if(intruder){
    for(const u of m) u.order={kind:'attackmove',x:intruder.x,y:intruder.y};
  } else {
    if(time>320 && m.length>=22) globalThis.__attacked = true;
    if(globalThis.__attacked && ecc){
      for(const u of m){ if(!u.order) u.order={kind:'attackmove',x:ecc.x,y:ecc.y}; }
    }
  }
  return {w:w.length, army:m.length, su, sc, min:Math.round(res[0].m), atk:atkLvl[0], attacked:!!globalThis.__attacked};
})()
`;

let frames = 0;
try {
  while (frames < 36000 && rafCb) { // up to 30 sim-minutes
    simNow += 50;
    const cb = rafCb; rafCb = null;
    cb(simNow);
    frames++;
    if (frames % 10 === 0) vm.runInContext(driver, sandbox);
    if (frames % 3600 === 0) {
      const s = vm.runInContext(driver, sandbox);
      const t = vm.runInContext('Math.round(time)', sandbox);
      console.log(`t=${t}s`, JSON.stringify(s));
    }
    if (vm.runInContext('gameOver', sandbox)) {
      const t = vm.runInContext('({time, title: document.getElementById("overTitle").textContent})', sandbox);
      console.log(`GAME OVER at t=${Math.round(t.time)}s → "${t.title}"`);
      if (t.title !== 'VICTORY') { console.error('EXPECTED VICTORY'); process.exit(1); }
      break;
    }
  }
  if (!vm.runInContext('gameOver', sandbox)) { console.error('Never finished — stalemate?'); process.exit(1); }
  console.log(`SMOKE2 OK — ${frames} frames, no runtime errors, player victory achieved`);
} catch (e) {
  console.error(`CRASH at frame ${frames}:`, e);
  process.exit(1);
}
