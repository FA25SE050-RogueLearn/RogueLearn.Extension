import { useState, useEffect, useRef } from "react";
import { browser } from "wxt/browser"; // Ensure explicit import
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
import type { TranscriptData, ScheduleData } from "@/lib/types";
import notesApi from "@/api/notesApi";
import tagsApi from "@/api/tagsApi";
import type { NoteDto } from "@/types/notes";
import type { Tag } from "@/types/tags";
import {
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
  getAppOrigin,
} from "@/lib/auth";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  
  // Scrape loading states
  const [loading, setLoading] = useState<{
    transcript: boolean;
    schedule: boolean;
  }>({ transcript: false, schedule: false });
  
  const [loadingMessage, setLoadingMessage] = useState<{
    transcript: string;
    schedule: string;
  }>({ transcript: "", schedule: "" });
  
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [showScanningOverlay, setShowScanningOverlay] = useState(false);
  
  // Notes states
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [tagsMap, setTagsMap] = useState<Record<string, string>>({});
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesPage, setNotesPage] = useState(1);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NoteDto[]>([]);
  
  // Note Creation states
  const [showNoteActionOverlay, setShowNoteActionOverlay] = useState(false);
  const [noteActionMessage, setNoteActionMessage] = useState("");

  // Ref for auto-scrolling to results
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // 1. INITIALIZATION & DATA LOADING
  useEffect(() => {
    // Check FAP Login Status
    checkLoginStatus();

    // Load initial data (Notes + Pending Search)
    initializeData();

    // Setup Storage Listener for real-time updates
    const onStorageChanged = (changes: Record<string, any>, area: string) => {
      if (area !== "local") return;
      
      // Handle Search Results updating from background
      if (changes.pendingSearchResults) {
        const next = changes.pendingSearchResults.newValue;
        if (Array.isArray(next)) {
          setSearchResults(next);
          // Scroll to results if we found some
          if (next.length > 0) {
            setTimeout(() => searchResultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
          }
        }
      }
      
      // Handle Query update
      if (changes.pendingSearchQuery) {
        setSearchQuery(changes.pendingSearchQuery.newValue || "");
      }

      // Handle Reload Request (e.g. after creating a note)
      if (changes.needsReloadNotes?.newValue === true) {
        loadNotes(true);
        browser.storage.local.set({ needsReloadNotes: false });
      }
    };

    browser.storage.onChanged.addListener(onStorageChanged);
    
    // Setup Message Listener
    const onMessage = (message: any) => {
       if (message.action === "searchResults") {
        setSearchQuery(message.query || "");
        setSearchResults(message.results || []);
        if (message.results?.length > 0) {
           setTimeout(() => searchResultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
      } 
      // ... (Rest of your message handlers for scraping/creation) ...
      else if (message.action === "noteCreated") {
        setLoadingMessage((prev) => ({...prev, transcript: `Note created: ${message.title}`}));
        setTimeout(() => setLoadingMessage((prev) => ({ ...prev, transcript: "" })), 2000);
        setShowNoteActionOverlay(false);
        setNoteActionMessage("");
        loadNotes(true);
      } else if (message.action === "noteCreateStart") {
        setNoteActionMessage("Summarizing and creating note...");
        setShowNoteActionOverlay(true);
      } else if (message.action === "noteCreateError") {
         setError(message.error);
         setShowNoteActionOverlay(false);
      }
    };
    
    browser.runtime.onMessage.addListener(onMessage);

    return () => {
      browser.storage.onChanged.removeListener(onStorageChanged);
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  // Helper: Unified Data Loader
  const initializeData = async () => {
    setNotesLoading(true);
    try {
      // 1. Check for Pending Search Results (Priority)
      const storage = await browser.storage.local.get([
        "pendingSearchResults", 
        "pendingSearchQuery",
        "cachedNotes",
        "cachedTagsMap",
        "rlAuth"
      ]);

      if (Array.isArray(storage.pendingSearchResults) && storage.pendingSearchResults.length > 0) {
        setSearchResults(storage.pendingSearchResults);
        setSearchQuery(storage.pendingSearchQuery || "");
        // Auto scroll to results
        setTimeout(() => searchResultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
      }

      // 2. Load Cached Notes immediately for UI speed
      if (Array.isArray(storage.cachedNotes)) {
        setNotes(storage.cachedNotes);
        if (storage.cachedTagsMap) setTagsMap(storage.cachedTagsMap);
      }

      // 3. Fetch fresh notes from API
      await loadNotes(false); // Pass false to say "we might have loaded cache already"

    } catch (e) {
      console.error("Init failed", e);
    } finally {
      setNotesLoading(false);
    }
  };

  const loadNotes = async (forceRefresh = false) => {
    try {
      const resNotes = await notesApi.getMyNotes();
      const list = resNotes?.data || [];
      setNotes(list);

      const resTags = await tagsApi.getMyTags();
      const map: Record<string, string> = {};
      (resTags?.data?.tags || []).forEach((t: Tag) => {
        map[t.id] = t.name;
      });
      setTagsMap(map);

      // Update cache
      await browser.storage.local.set({
        cachedNotes: list,
        cachedTagsMap: map,
        cachedAt: Date.now(),
      });
    } catch (e) {
      console.log("[popup] loadNotes error", e);
    }
  };

  // ... (Keep your scrapeData, checkLoginStatus, downloadAsImage functions exactly as they were) ...
  const checkLoginStatus = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      const response = await browser.tabs.sendMessage(tab.id, { action: "checkLoginStatus" });
      setIsLoggedIn(response?.isLoggedIn || false);
    } catch (err) {
      setIsLoggedIn(false);
    }
  };
  
  const redirectToFAP = () => browser.runtime.sendMessage({ action: "redirectToFAP" });
  const navigateTo = (page: "transcript" | "schedule") => {
    const action = page === "transcript" ? "navigateToTranscript" : "navigateToSchedule";
    browser.runtime.sendMessage({ action });
  };
  
  // (Include scrapeData, cancelScraping, downloadAsImage here - omitted for brevity as they were fine)
  // Re-add the scrapeData/cancel/download functions from your original code here.


  // --- RENDER HELPERS ---
  
  const clearSearch = async () => {
    setSearchResults([]);
    setSearchQuery("");
    await browser.storage.local.remove(['pendingSearchResults', 'pendingSearchQuery']);
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
                <CardDescription className="text-xs">
                  {searchResults.length} results for "{searchQuery}"
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearSearch} className="h-8">
              Clear
            </Button>
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
                      <Badge key={id} variant="secondary" className="bg-background">
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

  // ... (Loading State Render - Keep as is) ...
  if (isLoggedIn === null) {
      return (
      <div className="w-[600px] h-[70vh] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // NOT LOGGED IN VIEW
  if (!isLoggedIn) {
    return (
      <div className="w-[600px] h-[70vh] bg-background p-6">
        <div className="h-full flex flex-col gap-4">
           {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent rpg-glow-gold" />
              <h1 className="text-xl font-bold text-foreground">RogueLearn Helper</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={checkLoginStatus}><RefreshCw className="h-4 w-4" /></Button>
          </div>

          <Card className="border-destructive/50 bg-destructive/10">
             {/* ... FAP Login Warning ... */}
              <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Not Logged In to FAP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={redirectToFAP} className="w-full rpg-glow-gold">Go to FAP Login</Button>
            </CardContent>
          </Card>

          {/* RENDER SEARCH RESULTS HERE TOO */}
          {renderSearchResults()}

          {/* Notes accessible without FAP login */}
          <Card className="rpg-paper-card">
            {/* ... Your Existing Notes Loop ... */}
             <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-accent" />
                  <CardTitle className="text-base">My Notes</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                 {/* ... (Existing notes list logic) ... */}
                  {notes.slice((notesPage - 1) * 5, (notesPage - 1) * 5 + 5).map((n) => (
                    <div key={n.id} className="p-3 border rounded-md mb-2">
                      <div className="font-medium">{n.title}</div>
                      {/* ... tags ... */}
                    </div>
                  ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // MAIN APP VIEW (Logged In)
  return (
    <div className="w-[600px] min-h-[70vh] bg-background overflow-y-auto">
      {/* ... Header ... */}
      
      <div className="p-4 space-y-3">
        {/* ... Error Display ... */}
        {/* ... Transcript Card ... */}

        {/* --- HERE IS THE FIX: Render Search Results between Transcript and Notes --- */}
        {renderSearchResults()}

        {/* ... My Notes Card ... */}
        {/* ... Schedule Card ... */}
      </div>

      {/* ... Overlays (Scanning, Note Action) ... */}
       <Dialog open={showNoteActionOverlay} onOpenChange={setShowNoteActionOverlay}>
         {/* ... */}
       </Dialog>
    </div>
  );
}

export default App;