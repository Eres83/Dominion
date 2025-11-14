
// Utils
function deepClone(o){return JSON.parse(JSON.stringify(o));}
function $(id){return document.getElementById(id);}
function formatNumber(n){return Math.floor(n).toLocaleString("fr-FR");}
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}

// State
const defaultState = {
  playerName:"Commandant",
  planetName:"Nova Prime",
  coords:"1:1:1",
  resources:{metal:500, crystal:300, deuterium:0, energy:0},
  buildings:{metalMine:1, crystalMine:1, deuteriumSynth:0, solarPlant:1, roboFactory:0, researchLab:0, shipyard:0, storageMetal:0, storageCrystal:0},
  research:{energyTech:0, combustionDrive:0, armorTech:0, weaponsTech:0},
  ships:{smallCargo:0, lightFighter:0, recycler:0, probe:0},
  enemy:{bossWindowStart:Date.now(), bossAttacks:[], bossLog:[]},
  lastUpdate:Date.now()
};

let state = loadState();

function loadState(){
  try{
    const s = localStorage.getItem("sd_v2_save");
    if(s){
      const parsed = JSON.parse(s);
      const base = deepClone(defaultState);
      Object.assign(base, parsed);
      base.resources = Object.assign({}, defaultState.resources, parsed.resources||{});
      base.buildings = Object.assign({}, defaultState.buildings, parsed.buildings||{});
      base.research  = Object.assign({}, defaultState.research, parsed.research ||{});
      base.ships     = Object.assign({}, defaultState.ships, parsed.ships    ||{});
      base.enemy     = Object.assign({}, defaultState.enemy, parsed.enemy    ||{});
      if(!Array.isArray(base.enemy.bossAttacks)) base.enemy.bossAttacks = [];
      if(!Array.isArray(base.enemy.bossLog))     base.enemy.bossLog     = [];
      return base;
    }
  }catch(e){console.error("load error",e);}
  return deepClone(defaultState);
}

function saveState(){
  try{ localStorage.setItem("sd_v2_save", JSON.stringify(state)); }
  catch(e){ console.error("save error",e); }
}

function ensureEnemyState(){
  if(!state.enemy) state.enemy = deepClone(defaultState.enemy);
  if(!Array.isArray(state.enemy.bossAttacks)) state.enemy.bossAttacks = [];
  if(!Array.isArray(state.enemy.bossLog))     state.enemy.bossLog     = [];
  if(!state.enemy.bossWindowStart)            state.enemy.bossWindowStart = Date.now();
}

// Production
function buildingLevel(name){return state.buildings[name]||0;}
function getProductionPerHour(){
  const m = buildingLevel("metalMine");
  const c = buildingLevel("crystalMine");
  const d = buildingLevel("deuteriumSynth");
  return {
    metalPerHour:     m>0?30*m*Math.pow(1.1,m):0,
    crystalPerHour:   c>0?20*c*Math.pow(1.1,c):0,
    deuteriumPerHour: d>0?10*d*Math.pow(1.1,d):0
  };
}
function tickResources(){
  const now = Date.now();
  const deltaMs = now - state.lastUpdate;
  if(deltaMs<=0) return;
  const deltaH = deltaMs/(1000*60*60);
  const p = getProductionPerHour();
  state.resources.metal     += p.metalPerHour*deltaH;
  state.resources.crystal   += p.crystalPerHour*deltaH;
  state.resources.deuterium += p.deuteriumPerHour*deltaH;
  state.resources.energy     = buildingLevel("solarPlant")*50;
  state.lastUpdate = now;
}

