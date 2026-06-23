import React, { useState, useEffect, useRef } from "react";

/*
  HECTOR'S HUB — a shared care app for parent + nanny
  ----------------------------------------------------
  LIVE SYNC SETUP (do this once, takes ~10 min):

  1. Go to https://console.firebase.google.com → "Add project" → name it
     (e.g. "hectors-hub"). Skip Google Analytics. Click Create.
  2. In the left menu: Build → Firestore Database → "Create database" →
     Start in *test mode* → pick a location near London (eur3) → Enable.
  3. Back on the project home, click the </> (web) icon to "Add an app".
     Give it a nickname, click Register. It shows you a `firebaseConfig`
     object full of keys.
  4. Copy those values into FIREBASE_CONFIG below, replacing the "" blanks.
  5. Save and reload. The dot top-right turns green when sync is live.

  Until you do that, the app runs in DEMO mode (works fully, but each
  phone keeps its own copy — nothing syncs between devices).

  Share it: deploy the file anywhere that hosts a webpage, then everyone
  opens the link and taps "Add to Home Screen" so it behaves like an app.
*/

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAK60AydTyWSYNfExQwPoY2u3SDyG0YdfU",
  authDomain: "hectors-hub-3175d.firebaseapp.com",
  projectId: "hectors-hub-3175d",
  storageBucket: "hectors-hub-3175d.firebasestorage.app",
  messagingSenderId: "261259844957",
  appId: "1:261259844957:web:66d9ad1be15fa564925cb4",
};

// Shared family passcode — must match the rule in the Firestore "Rules" tab.
const APP_PASSCODE = "scamp";

// ---- iMAP milk ladder (step 0 = pre-start, then 6 official steps) ----
// Recipes adapted from the iMAP Milk Ladder Recipes (gpifn.org.uk).
const LADDER = [
  {
    n: 0,
    food: "No dairy yet",
    note: "The milk ladder hasn't started. Hector must have NO dairy of any kind — check every label for milk, whey, casein and butter.",
  },
  {
    n: 1,
    food: "Cookie / biscuit",
    note: "A well-baked finger biscuit — the smallest amount of baked milk. Start with one, then build to two and three.",
    recipe: {
      makes: "About 20 small finger biscuits",
      ingredients: [
        "1 cup (125g) flour (wheat or wheat-free)",
        "¼ tsp xanthan gum (only if using wheat-free flour)",
        "¼ cup (50g) cold dairy-free spread",
        "¼–⅓ cup grated apple/pear or mashed banana",
        "1 tsp skimmed milk powder",
        "Tip of a knife of vanilla powder",
        "Savoury version: swap the fruit for ⅓ cup dairy-free grated cheese + 2 tbsp water",
      ],
      method: [
        "Mix the flour, xanthan gum and milk powder.",
        "Rub in the cold dairy-free spread until crumbly.",
        "Mix in the fruit (or dairy-free cheese for savoury) and vanilla; add a splash more if dry.",
        "Roll out and cut into finger-sized strips.",
        "Bake at 180°C / 350°F for 10–15 min depending on size.",
      ],
      tip: "Chill the dough in the fridge for 30 min first — it's much easier to handle. Begin with 1 biscuit (~1ml milk), work up to 3.",
    },
  },
  {
    n: 2,
    food: "Muffin",
    note: "Milk baked into a cake. Start with half a muffin, then a whole one.",
    recipe: {
      makes: "10 muffins",
      ingredients: [
        "2 cups (250g) flour (wheat or wheat-free)",
        "½ tsp xanthan gum (only if wheat-free)",
        "2½ tsp (10g) baking powder",
        "2 level tbsp (25g) sugar",
        "Pinch of salt",
        "¼ cup (50ml) sunflower or canola oil",
        "1 cup (250ml) milk",
        "½ cup + 1 tbsp (110g) finely chopped or mashed apple/pear/banana",
        "Vanilla to taste",
        "Savoury version: skip sugar/fruit/vanilla; add ½ cup (60g) dairy-free grated cheese (a handful of chopped spinach works too)",
      ],
      method: [
        "Mix flour, xanthan gum, baking powder, sugar and salt.",
        "Whisk the oil and milk together, then stir into the dry ingredients.",
        "Fold in the chopped fruit and vanilla (or dairy-free cheese for savoury).",
        "Bake at 180–200°C / 350–400°F for 15–20 min.",
      ],
      tip: "Whisking the milk and oil together keeps the muffins light. Start with half a muffin.",
    },
  },
  {
    n: 3,
    food: "Pancake",
    note: "Milk that's cooked but less thoroughly than baking. Start with half a pancake.",
    recipe: {
      makes: "6 pancakes",
      ingredients: [
        "1 cup (125g) flour (wheat or wheat-free)",
        "2½ tsp (10g) baking powder",
        "¼ tsp salt",
        "2 tbsp (30ml) sunflower or canola oil",
        "1 cup (250ml) milk",
        "⅔ cup (50ml) water",
      ],
      method: [
        "Add all ingredients to a bowl and mix to a batter.",
        "Fry in a hot oiled pan until golden and crisp on both sides.",
      ],
      tip: "If he doesn't like cake or pancake textures, an alternative is a small boiled potato mashed with 42ml milk and dairy-free spread, covered with foil and baked 40 min at 180–200°C. Start with half a pancake.",
    },
  },
  {
    n: 4,
    food: "Cheese",
    note: "Uncooked hard cheese begins here — a bigger step than the baked goods. Around 15g (½ oz) to start.",
    recipe: {
      makes: "Per portion",
      ingredients: ["About 15g (2½ tbsp / ½ oz) hard cheese, e.g. cheddar"],
      method: [
        "Offer a small amount of plain hard cheese — no cooking needed.",
        "Watch closely over the following days, as this is uncooked milk protein.",
      ],
      tip: "This is a noticeably bigger step up in milk protein than steps 1–3. Take it slowly.",
    },
  },
  {
    n: 5,
    food: "Yoghurt",
    note: "Uncooked fermented milk. About ½ cup (125ml) to start.",
    recipe: {
      makes: "Per portion",
      ingredients: ["½ cup (125ml) yoghurt"],
      method: [
        "Offer plain yoghurt — no cooking needed.",
      ],
      tip: "Once yoghurt is tolerated you can introduce butter, dairy-free spread, chocolate buttons, fromage frais and petits filous (watch the sugar), then softer pasteurised cheeses like cream cheese, brie and camembert. Use pasteurised soft cheese only.",
    },
  },
  {
    n: 6,
    food: "Fresh milk",
    note: "Full uncooked pasteurised milk — the top of the ladder. Start with ~100ml, build to 200ml.",
    recipe: {
      makes: "Per portion",
      ingredients: ["100ml pasteurised milk to start, building to 200ml"],
      method: [
        "Offer pasteurised milk as a drink or on cereal.",
        "Once a full portion is tolerated with no reaction, dairy can return to his normal diet.",
      ],
      tip: "Pasteurised milk and infant formula are already heat-treated, so there's no need to heat it further.",
    },
  },
];

