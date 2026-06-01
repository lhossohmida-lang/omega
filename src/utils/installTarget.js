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
  kiosk: {
    key: 'kiosk',
    label: 'تطبيق الكشك',
    buttonLabel: 'تحميل تطبيق الكشك',
    path: '/kiosk',
  },
};

export function normalizeInstallTarget(target) {
  return INSTALL_TARGETS[target] ? target : 'customer';
}

export function getInstallTargetFromPath(pathname = '/') {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/worker') || pathname.startsWith('/staff')) return 'worker';
  if (pathname.startsWith('/kiosk')) return 'kiosk';
  return 'customer';
}

export function saveInstallTarget(target) {
  const normalized = normalizeInstallTarget(target);
  localStorage.setItem(INSTALL_TARGET_KEY, normalized);
  return normalized;
}

export function getSavedInstallTarget() {
  if (window.Capacitor) {
    return 'kiosk';
  }
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
    !!window.Capacitor ||
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
