'use client';
import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit() {
  useEffect(() => {
    const runOneSignal = async () => {
      // Check for window to ensure it runs only on client
      if (typeof window !== 'undefined') {
        await OneSignal.init({
          appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "du45msxtee7redtf5b5acbmmz",
          allowLocalhostAsSecureOrigin: true,
        });
        
        // Push notification permission prompt
        OneSignal.Slidedown.promptPush(); 
      }
    };
    
    runOneSignal();
  }, []);

  return null;
}
