$ErrorActionPreference = "Stop"

$ZipSrc  = ".\INSTAL\omega-pos-installer.zip"
$ZipDest = ".\public\omega-pos-installer.zip"
Copy-Item $ZipSrc $ZipDest -Force

$csharp = @"
using System;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("OMEGA POS Installer")]
[assembly: AssemblyVersion("1.0.0.0")]

class OmegaInstaller {
    [STAThread]
    static void Main() {
        try {
            string exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string zipPath = Path.Combine(exeDir, "omega-pos-installer.zip");
            if (!File.Exists(zipPath)) {
                MessageBox.Show("File not found: omega-pos-installer.zip\nMake sure both files are in the same folder.", "OMEGA POS Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
            string dest = Path.Combine(desktop, "OMEGA-POS");
            DialogResult r = MessageBox.Show("Welcome to OMEGA POS Installer!\n\nFiles will be extracted to:\n" + dest + "\n\nContinue?", "OMEGA POS Installer", MessageBoxButtons.YesNo, MessageBoxIcon.Question);
            if (r != DialogResult.Yes) return;
            if (Directory.Exists(dest)) Directory.Delete(dest, true);
            ZipFile.ExtractToDirectory(zipPath, dest);
            string bat = Path.Combine(dest, "install.bat");
            if (File.Exists(bat)) {
                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe") { Arguments = "/c \"" + bat + "\"", WorkingDirectory = dest, Verb = "runas", UseShellExecute = true };
                Process.Start(psi);
            } else {
                Process.Start("explorer.exe", dest);
            }
        } catch (Exception ex) {
            MessageBox.Show("Error: " + ex.Message, "OMEGA POS", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
"@

$exeOut = ".\public\omega-installer.exe"
Add-Type -TypeDefinition $csharp -ReferencedAssemblies @("System.Windows.Forms","System.IO.Compression","System.IO.Compression.FileSystem") -OutputAssembly $exeOut -OutputType WindowsApplication
if (Test-Path $exeOut) {
    $kb = [math]::Round((Get-Item $exeOut).Length / 1KB, 0)
    Write-Host "SUCCESS: omega-installer.exe created ($kb KB)"
} else {
    Write-Host "FAILED"
}
