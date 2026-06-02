import type { Manifest } from "../schema";

/**
 * Public-domain melodies encoded as space-separated "NOTE:beats" tokens.
 * NOTE is like "E5" / "C#4" / "R" (rest); beats defaults to 1 (an eighth note).
 * These are rendered live by a tiny Web Audio square-wave synth — no MIDI files.
 */
const MELODIES: Record<string, string> = {
  "fur-elise":
    "E5 D#5 E5 D#5 E5 B4 D5 C5 A4:2 R C4 E4 A4 B4:2 R E4 G#4 B4 C5:2 R " +
    "E4 E5 D#5 E5 D#5 E5 B4 D5 C5 A4:2 R C4 E4 A4 B4:2 R E4 C5 B4 A4:3 R",
  "ode-to-joy":
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4:1.5 D4:0.5 D4:2 " +
    "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4:1.5 C4:0.5 C4:2",
  greensleeves:
    "A4 C5 D5 E5:1.5 F5:0.5 E5 D5 B4:1.5 G4:0.5 A4 B4 C5 A4:1.5 A4:0.5 G#4 A4 B4 G#4 E4:2 " +
    "A4 C5 D5 E5:1.5 F5:0.5 E5 D5 B4:1.5 G4:0.5 A4 B4 C5 B4:1.5 A4:0.5 G#4 F#4 G#4 A4:3",
  "canon-d":
    "F#5 E5 D5 C#5 B4 A4 B4 C#5 D5 C#5 B4 A4 G4 F#4 G4 E4 " +
    "D4 F#4 A4 G4 F#4 D4 F#4 E4 D4 B3 D4 A4 G4 B4 A4 G4",
  entertainer:
    "D5 D#5 E5 C6:2 E5 C6:2 E5 C6:3 R C6 D6 D#6 E6 C6 D6 E6:2 B5:2 " +
    "D6 C6:3 R A5 G5 F#5 A5 C6 E6 D6 C6 A5 D6:3",
  dialup: "", // synthesized specially below
};

/**
 * Returns the full <script> block for an agent page: the chiptune player, the
 * localStorage hit counter, and the persistent guestbook. Written as plain JS
 * (no template literals) so it survives being embedded in a page string.
 */
