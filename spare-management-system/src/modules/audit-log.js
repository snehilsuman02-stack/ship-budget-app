export function renderAuditLog(container, state) {
  const rows = [...state.data.auditLogs].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  container.innerHTML = `
    <section class="card grid">
      <h3>Audit Log</h3>
      <p class="meta">All critical operations are logged here for traceability.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Time</th><th>User</th><th>Role</th><th>Module</th><th>Action</th><th>Payload</th></tr></thead>
          <tbody>
            ${
              rows.length
                ? rows
                    .map(
                      (r) =>
                        `<tr>
                          <td>${new Date(r.createdAt || Date.now()).toLocaleString()}</td>
                          <td>${r.userId || ""}</td>
                          <td>${r.role || ""}</td>
                          <td>${r.module || ""}</td>
                          <td>${r.action || ""}</td>
                          <td>${r.payload ? JSON.stringify(r.payload) : ""}</td>
                        </tr>`
                    )
                    .join("")
                : `<tr><td colspan="6">No audit entries yet.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}
