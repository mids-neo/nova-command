// End-to-end 2-player test: host + guest sandboxes, connections wired via JSON.
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
const guest = makeSandbox('guest');
const toGuest = [], toHost = [];

// Wire fake connections (send = JSON round-trip into the other realm's queue)
vm.runInContext(`
  NET.on=true; NET.guest=false; ME=0; PLAYERS=2;
  globalThis.__out=[];
  NET.conns=[{send:o=>globalThis.__out.push(JSON.stringify(o)),__owner:1}];
  resetGame(); startMP();
  broadcast({t:'start',owner:1,players:2}); sendSnap();
`, host);
vm.runInContext(`
  NET.on=true; NET.guest=true;
  NET.conn={send:o=>globalThis.__out.push(JSON.stringify(o))};
  globalThis.__out=[];
`, guest);

function pump() {
  let m;
  while ((m = vm.runInContext('globalThis.__out.shift()', host))) {
    vm.runInContext(`onGuestData(JSON.parse(${JSON.stringify(m)}))`, guest);
  }
  while ((m = vm.runInContext('globalThis.__out.shift()', guest))) {
    vm.runInContext(`applyCmd(JSON.parse(${JSON.stringify(m)}),1)`, host);
  }
}

// host player script (blue): economy + defend + push at 260s with 16 marines
const hostDriver = `
(function(){
  const cc=buildings.find(b=>b.owner===0&&b.type==='command'&&!b.dead);
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
  if(!raxes.length&&res[0].m>=150&&time>5){
    const x=cc.x+60,y=cc.y+190;
    if(placementValid('barracks',x,y)){res[0].m-=150;const b=makeBuilding(0,'barracks',x,y,false);buildings.push(b);if(w[0])w[0].order={kind:'build',b};}
  }
  for(const r of raxes){if(r.done&&r.queue.length<2)train(r,'marine');}
  const m=units.filter(u=>u.owner===0&&!u.dead&&u.type==='marine');
  const ecc=buildings.find(b=>b.owner===1&&b.type==='command'&&!b.dead);
  const intr=units.find(u=>u.owner===1&&!u.dead&&Math.hypot(u.x-cc.x,u.y-cc.y)<520);
  if(intr){for(const u of m)u.order={kind:'attackmove',x:intr.x,y:intr.y};}
  else{
    if(time>260&&m.length>=16)globalThis.__atk=true;
    if(globalThis.__atk&&ecc)for(const u of m){if(!u.order)u.order={kind:'attackmove',x:ecc.x,y:ecc.y};}
  }
})()`;

// guest player script (red): drives the REAL guest-side UI paths on mirrored state.
// Exercises: uiTrain (net train), tryPlace (net place), issueMove (net attack-move),
// then goes passive so the host's push is decisive and the 'over' path fires.
const guestDriver = `
(function(){
  const cc=buildings.find(b=>b.owner===1&&b.type==='command'&&!b.dead);
  if(!cc)return;
  const w=units.filter(u=>u.owner===1&&!u.dead&&u.type==='worker');
  if(w.length<8&&cc.queue.length===0&&res[1].m>=50)uiTrain(cc,'worker');
  if(gSu>=gSc-1&&res[1].m>=100&&!buildings.some(b=>b.owner===1&&!b.dead&&b.type==='depot')){
    sel=[w[0]].filter(Boolean);
    placing='depot';
    mouse.wx=cc.x+40; mouse.wy=cc.y+300;
    tryPlace();
  }
  const raxes=buildings.filter(b=>b.owner===1&&b.type==='barracks'&&!b.dead);
  if(!raxes.length&&res[1].m>=150&&time>5){
    sel=[w[0]].filter(Boolean);
    placing='barracks';
    mouse.wx=cc.x-60; mouse.wy=cc.y+190;
    tryPlace();
  }
  const m=units.filter(u=>u.owner===1&&!u.dead&&u.type==='marine');
  for(const r of raxes){if(r.done&&r.queue.length<1&&res[1].m>=60&&m.length<3&&!globalThis.__raided)uiTrain(r,'marine');}
  if(m.length>=3&&time>100&&!globalThis.__raided){
    globalThis.__raided=true;
    sel=m; issueMove(m,400,900,true); // doomed raid on the host base — exercises orders + deaths
  }
})()`;

let frames = 0;
try {
  while (frames < 36000) {
    // advance both loops 50ms
    for (const sb of [host, guest]) {
      sb.__now += 50;
      const cb = sb.__raf; sb.__raf = null;
      if (cb) cb(sb.__now);
    }
    pump();
    frames++;
    if (frames % 10 === 0) { vm.runInContext(hostDriver, host); vm.runInContext(guestDriver, guest); pump(); }
    if (frames % 3600 === 0) {
      const h = vm.runInContext('({t:Math.round(time),u:units.length,b:buildings.length,m0:units.filter(u=>u.owner===0&&u.type==="marine").length,m1:units.filter(u=>u.owner===1&&u.type==="marine").length})', host);
      const g = vm.runInContext('({u:units.length,b:buildings.length,rm:Math.floor(res[1].m)})', guest);
      console.log(`t=${h.t}s host{units:${h.u},bld:${h.b},m0:${h.m0},m1:${h.m1}} guest-mirror{units:${g.u},bld:${g.b},minerals:${g.rm}}`);
      if (h.u !== g.u || h.b !== g.b) { console.error('DESYNC: entity counts differ'); process.exit(1); }
    }
    if (vm.runInContext('gameOver', host)) { pump(); break; }
  }
  const hOver = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent,t:Math.round(time)})', host);
  const gOver = vm.runInContext('({over:gameOver,title:document.getElementById("overTitle").textContent})', guest);
  console.log(`host: over=${hOver.over} "${hOver.title}" at ${hOver.t}s · guest: over=${gOver.over} "${gOver.title}"`);
  if (!hOver.over || !gOver.over) { console.error('FAIL: game did not end on both sides'); process.exit(1); }
  if (hOver.title === gOver.title) { console.error('FAIL: both sides got the same result'); process.exit(1); }
  console.log('MP TEST OK — guest mirrored state, commands flowed, opposite outcomes delivered');
} catch (e) {
  console.error(`CRASH at frame ${frames}:`, e);
  process.exit(1);
}
