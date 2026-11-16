import { api, errorMessage } from '../api.js';
import { state } from '../state.js';
import {
  closeModal,
  confirmDialog,
  dateFmt,
  dateTimeFmt,
  esc,
  fileSize,
  kg,
  money,
  openModal,
  statusBadge,
  toast,
} from '../ui.js';

const isManager = () => ['admin', 'seller'].includes(state.user?.role);

export function depositRows(rows, { showBuyer = false } = {}) {
  return rows
    .map(
      (deposit) => `
      <tr>
        <td>
          <div class="cell-title">${esc(deposit.code)}</div>
          <small class="sub">${esc(deposit.wasteNames || '-')}</small>
        </td>
        ${
          showBuyer
            ? `<td><div class="person"><div class="mini-avatar">${esc((deposit.buyerName || 'S').charAt(0))}</div>
                <div><div class="cell-title">${esc(deposit.buyerName)}</div><small class="sub">${esc(deposit.bankName || deposit.sellerName || '')}</small></div></div></td>`
            : ''
        }
        <td>${dateFmt(deposit.depositDate)}</td>
        <td>${kg(deposit.actualWeight || deposit.estimatedWeight)}<small class="sub">${deposit.itemCount} jenis</small></td>
        <td class="nowrap"><b>${money(deposit.totalValue)}</b></td>
        <td>${statusBadge(deposit.status)}</td>
        <td>
          <div class="row-actions">
            <button class="btn small" data-detail="${deposit.id}">Detail</button>
            ${
              isManager() && deposit.status === 'menunggu'
                ? `<button class="btn small primary" data-verify="${deposit.id}">Verifikasi</button>`
                : isManager() && deposit.status === 'diverifikasi'
                  ? `<button class="btn small primary" data-complete="${deposit.id}">Selesaikan</button>`
                  : ''
            }
          </div>
        </td>
      </tr>`,
    )
    .join('');
}

/** Pasang handler untuk tombol-tombol pada tabel setoran. */
export function bindDepositRows(container, rows, { onChange } = {}) {
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  container.querySelectorAll('[data-detail]').forEach((button) => {
    button.addEventListener('click', () => openDepositDetail(Number(button.dataset.detail), { onChange }));
  });
  container.querySelectorAll('[data-verify]').forEach((button) => {
    button.addEventListener('click', () => openVerify(byId.get(Number(button.dataset.verify)), { onChange }));
  });
  container.querySelectorAll('[data-complete]').forEach((button) => {
    button.addEventListener('click', () => completeDeposit(byId.get(Number(button.dataset.complete)), { onChange }));
  });
}

function attachmentsHtml(attachments) {
  if (!attachments?.length) return '<p class="muted small">Tidak ada lampiran.</p>';
  return attachments
    .map((attachment) => {
      const url = `/api/deposits/attachments/${attachment.id}`;
      const preview = `/api/deposits/attachments/${attachment.id}?inline=true`;
      const isImage = String(attachment.mimeType || '').startsWith('image/');
      return `
        <div class="attachment-view">
          ${isImage ? `<img src="${preview}" alt="Pratinjau ${esc(attachment.originalName)}" loading="lazy" />` : '<div class="attachment-icon">▣</div>'}
          <div style="min-width:0">
            <a href="${url}" target="_blank" rel="noopener">${esc(attachment.originalName)}</a>
            <div class="small muted">${fileSize(attachment.sizeBytes)} · ${dateTimeFmt(attachment.createdAt)}</div>
          </div>
        </div>`;
    })
    .join('');
}