const DEFAULT_STATE = {
  ladderStep: 0,
  ladderStartedISO: null,
  cadenceDays: 14,
  schedule: [
    { time: "7:00", item: "Wake up", track: null },
    { time: "7:30", item: "Bottle", track: ["feed"] },
    { time: "8:30", item: "Breakfast", track: ["food"] },
    { time: "9:15 – 10:15", item: "Nap", track: ["nap"] },
    { time: "11:30", item: "Lunch", track: ["food"] },
    { time: "12:45 – 2:45", item: "Nap", track: ["nap"] },
    { time: "4:00", item: "Snack + bottle", track: ["food", "feed"] },
    { time: "5:00 – 5:30", item: "Nap", track: ["nap"] },
    { time: "5:45", item: "Dinner", track: ["food"] },
    { time: "6:45", item: "Bedtime routine", track: null },
    { time: "7:15", item: "Bottle", track: ["feed"] },
    { time: "7:30", item: "Bed", track: null },
  ],
  contacts: [
    { label: "Sonia (Mum)", value: "Add number", urgent: false },
    { label: "Oscar (Dad)", value: "Add number", urgent: false },
    { label: "GP surgery", value: "Add number", urgent: false },
    { label: "Emergency", value: "999", urgent: true },
    { label: "NHS non-emergency", value: "111", urgent: true },
  ],
  logs: [],
  shopping: [],
  dayFlags: {}, // { "Mon Jun 22 2026": { status: "fine"|"check", by: "Klara" } }
};

const PEOPLE = ["Sonia", "Oscar", "Klara", "Joy"];

// ---------- data layer ----------
function useSharedState() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [live, setLive] = useState(false);
  const dbRef = useRef(null);
  const docRef = useRef(null);

  useEffect(() => {
    let unsub = () => {};
    async function init() {
      if (!FIREBASE_CONFIG.projectId) return; // demo mode
      try {
        const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
        const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const app = appMod.initializeApp(FIREBASE_CONFIG);
        const db = fsMod.getFirestore(app);
        dbRef.current = fsMod;
        docRef.current = fsMod.doc(db, "hub", "main");
        const snap = await fsMod.getDoc(docRef.current);
        if (!snap.exists()) await fsMod.setDoc(docRef.current, { ...DEFAULT_STATE, passcode: APP_PASSCODE });
        unsub = fsMod.onSnapshot(docRef.current, (d) => {
          if (d.exists()) setState(d.data());
        });
        setLive(true);
      } catch (e) {
        console.error("Firebase init failed, staying in demo mode:", e);
      }
    }
    init();
    return () => unsub();
  }, []);

  const save = async (next) => {
    setState(next);
    if (live && docRef.current && dbRef.current) {
      try {
        await dbRef.current.setDoc(docRef.current, { ...next, passcode: APP_PASSCODE });
      } catch (e) {
        console.error("Save failed:", e);
      }
    }
  };

  return { state, save, live };
}

// ---------- helpers ----------
function daysBetween(a, b) {
  return Math.floor((b - a) / 86400000);
}
function stepProgress(state) {
  if (!state.ladderStartedISO) return { intoStep: 0, remaining: 0 };
  const start = new Date(state.ladderStartedISO + "T00:00:00");
  const now = new Date();
  const elapsed = Math.max(0, daysBetween(start, now));
  const intoStep = elapsed % state.cadenceDays;
  const remaining = state.cadenceDays - intoStep;
  return { intoStep, remaining };
}
function fmtTime(d) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ---------- UI ----------
// Token names kept (sage*/rose*) but recoloured: blue & navy scheme.
// "sage*" now reads as blue/navy; "rose*" stays warm for emergency/caution.
const C = {
  bg: "#F4F7FB",        // pale blue-grey page
  ink: "#1B2A3F",       // deep navy text
  soft: "#5E6B80",      // muted slate
  line: "#DCE3EE",      // light blue-grey divider
  card: "#FFFFFF",
  sage: "#3E6CA8",      // primary blue
  sageDeep: "#1E3A5F",  // navy (buttons, current step)
  amber: "#C8893A",
  rose: "#C0492F",      // emergency / caution (kept warm)
  roseSoft: "#F7E3DE",
  sageSoft: "#E2EBF6",  // soft blue fill
  blueBorder: "#C3D4EA", // border to pair with sageSoft
  roseBorder: "#E8C9C3", // border to pair with roseSoft
  muted: "#B9C2D0",      // neutral blue-grey (disabled, dots)
  done: "#9FB0C6",       // completed step marker
};

