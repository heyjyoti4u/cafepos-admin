'use client'

import { useState, useEffect } from 'react'
import { getDistanceInMeters } from '@/lib/geofence'
import { MapPinOff, Loader2 } from 'lucide-react'

// SURAT KI PRESENT LOCATION
const RESTAURANT_LAT = 21.1702; 
const RESTAURANT_LON = 72.8311; 
const MAX_ALLOWED_DISTANCE = 10000000; // Sirf 50 meters tak allow karega

export function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Aapka browser location support nahi karta.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Customer aur Restaurant ke beech ka distance meters mein nikalo
        const distance = getDistanceInMeters(
          latitude, 
          longitude, 
          RESTAURANT_LAT, 
          RESTAURANT_LON
        );

        if (distance <= MAX_ALLOWED_DISTANCE) {
          setIsAllowed(true); // 50m ke andar hai, andar aane do
        } else {
          setError(`Aap restaurant ke 50m radius se bahar hain. (Distance: ${Math.round(distance)}m)`);
        }
        setLoading(false);
      },
      (geoError) => {
        // Agar user ne "Allow Location" par click nahi kiya
        setError('Menu dekhne ke liye Location permission allow karna zaroori hai taaki hum table verify kar sakein.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-slate-600 font-medium">GPS Location verify kar rahe hain...</p>
      </div>
    )
  }

  if (error || !isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <MapPinOff className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-8 max-w-sm">
          {error || "Aap restaurant mein nahi hain. Kripya table par aakar QR dobara scan karein."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-sm"
        >
          Dobara Try Karein
        </button>
      </div>
    )
  }

  // Agar sab theek hai, tabhi aage ka page (children) dikhao
  return <>{children}</>
}