
// FastAPI prediction endpoint
const API_URL = "http://127.0.0.1:8000/predict";

const $ = (s) => document.querySelector(s);

const form = $("#form");
const cv = $("#flow");
const ctx = cv.getContext("2d");

const body = document.body;
const stage = $("#stage");
const scanBtn = $("#scan");
const errEl = $("#err");

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;


// Input fields
const NUM = [
    "step",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
];


// Sample transaction presets
const PRESETS = {

    safe: {
        type: "PAYMENT",
        step: 12,
        amount: 1864.28,
        oldbalanceOrg: 21249,
        newbalanceOrig: 19384.72,
        oldbalanceDest: 0,
        newbalanceDest: 0
    },

    fraud: {
        type: "TRANSFER",
        step: 300,
        amount: 500000,
        oldbalanceOrg: 500000,
        newbalanceOrig: 0,
        oldbalanceDest: 0,
        newbalanceDest: 500000
    }

};


// Visualization colors
const TONES = {
    idle: [125, 180, 255],
    low: [94, 234, 212],
    mid: [255, 191, 94],
    high: [255, 77, 109]
};


const fmt = (n) => Math.round(n).toLocaleString();

const money = (n) =>
    Number(n).toLocaleString(undefined, {
        maximumFractionDigits: 2
    });


// ---------------- Scene state ----------------

const KEYS = [
    "amt",
    "sVal",
    "rVal",
    "sA",
    "sB",
    "rA",
    "rB"
];

const T = {};
const V = {};

KEYS.forEach((k) => {
    T[k] = 0;
    V[k] = 0;
});


function sync() {

    const n = (k) =>
        Math.max(0, parseFloat(form.elements[k].value) || 0);

    const a = n("amount");
    const so = n("oldbalanceOrg");
    const sn = n("newbalanceOrig");
    const ro = n("oldbalanceDest");
    const rn = n("newbalanceDest");

    const m = Math.max(a, so, sn, ro, rn, 1);

    Object.assign(T, {
        amt: a,
        sVal: sn,
        rVal: rn,
        sA: sn / m,
        sB: so / m,
        rA: rn / m,
        rB: ro / m
    });

}


// ---------------- Canvas visualization ----------------

let W = 0;
let H = 0;

function size() {

    const r = cv.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);

    W = r.width;
    H = r.height;

    cv.width = W * dpr;
    cv.height = H * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

}

new ResizeObserver(size).observe(cv);


let tone = [...TONES.idle];
let tt = 0;
let scan = -1;
let onSweepDone = null;
let acc = 0;

const P = [];

const rgba = (a) =>
    `rgba(${tone.map(Math.round).join(",")},${a})`;

const bz = (p0, p1, p2, p3, u) => {

    const m = 1 - u;

    return (
        m * m * m * p0 +
        3 * m * m * u * p1 +
        3 * m * u * u * p2 +
        u * u * u * p3
    );

};


function tank(x, y, w, h, level, before, title, value, phase) {

    ctx.save();

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);

    ctx.fillStyle = "rgba(255,255,255,.05)";
    ctx.fill();

    ctx.clip();

    const top = y + h * (1 - level);

    const g = ctx.createLinearGradient(0, top, 0, y + h);

    g.addColorStop(0, rgba(.9));
    g.addColorStop(1, rgba(.25));

    [[1, 0, 5], [.5, 1.7, 4]].forEach(([alpha, off, amp]) => {

        ctx.beginPath();
        ctx.moveTo(x, y + h);

        for (let i = 0; i <= w; i += 6) {

            ctx.lineTo(
                x + i,
                top + (
                    level > .01
                        ? Math.sin(i * .045 + tt * 1.8 + phase + off) * amp
                        : 0
                )
            );

        }

        ctx.lineTo(x + w, y + h);
        ctx.closePath();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = g;
        ctx.fill();

    });

    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);

    ctx.strokeStyle = "rgba(173,205,255,.3)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.stroke();

    const by = y + h * (1 - before);

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(234,242,255,.7)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x - 6, by);
    ctx.lineTo(x + w + 6, by);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(234,242,255,.75)";
    ctx.font = "500 10px 'Instrument Sans', sans-serif";

    ctx.fillText("before", x + 8, Math.min(by - 5, y + h - 6));

    ctx.textAlign = "center";

    ctx.fillStyle = "#93a9c6";
    ctx.font = "600 13px 'Instrument Sans', sans-serif";
    ctx.fillText(title, x + w / 2, y - 12);

    ctx.fillStyle = "#eaf2ff";
    ctx.font = "800 18px 'Bricolage Grotesque', sans-serif";
    ctx.fillText(fmt(value), x + w / 2, y + h + 26);

    ctx.fillStyle = "#93a9c6";
    ctx.font = "400 11px 'Instrument Sans', sans-serif";
    ctx.fillText("balance after", x + w / 2, y + h + 42);

}