export default function App() {
  const { state, save, live } = useSharedState();
  const [tab, setTab] = useState("today");
  const [who, setWho] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // remember who this device belongs to across sessions
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hectorsHubWho");
      if (saved) setWho(saved);
      else setPickerOpen(true);
    } catch {
      setPickerOpen(true);
    }
  }, []);

  const chooseWho = (name) => {
    setWho(name);
    setPickerOpen(false);
    try { localStorage.setItem("hectorsHubWho", name); } catch {}
  };

  const tabs = [
    { id: "today", label: "Today" },
    { id: "ladder", label: "Ladder" },
    { id: "history", label: "History" },
    { id: "shop", label: "Shopping" },
    { id: "info", label: "Emergency" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button { font-family: inherit; cursor: pointer; }
        @media (prefers-reduced-motion: no-preference) {
          .fade { animation: fade .3s ease; }
        }
        @keyframes fade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>

      {(pickerOpen || !who) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(42,39,35,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ background: C.card, borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }}>
            <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, marginBottom: 6 }}>Who's using this phone?</div>
            <div style={{ fontSize: 13, color: C.soft, marginBottom: 16, lineHeight: 1.5 }}>This just labels what you log so everyone can see who recorded what. You can change it any time by tapping your name at the top.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {PEOPLE.map((p) => (
                <button key={p} onClick={() => chooseWho(p)} style={{
                  background: who === p ? C.sageDeep : C.card, color: who === p ? "#fff" : C.ink,
                  border: `1px solid ${who === p ? C.sageDeep : C.line}`, borderRadius: 10, padding: "14px 8px", fontSize: 15, fontWeight: 600,
                }}>{p}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <header style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.bg, zIndex: 10 }}>
        <div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>Hector's Hub</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {who && (
            <button onClick={() => setPickerOpen(true)} style={{ background: C.sageSoft, border: `1px solid ${C.blueBorder}`, borderRadius: 99, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: C.sageDeep }}>
              {who} ▾
            </button>
          )}
          <div title={live ? "Live sync on" : "Demo mode — not syncing"} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.soft }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: live ? C.sage : C.muted }} />
            {live ? "Live" : "Demo"}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 560, margin: "0 auto", padding: "20px 16px 96px" }} className="fade" key={tab}>
        {tab === "today" && <Today state={state} save={save} who={who} />}
        {tab === "ladder" && <Ladder state={state} save={save} />}
        {tab === "history" && <History state={state} save={save} who={who} />}
        {tab === "shop" && <Shopping state={state} save={save} />}
        {tab === "info" && <Info state={state} save={save} />}
      </main>

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", maxWidth: 560, margin: "0 auto" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, border: "none", background: "none", padding: "12px 2px 14px",
            color: tab === t.id ? C.sageDeep : C.soft, fontSize: 11.5, fontWeight: tab === t.id ? 600 : 500,
            borderTop: `2px solid ${tab === t.id ? C.sageDeep : "transparent"}`, marginTop: -1,
          }}>{t.label}</button>
        ))}
      </nav>
    </div>
  );
}

function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 16, ...style }}>{children}</div>;
}
function Eyebrow({ children }) {
  return <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", color: C.soft, fontWeight: 600, marginBottom: 10 }}>{children}</div>;
}

