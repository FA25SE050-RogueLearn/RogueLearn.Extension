import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Calendar,
  BookOpen,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  TrendingUp,
  Zap,
  Info
} from 'lucide-react';
import type { TranscriptData, ScheduleData } from '@/lib/types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<{ transcript: boolean; schedule: boolean }>({
    transcript: false,
    schedule: false
  });
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);

  useEffect(() => {
    checkLoginStatus();

    // Listen for scraping completion
    const handleMessage = (message: any) => {
      if (message.action === 'scrapingComplete') {
        setScheduleData(message.data);
        setLoading(prev => ({ ...prev, schedule: false }));
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

  const scrapeData = async (type: 'transcript' | 'schedule') => {
    setLoading(prev => ({ ...prev, [type]: true }));
    setError(null);

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      const action = type === 'transcript' ? 'scrapeTranscript' : 'scrapeSchedule';
      const response = await browser.tabs.sendMessage(tab.id, { action });

      if (response.success) {
        if (type === 'transcript') setTranscriptData(response.data);
        else setScheduleData(response.data);
      } else {
        setError(response.error || 'Failed to scrape data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  const navigateTo = (page: 'transcript' | 'schedule') => {
    const action = page === 'transcript' ? 'navigateToTranscript' : 'navigateToSchedule';
    browser.runtime.sendMessage({ action });
  };

  const openDashboard = () => {
    browser.tabs.create({ url: browser.runtime.getURL('/dashboard/index.html') });
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('transcript')}
                className="flex-1"
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTo('schedule')}
                className="flex-1"
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
          </CardContent>
        </Card>

        <Separator className="my-3" />

        {/* Dashboard Card */}
        <Card className="rpg-paper-card bg-accent/5 border-accent/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              <div>
                <CardTitle className="text-base">Dashboard</CardTitle>
                <CardDescription className="text-xs">
                  View all your scraped data with visualizations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={openDashboard}
              className="w-full rpg-glow-gold"
              size="sm"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              Open Full Dashboard
            </Button>
          </CardContent>
        </Card>

        {/* Helper Tip */}
        <Card className="bg-info/10 border-info/30">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Make sure you're on the FAP portal page before scraping.
                Data will be saved and viewable in the dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
