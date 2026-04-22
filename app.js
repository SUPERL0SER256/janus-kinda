const PAGES = ['p1', 'p12', 'p21', 'p22', 'p24', 'p13', 'p14'];

function show(id) {
    PAGES.forEach(p => {
        document.getElementById(p).classList.remove('on');
        const pill = document.getElementById('np-' + p);
        if (pill) pill.classList.remove('on');
    });
    document.getElementById(id).classList.add('on');
    const activePill = document.getElementById('np-' + id);
    if (activePill) activePill.classList.add('on');
}


const G = {
    title: '', creator: '', brief: '',
    images: [], // {id, src, name}
    eloScores: {}, // id -> score
    matchCount: {}, // id -> matches played
    responses: [], // {name, anon, comparisons, ts}
    totalComps: 0,
    sessionId: 'JNS-' + String(Math.floor(Math.random() * 9000) + 1000)
};


let dA = 1500, dB = 1500;
function demoPick(w) {
    const K = 32, ea = 1 / (1 + Math.pow(10, (dB - dA) / 400)), eb = 1 - ea;
    if (w === 'a') {
        dA += Math.round(K * (1 - ea));
        dB += Math.round(K * (0 - eb));
    } else {
        dB += Math.round(K * (1 - eb));
        dA += Math.round(K * (0 - ea));
    }
    const t = dA + dB;
    document.getElementById('ef-a').style.width = (dA / t * 100) + '%';
    document.getElementById('ef-b').style.width = (dB / t * 100) + '%';
    document.getElementById('en-a').textContent = dA;
    document.getElementById('en-b').textContent = dB;
    document.getElementById('dc-a').classList.toggle('picked', w === 'a');
    document.getElementById('dc-b').classList.toggle('picked', w === 'b');
    document.getElementById('dt-a').textContent = w === 'a' ? 'Selected ✓' : 'Option A';
    document.getElementById('dt-b').textContent = w === 'b' ? 'Selected ✓' : 'Option B';
    setTimeout(() => {
        document.getElementById('dc-a').classList.remove('picked');
        document.getElementById('dc-b').classList.remove('picked');
        document.getElementById('dt-a').textContent = 'Option A';
        document.getElementById('dt-b').textContent = 'Option B';
    }, 900);
}


function handleFiles(files) {
    Array.from(files).forEach(f => {
        if (!f.type.startsWith('image/')) return;
        if (G.images.length >= 30) return;
        const r = new FileReader();
        r.onload = ev => {
            const id = 'V' + String(G.images.length + 1).padStart(2, '0');
            G.images.push({ id, src: ev.target.result, name: f.name });
            G.eloScores[id] = 1500;
            G.matchCount[id] = 0;
            renderThumbs();
        };
        r.readAsDataURL(f);
    });
}

function handleDrop(e) { handleFiles(e.dataTransfer.files); }

function renderThumbs() {
    const tg = document.getElementById('tg'); tg.innerHTML = '';
    G.images.forEach((img, i) => {
        const d = document.createElement('div'); d.className = 'thumb';
        d.innerHTML = `<img src="${img.src}" alt="${img.name}"/><button class="tdel" onclick="event.stopPropagation();removeImg(${i})">✕</button><div class="tid">${img.id}</div>`;
        tg.appendChild(d);
    });
    const n = G.images.length;
    const compsPerPerson = n > 1 ? Math.ceil(n * 1.5) : 0;
    document.getElementById('vc').textContent = n;
    document.getElementById('pc').textContent = compsPerPerson;
    const gb = document.getElementById('gbtn');
    if (n >= 2) {
        gb.disabled = false;
        document.getElementById('ghint').textContent = compsPerPerson + ' comparisons per evaluator';
    } else {
        gb.disabled = true;
        document.getElementById('ghint').textContent = 'Upload at least 2 images';
    }
}

function removeImg(i) {
    G.images.splice(i, 1);
    G.images.forEach((x, j) => { x.id = 'V' + String(j + 1).padStart(2, '0'); });
    G.eloScores = {}; G.matchCount = {};
    G.images.forEach(x => { G.eloScores[x.id] = 1500; G.matchCount[x.id] = 0; });
    renderThumbs();
    document.getElementById('lb').classList.remove('on');
}

