import { api, errorMessage } from '../api.js';
import { state, loadCatalog, whatsAppUrl } from '../state.js';
import {
  emptyState,
  esc,
  fileSize,
  loadingState,
  money,
  pager,
  todayISO,
  toast,
} from '../ui.js';
import { bindDepositRows, depositRows } from './depositShared.js';

const MAX_UPLOAD = 1310720;
const MAX_FILES = 3;

function buyerForm(banks, categories, types) {
  if (!banks.length) {
    return `<div class="panel">${emptyState('Belum ada bank sampah aktif', 'Pengajuan setoran akan tersedia setelah pengelola mengaktifkan bank sampah.')}</div>`;
  }
  return `<div class="panel" id="createPanel">
    <div class="panel-head"><h3>Ajukan Setoran Baru</h3><span>maksimal 5 jenis sampah</span></div>
    <div id="createError" class="alert hidden"></div>
    <form id="depositForm">
      <div class="form-grid">
        <div class="form-group">
          <label for="sellerId">Bank sampah tujuan</label>
          <select id="sellerId" name="sellerId" required>
            ${banks
              .map(
                (bank) =>
                  `<option value="${bank.sellerId}">${esc(bank.name)}${bank.address ? ` — ${esc(bank.address)}` : ''}</option>`,
              )
              .join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="depositDate">Tanggal setoran</label>
          <input id="depositDate" name="depositDate" type="date" value="${todayISO()}" max="${todayISO()}" required />
        </div>
      </div>

      <label class="form-group" style="display:block;font-size:11.5px;font-weight:750;color:#41604f">Jenis & estimasi berat</label>
      <div id="itemsList"></div>
      <button class="btn small" type="button" id="addItem" style="margin-bottom:12px">＋ Tambah jenis sampah</button>

      <div class="form-group">
        <label for="notes">Catatan (opsional)</label>
        <textarea id="notes" maxlength="500" placeholder="Contoh: sampah sudah dipilah dan dikeringkan"></textarea>
      </div>

      <div class="form-group">
        <label>Lampiran (opsional)</label>
        <label class="upload-zone" for="attachments">
          <span class="upload-icon">⇪</span>
          <b>Unggah foto atau dokumen</b>
          <small>JPG, PNG, WEBP, PDF, DOC, XLS — maksimal 3 file, total 1,25 MB</small>
          <input id="attachments" name="attachments" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt" />
        </label>
        <div class="upload-preview" id="filePreview"></div>
      </div>

      <button class="btn primary block" type="submit" id="submitDeposit">Kirim Pengajuan Setoran</button>
    </form>
  </div>`;
}

function itemRow(types, index) {
  return `<div class="form-grid three" data-item style="margin-bottom:9px;align-items:end">
    <div class="form-group" style="margin-bottom:0">
      <label>Jenis sampah</label>
      <select data-type required>
        <option value="">Pilih jenis</option>
        ${types
          .map(
            (type) =>
              `<option value="${type.id}">${esc(type.categoryName)} — ${esc(type.name)} (${money(type.pricePerKg)}/kg)</option>`,
          )
          .join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label>Estimasi berat (kg)</label>
      <input data-weight type="number" min="0.01" step="0.01" placeholder="0" required />
    </div>
    <div style="display:flex;gap:6px;align-items:center;padding-bottom:2px">
      <button class="btn small danger" type="button" data-remove ${index === 0 ? 'style="visibility:hidden"' : ''}>Hapus</button>
    </div>
  </div>`;
}

