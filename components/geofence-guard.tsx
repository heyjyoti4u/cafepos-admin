'use client'

import { useState, useEffect } from 'react'
import { getDistanceInMeters } from '@/lib/geofence'
import { MapPinOff, Loader2 } from 'lucide-react'

// SURAT CURRENT LOCATION
const RESTAURANT_LAT = 21.1702; 
const RESTAURANT_LON = 72.8311; 
const MAX_ALLOWED_DISTANCE = 10000000; // Only allows within 50 meters

export function GeofenceGuard({ children }: { children: React.ReactNode }) {
  const [isAllowed, setIsAllowed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Calculate the distance in meters between the customer and the restaurant
        const distance = getDistanceInMeters(
          latitude, 
          longitude, 
          RESTAURANT_LAT, 
          RESTAURANT_LON
        );

        if (distance <= MAX_ALLOWED_DISTANCE) {
          setIsAllowed(true); // Within 50m, let them in
        } else {
          setError(`You are outside the restaurant's 50m radius. (Distance: ${Math.round(distance)}m)`);
        }
        setLoading(false);
      },
      (geoError) => {
        // If the user didn't click "Allow Location"
        setError('Location permission is required to view the menu so we can verify your table.')
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
        <p className="text-slate-600 font-medium">Verifying GPS location...</p>
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
          {error || "You are not at the restaurant. Please come to the table and scan the QR code again."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-orange-600 text-white font-bold rounded-xl shadow-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  // If everything's fine, show the page (children)
  return <>{children}</>
}