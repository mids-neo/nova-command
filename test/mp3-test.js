// 3-player FFA end-to-end test: host + 2 guests. Host wipes both guests.
// Verifies: 3-way state sync, elimination event mid-game (guest A spectates),
// final over delivered to all with correct outcomes.
const fs = require('fs'), vm = require('vm');
const js = fs.readFileSync(require('path').join(__dirname,'..','index.html'), 'utf8')
  .match(/<script>([\s\S]*)<\/script>/)[1];

const noop = () => {};
function seededMath(seed){
  let a=seed>>>0;
  const M=Object.create(Math);
  M.random=()=>{ a|=0; a=(a+0x6D2B79F5)|0; let t=Math.imul(a^(a>>>15),1|a); t=(t+Math.imul(t^(t>>>7),61|t))^t; return ((t^(t>>>14))>>>0)/4294967296; };
  return M;
}

function makeSandbox(name) {
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
    __now: 0, __raf: null, __name: name,
  };
  sb.globalThis = sb;
  vm.createContext(sb);
  vm.runInContext(js, sb, { filename: name + '.js' });
  return sb;
}

const host = makeSandbox('host');
const gA = makeSandbox('guestA');
const gB = makeSandbox('guestB');

vm.runInContext(`
  NET.on=true; NET.guest=false; ME=0; PLAYERS=3;
  globalThis.__outA=[]; globalThis.__outB=[];
  NET.conns=[
    {send:o=>globalThis.__outA.push(JSON.stringify(o)),__owner:1},
    {send:o=>globalThis.__outB.push(JSON.stringify(o)),__owner:2}
  ];
  resetGame(); startMP();
  NET.conns[0].send({t:'start',owner:1,players:3});
  NET.conns[1].send({t:'start',owner:2,players:3});
  sendSnap();
`, host);
for (const g of [gA, gB]) {
  vm.runInContext(`
    NET.on=true; NET.guest=true;
    NET.conn={send:o=>globalThis.__out.push(JSON.stringify(o))};
    globalThis.__out=[];
  `, g);
}

function pump() {
  let m;
  while ((m = vm.runInContext('globalThis.__outA.shift()', host)))
    vm.runInContext(`onGuestData(JSON.parse(${JSON.stringify(m)}))`, gA);
  while ((m = vm.runInContext('globalThis.__outB.shift()', host)))
    vm.runInContext(`onGuestData(JSON.parse(${JSON.stringify(m)}))`, gB);
  while ((m = vm.runInContext('globalThis.__out.shift()', gA)))
    vm.runInContext(`applyCmd(JSON.parse(${JSON.stringify(m)}),1)`, host);
  while ((m = vm.runInContext('globalThis.__out.shift()', gB)))
    vm.runInContext(`applyCmd(JSON.parse(${JSON.stringify(m)}),2)`, host);
}

// host (blue): full macro, then sweeps enemy CCs nearest-first
const hostDriver = `
(function(){
  const cc=buildings.find(b=>b.owner===0&&b.type==='command'&&!b.dead&&b.done);
  if(!cc)return;
  const w=units.filter(u=>u.owner===0&&!u.dead&&u.type==='worker');
  if(w.length<8&&cc.queue.length===0)train(cc,'worker');
  const su=supplyUsed(0), sc=supplyCap(0);
  const depotPending=buildings.some(b=>b.owner===0&&!b.dead&&b.type==='depot'&&!b.done);
  if(su>=sc-1&&sc<60&&!depotPending&&res[0].m>=100){
    for(let k=0;k<10;k++){
      const x=cc.x-160+k*80, y=cc.y+300;
      if(placementValid('depot',x,y)){res[0].m-=100;const b=makeBuilding(0,'depot',x,y,false);buildings.push(b);const wb=w.find(q=>q.order&&q.order.kind==='harvest');if(wb)wb.order={kind:'build',b};break;}
    }
  }
  const raxes=buildings.filter(b=>b.owner===0&&b.type==='barracks'&&!b.dead);
  if(raxes.length<2&&res[0].m>=150&&time>5){
    const x=cc.x+60,y=cc.y+190+raxes.length*90;
    if(placementValid('barracks',x,y)){res[0].m-=150;const b=makeBuilding(0,'barracks',x,y,false);buildings.push(b);if(w[0])w[0].order={kind:'build',b};}
  }
  for(const r of raxes){if(r.done&&r.queue.length<2)train(r,'marine');}
  const m=units.filter(u=>u.owner===0&&!u.dead&&u.type!=='worker');
  const eccs=buildings.filter(b=>b.owner!==0&&!b.dead&&b.type==='command')
    .sort((a,b)=>Math.hypot(a.x-cc.x,a.y-cc.y)-Math.hypot(b.x-cc.x,b.y-cc.y));
  const intr=units.find(u=>u.owner!==0&&!u.dead&&Math.hypot(u.x-cc.x,u.y-cc.y)<520);
  if(intr){for(const u of m)u.order={kind:'attackmove',x:intr.x,y:intr.y};}
  else{
    if(time>240&&m.length>=16)globalThis.__atk=true;
    if(globalThis.__atk&&eccs.length)for(const u of m){if(!u.order)u.order={kind:'attackmove',x:eccs[0].x,y:eccs[0].y};}
  }
})()`;

