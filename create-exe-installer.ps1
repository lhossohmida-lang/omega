# =============================================================================
#  OMEGA - Create Launcher EXE (With Embedded ZIP Data)
#  Builds a SINGLE omega-installer.exe containing the full companion ZIP!
#  Method: Embeds the ZIP as a Manifest Resource for 1-click install.
# =============================================================================

$ErrorActionPreference = "Stop"
Write-Host "OMEGA - Building Unified Single EXE Installer (With Embedded Resource)..." -ForegroundColor Cyan

# 1. Copy ZIP to public/ (still keep a copy in public for standard access)
$ZipSrc  = ".\INSTAL\omega-pos-installer.zip"
$ZipDest = ".\public\omega-pos-installer.zip"
Copy-Item $ZipSrc $ZipDest -Force
$sz = [math]::Round((Get-Item $ZipDest).Length / 1MB, 2)
Write-Host "ZIP copied to public ($sz MB)" -ForegroundColor Green

# 2. Compile Unified EXE launcher
Write-Host "Compiling Unified EXE launcher..." -ForegroundColor Yellow

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
            string desktop     = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string extractPath = Path.Combine(desktop, "OMEGA-POS");

            DialogResult res = MessageBox.Show(
                "\u0645\u0631\u062d\u0628\u0627\u064b \u0628\u0643 \u0641\u064a \u0645\u062b\u0628\u062a \u0646\u0638\u0627\u0645 OMEGA POS!\n\n" +
                "\u0633\u064a\u062a\u0645 \u0641\u0643 \u0627\u0644\u0636\u063a\u0637 \u0648\u062a\u062b\u0628\u064a\u062a \u0627\u0644\u0646\u0638\u0627\u0645 \u0639\u0644\u0649 \u0633\u0637\u062d \u0627\u0644\u0645\u0643\u062a\u0628 \u0641\u064a \u0645\u062c\u0644\u062f:\n" +
                extractPath + "\n\n\u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u061f",
                "\u0645\u062b\u0628\u062a OMEGA POS",
                MessageBoxButtons.YesNo, MessageBoxIcon.Question,
                MessageBoxDefaultButton.Button1,
                MessageBoxOptions.RightAlign | MessageBoxOptions.RtlReading);

            if (res != DialogResult.Yes) return;

            // Find embedded ZIP resource
            string zipResourceName = null;
            Assembly assembly = Assembly.GetExecutingAssembly();
            foreach (string name in assembly.GetManifestResourceNames()) {
                if (name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase)) {
                    zipResourceName = name;
                    break;
                }
            }

            if (string.IsNullOrEmpty(zipResourceName)) {
                MessageBox.Show(
                    "خطأ: لم يتم العثور على حزمة البيانات المضغوطة المدمجة داخل هذا الملف التنفيذي.",
                    "OMEGA POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Extract embedded ZIP to a temporary file
            string tempZipPath = Path.Combine(Path.GetTempPath(), "omega_pos_setup_" + Guid.NewGuid().ToString("N") + ".zip");
            using (Stream resourceStream = assembly.GetManifestResourceStream(zipResourceName))
            using (FileStream fileStream = new FileStream(tempZipPath, FileMode.Create, FileAccess.Write)) {
                resourceStream.CopyTo(fileStream);
            }

            // Extract to Desktop
            if (Directory.Exists(extractPath)) Directory.Delete(extractPath, true);
            ZipFile.ExtractToDirectory(tempZipPath, extractPath);

            // Delete temporary ZIP
            try { File.Delete(tempZipPath); } catch {}

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
            MessageBox.Show("\u062e\u0637\u0623:\n" + ex.Message, "OMEGA POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
'@

$exeOut = ".\public\omega-installer.exe"

# Configure C# compiler parameters with embedded ZIP file!
$params = New-Object System.CodeDom.Compiler.CompilerParameters
$params.GenerateExecutable = $true
$params.OutputAssembly = $exeOut
$params.CompilerOptions = "/target:winexe"
$params.ReferencedAssemblies.AddRange(@(
    "System.dll",
    "System.Windows.Forms.dll",
    "System.IO.Compression.dll",
    "System.IO.Compression.FileSystem.dll"
))

# Inject the 16MB zip file inside the EXE resources!
$params.EmbeddedResources.Add($ZipDest) | Out-Null

Add-Type -TypeDefinition $csharp -CompilerParameters $params

if (Test-Path $exeOut) {
    $exeSz = [math]::Round((Get-Item $exeOut).Length / 1MB, 2)
    Write-Host "SUCCESS: Unified Single EXE ready! ($exeSz MB)" -ForegroundColor Green
    Write-Host "   → $exeOut (Contains embedded ZIP data!)" -ForegroundColor Green
} else {
    Write-Error "EXE build failed!"
}
