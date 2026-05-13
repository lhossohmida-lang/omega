import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { IoDownloadOutline } from 'react-icons/io5';
import toast from 'react-hot-toast';

export default function CustomerNav() {
  const { canInstall, isIOS, install } = useInstallPrompt();

  const handleInstall = async () => {
    if (isIOS) {
      toast('لتثبيت التطبيق: اضغط زر المشاركة ← أضف إلى الشاشة الرئيسية', { duration: 5000, icon: '📱' });
      return;
    }
    await install();
  };

  if (!canInstall && !isIOS) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-sm">
      <button
        onClick={handleInstall}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-gradient-to-l from-omega-orange to-omega-orange-dark shadow-lg shadow-omega-orange/25 active:scale-[0.98] transition-all"
      >
        <IoDownloadOutline size={22} className="text-white" />
        <span className="text-white font-black text-sm">تثبيت تطبيق OMEGA</span>
      </button>
    </div>
  );
}