export function clientScript(m: Manifest, agentId: string): string {
  const cfg = JSON.stringify({
    id: agentId,
    midi: m.nowPlaying,
    start: m.visitorCountStart,
    melody: MELODIES[m.nowPlaying] ?? "",
  });

  return (
    `<script>(function(){\n` +
    `var CFG = ${cfg};\n` +
    `\n/* ---------- hit counter (shared via server; localStorage fallback) ---------- */\n` +
    `function setHits(total){var el=document.getElementById('hitcount'); if(el) el.textContent=String(total).padStart(7,'0');}\n` +
    `function localHits(){try{var hk='tc:hits:'+CFG.id; var n=parseInt(localStorage.getItem(hk)||'0',10)+1; localStorage.setItem(hk,String(n)); return CFG.start+n;}catch(e){return CFG.start;}}\n` +
    `fetch('/api/hit',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:CFG.id})})\n` +
    `  .then(function(r){if(!r.ok)throw 0; return r.json();})\n` +
    `  .then(function(d){setHits(CFG.start+d.count);})\n` +
    `  .catch(function(){setHits(localHits());});\n` +
    `\n/* ---------- guestbook (shared via server; localStorage fallback) ---------- */\n` +
    `(function(){\n` +
    `  var key='tc:gb:'+CFG.id;\n` +
    `  var box=document.getElementById('gb-entries');\n` +
    `  var form=document.getElementById('gb-form');\n` +
    `  var usingServer=false;\n` +
    `  function escape(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}\n` +
    `  function add(name,msg){if(!box)return; var div=document.createElement('div'); div.className='gb-entry'; div.innerHTML='<span class=\\'gb-name\\'>'+escape(name)+'</span>: '+escape(msg); box.appendChild(div);}\n` +
    `  function localList(){try{return JSON.parse(localStorage.getItem(key)||'[]')}catch(e){return[]}}\n` +
    `  fetch('/api/guestbook?id='+encodeURIComponent(CFG.id))\n` +
    `    .then(function(r){if(!r.ok)throw 0; return r.json();})\n` +
    `    .then(function(d){usingServer=true; (d.entries||[]).forEach(function(e){add(e.name,e.msg);});})\n` +
    `    .catch(function(){var l=localList(); for(var i=0;i<l.length;i++) add(l[i].name,l[i].msg);});\n` +
    `  if(form){form.addEventListener('submit',function(){\n` +
    `    var nm=(document.getElementById('gb-name').value||'anonymous coward').slice(0,40);\n` +
    `    var ms=(document.getElementById('gb-msg').value||'').slice(0,200);\n` +
    `    if(!ms) return false;\n` +
    `    document.getElementById('gb-name').value=''; document.getElementById('gb-msg').value='';\n` +
    `    if(usingServer){\n` +
    `      fetch('/api/guestbook',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:CFG.id,name:nm,msg:ms})})\n` +
    `        .then(function(r){return r.json();}).then(function(d){add((d&&d.entry?d.entry.name:nm),(d&&d.entry?d.entry.msg:ms));}).catch(function(){add(nm,ms);});\n` +
    `    } else {\n` +
    `      var l=localList(); l.push({name:nm,msg:ms}); try{localStorage.setItem(key,JSON.stringify(l));}catch(e){} add(nm,ms);\n` +
    `    }\n` +
    `    return false;\n` +
    `  });}\n` +
    `})();\n` +
    `\n/* ---------- Web Audio chiptune player ---------- */\n` +
    `var actx=null, master=null, timer=null, playing=false;\n` +
    `function freq(note){\n` +
    `  if(note==='R') return 0;\n` +
    `  var map={C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11};\n` +
    `  var name=note.slice(0,-1), oct=parseInt(note.slice(-1),10);\n` +
    `  var semis=map[name]+(oct+1)*12;\n` +
    `  return 440*Math.pow(2,(semis-69)/12);\n` +
    `}\n` +
    `function parseMelody(str){\n` +
    `  return str.trim().split(/\\s+/).map(function(tok){\n` +
    `    var p=tok.split(':');return {note:p[0],beats:p[1]?parseFloat(p[1]):1};\n` +
    `  });\n` +
    `}\n` +
    `function tone(f,t,dur){\n` +
    `  if(!f) return;\n` +
    `  var o=actx.createOscillator(), g=actx.createGain();\n` +
    `  o.type='square'; o.frequency.value=f;\n` +
    `  g.gain.setValueAtTime(0.0001,t);\n` +
    `  g.gain.exponentialRampToValueAtTime(0.9,t+0.01);\n` +
    `  g.gain.exponentialRampToValueAtTime(0.0001,t+dur*0.9);\n` +
    `  o.connect(g); g.connect(master); o.start(t); o.stop(t+dur);\n` +
    `}\n` +
    `function playDialup(){\n` +
    `  /* a tiny homage to the modem handshake: tones then a noise burst */\n` +
    `  var t=actx.currentTime, seq=[[440,0.2],[1200,0.2],[0,0.1],[2100,0.25],[1800,0.15]];\n` +
    `  for(var i=0;i<seq.length;i++){tone(seq[i][0],t,seq[i][1]);t+=seq[i][1];}\n` +
    `  var buf=actx.createBuffer(1,actx.sampleRate*0.9,actx.sampleRate), d=buf.getChannelData(0);\n` +
    `  for(var j=0;j<d.length;j++) d[j]=(Math.random()*2-1)*0.5;\n` +
    `  var src=actx.createBufferSource(); src.buffer=buf;\n` +
    `  var ng=actx.createGain(); ng.gain.value=0.25; src.connect(ng); ng.connect(master);\n` +
    `  src.start(t); src.stop(t+0.9);\n` +
    `  timer=setTimeout(function(){ if(playing) playDialup(); }, (t+1.4-actx.currentTime)*1000);\n` +
    `}\n` +
    `function playMelody(){\n` +
    `  var notes=parseMelody(CFG.melody), beat=0.16, i=0, t=actx.currentTime+0.05;\n` +
    `  function schedule(){\n` +
    `    if(!playing) return;\n` +
    `    var dur=notes[i].beats*beat;\n` +
    `    tone(freq(notes[i].note),t,dur); t+=dur; i=(i+1)%notes.length;\n` +
    `    timer=setTimeout(schedule, dur*1000);\n` +
    `  }\n` +
    `  schedule();\n` +
    `}\n` +
    `function start(){\n` +
    `  if(playing) return;\n` +
    `  if(!actx){ var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return; actx=new AC(); master=actx.createGain(); master.gain.value=0.08; master.connect(actx.destination); }\n` +
    `  if(actx.state==='suspended') actx.resume();\n` +
    `  playing=true;\n` +
    `  var p=document.getElementById('music-prompt'); if(p) p.style.display='none';\n` +
    `  var b=document.getElementById('music-toggle'); if(b) b.textContent='⏸ stop';\n` +
    `  if(CFG.midi==='dialup') playDialup(); else playMelody();\n` +
    `}\n` +
    `function stop(){ playing=false; if(timer) clearTimeout(timer); var b=document.getElementById('music-toggle'); if(b) b.textContent='▶ play'; }\n` +
    `var toggle=document.getElementById('music-toggle');\n` +
    `if(toggle) toggle.addEventListener('click',function(e){e.stopPropagation(); playing?stop():start();});\n` +
    `/* MIDIs used to autoplay; modern browsers need a gesture, so start on first interaction */\n` +
    `function once(){ start(); document.removeEventListener('click',once); document.removeEventListener('keydown',once); }\n` +
    `document.addEventListener('click',once); document.addEventListener('keydown',once);\n` +
    `})();</script>`
  );
}
