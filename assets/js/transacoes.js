/* ============================================================
   FinanceFlow — Transações (entradas.html / saidas.html)
   CRUD completo com filtros, resumo e gráfico por categoria
   ============================================================ */

const TX = (() => {
  // categorias dinâmicas gerenciadas em Configurações (core/store.js)
  const cats = () => FF.categoryNames(type);
  const METHODS = ['Pix', 'Cartão', 'Dinheiro'];

  let type = 'in';
  let chart = null;
  let filters = { cat: '', month: '', q: '' };

  function init(t) {
    type = t;
    const isIn = type === 'in';
    FF.init({
      title: isIn ? 'Entradas' : 'Saídas',
      subtitle: isIn ? 'Todo dinheiro que entra na sua vida' : 'Controle total sobre seus gastos',
      actions: `<button class="btn btn-primary" id="newTxBtn">＋ Nova ${isIn ? 'entrada' : 'saída'}</button>`,
    });
    document.getElementById('newTxBtn').onclick = () => openForm();
    buildFilters();
    render();
  }

  function list() {
    return FF.state.transactions
      .filter(t => t.type === type)
      .filter(t => !filters.cat || t.category === filters.cat)
      .filter(t => !filters.month || t.date.slice(0, 7) === filters.month)
      .filter(t => !filters.q || (t.desc || '').toLowerCase().includes(filters.q.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  function buildFilters() {
    const el = document.getElementById('filters');
    const months = [...new Set(FF.state.transactions.filter(t => t.type === type).map(t => t.date.slice(0, 7)))].sort().reverse();
    el.innerHTML = `
      <input type="search" id="fQ" placeholder="🔎 Buscar descrição…" style="min-width:200px">
      <select id="fCat">
        <option value="">Todas as categorias</option>
        ${cats().map(c => `<option>${FF.esc(c)}</option>`).join('')}
      </select>
      <select id="fMonth">
        <option value="">Todos os meses</option>
        ${months.map(m => {
          const [y, mo] = m.split('-');
          return `<option value="${m}">${FF.monthName(+mo - 1)} ${y}</option>`;
        }).join('')}
      </select>`;
    // preserva filtros ativos ao reconstruir a barra
    el.querySelector('#fQ').value = filters.q;
    el.querySelector('#fCat').value = filters.cat;
    el.querySelector('#fMonth').value = filters.month;
    el.querySelector('#fQ').oninput = e => { filters.q = e.target.value; render(); };
    el.querySelector('#fCat').onchange = e => { filters.cat = e.target.value; render(); };
    el.querySelector('#fMonth').onchange = e => { filters.month = e.target.value; render(); };
  }

  function render() {
    const rows = list();
    const total = rows.reduce((s, t) => s + t.value, 0);
    const isIn = type === 'in';

    // KPIs
    const now = new Date();
    const monthRows = FF.state.transactions.filter(t => t.type === type && t.date.slice(0, 7) === now.toISOString().slice(0, 7));
    const monthTotal = monthRows.reduce((s, t) => s + t.value, 0);
    const avg = rows.length ? total / rows.length : 0;
    const max = rows.reduce((m, t) => Math.max(m, t.value), 0);

    document.getElementById('kpis').innerHTML = `
      <div class="kpi">
        <div class="kpi-head"><span class="kpi-label">Total ${isIn ? 'recebido' : 'gasto'} (filtro)</span>
          <span class="kpi-icon ${isIn ? 'green' : 'red'}">${isIn ? '💵' : '💸'}</span></div>
        <div class="kpi-value ${isIn ? 'text-success' : 'text-danger'}">${FF.money(total)}</div>
        <div class="kpi-sub">${rows.length} lançamento${rows.length === 1 ? '' : 's'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-head"><span class="kpi-label">Este mês</span><span class="kpi-icon">📅</span></div>
        <div class="kpi-value">${FF.money(monthTotal)}</div>
        <div class="kpi-sub">${monthRows.length} lançamentos em ${FF.monthName(now.getMonth())}</div>
      </div>
      <div class="kpi">
        <div class="kpi-head"><span class="kpi-label">Média por lançamento</span><span class="kpi-icon amber">⚖️</span></div>
        <div class="kpi-value">${FF.money(avg)}</div>
        <div class="kpi-sub">Ticket médio</div>
      </div>
      <div class="kpi">
        <div class="kpi-head"><span class="kpi-label">Maior valor</span><span class="kpi-icon">🏔️</span></div>
        <div class="kpi-value">${FF.money(max)}</div>
        <div class="kpi-sub">Recorde do filtro atual</div>
      </div>`;

    // Tabela
    const tbody = document.getElementById('txBody');
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty">
          <div class="e-icon">${isIn ? '💵' : '💸'}</div>
          <h4>Nenhum lançamento encontrado</h4>
          <p>Clique em "＋ Nova ${isIn ? 'entrada' : 'saída'}" para começar.</p>
        </div></td></tr>`;
    } else {
      tbody.innerHTML = rows.map(t => `
        <tr>
          <td>${FF.dateBR(t.date)}</td>
          <td><b>${esc(t.desc)}</b></td>
          <td><span class="badge ${isIn ? 'green' : 'gray'}">${catIcon(t.category)}${esc(t.category)}</span></td>
          <td>${esc(t.method || '—')}</td>
          <td class="${isIn ? 'td-value-in' : 'td-value-out'}">${isIn ? '+' : '−'} ${FF.money(t.value)}</td>
          <td class="td-actions">
            <button class="row-btn" data-edit="${t.id}" title="Editar">✏️</button>
            <button class="row-btn del" data-del="${t.id}" title="Excluir">🗑️</button>
          </td>
        </tr>`).join('');
      tbody.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => openForm(b.dataset.edit));
      tbody.querySelectorAll('[data-del]').forEach(b => b.onclick = () =>
        FF.confirmDialog('Excluir este lançamento permanentemente?', () => remove(b.dataset.del)));
    }

    renderChart(rows);
  }

  function renderChart(rows) {
    const map = {};
    for (const t of rows) map[t.category] = (map[t.category] || 0) + t.value;
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const ctx = document.getElementById('catChart');
    if (!ctx) return;
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map(e => e[0]),
        datasets: [{ data: entries.map(e => e[1]), backgroundColor: FF.PALETTE, borderWidth: 0, hoverOffset: 8 }],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { callbacks: { label: c => ` ${c.label}: ${FF.money(c.parsed)}` } },
        },
      },
    });
  }

  function openForm(id) {
    const isIn = type === 'in';
    const tx = id ? FF.state.transactions.find(t => t.id === id) : null;
    FF.modal({
      title: tx ? 'Editar lançamento' : (isIn ? 'Nova entrada' : 'Nova saída'),
      body: `
        <div class="form-grid">
          <div class="field" style="grid-column:1/-1">
            <label>${isIn ? 'Origem' : 'Descrição'}</label>
            <input id="mDesc" value="${tx ? esc(tx.desc) : ''}" placeholder="${isIn ? 'Ex: Freelance de site' : 'Ex: Lanche na escola'}">
          </div>
          <div class="field"><label>Data</label><input type="date" id="mDate" value="${tx ? tx.date : FF.todayISO()}"></div>
          <div class="field"><label>Valor (R$)</label><input type="number" id="mValue" min="0" step="0.01" value="${tx ? tx.value : ''}" placeholder="0,00"></div>
          <div class="field"><label>Categoria</label>
            <select id="mCat">${cats().map(c => `<option ${tx && tx.category === c ? 'selected' : ''}>${FF.esc(c)}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Forma</label>
            <select id="mMethod">${METHODS.map(m => `<option ${tx && tx.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          </div>
        </div>`,
      onSave: (ov) => {
        const desc = ov.querySelector('#mDesc').value.trim();
        const value = parseFloat(ov.querySelector('#mValue').value);
        const date = ov.querySelector('#mDate').value;
        if (!desc || !value || value <= 0 || !date) {
          FF.toast('Preencha descrição, data e um valor válido', 'error', '⚠️');
          return false;
        }
        const data = { desc, value, date, category: ov.querySelector('#mCat').value, method: ov.querySelector('#mMethod').value };
        if (tx) {
          Object.assign(tx, data);
          FF.save();
          FF.toast('Lançamento atualizado', 'success', '✅');
        } else {
          FF.state.transactions.push({ id: FF.uid(), type, ...data });
          FF.save();
          FF.addXP(10, 'movimentação registrada');
        }
        FF.checkAchievements();
        buildFilters();
        render();
      },
    });
  }

  function remove(id) {
    FF.state.transactions = FF.state.transactions.filter(t => t.id !== id);
    FF.save();
    FF.toast('Lançamento excluído', '', '🗑️');
    buildFilters();
    render();
  }

  const catIcon = (nome) => {
    const c = FF.categoryByName(type, nome);
    return c && c.icone ? c.icone + ' ' : '';
  };

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  return { init, METHODS };
})();
