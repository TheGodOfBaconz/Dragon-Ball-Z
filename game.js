// =========================================================
// POWER TRAINING — a cookie-clicker-style game for the DBZ fansite
// Vanilla JS, no dependencies. Saves to localStorage.
// =========================================================

const SAVE_KEY = "dbzFansiteClickerSave_v1";
const TICK_MS = 100; // passive income tick rate

// ---------------------------------------------------------
// Game data — edit these to add/rebalance content
// ---------------------------------------------------------

const GENERATORS = [
  { id: "senzu", name: "Senzu Bean Stash", desc: "A steady trickle of recovery energy.", baseCost: 15, costMult: 1.14, output: 0.1 },
  { id: "bot", name: "Capsule Corp Training Bot", desc: "Sparring dummy that never complains.", baseCost: 100, costMult: 1.15, output: 1 },
  { id: "dojo", name: "Kame House Dojo", desc: "Old-school training, Master Roshi approved.", baseCost: 1100, costMult: 1.15, output: 8 },
  { id: "pod", name: "Saiyan Pod Incubator", desc: "Grows fighters the old-fashioned way.", baseCost: 12000, costMult: 1.16, output: 47 },
  { id: "chamber", name: "Hyperbolic Time Chamber", desc: "A year of training in a single day.", baseCost: 130000, costMult: 1.16, output: 260 },
  { id: "egg", name: "Namekian Dragon Egg", desc: "Hatches into pure potential. Don't ask how.", baseCost: 1400000, costMult: 1.17, output: 1400 },
  { id: "gravity", name: "King Kai's Gravity Room", desc: "10x gravity. Everyone throws up the first week.", baseCost: 20000000, costMult: 1.18, output: 7800 },
  { id: "whis", name: "Whis's Time Rewind", desc: "Redo the training montage as many times as needed.", baseCost: 330000000, costMult: 1.19, output: 44000 },
];

const UPGRADES = [
  { id: "pole", name: "Power Pole", desc: "+1 power per tap.", cost: 50, type: "flat", value: 1 },
  { id: "weighted", name: "Weighted Clothing", desc: "+5 power per tap.", cost: 500, type: "flat", value: 5 },
  { id: "kaioken", name: "Kaioken Technique", desc: "Doubles your tap power. Rough on the body.", cost: 6000, type: "mult", value: 2 },
  { id: "fusion", name: "Fusion Earrings", desc: "+50 power per tap.", cost: 75000, type: "flat", value: 50 },
  { id: "ui", name: "Ultra Instinct (the sign, at least)", desc: "Doubles your tap power again.", cost: 900000, type: "mult", value: 2 },
];

const ACHIEVEMENTS = [
  { id: "first10", name: "First Steps", icon: "🥋", check: (s) => s.lifetimeEarned >= 10 },
  { id: "first1k", name: "Getting Serious", icon: "🔥", check: (s) => s.lifetimeEarned >= 1000 },
  { id: "over9000", name: "It's Over 9000", icon: "💥", check: (s) => s.lifetimeEarned >= 9001 },
  { id: "hundredk", name: "Off the Charts", icon: "⚡", check: (s) => s.lifetimeEarned >= 100000 },
  { id: "million", name: "Legendary", icon: "🌟", check: (s) => s.lifetimeEarned >= 1000000 },
  { id: "allGens", name: "Fully Loaded", icon: "🎒", check: (s) => GENERATORS.every((g) => (s.generators[g.id] || 0) >= 1) },
  { id: "maxGen", name: "Maxed a Source", icon: "🏆", check: (s) => GENERATORS.some((g) => (s.generators[g.id] || 0) >= 25) },
  { id: "fused", name: "Fused", icon: "🌀", check: (s) => s.prestigeCount >= 1 },
];

// ---------------------------------------------------------
// State
// ---------------------------------------------------------

function defaultState() {
  return {
    power: 0,
    lifetimeEarned: 0, // all-time, never resets — drives achievements
    earnedSinceReset: 0, // resets on prestige — drives prestige gain calc
    generators: {}, // { id: ownedCount }
    upgrades: [], // purchased upgrade ids
    prestigeMultiplier: 1,
    prestigeCount: 0,
    unlockedAchievements: [],
  };
}

let state = loadGame();
let activeTab = "generators";

// ---------------------------------------------------------
// Derived values
// ---------------------------------------------------------

function getClickValue() {
  let flat = 1;
  let mult = 1;
  for (const upId of state.upgrades) {
    const up = UPGRADES.find((u) => u.id === upId);
    if (!up) continue;
    if (up.type === "flat") flat += up.value;
    if (up.type === "mult") mult *= up.value;
  }
  return flat * mult * state.prestigeMultiplier;
}

