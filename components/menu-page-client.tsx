'use client'

import { useState, useEffect } from "react"
import { SearchBar } from "@/components/search-bar"
import { CategoryTabs } from "@/components/category-tabs"
import { MenuSection } from "@/components/menu-section"
import { CartFloatingButton } from "@/components/cart-floating-button"
import { supabase } from "@/lib/supabase" // Make sure this path matches your setup

export function MenuPageClient({ tableId }: { tableId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  
  // Naye states Supabase data ke liye
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>(["All"])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMenu = async () => {
      setLoading(true)
      
      // Supabase se sirf wo items fetch karo jo available hain
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        
      if (data) {
        setMenuItems(data)
        
        // Items me se unique categories nikal kar Tabs banane ke liye
        const uniqueCategories = Array.from(new Set(data.map(item => item.category)))
        setCategories(["All", ...uniqueCategories])
      }
      
      setLoading(false)
    }

    fetchMenu()
  }, [])

  // Search aur Category filter logic
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesCategory = activeCategory === "All" || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  // Display ke liye items ko unki category ke hisaab se group karna
  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, any[]>)

  if (loading) {
    return <div className="flex justify-center items-center h-[60vh]">Loading fresh menu...</div>
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-4 pb-2 px-4 space-y-4">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
        <CategoryTabs 
          categories={categories} 
          activeCategory={activeCategory} 
          onCategoryChange={setActiveCategory}
        />
      </div>

      <div className="px-4 mt-6 space-y-8">
        {(Object.entries(groupedItems) as [string, any[]][]).map(([category, items]) => (
          <MenuSection key={category} title={category} items={items} />
        ))}
        
        {filteredItems.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No items found matching your search.
          </div>
        )}
      </div>

      <CartFloatingButton tableId={tableId} />
    </div>
  )
}