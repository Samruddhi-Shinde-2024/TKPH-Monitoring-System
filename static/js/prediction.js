document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('predictionForm');
  const resultCard = document.getElementById('resultCard');
  const placeholder = document.getElementById('resultsPlaceholder');
  const submit = form.querySelector('button[type="submit"]');
  const operatingStatusHeading = document.querySelector('#failureRiskContainer')?.closest('.prediction-group')?.querySelector('h4');
  if (operatingStatusHeading) operatingStatusHeading.textContent = 'Operating status';

  form.addEventListener('submit', event => {
    event.preventDefault();
    const vehicleNumber = document.getElementById('vehicleNumber').value.trim();
    const tkphValue = Number(document.getElementById('tkphValue').value);
    if (!vehicleNumber || Number.isNaN(tkphValue) || tkphValue < 0) return showToast('Enter a vehicle identifier and a valid non-negative TKPH value.', 'warning');
    submit.disabled = true;
    submit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Running analysis...';
    fetch('/api/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicleNumber, tkphValue }) })
      .then(response => response.json())
      .then(result => { if (result.status !== 'success') throw new Error(result.message || 'Prediction failed'); displayResults(result.data, vehicleNumber); showToast('Predictive assessment complete.', 'success'); })
      .catch(error => showToast(error.message || 'Prediction could not be completed.', 'danger'))
      .finally(() => { submit.disabled = false; submit.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles me-1"></i> Calculate prediction'; });
  });

  document.getElementById('newAnalysisBtn')?.addEventListener('click', () => { resultCard.classList.add('d-none'); placeholder.classList.remove('d-none'); form.reset(); document.getElementById('vehicleNumber').focus(); });
  document.getElementById('savePdfBtn')?.addEventListener('click', () => window.print());

  function operatingBadge(status) {
    const type = status === 'Critical' ? 'danger' : status === 'Watch' ? 'warning' : 'success';
    return `<span class="badge bg-${type}">${escapeHtml(status || 'Stable')}</span>`;
  }

  function maintenanceMessage(status, modelAlert) {
    if (status === 'Critical') return '<div class="alert alert-danger mb-0"><i class="fa-solid fa-triangle-exclamation me-2"></i><strong>Critical operating range.</strong> Reduce speed or payload immediately and inspect tire operating conditions.</div>';
    if (status === 'Watch') return '<div class="alert alert-warning mb-0"><i class="fa-solid fa-triangle-exclamation me-2"></i><strong>Watch operating range.</strong> Review speed and payload before the next high-load cycle.</div>';
    return modelAlert ? '<div class="alert alert-danger mb-0"><i class="fa-solid fa-triangle-exclamation me-2"></i><strong>Maintenance attention required.</strong> Schedule inspection before the next high-load duty cycle.</div>' : '<div class="alert alert-success mb-0"><i class="fa-solid fa-circle-check me-2"></i><strong>Stable operating range.</strong> Continue routine monitoring.</div>';
  }

  function displayResults(data, vehicle) {
    const operatingStatus = data.operating_status || 'Stable';
    document.getElementById('vehicleLabel').textContent = `· ${vehicle}`;
    const wear = Math.max(0, Math.min(100, Number(data.tire_wear)));
    const bar = document.getElementById('tireWearProgress');
    bar.style.width = `${wear}%`;
    bar.className = `progress-bar ${wear > 75 ? 'bg-danger' : wear > 50 ? 'bg-warning' : 'bg-success'}`;
    document.getElementById('tireWearValue').textContent = `${wear.toFixed(2)}%`;
    document.getElementById('remainingLifeValue').textContent = Number(data.remaining_life).toFixed(2);
    document.getElementById('fuelConsumptionValue').textContent = Number(data.fuel_consumption).toFixed(2);
    document.getElementById('failureRiskContainer').innerHTML = operatingBadge(operatingStatus);
    document.getElementById('maintenanceAlertContainer').innerHTML = maintenanceMessage(operatingStatus, data.maintenance_alert);
    const insights = document.getElementById('insightsContainer');
    insights.innerHTML = data.insights?.length ? data.insights.map(insight => `<div class="insight-item"><i class="fa-solid ${insight.type === 'success' ? 'fa-circle-check text-success' : insight.type === 'danger' ? 'fa-circle-exclamation text-danger' : 'fa-triangle-exclamation text-warning'}"></i><span>${escapeHtml(insight.message)}</span></div>`).join('') : '<p class="text-secondary mb-0">No additional operating insights were generated.</p>';
    placeholder.classList.add('d-none');
    resultCard.classList.remove('d-none');
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});
