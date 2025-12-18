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
  Copy,
} from "lucide-react";
import type { TranscriptData, ScheduleData } from "@/lib/types";
import notesApi from "@/api/notesApi";
import tagsApi from "@/api/tagsApi";
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
    copyHtml: boolean;
  }>({
    transcript: false,
    schedule: false,
    copyHtml: false,
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
    checkLoginStatus();

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

    const onChanged = (changes: Record<string, any>, area: string) => {
      if (area !== "local") return;
      if (changes.pendingSearchResults) setSearchResults(changes.pendingSearchResults.newValue);
      if (changes.pendingSearchQuery) setSearchQuery(changes.pendingSearchQuery.newValue || "");
      if (changes.needsReloadNotes?.newValue === true) {
        loadNotes(true);
        browser.storage.local.set({ needsReloadNotes: false });
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    const storageApi: any = (browser as any)?.storage ?? (globalThis as any)?.chrome?.storage;
    storageApi?.onChanged?.addListener?.(onChanged);

    initializeData();

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
      storageApi?.onChanged?.removeListener?.(onChanged);
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
      }
    };
  }, []);

  const initializeData = async () => {
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
    if (notes.length === 0) setNotesLoading(true);
    try {
      const resNotes = await notesApi.getMyNotes();
      setNotes(resNotes.data || []);
      const resTags = await tagsApi.getMyTags();
      const map: Record<string, string> = {};
      (resTags?.data?.tags || []).forEach((t: Tag) => { map[t.id] = t.name; });
      setTagsMap(map);
      await browser.storage.local.set({ cachedNotes: resNotes.data, cachedTagsMap: map });
    } catch (e) { } finally { setNotesLoading(false); }
  };

  const redirectToFAP = () => browser.runtime.sendMessage({ action: "redirectToFAP" });

  const cancelScraping = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab.id) await browser.tabs.sendMessage(tab.id, { action: "cancelScraping" });
      setLoading({ transcript: false, schedule: false, copyHtml: false });
      setShowScanningOverlay(false);
    } catch (e) { }
  };

  const scrapeData = async (type: "transcript" | "schedule") => {
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
        } else {
          throw new Error(response.error);
        }
      }
    } catch (e: any) {
      setLoading(prev => ({ ...prev, [type]: false }));
      setShowScanningOverlay(false);
      setError(e.message || "Failed to scrape");
    }
  };

  const copyPageHtml = async () => {
    setLoading(prev => ({ ...prev, copyHtml: true }));
    setError(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error("No active tab");

      const response = await browser.tabs.sendMessage(tab.id, { action: "copyPageHtml" });

      if (response.success && response.html) {
        await navigator.clipboard.writeText(response.html);

        setLoadingMessage(prev => ({ ...prev, transcript: "Cleaned HTML copied!" }));
        setTimeout(() => setLoadingMessage(prev => ({ ...prev, transcript: "" })), 2000);
      } else {
        throw new Error(response.error || "Failed to retrieve HTML");
      }
    } catch (e: any) {
      console.error("Copy failed:", e);
      setError(e.message || "Failed to copy HTML");
    } finally {
      setLoading(prev => ({ ...prev, copyHtml: false }));
    }
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

        {/* Transcript Card */}
        <Card className="rpg-paper-card">
          <CardHeader className="pb-3">
            <div className="flex justify-between">
              <CardTitle>Transcript</CardTitle>
              {transcriptData && <Badge variant="secondary">{transcriptData.subjects.length} courses</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Status Message */}
            {loadingMessage.transcript && (
              <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" /> {loadingMessage.transcript}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateTo('transcript')} className="flex-1">Go to Page</Button>
              <Button size="sm" onClick={() => scrapeData('transcript')} disabled={loading.transcript} className="flex-1 rpg-glow-gold">
                {loading.transcript ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />} Scrape
              </Button>
            </div>

            {/* Download and Copy Buttons - Only show if data is scraped */}
            {transcriptData && !loading.transcript && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadAsImage("transcript")}
                  className="w-full"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download as Image
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyPageHtml}
                  disabled={loading.copyHtml}
                  className="w-full"
                >
                  {loading.copyHtml ? <Loader2 className="h-3 w-3 animate-spin" /> : <Copy className="h-3 w-3 mr-2" />}
                  Copy Cleaned HTML
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rpg-paper-card">
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

        {renderSearchResults()}

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