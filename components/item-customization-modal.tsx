"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MenuItem, AddOn } from "@/lib/cart-context";

interface ItemCustomizationModalProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (item: MenuItem, quantity: number, addOns: AddOn[], cookingPreference?: string) => void;
}

const COOKING_PREFS = [
  { key: "regular",   label: "Regular",    desc: "Standard preparation",    emoji: "🍽️" },
  { key: "spicy",     label: "Spicy",      desc: "Extra spice added",       emoji: "🌶️" },
  { key: "less_spicy",label: "Less Spicy", desc: "Mild, less heat",         emoji: "🧊" },
  { key: "jain",      label: "Jain",       desc: "No onion, no garlic",     emoji: "🌿" },
];

export function ItemCustomizationModal({ item, onClose, onAddToCart }: ItemCustomizationModalProps) {
  const [quantity, setQuantity]       = useState(1);
  const [selectedAddon, setSelectedAddon] = useState<AddOn | null>(null);
  const [cookingPref, setCookingPref] = useState("regular");

  const isVeg        = (item as any).is_veg !== false;
  const description  = (item as any).description as string | undefined;
  const imageUrl     = (item as any).image_url  as string | undefined;
  const rawAddons    = ((item as any).add_ons   as AddOn[] | undefined) ?? [];

  const addonPrice = selectedAddon?.price ?? 0;
  const livePrice  = (item.price + addonPrice) * quantity;
  const activePref = COOKING_PREFS.find(p => p.key === cookingPref)!;

  const handleAdd = () => {
    onAddToCart(
      item,
      quantity,
      selectedAddon ? [selectedAddon] : [],
      cookingPref !== "regular" ? activePref.label : undefined,
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-9999 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl flex flex-col shadow-2xl"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-2 pb-3 shrink-0">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-1">
              <div
                className={`w-4 h-4 rounded-sm border-2 flex items-center justify-center shrink-0 ${
                  isVeg ? "border-green-600" : "border-red-600"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isVeg ? "bg-green-600" : "bg-red-600"}`} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{item.name}</h2>
            </div>
            <p className="text-base font-bold text-slate-600">₹{item.price}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 text-slate-500 transition-colors shrink-0 mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 min-h-0">

          {/* Item image */}
          {imageUrl && (
            <div className="px-5 pb-4">
              <img
                src={imageUrl}
                alt={item.name}
                className="w-full h-44 object-cover rounded-2xl"
              />
            </div>
          )}

          {/* Description */}
          {description && (
            <div className="mx-5 mb-5 p-4 bg-amber-50 rounded-2xl border border-amber-100">
              <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
            </div>
          )}

          {/* Cooking Preference */}
          <div className="px-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800">Cooking Preference</h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                Required
              </span>
            </div>
            <div className="space-y-2">
              {COOKING_PREFS.map((pref) => {
                const active = cookingPref === pref.key;
                return (
                  <label
                    key={pref.key}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        active ? "border-orange-500" : "border-slate-300"
                      }`}
                    >
                      {active && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                    </div>
                    <span className="text-lg leading-none">{pref.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{pref.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
                    </div>
                    <input
                      type="radio"
                      name="cooking_pref"
                      className="sr-only"
                      checked={active}
                      onChange={() => setCookingPref(pref.key)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Add Extras */}
          <div className="px-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-800">Add Extras</h3>
              <span className="text-xs bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                Optional
              </span>
            </div>
            <div className="space-y-2">
              {/* No Add-on */}
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedAddon === null
                    ? "border-orange-500 bg-orange-50"
                    : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedAddon === null ? "border-orange-500" : "border-slate-300"
                  }`}
                >
                  {selectedAddon === null && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                </div>
                <span className="flex-1 text-sm font-semibold text-slate-800">No Add-on</span>
                <span className="text-sm text-slate-400 font-medium">₹0</span>
                <input
                  type="radio"
                  name="addon"
                  className="sr-only"
                  checked={selectedAddon === null}
                  onChange={() => setSelectedAddon(null)}
                />
              </label>

              {rawAddons.map((addon, i) => {
                const active = selectedAddon?.name === addon.name;
                return (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      active
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        active ? "border-orange-500" : "border-slate-300"
                      }`}
                    >
                      {active && <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />}
                    </div>
                    <span className="flex-1 text-sm font-semibold text-slate-800">{addon.name}</span>
                    <span className="text-sm text-emerald-600 font-semibold">+ ₹{addon.price}</span>
                    <input
                      type="radio"
                      name="addon"
                      className="sr-only"
                      checked={active}
                      onChange={() => setSelectedAddon(addon)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Sticky footer ── */}
        <div className="px-5 py-4 bg-white border-t border-slate-100 shrink-0">
          {/* Quantity row */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-base font-bold text-slate-800">Quantity</span>
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-orange-600 font-bold text-xl hover:bg-orange-50 shadow-sm transition-colors"
              >
                −
              </button>
              <span className="font-bold w-5 text-center text-slate-800 text-base select-none">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-9 h-9 flex items-center justify-center bg-white rounded-lg text-orange-600 font-bold text-xl hover:bg-orange-50 shadow-sm transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            onClick={handleAdd}
            className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-800 h-14 rounded-2xl text-white flex items-center justify-between px-5 shadow-lg shadow-orange-600/25 transition-colors"
          >
            <span className="text-left">
              <span className="block text-xs font-medium text-orange-200 mb-0.5">
                {activePref.emoji} {activePref.label}
                {selectedAddon ? ` · ${selectedAddon.name}` : ""}
              </span>
              <span className="block text-base font-bold">
                Add to Cart • {quantity > 1 ? `${quantity}× ` : ""}₹{livePrice}
              </span>
            </span>
            <span className="text-2xl font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