function Today({ state, save, who }) {
  const notStarted = state.ladderStep === 0;
  const step = LADDER[state.ladderStep];
  const { intoStep, remaining } = stepProgress(state);
  const pct = Math.min(100, ((intoStep) / state.cadenceDays) * 100);
  const todayKey = new Date().toDateString();
  const todayLogs = state.logs.filter((l) => new Date(l.t).toDateString() === todayKey);
  const milkTotal = todayLogs.reduce((sum, l) => sum + (l.type === "feed" && l.ml ? l.ml : 0), 0);

  const [openSlot, setOpenSlot] = useState(null);
  const [quickType, setQuickType] = useState(null);
  const [editing, setEditing] = useState(null); // log timestamp being edited

  const loggedSlots = new Set(todayLogs.filter((l) => l.slot != null).map((l) => l.slot));

  const addLog = (entry) => {
    save({ ...state, logs: [...state.logs, { t: new Date().toISOString(), by: who, ...entry }] });
    setOpenSlot(null); setQuickType(null);
  };
  const updateLog = (origT, changes) => {
    save({ ...state, logs: state.logs.map((l) => l.t === origT ? { ...l, ...changes } : l) });
    setEditing(null);
  };
  const deleteLog = (t) => save({ ...state, logs: state.logs.filter((x) => x.t !== t) });

  const dayFlag = (state.dayFlags || {})[todayKey];
  const setDayFlag = (status) => save({
    ...state,
    dayFlags: { ...(state.dayFlags || {}), [todayKey]: { status, by: who } },
  });

  return (
    <>
      <Eyebrow>Right now</Eyebrow>
      {notStarted ? (
        <Card style={{ background: C.roseSoft, borderColor: C.roseBorder }}>
          <div style={{ fontSize: 12, color: C.rose, fontWeight: 600, marginBottom: 4 }}>MILK LADDER — NOT STARTED</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, lineHeight: 1.15, marginBottom: 6 }}>No dairy at all</div>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>{step.note}</div>
        </Card>
      ) : (
        <Card style={{ background: C.sageSoft, borderColor: C.blueBorder }}>
          <div style={{ fontSize: 12, color: C.sageDeep, fontWeight: 600, marginBottom: 4 }}>MILK LADDER — STEP {step.n} OF 6</div>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginBottom: 6 }}>{step.food}</div>
          <div style={{ fontSize: 14, color: C.ink, lineHeight: 1.5 }}>{step.note}</div>
          <div style={{ marginTop: 14, height: 6, background: "#fff", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: C.sage }} />
          </div>
          <div style={{ fontSize: 12, color: C.sageDeep, marginTop: 7 }}>
            {remaining > 0 ? `${remaining} day${remaining === 1 ? "" : "s"} left on this step before moving up` : "Ready to move up — check with Sonia"}
          </div>
        </Card>
      )}

      <div style={{ height: 20 }} />
      <Eyebrow>Today's schedule — tap to log</Eyebrow>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {state.schedule.map((s, i) => {
          const trackable = Array.isArray(s.track) && s.track.length > 0;
          const done = loggedSlots.has(i);
          const isOpen = openSlot === i;

          if (!trackable) {
            return (
              <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px", alignItems: "center", borderBottom: i < state.schedule.length - 1 ? `1px solid ${C.line}` : "none" }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: C.soft, minWidth: 78 }}>{s.time}</div>
                <div style={{ fontSize: 14, lineHeight: 1.4, flex: 1, color: C.soft }}>{s.item}</div>
              </div>
            );
          }

          return (
            <div key={i} style={{ borderBottom: i < state.schedule.length - 1 ? `1px solid ${C.line}` : "none" }}>
              <button onClick={() => { setOpenSlot(isOpen ? null : i); setQuickType(null); }} style={{
                display: "flex", gap: 14, padding: "12px 16px", width: "100%", textAlign: "left", background: isOpen ? C.sageSoft : "none", border: "none", alignItems: "center",
              }}>
                <div style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 600, color: C.sageDeep, minWidth: 78 }}>{s.time}</div>
                <div style={{ fontSize: 14, lineHeight: 1.4, flex: 1, opacity: done ? 0.55 : 1 }}>{s.item}</div>
                <div style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: done ? C.sage : "#fff", color: "#fff", border: `1px solid ${done ? C.sage : C.line}` }}>{done ? "✓" : ""}</div>
              </button>
              {isOpen && <LogSheet allowed={s.track} slot={i} onSave={addLog} onCancel={() => setOpenSlot(null)} />}
            </div>
          );
        })}
      </Card>

      <div style={{ height: 16 }} />
      <div style={{ display: "flex", gap: 8 }}>
        {[{ id: "wet", emoji: "💧", label: "Wet" }, { id: "dirty", emoji: "💩", label: "Dirty" }, { id: "med", emoji: "💊", label: "Medicine" }, { id: "note", emoji: "📝", label: "Note" }].map((q) => (
          <button key={q.id} onClick={() => setQuickType(quickType === q.id ? null : q.id)} style={{
            flex: 1, background: quickType === q.id ? C.sageSoft : C.card, border: `1px solid ${quickType === q.id ? C.blueBorder : C.line}`, borderRadius: 12, padding: "12px 4px", fontSize: 12.5, fontWeight: 500, color: C.ink,
          }}><div style={{ fontSize: 18 }}>{q.emoji}</div>{q.label}</button>
        ))}
      </div>
      {quickType === "note" && (
        <Card style={{ marginTop: 10 }}>
          <NoteInput onSave={(note) => addLog({ type: "note", note })} onCancel={() => setQuickType(null)} />
        </Card>
      )}
      {quickType === "med" && (
        <Card style={{ marginTop: 10 }}>
          <MedInput onSave={(med) => addLog({ type: "med", ...med })} onCancel={() => setQuickType(null)} />
        </Card>
      )}
      {(quickType === "wet" || quickType === "dirty") && (
        <Card style={{ marginTop: 10 }}>
          <div style={{ fontSize: 14, marginBottom: 10 }}>Log a {quickType === "wet" ? "wet" : "dirty"} nappy?</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => addLog({ type: quickType })} style={{ flex: 1, background: C.sageDeep, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 600 }}>Log it</button>
            <button onClick={() => setQuickType(null)} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", color: C.soft }}>Cancel</button>
          </div>
        </Card>
      )}

      <div style={{ height: 20 }} />
      <Eyebrow>Logged today</Eyebrow>
      {todayLogs.length === 0 ? (
        <Card><div style={{ fontSize: 14, color: C.soft }}>Nothing logged yet. Tap a schedule line above as you go.</div></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {milkTotal > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.line}`, background: C.sageSoft, fontSize: 14, fontWeight: 600, color: C.sageDeep }}>
              <span>🍼 Milk so far today</span><span>{milkTotal} ml</span>
            </div>
          )}
          {todayLogs.slice().reverse().map((l, i, arr) => (
            editing === l.t
              ? <EditRow key={l.t} l={l} onSave={(changes) => updateLog(l.t, changes)} onCancel={() => setEditing(null)} />
              : <LogRow key={l.t} l={l} last={i === arr.length - 1} onDelete={() => deleteLog(l.t)} onEdit={() => setEditing(l.t)} />
          ))}
        </Card>
      )}

      <div style={{ height: 24 }} />
      <Eyebrow>End of day</Eyebrow>
      <Card>
        <div style={{ fontSize: 14, color: C.soft, lineHeight: 1.5, marginBottom: 12 }}>
          {dayFlag
            ? dayFlag.status === "fine"
              ? `${dayFlag.by || "Someone"} marked today all fine.`
              : `${dayFlag.by || "Someone"} flagged today — please check the notes above.`
            : "Set a quick status so Sonia knows at a glance how the day went."}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setDayFlag("fine")} style={{
            flex: 1, borderRadius: 10, padding: 13, fontWeight: 600, fontSize: 14,
            background: dayFlag?.status === "fine" ? C.sageDeep : "#fff", color: dayFlag?.status === "fine" ? "#fff" : C.sageDeep,
            border: `1px solid ${dayFlag?.status === "fine" ? C.sageDeep : C.line}`,
          }}>👍 All fine</button>
          <button onClick={() => setDayFlag("check")} style={{
            flex: 1, borderRadius: 10, padding: 13, fontWeight: 600, fontSize: 14,
            background: dayFlag?.status === "check" ? C.rose : "#fff", color: dayFlag?.status === "check" ? "#fff" : C.rose,
            border: `1px solid ${dayFlag?.status === "check" ? C.rose : C.roseBorder}`,
          }}>⚠️ Please check notes</button>
        </div>
      </Card>
    </>
  );
}

// inline logging sheet shown under a tapped schedule row
function LogSheet({ allowed, slot, onSave, onCancel }) {
  const ALL_TABS = [
    { id: "feed", emoji: "🍼", label: "Feed" },
    { id: "food", emoji: "🥣", label: "Solids" },
    { id: "nap", emoji: "😴", label: "Nap" },
  ];
  const tabs = ALL_TABS.filter((t) => allowed.includes(t.id));
  const [type, setType] = useState(allowed[0]);
  const [ml, setMl] = useState("");
  const [rating, setRating] = useState(null);
  const [note, setNote] = useState("");

  const save = () => {
    const entry = { type, slot, note: note.trim() };
    if (type === "feed") entry.ml = ml ? Number(ml) : null;
    if (type === "food") entry.rating = rating;
    onSave(entry);
  };

  const canSave = type !== "food" || rating != null;

  return (
    <div style={{ padding: "4px 16px 16px", background: C.sageSoft }}>
      {tabs.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {tabs.map((tt) => (
            <button key={tt.id} onClick={() => setType(tt.id)} style={{
              flex: 1, background: type === tt.id ? C.sageDeep : "#fff", color: type === tt.id ? "#fff" : C.soft,
              border: `1px solid ${type === tt.id ? C.sageDeep : C.line}`, borderRadius: 8, padding: "8px 4px", fontSize: 13, fontWeight: 600,
            }}>{tt.emoji} {tt.label}</button>
          ))}
        </div>
      )}

      {type === "feed" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <input autoFocus type="number" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value)} placeholder="approx"
              style={{ flex: 1, padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 18, fontFamily: "inherit", textAlign: "center" }} />
            <span style={{ fontSize: 16, color: C.soft, fontWeight: 500 }}>ml</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {[60, 120, 150, 180, 210].map((q) => (
              <button key={q} onClick={() => setMl(String(q))} style={{ flex: 1, background: ml === String(q) ? C.sage : "#fff", color: ml === String(q) ? "#fff" : C.sageDeep, border: `1px solid ${ml === String(q) ? C.sage : C.line}`, borderRadius: 8, padding: "8px 0", fontSize: 13, fontWeight: 600 }}>{q}</button>
            ))}
          </div>
        </>
      )}

      {type === "food" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          {RATINGS.map((r) => (
            <button key={r.score} onClick={() => setRating(r.score)} style={{
              flex: 1, background: "#fff", border: `1px solid ${rating === r.score ? C.sage : C.line}`,
              borderRadius: 10, padding: "10px 4px", textAlign: "center", boxShadow: rating === r.score ? `0 0 0 1px ${C.sage}` : "none",
            }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 20, fontWeight: 600, color: rating === r.score ? C.sageDeep : C.soft }}>{r.score}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</div>
            </button>
          ))}
        </div>
      )}

      {type === "nap" && (
        <div style={{ fontSize: 13, color: C.soft, marginBottom: 10 }}>Tap save to log this nap. Add a note if it was short or unsettled.</div>
      )}

      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === "food" ? "what he had (e.g. malted milk biscuit, no reaction)" : "optional note"}
        style={{ width: "100%", padding: 11, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, marginBottom: 10, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={!canSave} style={{ flex: 1, background: canSave ? C.sageDeep : C.muted, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 600 }}>Save</button>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", color: C.soft }}>Cancel</button>
      </div>
    </div>
  );
}

function NoteInput({ onSave, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <>
      <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="anything worth flagging to Sonia"
        style={{ width: "100%", padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, marginBottom: 10, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => note.trim() && onSave(note.trim())} style={{ flex: 1, background: C.sageDeep, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 600 }}>Save note</button>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", color: C.soft }}>Cancel</button>
      </div>
    </>
  );
}

const MEDS = ["Calpol (paracetamol)", "Ibuprofen", "Antihistamine", "Other"];

function MedInput({ onSave, onCancel }) {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [med, setMed] = useState(MEDS[0]);
  const [dose, setDose] = useState("");
  const [time, setTime] = useState(hhmm);

  const save = () => {
    onSave({ med, dose: dose.trim(), medTime: time });
  };

  return (
    <>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.soft, fontWeight: 600, marginBottom: 8 }}>Medicine given</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {MEDS.map((m) => (
          <button key={m} onClick={() => setMed(m)} style={{
            background: med === m ? C.sageDeep : "#fff", color: med === m ? "#fff" : C.soft,
            border: `1px solid ${med === m ? C.sageDeep : C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600,
          }}>{m}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="dose, e.g. 2.5 ml"
          style={{ flex: 2, padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit" }} />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
          style={{ flex: 1, padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} style={{ flex: 1, background: C.sageDeep, color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 600 }}>Save medicine</button>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 16px", color: C.soft }}>Cancel</button>
      </div>
    </>
  );
}

// describes a log entry's detail line (no time shown unless it's medication)
function logDetail(l) {
  if (l.type === "med") {
    const bits = [l.med];
    if (l.dose) bits.push(l.dose);
    if (l.medTime) bits.push(`at ${l.medTime}`);
    return bits.join(" · ");
  }
  const bits = [];
  if (l.ml != null) bits.push(`${l.ml} ml`);
  if (l.rating != null) bits.push(`${RATINGS.find((r) => r.score === l.rating)?.label} (${l.rating})`);
  return bits.join(" · ");
}

function LogRow({ l, last, onDelete, onEdit, showDay }) {
  const t = LOG_TYPES.find((x) => x.id === l.type);
  const detail = logDetail(l);
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: last ? "none" : `1px solid ${C.line}`, fontSize: 14 }}>
      <div style={{ flex: 1 }}>
        <span>{t?.emoji} {t?.label}</span>
        {detail && <span style={{ color: C.sageDeep, fontWeight: 600 }}> · {detail}</span>}
        {l.note && <span style={{ color: C.soft }}> — {l.note}</span>}
        <div style={{ fontSize: 12, color: C.soft, marginTop: 1 }}>
          {showDay ? fmtDay(l.t) : ""}{showDay && l.by ? " · " : ""}{l.by ? l.by : (!showDay && !l.by ? "" : "")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        {onEdit && <button onClick={onEdit} style={{ background: "none", border: "none", color: C.soft, fontSize: 15, padding: 4 }}>✎</button>}
        {onDelete && <button onClick={onDelete} style={{ background: "none", border: "none", color: C.soft, fontSize: 18, padding: 4 }}>×</button>}
      </div>
    </div>
  );
}

