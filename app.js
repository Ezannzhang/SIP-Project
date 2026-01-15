// Simple client-side demo auth + account/dashboard for e-waste
// Not secure for production. Use a proper backend and secure auth in real apps.

const $ = sel => document.querySelector(sel);

// Views
const authView = $('#auth-view');
const dashboardView = $('#dashboard-view');

// Forms / buttons
const signupForm = $('#signup-form');
const loginForm = $('#login-form');
const simulateScanBtn = $('#simulate-scan');
const vouchersList = $('#vouchers-list');
const leaderboardEl = $('#leaderboard');
const redeemVoucherBtn = $('#redeem-voucher');
const openShopBtn = $('#open-shop');
const closeShopBtn = $('#close-shop');
const voucherShop = $('#voucher-shop');
const shopList = $('#shop-list');

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
  $('#points').textContent = u.points || 0;
  renderVouchers(u.vouchers || []);
  renderLeaderboard();
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
  $('#points').textContent = u.points;
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

// simulate bin scan to award points (since form removed)
simulateScanBtn.addEventListener('click', ()=>{
  const email = localStorage.getItem(SESS_KEY);
  if(!email) return endSession();
  const users = loadUsers();
  const u = users[email];
  // random reward between 5 and 50
  const reward = Math.floor(Math.random() * 46) + 5;
  u.points = (u.points || 0) + reward;
  // add a recorded drop entry for history
  u.drops = u.drops || [];
  u.drops.push({type:'Mixed', qty:1, weight:0, condition:'N/A', time:Date.now(), reward});
  saveUsers(users);
  $('#points').textContent = u.points;
  notify(`${reward} points added to your account`);
  renderVouchers(u.vouchers || []);
  renderLeaderboard();
});

redeemVoucherBtn.addEventListener('click', ()=>{
  const email = localStorage.getItem(SESS_KEY);
  if(!email) return endSession();
  const users = loadUsers();
  const u = users[email];
  // create a voucher if user has >=50 points
  if((u.points||0) < 50){ notify('Need at least 50 points to create a voucher'); return }
  u.points -= 50;
  const code = 'VCHR-' + Math.random().toString(36).slice(2,9).toUpperCase();
  u.vouchers = u.vouchers || [];
  const v = {code, value:50, created:Date.now(), used:false};
  u.vouchers.push(v);
  saveUsers(users);
  $('#points').textContent = u.points;
  notify('Voucher created: ' + code);
  renderVouchers(u.vouchers);
  renderLeaderboard();
});

$('#logout-btn').addEventListener('click', ()=> endSession());

function notify(text){
  // show a temporary toast
  let t = document.getElementById('toast');
  if(!t){ t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) }
  t.textContent = text;
  t.style.opacity = '1';
  setTimeout(()=> t.style.opacity = '0', 3000);
}

// Auto-login if session present
(function(){
  const email = localStorage.getItem(SESS_KEY);
  if(email){ try{ showDashboard(email) }catch(e){ console.error(e); endSession() } }
})();
