// RogueLearn.Extension/entrypoints/popup/App.tsx
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Calendar,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Zap,
  Info,
  Download,
  FileText, // Imported for the FLM card
  AlertTriangle,
} from "lucide-react";
import { Copy } from 'lucide-react';
import type { TranscriptData, ScheduleData } from "@/lib/types";
import notesApi from "@/api/notesApi";
import tagsApi from "@/api/tagsApi";
import subjectsApi from "@/api/subjectsApi"; // NEW: Import subjectsApi
import type { NoteDto } from "@/types/notes";
import type { Tag } from "@/types/tags";
import {
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
  getAppOrigin,
  checkIsAdmin,
} from "@/lib/auth";
import { browser } from "wxt/browser";

// FLM page status type
interface FlmPageStatus {
  isFlmDomain: boolean;
  isLoggedIn: boolean;
  isSyllabusDetailsPage: boolean;
  syllabusId: string | null;
  errorMessage: string | null;
}

// Admin status type
interface AdminStatus {
  isAdmin: boolean;
  roles: string[];
  email: string | null;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  // NEW: State to track FLM page status with detailed validation
  const [flmPageStatus, setFlmPageStatus] = useState<FlmPageStatus | null>(null);
  // NEW: State to track admin status for syllabus import permission
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);

  const [loading, setLoading] = useState<{
    transcript: boolean;
    schedule: boolean;
    syllabus: boolean; // NEW: Loading state for syllabus import
  }>({
    transcript: false,
    schedule: false,
    syllabus: false,
  });
  const [loadingMessage, setLoadingMessage] = useState<{
    transcript: string;
    schedule: string;
    syllabus: string; // NEW: Message for syllabus import
  }>({
    transcript: "",
    schedule: "",
    syllabus: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(
    null
  );
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [showScanningOverlay, setShowScanningOverlay] = useState(false);
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [tagsMap, setTagsMap] = useState<Record<string, string>>({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesPage, setNotesPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NoteDto[]>([]);
  const [showNoteActionOverlay, setShowNoteActionOverlay] = useState(false);
  const [noteActionMessage, setNoteActionMessage] = useState("");
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const hasPendingSearchRef = useRef<boolean>(false);
  const initialLoadTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    console.log("[popup] mount: starting initialization");

    // Check admin status for syllabus import permission
    checkIsAdmin().then((status) => {
      console.log("[popup] Admin status:", status);
      setAdminStatus(status);
    });

    // NEW: Check FLM page status when on FLM domain
    browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
      if (tabs[0]?.url && tabs[0].id) {
        const url = tabs[0].url;
        if (url.includes("flm.fpt.edu.vn")) {
          // Get detailed page status from content script
          try {
            const status = await browser.tabs.sendMessage(tabs[0].id, { action: "checkFlmPageStatus" }) as FlmPageStatus;
            console.log("[popup] FLM page status:", status);
            setFlmPageStatus(status);
          } catch (e) {
            console.warn("[popup] Failed to get FLM page status:", e);
            // Fallback - at least mark we're on FLM domain
            setFlmPageStatus({
              isFlmDomain: true,
              isLoggedIn: false,
              isSyllabusDetailsPage: false,
              syllabusId: null,
              errorMessage: "Could not check page status. The page may still be loading."
            });
          }
        }
      }
    });

    const handleMessage = (message: any) => {
      if (message.action === "scrapingComplete") {
        console.log("[popup] message: scrapingComplete", {
          type: "schedule",
          sessions: message.data?.sessions?.length,
        });
        setScheduleData(message.data);
        setLoading((prev) => ({ ...prev, schedule: false }));
        setLoadingMessage((prev) => ({
          ...prev,
          schedule: "Scraping complete!",
        }));
        setShowScanningOverlay(false); // Hide overlay on completion

        // Clear success message after 2 seconds
        setTimeout(() => {
          setLoadingMessage((prev) => ({ ...prev, schedule: "" }));
        }, 2000);
      } else if (message.action === "scrapingProgress") {
        // Update loading message with progress
        const type = message.type || "schedule";
        console.log("[popup] message: scrapingProgress", message);
        setLoadingMessage((prev) => ({
          ...prev,
          [type]: message.message || "Processing...",
        }));
        setLoading((prev) => ({ ...prev, [type]: true }));
        setShowScanningOverlay(true); // Keep overlay visible
      } else if (message.action === "scrapingError") {
        console.error("[popup] message: scrapingError", message.error);
        setError(message.error);
        setLoading((prev) => ({ ...prev, schedule: false }));
        setLoadingMessage((prev) => ({ ...prev, schedule: "" }));
        setShowScanningOverlay(false); // Hide overlay on error
      } else if (message.action === "searchResults") {
        console.log("[popup] message: searchResults", {
          query: message.query,
          count: message.results?.length || 0,
        });
        if (Array.isArray(message.results) && message.results.length > 0) {
          hasPendingSearchRef.current = true;
        }
        setSearchQuery(message.query || "");
        setSearchResults(message.results || []);
        if (message.results?.length > 0) {
          setTimeout(() => {
            searchResultsRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 300);
        }
      } else if (message.action === "searchError") {
        console.error("[popup] message: searchError", message.error);
        setError(message.error || "Failed to search notes");
      } else if (message.action === "noteCreated") {
        console.log("[popup] message: noteCreated", {
          id: message.noteId,
          title: message.title,
        });
        setLoadingMessage((prev) => ({
          ...prev,
          transcript: `Note created: ${message.title}`,
        }));
        setTimeout(
          () => setLoadingMessage((prev) => ({ ...prev, transcript: "" })),
          2000
        );
        setShowNoteActionOverlay(false);
        setNoteActionMessage("");
        loadNotes(true);
      } else if (message.action === "noteCreateError") {
        console.error("[popup] message: noteCreateError", message.error);
        setError(message.error || "Failed to create note");
        setShowNoteActionOverlay(false);
        setNoteActionMessage("");
      } else if (message.action === "noteCreateStart") {
        console.log("[popup] message: noteCreateStart");
        setNoteActionMessage("Summarizing and creating note...");
        setShowNoteActionOverlay(true);
      }
    };

    const onChanged = (changes: Record<string, any>, area: string) => {
      if (area !== "local") return;
      if (changes.pendingSearchResults) {
        const next = changes.pendingSearchResults.newValue;
        if (Array.isArray(next)) {
          console.log("[popup] storage.onChanged: pendingSearchResults", {
            count: next.length,
          });
          if (next.length > 0) {
            hasPendingSearchRef.current = true;
          }
          setSearchResults(next as any);
          if (next.length > 0) {
            setTimeout(() => {
              searchResultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }
        }
      }
      if (changes.pendingSearchQuery) {
        console.log("[popup] storage.onChanged: pendingSearchQuery", changes.pendingSearchQuery.newValue);
        setSearchQuery(changes.pendingSearchQuery.newValue || "");
      }
      if (changes.searchPending) {
        const val = !!changes.searchPending.newValue;
        console.log("[popup] storage.onChanged: searchPending", val);
        hasPendingSearchRef.current = val;
        if (!val && searchResults.length === 0) {
          if (!initialLoadTimeoutRef.current) {
            initialLoadTimeoutRef.current = setTimeout(() => {
              if (!hasPendingSearchRef.current && searchResults.length === 0) {
                console.log("[popup] searchPending cleared → loading notes");
                loadNotes(false);
              }
            }, 1000) as unknown as number;
          }
        }
      }
      if (
        changes.needsReloadNotes &&
        changes.needsReloadNotes.newValue === true
      ) {
        console.log("[popup] storage.onChanged: needsReloadNotes=true → loadNotes");
        loadNotes(true);
        browser.storage.local.set({ needsReloadNotes: false });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    const storageApi: any =
      (browser as any)?.storage ?? (globalThis as any)?.chrome?.storage;
    storageApi?.onChanged?.addListener?.(onChanged);

    checkLoginStatus();
    initializeData();

    const recheckPendingSearch = async () => {
      try {
        const stored = await storageApi?.local?.get?.([
          "pendingSearchResults",
          "pendingSearchQuery",
        ]);
        const results = stored?.pendingSearchResults;
        if (Array.isArray(results) && results.length > 0 && searchResults.length === 0) {
          console.log("[popup] recheckPendingSearch: apply results", results.length);
          setSearchResults(results as any);
          setSearchQuery(stored?.pendingSearchQuery || "");
          setTimeout(() => {
            searchResultsRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 300);
        }
      } catch { }
    };

    setTimeout(recheckPendingSearch, 400);
    setTimeout(recheckPendingSearch, 1200);

    (async () => {
      try {
        const res: any = await browser.runtime.sendMessage({ action: "getLastSearchResults" });
        if (res?.success && Array.isArray(res.results) && res.results.length > 0) {
          if (searchResults.length === 0) {
            console.log("[popup] background getLastSearchResults: apply", res.results.length);
            setSearchResults(res.results as any);
            setSearchQuery(res.query || "");
            setTimeout(() => {
              searchResultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }
        }
      } catch (e) {
        console.warn("[popup] getLastSearchResults: error", e);
      }
    })();
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
      storageApi?.onChanged?.removeListener?.(onChanged);
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }
    };
  }, []);

  const initializeData = async () => {
    setNotesLoading(true);
    let hasPendingSearch = false;
    console.log("[popup] initializeData: start");
    try {
      const storage = await browser.storage.local.get([
        "pendingSearchResults",
        "pendingSearchQuery",
        "cachedNotes",
        "cachedTagsMap",
        "searchPending",
      ]);

      if (Array.isArray(storage.cachedNotes)) {
        console.log("[popup] initializeData: cachedNotes", storage.cachedNotes.length);
        setNotes(storage.cachedNotes as any);
        if (storage.cachedTagsMap) {
          const tagCount = Object.keys(storage.cachedTagsMap || {}).length;
          console.log("[popup] initializeData: cachedTagsMap", tagCount);
          setTagsMap(storage.cachedTagsMap as any);
        }
      }

      if (
        Array.isArray(storage.pendingSearchResults) &&
        storage.pendingSearchResults.length > 0
      ) {
        console.log("[popup] initializeData: pendingSearchResults present", storage.pendingSearchResults.length);
        setSearchResults(storage.pendingSearchResults as any);
        setSearchQuery(storage.pendingSearchQuery || "");
        hasPendingSearch = true;
        hasPendingSearchRef.current = true;
        setTimeout(
          () =>
            searchResultsRef.current?.scrollIntoView({ behavior: "smooth" }),
          500
        );
      }
      if (!hasPendingSearch && storage.searchPending === true) {
        console.log("[popup] initializeData: searchPending=true");
        hasPendingSearch = true;
        hasPendingSearchRef.current = true;
      }
      if (!hasPendingSearch) {
        try {
          const res: any = await browser.runtime.sendMessage({ action: "getLastSearchResults" });
          if (res?.success && Array.isArray(res.results) && res.results.length > 0) {
            console.log("[popup] initializeData: bg last results", res.results.length);
            setSearchResults(res.results as any);
            setSearchQuery(res.query || "");
            hasPendingSearch = true;
            hasPendingSearchRef.current = true;
            setTimeout(() => {
              searchResultsRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 300);
          }
        } catch (e) {
          console.warn("[popup] initializeData: bg last results error", e);
        }
      }
    } catch (e) {
      console.error("[popup] Cache read error", e);
    } finally {
      console.log("[popup] initializeData: done", { hasPendingSearch });
      setNotesLoading(false);
    }

    if (!hasPendingSearch && !hasPendingSearchRef.current && searchResults.length === 0) {
      console.log("[popup] initializeData: schedule initial notes load (2000ms)");
      initialLoadTimeoutRef.current = setTimeout(() => {
        if (!hasPendingSearchRef.current && searchResults.length === 0) {
          console.log("[popup] initial notes load: proceeding");
          loadNotes(false);
        } else {
          console.log("[popup] initial notes load: cancelled due to search present");
        }
      }, 2000) as unknown as number;
    } else {
      console.log("[popup] initializeData: search present → skip initial load");
    }
  };

  const checkLoginStatus = async () => {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        setIsLoggedIn(false);
        return;
      }

      // Add a timeout! If content script doesn't answer in 500ms, assume false.
      // This prevents the popup from getting stuck on "Checking login..."
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve({ isLoggedIn: false }), 500)
      );

      console.log("[popup] checkLoginStatus: sending message to tab", tab.id);
      const messagePromise = browser.tabs.sendMessage(tab.id, {
        action: "checkLoginStatus",
      });

      const response: any = await Promise.race([
        messagePromise,
        timeoutPromise,
      ]);
      console.log("[popup] checkLoginStatus: response", response);
      setIsLoggedIn(response?.isLoggedIn || false);
    } catch (err) {
      // If we are on Google.com, sendMessage throws error. This is fine, just means not logged in.
      console.warn("[popup] checkLoginStatus: error", err);
      setIsLoggedIn(false);
    }
  };

  const loadNotes = async (force = false) => {
    // We don't set loading=true here if we already have notes, to prevent flashing
    if (notes.length === 0) setNotesLoading(true);
    console.log("[popup] loadNotes: start", { force, existing: notes.length });

    try {
      // 1. Try to get fresh data
      const resNotes = await notesApi.getMyNotes();
      const list = resNotes?.data || [];
      console.log("[popup] loadNotes: fetched", list.length);

      if (list.length > 0) {
        setNotes(list); // Update state only if we got data

        // Update tags
        try {
          const resTags = await tagsApi.getMyTags();
          const map: Record<string, string> = {};
          (resTags?.data?.tags || []).forEach((t: Tag) => {
            map[t.id] = t.name;
          });
          setTagsMap(map);
          console.log("[popup] loadNotes: tags fetched", Object.keys(map).length);

          // Save to storage for next time
          await browser.storage.local.set({
            cachedNotes: list,
            cachedTagsMap: map,
            cachedAt: Date.now(),
          });
          console.log("[popup] loadNotes: cached to storage");
        } catch (tagErr) {
          console.warn("[popup] loadNotes: update tags failed", tagErr);
        }
      }
    } catch (e) {
      console.log("[popup] loadNotes: API load failed, keep cached", e);
      // We do NOT setNotes([]) here. We keep the cached notes if API fails.
    } finally {
      console.log("[popup] loadNotes: done");
      setNotesLoading(false);
    }
  };

  const redirectToFAP = () => {
    console.log("[popup] redirectToFAP");
    browser.runtime.sendMessage({ action: "redirectToFAP" });
  };

  const cancelScraping = async () => {
    try {
      console.log("[popup] cancelScraping");
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("No active tab found");

      await browser.tabs.sendMessage(tab.id, { action: "cancelScraping" });

      setLoading({ transcript: false, schedule: false, syllabus: false });
      setLoadingMessage({ transcript: "", schedule: "", syllabus: "" });
      setShowScanningOverlay(false);
      setError("Scraping cancelled by user");

      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error("[popup] cancelScraping: error", err);
    }
  };

  // NEW: Handle Syllabus Import for FLM
  const handleImportSyllabus = async () => {
    setLoading(prev => ({ ...prev, syllabus: true }));
    setLoadingMessage(prev => ({ ...prev, syllabus: "Extracting page content..." }));
    setError(null);

    try {
      // 1. Scrape Content from FLM page via content script
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab");

      const scrapeResult: any = await browser.tabs.sendMessage(tab.id, { action: "scrapeSyllabus" });

      if (!scrapeResult || !scrapeResult.success) {
        throw new Error(scrapeResult?.error || "Failed to scrape page content");
      }

      setLoadingMessage(prev => ({ ...prev, syllabus: "Sending to AI for analysis (this may take 30s)..." }));

      // 2. Send to Backend API
      console.log('[popup] Sending to API, HTML length:', scrapeResult.data.rawHtml.length);
      const apiResult = await subjectsApi.importFromText(scrapeResult.data.rawHtml);

      // If we reach here, the API call was successful
      setLoadingMessage(prev => ({ ...prev, syllabus: "Done! Subject updated." }));
      setTimeout(() => {
        setLoading(prev => ({ ...prev, syllabus: false }));
        setLoadingMessage(prev => ({ ...prev, syllabus: "" }));
        // Show simple success feedback (could be replaced with a Toast component if available)
        alert(`Success! Imported ${apiResult.data.subjectCode} - ${apiResult.data.subjectName}`);
      }, 1000);

    } catch (err: any) {
      console.error("Import failed", err);
      setError(err.message || "Import failed");
      setLoading(prev => ({ ...prev, syllabus: false }));
    }
  };

  // Copy syllabus HTML to clipboard
  const handleCopySyllabusHtml = async () => {
    setLoading(prev => ({ ...prev, syllabus: true }));
    setLoadingMessage(prev => ({ ...prev, syllabus: "Extracting HTML..." }));
    setError(null);

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab");

      const scrapeResult: any = await browser.tabs.sendMessage(tab.id, { action: "scrapeSyllabus" });

      if (!scrapeResult || !scrapeResult.success) {
        throw new Error(scrapeResult?.error || "Failed to scrape page content");
      }

      // Copy to clipboard
      await navigator.clipboard.writeText(scrapeResult.data.rawHtml);
      
      setLoadingMessage(prev => ({ ...prev, syllabus: `Copied! (${scrapeResult.data.rawHtml.length} chars)` }));
      setTimeout(() => {
        setLoading(prev => ({ ...prev, syllabus: false }));
        setLoadingMessage(prev => ({ ...prev, syllabus: "" }));
      }, 2000);

    } catch (err: any) {
      console.error("Copy failed", err);
      setError(err.message || "Failed to copy HTML");
      setLoading(prev => ({ ...prev, syllabus: false }));
    }
  };

  const scrapeData = async (type: "transcript" | "schedule") => {
    console.log("[popup] scrapeData: start", type);
    setLoading((prev) => ({ ...prev, [type]: true }));
    setLoadingMessage((prev) => ({
      ...prev,
      [type]:
        type === "transcript"
          ? "Starting transcript scrape..."
          : "Starting schedule scrape...",
    }));
    setError(null);
    setShowScanningOverlay(true); // Show overlay when scraping starts

    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("No active tab found");

      const action =
        type === "transcript" ? "scrapeTranscript" : "scrapeSchedule";
      const response = await browser.tabs.sendMessage(tab.id, { action });

      if (response.success) {
        console.log("[popup] scrapeData: success", type);
        // Successfully completed - hide overlay and show data
        if (type === "transcript") {
          setTranscriptData(response.data);
          setLoadingMessage((prev) => ({
            ...prev,
            transcript: "Scraping complete!",
          }));
        } else {
          setScheduleData(response.data);
          setLoadingMessage((prev) => ({
            ...prev,
            schedule: "Scraping complete!",
          }));
        }

        // Clear success message after 2 seconds
        setTimeout(() => {
          setLoadingMessage((prev) => ({ ...prev, [type]: "" }));
        }, 2000);

        // Hide overlay on success
        setLoading((prev) => ({ ...prev, [type]: false }));
        setShowScanningOverlay(false);
      } else {
        // Check if it's a progress message
        if (
          response.error?.includes("progress") ||
          response.error?.includes("Loading") ||
          response.error?.includes("Scraping in progress") ||
          response.error?.includes("Transitioning")
        ) {
          console.log("[popup] scrapeData: progress", response.error);
          setLoadingMessage((prev) => ({ ...prev, [type]: response.error }));
          // Keep loading state and overlay active - don't hide anything
          return;
        } else {
          // Actual error - hide overlay and show error
          console.error("[popup] scrapeData: error", response.error);
          setError(response.error || "Failed to scrape data");
          setLoading((prev) => ({ ...prev, [type]: false }));
          setShowScanningOverlay(false);
        }
      }
    } catch (err) {
      console.error("[popup] scrapeData: exception", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading((prev) => ({ ...prev, [type]: false }));
      setShowScanningOverlay(false);
    }
  };

  const navigateTo = (page: "transcript" | "schedule") => {
    const action =
      page === "transcript" ? "navigateToTranscript" : "navigateToSchedule";
    console.log("[popup] navigateTo", page);
    browser.runtime.sendMessage({ action });
  };

  const clearSearch = async () => {
    console.log("[popup] clearSearch");
    setSearchResults([]);
    setSearchQuery("");
    try {
      await browser.storage.local.remove([
        "pendingSearchResults",
        "pendingSearchQuery",
      ]);
      console.log("[popup] clearSearch: storage keys removed");
    } catch { }
  };

  const renderSearchResults = () => {
    if (searchResults.length === 0) return null;
    return (
      <Card className="rpg-paper-card border-accent/50" ref={searchResultsRef}>
        <CardHeader className="pb-3 bg-accent/5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent rpg-glow-gold" />
              <div>
                <CardTitle className="text-base">
                  Found via Right-Click
                </CardTitle>
                <CardDescription className="text-xs">
                  {searchResults.length} results for "{searchQuery}"
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-8"
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[220px]">
            <div className="space-y-3 pt-2">
              {searchResults.map((n) => (
                <div
                  key={n.id}
                  className="p-3 border border-accent/20 bg-accent/5 rounded-md"
                >
                  <div className="font-medium">{n.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(n.tagIds || []).map((id) => (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="bg-background"
                      >
                        {tagsMap[id] || id}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const origin = getAppOrigin();
                        const url = `${origin}/arsenal/${n.id}`;
                        console.log("[popup] openNote", { id: n.id, url });
                        browser.tabs.create({ url });
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Open Note
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  const downloadAsImage = async (type: "transcript" | "schedule") => {
    const data = type === "transcript" ? transcriptData : scheduleData;
    if (!data) {
      console.error("No data to download");
      return;
    }

    try {
      // Create a canvas to render data as image
      const canvas = document.createElement("canvas");
      canvas.width = 800;
      canvas.height =
        type === "transcript"
          ? Math.max(600, (transcriptData?.subjects.length || 0) * 35 + 200)
          : Math.max(600, (scheduleData?.sessions.length || 0) * 30 + 200);

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        console.error("Could not get canvas context");
        return;
      }

      // Background
      ctx.fillStyle = "#1A0D08"; // Deep brown
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = "#D4AF37"; // Gold
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText(
        "RogueLearn - " + (type === "transcript" ? "Transcript" : "Schedule"),
        40,
        50
      );

      ctx.fillStyle = "#FAFAFA"; // White
      ctx.font = "14px Arial, sans-serif";

      if (type === "transcript" && transcriptData) {
        ctx.fillText(
          `Student: ${transcriptData.studentName} (${transcriptData.studentId})`,
          40,
          90
        );
        ctx.fillText(
          `Total Courses: ${transcriptData.subjects.length}`,
          40,
          115
        );

        // Draw table header
        let yPos = 160;
        ctx.fillStyle = "#D4AF37";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Code", 40, yPos);
        ctx.fillText("Course Name", 140, yPos);
        ctx.fillText("Grade", 480, yPos);
        ctx.fillText("Semester", 560, yPos);
        ctx.fillText("Status", 660, yPos); // Added status column

        // Draw courses
        ctx.font = "13px Arial, sans-serif";
        transcriptData.subjects.forEach((subject, index) => {
          yPos += 35;
          ctx.fillStyle = index % 2 === 0 ? "#FAFAFA" : "#D0D0D0";
          ctx.fillText(subject.subjectCode, 40, yPos);
          const courseName =
            subject.subjectName.length > 35
              ? subject.subjectName.substring(0, 32) + "..."
              : subject.subjectName;
          ctx.fillText(courseName, 140, yPos);

          // Grade with color
          ctx.fillStyle = subject.status === "Passed" ? "#22c55e" : "#dc2626";
          ctx.font = "bold 14px Arial, sans-serif";
          ctx.fillText(subject.grade, 480, yPos);

          ctx.fillStyle = index % 2 === 0 ? "#FAFAFA" : "#D0D0D0";
          ctx.font = "13px Arial, sans-serif";
          ctx.fillText(subject.semester, 560, yPos);

          // Status with color
          if (subject.status === 'Passed') ctx.fillStyle = '#22c55e';
          else if (subject.status === 'Studying') ctx.fillStyle = '#3b82f6';
          else ctx.fillStyle = '#dc2626';

          ctx.font = "bold 13px Arial, sans-serif";
          ctx.fillText(subject.status || '-', 660, yPos);
        });
      } else if (type === "schedule" && scheduleData) {
        ctx.fillText(`Week Range: ${scheduleData.weekRange}`, 40, 90);
        ctx.fillText(
          `Total Sessions: ${scheduleData.sessions.length}`,
          40,
          115
        );

        // Draw sessions
        let yPos = 160;
        ctx.fillStyle = "#D4AF37";
        ctx.font = "bold 14px Arial, sans-serif";
        ctx.fillText("Date", 40, yPos);
        ctx.fillText("Subject", 140, yPos);
        ctx.fillText("Slot", 420, yPos);
        ctx.fillText("Room", 500, yPos);
        ctx.fillText("Status", 620, yPos);

        ctx.font = "13px Arial, sans-serif";
        scheduleData.sessions.forEach((session, index) => {
          yPos += 30;
          ctx.fillStyle = index % 2 === 0 ? "#FAFAFA" : "#D0D0D0";
          ctx.fillText(session.date, 40, yPos);
          ctx.fillText(session.subjectCode, 140, yPos);
          ctx.fillText(`Slot ${session.slotNumber}`, 420, yPos);
          ctx.fillText(session.room.substring(0, 15), 500, yPos);

          const statusText = session.status || "upcoming";
          ctx.fillStyle =
            statusText === "attended"
              ? "#22c55e"
              : statusText === "absent"
                ? "#dc2626"
                : "#D0D0D0";
          ctx.font = "bold 12px Arial, sans-serif";
          ctx.fillText(statusText, 620, yPos);
          ctx.font = "13px Arial, sans-serif";
        });
      }

      // Footer
      const yPos = canvas.height - 30;
      ctx.fillStyle = "#A0A0A0";
      ctx.font = "12px Arial, sans-serif";
      ctx.fillText(
        `Generated by RogueLearn Helper - ${new Date().toLocaleString()}`,
        40,
        yPos
      );

      console.log("Canvas created, converting to blob...");

      // Convert to blob and download
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error("Failed to create blob from canvas");
            return;
          }

          console.log("Blob created, size:", blob.size);

          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `roguelearn-${type}-${Date.now()}.png`;

          console.log("Triggering download:", a.download);

          // Append to body to ensure it works in Firefox
          document.body.appendChild(a);
          a.click();

          // Clean up
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log("Download complete, cleaned up");
          }, 100);
        },
        "image/png",
        1.0
      );
    } catch (error) {
      console.error("Error creating image:", error);
      setError("Failed to create image. Please try again.");
    }
  };

  const copyAsHtml = async (type: 'transcript' | 'schedule') => {
    const data = type === 'transcript' ? transcriptData : scheduleData;
    if (!data) {
      return;
    }
    if (type !== 'transcript' || !transcriptData) {
      return;
    }
    const header = `<h2>Transcript</h2><p>Student: ${transcriptData.studentName} (${transcriptData.studentId})</p>`;
    const rows = transcriptData.subjects
      .map(
        (s) => {
          // Color code status for HTML export
          let statusColor = '#333';
          if (s.status === 'Passed') statusColor = '#22c55e'; // Green
          else if (s.status === 'Not passed') statusColor = '#dc2626'; // Red
          else if (s.status === 'Studying') statusColor = '#3b82f6'; // Blue

          return `<tr><td>${s.subjectCode}</td><td>${s.subjectName}</td><td>${s.grade}</td><td>${s.semester}</td><td style="color:${statusColor};font-weight:bold">${s.status}</td></tr>`;
        }
      )
      .join('');
    // Added Status Column to Header
    const table = `<table><thead><tr><th>Code</th><th>Course Name</th><th>Grade</th><th>Semester</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
    const style = `<style>body{font-family:Arial,Helvetica,sans-serif;background:#fff;color:#111;padding:20px}h2{margin:0 0 10px}p{margin:0 0 16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;text-align:left}thead th{background:#f3f4f6}tbody tr:nth-child(even){background:#fafafa}</style>`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">${style}<title>Transcript</title></head><body>${header}${table}</body></html>`;
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      setLoadingMessage((prev) => ({ ...prev, transcript: 'HTML copied to clipboard' }));
      setTimeout(() => {
        setLoadingMessage((prev) => ({ ...prev, transcript: '' }));
      }, 2000);
    } catch (e) {
      try {
        await navigator.clipboard.writeText(html);
        setLoadingMessage((prev) => ({ ...prev, transcript: 'HTML copied to clipboard' }));
        setTimeout(() => {
          setLoadingMessage((prev) => ({ ...prev, transcript: '' }));
        }, 2000);
      } catch (err) {
        setError('Failed to copy HTML to clipboard');
      }
    }
  };

  // Loading state (only show if not on FLM domain)
  if (isLoggedIn === null && !flmPageStatus?.isFlmDomain) {
    return (
      <div className="w-[600px] h-[500px] bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Checking login status...</p>
        </div>
      </div>
    );
  }

  // FLM Page View - Show FLM-specific UI regardless of FAP login status
  if (flmPageStatus?.isFlmDomain) {
    return (
      <div className="w-[600px] min-h-[70vh] bg-background overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent rpg-glow-gold" />
              <h1 className="text-lg font-bold text-foreground">
                RogueLearn Helper
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="bg-primary/20 text-primary border-primary/50"
              >
                FLM Mode
              </Badge>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <Card className="border-destructive/50 bg-destructive/10">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-destructive font-medium">Error</p>
                    <p className="text-xs text-muted-foreground mt-1">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="h-6 w-6 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FLM IMPORT CARD - Only show for admin users */}
          {adminStatus?.isAdmin ? (
            <Card className={`rpg-paper-card ${flmPageStatus.isSyllabusDetailsPage ? 'border-primary/50 bg-primary/5' : 'border-warning/50 bg-warning/5'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`h-5 w-5 ${flmPageStatus.isSyllabusDetailsPage ? 'text-primary' : 'text-warning'}`} />
                    <div>
                      <CardTitle className="text-base">Admin: Syllabus Import</CardTitle>
                      <CardDescription className="text-xs">
                        {flmPageStatus.isSyllabusDetailsPage 
                          ? `Ready to import syllabus (ID: ${flmPageStatus.syllabusId})` 
                          : "Navigate to a Syllabus Details page to import"}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Status indicators */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="default" className="text-xs bg-primary">
                    Admin: {adminStatus.roles.join(', ')}
                  </Badge>
                  <Badge variant={flmPageStatus.isLoggedIn ? "default" : "destructive"} className="text-xs">
                    {flmPageStatus.isLoggedIn ? "Logged In to FLM" : "Not Logged In to FLM"}
                  </Badge>
                  <Badge variant={flmPageStatus.isSyllabusDetailsPage ? "default" : "secondary"} className="text-xs">
                    {flmPageStatus.isSyllabusDetailsPage ? "On Syllabus Page" : "Not on Syllabus Page"}
                  </Badge>
                </div>
                
                {loading.syllabus && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>{loadingMessage.syllabus}</span>
                  </div>
                )}
                
                {/* Show warning if not on correct page */}
                {!flmPageStatus.isSyllabusDetailsPage && (
                  <div className="flex items-start gap-2 text-xs text-warning mb-3 p-2 bg-warning/10 rounded-md">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{flmPageStatus.errorMessage || "Navigate to a subject's Syllabus Details page to import (URL should contain: SyllabusDetails?sylID=...)."}</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleImportSyllabus}
                    disabled={loading.syllabus || !flmPageStatus.isSyllabusDetailsPage}
                    className="flex-1 rpg-glow-gold"
                  >
                    <Zap className="h-3 w-3 mr-2" />
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopySyllabusHtml}
                    disabled={loading.syllabus || !flmPageStatus.isSyllabusDetailsPage}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-2" />
                    Copy HTML
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Not admin - show info card */
            <Card className="bg-muted/50 border-muted">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">FLM Page Detected</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {adminStatus === null 
                        ? "Checking permissions..." 
                        : "Syllabus import is only available for admin users. Please log in to RogueLearn with an admin account."}
                    </p>
                    {adminStatus && !adminStatus.isAdmin && adminStatus.email && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Logged in as: {adminStatus.email}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helper Tip for FLM - only show for admins */}
          {adminStatus?.isAdmin && (
            <Card className="bg-info/10 border-info/30">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Tip:</strong> To import a syllabus, navigate to a subject's Syllabus Details page on FLM. 
                    The URL should look like: <code className="bg-muted px-1 rounded">flm.fpt.edu.vn/gui/role/student/SyllabusDetails?sylID=...</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes section still accessible on FLM */}
          <Card className="rpg-paper-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-base">My Notes</CardTitle>
                    <CardDescription className="text-xs">
                      Titles with tags (5 per page)
                    </CardDescription>
                  </div>
                </div>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadNotes(true)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Loading notes...
                  </p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    No notes available
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[180px]">
                    <div className="space-y-3">
                      {notes
                        .slice((notesPage - 1) * 5, (notesPage - 1) * 5 + 5)
                        .map((n) => (
                          <div key={n.id} className="p-3 border rounded-md">
                            <div className="font-medium">{n.title}</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {(n.tagIds || []).map((id) => (
                                <Badge key={id} variant="secondary">
                                  {tagsMap[id] || id}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center justify-between mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                      disabled={notesPage <= 1}
                    >
                      Prev
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Page {notesPage} of{" "}
                      {Math.max(1, Math.ceil(notes.length / 5))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNotesPage((p) =>
                          Math.min(
                            Math.max(1, Math.ceil(notes.length / 5)),
                            p + 1
                          )
                        )
                      }
                      disabled={notesPage >= Math.ceil(notes.length / 5)}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not logged in state (FAP-specific, only when NOT on FLM)
  if (!isLoggedIn) {
    return (
      <div className="w-[600px] h-[70vh] bg-background p-6">
        <div className="h-full flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent rpg-glow-gold" />
              <h1 className="text-xl font-bold text-foreground">
                RogueLearn Helper
              </h1>
            </div>
            <Button variant="ghost" size="icon" onClick={checkLoginStatus}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Error Card */}
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Not Logged In to FAP
              </CardTitle>
              <CardDescription className="text-destructive-foreground/80">
                You can still view your notes below. Scraping requires FAP
                login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={redirectToFAP} className="w-full rpg-glow-gold">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to FAP Login
              </Button>
            </CardContent>
          </Card>

          {renderSearchResults()}
          {/* Notes accessible without FAP login */}
          <Card className="rpg-paper-card">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-base">My Notes</CardTitle>
                    <CardDescription className="text-xs">
                      Titles with tags (5 per page)
                    </CardDescription>
                  </div>
                </div>
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadNotes(true)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {notesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Loading notes...
                  </p>
                </div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-muted-foreground">
                    No notes available
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {notes
                      .slice((notesPage - 1) * 5, (notesPage - 1) * 5 + 5)
                      .map((n) => (
                        <div key={n.id} className="p-3 border rounded-md">
                          <div className="font-medium">{n.title}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(n.tagIds || []).map((id) => (
                              <Badge key={id} variant="secondary">
                                {tagsMap[id] || id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                      disabled={notesPage <= 1}
                    >
                      Prev
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      Page {notesPage} of{" "}
                      {Math.max(1, Math.ceil(notes.length / 5))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setNotesPage((p) =>
                          Math.min(
                            Math.max(1, Math.ceil(notes.length / 5)),
                            p + 1
                          )
                        )
                      }
                      disabled={notesPage >= Math.ceil(notes.length / 5)}
                    >
                      Next
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {searchResults.length > 0 && (
            <Card className="rpg-paper-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-accent" />
                    <div>
                      <CardTitle className="text-base">
                        Search Results
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Found {searchResults.length} for "{searchQuery}"
                      </CardDescription>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchResults([]);
                        setSearchQuery("");
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[220px]">
                  <div className="space-y-3">
                    {searchResults.map((n) => (
                      <div key={n.id} className="p-3 border rounded-md">
                        <div className="font-medium">{n.title}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(n.tagIds || []).map((id) => (
                            <Badge key={id} variant="secondary">
                              {tagsMap[id] || id}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const origin = getAppOrigin();
                              const url = `${origin}/arsenal/${n.id}`;
                              browser.tabs.create({ url });
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" /> Open Note
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // MAIN APP VIEW (Logged In)
  return (
    <div className="w-[600px] min-h-[70vh] bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent rpg-glow-gold" />
            <h1 className="text-lg font-bold text-foreground">
              RogueLearn Helper
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-success/20 text-success border-success/50"
            >
              Active
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={checkLoginStatus}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && (
          <Card className="border-destructive/50 bg-destructive/10">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-destructive font-medium">Error</p>
                  <p className="text-xs text-muted-foreground mt-1">{error}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Title */}
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">
            Quick Actions
          </h2>
        </div>

        {/* Transcript Card */}
        <Card className="rpg-paper-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                <div>
                  <CardTitle className="text-base">Transcript</CardTitle>
                  <CardDescription className="text-xs">
                    View and scrape your grades
                  </CardDescription>
                </div>
              </div>
              {transcriptData && (
                <Badge variant="secondary" className="text-xs">
                  {transcriptData.subjects.length} courses
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Loading message */}
            {loading.transcript && loadingMessage.transcript && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{loadingMessage.transcript}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo("transcript")}
                className="flex-1"
                disabled={loading.transcript}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Page
              </Button>
              <Button
                size="sm"
                onClick={() => scrapeData("transcript")}
                disabled={loading.transcript}
                className="flex-1 rpg-glow-gold"
              >
                {loading.transcript ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-1" />
                    Scrape Data
                  </>
                )}
              </Button>
            </div>
            {/* Download button */}
            {transcriptData && !loading.transcript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAsImage("transcript")}
                className="w-full"
              >
                <Download className="h-3 w-3 mr-1" />
                Download as Image
              </Button>
            )}
            {transcriptData && !loading.transcript && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyAsHtml('transcript')}
                className="w-full"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy HTML
              </Button>
            )}
          </CardContent>
        </Card>

        {renderSearchResults()}

        <Card className="rpg-paper-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                <div>
                  <CardTitle className="text-base">My Notes</CardTitle>
                  <CardDescription className="text-xs">
                    Titles with tags (5 per page)
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  Loading notes...
                </p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground">
                  No notes available
                </p>
              </div>
            ) : (
              <>
                <ScrollArea className="h-[220px]">
                  <div className="space-y-3">
                    {notes
                      .slice((notesPage - 1) * 5, (notesPage - 1) * 5 + 5)
                      .map((n) => (
                        <div key={n.id} className="p-3 border rounded-md">
                          <div className="font-medium">{n.title}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(n.tagIds || []).map((id) => (
                              <Badge key={id} variant="secondary">
                                {tagsMap[id] || id}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNotesPage((p) => Math.max(1, p - 1))}
                    disabled={notesPage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Page {notesPage} of{" "}
                    {Math.max(1, Math.ceil(notes.length / 5))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNotesPage((p) =>
                        Math.min(
                          Math.max(1, Math.ceil(notes.length / 5)),
                          p + 1
                        )
                      )
                    }
                    disabled={notesPage >= Math.ceil(notes.length / 5)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule Card */}
        <Card className="rpg-paper-card">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-accent" />
                <div>
                  <CardTitle className="text-base">Schedule</CardTitle>
                  <CardDescription className="text-xs">
                    View and scrape your class schedule
                  </CardDescription>
                </div>
              </div>
              {scheduleData && (
                <Badge variant="secondary" className="text-xs">
                  {scheduleData.sessions.length} sessions
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Loading message */}
            {loading.schedule && loadingMessage.schedule && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>{loadingMessage.schedule}</span>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo("schedule")}
                className="flex-1"
                disabled={loading.schedule}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Page
              </Button>
              <Button
                size="sm"
                onClick={() => scrapeData("schedule")}
                disabled={loading.schedule}
                className="flex-1 rpg-glow-gold"
              >
                {loading.schedule ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3 mr-1" />
                    Scrape Schedule
                  </>
                )}
              </Button>
            </div>
            {/* Cancel button when loading */}
            {loading.schedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={cancelScraping}
                className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                Cancel Scraping
              </Button>
            )}
            {/* Download button */}
            {scheduleData && !loading.schedule && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAsImage("schedule")}
                className="w-full"
              >
                <Download className="h-3 w-3 mr-1" />
                Download as Image
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Helper Tip */}
        <Card className="bg-info/10 border-info/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Make sure you're on the FAP portal page
                before scraping. After scraping, you can download your data as
                an image.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanning Overlay */}
      <Dialog open={showScanningOverlay} onOpenChange={() => { }}>
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Scraping in Progress
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-12 w-12 animate-spin text-accent rpg-glow-gold" />
              </div>
              <p className="text-center text-sm font-semibold text-foreground">
                Please do not close this extension!
              </p>
              <p className="text-center text-xs text-muted-foreground">
                The extension is currently scraping data from FAP. Closing the
                popup will interrupt the process.
              </p>
              {(loadingMessage.transcript || loadingMessage.schedule) && (
                <div className="mt-4 rounded-md bg-muted/50 p-3">
                  <p className="text-center text-xs text-muted-foreground">
                    {loadingMessage.transcript || loadingMessage.schedule}
                  </p>
                </div>
              )}
              <div className="flex justify-center pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={cancelScraping}
                  className="w-full sm:w-auto"
                >
                  Cancel Scraping
                </Button>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showNoteActionOverlay}
        onOpenChange={setShowNoteActionOverlay}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Loader2 className="h-5 w-5 animate-spin" />
              {noteActionMessage || "Processing..."}
            </DialogTitle>
            <DialogDescription>
              Please wait while the note is created.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;