// guests: workers only (passive victims), exercising net train
const guestDriver = o => `
(function(){
  const cc=buildings.find(b=>b.owner===${o}&&b.type==='command'&&!b.dead);
  if(!cc)return;
  const w=units.filter(u=>u.owner===${o}&&!u.dead&&u.type==='worker');
  if(w.length<8&&cc.queue.length===0&&res[${o}].m>=50)uiTrain(cc,'worker');
})()`;

let frames = 0, sawElim = false;
try {
  while (frames < 36000) {
    for (const sb of [host, gA, gB]) {
      sb.__now += 50;
      const cb = sb.__raf; sb.__raf = null;
      if (cb) cb(sb.__now);
    }
    pump();
    frames++;
    if (frames % 10 === 0) {
      vm.runInContext(hostDriver, host);
      vm.runInContext(guestDriver(1), gA);
      vm.runInContext(guestDriver(2), gB);
      pump();
    }
    if (frames % 3600 === 0) {
      const h = vm.runInContext('({t:Math.round(time),u:units.length,b:buildings.length})', host);
      const a = vm.runInContext('({u:units.length,b:buildings.length,spect:SPECT})', gA);
      const b2 = vm.runInContext('({u:units.length,b:buildings.length,spect:SPECT})', gB);
      console.log(`t=${h.t}s host{u:${h.u},b:${h.b}} gA{u:${a.u},b:${a.b},spect:${a.spect}} gB{u:${b2.u},b:${b2.b},spect:${b2.spect}}`);
      if (h.u !== a.u || h.b !== a.b || h.u !== b2.u || h.b !== b2.b) {
        console.error('DESYNC across 3 players'); process.exit(1);
      }
    }
    if (!sawElim) {
      for (const [g, name] of [[gA, 'A'], [gB, 'B']]) {
        if (vm.runInContext('SPECT', g)) {
          sawElim = true;
          console.log(`frame ${frames}: guest ${name} eliminated and spectating — game continues`);
          if (vm.runInContext('gameOver', g)) { console.error('FAIL: eliminated guest got game-over early'); process.exit(1); }
          break;
        }
      }
    }
    if (vm.runInContext('gameOver', host)) { pump(); break; }
  }
  const h = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent,t:Math.round(time)})', host);
  const a = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent,stats:!!stats})', gA);
  const b = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent})', gB);
  console.log(`host: "${h.title}" at ${h.t}s · guestA: "${a.title}" (stats:${a.stats}) · guestB: "${b.title}"`);
  if (!sawElim) { console.error('FAIL: no mid-game elimination observed'); process.exit(1); }
  if (h.title !== 'VICTORY' || a.title !== 'DEFEAT' || b.title !== 'DEFEAT') { console.error('FAIL: wrong outcomes'); process.exit(1); }
  console.log('MP3 TEST OK — 3-way sync, elimination + spectate, correct outcomes for all');
} catch (e) {
  console.error(`CRASH at frame ${frames}:`, e);
  process.exit(1);
}
