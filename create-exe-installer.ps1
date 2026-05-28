# =============================================================================
#  OMEGA — Create Launcher EXE (+ Companion ZIP)
#  يصنع ملف omega-installer.exe الذي يفك الضغط ويشغّل install.bat
#  الأسلوب: يبحث عن ZIP في نفس المجلد، لا يحتاج 7-Zip أو NSIS
# =============================================================================

$ErrorActionPreference = "Stop"
Write-Host "🚀 OMEGA — Building EXE Installer Launcher..." -ForegroundColor Cyan

# ── 1. Copy ZIP to public/ ──────────────────────────────────────────────────
$ZipSrc  = ".\INSTAL\omega-pos-installer.zip"
$ZipDest = ".\public\omega-pos-installer.zip"
Copy-Item $ZipSrc $ZipDest -Force
$sz = [math]::Round((Get-Item $ZipDest).Length / 1MB, 2)
Write-Host "   ✅ ZIP copied to public\ (${sz} MB)" -ForegroundColor Green

# ── 2. Compile real EXE launcher (searches for ZIP beside itself) ────────────
Write-Host "🔨 Compiling EXE launcher..." -ForegroundColor Yellow

$csharp = @'
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("OMEGA POS Installer")]
[assembly: AssemblyProduct("OMEGA POS")]
[assembly: AssemblyVersion("1.0.0.0")]

class OmegaInstaller {
    [STAThread]
    static void Main() {
        try {
            // Look for the ZIP next to the EXE
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string zipPath = Path.Combine(exeDir, "omega-pos-installer.zip");

            if (!File.Exists(zipPath)) {
                MessageBox.Show(
                    "لم يتم العثور على ملف المثبت:\nomega-pos-installer.zip\n\n" +
                    "تأكد من أن الملفين في نفس المجلد:\n• omega-installer.exe\n• omega-pos-installer.zip",
                    "OMEGA POS — خطأ",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            string desktop     = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string extractPath = Path.Combine(desktop, "OMEGA-POS");

            DialogResult res = MessageBox.Show(
                "مرحباً بك في مثبت نظام OMEGA POS!\n\n" +
                "سيتم فك الضغط وتثبيت النظام على سطح المكتب في مجلد:\n" +
                extractPath + "\n\nهل تريد المتابعة؟",
                "مثبت OMEGA POS",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question,
                MessageBoxDefaultButton.Button1,
                MessageBoxOptions.RightAlign | MessageBoxOptions.RtlReading);

            if (res != DialogResult.Yes) return;

            // Extract
            if (Directory.Exists(extractPath)) Directory.Delete(extractPath, true);
            ZipFile.ExtractToDirectory(zipPath, extractPath);

            // Run install.bat
            string bat = Path.Combine(extractPath, "install.bat");
            if (!File.Exists(bat)) bat = Directory.GetFiles(extractPath, "install.bat", SearchOption.AllDirectories)[0];

            ProcessStartInfo psi = new ProcessStartInfo("cmd.exe") {
                Arguments      = "/c \"" + bat + "\"",
                WorkingDirectory = Path.GetDirectoryName(bat),
                Verb           = "runas",
                UseShellExecute = true
            };
            Process.Start(psi);

        } catch (Exception ex) {
            MessageBox.Show("خطأ:\n" + ex.Message, "OMEGA POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
'@

$exeOut = ".\public\omega-installer.exe"

Add-Type -TypeDefinition $csharp `
         -ReferencedAssemblies @(
             "System.Windows.Forms",
             "System.IO.Compression",
             "System.IO.Compression.FileSystem"
         ) `
         -OutputAssembly $exeOut `
         -OutputType WindowsApplication

if (Test-Path $exeOut) {
    $exeSz = [math]::Round((Get-Item $exeOut).Length / 1KB, 0)
    Write-Host "`n✅ EXE launcher ready! (${exeSz} KB)" -ForegroundColor Green
    Write-Host "   → $exeOut" -ForegroundColor Green
    Write-Host "`n📦 Users should download BOTH files:" -ForegroundColor Yellow
    Write-Host "   • omega-installer.exe  (launcher)" -ForegroundColor White
    Write-Host "   • omega-pos-installer.zip  (data)" -ForegroundColor White
} else {
    Write-Error "EXE build failed!"
}