export async function openDepositDetail(id, { onChange } = {}) {
  openModal('Detail Setoran', '<div class="skeleton"><div></div><div></div><div></div></div>', { wide: true });
  try {
    const response = await api.get(`/deposits/${id}`);
    const deposit = response.data.deposit;
    const manager = isManager();
    const canVerify = manager && deposit.status === 'menunggu';
    const canComplete = manager && deposit.status === 'diverifikasi';
    const canCancel = manager && ['menunggu', 'diverifikasi'].includes(deposit.status);

    document.getElementById('modalBody').innerHTML = `
      <div class="panel-head" style="margin-bottom:10px">
        <div>
          <h3 style="font-size:17px">${esc(deposit.code)}</h3>
          <span>Diajukan ${dateTimeFmt(deposit.createdAt)}</span>
        </div>
        ${statusBadge(deposit.status)}
      </div>
      <div class="summary-line"><span>Nasabah</span><b>${esc(deposit.buyerName)}<br /><span class="small muted">${esc(deposit.buyerWhatsapp || deposit.buyerEmail || '')}</span></b></div>
      <div class="summary-line"><span>Bank sampah</span><b>${esc(deposit.bankName || deposit.sellerName)}</b></div>
      <div class="summary-line"><span>Tanggal setoran</span><b>${dateFmt(deposit.depositDate)}</b></div>
      <div class="summary-line"><span>Total berat aktual</span><b>${deposit.actualWeight ? kg(deposit.actualWeight) : '<span class="muted">Belum ditimbang</span>'}</b></div>
      <div class="summary-line"><span>Estimasi berat</span><b>${kg(deposit.estimatedWeight)}</b></div>
      ${deposit.notes ? `<div class="summary-line"><span>Catatan nasabah</span><b style="font-weight:600">${esc(deposit.notes)}</b></div>` : ''}
      ${deposit.managerNotes ? `<div class="summary-line"><span>Catatan pengelola</span><b style="font-weight:600">${esc(deposit.managerNotes)}</b></div>` : ''}

      <div class="table-wrap" style="margin-top:14px">
        <table>
          <thead><tr><th>Jenis sampah</th><th>Estimasi</th><th>Berat aktual</th><th>Harga/kg</th><th>Subtotal</th></tr></thead>
          <tbody>
            ${deposit.details
              .map(
                (detail) => `<tr>
                  <td><div class="cell-title">${esc(detail.wasteName)}</div><small class="sub">${esc(detail.categoryName)}</small></td>
                  <td>${kg(detail.estimatedWeight)}</td>
                  <td>${detail.actualWeight === null ? '<span class="muted">-</span>' : kg(detail.actualWeight)}</td>
                  <td>${detail.pricePerKg === null ? '<span class="muted">-</span>' : money(detail.pricePerKg)}</td>
                  <td><b>${money(detail.subtotal)}</b></td>
                </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
      <div class="summary-line total"><span>Total nilai setoran</span><b>${money(deposit.totalValue)}</b></div>
      <div style="margin-top:14px">
        <div class="panel-head" style="margin-bottom:6px"><h3 style="font-size:12.5px">Lampiran</h3></div>
        ${attachmentsHtml(deposit.attachments)}
      </div>
      <div class="modal-actions">
        ${canCancel ? '<button class="btn danger" data-cancel-deposit>Batalkan Setoran</button>' : ''}
        ${canVerify ? '<button class="btn primary" data-verify-deposit>Verifikasi Berat</button>' : ''}
        ${canComplete ? '<button class="btn primary" data-complete-deposit>Selesaikan & Tambah Saldo</button>' : ''}
        <button class="btn" data-close-modal>Tutup</button>
      </div>`;

    document.getElementById('modalBody').querySelector('[data-verify-deposit]')?.addEventListener('click', () => {
      closeModal();
      openVerify(deposit, { onChange });
    });
    document.getElementById('modalBody').querySelector('[data-complete-deposit]')?.addEventListener('click', () => {
      closeModal();
      completeDeposit(deposit, { onChange });
    });
    document.getElementById('modalBody').querySelector('[data-cancel-deposit]')?.addEventListener('click', () => {
      closeModal();
      cancelDeposit(deposit, { onChange });
    });
    document.getElementById('modalBody').querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });
  } catch (error) {
    document.getElementById('modalBody').innerHTML = `<div class="alert">${esc(errorMessage(error))}</div>
      <div class="modal-actions"><button class="btn" data-close-modal>Tutup</button></div>`;
    document.getElementById('modalBody').querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', closeModal);
    });
  }
}

export async function openVerify(deposit, { onChange } = {}) {
  let detail = deposit;
  if (!detail.details) {
    const response = await api.get(`/deposits/${detail.id}`);
    detail = response.data.deposit;
  }
  if (detail.status !== 'menunggu') {
    toast('Setoran ini tidak lagi berstatus menunggu.', 'error');
    return;
  }

  openModal(
    `Verifikasi ${detail.code}`,
    `<div class="notice">Masukkan berat aktual hasil penimbangan dan harga per kilogram yang berlaku saat ini.</div>
     <form id="verifyForm">
       <div class="table-wrap">
         <table>
           <thead><tr><th>Jenis sampah</th><th style="width:110px">Berat aktual (kg)</th><th style="width:130px">Harga/kg</th><th>Subtotal</th></tr></thead>
           <tbody>
             ${detail.details
               .map(
                 (row, index) => `<tr data-row="${index}">
                   <td><div class="cell-title">${esc(row.wasteName)}</div><small class="sub">Estimasi ${kg(row.estimatedWeight)}</small></td>
                   <td><input class="field-select" style="width:100%" type="number" min="0" step="0.01" data-weight="${row.id}" value="${row.actualWeight ?? row.estimatedWeight}" required /></td>
                   <td><input class="field-select" style="width:100%" type="number" min="0" step="1" data-price="${row.id}" value="${row.pricePerKg ?? 0}" required /></td>
                   <td><b data-subtotal="${row.id}">${money(0)}</b></td>
                 </tr>`,
               )
               .join('')}
           </tbody>
         </table>
       </div>
       <div class="summary-line total"><span>Total nilai setoran</span><b id="verifyTotal">${money(0)}</b></div>
       <div class="form-group" style="margin-top:12px">
         <label for="managerNotes">Catatan pengelola (opsional)</label>
         <textarea id="managerNotes" placeholder="Contoh: berat setelah dikurangi kemasan">${esc(detail.managerNotes || '')}</textarea>
       </div>
       <div class="modal-actions">
         <button class="btn" type="button" data-close-modal>Batal</button>
         <button class="btn primary" type="submit" id="verifySubmit">Simpan Verifikasi</button>
       </div>
     </form>`,
    { wide: true },
  );

  const body = document.getElementById('modalBody');
  const form = body.querySelector('#verifyForm');
  const submit = body.querySelector('#verifySubmit');
  body.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));

  const recalc = () => {
    let total = 0;
    detail.details.forEach((row) => {
      const weight = Number(form.querySelector(`[data-weight="${row.id}"]`).value) || 0;
      const price = Number(form.querySelector(`[data-price="${row.id}"]`).value) || 0;
      const subtotal = Math.round(weight * price);
      total += subtotal;
      form.querySelector(`[data-subtotal="${row.id}"]`).textContent = money(subtotal);
    });
    form.querySelector('#verifyTotal').textContent = money(total);
  };
  form.querySelectorAll('input[type="number"]').forEach((input) => input.addEventListener('input', recalc));
  recalc();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Menyimpan...';
    try {
      const items = detail.details.map((row) => ({
        detailId: row.id,
        actualWeight: Number(form.querySelector(`[data-weight="${row.id}"]`).value),
        pricePerKg: Number(form.querySelector(`[data-price="${row.id}"]`).value),
      }));
      await api.patch(`/deposits/${detail.id}/verify`, {
        items,
        managerNotes: form.querySelector('#managerNotes').value.trim() || undefined,
      });
      closeModal();
      toast('Setoran berhasil diverifikasi.');
      onChange?.();
    } catch (error) {
      toast(errorMessage(error), 'error');
      submit.disabled = false;
      submit.textContent = 'Simpan Verifikasi';
    }
  });
}

export async function completeDeposit(deposit, { onChange } = {}) {
  openModal(
    'Selesaikan Setoran',
    `<div class="notice">Setoran ${esc(deposit.code)} akan ditandai selesai dan saldo nasabah ditambahkan sebesar ${money(deposit.totalValue)}. Saldo hanya dikreditkan satu kali.</div>
     <form id="completeForm">
       <div class="form-group">
         <label for="paymentMethod">Metode pembayaran</label>
         <select id="paymentMethod" name="paymentMethod">
           <option value="cash">Tunai</option>
           <option value="transfer">Transfer bank</option>
         </select>
         <span class="help">Pilih cara pembayaran saldo ke nasabah.</span>
       </div>
       <div class="modal-actions">
         <button class="btn" type="button" data-close-modal>Batal</button>
         <button class="btn primary" type="submit" id="completeSubmit">Selesaikan</button>
       </div>
     </form>`,
  );
  const body = document.getElementById('modalBody');
  body.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  body.querySelector('#completeForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = body.querySelector('#completeSubmit');
    submit.disabled = true;
    submit.textContent = 'Menyimpan...';
    try {
      const response = await api.patch(`/deposits/${deposit.id}/complete`, {
        paymentMethod: body.querySelector('#paymentMethod').value,
      });
      closeModal();
      toast(response.message);
      onChange?.();
    } catch (error) {
      toast(errorMessage(error), 'error');
      submit.disabled = false;
      submit.textContent = 'Selesaikan';
    }
  });
}

export async function cancelDeposit(deposit, { onChange } = {}) {
  openModal(
    `Batalkan ${deposit.code}`,
    `<div class="alert" style="margin-bottom:12px">Setoran yang dibatalkan tidak menambah saldo nasabah dan tidak dapat dikembalikan ke status sebelumnya.</div>
     <form id="cancelForm">
       <div class="form-group">
         <label for="reason">Alasan pembatalan (opsional)</label>
         <textarea id="reason" placeholder="Contoh: sampah tidak sesuai kriteria">${esc(deposit.notes ? '' : '')}</textarea>
       </div>
       <div class="modal-actions">
         <button class="btn" type="button" data-close-modal>Batal</button>
         <button class="btn danger" type="submit" id="cancelSubmit">Ya, Batalkan</button>
       </div>
     </form>`,
  );
  const body = document.getElementById('modalBody');
  body.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
  body.querySelector('#cancelForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = body.querySelector('#cancelSubmit');
    submit.disabled = true;
    submit.textContent = 'Membatalkan...';
    try {
      await api.patch(`/deposits/${deposit.id}/cancel`, {
        reason: body.querySelector('#reason').value.trim() || undefined,
      });
      closeModal();
      toast('Setoran dibatalkan.');
      onChange?.();
    } catch (error) {
      toast(errorMessage(error), 'error');
      submit.disabled = false;
      submit.textContent = 'Ya, Batalkan';
    }
  });
}
