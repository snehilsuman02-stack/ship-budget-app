export function createPlaceholderModule(title, description) {
  return function renderPlaceholder(container) {
    container.innerHTML = `
      <section class="card">
        <h2>${title}</h2>
        <p class="muted" style="margin-top: 8px;">${description}</p>
      </section>
    `;
  };
}
