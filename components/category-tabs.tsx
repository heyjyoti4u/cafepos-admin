"use client";

import { useRef, useEffect, useState } from "react";
import { MenuCategory } from "@/lib/menu-data";
import { cn } from "@/lib/utils";

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string) => void;
}

export function CategoryTabs({
  categories,
  activeCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setShowLeftShadow(scrollLeft > 0);
        setShowRightShadow(scrollLeft < scrollWidth - clientWidth - 10);
      }
    };

    const ref = scrollRef.current;
    ref?.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => ref?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToCategory = (categoryId: string) => {
    const element = document.getElementById(`tab-${categoryId}`);
    element?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="relative bg-card sticky top-0 z-20 border-b border-border">
      {showLeftShadow && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
      )}
      {showRightShadow && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      )}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-3 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((category) => (
          <button
            key={category}
            id={`tab-${category}`}
            onClick={() => {
              onCategoryChange(category); // ✅ category.id hata kar sirf category kiya
              scrollToCategory(category); // ✅ yahan bhi sirf category
            }}
            className={cn(
              // Icon hatane ke baad flex-col ki jagah flex rakha hai taaki text center mein rahe
              "flex items-center justify-center px-4 py-2 rounded-xl min-w-[72px] transition-all",
              activeCategory === category // ✅ category.id hata kar sirf category kiya
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {/* ✅ Icon wala span hata diya kyunki database se abhi icon nahi aa raha */}
            <span className="text-sm font-medium whitespace-nowrap">
              {category}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