// Static data (same as avant, abrégé)
function getBuildingData(){
  return {
    metalMine:{name:"Mine de métal",desc:"Augmente la production de métal.",baseCost:{metal:60,crystal:15},costFactor:1.5,depends:null,category:"resources"},
    crystalMine:{name:"Mine de cristal",desc:"Augmente la production de cristal.",baseCost:{metal:48,crystal:24},costFactor:1.6,depends:null,category:"resources"},
    deuteriumSynth:{name:"Synthétiseur de deutérium",desc:"Produit du deutérium.",baseCost:{metal:225,crystal:75},costFactor:1.5,depends:{solarPlant:1},category:"resources"},
    solarPlant:{name:"Centrale solaire",desc:"Fournit de l'énergie.",baseCost:{metal:75,crystal:30},costFactor:1.5,depends:null,category:"resources"},
    roboFactory:{name:"Usine de robots",desc:"Réduit le temps de construction (symbolique).",baseCost:{metal:400,crystal:120},costFactor:2,depends:null,category:"facilities"},
    researchLab:{name:"Laboratoire de recherche",desc:"Permet la recherche.",baseCost:{metal:200,crystal:400},costFactor:2,depends:null,category:"facilities"},
    shipyard:{name:"Chantier spatial",desc:"Permet la construction de vaisseaux.",baseCost:{metal:400,crystal:200},costFactor:2,depends:{roboFactory:1},category:"facilities"},
    storageMetal:{name:"Hangar de métal",desc:"Augmente le stockage métal.",baseCost:{metal:200,crystal:0},costFactor:1.8,depends:null,category:"facilities"},
    storageCrystal:{name:"Hangar de cristal",desc:"Augmente le stockage cristal.",baseCost:{metal:150,crystal:50},costFactor:1.8,depends:null,category:"facilities"}
  };
}

function getResearchData(){
  return {
    energyTech:{name:"Technologie énergétique",desc:"Améliore l'efficacité énergétique.",baseCost:{metal:0,crystal:400,deuterium:0},factor:2,depends:{researchLab:1}},
    combustionDrive:{name:"Propulsion à combustion",desc:"Vaisseaux plus rapides.",baseCost:{metal:400,crystal:0,deuterium:600},factor:2,depends:{researchLab:1}},
    armorTech:{name:"Technologie de blindage",desc:"Renforce le blindage.",baseCost:{metal:1000,crystal:0,deuterium:0},factor:2,depends:{researchLab:2}},
    weaponsTech:{name:"Technologie d'armement",desc:"Augmente la puissance de feu.",baseCost:{metal:800,crystal:200,deuterium:0},factor:2,depends:{researchLab:2}}
  };
}

function getShipData(){
  return {
    smallCargo:{name:"Petit transporteur",desc:"Transport de ressources.",cost:{metal:2000,crystal:2000,deuterium:0}},
    lightFighter:{name:"Chasseur léger",desc:"Unité d'attaque.",cost:{metal:3000,crystal:1000,deuterium:0}},
    recycler:{name:"Recycleur",desc:"Récupère des débris.",cost:{metal:10000,crystal:6000,deuterium:2000}},
    probe:{name:"Sonde d'espionnage",desc:"Collecte des infos.",cost:{metal:0,crystal:1000,deuterium:0}}
  };
}

// Helpers coûts
function computeCost(baseCost,factor,level){
  const mult = Math.pow(factor,level);
  const cost = {};
  for(const k in baseCost){ cost[k]=baseCost[k]*mult; }
  return cost;
}
function canAfford(cost){
  return Object.entries(cost).every(([res,amount])=>!amount || state.resources[res]>=amount);
}
function payCost(cost){
  for(const [res,amount] of Object.entries(cost)){
    if(!amount) continue;
    state.resources[res]-=amount;
  }
}

// UI
function switchView(id){
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const sec = $("#view-"+id); if(sec) sec.classList.add("active");
  const btn = document.querySelector('.nav-btn[data-view="'+id+'"]'); if(btn) btn.classList.add("active");
}

function updateHeader(){
  const setText = (id,val)=>{ const el=$(id); if(el) el.textContent = val; };
  setText("playerNameDisplay", state.playerName);
  setText("planetName", state.planetName);
  setText("coords", state.coords);
  setText("metalAmount", formatNumber(state.resources.metal));
  setText("crystalAmount", formatNumber(state.resources.crystal));
  setText("deuteriumAmount", formatNumber(state.resources.deuterium));
  setText("energyAmount", formatNumber(state.resources.energy));
  const p = getProductionPerHour();
  setText("metalPerHour", formatNumber(p.metalPerHour));
  setText("crystalPerHour", formatNumber(p.crystalPerHour));
  setText("deuteriumPerHour", formatNumber(p.deuteriumPerHour));
}

