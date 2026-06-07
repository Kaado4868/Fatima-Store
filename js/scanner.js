let scanner = null;
let currentMode = 'search';

export function openScanner(mode, onScanSuccess) {
    currentMode = mode;
    document.getElementById('scanner-overlay').classList.remove('hidden');
    
    scanner = new Html5Qrcode("reader");
    let isProcessing = false;
    
    scanner.start(
        { facingMode: "environment" }, 
        { fps: 20, qrbox: { width: 250, height: 250 } }, 
        (decodedText) => { 
            if (isProcessing) return; 
            isProcessing = true;
            onScanSuccess(decodedText, currentMode);
            closeScanner(); 
        }, 
        (err) => {} // ignore stream errors
    ).catch(console.error);
}

export function closeScanner() {
    if (scanner) {
        scanner.stop().then(() => {
            scanner.clear();
            document.getElementById('scanner-overlay').classList.add('hidden');
            scanner = null;
        });
    }
}
