import { getAccessTokenFromCookies, getRefreshTokenFromCookies, getAuthStatus, getAppOrigin } from '@/lib/auth'
import { ensureSupabaseSession, getCurrentSupabaseUser } from '@/lib/supabase'
import notesApi from '@/api/notesApi'

export default defineBackground(() => {
  console.log('FPT FAP Helper - Background script loaded');

  const initializeAuth = async () => {
    try {
      const access = await getAccessTokenFromCookies()
      const refresh = await getRefreshTokenFromCookies()
      const hasCookies = !!access && !!refresh
      if (hasCookies) {
        await ensureSupabaseSession(access, refresh)
      }
      const user = await getCurrentSupabaseUser()
      await browser.storage.local.set({ rlAuth: { hasCookies, user, lastCheckedAt: new Date().toISOString() } })
      console.log('[background] Auth init', { hasCookies, userPresent: !!user })
    } catch (e) {
      console.warn('[background] Auth init failed', e)
    }
  }

  initializeAuth()

  // Context Menus for selection
  const PARENT_ID = 'roguelearn_context_parent'
  const CREATE_NOTE_ID = 'roguelearn_create_note'
  const SEARCH_NOTES_ID = 'roguelearn_search_notes'
  const RESULTS_PARENT_ID = 'roguelearn_last_results'
  const OPEN_NOTE_PREFIX = 'roguelearn_open_note_'
  let lastResultItemIds: string[] = []

  const truncate = (s: string, n = 40) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

  const updateSearchResultsMenu = async (results: any[], query: string) => {
    try {
      for (const id of lastResultItemIds) {
        try { await browser.contextMenus.remove(id) } catch {}
      }
      lastResultItemIds = []

      const headerId = `${RESULTS_PARENT_ID}_header`
      try {
        await browser.contextMenus.remove(headerId)
      } catch {}
      browser.contextMenus.create({
        id: headerId,
        parentId: RESULTS_PARENT_ID,
        title: `Results for "${truncate(query, 28)}" (${results.length})`,
        contexts: ['selection'],
        enabled: false,
      })

      const top = (results || []).slice(0, 5)
      top.forEach((n: any) => {
        const id = `${OPEN_NOTE_PREFIX}${n.id}`
        lastResultItemIds.push(id)
        browser.contextMenus.create({
          id,
          parentId: RESULTS_PARENT_ID,
          title: `Open: ${truncate(n.title || String(n.id))}`,
          contexts: ['selection'],
        })
      })
    } catch (e) {
      console.log('[background] updateSearchResultsMenu error', e)
    }
  }

  const setupMenus = async () => {
    try {
      console.log('[background] setupMenus start')
      browser.contextMenus.removeAll(() => {
        console.log('[background] contextMenus cleared')
        browser.contextMenus.create({
          id: PARENT_ID,
          title: 'RogueLearn',
          contexts: ['selection'],
        })
        console.log('[background] menu created', { id: PARENT_ID })
        browser.contextMenus.create({
          id: CREATE_NOTE_ID,
          parentId: PARENT_ID,
          title: 'Summarize and Create Note',
          contexts: ['selection'],
        })
        console.log('[background] menu created', { id: CREATE_NOTE_ID })
        browser.contextMenus.create({
          id: SEARCH_NOTES_ID,
          parentId: PARENT_ID,
          title: 'Search in My Notes',
          contexts: ['selection'],
        })
        console.log('[background] menu created', { id: SEARCH_NOTES_ID })
        browser.contextMenus.create({
          id: RESULTS_PARENT_ID,
          parentId: PARENT_ID,
          title: 'Last Search Results',
          contexts: ['selection'],
        })
        console.log('[background] menu created', { id: RESULTS_PARENT_ID })
        console.log('[background] setupMenus done')
      })
    } catch (e) {
      console.log('[background] createMenus error', e)
    }
  }

  browser.runtime.onInstalled.addListener((details) => {
    console.log('[background] onInstalled', details)
    setupMenus()
  })
  // Also setup on load so menus exist in dev reloads
  setupMenus()

  // Handle redirect to FAP login
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'redirectToFAP') {
      // Update current tab instead of creating new one
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'navigateToTranscript') {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/Grade/StudentTranscript.aspx'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    if (message.action === 'navigateToSchedule') {
      browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
        if (tabs[0]?.id) {
          browser.tabs.update(tabs[0].id, {
            url: 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx'
          });
        }
      });
      sendResponse({ success: true });
      return true;
    }

    // Handle cookie request from content script
    if (message.action === 'getCookies') {
      browser.cookies.getAll({ url: 'https://fap.fpt.edu.vn' })
        .then(cookies => {
          const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
          sendResponse({ 
            success: true, 
            cookies: cookieString,
            count: cookies.length,
            names: cookies.map(c => c.name)
          });
        })
        .catch(error => {
          sendResponse({ success: false, error: error.message });
        });
      return true; // Keep channel open for async response
    }

    if (message.action === 'authStatus') {
      (async () => {
        const status = await getAuthStatus()
        const user = await getCurrentSupabaseUser()
        sendResponse({ success: true, status, user })
      })()
      return true
    }

    if (message.action === 'getLastSearchResults') {
      (async () => {
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          const stored = await storage?.local?.get?.(['pendingSearchResults', 'pendingSearchQuery'])
          const results = Array.isArray(stored?.pendingSearchResults) ? stored?.pendingSearchResults : []
          const query = stored?.pendingSearchQuery || ''
          console.log('[background] getLastSearchResults', { count: results.length, query })
          sendResponse({ success: true, results, query })
        } catch (e) {
          sendResponse({ success: false, error: e instanceof Error ? e.message : String(e) })
        }
      })()
      return true
    }

    return false;
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const text = (info.selectionText || '').trim()
    console.log('[background] context menu clicked', { info, tab, text })

    if (typeof info.menuItemId === 'string' && (info.menuItemId as string).startsWith(OPEN_NOTE_PREFIX)) {
      try {
        const idStr = (info.menuItemId as string).slice(OPEN_NOTE_PREFIX.length)
        const origin = getAppOrigin()
        const url = `${origin}/arsenal/${idStr}`
        await browser.tabs.create({ url })
      } catch (e) {
        console.log('[background] open note error', e)
      }
      return
    }

    if (!text) return

    if (info.menuItemId === CREATE_NOTE_ID) {
      try {
        browser.action.setBadgeText({ text: '🔃' })
        console.log('[background] create note with text', text)
        browser.runtime.sendMessage({ action: 'noteCreateStart', text })
        const title = text.length > 80 ? text.slice(0, 77) + '…' : text
        const res = await notesApi.createWithAiTagsFromText({
          title,
          rawText: text,
          isPublic: false,
          applySuggestions: true,
          maxTags: 5,
        })
        browser.runtime.sendMessage({ action: 'noteCreated', noteId: res.data.id, title })
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          await storage?.local?.set?.({ needsReloadNotes: true })
        } catch {}
        browser.action.setBadgeText({ text: '✅' })
        setTimeout(() => browser.action.setBadgeText({ text: '' }), 3000)
      } catch (e) {
        browser.action.setBadgeText({ text: '⚠️' })
        browser.runtime.sendMessage({ action: 'noteCreateError', error: e instanceof Error ? e.message : String(e) })
        setTimeout(() => browser.action.setBadgeText({ text: '' }), 3000)
      }
      return
    }

    if (info.menuItemId === SEARCH_NOTES_ID) {
      try {
        browser.action.setBadgeText({ text: '🔃' })
        console.log('[background] search notes for', text)
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          await storage?.local?.set?.({ searchPending: true, pendingSearchQuery: text, pendingSearchResults: [], pendingSearchAt: Date.now() })
        } catch {}
        let list: any[] | null = null
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          if (storage?.local?.get) {
            const stored = await storage.local.get(['cachedNotes'])
            if (Array.isArray(stored.cachedNotes)) list = stored.cachedNotes as any[]
          }
        } catch (e) {
          console.log('[background] storage read failed', e)
        }
        if (!list) {
          const res = await notesApi.getMyNotes()
          list = res.data || []
        }
        console.log('[background] cached notes', list)
        const q = text.toLowerCase()
        const results = (list || []).filter(n => {
          const title = (n.title || '').toLowerCase()
          const contentStr = typeof n.content === 'string' ? n.content : JSON.stringify(n.content ?? '')
          const content = (contentStr || '').toLowerCase()
          return title.includes(q) || content.includes(q)
        })
        console.log('[background] search results', results)
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          await storage?.local?.set?.({ pendingSearchResults: results, pendingSearchQuery: text, pendingSearchAt: Date.now() })
          await storage?.local?.set?.({ searchPending: false })
        } catch {}
        await updateSearchResultsMenu(results, text)
        browser.runtime.sendMessage({ action: 'searchResults', query: text, results })
        try { await (browser.action as any).openPopup?.() } catch {}
        browser.action.setBadgeText({ text: '✅' }) 
        setTimeout(() => browser.action.setBadgeText({ text: '' }), 3000)
      } catch (e) {
        browser.action.setBadgeText({ text: '⚠️' })
        browser.runtime.sendMessage({ action: 'searchError', error: e instanceof Error ? e.message : String(e) })
        console.error('[background] search error', e)
        try {
          const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
          await storage?.local?.set?.({ searchPending: false })
        } catch {}
        setTimeout(() => browser.action.setBadgeText({ text: '' }), 3000)
      }
    }
  })

  try {
    const storage: any = (browser as any).storage ?? (globalThis as any).chrome?.storage
    storage?.onChanged?.addListener?.((changes: Record<string, any>, area: string) => {
      if (area !== 'local') return
      const resChange = changes.pendingSearchResults
      const qChange = changes.pendingSearchQuery
      if (resChange?.newValue) {
        const results = resChange.newValue as any[]
        const query = qChange?.newValue || ''
        updateSearchResultsMenu(results, query)
      }
    })
    ;(async () => {
      try {
        const stored = await storage?.local?.get?.(['pendingSearchResults', 'pendingSearchQuery'])
        if (stored?.pendingSearchResults && Array.isArray(stored.pendingSearchResults)) {
          await updateSearchResultsMenu(stored.pendingSearchResults as any[], stored.pendingSearchQuery || '')
        }
      } catch {}
    })()
  } catch {}
});