export default {
  render: async (container, { path, mode }) => {
    const user = state.user;
    const isBuyer = user.role === 'pembeli';
    const isHistoryOnly = mode === 'history';
    container.innerHTML = loadingState('Memuat data setoran...');

    let banks = [];
    let categories = [];
    let types = [];

    if (isBuyer && !isHistoryOnly) {
      await loadCatalog();
      categories = state.categories || [];
      types = state.types || [];
      banks = (state.banks || []).map((bank) => ({ sellerId: bank.sellerId, name: bank.name, address: bank.address }));
    }

    const filters = {
      status: isBuyer ? 'semua' : 'menunggu',
      search: '',
      dateFrom: '',
      dateTo: '',
      limit: 20,
      offset: 0,
    };
    let rows = [];
    let total = 0;

    container.innerHTML = `
      ${
        isBuyer && !isHistoryOnly
          ? `<div class="page-head">
              <div><h1>Setoran Sampah</h1><p>Ajukan setoran, lalu pantau proses penimbangan oleh pengelola.</p></div>
              <div class="head-actions"><a class="btn" href="#/riwayat">Riwayat Lengkap</a></div>
            </div>
            ${buyerForm(banks, categories, types)}`
          : `<div class="page-head">
              <div><h1>${isHistoryOnly ? 'Riwayat Transaksi' : isBuyer ? 'Riwayat Setoran' : 'Antrean Setoran'}</h1>
              <p>${
                isHistoryOnly
                  ? 'Seluruh setoran beserta status dan nilainya.'
                  : isBuyer
                    ? 'Daftar setoran yang Anda ajukan.'
                    : 'Verifikasi berat aktual, selesaikan setoran, atau batalkan pengajuan.'
              }</p></div>
            </div>`
      }
      <div class="panel" id="listPanel">
        <div class="toolbar">
          <div class="search"><input type="search" id="depositSearch" placeholder="Cari kode, nama, atau WhatsApp" /></div>
          <select class="field-select" id="statusFilter">
            <option value="semua">Semua status</option>
            <option value="menunggu">Menunggu</option>
            <option value="diverifikasi">Diverifikasi</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>
          <input class="field-select" type="date" id="dateFrom" aria-label="Dari tanggal" />
          <input class="field-select" type="date" id="dateTo" aria-label="Sampai tanggal" />
        </div>
        <div id="listBody">${loadingState()}</div>
      </div>`;

    const listBody = container.querySelector('#listBody');
    const searchInput = container.querySelector('#depositSearch');
    const statusSelect = container.querySelector('#statusFilter');
    const dateFromInput = container.querySelector('#dateFrom');
    const dateToInput = container.querySelector('#dateTo');

    if (isBuyer && !isHistoryOnly) statusSelect.value = 'semua';

    async function loadRows() {
      listBody.innerHTML = loadingState();
      try {
        const params = new URLSearchParams();
        if (filters.status && filters.status !== 'semua') params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
        if (filters.dateTo) params.set('dateTo', filters.dateTo);
        params.set('limit', filters.limit);
        params.set('offset', filters.offset);
        const response = await api.get(`/deposits?${params.toString()}`);
        rows = response.data.rows || [];
        total = response.data.total || 0;

        listBody.innerHTML = rows.length
          ? `<div class="table-wrap">
              <table>
                <thead><tr><th>Kode</th>${!isBuyer ? '<th>Nasabah</th>' : ''}<th>Tanggal</th><th>Berat</th><th>Nilai</th><th>Status</th><th></th></tr></thead>
                <tbody>${depositRows(rows, { showBuyer: !isBuyer })}</tbody>
              </table>
            </div>
            ${pager(total, filters.limit, filters.offset)}`
          : emptyState('Tidak ada setoran', 'Ubah filter atau ajukan setoran baru.');

        bindDepositRows(listBody, rows, { onChange: loadRows });

        listBody.querySelector(`[data-page-prev]`)?.addEventListener('click', () => {
          filters.offset = Math.max(0, filters.offset - filters.limit);
          loadRows();
        });
        listBody.querySelector(`[data-page-next]`)?.addEventListener('click', () => {
          if (filters.offset + filters.limit < total) {
            filters.offset += filters.limit;
            loadRows();
          }
        });
      } catch (error) {
        listBody.innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>`;
      }
    }

    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        filters.search = searchInput.value.trim();
        filters.offset = 0;
        loadRows();
      }, 300);
    });
    statusSelect.addEventListener('change', () => {
      filters.status = statusSelect.value;
      filters.offset = 0;
      loadRows();
    });
    dateFromInput.addEventListener('change', () => {
      filters.dateFrom = dateFromInput.value;
      filters.offset = 0;
      loadRows();
    });
    dateToInput.addEventListener('change', () => {
      filters.dateTo = dateToInput.value;
      filters.offset = 0;
      loadRows();
    });

    await loadRows();

    /* -------------------------- Form pengajuan (pembeli) ------------------------- */
    const form = container.querySelector('#depositForm');
    if (!form) return;

    const itemsList = container.querySelector('#itemsList');
    const addItemButton = container.querySelector('#addItem');
    const activeTypes = types.filter((type) => type.isActive);
    let itemCount = 0;

    const addRow = () => {
      if (itemCount >= 5) {
        toast('Maksimal 5 jenis sampah per setoran.', 'error');
        return;
      }
      itemsList.insertAdjacentHTML('beforeend', itemRow(activeTypes, itemCount));
      itemCount += 1;
      const row = itemsList.lastElementChild;
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        row.remove();
        itemCount -= 1;
      });
    };
    addRow();
    addItemButton.addEventListener('click', addRow);

    const attachmentInput = container.querySelector('#attachments');
    const preview = container.querySelector('#filePreview');
    attachmentInput.addEventListener('change', () => {
      const files = [...attachmentInput.files];
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      if (files.length > MAX_FILES) {
        toast(`Maksimal ${MAX_FILES} lampiran.`, 'error');
        attachmentInput.value = '';
        preview.innerHTML = '';
        return;
      }
      if (totalSize > MAX_UPLOAD) {
        toast('Total ukuran lampiran melebihi 1,25 MB.', 'error');
        attachmentInput.value = '';
        preview.innerHTML = '';
        return;
      }
      preview.innerHTML = files
        .map((file) => `<div class="file-preview-item">▣ <span>${esc(file.name)}</span><span>${fileSize(file.size)}</span></div>`)
        .join('');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorBox = container.querySelector('#createError');
      const submit = container.querySelector('#submitDeposit');
      errorBox.classList.add('hidden');

      const items = [...itemsList.querySelectorAll('[data-item]')]
        .map((row) => ({
          wasteTypeId: Number(row.querySelector('[data-type]').value),
          estimatedWeight: Number(row.querySelector('[data-weight]').value),
        }))
        .filter((item) => item.wasteTypeId && item.estimatedWeight > 0);

      if (!items.length) {
        errorBox.textContent = 'Pilih minimal satu jenis sampah dengan estimasi berat lebih dari 0 kg.';
        errorBox.classList.remove('hidden');
        return;
      }
      const unique = new Set(items.map((item) => item.wasteTypeId));
      if (unique.size !== items.length) {
        errorBox.textContent = 'Jenis sampah yang sama tidak boleh dipilih dua kali.';
        errorBox.classList.remove('hidden');
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Mengirim...';
      try {
        const payload = new FormData();
        payload.append('sellerId', form.sellerId.value);
        payload.append('depositDate', form.depositDate.value);
        payload.append('notes', form.notes.value.trim());
        payload.append('items', JSON.stringify(items));
        [...attachmentInput.files].forEach((file) => payload.append('attachments', file));
        const response = await api.upload('/deposits', payload);
        toast(`Pengajuan ${response.data.deposit.code} berhasil dikirim.`);
        form.reset();
        itemsList.innerHTML = '';
        itemCount = 0;
        addRow();
        preview.innerHTML = '';
        form.depositDate.value = todayISO();
        filters.offset = 0;
        await loadRows();
      } catch (error) {
        errorBox.textContent = errorMessage(error);
        errorBox.classList.remove('hidden');
      } finally {
        submit.disabled = false;
        submit.textContent = 'Kirim Pengajuan Setoran';
      }
    });
  },
};