function draw(dt) {

    ctx.clearRect(0, 0, W, H);

    const hi = body.dataset.state === "high";

    const tw = Math.min(150, W * .24);
    const th = H * .6;
    const ty = H * .2;

    const lx = W * .07;
    const rx = W - W * .07 - tw;
    const cy = ty + th / 2;

    const p0 = lx + tw;
    const p3 = rx;

    const c1x = p0 + (p3 - p0) * .4;
    const c2x = p0 + (p3 - p0) * .6;

    const c1y = cy - H * .2;
    const c2y = cy + H * .2;


    ctx.textAlign = "center";
    ctx.fillStyle = "#93a9c6";
    ctx.font = "500 12px 'Instrument Sans', sans-serif";

    ctx.fillText("Amount moving", W / 2, 22);

    ctx.fillStyle = rgba(1);
    ctx.font = "800 24px 'Bricolage Grotesque', sans-serif";

    ctx.fillText(fmt(V.amt), W / 2, 50);


    ctx.beginPath();
    ctx.moveTo(p0, cy);

    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p3, cy);

    ctx.setLineDash([2, 8]);
    ctx.strokeStyle = rgba(.22);
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.setLineDash([]);


    if (!reduce) {

        acc += (
            T.amt > 0
                ? 3 + Math.min(22, Math.log10(T.amt + 1) * 3.2)
                : 0
        ) * dt;

        while (acc >= 1 && P.length < 160) {

            acc--;

            P.push({
                u: 0,
                s: .28 + Math.random() * .2,
                o: (Math.random() - .5) * 16,
                r: 1.5 + Math.random() * 2.2
            });

        }

        acc = Math.min(acc, 2);

        ctx.globalCompositeOperation = "lighter";

        for (let i = P.length - 1; i >= 0; i--) {

            const q = P[i];

            q.u += q.s * dt * (hi ? 1.9 : 1);

            if (q.u >= 1) {
                P.splice(i, 1);
                continue;
            }

            const x = bz(p0, c1x, c2x, p3, q.u);

            const y =
                bz(cy, c1y, c2y, cy, q.u) +
                q.o * Math.sin(q.u * Math.PI) +
                (hi ? Math.sin(tt * 30 + q.o) * 3 : 0);

            const a = Math.sin(q.u * Math.PI);

            ctx.fillStyle = rgba(a * .18);
            ctx.beginPath();
            ctx.arc(x, y, q.r * 3.2, 0, 6.283);
            ctx.fill();

            ctx.fillStyle = rgba(a);
            ctx.beginPath();
            ctx.arc(x, y, q.r, 0, 6.283);
            ctx.fill();

        }

        ctx.globalCompositeOperation = "source-over";

    }


    tank(lx, ty, tw, th, V.sA, V.sB, "Sender", V.sVal, 0);

    tank(rx, ty, tw, th, V.rA, V.rB, "Recipient", V.rVal, 2.2);


    if (scan >= 0) {

        const x = scan * W;

        const g = ctx.createLinearGradient(x - 110, 0, x, 0);

        g.addColorStop(0, rgba(0));
        g.addColorStop(1, rgba(.35));

        ctx.fillStyle = g;
        ctx.fillRect(x - 110, 0, 110, H);

        ctx.fillStyle = rgba(.95);
        ctx.fillRect(x - 1, 0, 2, H);

    }

}