function getPowerPerSecond() {
  let total = 0;
  for (const gen of GENERATORS) {
    const owned = state.generators[gen.id] || 0;
    total += owned * gen.output;
  }
  return total * state.prestigeMultiplier;
}

function getGeneratorCost(gen) {
  const owned = state.generators[gen.id] || 0;
  return Math.ceil(gen.baseCost * Math.pow(gen.costMult, owned));
}

function getPrestigeGain() {
  // Diminishing-returns curve so repeated small prestiges aren't optimal.
  return Math.floor(Math.sqrt(state.earnedSinceReset / 10000) * 5) / 100;
}

const PRESTIGE_MIN_EARNED = 50000;

// ---------------------------------------------------------
// Actions
// ---------------------------------------------------------

function earnPower(amount) {
  state.power += amount;
  state.lifetimeEarned += amount;
  state.earnedSinceReset += amount;
}

function handleClick() {
  const value = getClickValue();
  earnPower(value);
  checkAchievements();
  renderScore();
  return value;
}

function buyGenerator(genId) {
  const gen = GENERATORS.find((g) => g.id === genId);
  if (!gen) return;
  const cost = getGeneratorCost(gen);
  if (state.power < cost) return;
  state.power -= cost;
  state.generators[genId] = (state.generators[genId] || 0) + 1;
  checkAchievements();
  renderGenerators();
  renderScore();
}

function buyUpgrade(upId) {
  const up = UPGRADES.find((u) => u.id === upId);
  if (!up || state.upgrades.includes(upId)) return;
  if (state.power < up.cost) return;
  state.power -= up.cost;
  state.upgrades.push(upId);
  renderUpgrades();
  renderScore();
}

function doPrestige() {
  const gain = getPrestigeGain();
  if (state.earnedSinceReset < PRESTIGE_MIN_EARNED || gain <= 0) return;
  if (!confirm(`Fuse now for a permanent +${gain.toFixed(2)}x multiplier? This resets your current power, generators, and upgrades.`)) {
    return;
  }
  state.prestigeMultiplier += gain;
  state.prestigeCount += 1;
  state.power = 0;
  state.earnedSinceReset = 0;
  state.generators = {};
  state.upgrades = [];
  checkAchievements();
  renderAll();
}

function resetSave() {
  if (!confirm("Wipe your entire save? This cannot be undone.")) return;
  state = defaultState();
  saveGame();
  renderAll();
}

function checkAchievements() {
  let changed = false;
  ACHIEVEMENTS.forEach((a) => {
    if (!state.unlockedAchievements.includes(a.id) && a.check(state)) {
      state.unlockedAchievements.push(a.id);
      changed = true;
    }
  });
  if (changed) renderAchievements();
}

// ---------------------------------------------------------
// Save / load
// ---------------------------------------------------------

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn("Couldn't save:", err);
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // Merge onto defaults so new fields added later don't break old saves.
    return Object.assign(defaultState(), parsed);
  } catch (err) {
    console.warn("Couldn't load save, starting fresh:", err);
    return defaultState();
  }
}

// ---------------------------------------------------------
// Formatting
// ---------------------------------------------------------

