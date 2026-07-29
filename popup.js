const STORAGE_KEY = 'xheaderState';

const $ = (selector) => document.querySelector(selector);
const profileList = $('#profileList');
const headersList = $('#headersList');
const profileName = $('#profileName');
const profileScope = $('#profileScope');
const globalEnabled = $('#globalEnabled');
const profileEnabled = $('#profileEnabled');
const saveStatus = $('#saveStatus');
const statusDot = $('#statusDot');
const engineStatusDot = $('#engineStatusDot');
const ruleSummary = $('#ruleSummary');
const engineStatusText = $('#engineStatusText');
const globalEnabledLabel = $('#globalEnabledLabel');
const scopeBadge = $('#scopeBadge');
const headerCount = $('#headerCount');
const toast = $('#toast');

let state;
let saveTimer;
let toastTimer;

function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function defaultState() {
  return {
    enabled: true,
    selectedProfileId: 'xff-test',
    profiles: [{
      id: 'xff-test',
      name: 'XFF测试',
      enabled: true,
      scope: '*',
      headers: [
        { id: 'xff-1', name: 'X-Forwarded-For', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-2', name: 'X-Real-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-3', name: 'X-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-4', name: 'Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-5', name: 'True-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-6', name: 'CF-Connecting-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-7', name: 'X-Cluster-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-8', name: 'X-Original-Forwarded-For', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-9', name: 'Forwarded', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-10', name: 'X-Forwarded', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-11', name: 'Forwarded-For', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-12', name: 'X-Forwarded-For-Original', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-13', name: 'X-Original-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-14', name: 'X-Original-Remote-Addr', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-15', name: 'X-Remote-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-16', name: 'X-Remote-Addr', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-17', name: 'X-ProxyUser-Ip', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-18', name: 'WL-Proxy-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-19', name: 'Proxy-Client-IP', value: '127.0.0.1', operation: 'set' },
        { id: 'xff-20', name: 'Fastly-Client-IP', value: '127.0.0.1', operation: 'set' }
      ]
    }]
  };
}

function getSelectedProfile() {
  return state.profiles.find((profile) => profile.id === state.selectedProfileId) || state.profiles[0];
}

async function loadState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  state = result[STORAGE_KEY] || defaultState();
  if (state.selectedProfileId === 'local-dev'
    && state.profiles?.length === 1
    && state.profiles[0]?.id === 'local-dev'
    && state.profiles[0]?.name === '本地开发') {
    state = defaultState();
  }
  if (!state.profiles?.length) state = defaultState();
  if (!state.profiles.some((profile) => profile.id === state.selectedProfileId)) {
    state.selectedProfileId = state.profiles[0].id;
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
  chrome.runtime.sendMessage({ type: 'syncRules' }).catch(() => {});
  render();
}

function render() {
  const profile = getSelectedProfile();
  globalEnabled.checked = state.enabled !== false;
  statusDot.classList.toggle('off', !state.enabled);
  engineStatusDot.classList.toggle('off', !state.enabled);
  engineStatusText.textContent = state.enabled ? '运行中' : '已暂停';
  globalEnabledLabel.textContent = state.enabled ? '启用' : '暂停';
  profileName.value = profile.name || '';
  profileScope.value = profile.scope || '*';
  profileEnabled.checked = profile.enabled !== false;
  scopeBadge.textContent = (profile.scope || '*').trim() === '*' ? '全部网站' : '指定范围';
  headerCount.textContent = `${profile.headers.length} 条`;
  renderProfiles();
  renderHeaders(profile);
  updateSummary();
}

function renderProfiles() {
  profileList.replaceChildren();
  for (const profile of state.profiles) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'profile-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(profile.id === state.selectedProfileId));
    button.dataset.profileId = profile.id;

    const name = document.createElement('span');
    name.className = 'profile-item-name';
    name.textContent = profile.name;
    const scope = document.createElement('span');
    scope.className = 'profile-item-scope';
    scope.textContent = profile.scope || '*';
    button.append(name, scope);
    button.addEventListener('click', () => {
      state.selectedProfileId = profile.id;
      persist();
      render();
    });
    profileList.append(button);
  }
}

function renderHeaders(profile) {
  headersList.replaceChildren();
  headerCount.textContent = `${profile.headers.length} 条`;
  if (!profile.headers.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-headers';
    const message = document.createElement('p');
    message.textContent = '此配置还没有请求头规则';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '添加第一条规则';
    button.addEventListener('click', addHeader);
    empty.append(message, button);
    headersList.append(empty);
    return;
  }

  for (const header of profile.headers) {
    const row = document.createElement('div');
    row.className = 'header-row';
    row.dataset.headerId = header.id;

    const name = document.createElement('input');
    name.type = 'text';
    name.maxLength = 256;
    name.placeholder = 'Header 名称';
    name.value = header.name;
    name.setAttribute('aria-label', 'Header 名称');

    const value = document.createElement('input');
    value.type = 'text';
    value.maxLength = 4096;
    value.placeholder = header.operation === 'remove' ? '无需填写值' : 'Header 值';
    value.value = header.value;
    value.disabled = header.operation === 'remove';
    value.setAttribute('aria-label', 'Header 值');

    const operation = document.createElement('select');
    operation.setAttribute('aria-label', '操作');
    for (const [key, label] of [['set', '覆盖'], ['append', '追加'], ['remove', '删除']]) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = label;
      option.selected = header.operation === key;
      operation.append(option);
    }

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-header';
    remove.title = '删除此规则';
    remove.setAttribute('aria-label', `删除 ${header.name || '此规则'}`);
    remove.textContent = '×';

    name.addEventListener('input', () => updateHeader(header, { name: name.value }, row));
    value.addEventListener('input', () => updateHeader(header, { value: value.value }, row));
    operation.addEventListener('change', () => {
      updateHeader(header, { operation: operation.value }, row);
      value.disabled = operation.value === 'remove';
      value.placeholder = operation.value === 'remove' ? '无需填写值' : 'Header 值';
    });
    remove.addEventListener('click', () => {
      profile.headers = profile.headers.filter((item) => item.id !== header.id);
      persist();
      renderHeaders(profile);
      updateSummary();
    });
    row.append(name, value, operation, remove);
    headersList.append(row);
  }
}