// Animation loop

let last = performance.now();

function frame(now) {

    const dt = Math.min(.05, (now - last) / 1000);

    last = now;

    if (!reduce) tt += dt;

    const k = reduce ? 1 : Math.min(1, dt * 4);

    KEYS.forEach((key) => {
        V[key] += (T[key] - V[key]) * k;
    });

    const tg = TONES[body.dataset.state];

    tone = tone.map((c, i) =>
        c + (tg[i] - c) * (reduce ? 1 : Math.min(1, dt * 3))
    );

    if (scan >= 0) {

        scan += dt / 1.2;

        if (scan >= 1) {

            scan = -1;

            if (onSweepDone) onSweepDone();

        }

    }

    if (W) draw(dt);

    requestAnimationFrame(frame);

}


const sweep = () => new Promise((res) => {

    if (reduce) return res();

    scan = 0;
    onSweepDone = res;

});


// ---------------- Form and results ----------------

function tween(a, b, ms, fn) {

    if (reduce) return fn(b);

    const s = performance.now();

    (function step(n) {

        const u = Math.min(1, (n - s) / ms);

        fn(a + (b - a) * (1 - Math.pow(1 - u, 3)));

        if (u < 1) requestAnimationFrame(step);

    })(s);

}


function showErr(m) {

    errEl.textContent = m;
    errEl.hidden = !m;

}


function read() {

    const d = {
        type: form.elements.type.value
    };

    let ok = true;

    NUM.forEach((n) => {

        const el = form.elements[n];

        const v = el.value.trim();
        const x = Number(v);

        const bad =
            v === "" ||
            !Number.isFinite(x) ||
            x < 0 ||
            (n === "step" && (!Number.isInteger(x) || x < 1 || x > 743));

        el.classList.remove("bad");

        if (bad) {

            void el.offsetWidth;
            el.classList.add("bad");

            ok = false;

        }

        d[n] = x;

    });


    if (!ok) {

        showErr(
            "Fill in every field with valid numbers. Amounts and balances must be non-negative, and time step must be a whole number from 1 to 743."
        );

    }

    return ok ? d : null;

}


function clearResult() {

    body.dataset.state = "idle";

    $("#arc").style.strokeDashoffset = 100;

    $("#score").textContent = "–";

    $("#vt").textContent = "Ready to scan";

    $("#note").textContent =
        "Change any number and the accounts update live. Press “Scan transaction” to get the model’s verdict.";

    $("#chips").innerHTML = "";

    stage.classList.remove("alarm");

}


// Balance consistency checks

function checks(d) {

    const out = [];

    const sExp = d.oldbalanceOrg - d.amount;
    const rExp = d.oldbalanceDest + d.amount;


    if (
        d.newbalanceOrig === 0 &&
        d.oldbalanceOrg > 0 &&
        d.amount >= d.oldbalanceOrg
    ) {

        out.push([
            "flag",
            "Empties the sender's account"
        ]);

    }


    out.push(
        Math.abs(sExp - d.newbalanceOrig) < .01
            ? ["ok", "Sender balance adds up"]
            : ["flag", `Sender balance should be ${money(sExp)}`]
    );


    if (d.type === "TRANSFER" || d.type === "CASH_OUT") {

        if (
            d.oldbalanceDest === 0 &&
            d.newbalanceDest === 0 &&
            d.amount > 0
        ) {

            out.push([
                "flag",
                "Recipient balance never moves"
            ]);

        } else {

            out.push(
                Math.abs(rExp - d.newbalanceDest) < .01
                    ? ["ok", "Recipient balance adds up"]
                    : ["flag", `Recipient balance should be ${money(rExp)}`]
            );

        }

    }


    $("#chips").innerHTML = "";

    out.forEach(([kind, text], i) => {

        const c = document.createElement("div");

        c.className = `chip ${kind}`;

        c.style.setProperty("--i", i);

        c.textContent = text;

        $("#chips").appendChild(c);

    });

}