function updateServerTime(){
  const el = $("#serverTime");
  if(el) el.textContent = new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}

// Render buildings / research / etc (identiques à ta version, mais robustes)
function renderBuildings(){
  const data = getBuildingData();
  const resCont = $("#buildingsResources");
  const facCont = $("#buildingsFacilities");
  if(!resCont || !facCont) return;
  resCont.innerHTML=""; facCont.innerHTML="";
  Object.entries(data).forEach(([key,info])=>{
    const level = buildingLevel(key);
    const cost = computeCost(info.baseCost, info.costFactor, level);
    const depsOk = info.depends ? Object.entries(info.depends).every(([b,lvl])=>buildingLevel(b)>=lvl) : true;
    const card = document.createElement("div");
    card.className="card";
    const header = document.createElement("div");
    header.className="card-header";
    const title = document.createElement("div");
    title.className="card-title";
    title.textContent = info.name;
    const levelSpan = document.createElement("div");
    levelSpan.className="card-level";
    levelSpan.textContent = "Niveau "+level;
    header.appendChild(title); header.appendChild(levelSpan);
    card.appendChild(header);
    const desc = document.createElement("p");
    desc.textContent = info.desc;
    card.appendChild(desc);
    const costs = document.createElement("div");
    costs.className="costs";
    const parts=[];
    if(cost.metal) parts.push("Métal: "+formatNumber(cost.metal));
    if(cost.crystal) parts.push("Cristal: "+formatNumber(cost.crystal));
    if(cost.deuterium) parts.push("Deutérium: "+formatNumber(cost.deuterium));
    costs.textContent = "Coût: "+(parts.join(" | ")||"—");
    card.appendChild(costs);
    if(!depsOk){
      const dep = document.createElement("div");
      dep.className="badge";
      dep.textContent="Prérequis non remplis";
      card.appendChild(dep);
    }
    const btn = document.createElement("button");
    btn.className="btn";
    btn.textContent="Améliorer";
    btn.disabled = !depsOk || !canAfford(cost);
    btn.addEventListener("click",()=>{
      if(!canAfford(cost)) return;
      payCost(cost);
      state.buildings[key]=level+1;
      saveState();
      tickResources();
      updateHeader();
      renderBuildings();
    });
    card.appendChild(btn);
    if(info.category==="resources") resCont.appendChild(card);
    else facCont.appendChild(card);
  });
}

function renderResearch(){
  const container = $("#researchList");
  if(!container) return;
  container.innerHTML="";
  const data = getResearchData();
  Object.entries(data).forEach(([key,info])=>{
    const level = state.research[key]||0;
    const cost = computeCost(info.baseCost, info.factor, level);
    const depsOk = info.depends ? Object.entries(info.depends).every(([b,lvl])=>buildingLevel(b)>=lvl) : true;
    const card = document.createElement("div");
    card.className="card";
    const header = document.createElement("div");
    header.className="card-header";
    const title = document.createElement("div");
    title.className="card-title";
    title.textContent = info.name;
    const levelSpan = document.createElement("div");
    levelSpan.className="card-level";
    levelSpan.textContent="Niveau "+level;
    header.appendChild(title); header.appendChild(levelSpan);
    card.appendChild(header);
    const desc = document.createElement("p");
    desc.textContent = info.desc;
    card.appendChild(desc);
    const costs = document.createElement("div");
    costs.className="costs";
    const parts=[];
    if(cost.metal) parts.push("Métal: "+formatNumber(cost.metal));
    if(cost.crystal) parts.push("Cristal: "+formatNumber(cost.crystal));
    if(cost.deuterium) parts.push("Deutérium: "+formatNumber(cost.deuterium));
    costs.textContent = "Coût: "+(parts.join(" | ")||"—");
    card.appendChild(costs);
    if(!depsOk){
      const dep = document.createElement("div");
      dep.className="badge";
      dep.textContent="Prérequis: labo insuffisant";
      card.appendChild(dep);
    }
    const btn = document.createElement("button");
    btn.className="btn";
    btn.textContent="Rechercher";
    btn.disabled = !depsOk || !canAfford(cost);
    btn.addEventListener("click",()=>{
      if(!canAfford(cost)) return;
      payCost(cost);
      state.research[key]=level+1;
      saveState();
      tickResources();
      updateHeader();
      renderResearch();
    });
    card.appendChild(btn);
    container.appendChild(card);
  });
}

