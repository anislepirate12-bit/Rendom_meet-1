'use strict';

const socket = io();
const $ = id => document.getElementById(id);
const welcome = $('welcome');
const chat = $('chat');
const adultCheck = $('adultCheck');
const startBtn = $('startBtn');
const statusEl = $('status');
const messages = $('messages');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
let matched = false;
let started = false;

adultCheck.addEventListener('change', () => { startBtn.disabled = !adultCheck.checked; });
startBtn.addEventListener('click', () => {
  if (!adultCheck.checked) return;
  started = true;
  welcome.classList.add('hidden');
  chat.classList.remove('hidden');
  clearMessages();
  setStatus('نقلبولك على شخص...');
  socket.emit('find-partner');
});
$('nextBtn').addEventListener('click', () => {
  matched = false;
  setComposer(false);
  clearMessages();
  addSystem('نقلبولك على شخص آخر...');
  setStatus('نقلبولك على شخص...');
  socket.emit('next');
});
$('messageForm').addEventListener('submit', event => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !matched) return;
  socket.emit('message', text);
  addBubble(text, 'mine');
  messageInput.value = '';
  messageInput.focus();
});
$('blockBtn').addEventListener('click', () => {
  if (!matched || !confirm('تحب تحظر هذا الشخص وتبدل؟')) return;
  socket.emit('block');
  matched = false;
  setComposer(false);
  clearMessages();
  setStatus('نقلبولك على شخص آخر...');
});
$('reportBtn').addEventListener('click', () => {
  if (!matched) return toast('لازم تكون متصل بشخص باش تبلّغ.');
  const reason = prompt('علاش حاب تبلّغ؟ (مثلاً: إساءة أو تحرش)');
  if (reason === null) return;
  socket.emit('report', reason.trim() || 'غير محدد');
});

socket.on('online-count', count => { $('onlineCount').textContent = String(count); });
socket.on('waiting', () => { matched = false; setComposer(false); setStatus('نستناو شخص يتصل...'); });
socket.on('matched', () => {
  matched = true;
  clearMessages();
  setStatus('متصل — تقدر تبدا تهدر');
  setComposer(true);
  addSystem('تربطت بشخص! قول السلام وابدأ الحديث.');
});
socket.on('message', payload => {
  if (!payload || typeof payload.text !== 'string') return;
  addBubble(payload.text, 'theirs', payload.at);
});
socket.on('partner-left', () => {
  matched = false;
  setComposer(false);
  addSystem('الشخص خرج من الدردشة. اضغط «شخص آخر» باش تلقى واحد آخر.');
  setStatus('انقطع الاتصال');
});
socket.on('blocked-notice', () => {
  matched = false;
  setComposer(false);
  addSystem('انتهت هذه الدردشة. اضغط «شخص آخر» للمتابعة.');
  setStatus('انتهت الدردشة');
});
socket.on('blocked-confirmed', () => toast('تم الحظر على هذا الاتصال.'));
socket.on('report-confirmed', () => toast('تسجل التبليغ على هذا الخادم. ملاحظة: لا توجد مراقبة مباشرة.'));
socket.on('connect_error', () => { setStatus('مشكلة في الاتصال، حدّث الصفحة.'); });
socket.on('disconnect', () => { matched = false; setComposer(false); if (started) setStatus('انقطع الاتصال، حدّث الصفحة.'); });

function setStatus(text) { statusEl.textContent = text; }
function setComposer(enabled) { messageInput.disabled = !enabled; sendBtn.disabled = !enabled; if (enabled) messageInput.focus(); }
function clearMessages() { messages.replaceChildren(); }
function addSystem(text) { const el = document.createElement('div'); el.className = 'system-message'; el.textContent = text; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; }
function addBubble(text, type, timestamp = Date.now()) {
  const el = document.createElement('div'); el.className = `bubble ${type}`;
  const content = document.createElement('span'); content.textContent = text; el.appendChild(content);
  const time = document.createElement('span'); time.className = 'time'; time.textContent = new Date(timestamp).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' }); el.appendChild(time);
  messages.appendChild(el); messages.scrollTop = messages.scrollHeight;
}
function toast(text) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text; document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