// inline editor for an existing entry
function EditRow({ l, onSave, onCancel }) {
  const [ml, setMl] = useState(l.ml != null ? String(l.ml) : "");
  const [rating, setRating] = useState(l.rating ?? null);
  const [note, setNote] = useState(l.note || "");
  const [dose, setDose] = useState(l.dose || "");
  const [medTime, setMedTime] = useState(l.medTime || "");

  const save = () => {
    const changes = { note: note.trim() };
    if (l.type === "feed") changes.ml = ml ? Number(ml) : null;
    if (l.type === "food") changes.rating = rating;
    if (l.type === "med") { changes.dose = dose.trim(); changes.medTime = medTime; }
    onSave(changes);
  };

  const t = LOG_TYPES.find((x) => x.id === l.type);

  return (
    <div style={{ padding: "12px 16px", background: C.sageSoft, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Edit · {t?.emoji} {t?.label}</div>
      {l.type === "feed" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <input type="number" inputMode="numeric" value={ml} onChange={(e) => setMl(e.target.value)} placeholder="ml"
            style={{ flex: 1, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 16, fontFamily: "inherit", textAlign: "center" }} />
          <span style={{ fontSize: 15, color: C.soft }}>ml</span>
        </div>
      )}
      {l.type === "food" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {RATINGS.map((r) => (
            <button key={r.score} onClick={() => setRating(r.score)} style={{
              flex: 1, background: "#fff", border: `1px solid ${rating === r.score ? C.sage : C.line}`, borderRadius: 10, padding: "8px 4px", textAlign: "center", boxShadow: rating === r.score ? `0 0 0 1px ${C.sage}` : "none",
            }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: rating === r.score ? C.sageDeep : C.soft }}>{r.score}</div>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{r.label}</div>
            </button>
          ))}
        </div>
      )}
      {l.type === "med" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="dose"
            style={{ flex: 2, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit" }} />
          <input type="time" value={medTime} onChange={(e) => setMedTime(e.target.value)}
            style={{ flex: 1, padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit" }} />
        </div>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note"
        style={{ width: "100%", padding: 10, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, marginBottom: 8, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} style={{ flex: 1, background: C.sageDeep, color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 600 }}>Save changes</button>
        <button onClick={onCancel} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 16px", color: C.soft }}>Cancel</button>
      </div>
    </div>
  );
}

function Ladder({ state, save }) {
  const set = (n) => save({
    ...state,
    ladderStep: n,
    ladderStartedISO: n === 0 ? null : new Date().toISOString().slice(0, 10),
  });
  const { remaining } = stepProgress(state);
  const notStarted = state.ladderStep === 0;
  const [openRecipe, setOpenRecipe] = useState(state.ladderStep > 0 ? state.ladderStep : null);

  return (
    <>
      <Eyebrow>The iMAP milk ladder</Eyebrow>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, lineHeight: 1.5, color: C.soft }}>
          Tap a step name to set it as current — this updates everyone's phones and, from step 1 onward, restarts the {state.cadenceDays}-day timer from today.{" "}
          {notStarted
            ? "The ladder hasn't started — Hector is on no dairy. Tap step 1 when you're ready to begin."
            : `On step ${state.ladderStep} since ${fmtDay(state.ladderStartedISO)}${remaining > 0 ? `, ${remaining} day${remaining === 1 ? "" : "s"} to go.` : "."}`}
        </div>
      </Card>

      {LADDER.map((s) => {
        const current = s.n === state.ladderStep;
        const done = s.n < state.ladderStep;
        const isZero = s.n === 0;
        const showRecipe = openRecipe === s.n && s.recipe;
        return (
          <div key={s.n} style={{
            marginBottom: 8, borderRadius: 12, overflow: "hidden",
            background: current ? (isZero ? C.roseSoft : C.sageSoft) : C.card,
            border: `1px solid ${current ? (isZero ? C.roseBorder : C.blueBorder) : C.line}`,
          }}>
            <div style={{ display: "flex", alignItems: "stretch" }}>
              <button onClick={() => set(s.n)} style={{
                display: "flex", gap: 14, flex: 1, textAlign: "left", background: "none", border: "none", padding: 14, alignItems: "flex-start",
              }}>
                <div style={{
                  minWidth: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Fraunces, serif", fontWeight: 600, fontSize: 14,
                  background: current ? (isZero ? C.rose : C.sage) : done ? C.done : "#fff",
                  color: current || done ? "#fff" : C.soft,
                  border: `1px solid ${current ? (isZero ? C.rose : C.sage) : C.line}`,
                }}>{done ? "✓" : s.n}</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: current ? (isZero ? C.rose : C.sageDeep) : C.ink, opacity: done ? 0.6 : 1 }}>{s.food}</div>
                  <div style={{ fontSize: 13, color: C.soft, marginTop: 2, lineHeight: 1.4, opacity: done ? 0.6 : 1 }}>{s.note}</div>
                </div>
              </button>
              {s.recipe && (
                <button onClick={() => setOpenRecipe(showRecipe ? null : s.n)} style={{
                  background: "none", border: "none", borderLeft: `1px solid ${current ? (isZero ? C.roseBorder : C.blueBorder) : C.line}`,
                  padding: "0 16px", color: C.sageDeep, fontSize: 12, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minWidth: 64,
                }}>
                  <span style={{ fontSize: 16 }}>{showRecipe ? "▾" : "▸"}</span>
                  Recipe
                </button>
              )}
            </div>
            {showRecipe && <Recipe r={s.recipe} food={s.food} />}
          </div>
        );
      })}

      <div style={{ fontSize: 12, color: C.soft, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
        Recipes adapted from the iMAP Milk Ladder Recipes (gpifn.org.uk). "Milk" here means ordinary cow's milk — that's the allergen being reintroduced. Bake it in as directed; don't substitute formula.
      </div>
    </>
  );
}

function Recipe({ r, food }) {
  return (
    <div style={{ padding: "0 16px 16px", background: "rgba(255,255,255,0.55)" }}>
      <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 14 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: C.soft, fontWeight: 600, marginBottom: 8 }}>
          {food} recipe{r.makes ? ` · ${r.makes}` : ""}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Ingredients</div>
        <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
          {r.ingredients.map((it, i) => (
            <li key={i} style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5, marginBottom: 2 }}>{it}</li>
          ))}
        </ul>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>Method</div>
        <ol style={{ margin: "0 0 12px", paddingLeft: 18 }}>
          {r.method.map((it, i) => (
            <li key={i} style={{ fontSize: 13.5, color: C.ink, lineHeight: 1.5, marginBottom: 3 }}>{it}</li>
          ))}
        </ol>
        {r.tip && (
          <div style={{ fontSize: 13, color: C.sageDeep, background: C.sageSoft, borderRadius: 8, padding: "9px 11px", lineHeight: 1.5 }}>
            💡 {r.tip}
          </div>
        )}
      </div>
    </div>
  );
}

