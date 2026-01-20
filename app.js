// Simple client-side demo auth + account/dashboard for e-waste
// Not secure for production. Use a proper backend and secure auth in real apps.

const $ = sel => document.querySelector(sel);

// Views
const authView = $('#auth-view');
const dashboardView = $('#dashboard-view');

// Forms / buttons
const signupForm = $('#signup-form');
const loginForm = $('#login-form');
const startScanBtn = $('#start-scan');
const stopScanBtn = $('#stop-scan');
const scanStatusEl = $('#scan-status');
const vouchersList = $('#vouchers-list');
const leaderboardEl = $('#leaderboard');
const openShopBtn = $('#open-shop');
const closeShopBtn = $('#close-shop');
const voucherShop = $('#voucher-shop');
const shopList = $('#shop-list');

// Scanning state
let isScanning = false;

// Auth toggles
$('#show-signup').addEventListener('click', () => toggleAuth(true));
$('#show-login').addEventListener('click', () => toggleAuth(false));

function toggleAuth(isSignup){
  $('#show-signup').classList.toggle('active', isSignup);
  $('#show-login').classList.toggle('active', !isSignup);
  signupForm.classList.toggle('hidden', !isSignup);
  loginForm.classList.toggle('hidden', isSignup);
  $('#auth-title').textContent = isSignup ? 'Create account' : 'Welcome back';
  $('#auth-sub').textContent = isSignup ? 'Sign up to manage your account.' : 'Log in to continue.';
}

// Local storage keys
const USERS_KEY = 'ewaste_users_v1';
const SESS_KEY = 'ewaste_session_v1';

function loadUsers(){
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
}
function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(pw){
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

signupForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = $('#signup-email').value.trim().toLowerCase();
  const pw = $('#signup-password').value;
  if(!email || !pw){alert('Fill both fields');return}
  const users = loadUsers();
  if(users[email]){alert('Account exists — please log in');toggleAuth(false);return}
  const hash = await hashPassword(pw);
  users[email] = {hash, points:0, drops:[], vouchers:[]};
  saveUsers(users);
  startSession(email);
});

loginForm.addEventListener('submit', async e=>{
  e.preventDefault();
  const email = $('#login-email').value.trim().toLowerCase();
  const pw = $('#login-password').value;
  const users = loadUsers();
  const u = users[email];
  if(!u){alert('No account with that email');return}
  const hash = await hashPassword(pw);
  if(hash !== u.hash){alert('Incorrect password');return}
  startSession(email);
});

function startSession(email){
  localStorage.setItem(SESS_KEY, email);
  showDashboard(email);
}

function endSession(){
  localStorage.removeItem(SESS_KEY);
  dashboardView.classList.add('hidden');
  authView.classList.remove('hidden');
}

function updatePoints(pts){
  $('#points-header').textContent = pts;
  $('#points-profile').textContent = pts;
}

function showDashboard(email){
  const users = loadUsers();
  const u = users[email];
  if(!u) return endSession();
  authView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  const name = email.split('@')[0];
  $('#user-greeting').textContent = `Hi, ${name}`;
  $('#profile-name').textContent = name;
  $('#profile-email').textContent = email;
  updatePoints(u.points || 0);
  renderVouchers(u.vouchers || []);
  renderLeaderboard();
  updateScanUI();
}

function renderVouchers(vouchers){
  vouchersList.innerHTML = '';
  if(!vouchers || !vouchers.length){ vouchersList.innerHTML = '<li class="muted">No vouchers</li>'; return }
  vouchers.slice().reverse().forEach(v=>{
    const li = document.createElement('li');
    // show partner/title prominently, code as secondary
    const partner = v.partner || 'Voucher';
    li.dataset.code = v.code;
    li.innerHTML = `
      <div>
        <strong>${partner}</strong>
        <div class="muted" style="font-size:13px">${v.value} pts &middot; Code: <span class="voucher-code">${v.code}</span> ${v.used?'<span class="muted">(used)</span>':''}</div>
        <div class="muted" style="font-size:12px">${new Date(v.created).toLocaleString()}</div>
      </div>`;
    vouchersList.appendChild(li);
  })
}

function renderLeaderboard(){
  const users = loadUsers();
  const arr = Object.keys(users).map(k=>({email:k, points: users[k].points||0}));
  arr.sort((a,b)=>b.points - a.points);
  leaderboardEl.innerHTML = '';
  const top = arr.slice(0,10);
  if(!top.length){ leaderboardEl.innerHTML = '<li class="muted">No users yet</li>'; return }
  top.forEach(u=>{
    const li = document.createElement('li');
    li.innerHTML = `<strong>${u.email.split('@')[0]}</strong> — ${u.points} pts`;
    leaderboardEl.appendChild(li);
  })
}

// Voucher shop items (example partners)
const SHOP_ITEMS = [
  {id:'groceries-10', title:'Grocery voucher $10', cost:150, value:10},
  {id:'grocery-25', title:'Grocery voucher $25', cost:350, value:25},
  {id:'fuel-10', title:'Fuel voucher $10', cost:120, value:10},
  {id:'cafe-5', title:'Coffee voucher $5', cost:60, value:5}
];

function openShop(){
  voucherShop.classList.remove('hidden');
  renderShop();
}
function closeShop(){
  voucherShop.classList.add('hidden');
}