function formatNumber(n) {
  if (n < 1000) return Math.floor(n).toString();
  const units = ["K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
  let unitIndex = -1;
  let num = n;
  while (num >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }
  const decimals = num < 10 ? 2 : num < 100 ? 1 : 0;
  return num.toFixed(decimals) + units[unitIndex];
}

// ---------------------------------------------------------
// Rendering
// ---------------------------------------------------------

function renderScore() {
  const scoreEl = document.getElementById("scoreValue");
  const rateEl = document.getElementById("scoreRate");
  const clickEl = document.getElementById("clickPowerValue");
  if (scoreEl) scoreEl.textContent = formatNumber(state.power);
  if (rateEl) rateEl.textContent = `${formatNumber(getPowerPerSecond())} power / sec`;
  if (clickEl) clickEl.textContent = formatNumber(getClickValue());

  const prestigeBtn = document.getElementById("prestigeBtn");
  if (prestigeBtn) {
    const gain = getPrestigeGain();
    const canPrestige = state.earnedSinceReset >= PRESTIGE_MIN_EARNED && gain > 0;
    prestigeBtn.disabled = !canPrestige;
    prestigeBtn.textContent = canPrestige
      ? `Fuse for +${gain.toFixed(2)}x (permanent)`
      : `Fuse (need ${formatNumber(PRESTIGE_MIN_EARNED - state.earnedSinceReset)} more power earned)`;
  }
}

function renderGenerators() {
  const panel = document.getElementById("panel-generators");
  if (!panel) return;
  panel.innerHTML = "";

  GENERATORS.forEach((gen) => {
    const cost = getGeneratorCost(gen);
    const owned = state.generators[gen.id] || 0;
    const affordable = state.power >= cost;

    const item = document.createElement("div");
    item.className = "shop-item" + (affordable ? " affordable" : "");
    item.innerHTML = `
      <div>
        <div class="shop-item-name">${gen.name}</div>
        <div class="shop-item-owned">Owned: ${owned} &middot; ${formatNumber(gen.output)} power/sec each</div>
      </div>
      <button class="shop-buy-btn" ${affordable ? "" : "disabled"}>
        Buy — ${formatNumber(cost)}
      </button>
      <div class="shop-item-desc">${gen.desc}</div>
    `;
    item.querySelector("button").addEventListener("click", () => buyGenerator(gen.id));
    panel.appendChild(item);
  });
}

function renderUpgrades() {
  const panel = document.getElementById("panel-upgrades");
  if (!panel) return;
  panel.innerHTML = "";

  UPGRADES.forEach((up) => {
    const purchased = state.upgrades.includes(up.id);
    const affordable = state.power >= up.cost;

    const item = document.createElement("div");
    item.className = "shop-item" + (affordable && !purchased ? " affordable" : "");
    item.innerHTML = `
      <div>
        <div class="shop-item-name">${up.name}</div>
        <div class="shop-item-owned">${purchased ? "Purchased" : (up.type === "mult" ? `x${up.value} tap power` : `+${up.value} tap power`)}</div>
      </div>
      <button class="shop-buy-btn" ${purchased || !affordable ? "disabled" : ""}>
        ${purchased ? "Owned" : `Buy — ${formatNumber(up.cost)}`}
      </button>
      <div class="shop-item-desc">${up.desc}</div>
    `;
    if (!purchased) {
      item.querySelector("button").addEventListener("click", () => buyUpgrade(up.id));
    }
    panel.appendChild(item);
  });
}

function renderAchievements() {
  const grid = document.getElementById("achievementGrid");
  if (!grid) return;
  grid.innerHTML = "";

  ACHIEVEMENTS.forEach((a) => {
    const unlocked = state.unlockedAchievements.includes(a.id);
    const tile = document.createElement("div");
    tile.className = "achievement" + (unlocked ? " unlocked" : "");
    tile.innerHTML = `
      <span class="achievement-icon">${unlocked ? a.icon : "❔"}</span>
      <span>${unlocked ? a.name : "???"}</span>
    `;
    grid.appendChild(tile);
  });
}

function renderAll() {
  renderScore();
  renderGenerators();
  renderUpgrades();
  renderAchievements();
}

// ---------------------------------------------------------
// Floating "+N" text on click
// ---------------------------------------------------------

function spawnFloatText(amount) {
  const layer = document.getElementById("floatLayer");
  if (!layer) return;
  const el = document.createElement("span");
  el.className = "float-text";
  el.textContent = "+" + formatNumber(amount);
  el.style.setProperty("--drift", `${Math.floor(Math.random() * 60 - 30)}px`);
  el.style.left = `${45 + Math.random() * 10}%`;
  layer.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

// ---------------------------------------------------------
// Tabs
// ---------------------------------------------------------

function setupTabs() {
  const tabs = document.querySelectorAll(".shop-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeTab = tab.dataset.tab;
      tabs.forEach((t) => {
        t.classList.toggle("active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      document.querySelectorAll(".shop-panel").forEach((p) => {
        p.classList.toggle("active", p.id === `panel-${activeTab}`);
      });
    });
  });
}

// ---------------------------------------------------------
// Init
// ---------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const orb = document.getElementById("clickOrb");
  if (orb) {
    orb.addEventListener("click", (e) => {
      const value = handleClick();
      spawnFloatText(value);
      orb.classList.add("pressed");
      setTimeout(() => orb.classList.remove("pressed"), 90);
    });
  }

  const prestigeBtn = document.getElementById("prestigeBtn");
  if (prestigeBtn) prestigeBtn.addEventListener("click", doPrestige);

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", resetSave);

  setupTabs();
  renderAll();

  // Passive income tick
  setInterval(() => {
    const pps = getPowerPerSecond();
    if (pps > 0) {
      earnPower(pps * (TICK_MS / 1000));
      checkAchievements();
      renderScore();
      renderGenerators(); // costs/afford states can change as power grows
    }
  }, TICK_MS);

  // Autosave
  setInterval(saveGame, 5000);
  window.addEventListener("beforeunload", saveGame);
});