function renderShipyard(){
  const container = $("#shipyardList");
  if(!container) return;
  container.innerHTML="";
  const data = getShipData();
  const shipyardLevel = buildingLevel("shipyard");
  const depsOk = shipyardLevel>0;
  Object.entries(data).forEach(([key,info])=>{
    const card = document.createElement("div");
    card.className="card";
    const header = document.createElement("div");
    header.className="card-header";
    const title = document.createElement("div");
    title.className="card-title";
    title.textContent = info.name;
    header.appendChild(title);
    card.appendChild(header);
    const desc = document.createElement("p");
    desc.textContent = info.desc;
    card.appendChild(desc);
    const costs = document.createElement("div");
    costs.className="costs";
    const parts=[];
    if(info.cost.metal) parts.push("Métal: "+formatNumber(info.cost.metal));
    if(info.cost.crystal) parts.push("Cristal: "+formatNumber(info.cost.crystal));
    if(info.cost.deuterium) parts.push("Deutérium: "+formatNumber(info.cost.deuterium));
    costs.textContent = "Coût: "+(parts.join(" | ")||"—");
    card.appendChild(costs);
    if(!depsOk){
      const dep = document.createElement("div");
      dep.className="badge";
      dep.textContent="Prérequis: Chantier spatial requis";
      card.appendChild(dep);
    }
    const btn = document.createElement("button");
    btn.className="btn";
    btn.textContent="Construire x1";
    btn.disabled = !depsOk || !canAfford(info.cost);
    btn.addEventListener("click",()=>{
      if(!canAfford(info.cost)||!depsOk) return;
      payCost(info.cost);
      state.ships[key]=(state.ships[key]||0)+1;
      saveState();
      tickResources();
      updateHeader();
      renderShipyard();
      renderFleetTable();
    });
    card.appendChild(btn);
    container.appendChild(card);
  });
  renderFleetTable();
}

function renderFleetTable(){
  const tbody = document.querySelector("#fleetTable tbody");
  if(!tbody) return;
  tbody.innerHTML="";
  const data = getShipData();
  Object.entries(state.ships).forEach(([key,qty])=>{
    if(qty<=0) return;
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = (data[key] && data[key].name) || key;
    const qtyTd = document.createElement("td");
    qtyTd.textContent = qty;
    tr.appendChild(nameTd); tr.appendChild(qtyTd);
    tbody.appendChild(tr);
  });
}

function renderGalaxy(){
  const container = $("#galaxyView");
  if(!container) return;
  container.innerHTML="";
  for(let g=1; g<=4; g++){
    const systemDiv = document.createElement("div");
    systemDiv.className="galaxy-system";
    const title = document.createElement("h3");
    title.textContent = "Système "+g+" : ["+g+":1]";
    systemDiv.appendChild(title);
    for(let p=1; p<=4; p++){
      const planetDiv = document.createElement("div");
      planetDiv.className="galaxy-planet";
      const left = document.createElement("span");
      left.textContent = "Planète "+p;
      const right = document.createElement("span");
      right.textContent = (g===1 && p===1) ? "Votre colonie" : "Inoccupée";
      planetDiv.appendChild(left); planetDiv.appendChild(right);
      systemDiv.appendChild(planetDiv);
    }
    container.appendChild(systemDiv);
  }
}

// Boss system (identique à avant mais robuste)
const BOSS_TYPES = [
  { type:"pirate", label:"Seigneur pirate", names:["Krag le Rouge","Dame Scoria","Baron Void","Corsaire Noir"] },
  { type:"empire", label:"Amiral impérial", names:["Amiral Voren","Stratège Kaelis","Amiral Drax","Chancelier Tyros"] },
  { type:"alien", label:"Entité alien", names:["Zyrak-Oméga","Vor'Khan Prime","Elysian Sigma","Essaim Nox"] }
];
const BOSS_WINDOW_HOURS = 48;

