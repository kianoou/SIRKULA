import { api } from '../api.js';
import { state, whatsAppUrl } from '../state.js';
import { esc, money, loadingState, emptyState } from '../ui.js';

function card(type) {
  const bankList = (state.banks || [])
    .filter(() => true)
    .slice(0, 1)
    .map((bank) => {
      const link = whatsAppUrl(bank.whatsapp, `Halo, saya ingin menyetor ${type.name} melalui SIRKULA.`);
      return link ? `<a class="wa-link" href="${link}" target="_blank" rel="noopener">◉ Tanya ${esc(bank.name)}</a>` : '';
    })
    .join('');
  return `
    <article class="waste-card" data-category="${type.categoryId}">
      <div class="waste-symbol">${esc(type.categoryIcon || '♻')}</div>
      <span class="category-chip">${esc(type.categoryName)}</span>
      <h3 style="margin-top:8px">${esc(type.name)}</h3>
      <p>${esc(type.description || 'Terima dalam kondisi bersih dan sudah dipilah.')}</p>
      <div class="price">${money(type.pricePerKg)} <small>/ ${esc(type.unit || 'kg')}</small></div>
      ${bankList ? `<div class="card-actions">${bankList}</div>` : ''}
    </article>`;
}

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat katalog...');
    let categories = [];
    let types = [];
    try {
      const [categoryRes, typeRes] = await Promise.all([
        api.get('/categories?onlyActive=true'),
        api.get('/waste-types?onlyActive=true'),
      ]);
      categories = categoryRes.data || [];
      types = typeRes.data || [];
    } catch {
      categories = state.categories || [];
      types = state.types || [];
    }

    const renderList = (filter = 'all', search = '') => {
      const term = search.trim().toLowerCase();
      const filtered = types.filter(
        (type) =>
          (filter === 'all' || Number(type.categoryId) === Number(filter)) &&
          (!term ||
            type.name.toLowerCase().includes(term) ||
            type.categoryName.toLowerCase().includes(term)),
      );
      return filtered.length
        ? `<div class="cards">${filtered.map(card).join('')}</div>`
        : emptyState('Tidak ada jenis sampah yang cocok', 'Coba ubah kata kunci atau pilih kategori lain.');
    };

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Katalog Harga Sampah</h1>
          <p>Harga per kilogram dari bank sampah mitra SIRKULA. Harga final dikonfirmasi saat penimbangan.</p>
        </div>
        ${state.user ? '<div class="head-actions"><a class="btn primary" href="#/setoran">Ajukan Setoran</a></div>' : '<div class="head-actions"><a class="btn primary" href="#/daftar">Daftar untuk Menyetor</a></div>'}
      </div>
      <div class="panel">
        <div class="toolbar">
          <div class="search"><input type="search" id="catalogSearch" placeholder="Cari jenis sampah, misal: botol plastik" /></div>
          <select class="field-select" id="catalogCategory">
            <option value="all">Semua kategori</option>
            ${categories
              .map((category) => `<option value="${category.id}">${esc(category.name)}</option>`)
              .join('')}
          </select>
        </div>
        <div id="catalogList">${renderList()}</div>
        <div class="notice" style="margin-top:16px;margin-bottom:0">
          Harga dapat berubah sesuai kebijakan bank sampah. Nilai setoran dihitung dari <b>berat aktual</b> saat verifikasi,
          sehingga harga pada transaksi lama tidak berubah.
        </div>
      </div>
      ${
        (state.banks || []).length
          ? `<div class="panel">
              <div class="panel-head"><h3>Bank sampah mitra</h3><span>${state.banks.length} bank sampah aktif</span></div>
              <div class="grid-three">
                ${state.banks
                  .map((bank) => {
                    const link = whatsAppUrl(bank.whatsapp, `Halo ${bank.name}, saya ingin menyetor sampah.`);
                    return `<div class="bank-card">
                      <div class="bank-logo">⌂</div>
                      <div style="min-width:0">
                        <b>${esc(bank.name)}</b>
                        <p>${esc(bank.address || 'Alamat belum diisi')}</p>
                        ${link ? `<a class="wa-link" href="${link}" target="_blank" rel="noopener">◉ WhatsApp</a>` : ''}
                      </div>
                    </div>`;
                  })
                  .join('')}
              </div>
            </div>`
          : ''
      }`;

    const list = container.querySelector('#catalogList');
    const search = container.querySelector('#catalogSearch');
    const select = container.querySelector('#catalogCategory');
    const update = () => {
      list.innerHTML = renderList(select.value, search.value);
    };
    search.addEventListener('input', update);
    select.addEventListener('change', update);
  },
};