const LOG_TYPES = [
  { id: "wet", emoji: "💧", label: "Wet nappy" },
  { id: "dirty", emoji: "💩", label: "Dirty nappy" },
  { id: "feed", emoji: "🍼", label: "Feed" },
  { id: "food", emoji: "🥣", label: "Solids" },
  { id: "nap", emoji: "😴", label: "Nap" },
  { id: "ladder", emoji: "🪜", label: "Ladder food given" },
  { id: "med", emoji: "💊", label: "Medicine" },
  { id: "note", emoji: "📝", label: "Note" },
];

const RATINGS = [
  { score: 1, label: "Refused", desc: "Ate little to nothing" },
  { score: 2, label: "Average", desc: "Ate a fair amount" },
  { score: 3, label: "Excellent", desc: "Finished most or all" },
];

function History({ state, save }) {
  // group logs from the last 7 days by day, newest day first
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 6); // today + previous 6 = 7 days

  const recent = state.logs.filter((l) => new Date(l.t) >= cutoff);
  const byDay = {};
  recent.forEach((l) => {
    const key = new Date(l.t).toDateString();
    (byDay[key] = byDay[key] || []).push(l);
  });
  const dayKeys = Object.keys(byDay).sort((a, b) => new Date(b) - new Date(a));

  const todayKey = new Date().toDateString();
  const yesterdayKey = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); })();
  const dayLabel = (key) => key === todayKey ? "Today" : key === yesterdayKey ? "Yesterday" : fmtDay(key);

  const del = (iso) => save({ ...state, logs: state.logs.filter((l) => l.t !== iso) });

  return (
    <>
      <Eyebrow>Last 7 days</Eyebrow>
      {dayKeys.length === 0 ? (
        <Card><div style={{ fontSize: 14, color: C.soft }}>No entries in the last week yet.</div></Card>
      ) : (
        dayKeys.map((key) => {
          const dayLogs = byDay[key].slice().sort((a, b) => new Date(b.t) - new Date(a.t));
          const milk = dayLogs.reduce((s, l) => s + (l.type === "feed" && l.ml ? l.ml : 0), 0);
          const wet = dayLogs.filter((l) => l.type === "wet").length;
          const dirty = dayLogs.filter((l) => l.type === "dirty").length;
          const flag = (state.dayFlags || {})[key];
          return (
            <div key={key} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600 }}>{dayLabel(key)}</div>
                  {flag && (
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99,
                      background: flag.status === "fine" ? C.sageSoft : C.roseSoft,
                      color: flag.status === "fine" ? C.sageDeep : C.rose,
                    }}>{flag.status === "fine" ? "👍 All fine" : "⚠️ Check notes"}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.soft }}>
                  {milk > 0 && <span>🍼 {milk} ml</span>}{milk > 0 && (wet || dirty) ? " · " : ""}
                  {wet > 0 && <span>💧 {wet}</span>}{wet > 0 && dirty > 0 ? " · " : ""}
                  {dirty > 0 && <span>💩 {dirty}</span>}
                </div>
              </div>
              <Card style={{ padding: 0 }}>
                {dayLogs.map((l, i) => (
                  <LogRow key={l.t} l={l} last={i === dayLogs.length - 1} onDelete={() => del(l.t)} />
                ))}
              </Card>
            </div>
          );
        })
      )}
      <div style={{ fontSize: 12, color: C.soft, textAlign: "center", marginTop: 4 }}>
        Entries older than 7 days drop off this view automatically.
      </div>
    </>
  );
}