function updateHeader(header, patch, row) {
  Object.assign(header, patch);
  row.classList.toggle('is-invalid', Boolean(header.name) && !isValidHeaderName(header.name));
  persist();
  updateSummary();
}

function isValidHeaderName(name) {
  return /^[a-zA-Z0-9!#$%&'*+.^_`|~-]+$/.test(name) && name.length <= 256;
}

function addHeader() {
  const profile = getSelectedProfile();
  profile.headers.push({ id: id('header'), name: '', value: '', operation: 'set' });
  persist();
  renderHeaders(profile);
  headersList.lastElementChild?.querySelector('input')?.focus();
  updateSummary();
}

function addProfile() {
  const profile = {
    id: id('profile'),
    name: `新配置 ${state.profiles.length + 1}`,
    enabled: true,
    scope: '*',
    headers: []
  };
  state.profiles.push(profile);
  state.selectedProfileId = profile.id;
  persist();
  render();
  profileName.focus();
  profileName.select();
}

function deleteProfile() {
  if (state.profiles.length === 1) {
    showToast('至少保留一个配置文件', true);
    return;
  }
  const profile = getSelectedProfile();
  if (!window.confirm(`确定删除“${profile.name}”吗？`)) return;
  state.profiles = state.profiles.filter((item) => item.id !== profile.id);
  state.selectedProfileId = state.profiles[0].id;
  persist();
  render();
  showToast('配置已删除');
}

function persist() {
  saveStatus.textContent = '保存中…';
  saveStatus.className = 'save-status saving';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
      saveStatus.textContent = '已保存';
      saveStatus.className = 'save-status';
    } catch {
      saveStatus.textContent = '保存失败';
      saveStatus.className = 'save-status error';
      showToast('无法保存配置，请重试', true);
    }
  }, 180);
}

function updateSummary() {
  const profile = getSelectedProfile();
  const validCount = profile.headers.filter((header) => isValidHeaderName(header.name)).length;
  ruleSummary.textContent = state.enabled ? `${validCount} 条请求头规则已准备` : '规则已暂停';
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `xheader-config-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
  showToast('配置已导出');
}

async function importState(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('配置文件不能超过 1 MB');
    const imported = JSON.parse(await file.text());
    if (!imported || !Array.isArray(imported.profiles)) throw new Error('配置文件格式无效');
    state = {
      enabled: imported.enabled !== false,
      selectedProfileId: imported.selectedProfileId,
      profiles: imported.profiles.map((profile) => ({
        id: typeof profile.id === 'string' && profile.id ? profile.id : id('profile'),
        name: typeof profile.name === 'string' ? profile.name.slice(0, 80) : '未命名配置',
        enabled: profile.enabled !== false,
        scope: typeof profile.scope === 'string' ? profile.scope.slice(0, 2000) : '*',
        headers: Array.isArray(profile.headers) ? profile.headers.map((header) => ({
          id: typeof header.id === 'string' && header.id ? header.id : id('header'),
          name: typeof header.name === 'string' ? header.name.slice(0, 256) : '',
          value: typeof header.value === 'string' ? header.value.slice(0, 4096) : '',
          operation: ['set', 'append', 'remove'].includes(header.operation) ? header.operation : 'set'
        })) : []
      }))
    };
    if (!state.profiles.length) throw new Error('配置文件至少需要一条配置');
    if (!state.profiles.some((profile) => profile.id === state.selectedProfileId)) state.selectedProfileId = state.profiles[0].id;
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    render();
    showToast('配置已导入');
  } catch (error) {
    showToast(error.message || '导入失败', true);
  }
}

globalEnabled.addEventListener('change', () => {
  state.enabled = globalEnabled.checked;
  persist();
  render();
});
profileEnabled.addEventListener('change', () => {
  getSelectedProfile().enabled = profileEnabled.checked;
  persist();
  updateSummary();
});
profileName.addEventListener('input', () => {
  getSelectedProfile().name = profileName.value || '未命名配置';
  persist();
  renderProfiles();
});
profileScope.addEventListener('input', () => {
  getSelectedProfile().scope = profileScope.value;
  persist();
  renderProfiles();
});
$('#newProfileButton').addEventListener('click', addProfile);
$('#addHeaderButton').addEventListener('click', addHeader);
$('#deleteProfileButton').addEventListener('click', deleteProfile);
$('#exportButton').addEventListener('click', exportState);
$('#importButton').addEventListener('click', () => $('#importFile').click());
$('#importFile').addEventListener('change', importState);

loadState().catch(() => showToast('读取配置失败', true));