// Display model prediction

function reveal(p, fraud, d) {

    const pct = Math.max(0, Math.min(100, p * 100));

    const s =
        fraud || pct >= 70
            ? "high"
            : pct >= 30
                ? "mid"
                : "low";

    body.dataset.state = s;

    $("#arc").style.strokeDashoffset = 100 - pct;

    tween(0, pct, 1200, (v) => {

        $("#score").textContent =
            v.toFixed(pct > 0 && pct < 10 ? 1 : 0) + "%";

    });


    $("#vt").textContent = fraud
        ? "Likely fraud"
        : s === "mid"
            ? "Not flagged, but worth a look"
            : "Looks legitimate";


    $("#note").textContent = fraud
        ? "The model flagged this transaction. Hold it for manual review before it goes through."
        : s === "mid"
            ? "The model did not mark this as fraud, though the estimated fraud probability is higher than usual."
            : "The model sees no strong sign of fraud in this transaction.";

    checks(d);

    if (s === "high") {
        stage.classList.add("alarm");
    }

}


stage.addEventListener("animationend", () => {
    stage.classList.remove("alarm");
});


// ---------------- FastAPI request ----------------

async function post(d) {

    const res = await fetch(API_URL, {

        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(d)

    });


    const out = await res.json().catch(() => ({}));


    if (!res.ok) {

        const msg = Array.isArray(out.detail)
            ? out.detail.map((x) =>
                `${x.loc[x.loc.length - 1]}: ${x.msg}`
            ).join("; ")
            : out.detail;

        throw new Error(msg || `Server returned ${res.status}`);

    }

    return out;

}


// ---------------- Form submission ----------------

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    showErr("");

    const d = read();

    if (!d) return;

    scanBtn.disabled = true;

    scanBtn.classList.add("busy");

    scanBtn.textContent = "Scanning…";


    try {

        const [out] = await Promise.all([
            post(d),
            sweep()
        ]);

        reveal(
            out.fraud_probability,
            out.prediction === 1,
            d
        );

    } catch (err) {

        showErr(
            err instanceof TypeError
                ? "Could not reach the server. Make sure FastAPI is running and CORS is enabled."
                : err.message
        );

    } finally {

        scanBtn.disabled = false;

        scanBtn.classList.remove("busy");

        scanBtn.textContent = "Scan transaction";

    }

});


// ---------------- Live input updates ----------------

form.addEventListener("input", (e) => {

    e.target.classList.remove("bad");

    showErr("");

    sync();

    if (body.dataset.state !== "idle") {
        clearResult();
    }

});


// ---------------- Preset handling ----------------

function applyPreset(name) {

    const p = PRESETS[name];

    if (!p) return;

    form.querySelector(
        `input[name="type"][value="${p.type}"]`
    ).checked = true;


    NUM.forEach((n) => {

        form.elements[n].value = p[n];

        form.elements[n].classList.remove("bad");

    });


    showErr("");

    sync();

    clearResult();

}


document.querySelectorAll("[data-preset]").forEach((b) => {

    b.addEventListener("click", () => {

        applyPreset(b.dataset.preset);

    });

});


// ---------------- Pointer interaction ----------------

addEventListener("pointermove", (e) => {

    document.documentElement.style.setProperty(
        "--mx",
        e.clientX + "px"
    );

    document.documentElement.style.setProperty(
        "--my",
        e.clientY + "px"
    );

});


// ---------------- Initial setup ----------------

applyPreset("safe");

requestAnimationFrame(frame);