function Shopping({ state, save }) {
  const [text, setText] = useState("");
  const items = state.shopping || [];

  const add = () => {
    if (!text.trim()) return;
    save({ ...state, shopping: [...items, { id: Date.now() + "", name: text.trim(), done: false }] });
    setText("");
  };
  const toggle = (id) => save({ ...state, shopping: items.map((it) => it.id === id ? { ...it, done: !it.done } : it) });
  const remove = (id) => save({ ...state, shopping: items.filter((it) => it.id !== id) });
  const clearDone = () => save({ ...state, shopping: items.filter((it) => !it.done) });

  const open = items.filter((it) => !it.done);
  const done = items.filter((it) => it.done);

  return (
    <>
      <Eyebrow>Shared shopping list</Eyebrow>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add an item…"
            style={{ flex: 1, padding: 12, border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 15, fontFamily: "inherit" }} />
          <button onClick={add} style={{ background: C.sageDeep, color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontWeight: 600, fontSize: 20 }}>+</button>
        </div>
      </Card>

      {open.length === 0 && done.length === 0 ? (
        <Card><div style={{ fontSize: 14, color: C.soft }}>List is empty. Add the first item above — Sonia and Klara both see it instantly.</div></Card>
      ) : (
        <Card style={{ padding: 0 }}>
          {open.map((it, i) => (
            <ShopItem key={it.id} it={it} last={i === open.length - 1 && done.length === 0} onToggle={() => toggle(it.id)} onRemove={() => remove(it.id)} />
          ))}
          {done.map((it, i) => (
            <ShopItem key={it.id} it={it} last={i === done.length - 1} onToggle={() => toggle(it.id)} onRemove={() => remove(it.id)} />
          ))}
        </Card>
      )}

      {done.length > 0 && (
        <button onClick={clearDone} style={{ marginTop: 14, width: "100%", background: "none", border: `1px solid ${C.line}`, borderRadius: 10, padding: 12, color: C.soft, fontSize: 14, fontWeight: 500 }}>
          Clear {done.length} ticked item{done.length === 1 ? "" : "s"}
        </button>
      )}
    </>
  );
}