function genLink() {
    const n = G.images.length;
    const compsPerPerson = Math.ceil(n * 1.5);
    G.title = document.getElementById('s-title').value || 'Untitled system';
    G.creator = document.getElementById('s-creator').value || 'Anonymous';
    G.brief = document.getElementById('s-brief').value || '';
    const slug = G.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 24);
    document.getElementById('lburl').innerHTML = `<span>https://janus.design/s/</span>${G.sessionId.toLowerCase()}/${slug}`;
    document.getElementById('ls-v').textContent = n;
    document.getElementById('ls-c').textContent = compsPerPerson;
    document.getElementById('ls-s').textContent = '~' + Math.max(5, Math.ceil(80 / compsPerPerson));
    document.getElementById('lb').classList.add('on');
    document.getElementById('lb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function copyLnk() {
    const btn = document.getElementById('cpbtn');
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
        btn.textContent = 'Copy link';
        btn.classList.remove('copied');
    }, 2000);
}


let anonOn = false;
function toggleAnon() {
    anonOn = !anonOn;
    document.getElementById('abox').classList.toggle('on', anonOn);
    const ni = document.getElementById('eval-name');
    ni.disabled = anonOn;
    ni.style.opacity = anonOn ? '.35' : '1';
}

function startSession() {
    if (G.title) document.getElementById('entry-title').textContent = G.title;
    if (G.creator) document.getElementById('entry-creator').textContent = 'by ' + G.creator;
    if (G.brief) document.getElementById('entry-brief').textContent = G.brief;
    document.getElementById('entry-imgs').textContent = G.images.length || '—';
    document.getElementById('entry-comps').textContent = G.images.length > 1 ? Math.ceil(G.images.length * 1.5) : '—';
    document.getElementById('entry-resps').textContent = G.responses.length;
    show('p21');
}


let cSession = { pairs: [], idx: 0, name: '', results: [] };

function buildPairs() {
    const imgs = G.images;
    const n = imgs.length;
    const target = Math.ceil(n * 1.5);
    const pairs = [];
    const seen = {}; imgs.forEach(i => seen[i.id] = 0);
    const used = new Set();
    const sorted = [...imgs].sort((a, b) => G.eloScores[a.id] - G.eloScores[b.id]);

    for (let i = 0; i < sorted.length - 1; i++) {
        const key = sorted[i].id + '_' + sorted[i + 1].id;
        if (!used.has(key)) {
            pairs.push([sorted[i], sorted[i + 1]]);
            used.add(key);
            seen[sorted[i].id]++;
            seen[sorted[i + 1].id]++;
        }
        if (pairs.length >= target) break;
    }

    let attempts = 0;
    while (pairs.length < target && attempts < 200) {
        attempts++;
        const leastSeen = [...imgs].sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));
        const a = leastSeen[0];
        const b = leastSeen.find(x => x.id !== a.id && !used.has(a.id + '_' + x.id) && !used.has(x.id + '_' + a.id));
        if (!b) break;
        const key = a.id + '_' + b.id;
        pairs.push([a, b]); used.add(key);
        seen[a.id] = (seen[a.id] || 0) + 1;
        seen[b.id] = (seen[b.id] || 0) + 1;
    }
    return shuffleArr(pairs);
}

