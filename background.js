const STORAGE_KEY = 'xheaderState';
const RULE_ID_START = 1000;
const MAX_RULES = 5000;

const defaultState = {
  enabled: true,
  selectedProfileId: 'xff-test',
  profiles: [
    {
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
    }
  ]
};

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(defaultState));
}

async function getState() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return normalizeState(result[STORAGE_KEY]);
}

function normalizeState(input) {
  if (!input || typeof input !== 'object') return cloneDefaultState();

  if (isLegacyDefaultState(input)) return cloneDefaultState();

  const state = {
    enabled: input.enabled !== false,
    selectedProfileId: typeof input.selectedProfileId === 'string' ? input.selectedProfileId : '',
    profiles: Array.isArray(input.profiles) ? input.profiles.map(normalizeProfile).filter(Boolean) : []
  };

  if (!state.profiles.length) return cloneDefaultState();
  if (!state.profiles.some((profile) => profile.id === state.selectedProfileId)) {
    state.selectedProfileId = state.profiles[0].id;
  }
  return state;
}

function isLegacyDefaultState(input) {
  return input.selectedProfileId === 'local-dev'
    && Array.isArray(input.profiles)
    && input.profiles.length === 1
    && input.profiles[0]?.id === 'local-dev'
    && input.profiles[0]?.name === '本地开发'
    && input.profiles[0]?.scope === 'localhost, 127.0.0.1';
}

function normalizeProfile(profile) {
  if (!profile || typeof profile !== 'object') return null;
  const id = typeof profile.id === 'string' && profile.id ? profile.id : `profile-${crypto.randomUUID()}`;
  const headers = Array.isArray(profile.headers)
    ? profile.headers.map((header) => {
        if (!header || typeof header !== 'object') return null;
        return {
          id: typeof header.id === 'string' && header.id ? header.id : `header-${crypto.randomUUID()}`,
          name: typeof header.name === 'string' ? header.name.slice(0, 256) : '',
          value: typeof header.value === 'string' ? header.value.slice(0, 4096) : '',
          operation: ['set', 'append', 'remove'].includes(header.operation) ? header.operation : 'set'
        };
      }).filter(Boolean)
    : [];

  return {
    id,
    name: typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim().slice(0, 80) : '未命名配置',
    enabled: profile.enabled !== false,
    scope: typeof profile.scope === 'string' ? profile.scope.slice(0, 2000) : '*',
    headers
  };
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, '\\$&');
}

function scopeToCondition(scope) {
  const rawScopes = String(scope || '*')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!rawScopes.length || rawScopes.includes('*')) return {};

  const regexes = rawScopes.map((item) => {
    if (/^https?:\/\//i.test(item)) {
      let expression = escapeRegex(item)
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
      if (!expression.endsWith('.*')) expression += '.*';
      return expression;
    }

    const domainPath = item.replace(/^\*:\/\//i, '').replace(/^\*\./, '').replace(/\/$/, '');
    const [host, ...pathParts] = domainPath.split('/');
    if (!host) return null;
    const hostExpression = `([^./]+\\.)*${escapeRegex(host)}`;
    const pathExpression = pathParts.length ? `/${pathParts.map(escapeRegex).join('/').replace(/\\\*/g, '.*')}` : '';
    return `^https?://${hostExpression}(:\\d+)?${pathExpression}(/|$)`;
  }).filter(Boolean);

  if (!regexes.length) return {};
  return { regexFilter: `(?:${regexes.join('|')})` };
}

function headerIsValid(header) {
  return /^[a-zA-Z0-9!#$%&'*+.^_`|~-]+$/.test(header.name)
    && header.name.length <= 256
    && header.value.length <= 4096;
}

function buildRules(state) {
  if (!state.enabled) return [];

  const rules = [];
  let nextId = RULE_ID_START;
  const activeProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId);
  const profiles = activeProfile?.enabled ? [activeProfile] : [];

  for (const profile of profiles) {
    for (const header of profile.headers) {
      if (!headerIsValid(header)) continue;
      if (rules.length >= MAX_RULES) break;

      const modification = {
        header: header.name,
        operation: header.operation
      };
      if (header.operation !== 'remove') modification.value = header.value;

      rules.push({
        id: nextId++,
        priority: 1,
        action: { type: 'modifyHeaders', requestHeaders: [modification] },
        condition: {
          ...scopeToCondition(profile.scope),
          resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'media', 'websocket', 'other']
        }
      });
    }
  }
  return rules;
}

async function syncRules() {
  const state = await getState();
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id).filter((id) => id >= RULE_ID_START);
  const addRules = buildRules(state);

  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
  return { ruleCount: addRules.length, enabled: state.enabled };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEY).then(async (result) => {
    if (!result[STORAGE_KEY]) await chrome.storage.local.set({ [STORAGE_KEY]: cloneDefaultState() });
    await syncRules();
  }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  syncRules().catch(() => {});
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) syncRules().catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'syncRules') {
    syncRules().then(sendResponse).catch((error) => {
      sendResponse({ error: error?.message || '规则同步失败' });
    });
    return true;
  }
  return false;
});
