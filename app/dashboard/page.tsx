'use client'

import React from 'react'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, ShoppingBag, Clock,
  CheckCircle, ChefHat, LogOut,
  Receipt, History, CalendarDays, ArrowUpRight,
  Bell, XCircle, Utensils, Search, Pencil, Trash2, Plus, X, Menu, Armchair, Users, Package, Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts'

// Preparation badge styles
const PREP_BADGE: Record<string, { label: string; emoji: string; cls: string }> = {
  Regular: { label: 'Regular', emoji: '🍽️', cls: 'bg-slate-700 text-slate-300 border-slate-600' },
  Spicy:   { label: 'Spicy',   emoji: '🌶️', cls: 'bg-red-900/40 text-red-300 border-red-700/50' },
  Jain:    { label: 'Jain',    emoji: '🌿', cls: 'bg-green-900/40 text-green-300 border-green-700/50' },
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab]             = useState('dashboard')
  const [sidebarOpen, setSidebarOpen]         = useState(true)
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [orders, setOrders]                   = useState<any[]>([])
  const [loading, setLoading]                 = useState(true)
  const [newOrderId, setNewOrderId]           = useState<string | null>(null)
  const [newOrderPopup, setNewOrderPopup]     = useState<{ id: string; table: string; customer: string; total: number; items: string } | null>(null)
  const popupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [authChecked, setAuthChecked]         = useState(false)
  const [hiddenDeclined, setHiddenDeclined]   = useState<Set<string>>(new Set())
  const declineTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const audioRef      = useRef<HTMLAudioElement | null>(null)
  // PWA install prompt — captured from browser's beforeinstallprompt event
  const [installPrompt, setInstallPrompt]     = useState<any>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const router        = useRouter()

  // ── Menu Control State ────────────────────────────────────────────────────
  const [menuItems, setMenuItems]       = useState<any[]>([])
  const [menuLoading, setMenuLoading]   = useState(false)
  const [menuSearch, setMenuSearch]     = useState('')
  const [togglingId, setTogglingId]     = useState<string | null>(null)

  // ── Order Edit State ──────────────────────────────────────────────────────
  const [editingOrder, setEditingOrder]         = useState<any | null>(null)
  const [editMenuSearch, setEditMenuSearch]     = useState('')
  const [editSaving, setEditSaving]             = useState(false)
  const [configuringItem, setConfiguringItem]   = useState<any | null>(null) // item being configured for add
  const [addOnChoice, setAddOnChoice]           = useState<any | null>(null)  // selected addon for new item
  const [addQty, setAddQty]                     = useState(1)
  const [editingAddonFor, setEditingAddonFor]     = useState<string | null>(null)
  const [addonEditChoice, setAddonEditChoice]     = useState<any | null>(null)
  const [subEditItemId, setSubEditItemId]         = useState<string | null>(null)
  const [subEditAddons, setSubEditAddons]         = useState<any[]>([])
  const [subEditLoading, setSubEditLoading]       = useState(false)
  const [subEditBasePrice, setSubEditBasePrice]   = useState<number>(0)
  const [configuratorAddons, setConfiguratorAddons] = useState<any[]>([])
  const [configuratorLoading, setConfiguratorLoading] = useState(false)
  const [historyDate, setHistoryDate]         = useState<string>(new Date().toISOString().split('T')[0])
  const [historyFilter, setHistoryFilter]     = useState<'daily'|'weekly'|'monthly'|'yearly'|'all'>('daily')
  const [historyMonth, setHistoryMonth]       = useState<string>(new Date().toISOString().slice(0, 7))
  const [historyYear, setHistoryYear]         = useState<number>(new Date().getFullYear())
  const [historyItemSearch, setHistoryItemSearch] = useState<string>('')
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // ── Chart state ───────────────────────────────────────────────────────────
  const [chartPeriod, setChartPeriod] = useState<'daily'|'weekly'|'monthly'|'yearly'|'all'>('weekly')
  const [chartDate, setChartDate]     = useState<string>(new Date().toISOString().split('T')[0])
  const [chartMonth, setChartMonth]   = useState<string>(new Date().toISOString().slice(0, 7))
  const [chartYear, setChartYear]     = useState<number>(new Date().getFullYear())

  // ── Auth Guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  // ── PWA Install Prompt ────────────────────────────────────────────────────
  // Chrome fires 'beforeinstallprompt' when the app is installable.
  // We intercept it, prevent the default mini-infobar, and show our own
  // install button instead — this gives us full control over timing and
  // allows re-triggering it even if the user dismissed Chrome's banner.
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()          // stop Chrome's default mini-infobar
      setInstallPrompt(e)         // save the event for later
      setShowInstallBanner(true)  // show our custom install button
    }
    window.addEventListener('beforeinstallprompt', handler)

    // If app is already installed, hide the button
    window.addEventListener('appinstalled', () => {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstallClick = async () => {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') {
      setInstallPrompt(null)
      setShowInstallBanner(false)
    }
  }

  // ── Sync dinning_tables.status from orders ───────────────────────────────
  const syncTableStatuses = async (currentOrders: any[]) => {
    try {
      const activeTableNums = new Set(
        currentOrders
          .filter(o => o.status !== 'declined' && !(o.status === 'delivered' && o.payment_status === 'paid'))
          .map(o => String(o.table_number))
      )
      const { data: tables, error } = await supabase.from('dinning_tables').select('id, table_number, status')
      if (error || !tables) return
      await Promise.all(
        tables
          .filter(t => {
            const shouldBe = activeTableNums.has(String(t.table_number)) ? 'unavailable' : 'available'
            return t.status !== shouldBe
          })
          .map(t => {
            const newStatus = activeTableNums.has(String(t.table_number)) ? 'unavailable' : 'available'
            return supabase.from('dinning_tables').update({ status: newStatus }).eq('id', t.id)
          })
      )
    } catch (e) {
      // dinning_tables table not set up — silently skip
    }
  }

  // ── Fetch Orders ──────────────────────────────────────────────────────────
  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`*, order_items (*)`)
      .order('created_at', { ascending: false })
    if (error) { console.error('❌ Fetch error:', error); setLoading(false); return }
    if (data) {
      setOrders(data)
      // Wrap in try-catch — dinning_tables table may not exist in all deployments
      try { syncTableStatuses(data) } catch (e) { /* table not set up yet, skip */ }
    }
    setLoading(false)
  }

  // ── Fetch Menu Items ──────────────────────────────────────────────────────
  const fetchMenuItems = async () => {
    setMenuLoading(true)
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category')
      .order('name')
    if (error) { console.error('fetchMenuItems error:', error); setMenuLoading(false); return }
    if (data) setMenuItems(data)
    setMenuLoading(false)
  }

  const toggleMenuItem = async (id: string, newValue: boolean) => {
    setTogglingId(id)
    setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: newValue } : i))
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: newValue })
      .eq('id', id)
    if (error) {
      console.error('❌ Toggle error:', error)
      setMenuItems(prev => prev.map(i => i.id === id ? { ...i, is_available: !newValue } : i))
    }
    setTogglingId(null)
  }

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    // Cache-bust: this app is a PWA (next-pwa) with aggressive asset caching.
    // The service worker caches /ding.mp3 by URL — if you replace the file
    // with a new tune but keep the same filename, the SW keeps serving the
    // OLD cached version forever. Appending ?v=... forces it to be treated
    // as a new resource. Bump this value any time you swap the audio file.
    audioRef.current = new Audio('/ding.mp3?v=2')
    audioRef.current.loop = true   // keep ringing until accepted/declined
    audioRef.current.volume = 1.0
    // Preload so the very first play() call doesn't have to wait on a network fetch
    audioRef.current.load()

    fetchOrders()

    const channel = supabase
      .channel('admin-live-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const o = payload.new as any
        setNewOrderId(o.id)
        setTimeout(() => setNewOrderId(null), 5000)
        setTimeout(() => fetchOrders(), 800)

        // Fetch order items for popup
        const { data: items } = await supabase.from('order_items').select('item_name, quantity').eq('order_id', o.id)
        const itemSummary = items?.slice(0, 2).map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ') + (items && items.length > 2 ? ` +${items.length - 2} more` : '') || ''
        if (popupTimerRef.current) clearTimeout(popupTimerRef.current)
        setNewOrderPopup({ id: o.id, table: o.table_number, customer: o.customer_name, total: o.total_amount, items: itemSummary })
        popupTimerRef.current = setTimeout(() => setNewOrderPopup(null), 6000)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_items' }, () => setTimeout(() => fetchOrders(), 300))
      .subscribe((status) => console.log('Realtime:', status))

    return () => {
      supabase.removeChannel(channel)
      Object.values(declineTimers.current).forEach(clearTimeout)
      audioRef.current?.pause()
    }
  }, [])

  // Fetch menu items when tab opens
  useEffect(() => {
    if (activeTab === 'menu_control' && menuItems.length === 0) fetchMenuItems()
  }, [activeTab])

  // ── Auto-delete declined orders from DB after 15s ────────────────────────
  useEffect(() => {
    orders.filter(o => o.status === 'declined').forEach(o => {
      if (!declineTimers.current[o.id] && !hiddenDeclined.has(o.id)) {
        declineTimers.current[o.id] = setTimeout(async () => {
          await supabase.from('order_items').delete().eq('order_id', o.id)
          await supabase.from('orders').delete().eq('id', o.id)
          setOrders(prev => prev.filter(x => x.id !== o.id))
          setHiddenDeclined(prev => new Set([...prev, o.id]))
          delete declineTimers.current[o.id]
        }, 15000)
      }
    })
  }, [orders, hiddenDeclined])

  // ── Status Update ─────────────────────────────────────────────────────────
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (error) { console.error('❌ Update error:', error); fetchOrders() }
  }

  const markAsPaid = async (orderId: string) => {
    setUpdatingPayment(orderId)
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId)
    if (!error) fetchOrders()
    else console.error('❌ Payment update error:', error)
    setUpdatingPayment(null)
  }

  // ── Order Edit Functions ──────────────────────────────────────────────────
  const openEdit = (order: any) => {
    fetchMenuItems()
    setEditMenuSearch('')
    setSubEditItemId(null)
    setEditingOrder(JSON.parse(JSON.stringify(order))) // deep copy
  }

  const openItemSubEdit = async (orderItem: any) => {
    if (subEditItemId === orderItem.id) { setSubEditItemId(null); return }
    setSubEditItemId(orderItem.id)
    setSubEditLoading(true)
    setSubEditAddons([])

    // Strategy 1: already loaded menuItems state — try by id then by name
    let found = menuItems.find((m: any) => m.id === orderItem.item_id)
      ?? menuItems.find((m: any) => m.name?.trim().toLowerCase() === orderItem.item_name?.trim().toLowerCase())
    if (found) {
      setSubEditAddons(parseAddons(found.add_ons))
      setSubEditBasePrice(found.price ?? orderItem.item_price)
      setSubEditLoading(false)
      return
    }

    // Strategy 2: fresh Supabase fetch by id
    if (orderItem.item_id) {
      const { data } = await supabase.from('menu_items').select('add_ons, price').eq('id', orderItem.item_id).maybeSingle()
      if (data) {
        setSubEditAddons(parseAddons(data.add_ons))
        setSubEditBasePrice(data.price ?? orderItem.item_price)
        setSubEditLoading(false)
        return
      }
    }

    // Strategy 3: fresh Supabase fetch by name
    if (orderItem.item_name) {
      const { data } = await supabase.from('menu_items').select('add_ons, price').ilike('name', `%${orderItem.item_name.trim()}%`).limit(1)
      if (data && data.length > 0) {
        setSubEditAddons(parseAddons(data[0].add_ons))
        setSubEditBasePrice(data[0].price ?? orderItem.item_price)
        setSubEditLoading(false)
        return
      }
    }

    // Nothing found — base price fallback (strip current addon price)
    setSubEditBasePrice(orderItem.item_price - (orderItem.add_ons?.[0]?.price ?? 0))
    setSubEditLoading(false)
  }

  const removeItemFromOrder = async (orderItemId: string) => {
    if (!editingOrder) return
    const item = editingOrder.order_items.find((i: any) => i.id === orderItemId)
    if (!item) return
    setEditSaving(true)
    const { error } = await supabase.from('order_items').delete().eq('id', orderItemId)
    if (!error) {
      const newTotal = editingOrder.total_amount - item.item_price * item.quantity
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', editingOrder.id)
      const updated = {
        ...editingOrder,
        total_amount: newTotal,
        order_items: editingOrder.order_items.filter((i: any) => i.id !== orderItemId),
      }
      setEditingOrder(updated)
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    }
    setEditSaving(false)
  }

  const parseAddons = (raw: any): any[] => {
    if (!raw) return []
    if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
    return Array.isArray(raw) ? raw : []
  }

  const openConfigurator = async (menuItem: any) => {
    if (configuringItem?.id === menuItem.id) { setConfiguringItem(null); setConfiguratorAddons([]); return }
    setConfiguringItem(menuItem)
    setAddOnChoice(null)
    setAddQty(1)
    setConfiguratorAddons([])
    setConfiguratorLoading(true)
    // Fetch fresh add-ons for this item directly from Supabase
    const { data } = await supabase.from('menu_items').select('*').eq('id', menuItem.id).maybeSingle()
    if (data) { setConfiguratorAddons(parseAddons(data.add_ons)); setConfiguratorLoading(false); return }
    // Fallback by name
    const { data: d2 } = await supabase.from('menu_items').select('*').ilike('name', `%${menuItem.name.trim()}%`).limit(1)
    if (d2 && d2.length > 0) setConfiguratorAddons(parseAddons(d2[0].add_ons))
    setConfiguratorLoading(false)
  }

  const addItemToOrder = async () => {
    if (!editingOrder || !configuringItem) return
    setEditSaving(true)
    const addonPrice  = addOnChoice?.price ?? 0
    const unitPrice   = configuringItem.price + addonPrice
    const addOns      = addOnChoice ? [addOnChoice] : []
    const { data, error } = await supabase.from('order_items').insert({
      order_id:     editingOrder.id,
      item_id:      configuringItem.id,
      item_name:    configuringItem.name,
      item_price:   unitPrice,
      quantity:     addQty,
      add_ons:      addOns,
      instructions: '',
    }).select().single()
    if (!error && data) {
      const newTotal = editingOrder.total_amount + unitPrice * addQty
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', editingOrder.id)
      const updated = {
        ...editingOrder,
        total_amount: newTotal,
        order_items: [...editingOrder.order_items, data],
      }
      setEditingOrder(updated)
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    }
    setConfiguringItem(null)
    setEditSaving(false)
  }

  const updateItemAddon = async (orderItem: any, newAddon: any) => {
    if (!editingOrder) return
    setEditSaving(true)
    const basePrice = subEditBasePrice || (orderItem.item_price - (orderItem.add_ons?.[0]?.price ?? 0))
    const newPrice  = basePrice + (newAddon?.price ?? 0)
    const priceDiff = (newPrice - orderItem.item_price) * orderItem.quantity
    const { error } = await supabase
      .from('order_items')
      .update({ add_ons: newAddon ? [newAddon] : [], item_price: newPrice })
      .eq('id', orderItem.id)
    if (!error) {
      const newTotal = editingOrder.total_amount + priceDiff
      await supabase.from('orders').update({ total_amount: newTotal }).eq('id', editingOrder.id)
      const updated = {
        ...editingOrder,
        total_amount: newTotal,
        order_items: editingOrder.order_items.map((i: any) =>
          i.id === orderItem.id ? { ...i, add_ons: newAddon ? [newAddon] : [], item_price: newPrice } : i
        ),
      }
      setEditingOrder(updated)
      setOrders(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o))
    }
    setSubEditItemId(null)
    setEditSaving(false)
  }

  // ── Derived Lists ─────────────────────────────────────────────────────────
  const newRequests     = orders.filter(o => o.status === 'new')
  const visibleDeclined = orders.filter(o => o.status === 'declined' && !hiddenDeclined.has(o.id))
  const pendingOrders   = orders.filter(o => o.status === 'pending')
  const preparingOrders = orders.filter(o => o.status === 'preparing')
  const deliveredOrders = orders.filter(o => o.status === 'delivered')
  const kitchenActive   = orders.filter(o => ['pending', 'preparing'].includes(o.status))
  const unpaidOrders    = orders.filter(o => o.status === 'delivered' && o.payment_status !== 'paid')

  // ── Ringtone: keep ringing on loop while ANY order is waiting in
  // "New Requests" (not yet accepted or declined). Stops automatically
  // the moment the last pending request is accepted/declined.
  //
  // IMPORTANT: browsers block audio.play() until the user interacts with
  // the page. If play() fails (e.g. dashboard just loaded and there's
  // already a pending order), we retry on the NEXT click/keypress —
  // not just the very first one — so the ringtone never gets "stuck"
  // silently failed.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (newRequests.length === 0) {
      audio.pause()
      audio.currentTime = 0
      return
    }

    let cancelled = false

    const tryPlay = () => {
      if (cancelled) return
      audio.currentTime = 0
      audio.play().catch(() => {
        // Autoplay blocked — wait for ANY user interaction, then retry once.
        const retry = () => {
          if (cancelled) return
          audio.play().catch(() => {})
          window.removeEventListener('click', retry)
          window.removeEventListener('keydown', retry)
          window.removeEventListener('touchstart', retry)
        }
        window.addEventListener('click', retry)
        window.addEventListener('keydown', retry)
        window.addEventListener('touchstart', retry)
      })
    }

    tryPlay()

    return () => { cancelled = true }
  }, [newRequests.length])

  // ── Merge unpaid orders by table_number into single bill groups ───────────
  // Same table, multiple unpaid delivered orders (customer ordered twice
  // before paying) → shown as ONE card, combined total, combined items,
  // combined customer names (e.g. "Jyoti & Vishal").
  const unpaidBillGroups = (() => {
    const map = new Map<string, {
      tableNumber: string
      orderIds: string[]
      customerNames: string[]
      items: any[]
      totalAmount: number
      earliestCreatedAt: string
    }>()

    for (const o of unpaidOrders) {
      const key = String(o.table_number)
      if (!map.has(key)) {
        map.set(key, {
          tableNumber: key,
          orderIds: [],
          customerNames: [],
          items: [],
          totalAmount: 0,
          earliestCreatedAt: o.created_at,
        })
      }
      const group = map.get(key)!
      group.orderIds.push(o.id)
      if (o.customer_name && !group.customerNames.includes(o.customer_name)) {
        group.customerNames.push(o.customer_name)
      }
      group.items.push(...(o.order_items || []))
      group.totalAmount += o.total_amount || 0
      if (new Date(o.created_at) < new Date(group.earliestCreatedAt)) {
        group.earliestCreatedAt = o.created_at
      }
    }
    return Array.from(map.values())
  })()

  // Mark ALL orders in a merged bill group as paid in one go
  const markGroupAsPaid = async (orderIds: string[]) => {
    setUpdatingPayment(orderIds[0])
    const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).in('id', orderIds)
    if (!error) fetchOrders()
    else console.error('❌ Group payment update error:', error)
    setUpdatingPayment(null)
  }

  const today     = new Date().toDateString()
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()
  const todaysDelivered     = deliveredOrders.filter(o => new Date(o.created_at).toDateString() === today)
  const todaysRevenue       = todaysDelivered.reduce((s, o) => s + (o.total_amount || 0), 0)
  // ── History filter derived ────────────────────────────────────────────────
  const getWeekBounds = (dateStr: string) => {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diffToMon = (day === 0 ? -6 : 1 - day)
    const mon = new Date(d); mon.setDate(d.getDate() + diffToMon); mon.setHours(0,0,0,0)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999)
    return { mon, sun }
  }
  const { mon: weekStart, sun: weekEnd } = getWeekBounds(historyDate)

  const filteredHistoryOrders = deliveredOrders.filter(o => {
    const d = new Date(o.created_at)
    let dateMatch = true
    if (historyFilter === 'daily')   dateMatch = d.toISOString().split('T')[0] === historyDate
    if (historyFilter === 'weekly')  dateMatch = d >= weekStart && d <= weekEnd
    if (historyFilter === 'monthly') dateMatch = d.toISOString().slice(0, 7) === historyMonth
    if (historyFilter === 'yearly')  dateMatch = d.getFullYear() === historyYear
    if (!dateMatch) return false
    if (historyItemSearch.trim()) {
      const q = historyItemSearch.toLowerCase()
      return o.order_items?.some((i: any) => i.item_name?.toLowerCase().includes(q)) ||
             o.customer_name?.toLowerCase().includes(q)
    }
    return true
  })
  const filteredHistoryRevenue = filteredHistoryOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)

  const selectedDayDelivered = deliveredOrders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === historyDate)
  const selectedDayRevenue   = selectedDayDelivered.reduce((s, o) => s + (o.total_amount || 0), 0)

  // ── Chart data ────────────────────────────────────────────────────────────
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const chartData: { label: string; revenue: number; orders: number }[] = (() => {
    if (chartPeriod === 'daily') {
      return Array.from({ length: 24 }, (_, h) => {
        const matched = deliveredOrders.filter(o => {
          const d = new Date(o.created_at)
          return d.toISOString().split('T')[0] === chartDate && d.getHours() === h
        })
        return { label: `${String(h).padStart(2,'0')}:00`, revenue: matched.reduce((s:number,o:any)=>s+(o.total_amount||0),0), orders: matched.length }
      })
    }
    if (chartPeriod === 'weekly') {
      const { mon } = getWeekBounds(chartDate)
      return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(mon); day.setDate(mon.getDate() + i)
        const dayStr = day.toISOString().split('T')[0]
        const matched = deliveredOrders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === dayStr)
        return { label: day.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }), revenue: matched.reduce((s:number,o:any)=>s+(o.total_amount||0),0), orders: matched.length }
      })
    }
    if (chartPeriod === 'monthly') {
      const [yr, mo] = chartMonth.split('-').map(Number)
      const daysInMonth = new Date(yr, mo, 0).getDate()
      return Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        const dayStr = `${yr}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`
        const matched = deliveredOrders.filter(o => new Date(o.created_at).toISOString().split('T')[0] === dayStr)
        return { label: `${d}`, revenue: matched.reduce((s:number,o:any)=>s+(o.total_amount||0),0), orders: matched.length }
      })
    }
    if (chartPeriod === 'yearly') {
      return MONTHS_SHORT.map((label, m) => {
        const matched = deliveredOrders.filter(o => {
          const d = new Date(o.created_at)
          return d.getFullYear() === chartYear && d.getMonth() === m
        })
        return { label, revenue: matched.reduce((s:number,o:any)=>s+(o.total_amount||0),0), orders: matched.length }
      })
    }
    // all — group by month from earliest to now
    if (deliveredOrders.length === 0) return []
    const earliest = deliveredOrders.reduce((min: Date, o: any) => {
      const d = new Date(o.created_at); return d < min ? d : min
    }, new Date())
    const result: { label: string; revenue: number; orders: number }[] = []
    const cur = new Date(earliest.getFullYear(), earliest.getMonth(), 1)
    const now = new Date()
    while (cur <= now) {
      const yr = cur.getFullYear(), mo = cur.getMonth()
      const matched = deliveredOrders.filter((o:any) => {
        const d = new Date(o.created_at)
        return d.getFullYear() === yr && d.getMonth() === mo
      })
      result.push({ label: `${MONTHS_SHORT[mo]} ${yr}`, revenue: matched.reduce((s:number,o:any)=>s+(o.total_amount||0),0), orders: matched.length })
      cur.setMonth(cur.getMonth() + 1)
    }
    return result
  })()

  // ── Pie chart data ────────────────────────────────────────────────────────
  const PIE_COLORS = ['#f97316','#fb923c','#fdba74','#fcd34d','#86efac','#67e8f9','#818cf8','#f472b6','#a78bfa','#34d399']

  const categoryPieData = (() => {
    const map: Record<string, number> = {}
    deliveredOrders.forEach((o: any) => {
      o.order_items?.forEach((i: any) => {
        const cat = i.category || 'Other'
        map[cat] = (map[cat] || 0) + (i.item_price * i.quantity)
      })
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  })()

  const itemRevenuePieData = (() => {
    const map: Record<string, number> = {}
    deliveredOrders.forEach((o: any) => {
      o.order_items?.forEach((i: any) => {
        map[i.item_name] = (map[i.item_name] || 0) + (i.item_price * i.quantity)
      })
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  })()

  const thisMonthsDelivered = deliveredOrders.filter(o => { const d = new Date(o.created_at); return d.getMonth() === thisMonth && d.getFullYear() === thisYear })
  const thisMonthsRevenue   = thisMonthsDelivered.reduce((s, o) => s + (o.total_amount || 0), 0)
  const totalRevenue        = deliveredOrders.reduce((s, o) => s + (o.total_amount || 0), 0)
  const { mon: thisWeekMon, sun: thisWeekSun } = getWeekBounds(new Date().toISOString().split('T')[0])
  const thisWeeksDelivered  = deliveredOrders.filter(o => { const d = new Date(o.created_at); return d >= thisWeekMon && d <= thisWeekSun })
  const thisWeeksRevenue    = thisWeeksDelivered.reduce((s, o) => s + (o.total_amount || 0), 0)

  const formatDT = (ds: string) =>
    new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(ds))

  // ── Menu Control Derived ──────────────────────────────────────────────────
  const filteredMenu = menuItems.filter(i =>
    i.name.toLowerCase().includes(menuSearch.toLowerCase()) ||
    i.category?.toLowerCase().includes(menuSearch.toLowerCase())
  )
  const groupedMenu = filteredMenu.reduce((acc, item) => {
    const cat = item.category || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {} as Record<string, any[]>)
  const unavailableCount = menuItems.filter(i => !i.is_available).length

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Order Items component ─────────────────────────────────────────────────
  const OrderItems = ({ order }: { order: any }) => (
    <div className="p-5 flex-1">
      <div className="space-y-3">
        {order.order_items?.map((item: any, idx: number) => {
          const prep     = item.preparation || 'Regular'
          const prepInfo = PREP_BADGE[prep] ?? PREP_BADGE.Regular
          return (
            <div key={idx} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-start text-sm">
                <span className="flex items-center gap-2 text-slate-200 font-medium">
                  <span className="bg-slate-800 text-orange-400 px-2 py-0.5 rounded text-xs">{item.quantity}x</span>
                  {item.item_name || 'Item'}
                </span>
                <span className="text-slate-400 font-medium text-sm">₹{item.item_price * item.quantity}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5 ml-8">
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${prepInfo.cls}`}>
                  {prepInfo.emoji} {prepInfo.label}
                </span>
                {item.add_ons?.length > 0 && item.add_ons.map((a: any, ai: number) => (
                  <span key={ai} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-orange-900/30 text-orange-300 border-orange-700/50">
                    + {a.name} {a.price > 0 ? `(+₹${a.price})` : ''}
                  </span>
                ))}
              </div>
              {item.instructions && (
                <p className="text-[11px] text-amber-400 mt-1 ml-8 italic">Note: {item.instructions}</p>
              )}
            </div>
          )
        })}
      </div>
      {order.customer_notes && (
        <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <p className="text-xs text-orange-400 font-semibold uppercase mb-1">Chef Note:</p>
          <p className="text-sm text-slate-300 italic">"{order.customer_notes}"</p>
        </div>
      )}
      <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center">
        <span className="text-slate-400 text-sm">Grand Total</span>
        <span className="text-orange-400 text-xl font-bold">₹{order.total_amount}</span>
      </div>
    </div>
  )

  // ── Nav items (shared between sidebar + mobile bottom nav) ────────────────
  // ── Table Board derived data ──────────────────────────────────────────────
  const TOTAL_TABLES = 20
  const activeOrdersByTable = orders
    .filter(o => o.status !== 'declined' && !(o.status === 'delivered' && o.payment_status === 'paid'))
    .reduce((acc: Record<string, any[]>, o) => {
      const t = String(o.table_number)
      if (!acc[t]) acc[t] = []
      acc[t].push(o)
      return acc
    }, {})
  const occupiedCount = Object.keys(activeOrdersByTable).length

  const NAV = [
    { key: 'dashboard',     Icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'new_requests',  Icon: Bell,          label: 'Requests',  badge: newRequests.length, highlight: newRequests.length > 0 },
    { key: 'live_orders',   Icon: ChefHat,       label: 'Kitchen',   badge: kitchenActive.length },
    { key: 'tables_board',  Icon: Armchair,      label: 'Tables',    badge: occupiedCount },
    { key: 'payments',      Icon: Receipt,       label: 'Payments',  badge: unpaidBillGroups.length },
    { key: 'menu_control',  Icon: Utensils,      label: 'Menu',      badge: unavailableCount > 0 ? unavailableCount : 0 },
    { key: 'history',       Icon: History,       label: 'History' },
    { key: 'takeaway',      Icon: Package,       label: 'Takeaway' },
    { key: 'staff',         Icon: Users,         label: 'Staff' },
  ]

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── MOBILE OVERLAY ───────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR (Sufra-style: collapsible on desktop, slide-in on mobile) ── */}
      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col bg-slate-900 border-r border-slate-800
        transition-all duration-300 ease-in-out overflow-hidden shrink-0
        md:sticky md:z-auto
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'}
      `}>
        {/* Inner — always 256px wide, outer clips it */}
        <div className="w-64 flex flex-col h-full">

          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800 shrink-0">
            <span className="bg-orange-600 p-2 rounded-lg shrink-0"><ChefHat className="w-5 h-5 text-white" /></span>
            <span className="text-lg font-bold text-white whitespace-nowrap">Admin POS</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {NAV.map(({ key, Icon, label, badge, highlight }) => (
              <button
                key={key}
                onClick={() => { setActiveTab(key); if (window.innerWidth < 768) setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === key
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                    : highlight
                      ? 'text-sky-400 hover:bg-slate-800 hover:text-sky-300'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="relative shrink-0">
                  <Icon className="w-5 h-5" />
                  {badge != null && badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="flex-1 text-left">{label}</span>
                {badge != null && badge > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === key ? 'bg-white/20' : 'bg-red-500/20 text-red-400'}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* Logout */}
          <div className="px-3 py-4 border-t border-slate-800 shrink-0">
            <button
              onClick={async () => {
                setSidebarOpen(false)
                if (window.confirm('Logout from POS terminal?')) {
                  await supabase.auth.signOut()
                  router.replace('/')
                }
              }}
              className="w-full flex items-center gap-3.5 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-sm font-medium whitespace-nowrap"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN BODY ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar — always visible, hamburger toggles sidebar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className="relative p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <Menu className="w-5 h-5" />
            {newRequests.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {newRequests.length > 9 ? '9+' : newRequests.length}
              </span>
            )}
          </button>
          <h1 className="text-sm font-semibold text-slate-200 flex-1">
            {NAV.find(n => n.key === activeTab)?.label ?? 'Dashboard'}
          </h1>

          {/* PWA Install Button — appears whenever browser says app is installable */}
          {showInstallBanner && installPrompt && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Install App
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">

        {/* ── TAB: NEW REQUESTS ── */}
        {activeTab === 'new_requests' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6 md:mb-8 border-b border-slate-800 pb-4">
              <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                New Order Requests
                {newRequests.length > 0 && (
                  <span className="bg-red-600/20 text-red-400 text-xs md:text-sm py-1 px-3 rounded-full border border-red-500/20 animate-pulse">
                    {newRequests.length} Waiting
                  </span>
                )}
              </h1>
            </div>
            {loading ? (
              <div className="text-center py-20 text-slate-500">Loading...</div>
            ) : newRequests.length === 0 && visibleDeclined.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center">
                <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-300">No new requests</h3>
                <p className="text-slate-500 mt-2">Waiting for customers to place orders...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {newRequests.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {newRequests.map(order => (
                      <div key={order.id} className={`bg-slate-900 rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-500 ${newOrderId === order.id ? 'border-sky-500 ring-2 ring-sky-500/40 scale-[1.02]' : 'border-slate-700'}`}>
                        <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-start bg-sky-950/30">
                          <div>
                            <h3 className="text-xl md:text-2xl font-bold text-white">Table {order.table_number}</h3>
                            <p className="text-sm text-slate-400 mt-0.5 capitalize">{order.customer_name}</p>
                            <p className="text-xs text-slate-600 mt-1">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <span className="px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse">NEW</span>
                        </div>
                        <OrderItems order={order} />
                        <div className="p-4 border-t border-slate-800 grid grid-cols-2 gap-3">
                          <Button className="w-full bg-red-700 hover:bg-red-800 font-bold h-11 text-sm" onClick={() => updateOrderStatus(order.id, 'declined')}>
                            <XCircle className="w-4 h-4 mr-1.5" /> Decline
                          </Button>
                          <Button className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-11 text-sm" onClick={() => updateOrderStatus(order.id, 'preparing')}>
                            <ChefHat className="w-4 h-4 mr-1.5" /> Accept
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {visibleDeclined.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-600 uppercase font-bold tracking-widest mb-3">Recently Declined — disappearing shortly…</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                      {visibleDeclined.map(order => (
                        <div key={order.id} className="bg-slate-900 rounded-2xl border border-red-900/40 shadow-xl overflow-hidden flex flex-col opacity-60">
                          <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-start bg-red-950/20">
                            <div>
                              <h3 className="text-xl font-bold text-white">Table {order.table_number}</h3>
                              <p className="text-sm text-slate-400 mt-0.5 capitalize">{order.customer_name}</p>
                            </div>
                            <span className="px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider bg-red-500/10 text-red-400 border-red-500/20">Declined</span>
                          </div>
                          <div className="px-5 pt-3 pb-2 text-xs text-slate-500 italic flex items-center gap-2">
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            Order declined — will disappear in a few seconds
                          </div>
                          <OrderItems order={order} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: DASHBOARD ── */}
        {activeTab === 'dashboard' && (
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Top stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-5 rounded-2xl shadow-lg border border-orange-500/30">
                <p className="text-orange-100/70 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> Today
                </p>
                <h2 className="text-2xl font-black text-white mb-1">₹{todaysRevenue.toLocaleString('en-IN')}</h2>
                <p className="text-orange-200/80 text-xs">{todaysDelivered.length} orders</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> This Week
                </p>
                <h2 className="text-2xl font-bold text-white mb-1">₹{thisWeeksRevenue.toLocaleString('en-IN')}</h2>
                <p className="text-slate-500 text-xs flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />{thisWeeksDelivered.length} orders</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" /> This Month
                </p>
                <h2 className="text-2xl font-bold text-white mb-1">₹{thisMonthsRevenue.toLocaleString('en-IN')}</h2>
                <p className="text-slate-500 text-xs flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />{thisMonthsDelivered.length} orders</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">All-Time</p>
                <h2 className="text-2xl font-bold text-emerald-400 mb-1">₹{totalRevenue.toLocaleString('en-IN')}</h2>
                <p className="text-slate-500 text-xs">Lifetime revenue</p>
              </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              {/* Chart header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Revenue</p>
                  <h3 className="text-2xl font-bold text-white">
                    ₹{chartData.reduce((s, d) => s + d.revenue, 0).toLocaleString('en-IN')}
                    <span className="text-sm font-normal text-slate-500 ml-2">{chartData.reduce((s, d) => s + d.orders, 0)} orders</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Period tabs */}
                  <div className="flex items-center gap-1 bg-slate-800 rounded-xl p-1">
                    {(['daily','weekly','monthly','yearly','all'] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => setChartPeriod(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                          chartPeriod === p ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Period pickers */}
                  {(chartPeriod === 'daily' || chartPeriod === 'weekly') && (
                    <input
                      type="date"
                      value={chartDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => { if (e.target.value) setChartDate(e.target.value) }}
                      onKeyDown={e => e.preventDefault()}
                      style={{ colorScheme: 'dark' }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
                    />
                  )}
                  {chartPeriod === 'monthly' && (
                    <input
                      type="month"
                      value={chartMonth}
                      max={new Date().toISOString().slice(0, 7)}
                      onChange={e => { if (e.target.value) setChartMonth(e.target.value) }}
                      onKeyDown={e => e.preventDefault()}
                      style={{ colorScheme: 'dark' }}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 cursor-pointer"
                    />
                  )}
                  {chartPeriod === 'yearly' && (
                    <div className="relative flex items-center">
                      <select
                        value={chartYear}
                        onChange={e => setChartYear(Number(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 pr-8 py-2 focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                      <span className="absolute right-3 text-slate-400 pointer-events-none text-xs">▾</span>
                    </div>
                  )}
                </div>
              </div>

              {/* The chart */}
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1e293b" strokeDasharray="0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: '#64748b', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => v === 0 ? '0' : `₹${v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}`}
                      width={55}
                    />
                    <Tooltip
                      cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                      content={({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null
                        return (
                          <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 shadow-xl">
                            <p className="text-slate-400 text-xs mb-1">{label}</p>
                            <p className="text-white font-bold text-lg">₹{payload[0]?.value?.toLocaleString('en-IN')}</p>
                            <p className="text-slate-500 text-xs">{payload[0]?.payload?.orders} orders</p>
                          </div>
                        )
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      fill="url(#revenueGrad)"
                      dot={false}
                      activeDot={{ r: 5, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bottom stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="New Requests" value={newRequests.length}     sub="Awaiting acceptance" Icon={Bell}        color="text-sky-500" />
              <StatCard title="Total Orders" value={orders.length}          sub="All time"            Icon={ShoppingBag} color="text-blue-500" />
              <StatCard title="Preparing"    value={preparingOrders.length} sub="In Kitchen"          Icon={ChefHat}     color="text-orange-500" />
              <StatCard title="Delivered"    value={deliveredOrders.length} sub="Completed"           Icon={CheckCircle} color="text-emerald-500" />
            </div>

            {/* Pie Charts — temporarily hidden
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Category Breakdown</p>
                <p className="text-white font-bold text-lg mb-4">Revenue by Category</p>
                {categoryPieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No data yet</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={categoryPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {categoryPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                                <p className="text-slate-300 font-semibold">{payload[0].name}</p>
                                <p className="text-orange-400 font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                      {categoryPieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-slate-400">{d.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Item Breakdown</p>
                <p className="text-white font-bold text-lg mb-4">Revenue by Item</p>
                {itemRevenuePieData.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-slate-600 text-sm">No data yet</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={itemRevenuePieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                          {itemRevenuePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }: any) => {
                            if (!active || !payload?.length) return null
                            return (
                              <div className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 shadow-xl text-xs">
                                <p className="text-slate-300 font-semibold">{payload[0].name}</p>
                                <p className="text-orange-400 font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</p>
                              </div>
                            )
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                      {itemRevenuePieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-xs text-slate-400">{d.name} <span className="text-slate-600">₹{d.value.toLocaleString('en-IN')}</span></span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

            </div>
            */}
          </div>
        )}

        {/* ── TAB: LIVE KITCHEN ── */}
        {activeTab === 'live_orders' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6 md:mb-8 border-b border-slate-800 pb-4">
              <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                Live Kitchen
                <span className="bg-orange-600/20 text-orange-500 text-xs md:text-sm py-1 px-3 rounded-full border border-orange-500/20">{kitchenActive.length} Active</span>
              </h1>
            </div>
            {loading ? (
              <div className="text-center py-20 text-slate-500">Loading orders...</div>
            ) : kitchenActive.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center">
                <ChefHat className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-300">Kitchen is clear!</h3>
                <p className="text-slate-500 mt-2">Waiting for accepted orders...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {kitchenActive.map(order => (
                  <div key={order.id} className={`bg-slate-900 rounded-2xl border shadow-xl overflow-hidden flex flex-col transition-all duration-500 ${newOrderId === order.id ? 'border-orange-500 ring-2 ring-orange-500/40 scale-[1.02]' : 'border-slate-800'}`}>
                    <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-start">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">Table {order.table_number}</h3>
                        <p className="text-sm text-slate-400 mt-0.5 capitalize">{order.customer_name}</p>
                        <p className="text-xs text-slate-600 mt-1">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider ${order.status === 'pending' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {order.status}
                      </span>
                    </div>
                    <OrderItems order={order} />
                    <div className="p-4 border-t border-slate-800 flex gap-2">
                      <Button
                        className="flex-1 bg-slate-700 hover:bg-slate-600 font-bold h-12 text-sm"
                        onClick={() => openEdit(order)}
                      >
                        <Pencil className="w-4 h-4 mr-2" /> Edit Order
                      </Button>
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-bold h-12" onClick={() => updateOrderStatus(order.id, 'delivered')}>
                        <CheckCircle className="w-5 h-5 mr-2" /> Delivered
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PAYMENTS ── */}
        {activeTab === 'payments' && (
          <div className="max-w-7xl mx-auto">
            <h1 className="text-xl md:text-3xl font-bold text-white mb-6 md:mb-8 border-b border-slate-800 pb-4 flex items-center gap-3">
              Pending Payments
              <span className="bg-red-600/20 text-red-500 text-xs md:text-sm py-1 px-3 rounded-full border border-red-500/20">{unpaidBillGroups.length} Unpaid</span>
            </h1>
            {unpaidBillGroups.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-slate-300">All caught up!</h3>
                <p className="text-slate-500 mt-2">No pending payments to collect.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {unpaidBillGroups.map(group => (
                  <div key={group.tableNumber} className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-4 md:p-5 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-white">Table {group.tableNumber}</h3>
                        <p className="text-sm text-slate-400 mt-0.5 capitalize">{group.customerNames.join(' & ')}</p>
                        {group.orderIds.length > 1 && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                            {group.orderIds.length} orders merged
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 text-xl font-bold">₹{group.totalAmount}</p>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Amount Due</p>
                      </div>
                    </div>
                    <div className="p-5 flex-1">
                      <div className="space-y-2 mb-4">
                        {group.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-400">{item.quantity}x {item.item_name}</span>
                            <span className="text-slate-500">₹{item.item_price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="text-[11px] text-slate-600 flex justify-between">
                        <span>Ordered at: {new Date(group.earliestCreatedAt).toLocaleTimeString()}</span>
                        <span>{group.orderIds.length} order{group.orderIds.length > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-950/50 border-t border-slate-800">
                      <Button className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold h-12 shadow-lg shadow-emerald-600/10" onClick={() => markGroupAsPaid(group.orderIds)} disabled={updatingPayment === group.orderIds[0]}>
                        {updatingPayment === group.orderIds[0] ? (
                          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</span>
                        ) : (
                          <span className="flex items-center gap-2"><Receipt className="w-5 h-5" /> Mark as Paid</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: HISTORY ── */}
        {activeTab === 'history' && (
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col gap-3 mb-5 border-b border-slate-800 pb-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl md:text-3xl font-bold text-white">Order History</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {filteredHistoryOrders.length} orders &mdash; ₹{filteredHistoryRevenue} revenue
                  </p>
                </div>
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 w-fit">
                {(['daily','weekly','monthly','yearly','all'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                      historyFilter === f
                        ? 'bg-orange-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Date pickers based on mode */}
              <div className="flex flex-wrap items-center gap-2">
                {historyFilter === 'daily' && (
                  <input
                    type="date"
                    value={historyDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={e => { if (e.target.value) setHistoryDate(e.target.value) }}
                    onKeyDown={e => e.preventDefault()}
                    style={{ colorScheme: 'dark' }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                )}
                {historyFilter === 'weekly' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={historyDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => { if (e.target.value) setHistoryDate(e.target.value) }}
                      onKeyDown={e => e.preventDefault()}
                      style={{ colorScheme: 'dark' }}
                      className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <span className="text-xs text-slate-500">
                      Week: {weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} &ndash; {weekEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                )}
                {historyFilter === 'monthly' && (
                  <input
                    type="month"
                    value={historyMonth}
                    max={new Date().toISOString().slice(0, 7)}
                    onChange={e => { if (e.target.value) setHistoryMonth(e.target.value) }}
                    onKeyDown={e => e.preventDefault()}
                    style={{ colorScheme: 'dark' }}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                )}
                {historyFilter === 'yearly' && (
                  <select
                    value={historyYear}
                    onChange={e => setHistoryYear(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                )}

                {/* Item / customer search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search item or customer..."
                    value={historyItemSearch}
                    onChange={e => setHistoryItemSearch(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl pl-8 pr-4 py-2 w-56 focus:outline-none focus:border-orange-500 transition-colors placeholder-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-950/50 border-b border-slate-800">
                    <tr>
                      <th className="px-4 md:px-6 py-4">Order / Time</th>
                      <th className="px-4 md:px-6 py-4">Customer &amp; Table</th>
                      <th className="px-4 md:px-6 py-4">Amount</th>
                      <th className="px-4 md:px-6 py-4 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistoryOrders.length === 0 ? (
                      <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">Koi order nahi mila is period mein.</td></tr>
                    ) : filteredHistoryOrders.map(order => {
                      const isExpanded = expandedHistoryId === order.id
                      return (
                        <React.Fragment key={order.id}>
                          <tr
                            key={order.id}
                            onClick={() => setExpandedHistoryId(isExpanded ? null : order.id)}
                            className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                          >
                            <td className="px-4 md:px-6 py-4">
                              <p className="text-orange-400 font-mono font-bold text-xs tracking-widest mb-1">#{order.id.slice(0, 8).toUpperCase()}</p>
                              <p className="text-[11px] text-slate-500">{formatDT(order.created_at)}</p>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <p className="text-white font-medium capitalize">{order.customer_name}</p>
                              <p className="text-xs text-slate-500">Table {order.table_number}</p>
                            </td>
                            <td className="px-4 md:px-6 py-4 font-bold text-emerald-400">₹{order.total_amount}</td>
                            <td className="px-4 md:px-6 py-4 text-right">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                                order.payment_status === 'paid'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr key={`${order.id}-detail`} className="border-b border-slate-800/50 bg-slate-800/20">
                              <td colSpan={4} className="px-4 md:px-8 py-4">
                                <div className="space-y-2">
                                  {order.order_items?.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-start justify-between text-sm">
                                      <div className="flex items-center gap-2">
                                        <span className="bg-slate-700 text-orange-400 px-2 py-0.5 rounded text-xs font-bold">{item.quantity}x</span>
                                        <div>
                                          <p className="text-slate-200 font-medium">{item.item_name}</p>
                                          {item.add_ons?.length > 0 && (
                                            <p className="text-[11px] text-orange-300 mt-0.5">
                                              + {item.add_ons.map((a: any) => a.name).join(', ')}
                                            </p>
                                          )}
                                          {item.instructions && (
                                            <p className="text-[11px] text-amber-400 mt-0.5 italic">Note: {item.instructions}</p>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-slate-400 text-sm">₹{item.item_price * item.quantity}</span>
                                    </div>
                                  ))}
                                  {order.customer_notes && (
                                    <p className="text-xs text-amber-400 mt-2 italic border-t border-slate-700 pt-2">Order note: {order.customer_notes}</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: TABLES BOARD ── */}
        {activeTab === 'tables_board' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white flex items-center gap-3">
                  Table Status
                  <span className="bg-orange-600/20 text-orange-400 text-xs py-1 px-3 rounded-full border border-orange-500/20">
                    {occupiedCount}/{TOTAL_TABLES} occupied
                  </span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">Live view of all tables</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />Free</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500/80 inline-block" />Occupied</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />Payment pending</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {Array.from({ length: TOTAL_TABLES }, (_, i) => {
                const tableNum  = String(i + 1)
                const tableOrders = activeOrdersByTable[tableNum] || []
                const hasOrders = tableOrders.length > 0
                const awaitingPay = tableOrders.some((o: any) => o.status === 'delivered' && o.payment_status !== 'paid')
                const totalAmt  = tableOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
                const itemCount = tableOrders.reduce((s: number, o: any) => s + (o.order_items?.length || 0), 0)
                const customerName = tableOrders[0]?.customer_name || ''
                const orderStatuses = [...new Set(tableOrders.map((o: any) => o.status))]

                const statusLabel = awaitingPay
                  ? 'Pay Pending'
                  : orderStatuses.includes('preparing')
                    ? 'Preparing'
                    : orderStatuses.includes('pending')
                      ? 'Pending'
                      : orderStatuses.includes('confirmed')
                        ? 'Confirmed'
                        : 'Active'

                const cardBorder = !hasOrders
                  ? 'border-slate-800 bg-slate-900'
                  : awaitingPay
                    ? 'border-red-500/50 bg-red-950/20'
                    : 'border-orange-500/50 bg-orange-950/20'

                const dotColor = !hasOrders ? 'bg-emerald-500' : awaitingPay ? 'bg-red-500' : 'bg-orange-500'
                const dotPulse = hasOrders ? 'animate-pulse' : ''

                return (
                  <div
                    key={tableNum}
                    className={`rounded-2xl border p-4 flex flex-col gap-2 transition-all ${cardBorder} ${hasOrders ? 'shadow-lg' : ''}`}
                  >
                    {/* Table number + dot */}
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-white">T{tableNum}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ${dotPulse}`} />
                    </div>

                    {!hasOrders ? (
                      <div className="flex-1 flex flex-col justify-center">
                        <p className="text-emerald-400 text-xs font-semibold">Available</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {/* Customer */}
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Users className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="text-xs text-slate-300 font-medium truncate">{customerName || 'Guest'}</span>
                        </div>

                        {/* Status badge */}
                        <span className={`self-start text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          awaitingPay
                            ? 'bg-red-900/40 text-red-300 border-red-700/50'
                            : statusLabel === 'Preparing'
                              ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                              : 'bg-orange-900/40 text-orange-300 border-orange-700/50'
                        }`}>
                          {statusLabel}
                        </span>

                        {/* Items + total */}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-slate-500">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          <span className="text-sm font-bold text-white">₹{totalAmt}</span>
                        </div>

                        {/* Quick action buttons */}
                        <div className="flex gap-1.5 mt-1">
                          {!awaitingPay && (
                            <button
                              onClick={() => { setActiveTab('live_orders') }}
                              className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            >
                              Kitchen
                            </button>
                          )}
                          {awaitingPay && (
                            <button
                              onClick={() => { setActiveTab('payments') }}
                              className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 text-red-300 transition-colors"
                            >
                              Pay
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Show extra tables not in 1-20 range */}
            {Object.keys(activeOrdersByTable).filter(t => isNaN(Number(t)) || Number(t) > TOTAL_TABLES).length > 0 && (
              <div className="mt-6">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Other Tables</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Object.keys(activeOrdersByTable)
                    .filter(t => isNaN(Number(t)) || Number(t) > TOTAL_TABLES)
                    .map(tableNum => {
                      const tableOrders = activeOrdersByTable[tableNum]
                      const awaitingPay = tableOrders.some((o: any) => o.status === 'delivered' && o.payment_status !== 'paid')
                      const totalAmt = tableOrders.reduce((s: number, o: any) => s + (o.total_amount || 0), 0)
                      const customerName = tableOrders[0]?.customer_name || ''
                      return (
                        <div key={tableNum} className={`rounded-2xl border p-4 flex flex-col gap-2 shadow-lg ${awaitingPay ? 'border-red-500/50 bg-red-950/20' : 'border-orange-500/50 bg-orange-950/20'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-white">T{tableNum}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${awaitingPay ? 'bg-red-500' : 'bg-orange-500'} animate-pulse`} />
                          </div>
                          <p className="text-xs text-slate-300 truncate">{customerName || 'Guest'}</p>
                          <div className="flex items-center justify-between">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${awaitingPay ? 'bg-red-900/40 text-red-300 border-red-700/50' : 'bg-orange-900/40 text-orange-300 border-orange-700/50'}`}>
                              {awaitingPay ? 'Pay Pending' : 'Active'}
                            </span>
                            <span className="text-sm font-bold text-white">₹{totalAmt}</span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: MENU CONTROL ── */}
        {activeTab === 'menu_control' && (
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-slate-800 pb-4">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white">Menu Control</h1>
                <p className="text-slate-500 text-sm mt-1">
                  Toggle items off to hide them from customers instantly.
                  {unavailableCount > 0 && (
                    <span className="ml-2 text-amber-400 font-semibold">{unavailableCount} item{unavailableCount > 1 ? 's' : ''} hidden</span>
                  )}
                </p>
              </div>
              <button
                onClick={fetchMenuItems}
                className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search items or category..."
                value={menuSearch}
                onChange={e => setMenuSearch(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>

            {menuLoading ? (
              <div className="text-center py-20 text-slate-500">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Loading menu...
              </div>
            ) : menuItems.length === 0 ? (
              <div className="bg-slate-900 p-12 rounded-2xl border border-slate-800 text-center">
                <Utensils className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400">No menu items found in database.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {(Object.entries(groupedMenu) as [string, any[]][]).map(([category, items]) => (
                  <div key={category} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                    {/* Category header */}
                    <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">{category}</h3>
                      <span className="text-xs text-slate-500">{items.filter(i => i.is_available).length}/{items.length} available</span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-slate-800">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-4 py-3.5 transition-all ${!item.is_available ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Veg / Non-veg dot */}
                            <div className={`w-3.5 h-3.5 rounded-sm border-2 flex items-center justify-center shrink-0 ${item.is_veg !== false ? 'border-green-500' : 'border-red-500'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${item.is_veg !== false ? 'bg-green-500' : 'bg-red-500'}`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold truncate ${item.is_available ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                                {item.name}
                              </p>
                              <p className="text-xs text-slate-500">₹{item.price}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 ml-3">
                            <span className={`text-xs font-medium hidden sm:block ${item.is_available ? 'text-emerald-500' : 'text-slate-600'}`}>
                              {item.is_available ? 'Available' : 'Hidden'}
                            </span>
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={val => toggleMenuItem(item.id, val)}
                              disabled={togglingId === item.id}
                              className="data-[state=checked]:bg-orange-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: TAKEAWAY ── */}
        {activeTab === 'takeaway' && (
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-600/10 border border-orange-500/20 rounded-3xl flex items-center justify-center mb-6">
              <Package className="w-10 h-10 text-orange-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-3">Coming Soon</h1>
            <p className="text-slate-500 text-sm max-w-xs">Takeaway order management is under development. Stay tuned!</p>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="max-w-7xl mx-auto flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-orange-600/10 border border-orange-500/20 rounded-3xl flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-orange-500" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-3">Coming Soon</h1>
            <p className="text-slate-500 text-sm max-w-xs">Staff management is under development. Stay tuned!</p>
          </div>
        )}

      </main>

      {/* ── ORDER EDIT MODAL ──────────────────────────────────────────────── */}
      {editingOrder && (
        <div className="fixed inset-0 z-9999 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 w-full max-w-lg rounded-t-3xl md:rounded-2xl border border-slate-700 shadow-2xl flex flex-col" style={{ maxHeight: '90dvh' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Order — Table {editingOrder.table_number}</h2>
                <p className="text-xs text-slate-400 capitalize mt-0.5">{editingOrder.customer_name}</p>
              </div>
              <div className="flex items-center gap-3">
                {editSaving && <span className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
                <button onClick={() => setEditingOrder(null)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 p-5 space-y-5">

              {/* Current Items */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Current Items</p>
                {editingOrder.order_items?.length === 0 ? (
                  <p className="text-slate-600 text-sm italic">No items — add from menu below</p>
                ) : (
                  <div className="space-y-2">
                    {editingOrder.order_items.map((item: any) => {
                      const isExpanded   = subEditItemId === item.id
                      const currentAddon = item.add_ons?.[0] ?? null

                      return (
                        <div key={item.id} className={`rounded-xl overflow-hidden border transition-colors ${isExpanded ? 'bg-slate-700 border-orange-500/40' : 'bg-slate-800 border-transparent'}`}>

                          {/* Clickable item row */}
                          <button
                            onClick={() => openItemSubEdit(item)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-200 truncate">
                                <span className="text-orange-400 mr-2">{item.quantity}x</span>
                                {item.item_name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-slate-500">₹{item.item_price * item.quantity}</span>
                                {currentAddon && (
                                  <span className="text-[10px] bg-orange-900/30 text-orange-300 border border-orange-700/30 px-2 py-0.5 rounded-full">
                                    {currentAddon.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 ml-3 shrink-0">
                              <span className={`text-xs px-2 py-1 rounded-lg transition-colors ${isExpanded ? 'bg-orange-600/30 text-orange-300' : 'bg-slate-700 text-slate-500'}`}>
                                {isExpanded ? 'Close' : 'Edit'}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeItemFromOrder(item.id) }}
                                disabled={editSaving}
                                className="p-2 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors disabled:opacity-40"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </button>

                          {/* Sub-edit panel */}
                          {isExpanded && (
                            <div className="border-t border-slate-600/50 px-4 py-4">
                              {subEditLoading ? (
                                <p className="text-slate-500 text-sm text-center py-2">Loading...</p>
                              ) : (
                                <div className="space-y-2">
                                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2.5">
                                    {subEditAddons.length > 0 ? 'Select Add-on' : 'Current Add-on'}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {/* None / Remove option */}
                                    <button
                                      onClick={() => updateItemAddon(item, null)}
                                      disabled={editSaving}
                                      className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-all disabled:opacity-40 ${
                                        currentAddon === null
                                          ? 'bg-slate-500 text-white border-slate-400'
                                          : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-red-500/60 hover:text-red-300'
                                      }`}
                                    >
                                      {currentAddon ? 'Remove add-on' : 'None'}
                                    </button>

                                    {/* Add-on options from menu */}
                                    {subEditAddons.map((addon: any, i: number) => (
                                      <button
                                        key={i}
                                        onClick={() => updateItemAddon(item, addon)}
                                        disabled={editSaving}
                                        className={`text-xs px-3 py-2 rounded-xl font-semibold border transition-all disabled:opacity-40 ${
                                          currentAddon?.name === addon.name
                                            ? 'bg-orange-600 text-white border-orange-500'
                                            : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-orange-500/60 hover:text-orange-300'
                                        }`}
                                      >
                                        {addon.name}
                                        <span className="ml-1 opacity-60 text-[10px]">+₹{addon.price}</span>
                                      </button>
                                    ))}

                                    {/* If no menu add-ons but item has current add-on — show it */}
                                    {subEditAddons.length === 0 && currentAddon && (
                                      <span className="text-xs px-3 py-2 rounded-xl bg-orange-600 text-white border border-orange-500">
                                        {currentAddon.name} <span className="opacity-70">+₹{currentAddon.price}</span>
                                      </span>
                                    )}
                                  </div>

                                  {subEditAddons.length === 0 && !currentAddon && (
                                    <p className="text-slate-600 text-xs italic">No add-ons configured for this item in menu</p>
                                  )}

                                  {editSaving && <p className="text-orange-400 text-xs mt-1">Saving...</p>}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-400 font-medium">Updated Total</span>
                <span className="text-lg font-bold text-orange-400">₹{editingOrder.total_amount}</span>
              </div>

              {/* Add from Menu */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add from Menu</p>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search menu items..."
                    value={editMenuSearch}
                    onChange={e => setEditMenuSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                {menuLoading ? (
                  <p className="text-slate-500 text-sm text-center py-4">Loading menu...</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {menuItems
                      .filter(i => i.is_available && (
                        i.name.toLowerCase().includes(editMenuSearch.toLowerCase()) ||
                        i.category?.toLowerCase().includes(editMenuSearch.toLowerCase())
                      ))
                      .map(item => (
                        <div key={item.id}>
                          {/* Item row */}
                          <div className={`flex items-center justify-between rounded-xl px-4 py-3 transition-colors ${configuringItem?.id === item.id ? 'bg-orange-600/10 border border-orange-500/30' : 'bg-slate-800 hover:bg-slate-700'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-3 h-3 rounded-sm border-2 shrink-0 ${item.is_veg !== false ? 'border-green-500' : 'border-red-500'}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate">{item.name}</p>
                                <p className="text-xs text-slate-500">
                                  ₹{item.price} · {item.category}
                                  {item.add_ons?.length > 0 && <span className="text-orange-400 ml-1">· {item.add_ons.length} add-on{item.add_ons.length > 1 ? 's' : ''}</span>}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => openConfigurator(item)}
                              disabled={editSaving}
                              className={`ml-3 p-2 rounded-lg transition-colors disabled:opacity-40 shrink-0 ${configuringItem?.id === item.id ? 'bg-orange-600/40 text-orange-300' : 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400'}`}
                            >
                              {configuringItem?.id === item.id ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Inline configurator */}
                          {configuringItem?.id === item.id && (
                            <div className="mx-1 mb-2 bg-slate-800/80 border border-orange-500/20 rounded-b-xl px-4 py-3 space-y-3">

                              {/* Add-ons — fetched fresh from Supabase */}
                              {configuratorLoading ? (
                                <p className="text-slate-500 text-sm text-center py-1">Loading add-ons...</p>
                              ) : configuratorAddons.length > 0 ? (
                                <div>
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Add-on (optional)</p>
                                  <div className="space-y-1.5">
                                    <label className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${addOnChoice === null ? 'bg-orange-500/15 border border-orange-500/30' : 'border border-transparent hover:bg-slate-700'}`}>
                                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${addOnChoice === null ? 'border-orange-500' : 'border-slate-500'}`}>
                                        {addOnChoice === null && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                      </div>
                                      <span className="text-sm text-slate-300 flex-1">No Add-on</span>
                                      <span className="text-xs text-slate-500">₹0</span>
                                      <input type="radio" className="sr-only" checked={addOnChoice === null} onChange={() => setAddOnChoice(null)} />
                                    </label>
                                    {configuratorAddons.map((addon: any, i: number) => (
                                      <label key={i} className={`flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all ${addOnChoice?.name === addon.name ? 'bg-orange-500/15 border border-orange-500/30' : 'border border-transparent hover:bg-slate-700'}`}>
                                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${addOnChoice?.name === addon.name ? 'border-orange-500' : 'border-slate-500'}`}>
                                          {addOnChoice?.name === addon.name && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                                        </div>
                                        <span className="text-sm text-slate-300 flex-1">{addon.name}</span>
                                        <span className="text-xs text-emerald-400 font-medium">+₹{addon.price}</span>
                                        <input type="radio" className="sr-only" checked={addOnChoice?.name === addon.name} onChange={() => setAddOnChoice(addon)} />
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {/* Quantity + Add button */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-3 bg-slate-700 rounded-lg px-2 py-1">
                                  <button onClick={() => setAddQty(q => Math.max(1, q - 1))} className="w-7 h-7 flex items-center justify-center text-orange-400 font-bold text-lg hover:bg-slate-600 rounded">−</button>
                                  <span className="font-bold text-white w-4 text-center">{addQty}</span>
                                  <button onClick={() => setAddQty(q => q + 1)} className="w-7 h-7 flex items-center justify-center text-orange-400 font-bold text-lg hover:bg-slate-600 rounded">+</button>
                                </div>
                                <button
                                  onClick={addItemToOrder}
                                  disabled={editSaving || configuratorLoading}
                                  className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
                                >
                                  Add · ₹{(configuringItem.price + (addOnChoice?.price ?? 0)) * addQty}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Done button */}
            <div className="px-5 py-4 border-t border-slate-800 shrink-0">
              <Button className="w-full bg-orange-600 hover:bg-orange-700 font-bold h-12" onClick={() => setEditingOrder(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* ── NEW ORDER ANIMATED POPUP ──────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes popupIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.75); }
          60%  { transform: translate(-50%, -50%) scale(1.05); }
          80%  { transform: translate(-50%, -50%) scale(0.97); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes bellRing {
          0%,100% { transform: rotate(0deg); }
          10%     { transform: rotate(18deg); }
          20%     { transform: rotate(-16deg); }
          30%     { transform: rotate(14deg); }
          40%     { transform: rotate(-10deg); }
          50%     { transform: rotate(6deg); }
          60%     { transform: rotate(-4deg); }
          70%     { transform: rotate(2deg); }
        }
        @keyframes glowPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4), 0 20px 60px rgba(249,115,22,0.15); }
          50%     { box-shadow: 0 0 0 8px rgba(249,115,22,0), 0 20px 60px rgba(249,115,22,0.3); }
        }
        @keyframes shrinkBar {
          from { width: 100% }
          to   { width: 0% }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {newOrderPopup && (
        <>
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" onClick={() => setNewOrderPopup(null)} />
        <div
          style={{
            position: 'fixed', top: '50%', left: '50%', zIndex: 9999,
            transform: 'translate(-50%, -50%)',
            animation: 'popupIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
          }}
        >
          <div
            style={{ animation: 'glowPulse 2s ease-in-out infinite' }}
            className="relative bg-slate-900 border border-orange-500/60 rounded-2xl w-80 overflow-hidden"
          >
            {/* Shimmer top bar */}
            <div
              className="h-1 rounded-t-2xl"
              style={{
                background: 'linear-gradient(90deg, #ea580c, #f97316, #fbbf24, #f97316, #ea580c)',
                backgroundSize: '200% auto',
                animation: 'shimmer 2s linear infinite',
              }}
            />

            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-2xl border-2 border-orange-400/20 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />

            <div className="px-4 py-4">
              <div className="flex items-start gap-3">

                {/* Bell icon — ringing animation */}
                <div className="shrink-0 w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <Bell
                    className="w-5 h-5 text-orange-400"
                    style={{ animation: 'bellRing 1s ease-in-out infinite', transformOrigin: 'top center' }}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white tracking-wide">New Order</p>
                    <span className="text-[10px] bg-orange-500/20 text-orange-300 border border-orange-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      Table {newOrderPopup.table}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate">{newOrderPopup.customer}</p>
                  {newOrderPopup.items && (
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{newOrderPopup.items}</p>
                  )}
                  <p className="text-sm font-bold text-orange-400 mt-1.5">₹{newOrderPopup.total}</p>
                </div>

                <button
                  onClick={() => setNewOrderPopup(null)}
                  className="shrink-0 p-1 text-slate-500 hover:text-slate-300 transition-colors mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => { setActiveTab('new_requests'); setNewOrderPopup(null) }}
                className="mt-3 w-full bg-orange-600 hover:bg-orange-500 active:scale-95 text-white text-xs font-bold py-2.5 rounded-xl transition-all"
              >
                View Order
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-slate-800">
              <div
                className="h-full bg-orange-500"
                style={{ animation: 'shrinkBar 6s linear forwards' }}
              />
            </div>
          </div>
        </div>
        </>
      )}

    </div>
  )
}

function SidebarBtn({ active, onClick, icon: Icon, label, highlight }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
        active     ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
        : highlight ? 'text-sky-400 hover:text-white hover:bg-slate-800 border border-sky-500/30'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  )
}

function StatCard({ title, value, sub, Icon, color }: any) {
  return (
    <div className="bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800">
      <div className="flex justify-between items-start mb-3 md:mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <div className={`p-2 md:p-3 bg-slate-950 rounded-xl ${color} border border-slate-800`}>
          <Icon className="w-4 h-4 md:w-5 md:h-5" />
        </div>
      </div>
      <h3 className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</h3>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  )
}