function ShopItem({ it, last, onToggle, onRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: last ? "none" : `1px solid ${C.line}` }}>
      <button onClick={onToggle} style={{
        width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: `1.5px solid ${it.done ? C.sage : C.line}`,
        background: it.done ? C.sage : "#fff", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{it.done ? "✓" : ""}</button>
      <div onClick={onToggle} style={{ flex: 1, fontSize: 15, color: it.done ? C.soft : C.ink, textDecoration: it.done ? "line-through" : "none", cursor: "pointer" }}>{it.name}</div>
      <button onClick={onRemove} style={{ background: "none", border: "none", color: C.soft, fontSize: 18, padding: 4 }}>×</button>
    </div>
  );
}

function Info({ state, save }) {
  const setContact = (i, value) => {
    const contacts = state.contacts.map((c, idx) => (idx === i ? { ...c, value } : c));
    save({ ...state, contacts });
  };

  return (
    <>
      <Eyebrow>If Hector reacts</Eyebrow>
      <Card style={{ background: C.roseSoft, borderColor: C.roseBorder, marginBottom: 16 }}>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.ink }}>
          <strong style={{ color: C.rose }}>Mild</strong> (a few hives, mild tummy upset): stop the food, give antihistamine if prescribed, watch closely, message Sonia.<br /><br />
          <strong style={{ color: C.rose }}>Severe</strong> — any swelling of lips/tongue/throat, difficulty breathing, wheeze, persistent cough, floppiness or pale/blue colour: <strong>call 999 now</strong>, say "anaphylaxis", use adrenaline auto-injector if prescribed, lie him flat with legs raised.
        </div>
      </Card>

      <Eyebrow>Contacts</Eyebrow>
      <Card style={{ padding: 0, marginBottom: 16 }}>
        {state.contacts.map((c, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: i < state.contacts.length - 1 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: c.urgent ? C.rose : C.ink }}>{c.label}</div>
            {c.urgent ? (
              <a href={`tel:${c.value}`} style={{ fontSize: 15, fontWeight: 600, color: C.rose, textDecoration: "none" }}>{c.value} →</a>
            ) : (
              <input value={c.value} onChange={(e) => setContact(i, e.target.value)}
                style={{ textAlign: "right", border: "none", background: "none", fontSize: 14, color: C.soft, fontFamily: "inherit", maxWidth: 160 }} />
            )}
          </div>
        ))}
      </Card>

      <Eyebrow>Daily reminders</Eyebrow>
      <Card>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: C.soft }}>
          {state.ladderStep === 0
            ? "Hector is on NO dairy at all — the milk ladder hasn't started. "
            : "Hector is dairy-free except for the current ladder step. "}
          Always check labels for milk, whey, casein, butter. His bottles use hydrolysed formula (Aptamil) — never standard cow's milk formula. When in doubt, leave it out and ask Sonia.
        </div>
      </Card>
    </>
  );
}
