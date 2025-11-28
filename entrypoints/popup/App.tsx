import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  Image as ImageIcon,
  AlertTriangle
} from 'lucide-react';
import { Copy } from 'lucide-react';
import type { TranscriptData, ScheduleData } from '@/lib/types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<{ transcript: boolean; schedule: boolean }>({
    transcript: false,
    schedule: false
  });
  const [loadingMessage, setLoadingMessage] = useState<{ transcript: string; schedule: string }>({
    transcript: '',
    schedule: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [showScanningOverlay, setShowScanningOverlay] = useState(false);

  useEffect(() => {
    checkLoginStatus();

    // Listen for scraping completion and progress
    const handleMessage = (message: any) => {
      if (message.action === 'scrapingComplete') {
        setScheduleData(message.data);
        setLoading(prev => ({ ...prev, schedule: false }));
        setLoadingMessage(prev => ({ ...prev, schedule: 'Scraping complete!' }));
        setShowScanningOverlay(false); // Hide overlay on completion
        
        // Clear success message after 2 seconds
        setTimeout(() => {
          setLoadingMessage(prev => ({ ...prev, schedule: '' }));
        }, 2000);
      } else if (message.action === 'scrapingProgress') {
        // Update loading message with progress
        const type = message.type || 'schedule';
        setLoadingMessage(prev => ({ ...prev, [type]: message.message || 'Processing...' }));
        setLoading(prev => ({ ...prev, [type]: true }));
        setShowScanningOverlay(true); // Keep overlay visible
      } else if (message.action === 'scrapingError') {
        setError(message.error);
        setLoading(prev => ({ ...prev, schedule: false }));
        setLoadingMessage(prev => ({ ...prev, schedule: '' }));
        setShowScanningOverlay(false); // Hide overlay on error
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);
    return () => browser.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const checkLoginStatus = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) return;
      const response = await browser.tabs.sendMessage(tab.id, { action: 'checkLoginStatus' });
      setIsLoggedIn(response?.isLoggedIn || false);
    } catch (err) {
      setIsLoggedIn(false);
    }
  };

  const redirectToFAP = () => {
    browser.runtime.sendMessage({ action: 'redirectToFAP' });
  };

  const cancelScraping = async () => {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      await browser.tabs.sendMessage(tab.id, { action: 'cancelScraping' });
      
      setLoading({ transcript: false, schedule: false });
      setLoadingMessage({ transcript: '', schedule: '' });
      setShowScanningOverlay(false);
      setError('Scraping cancelled by user');
      
      // Clear error message after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    } catch (err) {
      console.error('Error cancelling scraping:', err);
    }
  };

  const scrapeData = async (type: 'transcript' | 'schedule') => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setLoadingMessage(prev => ({
      ...prev,
      [type]: type === 'transcript' ? 'Starting transcript scrape...' : 'Starting schedule scrape...'
    }));
    setError(null);
    setShowScanningOverlay(true); // Show overlay when scraping starts

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      const action = type === 'transcript' ? 'scrapeTranscript' : 'scrapeSchedule';
      const response = await browser.tabs.sendMessage(tab.id, { action });

      if (response.success) {
        // Successfully completed - hide overlay and show data
        if (type === 'transcript') {
          setTranscriptData(response.data);
          setLoadingMessage(prev => ({ ...prev, transcript: 'Scraping complete!' }));
        } else {
          setScheduleData(response.data);
          setLoadingMessage(prev => ({ ...prev, schedule: 'Scraping complete!' }));
        }

        // Clear success message after 2 seconds
        setTimeout(() => {
          setLoadingMessage(prev => ({ ...prev, [type]: '' }));
        }, 2000);
        
        // Hide overlay on success
        setLoading(prev => ({ ...prev, [type]: false }));
        setShowScanningOverlay(false);
      } else {
        // Check if it's a progress message
        if (response.error?.includes('progress') || response.error?.includes('Loading') || response.error?.includes('Scraping in progress') || response.error?.includes('Transitioning')) {
          setLoadingMessage(prev => ({ ...prev, [type]: response.error }));
          // Keep loading state and overlay active - don't hide anything
          return;
        } else {
          // Actual error - hide overlay and show error
          setError(response.error || 'Failed to scrape data');
          setLoading(prev => ({ ...prev, [type]: false }));
          setShowScanningOverlay(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(prev => ({ ...prev, [type]: false }));
      setShowScanningOverlay(false);
    }
  };

  const navigateTo = (page: 'transcript' | 'schedule') => {
    const action = page === 'transcript' ? 'navigateToTranscript' : 'navigateToSchedule';
    browser.runtime.sendMessage({ action });
  };

  const downloadAsImage = async (type: 'transcript' | 'schedule') => {
    const data = type === 'transcript' ? transcriptData : scheduleData;
    if (!data) {
      console.error('No data to download');
      return;
    }

    try {
      // Create a canvas to render data as image
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = type === 'transcript'
        ? Math.max(600, (transcriptData?.subjects.length || 0) * 35 + 200)
        : Math.max(600, (scheduleData?.sessions.length || 0) * 30 + 200);

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Background
      ctx.fillStyle = '#1A0D08'; // Deep brown
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#D4AF37'; // Gold
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText('RogueLearn - ' + (type === 'transcript' ? 'Transcript' : 'Schedule'), 40, 50);

      ctx.fillStyle = '#FAFAFA'; // White
      ctx.font = '14px Arial, sans-serif';

      if (type === 'transcript' && transcriptData) {
        ctx.fillText(`Student: ${transcriptData.studentName} (${transcriptData.studentId})`, 40, 90);
        ctx.fillText(`Total Courses: ${transcriptData.subjects.length}`, 40, 115);

        // Draw table header
        let yPos = 160;
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText('Code', 40, yPos);
        ctx.fillText('Course Name', 140, yPos);
        ctx.fillText('Grade', 480, yPos);
        ctx.fillText('Semester', 560, yPos);

        // Draw courses
        ctx.font = '13px Arial, sans-serif';
        transcriptData.subjects.forEach((subject, index) => {
          yPos += 35;
          ctx.fillStyle = index % 2 === 0 ? '#FAFAFA' : '#D0D0D0';
          ctx.fillText(subject.subjectCode, 40, yPos);
          const courseName = subject.subjectName.length > 35 
            ? subject.subjectName.substring(0, 32) + '...' 
            : subject.subjectName;
          ctx.fillText(courseName, 140, yPos);

          // Grade with color
          ctx.fillStyle = subject.status === 'Passed' ? '#22c55e' : '#dc2626';
          ctx.font = 'bold 14px Arial, sans-serif';
          ctx.fillText(subject.grade, 480, yPos);

          ctx.fillStyle = index % 2 === 0 ? '#FAFAFA' : '#D0D0D0';
          ctx.font = '13px Arial, sans-serif';
          ctx.fillText(subject.semester, 560, yPos);
        });
      } else if (type === 'schedule' && scheduleData) {
        ctx.fillText(`Week Range: ${scheduleData.weekRange}`, 40, 90);
        ctx.fillText(`Total Sessions: ${scheduleData.sessions.length}`, 40, 115);

        // Draw sessions
        let yPos = 160;
        ctx.fillStyle = '#D4AF37';
        ctx.font = 'bold 14px Arial, sans-serif';
        ctx.fillText('Date', 40, yPos);
        ctx.fillText('Subject', 140, yPos);
        ctx.fillText('Slot', 420, yPos);
        ctx.fillText('Room', 500, yPos);
        ctx.fillText('Status', 620, yPos);

        ctx.font = '13px Arial, sans-serif';
        scheduleData.sessions.forEach((session, index) => {
          yPos += 30;
          ctx.fillStyle = index % 2 === 0 ? '#FAFAFA' : '#D0D0D0';
          ctx.fillText(session.date, 40, yPos);
          ctx.fillText(session.subjectCode, 140, yPos);
          ctx.fillText(`Slot ${session.slotNumber}`, 420, yPos);
          ctx.fillText(session.room.substring(0, 15), 500, yPos);

          const statusText = session.status || 'upcoming';
          ctx.fillStyle = statusText === 'attended' ? '#22c55e' : 
                         statusText === 'absent' ? '#dc2626' : '#D0D0D0';
          ctx.font = 'bold 12px Arial, sans-serif';
          ctx.fillText(statusText, 620, yPos);
          ctx.font = '13px Arial, sans-serif';
        });
      }

      // Footer
      const yPos = canvas.height - 30;
      ctx.fillStyle = '#A0A0A0';
      ctx.font = '12px Arial, sans-serif';
      ctx.fillText(`Generated by RogueLearn Helper - ${new Date().toLocaleString()}`, 40, yPos);

      console.log('Canvas created, converting to blob...');

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }

        console.log('Blob created, size:', blob.size);
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roguelearn-${type}-${Date.now()}.png`;
        
        console.log('Triggering download:', a.download);
        
        // Append to body to ensure it works in Firefox
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          console.log('Download complete, cleaned up');
        }, 100);
      }, 'image/png', 1.0);
      
    } catch (error) {
      console.error('Error creating image:', error);
      setError('Failed to create image. Please try again.');
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
        (s) =>
          `<tr><td>${s.subjectCode}</td><td>${s.subjectName}</td><td>${s.grade}</td><td>${s.semester}</td></tr>`
      )
      .join('');
    const table = `<table><thead><tr><th>Code</th><th>Course Name</th><th>Grade</th><th>Semester</th></tr></thead><tbody>${rows}</tbody></table>`;
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

  // Loading state
  if (isLoggedIn === null) {
    return (
      <div className="w-[600px] h-[500px] bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Checking login status...</p>
        </div>
      </div>
    );
  }

  // Not logged in state
  if (!isLoggedIn) {
    return (
      <div className="w-[600px] h-[500px] bg-background p-6">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent rpg-glow-gold" />
              <h1 className="text-xl font-bold text-foreground">RogueLearn Helper</h1>
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
                Not Logged In
              </CardTitle>
              <CardDescription className="text-destructive-foreground/80">
                Please log in to FAP to use this extension
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This extension requires you to be logged into the FPT Academic Portal (FAP).
              </p>
              <Button onClick={redirectToFAP} className="w-full rpg-glow-gold">
                <ExternalLink className="h-4 w-4 mr-2" />
                Go to FAP Login
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                After logging in, click the refresh button above
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main app (logged in)
  return (
    <div className="w-[600px] h-[500px] bg-background overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border p-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent rpg-glow-gold" />
            <h1 className="text-lg font-bold text-foreground">RogueLearn Helper</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-success/20 text-success border-success/50">
              Active
            </Badge>
            <Button variant="ghost" size="icon" onClick={checkLoginStatus} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Error Display */}
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
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
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
                onClick={() => navigateTo('transcript')}
                className="flex-1"
                disabled={loading.transcript}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Page
              </Button>
              <Button
                size="sm"
                onClick={() => scrapeData('transcript')}
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
                onClick={() => downloadAsImage('transcript')}
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
                onClick={() => navigateTo('schedule')}
                className="flex-1"
                disabled={loading.schedule}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Page
              </Button>
              <Button
                size="sm"
                onClick={() => scrapeData('schedule')}
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
                onClick={() => downloadAsImage('schedule')}
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
                <strong>Tip:</strong> Make sure you're on the FAP portal page before scraping.
                After scraping, you can download your data as an image.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scanning Overlay */}
      <Dialog open={showScanningOverlay} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
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
                The extension is currently scraping data from FAP. Closing the popup will interrupt the process.
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
    </div>
  );
}

export default App;
