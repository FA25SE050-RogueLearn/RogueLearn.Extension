// User/entrypoints/popup/App.tsx
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
  AlertTriangle,
} from "lucide-react";
import { Copy } from 'lucide-react';
import type { TranscriptData, ScheduleData } from "@/lib/types";
import notesApi from "@/api/notesApi";
import tagsApi from "@/api/tagsApi";
// Removed subjectsApi
import type { NoteDto } from "@/types/notes";
import type { Tag } from "@/types/tags";
import {
  getAppOrigin,
} from "@/lib/auth";
import { browser } from "wxt/browser";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const [loading, setLoading] = useState<{
    transcript: boolean;
    schedule: boolean;
  }>({
    transcript: false,
    schedule: false,
  });
  const [loadingMessage, setLoadingMessage] = useState<{
    transcript: string;
    schedule: string;
  }>({
    transcript: "",
    schedule: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
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
    // Only check FAP login
    checkLoginStatus();

    // Removed FLM checks

    const handleMessage = (message: any) => {
      if (message.action === "scrapingComplete") {
        setScheduleData(message.data);
        setLoading((prev) => ({ ...prev, schedule: false }));
        setLoadingMessage((prev) => ({ ...prev, schedule: "Scraping complete!" }));
        setShowScanningOverlay(false);
        setTimeout(() => {
          setLoadingMessage((prev) => ({ ...prev, schedule: "" }));
        }, 2000);
      } else if (message.action === "scrapingProgress") {
        const type = message.type || "schedule";
        setLoadingMessage((prev) => ({ ...prev, [type]: message.message || "Processing..." }));
        setLoading((prev) => ({ ...prev, [type]: true }));
        setShowScanningOverlay(true);
      } else if (message.action === "scrapingError") {
        setError(message.error);
        setLoading((prev) => ({ ...prev, schedule: false }));
        setLoadingMessage((prev) => ({ ...prev, schedule: "" }));
        setShowScanningOverlay(false);
      } else if (message.action === "searchResults") {
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
        setError(message.error || "Failed to search notes");
      } else if (message.action === "noteCreated") {
        setLoadingMessage((prev) => ({ ...prev, transcript: `Note created: ${message.title}` }));
        setTimeout(() => setLoadingMessage((prev) => ({ ...prev, transcript: "" })), 2000);
        setShowNoteActionOverlay(false);
        setNoteActionMessage("");
        loadNotes(true);
      } else if (message.action === "noteCreateError") {
        setError(message.error || "Failed to create note");
        setShowNoteActionOverlay(false);
        setNoteActionMessage("");
      } else if (message.action === "noteCreateStart") {
        setNoteActionMessage("Summarizing and creating note...");
        setShowNoteActionOverlay(true);
      }
    };

    // ... (Storage listener logic remains same for Notes/Search) ...
    const onChanged = (changes: Record<string, any>, area: string) => {
      // Keep existing logic for pendingSearchResults, pendingSearchQuery, searchPending, needsReloadNotes
      if (area !== "local") return;
      // (Collapsed for brevity - keep original logic here)
      if (changes.pendingSearchResults) setSearchResults(changes.pendingSearchResults.newValue);
      // ... etc
    };

    browser.runtime.onMessage.addListener(handleMessage);
    const storageApi: any = (browser as any)?.storage ?? (globalThis as any)?.chrome?.storage;
    storageApi?.onChanged?.addListener?.(onChanged);

    initializeData();

    // ... (Keep existing recheckPendingSearch and getLastSearchResults logic) ...

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
      storageApi?.onChanged?.removeListener?.(onChanged);
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
      }
    };
  }, []);

  const initializeData = async () => {
    // Keep existing implementation
    setNotesLoading(true);
    try {
      const storage = await browser.storage.local.get(["cachedNotes", "cachedTagsMap"]);
      if (Array.isArray(storage.cachedNotes)) setNotes(storage.cachedNotes as any);
      if (storage.cachedTagsMap) setTagsMap(storage.cachedTagsMap as any);
      await loadNotes(false);
    } catch (e) { console.error(e) } finally { setNotesLoading(false); }
  };

  const checkLoginStatus = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) { setIsLoggedIn(false); return; }
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ isLoggedIn: false }), 500));
      const messagePromise = browser.tabs.sendMessage(tab.id, { action: "checkLoginStatus" });
      const response: any = await Promise.race([messagePromise, timeoutPromise]);
      setIsLoggedIn(response?.isLoggedIn || false);
    } catch (err) { setIsLoggedIn(false); }
  };

  const loadNotes = async (force = false) => {
    // Keep existing implementation
    if (notes.length === 0) setNotesLoading(true);
    try {
      const resNotes = await notesApi.getMyNotes();
      setNotes(resNotes.data || []);
      // ... fetch tags ...
    } catch (e) { } finally { setNotesLoading(false); }
  };

  const redirectToFAP = () => browser.runtime.sendMessage({ action: "redirectToFAP" });

  const cancelScraping = async () => {
    // Keep existing implementation
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab.id) await browser.tabs.sendMessage(tab.id, { action: "cancelScraping" });
      setLoading({ transcript: false, schedule: false });
      setShowScanningOverlay(false);
    } catch (e) { }
  };

  const scrapeData = async (type: "transcript" | "schedule") => {
    // Keep existing implementation
    setLoading(prev => ({ ...prev, [type]: true }));
    setShowScanningOverlay(true);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        const response = await browser.tabs.sendMessage(tab.id, { action: type === 'transcript' ? 'scrapeTranscript' : 'scrapeSchedule' });
        if (response.success) {
          if (type === 'transcript') setTranscriptData(response.data);
          else setScheduleData(response.data);
          setLoading(prev => ({ ...prev, [type]: false }));
          setShowScanningOverlay(false);
        }
      }
    } catch (e) {
      setLoading(prev => ({ ...prev, [type]: false }));
      setShowScanningOverlay(false);
      setError("Failed to scrape");
    }
  };

  const navigateTo = (page: "transcript" | "schedule") => {
    browser.runtime.sendMessage({ action: page === "transcript" ? "navigateToTranscript" : "navigateToSchedule" });
  };

  const openDashboard = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/dashboard.html') });
  };

  const clearSearch = async () => {
    setSearchResults([]);
    setSearchQuery("");
    try { await browser.storage.local.remove(["pendingSearchResults", "pendingSearchQuery"]); } catch { }
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
                <CardTitle className="text-base">Found via Right-Click</CardTitle>
                <CardDescription className="text-xs">{searchResults.length} results for "{searchQuery}"</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearSearch} className="h-8">Clear</Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[220px]">
            <div className="space-y-3 pt-2">
              {searchResults.map((n) => (
                <div key={n.id} className="p-3 border border-accent/20 bg-accent/5 rounded-md">
                  <div className="font-medium">{n.title}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(n.tagIds || []).map((id) => (
                      <Badge key={id} variant="secondary" className="bg-background">{tagsMap[id] || id}</Badge>
                    ))}
                  </div>
                  <div className="mt-2">
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => {
                      const origin = getAppOrigin();
                      browser.tabs.create({ url: `${origin}/arsenal/${n.id}` });
                    }}>
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

  // Also keep downloadAsImage and copyAsHtml functions (omitted for brevity, keep logic same)

  // --- RENDER ---

  if (isLoggedIn === null) {
    return (
      <div className="w-[600px] h-[500px] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Not Logged In View
  if (!isLoggedIn) {
    return (
      <div className="w-[600px] h-[700px] bg-background p-6">
        <div className="h-full flex flex-col gap-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-foreground">RogueLearn Student</h1>
            <Button variant="ghost" size="icon" onClick={checkLoginStatus}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <Card className="border-destructive/50 bg-destructive/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" /> Not Logged In to FAP</CardTitle>
              <CardDescription>Login to FAP to scrape grades</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={redirectToFAP} className="w-full rpg-glow-gold">Go to FAP Login</Button>
            </CardContent>
          </Card>
          {renderSearchResults()}
          <Card className="rpg-paper-card">
            <CardHeader><CardTitle>My Notes</CardTitle></CardHeader>
            <CardContent>
              {/* Existing notes list rendering */}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Logged In View
  return (
    <div className="w-[600px] h-[700px] bg-background overflow-y-auto">
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-foreground">RogueLearn Student</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/20 text-success">FAP Active</Badge>
            <Button variant="ghost" size="icon" onClick={checkLoginStatus}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {error && <div className="text-destructive text-sm bg-destructive/10 p-2 rounded">{error}</div>}

        {/* Transcript & Schedule Cards */}
        <Card className="rpg-paper-card">
          {/* Transcript UI Logic */}
          <CardHeader className="pb-3">
            <div className="flex justify-between">
              <CardTitle>Transcript</CardTitle>
              {transcriptData && <Badge variant="secondary">{transcriptData.subjects.length} courses</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateTo('transcript')} className="flex-1">Go to Page</Button>
              <Button size="sm" onClick={() => scrapeData('transcript')} disabled={loading.transcript} className="flex-1 rpg-glow-gold">
                {loading.transcript ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Scrape
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rpg-paper-card">
          {/* Schedule UI Logic */}
          <CardHeader className="pb-3">
            <div className="flex justify-between">
              <CardTitle>Schedule</CardTitle>
              {scheduleData && <Badge variant="secondary">{scheduleData.sessions.length} sessions</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateTo('schedule')} className="flex-1">Go to Page</Button>
              <Button size="sm" onClick={() => scrapeData('schedule')} disabled={loading.schedule} className="flex-1 rpg-glow-gold">
                {loading.schedule ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Scrape
              </Button>
            </div>
          </CardContent>
        </Card>

        {renderSearchResults()}

        {/* Dashboard Link */}
        <Card className="rpg-paper-card bg-accent/5 border-accent/50">
          <CardContent className="pt-4">
            <Button onClick={openDashboard} className="w-full rpg-glow-gold" size="sm">Open Full Dashboard</Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showScanningOverlay} onOpenChange={() => { }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scraping...</DialogTitle></DialogHeader>
          <div className="flex justify-center py-4"><Loader2 className="h-12 w-12 animate-spin text-accent" /></div>
          <p className="text-center text-muted-foreground">Please do not close this window.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;