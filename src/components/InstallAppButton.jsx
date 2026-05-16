import { IoDownloadOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import {
  INSTALL_TARGETS,
  normalizeInstallTarget,
  saveInstallTarget,
} from '../utils/installTarget';

export default function InstallAppButton({
  target = 'customer',
  className = '',
  compact = false,
}) {
  const normalized = normalizeInstallTarget(target);
  const config = INSTALL_TARGETS[normalized];
  const { canInstall, isIOS, isInstalled, install } = useInstallPrompt();

  const handleInstall = async () => {
    saveInstallTarget(normalized);

    if (isInstalled) {
      toast.success(`${config.label} مثبت بالفعل، وسيفتح على هذه الواجهة`);
      return;
    }

    if (isIOS) {
      toast(`تم حفظ وجهة ${config.label}. للتثبيت: اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية".`, {
        duration: 6000,
        icon: '📱',
      });
      return;
    }

    if (!canInstall) {
      toast(`تم حفظ وجهة ${config.label}. إن لم يظهر التثبيت، استخدم خيار تثبيت التطبيق من قائمة المتصفح.`, {
        duration: 5000,
        icon: '⬇️',
      });
      return;
    }

    const accepted = await install();
    if (accepted) {
      toast.success(`تم تثبيت ${config.label}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleInstall}
      className={className}
      title={config.buttonLabel}
    >
      <IoDownloadOutline size={compact ? 18 : 22} />
      <span>{compact ? 'تحميل التطبيق' : config.buttonLabel}</span>
    </button>
  );
}
