document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  document.querySelector('.menu-toggle')?.addEventListener('click', () => sidebar?.classList.toggle('active'));
  document.querySelectorAll('.history-link').forEach(link => link.addEventListener('click', event => { event.preventDefault(); loadHistoryData(); bootstrap.Modal.getOrCreateInstance(document.getElementById('historyModal')).show(); }));
  document.getElementById('historySearch')?.addEventListener('input', event => filterHistory(event.target.value));
});

let historyItems = [];
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer'); if (!container) return;
  const colors = { success: 'text-success', danger: 'text-danger', warning: 'text-warning', info: 'text-info' };
  const toast = document.createElement('div'); toast.className = 'toast'; toast.setAttribute('role', 'status');
  toast.innerHTML = `<div class="toast-header"><i class="fa-solid fa-circle-info ${colors[type] || colors.info} me-2"></i><strong class="me-auto">TKPH Monitor</strong><button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button></div><div class="toast-body">${message}</div>`;
  container.appendChild(toast); const instance = new bootstrap.Toast(toast, { delay: 3800 }); toast.addEventListener('hidden.bs.toast', () => toast.remove()); instance.show();
}
function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value ?? ''; return div.innerHTML; }
function riskBadge(risk) { const text = String(risk || 'Unknown'); const type = text.includes('High Heat') ? 'danger' : text.includes('High Cut') || text.includes('Normal') ? 'warning' : 'success'; return `<span class="badge bg-${type}">${escapeHtml(text)}</span>`; }
function filterHistory(query = '') { const term = query.toLowerCase(); renderHistory(historyItems.filter(item => Object.values(item).some(value => String(value).toLowerCase().includes(term)))); }
function renderHistory(items) { const body = document.querySelector('#historyTable tbody'); if (!body) return; if (!items.length) { body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">No matching prediction records found.</td></tr>'; return; } body.innerHTML = items.slice().reverse().map(item => `<tr><td>${escapeHtml(item['Vehicle Number'])}</td><td>${Number(item['TKPH Value']).toFixed(0)}</td><td>${Number(item['Tire Wear (%)']).toFixed(2)}%</td><td>${Number(item['Remaining Life (Hours)']).toFixed(2)} h</td><td>${Number(item['Fuel Consumption (L/h)']).toFixed(2)} L/h</td><td>${riskBadge(item['Failure Risk'])}</td><td>${item['Maintenance Alert'] ? '<span class="badge bg-danger">Required</span>' : '<span class="badge bg-success">Clear</span>'}</td></tr>`).join(''); }
function loadHistoryData() { const body = document.querySelector('#historyTable tbody'); if (body) body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">Loading history…</td></tr>'; fetch('/api/history').then(response => response.json()).then(result => { historyItems = result.status === 'success' ? result.data : []; renderHistory(historyItems); }).catch(() => { if (body) body.innerHTML = '<tr><td colspan="7" class="text-center text-secondary py-4">History is unavailable right now.</td></tr>'; showToast('Could not load prediction history.', 'danger'); }); }