function renderShop(){
  shopList.innerHTML = '';
  SHOP_ITEMS.forEach(item=>{
    const div = document.createElement('div');
    div.className = 'voucher-item';
    const left = document.createElement('div');
    left.innerHTML = `<strong>${item.title}</strong><div class="muted" style="font-size:13px">Cost: ${item.cost} pts</div>`;
    const actions = document.createElement('div');
    actions.className = 'voucher-actions';
    const buy = document.createElement('button');
    buy.className = 'btn small primary';
    buy.textContent = 'Buy';
    buy.addEventListener('click', ()=> buyItem(item.id));
    actions.appendChild(buy);
    div.appendChild(left);
    div.appendChild(actions);
    shopList.appendChild(div);
  })
}

function buyItem(itemId){
  const email = localStorage.getItem(SESS_KEY);
  if(!email) return endSession();
  const users = loadUsers();
  const u = users[email];
  const item = SHOP_ITEMS.find(i=>i.id===itemId);
  if(!item) return;
  if((u.points||0) < item.cost){ notify('Not enough points for this voucher'); return }
  u.points -= item.cost;
  const code = itemId.toUpperCase() + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
  u.vouchers = u.vouchers || [];
  u.vouchers.push({code, value:item.value, partner:item.title, created:Date.now(), used:false});
  saveUsers(users);
  updatePoints(u.points);
  notify(`Bought ${item.title} — ${code}`);
  renderVouchers(u.vouchers);
  renderLeaderboard();
}

// Voucher actions: copy code or mark used
vouchersList.addEventListener('click', e=>{
  const target = e.target.closest('li');
  if(!target) return;
  const text = target.textContent || '';
  const codeMatch = text.match(/[A-Z0-9\-]{6,}/);
  if(!codeMatch) return;
  const code = codeMatch[0].trim();
  // copy code to clipboard
  navigator.clipboard?.writeText(code).then(()=> notify('Voucher code copied: ' + code)).catch(()=> notify('Copied to clipboard'));
});

openShopBtn.addEventListener('click', openShop);
closeShopBtn.addEventListener('click', closeShop);

// Start scanning
startScanBtn.addEventListener('click', () => {
  if (!sensorWs || sensorWs.readyState !== WebSocket.OPEN) {
    notify('Sensor not connected. Check server.');
    return;
  }
  isScanning = true;
  updateScanUI();
  sensorWs.send(JSON.stringify({ type: 'start_scan' }));
});

// Stop scanning
stopScanBtn.addEventListener('click', () => {
  if (!sensorWs || sensorWs.readyState !== WebSocket.OPEN) {
    notify('Sensor not connected. Check server.');
    return;
  }
  isScanning = false;
  updateScanUI();
  sensorWs.send(JSON.stringify({ type: 'stop_scan' }));
});

function updateScanUI() {
  if (isScanning) {
    startScanBtn.classList.add('hidden');
    stopScanBtn.classList.remove('hidden');
    scanStatusEl.textContent = '🟢 Scanning... Items will be detected automatically';
    scanStatusEl.style.color = 'var(--accent)';
  } else {
    startScanBtn.classList.remove('hidden');
    stopScanBtn.classList.add('hidden');
    scanStatusEl.textContent = 'Press "Start scan" to listen for items entering the bin';
    scanStatusEl.style.color = 'var(--muted)';
  }
}

$('#logout-btn').addEventListener('click', ()=> endSession());

function notify(text){
  // show a temporary toast
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) }
  t.textContent = text;
  t.style.opacity = '1';
  setTimeout(()=> t.style.opacity = '0', 3000);
}

// WebSocket connection for sensor data
let sensorWs = null;

function initSensorConnection() {
  try {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    sensorWs = new WebSocket(wsUrl);

    sensorWs.addEventListener('open', () => {
      console.log('Connected to sensor server');
    });

    sensorWs.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        handleSensorMessage(data);
      } catch (e) {
        console.error('Sensor message parse error:', e);
      }
    });

    sensorWs.addEventListener('close', () => {
      console.log('Sensor connection closed. Retrying...');
      setTimeout(initSensorConnection, 3000);
    });

    sensorWs.addEventListener('error', (err) => {
      console.error('Sensor connection error:', err);
    });
  } catch (e) {
    console.error('Failed to init sensor connection:', e);
  }
}

function handleSensorMessage(data) {
  if (data.type === 'item_detected') {
    const email = localStorage.getItem(SESS_KEY);
    if (!email) return; // User not logged in

    const users = loadUsers();
    const u = users[email];
    if (!u) return;

    const itemCount = data.count || 1;
    const pointsPerItem = 10;
    const reward = itemCount * pointsPerItem;

    // Award points
    u.points = (u.points || 0) + reward;

    // Record the drop
    u.drops = u.drops || [];
    u.drops.push({
      type: 'Mixed',
      qty: itemCount,
      weight: 0,
      condition: 'N/A',
      time: Date.now(),
      reward,
      source: 'sensor', // Mark as auto-detected
    });

    saveUsers(users);
    updatePoints(u.points);
    notify(`🎉 ${reward} points added! (${itemCount} item${itemCount > 1 ? 's' : ''} detected)`);
    renderVouchers(u.vouchers || []);
    renderLeaderboard();
  } else if (data.type === 'scan_status') {
    isScanning = data.enabled;
    updateScanUI();
  }
}

// Auto-login if session present and init sensor
(function(){
  const email = localStorage.getItem(SESS_KEY);
  if(email){ try{ showDashboard(email) }catch(e){ console.error(e); endSession() } }
  // Always try to connect to sensor server
  initSensorConnection();
})();
