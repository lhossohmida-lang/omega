const INSTALL_TARGET_KEY = 'omega_install_target';

export const INSTALL_TARGETS = {
  customer: {
    key: 'customer',
    label: 'تطبيق العملاء',
    buttonLabel: 'تحميل تطبيق العملاء',
    path: '/',
  },
  admin: {
    key: 'admin',
    label: 'تطبيق الإدارة',
    buttonLabel: 'تحميل تطبيق الإدارة',
    path: '/admin',
  },
  worker: {
    key: 'worker',
    label: 'تطبيق العمال',
    buttonLabel: 'تحميل تطبيق العمال',
    path: '/worker',
  },
};

export function normalizeInstallTarget(target) {
  return INSTALL_TARGETS[target] ? target : 'customer';
}

export function getInstallTargetFromPath(pathname = '/') {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/worker') || pathname.startsWith('/staff')) return 'worker';
  return 'customer';
}

export function saveInstallTarget(target) {
  const normalized = normalizeInstallTarget(target);
  localStorage.setItem(INSTALL_TARGET_KEY, normalized);
  return normalized;
}

export function getSavedInstallTarget() {
  try {
    return normalizeInstallTarget(localStorage.getItem(INSTALL_TARGET_KEY) || 'customer');
  } catch {
    return 'customer';
  }
}

export function getSavedLaunchPath() {
  return INSTALL_TARGETS[getSavedInstallTarget()].path;
}

export function getLaunchTargetFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const launch = params.get('launch') || params.get('target');
  return launch ? normalizeInstallTarget(launch) : null;
}

export function isStandaloneApp() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
