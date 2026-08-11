document.addEventListener('DOMContentLoaded', () => {
  const chart = initRealTimeChart();
  const autoRefresh = document.getElementById('autoRefreshToggle');
  const selector = document.getElementById('truckSelector');
  let refreshInterval;
  let connectionState = 'connecting';

  const start = () => { stop(); setConnection('connecting'); fetchTruckData(); refreshInterval = setInterval(fetchTruckData, 3000); };
  const stop = () => { if (refreshInterval) clearInterval(refreshInterval); };

  start();
  autoRefresh?.addEventListener('change', () => autoRefresh.checked ? start() : stop());
  selector?.addEventListener('change', () => { setConnection('connecting'); fetchTruckData(); });
  document.getElementById('exportData')?.addEventListener('click', exportToCSV);

  function setConnection(state, message) {
    connectionState = state;
    const statusLabel = state === 'connected' ? 'LIVE' : state === 'offline' ? 'Offline' : 'Connecting…';
    ['connectionStatus', 'telemetryStatus'].forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      element.classList.remove('is-connecting', 'is-offline');
      if (state !== 'connected') element.classList.add(`is-${state}`);
      const text = element.querySelector('span');
      if (text) text.textContent = id === 'telemetryStatus' ? (message || statusLabel) : statusLabel;
    });
  }

  function fetchTruckData() {
    const selectedTruck = selector?.value;
    const endpoint = `/api/truck-data${selectedTruck && selectedTruck !== 'all' ? '?truck=' + selectedTruck : ''}`;
    fetch(endpoint)
      .then(response => { if (!response.ok) throw new Error('Telemetry request failed'); return response.json(); })
      .then(result => {
        if (result.status === 'success' && Array.isArray(result.data) && result.data.length) {
          updateDashboard(result.data);
          setConnection('connected', `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
        } else {
          setConnection('offline', result.message || 'No telemetry available');
          document.querySelector('#dataLogTable tbody').innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">No live telemetry is available.</td></tr>';
        }
      })
      .catch(() => {
        const enteringOffline = connectionState !== 'offline';
        setConnection('offline', 'Telemetry unavailable');
        document.querySelector('#dataLogTable tbody').innerHTML = '<tr><td colspan="5" class="text-center text-secondary py-4">Telemetry is currently unavailable. Reconnecting automatically…</td></tr>';
        if (enteringOffline) showToast('Live telemetry could not be refreshed.', 'danger');
      });
  }

  function numericValue(value) { const number = Number(value); return Number.isFinite(number) ? number : null; }
  function displayNumber(value, digits = 0) { const number = numericValue(value); return number === null ? '—' : number.toLocaleString(undefined, { maximumFractionDigits: digits }); }
  function updateDashboard(data) {
    const latest = data[0];
    document.querySelector('#speedCard h3').textContent = `${displayNumber(latest.speed)} km/h`;
    document.querySelector('#payloadCard h3').textContent = `${displayNumber(latest.payload)} kg`;
    document.querySelector('#tkphCard h3').textContent = displayNumber(latest.tkph);
    const ordered = data.slice().reverse();
    chart.data.labels = ordered.map(entry => `#${entry.entry_no ?? '—'}`);
    chart.data.datasets[0].data = ordered.map(entry => numericValue(entry.speed));
    chart.data.datasets[1].data = ordered.map(entry => { const payload = numericValue(entry.payload); return payload === null ? null : payload / 1000; });
    chart.data.datasets[2].data = ordered.map(entry => numericValue(entry.tkph));
    chart.update();
    document.querySelector('#dataLogTable tbody').innerHTML = data.map(entry => {
      const tkph = numericValue(entry.tkph);
      const badge = tkph === null ? '<span class="badge bg-secondary">Unavailable</span>' : tkph > 300 ? '<span class="badge bg-danger">Critical</span>' : tkph > 150 ? '<span class="badge bg-warning">Watch</span>' : '<span class="badge bg-success">Stable</span>';
      return `<tr><td>#${entry.entry_no ?? '—'}</td><td>${displayNumber(entry.speed)} km/h</td><td>${displayNumber(entry.payload)} kg</td><td>${displayNumber(entry.tkph)}</td><td>${badge}</td></tr>`;
    }).join('');
  }

  function exportToCSV() {
    const rows = [...document.querySelectorAll('#dataLogTable tr')].map(row => [...row.querySelectorAll('td,th')].map(cell => `"${cell.innerText.replace(/"/g, '""')}"`).join(','));
    if (rows.length < 2) return showToast('There is no telemetry to export yet.', 'warning');
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `truck_data_${new Date().toISOString().slice(0, 10)}.csv` });
    link.click(); URL.revokeObjectURL(link.href); showToast('Telemetry exported as CSV.', 'success');
  }

  function initRealTimeChart() {
    return new Chart(document.getElementById('realTimeChart'), { type: 'line', data: { labels: [], datasets: [{ label: 'Speed (km/h)', data: [], borderColor: '#22b8e8', tension: .35, pointRadius: 2 }, { label: 'Payload (tons)', data: [], borderColor: '#35d49a', tension: .35, pointRadius: 2 }, { label: 'TKPH', data: [], borderColor: '#f1b64b', tension: .35, pointRadius: 2, borderWidth: 3 }] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { color: '#a9bbd0', usePointStyle: true } } }, scales: { x: { ticks: { color: '#8296ad' }, grid: { display: false } }, y: { beginAtZero: true, ticks: { color: '#8296ad' }, grid: { color: 'rgba(157,184,218,.12)' } } }, animation: { duration: 350 } } });
  }
});
