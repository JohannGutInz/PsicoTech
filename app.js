/* PsicoTech PWA: SPA con búsqueda, agenda, sesiones, recursos, ánimo, notifs, offline, bajo datos e instalación */
document.addEventListener('DOMContentLoaded', () => {
  // --------- PWA SW ---------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }

  // --------- Estado red + badges ---------
  const badgeOffline = document.getElementById('badge-offline');
  const badgeLowdata = document.getElementById('badge-lowdata');
  function updateOnline() { badgeOffline.hidden = navigator.onLine; }
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  // --------- SPA base ---------
  const pages = document.querySelectorAll('.page');
  const navBtns = document.querySelectorAll('.nav-btn');
  const bottomNav = document.getElementById('bottom-nav');
  const main = document.getElementById('main');

  function focusMain(){ main?.focus(); }

  function showPage(id) {
    // Ocultar/activar
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');

    // Mostrar/ocultar barra inferior + padding inferior
    const HIDE_NAV_ON = ['page-welcome', 'page-login'];
    const hide = HIDE_NAV_ON.includes(id);
    if (bottomNav) bottomNav.style.display = hide ? 'none' : 'grid';
    document.documentElement.classList.toggle('no-nav', hide);

    // Marcar activo en nav
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === id));

    // Acciones al entrar
    if (id === 'page-search') renderTherapists();
    if (id === 'page-home') renderUpcoming();
    if (id === 'page-sessions') renderSessions();
    if (id === 'page-mood') renderMood();

    focusMain();
  }

  navBtns.forEach(b => b.addEventListener('click', () => showPage(b.dataset.page)));
  document.addEventListener('click', (e)=>{
    const back = e.target.closest('.back-button');
    if (back?.dataset.backTo) showPage(back.dataset.backTo);
    const go = e.target.closest('[data-go]');
    if (go?.dataset.go) showPage(go.dataset.go);
  });

  // --------- Instalación PWA (beforeinstallprompt) ---------
  let deferredPrompt = null;
  const btnInstallHeader  = document.getElementById('btn-install');
  const btnInstallProfile = document.getElementById('btn-install-profile');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();          // evita el mini-infobar
    deferredPrompt = e;          // guardamos el evento
    btnInstallHeader && (btnInstallHeader.hidden = false);
    btnInstallProfile && (btnInstallProfile.hidden = false);
  });

  async function doInstall(button){
    if (!deferredPrompt) return;
    button.hidden = true;        // opcional: ocultar durante el prompt
    deferredPrompt.prompt();
    await deferredPrompt.userChoice; // { outcome }
    deferredPrompt = null;       // no reutilizable
  }
  btnInstallHeader?.addEventListener('click', ()=> doInstall(btnInstallHeader));
  btnInstallProfile?.addEventListener('click', ()=> doInstall(btnInstallProfile));

  window.addEventListener('appinstalled', () => {
    // Oculta botones si ya está instalada
    btnInstallHeader  && (btnInstallHeader.hidden = true);
    btnInstallProfile && (btnInstallProfile.hidden = true);
    console.log('PsicoTech instalada');
  });

  // (Opcional) Ocultar si ya se ejecuta en standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isStandalone) {
    btnInstallHeader  && (btnInstallHeader.hidden = true);
    btnInstallProfile && (btnInstallProfile.hidden = true);
  }

  // --------- Modo bajo datos ---------
  const toggleLow = document.getElementById('toggle-lowdata');
  const lowKey = 'psicotech.lowdata';
  const isLow = localStorage.getItem(lowKey) === '1';
  if (isLow) { document.documentElement.classList.add('lowdata'); badgeLowdata.hidden = false; if (toggleLow) toggleLow.checked = true; }
  toggleLow?.addEventListener('change', (e)=>{
    const on = e.target.checked;
    document.documentElement.classList.toggle('lowdata', on);
    badgeLowdata.hidden = !on;
    localStorage.setItem(lowKey, on ? '1':'0');
  });

  // --------- Consentimiento ---------
  const toggleConsent = document.getElementById('toggle-consent');
  const consentKey = 'psicotech.consent';
  if (toggleConsent) {
    toggleConsent.checked = localStorage.getItem(consentKey) === '1';
    toggleConsent.addEventListener('change', e => localStorage.setItem(consentKey, e.target.checked?'1':'0'));
  }

  // --------- Login (simulado, mínima retención local) ---------
  document.getElementById('form-login')?.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    const okConsent = document.getElementById('consent').checked;
    if (!email || !pass || !okConsent) { alert('Completa los campos y acepta el consentimiento.'); return; }
    sessionStorage.setItem('psicotech.user', email); // no guardamos token ni datos sensibles
    showPage('page-home');
  });
  document.getElementById('btn-go-login')?.addEventListener('click', ()=>showPage('page-login'));
  document.getElementById('btn-start-anon')?.addEventListener('click', ()=>showPage('page-home'));
  document.getElementById('btn-open-menu')?.addEventListener('click', ()=>showPage('page-profile'));

  // --------- Datos demo ligeros ---------
  const THERAPISTS = [
    { id:'t1', name:'Dra. Ana López',   specialty:'ansiedad',  mode:'virtual',    price:380, rating:4.8, img:'images/t1.jpg' },
    { id:'t2', name:'Mtro. Luis Pérez', specialty:'depresion', mode:'presencial', price:420, rating:4.7, img:'images/t2.jpg' },
    { id:'t3', name:'Dra. Sofía Méndez',specialty:'pareja',    mode:'virtual',    price:450, rating:4.9, img:'images/t3.jpg' },
  ];
  const tImg = (src)=>`<img src="${src||'images/icon-192x192.png'}" alt="" loading="lazy" width="64" height="64">`;

  // --------- Buscar psicólogo ---------
  const q = document.getElementById('q');
  const fSpec = document.getElementById('f-specialty');
  const fMode = document.getElementById('f-mode');
  const listTher = document.getElementById('list-therapists');
  const emptyTher = document.getElementById('empty-therapists');

  function filterTherapists(){
    const term = (q?.value||'').toLowerCase();
    return THERAPISTS.filter(t=>{
      const okQ = !term || t.name.toLowerCase().includes(term);
      const okS = !fSpec?.value || t.specialty===fSpec.value;
      const okM = !fMode?.value || t.mode===fMode.value;
      return okQ && okS && okM;
    });
  }
  function renderTherapists(){
    const data = filterTherapists();
    listTher.innerHTML = '';
    emptyTher.hidden = data.length>0;
    data.forEach(t=>{
      const li = document.createElement('li');
      li.className = 'card card-therapist';
      li.innerHTML = `
        ${tImg(t.img)}
        <div>
          <strong>${t.name}</strong><br/>
          <span class="muted">★ ${t.rating} · ${t.mode} · $${t.price} MXN</span>
        </div>
        <div class="row">
          <button class="btn btn-outline" data-detail="${t.id}">Ver perfil</button>
          <button class="btn btn-primary" data-agenda="${t.id}">Agendar</button>
        </div>`;
      listTher.appendChild(li);
    });
  }
  q?.addEventListener('input', renderTherapists);
  fSpec?.addEventListener('change', renderTherapists);
  fMode?.addEventListener('change', renderTherapists);

  let currentTher = null;
  document.addEventListener('click', (e)=>{
    const d = e.target.closest('[data-detail]');
    if (d){
      const id = d.dataset.detail;
      currentTher = THERAPISTS.find(t=>t.id===id);
      mountDetail();
      showPage('page-detail');
    }
    const a = e.target.closest('[data-agenda]');
    if (a){
      const id = a.dataset.agenda;
      currentTher = THERAPISTS.find(t=>t.id===id);
      mountDetail();
      showPage('page-detail');
    }
  });

  function mountDetail(){
    const box = document.getElementById('therapist-detail');
    if(!currentTher) return;
    box.innerHTML = `
      <div class="row">
        ${tImg(currentTher.img)}
        <div>
          <h3>${currentTher.name}</h3>
          <div class="meta">
            <span>Especialidad: <strong>${currentTher.specialty}</strong></span>
            <span>Modalidad: <strong>${currentTher.mode}</strong></span>
            <span>Tarifa: <strong>$${currentTher.price} MXN</strong></span>
            <span>Rating: <strong>★ ${currentTher.rating}</strong></span>
          </div>
        </div>
      </div>
      <p class="muted">Bio breve y enfoque terapéutico. Disponibilidad sujeta a confirmación.</p>
    `;
    const dt = new Date(); dt.setDate(dt.getDate()+1);
    document.getElementById('book-date').value = dt.toISOString().slice(0,10);
    document.getElementById('book-time').value = '10:00';
  }

  // --------- Agenda / Sesiones (mínimo local) ---------
  const SESS_KEY = 'psicotech.sessions';
  const MOOD_KEY = 'psicotech.mood';
  const RES_KEY  = 'psicotech.resources';
  const readJSON = (k, def=[]) => { try{ return JSON.parse(localStorage.getItem(k))||def; }catch{ return def; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  document.getElementById('form-book')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    if(!date || !time || !currentTher) return alert('Selecciona fecha y hora');
    const sess = readJSON(SESS_KEY);
    sess.push({ id: Date.now(), when:`${date} ${time}`, therapist: currentTher.name, mode: currentTher.mode });
    writeJSON(SESS_KEY, sess);
    alert('Cita agendada');
    showPage('page-sessions');
    renderSessions();
    scheduleLocalReminder(`${date}T${time}:00`);
  });

  function renderUpcoming(){
    const box = document.getElementById('list-upcoming');
    const empty = document.getElementById('empty-upcoming');
    const sess = readJSON(SESS_KEY);
    const upcoming = sess
      .map(s => ({...s, ts: Date.parse(s.when.replace(' ','T'))}))
      .filter(s => !isNaN(s.ts))
      .sort((a,b)=>a.ts-b.ts)
      .slice(0,3);
    box.innerHTML = '';
    empty.hidden = upcoming.length>0;
    upcoming.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `📅 <strong>${s.when}</strong> — ${s.therapist} (${s.mode})`;
      box.appendChild(li);
    });
  }

  function renderSessions(){
    const box = document.getElementById('list-sessions');
    const empty = document.getElementById('empty-sessions');
    const sess = readJSON(SESS_KEY);
    box.innerHTML = '';
    empty.hidden = sess.length>0;
    sess.forEach(s=>{
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:center">
          <div>🗓️ <strong>${s.when}</strong><br><span class="muted">${s.therapist} · ${s.mode}</span></div>
          <button class="btn btn-outline" data-cancel="${s.id}">Cancelar</button>
        </div>`;
      box.appendChild(li);
    });
  }

  document.getElementById('page-sessions')?.addEventListener('click',(e)=>{
    const c = e.target.closest('[data-cancel]');
    if(!c) return;
    const id = Number(c.dataset.cancel);
    const sess = readJSON(SESS_KEY).filter(x=>x.id!==id);
    writeJSON(SESS_KEY, sess);
    renderSessions();
    renderUpcoming();
  });

  // --------- Ánimo ---------
  document.getElementById('form-mood')?.addEventListener('submit',(e)=>{
    e.preventDefault();
    const score = Number(document.getElementById('mood-score').value);
    const note = document.getElementById('mood-note').value.trim();
    if(!score || score<1 || score>5) return alert('Califica del 1 al 5');
    const mood = readJSON(MOOD_KEY);
    mood.unshift({ts: Date.now(), score, note});
    writeJSON(MOOD_KEY, mood.slice(0,50)); // minimización
    renderMood();
    alert('Registrado. ¡Gracias!');
  });

  function renderMood(){
    const box = document.getElementById('list-mood');
    const empty = document.getElementById('empty-mood');
    const mood = readJSON(MOOD_KEY);
    box.innerHTML = '';
    empty.hidden = mood.length>0;
    mood.forEach(m=>{
      const d = new Date(m.ts);
      const li = document.createElement('li');
      li.textContent = `${d.toLocaleString()} · ${m.score}/5 ${m.note? '— '+m.note:''}`;
      box.appendChild(li);
    });
  }

  // --------- Recursos offline ---------
  document.getElementById('cards-resources')?.addEventListener('click',(e)=>{
    const btn = e.target.closest('[data-save-resource]');
    if(!btn) return;
    const code = btn.dataset.saveResource;
    const saved = new Set(readJSON(RES_KEY, []));
    saved.add(code);
    writeJSON(RES_KEY, [...saved]);
    alert('Recurso guardado para ver offline.');
  });

  // --------- Notificaciones ---------
  const notifCount = document.getElementById('notif-count');
  function setBadge(n){ notifCount.hidden = n<=0; if(n>0) notifCount.textContent='●'; }
  setBadge(0);

  document.getElementById('btn-open-notifications')?.addEventListener('click', ()=>showPage('page-notifs'));
  document.getElementById('btn-enable-notifs')?.addEventListener('click', async ()=>{
    if (!('Notification' in window)) return alert('Notificaciones no soportadas');
    const perm = await Notification.requestPermission();
    alert(perm==='granted' ? 'Notificaciones activadas' : 'Permiso no otorgado');
  });
  document.getElementById('btn-test-notif')?.addEventListener('click', ()=>{
    if (Notification.permission==='granted') {
      new Notification('PsicoTech', { body:'Ejemplo de recordatorio', tag:'demo' });
      setBadge(1);
      setTimeout(()=>setBadge(0), 4000);
    } else alert('Activa notificaciones primero.');
  });

  function scheduleLocalReminder(iso){
    const t = Date.parse(iso);
    if (isNaN(t)) return;
    const wait = t - Date.now() - (5 * 60 * 1000); // 5 min antes
    if (wait > 0 && wait < 60*60*1000 && Notification.permission==='granted') {
      setTimeout(()=> new Notification('Recordatorio de sesión', { body:`Tu cita empieza pronto (${iso})` }), wait);
    }
  }

  // --------- Inicio ---------
  showPage('page-welcome');
});
