let analyticsChart = null;

export function renderAnalytics(container, state) {
  const byCategory = state.data.spares.reduce((acc, row) => {
    const key = row.category || "Uncategorized";
    acc[key] = (acc[key] || 0) + Number(row.qty || 0);
    return acc;
  }, {});

  container.innerHTML = `
    <section class="card grid">
      <h3>Analytics</h3>
      <p class="meta">Realtime stock distribution by category.</p>
      <canvas id="analytics-chart" height="120"></canvas>
    </section>
  `;

  const ctx = container.querySelector("#analytics-chart");
  if (!ctx || !window.Chart) return;

  if (analyticsChart) {
    analyticsChart.destroy();
    analyticsChart = null;
  }

  analyticsChart = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(byCategory),
      datasets: [{
        label: "Stock Units",
        data: Object.values(byCategory),
        backgroundColor: "rgba(79, 140, 255, 0.7)",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    },
  });
}