function generateBossWindow(){
  ensureEnemyState();
  const now = Date.now();
  state.enemy.bossWindowStart = now;
  const attacks = [];
  const count = randInt(0,2);
  const windowMs = BOSS_WINDOW_HOURS*60*60*1000;
  for(let i=0;i<count;i++){
    const ts = now + Math.random()*windowMs;
    const bt = BOSS_TYPES[randInt(0,BOSS_TYPES.length-1)];
    const name = bt.names[randInt(0,bt.names.length-1)];
    const difficulty = randInt(1,3);
    attacks.push({id:ts+"-"+i,timestamp:ts,type:bt.type,typeLabel:bt.label,name,difficulty,resolved:false,result:null});
  }
  state.enemy.bossAttacks = attacks;
  saveState();
}

function getPlayerPower(){
  let power=0;
  const s=state.ships;
  power+=(s.smallCargo||0)*2;
  power+=(s.lightFighter||0)*5;
  power+=(s.recycler||0)*8;
  power+=(s.probe||0)*1;
  power+=buildingLevel("shipyard")*5;
  power+=buildingLevel("roboFactory")*3;
  power+=(state.research.weaponsTech||0)*10;
  power+=(state.research.armorTech||0)*10;
  if(power<10) power=10;
  return power;
}

function getBossPower(a){
  const base=getPlayerPower();
  const diff=a.difficulty;
  let factor;
  if(diff===1) factor=0.6+Math.random()*0.4;
  else if(diff===2) factor=0.9+Math.random()*0.6;
  else factor=1.2+Math.random()*1.0;
  return base*factor;
}

function logBossEvent(attack,text){
  ensureEnemyState();
  const entry={time:Date.now(), type:attack?attack.type:"info", text};
  state.enemy.bossLog.unshift(entry);
  if(state.enemy.bossLog.length>40) state.enemy.bossLog.length=40;
  saveState();
  renderBossLog();
}

function processBossAttacks(){
  ensureEnemyState();
  const now=Date.now();
  const windowMs=BOSS_WINDOW_HOURS*60*60*1000;
  if(now-state.enemy.bossWindowStart>windowMs){
    generateBossWindow();
  }
  const due=state.enemy.bossAttacks.find(a=>!a.resolved && now>=a.timestamp);
  if(!due) return;
  const playerPower=getPlayerPower();
  const bossPower=getBossPower(due);
  const ratio=playerPower/bossPower;
  let outcome;
  if(ratio>=1.1) outcome="win";
  else if(ratio<=0.8) outcome="lose";
  else outcome=Math.random()<0.5?"win":"lose";
  if(outcome==="win"){
    const lootM=Math.round(500*due.difficulty*(0.8+Math.random()*0.6));
    const lootC=Math.round(300*due.difficulty*(0.8+Math.random()*0.6));
    state.resources.metal+=lootM;
    state.resources.crystal+=lootC;
    due.result={outcome:"Victoire !",lootMetal:lootM,lootCrystal:lootC,playerPower:Math.round(playerPower),bossPower:Math.round(bossPower)};
    logBossEvent(due, `${due.typeLabel} ${due.name} vaincu ! Butin: +${lootM} métal, +${lootC} cristal.`);
  }else{
    const lostM=Math.round(state.resources.metal*(0.05*due.difficulty));
    const lostC=Math.round(state.resources.crystal*(0.05*due.difficulty));
    const lostD=Math.round(state.resources.deuterium*(0.03*due.difficulty));
    state.resources.metal=Math.max(0,state.resources.metal-lostM);
    state.resources.crystal=Math.max(0,state.resources.crystal-lostC);
    state.resources.deuterium=Math.max(0,state.resources.deuterium-lostD);
    due.result={outcome:"Défaite…",lostMetal:lostM,lostCrystal:lostC,lostDeut:lostD,playerPower:Math.round(playerPower),bossPower:Math.round(bossPower)};
    logBossEvent(due, `${due.typeLabel} ${due.name} a pillé votre colonie. Pertes: -${lostM} métal, -${lostC} cristal, -${lostD} deutérium.`);
  }
  due.resolved=true;
  saveState();
  renderBossStatus();
  updateHeader();
}

