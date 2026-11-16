import { api, errorMessage } from '../api.js';
import {
  closeModal,
  confirmDialog,
  emptyState,
  esc,
  loadingState,
  money,
  openModal,
  toast,
} from '../ui.js';

export default {
  render: async (container) => {
    container.innerHTML = loadingState('Memuat katalog...');
    let categories = [];
    let types = [];

    async function load() {
      try {
        const [categoryRes, typeRes] = await Promise.all([api.get('/categories'), api.get('/waste-types')]);
        categories = categoryRes.data || [];
        types = typeRes.data || [];
      } catch (error) {
        container.innerHTML = `<div class="panel"><div class="alert">${esc(errorMessage(error))}</div></div>`;
        return;
      }
      renderAll();
    }

    function renderAll() {
      container.innerHTML = `
        <div class="page-head">
          <div><h1>Kategori Sampah</h1><p>Kelola kategori, harga per kilogram, dan status aktif jenis sampah.</p></div>
          <div class="head-actions">
            <button class="btn" id="addCategory">＋ Kategori</button>
            <button class="btn primary" id="addType">＋ Jenis Sampah</button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Kategori</h3><span>${categories.length} kategori</span></div>
          ${
            categories.length
              ? `<div class="table-wrap"><table>
                  <thead><tr><th>Kategori</th><th>Deskripsi</th><th>Jenis</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    ${categories
                      .map(
                        (category) => `<tr>
                          <td><div class="person"><span class="mini-avatar">${esc(category.icon || '♻')}</span><div class="cell-title">${esc(category.name)}</div></div></td>
                          <td><span class="muted small">${esc(category.description || '-')}</span></td>
                          <td>${Number(category.activeTypeCount)}/${Number(category.typeCount)} aktif</td>
                          <td><span class="status ${category.isActive ? 'selesai' : 'dibatalkan'}">${category.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                          <td><div class="row-actions">
                            <button class="btn small" data-edit-category="${category.id}">Ubah</button>
                            <button class="btn small danger" data-delete-category="${category.id}">Hapus</button>
                          </div></td>
                        </tr>`,
                      )
                      .join('')}
                  </tbody>
                </table></div>`
              : emptyState('Belum ada kategori', 'Tambahkan kategori sampah pertama Anda.')
          }
        </div>

        <div class="panel">
          <div class="panel-head"><h3>Jenis Sampah</h3><span>${types.length} jenis</span></div>
          <div class="toolbar">
            <div class="search"><input type="search" id="typeSearch" placeholder="Cari jenis atau kategori" /></div>
            <select class="field-select" id="typeCategory">
              <option value="">Semua kategori</option>
              ${categories.map((category) => `<option value="${category.id}">${esc(category.name)}</option>`).join('')}
            </select>
          </div>
          <div id="typeList"></div>
        </div>`;

      const typeSearch = container.querySelector('#typeSearch');
      const typeCategory = container.querySelector('#typeCategory');
      const typeList = container.querySelector('#typeList');

      const renderTypes = () => {
        const term = typeSearch.value.trim().toLowerCase();
        const categoryId = typeCategory.value;
        const filtered = types.filter(
          (type) =>
            (!categoryId || Number(type.categoryId) === Number(categoryId)) &&
            (!term || type.name.toLowerCase().includes(term) || type.categoryName.toLowerCase().includes(term)),
        );
        typeList.innerHTML = filtered.length
          ? `<div class="table-wrap"><table>
              <thead><tr><th>Jenis</th><th>Kategori</th><th>Harga/kg</th><th>Satuan</th><th>Status</th><th></th></tr></thead>
              <tbody>
                ${filtered
                  .map(
                    (type) => `<tr>
                      <td><div class="cell-title">${esc(type.name)}</div><small class="sub">${esc(type.description || '-')}</small></td>
                      <td><span class="category-chip">${esc(type.categoryIcon || '')} ${esc(type.categoryName)}</span></td>
                      <td class="nowrap"><b>${money(type.pricePerKg)}</b></td>
                      <td>${esc(type.unit || 'kg')}</td>
                      <td><span class="status ${type.isActive ? 'selesai' : 'dibatalkan'}">${type.isActive ? 'Aktif' : 'Nonaktif'}</span></td>
                      <td><div class="row-actions">
                        <button class="btn small" data-edit-type="${type.id}">Ubah</button>
                        <button class="btn small danger" data-delete-type="${type.id}">Hapus</button>
                      </div></td>
                    </tr>`,
                  )
                  .join('')}
              </tbody>
            </table></div>`
          : emptyState('Tidak ada jenis sampah', 'Tambahkan jenis sampah atau ubah filter.');
        bindTypeActions();
      };

      const bindTypeActions = () => {
        typeList.querySelectorAll('[data-edit-type]').forEach((button) => {
          button.addEventListener('click', () => openTypeForm(types.find((type) => type.id === Number(button.dataset.editType))));
        });
        typeList.querySelectorAll('[data-delete-type]').forEach((button) => {
          button.addEventListener('click', () => deleteType(types.find((type) => type.id === Number(button.dataset.deleteType))));
        });
      };

      typeSearch.addEventListener('input', renderTypes);
      typeCategory.addEventListener('change', renderTypes);
      renderTypes();

      container.querySelector('#addCategory').addEventListener('click', () => openCategoryForm());
      container.querySelector('#addType').addEventListener('click', () => openTypeForm());
      container.querySelectorAll('[data-edit-category]').forEach((button) => {
        button.addEventListener('click', () =>
          openCategoryForm(categories.find((category) => category.id === Number(button.dataset.editCategory))),
        );
      });
      container.querySelectorAll('[data-delete-category]').forEach((button) => {
        button.addEventListener('click', () =>
          deleteCategory(categories.find((category) => category.id === Number(button.dataset.deleteCategory))),
        );
      });
    }

    function openCategoryForm(category = null) {
      openModal(
        category ? 'Ubah Kategori' : 'Kategori Baru',
        `<form id="categoryForm">
          <div class="form-group"><label>Nama kategori</label><input name="name" value="${esc(category?.name || '')}" required minlength="2" maxlength="80" /></div>
          <div class="form-grid">
            <div class="form-group"><label>Ikon</label><input name="icon" value="${esc(category?.icon || '♻')}" maxlength="8" placeholder="♻" /></div>
            <div class="form-group"><label>Status</label>
              <select name="isActive">
                <option value="true" ${category?.isActive !== 0 ? 'selected' : ''}>Aktif</option>
                <option value="false" ${category?.isActive === 0 ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>Deskripsi</label><textarea name="description" maxlength="255">${esc(category?.description || '')}</textarea></div>
          <div class="modal-actions">
            <button class="btn" type="button" data-close-modal>Batal</button>
            <button class="btn primary" type="submit">Simpan</button>
          </div>
        </form>`,
      );
      const form = document.getElementById('modalBody').querySelector('#categoryForm');
      form.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
          name: form.name.value.trim(),
          icon: form.icon.value.trim() || '♻',
          description: form.description.value.trim() || undefined,
          isActive: form.isActive.value === 'true',
        };
        try {
          if (category) await api.put(`/categories/${category.id}`, payload);
          else await api.post('/categories', payload);
          closeModal();
          toast(category ? 'Kategori diperbarui.' : 'Kategori ditambahkan.');
          await load();
        } catch (error) {
          toast(errorMessage(error), 'error');
        }
      });
    }

    function openTypeForm(type = null) {
      if (!categories.length) {
        toast('Tambahkan kategori terlebih dahulu.', 'error');
        return;
      }
      openModal(
        type ? 'Ubah Jenis Sampah' : 'Jenis Sampah Baru',
        `<form id="typeForm">
          <div class="form-grid">
            <div class="form-group"><label>Kategori</label>
              <select name="categoryId" required>
                ${categories
                  .map(
                    (category) =>
                      `<option value="${category.id}" ${type?.categoryId === category.id ? 'selected' : ''}>${esc(category.name)}</option>`,
                  )
                  .join('')}
              </select>
            </div>
            <div class="form-group"><label>Nama jenis</label><input name="name" value="${esc(type?.name || '')}" required maxlength="100" /></div>
            <div class="form-group"><label>Harga per kg (Rp)</label><input name="pricePerKg" type="number" min="0" step="1" value="${type?.pricePerKg ?? 0}" required /></div>
            <div class="form-group"><label>Satuan</label><input name="unit" value="${esc(type?.unit || 'kg')}" maxlength="20" /></div>
            <div class="form-group"><label>Status</label>
              <select name="isActive">
                <option value="true" ${type?.isActive !== 0 ? 'selected' : ''}>Aktif</option>
                <option value="false" ${type?.isActive === 0 ? 'selected' : ''}>Nonaktif</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>Deskripsi</label><textarea name="description" maxlength="255">${esc(type?.description || '')}</textarea></div>
          <div class="modal-actions">
            <button class="btn" type="button" data-close-modal>Batal</button>
            <button class="btn primary" type="submit">Simpan</button>
          </div>
        </form>`,
      );
      const form = document.getElementById('modalBody').querySelector('#typeForm');
      form.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', closeModal));
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
          categoryId: Number(form.categoryId.value),
          name: form.name.value.trim(),
          pricePerKg: Number(form.pricePerKg.value),
          unit: form.unit.value.trim() || 'kg',
          description: form.description.value.trim() || undefined,
          isActive: form.isActive.value === 'true',
        };
        try {
          if (type) await api.put(`/waste-types/${type.id}`, payload);
          else await api.post('/waste-types', payload);
          closeModal();
          toast(type ? 'Jenis sampah diperbarui.' : 'Jenis sampah ditambahkan.');
          await load();
        } catch (error) {
          toast(errorMessage(error), 'error');
        }
      });
    }

    async function deleteCategory(category) {
      const ok = await confirmDialog({
        title: 'Hapus Kategori',
        message: `Hapus kategori "${category.name}"? Kategori yang sudah dipakai transaksi tidak dapat dihapus.`,
        confirmLabel: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      try {
        await api.remove(`/categories/${category.id}`);
        toast('Kategori dihapus.');
        await load();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    }

    async function deleteType(type) {
      const ok = await confirmDialog({
        title: 'Hapus Jenis Sampah',
        message: `Hapus "${type.name}"? Jenis yang sudah dipakai transaksi tidak dapat dihapus.`,
        confirmLabel: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      try {
        await api.remove(`/waste-types/${type.id}`);
        toast('Jenis sampah dihapus.');
        await load();
      } catch (error) {
        toast(errorMessage(error), 'error');
      }
    }

    await load();
  },
};
