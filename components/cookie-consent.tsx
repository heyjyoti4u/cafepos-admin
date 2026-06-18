'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Cookie, X } from 'lucide-react'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check karo ki kya user ne pehle se accept kiya hua hai
    const hasConsented = localStorage.getItem('ff-cookie-consent')
    
    // Agar accept nahi kiya hai, toh thodi der (1 second) baad popup dikhao
    if (!hasConsented) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('ff-cookie-consent', 'true')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-10">
      <div className="max-w-4xl mx-auto bg-slate-900 text-slate-200 p-4 md:p-6 rounded-2xl shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        
        <div className="flex items-start md:items-center gap-4">
          <div className="bg-slate-800 p-2 md:p-3 rounded-full shrink-0">
            <Cookie className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">We value your privacy</h3>
            <p className="text-sm text-slate-400">
              Hum aapke orders aur cart ko track karne ke liye cookies ka use karte hain taaki aapko seamless experience mile. 
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
          <Button 
            variant="outline" 
            className="w-full md:w-auto border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            onClick={() => setIsVisible(false)}
          >
            Decline
          </Button>
          <Button 
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            onClick={handleAccept}
          >
            Accept Cookies
          </Button>
        </div>
        
      </div>
    </div>
  )
}