function renderBossStatus(){
  ensureEnemyState();
  const box=$("#bossStatus");
  if(!box) return;
  const now=Date.now();
  const upcoming=state.enemy.bossAttacks.filter(a=>!a.resolved && a.timestamp>now).sort((a,b)=>a.timestamp-b.timestamp);
  const end=new Date(state.enemy.bossWindowStart+BOSS_WINDOW_HOURS*60*60*1000);
  if(upcoming.length===0){
    box.innerHTML=`<p><strong>Aucune attaque de boss prévue</strong> dans la fenêtre actuelle.</p>
<p>Fenêtre en cours jusqu'au ${end.toLocaleString("fr-FR")}.</p>
<p>Les attaques de boss sont rares : 0 à 2 apparitions sur ${BOSS_WINDOW_HOURS}h.</p>`;
    return;
  }
  const next=upcoming[0];
  const nextDate=new Date(next.timestamp);
  const diffMs=next.timestamp-now;
  const minutes=Math.round(diffMs/60000);
  const diffLabel=minutes<=0?"Imminente":`dans ~${minutes} min`;
  const diffText=next.difficulty===1?"faible":next.difficulty===2?"moyenne":"élevée";
  const typeLabel=next.type==="pirate"?"Flotte pirate":next.type==="empire"?"Flotte impériale":"Entité alien";
  box.innerHTML=`<p><strong>Prochain boss détecté :</strong></p>
<p>${typeLabel} — ${next.typeLabel} <strong>${next.name}</strong></p>
<p>Difficulté estimée : <strong>${diffText}</strong></p>
<p>Arrivée prévue : ${nextDate.toLocaleString("fr-FR")} (${diffLabel})</p>
<p>Fenêtre actuelle jusqu'au ${end.toLocaleString("fr-FR")}.</p>`;
}

function renderBossLog(){
  ensureEnemyState();
  const list=$("#bossLog");
  if(!list) return;
  list.innerHTML="";
  state.enemy.bossLog.forEach(entry=>{
    const li=document.createElement("li");
    const t=document.createElement("span"); t.className="time"; t.textContent=new Date(entry.time).toLocaleTimeString("fr-FR");
    const ty=document.createElement("span"); ty.className="type "+(entry.type||"info"); ty.textContent=entry.type||"info";
    const txt=document.createElement("span"); txt.textContent=entry.text;
    li.appendChild(t); li.appendChild(ty); li.appendChild(txt);
    list.appendChild(li);
  });
}

// Settings
function initSettings(){
  const input=$("#playerNameInput");
  const btnSave=$("#savePlayerName");
  const btnReset=$("#resetGame");
  if(input) input.value=state.playerName;
  if(btnSave && input){
    btnSave.addEventListener("click",()=>{
      const val=input.value.trim();
      if(val){
        state.playerName=val;
        saveState();
        updateHeader();
      }
    });
  }
  if(btnReset){
    btnReset.addEventListener("click",()=>{
      if(!confirm("Réinitialiser la partie ?")) return;
      state=deepClone(defaultState);
      saveState();
      tickResources();
      updateHeader();
      renderAll();
    });
  }
}

function renderAll(){
  renderBuildings();
  renderResearch();
  renderShipyard();
  renderGalaxy();
  ensureEnemyState();
  if(!state.enemy.bossAttacks || state.enemy.bossAttacks.length===0){
    generateBossWindow();
  }
  renderBossStatus();
  renderBossLog();
}

// Init
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll(".nav-btn").forEach(btn=>{
    btn.addEventListener("click",()=>switchView(btn.getAttribute("data-view")));
  });
  initSettings();
  tickResources();
  updateHeader();
  renderAll();
  updateServerTime();
  setInterval(()=>{
    tickResources();
    updateHeader();
    updateServerTime();
    processBossAttacks();
  },1000);
});