function shuffleArr(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function beginCompare() {
    const name = anonOn ? 'Anonymous' : (document.getElementById('eval-name').value.trim() || 'Anonymous');
    cSession = { pairs: buildPairs(), idx: 0, name, results: [] };
    document.getElementById('cmp-title').textContent = G.title || 'Session';
    show('p22');
    renderCmp();
}

function renderCmp() {
    const pair = cSession.pairs[cSession.idx];
    if (!pair) return;
    const [a, b] = pair;
    document.getElementById('img-a').innerHTML = `<img src="${a.src}" alt="${a.id}"/><div class="ab-badge">Selected</div>`;
    document.getElementById('img-b').innerHTML = `<img src="${b.src}" alt="${b.id}"/><div class="ab-badge">Selected</div>`;
    document.getElementById('lbl-a').textContent = a.id;
    document.getElementById('lbl-b').textContent = b.id;
    document.getElementById('elo-a-disp').textContent = Math.round(G.eloScores[a.id]);
    document.getElementById('elo-b-disp').textContent = Math.round(G.eloScores[b.id]);
    document.getElementById('ep-a').textContent = a.id;
    document.getElementById('ep-b').textContent = b.id;
    document.getElementById('es-a').textContent = Math.round(G.eloScores[a.id]);
    document.getElementById('es-b').textContent = Math.round(G.eloScores[b.id]);
    document.getElementById('ed-a').textContent = '';
    document.getElementById('ed-b').textContent = '';
    document.getElementById('ca').classList.remove('winner', 'loser');
    document.getElementById('cb').classList.remove('winner', 'loser');
    document.getElementById('nbtn').classList.remove('on');
    const pct = Math.round((cSession.idx / cSession.pairs.length) * 100);
    document.getElementById('prog').style.width = pct + '%';
    document.getElementById('prog-lbl').textContent = (cSession.idx + 1) + ' of ' + cSession.pairs.length;
    const minMatches = Math.min(...G.images.map(x => G.matchCount[x.id] || 0));
    const convPct = Math.min(100, Math.round((minMatches / 5) * 100));
    document.getElementById('conv-fill').style.width = convPct + '%';
    document.getElementById('conv-pct').textContent = convPct + '%';
}

let picking = false;
function pickCard(w) {
    if (picking) return; picking = true;
    const pair = cSession.pairs[cSession.idx];
    const [a, b] = pair;
    const winner = w === 'a' ? a : b;
    const loser = w === 'a' ? b : a;
    const K = 32, Ra = G.eloScores[a.id], Rb = G.eloScores[b.id];
    const Ea = 1 / (1 + Math.pow(10, (Rb - Ra) / 400)), Eb = 1 - Ea;
    let da, db;
    if (w === 'a') { da = Math.round(K * (1 - Ea)); db = Math.round(K * (0 - Eb)); }
    else { db = Math.round(K * (1 - Eb)); da = Math.round(K * (0 - Ea)); }
    G.eloScores[a.id] += da; G.eloScores[b.id] += db;
    G.matchCount[a.id] = (G.matchCount[a.id] || 0) + 1;
    G.matchCount[b.id] = (G.matchCount[b.id] || 0) + 1;
    G.totalComps++;
    cSession.results.push({ winner: winner.id, loser: loser.id });
    document.getElementById('es-a').textContent = Math.round(G.eloScores[a.id]);
    document.getElementById('es-b').textContent = Math.round(G.eloScores[b.id]);
    document.getElementById('ed-a').textContent = (da >= 0 ? '+' : '') + da;
    document.getElementById('ed-a').className = 'ep-delta ' + (da >= 0 ? 'pos' : 'neg');
    document.getElementById('ed-b').textContent = (db >= 0 ? '+' : '') + db;
    document.getElementById('ed-b').className = 'ep-delta ' + (db >= 0 ? 'pos' : 'neg');
    document.getElementById('c' + w).classList.add('winner');
    document.getElementById('c' + (w === 'a' ? 'b' : 'a')).classList.add('loser');
    document.getElementById('nbtn').classList.add('on');
    cSession.idx++;
    if (cSession.idx >= cSession.pairs.length) {
        document.getElementById('nbtn').textContent = 'Finish →';
        document.getElementById('nbtn').onclick = finishSession;
    }
    setTimeout(() => { picking = false; }, 300);
}

function nextCmp() {
    if (cSession.idx >= cSession.pairs.length) { finishSession(); return; }
    renderCmp();
}

function finishSession() {
    G.responses.push({ name: cSession.name, comps: cSession.results.length, ts: 'Just now' });
    document.getElementById('done-comps').textContent = cSession.results.length;
    document.getElementById('done-resps').textContent = G.responses.length;
    show('p24');
    document.getElementById('nbtn').textContent = 'Next →';
    document.getElementById('nbtn').onclick = nextCmp;
}


function renderResponses() {
    document.getElementById('rm-resps').textContent = G.responses.length;
    document.getElementById('rm-comps').textContent = G.totalComps;
    document.getElementById('rm-imgs').textContent = G.images.length;
    document.getElementById('rm-cpe').textContent = G.images.length > 1 ? Math.ceil(G.images.length * 1.5) : 0;
    const body = document.getElementById('resp-body');
    if (G.responses.length === 0) {
        body.innerHTML = `<div class="empty-state"><strong>No responses yet</strong>Share your session link to start collecting votes.</div>`;
        return;
    }
    let html = `<table class="resp-table"><thead><tr><th>#</th><th>Evaluator</th><th>Comparisons</th><th>Submitted</th><th>Status</th></tr></thead><tbody>`;
    G.responses.forEach((r, i) => {
        html += `<tr><td>${String(i + 1).padStart(2, '0')}</td><td>${r.name === 'Anonymous' ? `<span style="color:var(--muted);font-style:italic">Anonymous</span>` : r.name}</td><td>${r.comps}</td><td>${r.ts}</td><td><span class="badge">Complete</span></td></tr>`;
    });
    html += `</tbody></table>`;
    body.innerHTML = html;
}


function renderResults() {
    document.getElementById('res-resps').textContent = G.responses.length;
    document.getElementById('res-comps').textContent = G.totalComps;
    document.getElementById('res-imgs').textContent = G.images.length;
    const el = document.getElementById('rl');
    if (G.images.length === 0) {
        el.innerHTML = `<div class="empty-state"><strong>No data yet</strong>Create a system and collect responses first.</div>`;
        document.getElementById('res-top').textContent = '—';
        document.getElementById('stab-note').textContent = '';
        return;
    }
    const sorted = [...G.images].sort((a, b) => G.eloScores[b.id] - G.eloScores[a.id]);
    const maxElo = G.eloScores[sorted[0].id];
    const minElo = G.eloScores[sorted[sorted.length - 1].id];
    document.getElementById('res-top').textContent = Math.round(maxElo);
    el.innerHTML = '';
    sorted.forEach((img, i) => {
        const elo = Math.round(G.eloScores[img.id]);
        const matches = G.matchCount[img.id] || 0;
        const pct = maxElo === minElo ? 50 : Math.round(((elo - minElo) / (maxElo - minElo)) * 100);
        const conf = Math.min(5, Math.floor(matches / 2));
        let pips = ''; for (let p = 0; p < 5; p++) pips += `<span class="conf-pip${p < conf ? ' filled' : ''}"></span>`;
        const d = document.createElement('div'); d.className = 'ri' + (i === 0 ? ' top' : '');
        d.innerHTML = `<div class="ri-num">${String(i + 1).padStart(2, '0')}</div>
      <div class="ri-thumb"><img src="${img.src}" alt="${img.id}" /></div>
      <div class="ri-body"><div class="ri-name">${img.id} · ${img.name.replace(/\.[^.]+$/, '').slice(0, 20)}</div><div class="ri-bar"><div class="ri-fill" style="width:${pct}%"></div></div></div>
      <div class="ri-right"><div class="ri-elo">${elo}</div><div class="ri-conf">${pips} ${matches}m</div></div>`;
        el.appendChild(d);
    });
    const minM = Math.min(...G.images.map(x => G.matchCount[x.id] || 0));
    document.getElementById('stab-note').textContent = minM >= 5 ? 'Ranking is stable — each image has been seen 5+ times.' : 'Ranking is still forming — collect more responses for higher confidence.';
}


document.getElementById('np-p13').addEventListener('click', renderResponses);
document.getElementById('np-p14').addEventListener('click', renderResults);
document.getElementById('np-p21').addEventListener('click', startSession);
document.getElementById('np-p22').addEventListener('click', () => { if (G.images.length >= 2) beginCompare(); });
document.getElementById('start-btn').addEventListener('click', beginCompare);