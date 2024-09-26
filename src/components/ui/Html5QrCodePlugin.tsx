import { Html5QrcodeScanner } from 'html5-qrcode';
import { Html5QrcodeScannerConfig } from 'html5-qrcode/esm/html5-qrcode-scanner';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const qrcodeRegionId = "html5qr-code-full-region";

// Define the props interface
interface Html5QrcodePluginProps {
  fps?: number;
  qrbox?: number | { width: number; height: number };
  aspectRatio?: number;
  disableFlip?: boolean;
  verbose?: boolean;
  qrCodeSuccessCallback: (decodedText: string, decodedResult: any) => void;
  qrCodeErrorCallback?: (errorMessage: string, error: any) => void;
  scanning: boolean; // Add this new prop
}

// Creates the configuration object for Html5QrcodeScanner.
const createConfig = (props: Html5QrcodePluginProps): Html5QrcodeScannerConfig => {
  const config: Html5QrcodeScannerConfig = {
    fps: props.fps || 10,
    qrbox: props.qrbox || 250,
  };
  
  if (props.aspectRatio) {
    config.aspectRatio = props.aspectRatio;
  }
  if (props.disableFlip !== undefined) {
    config.disableFlip = props.disableFlip;
  }
  return config;
};

const Html5QrcodePlugin = (props: Html5QrcodePluginProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    // when component mounts
    const config = createConfig(props);
    const verbose = props.verbose === true;
    
    if (!props.qrCodeSuccessCallback) {
      throw new Error("qrCodeSuccessCallback is required callback.");
    }

    // Check if a scanner instance already exists
    if (props.scanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(qrcodeRegionId, config, verbose);
      scannerRef.current.render(props.qrCodeSuccessCallback, props.qrCodeErrorCallback);
    } else if (!props.scanning && scannerRef.current) {
      scannerRef.current.clear().catch(error => {
        console.error("Failed to clear html5QrcodeScanner. ", error);
        toast.error("Failed to stop QR code scanner. Please try again.");
      });
      scannerRef.current = null;
    }

    // cleanup function when component will unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
          toast.error("Failed to clean up QR code scanner. Please refresh the page.");
        });
        scannerRef.current = null;
      }
    };
  }, [props, props.scanning]); // Add props.scanning to the dependency array

  return (
    <div id={qrcodeRegionId} />
  );
};

export default Html5QrcodePlugin;