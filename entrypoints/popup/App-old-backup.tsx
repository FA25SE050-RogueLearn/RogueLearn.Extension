import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Sparkles, 
  Calendar, 
  BookOpen, 
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Maximize2,
  TrendingUp,
  Award,
  Clock,
  MapPin
} from 'lucide-react';
import type { TranscriptData, ScheduleData, ClassSession } from '@/lib/types';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [activeTab, setActiveTab] = useState('transcript');

  useEffect(() => {
    checkLoginStatus();
    
    // Listen for scraping completion messages
    const handleMessage = (message: any) => {
      if (message.action === 'scrapingComplete') {
        console.log('Received scraping complete message:', message.data);
        setScheduleData(message.data);
        setLoading(false);
        setLoadingMessage('');
        setError(null);
      }
    };
    
    browser.runtime.onMessage.addListener(handleMessage);
    
    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
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
    // Don't close the popup - let user see it navigate
  };

  const scrapeData = async (type: 'transcript' | 'schedule') => {
    setLoading(true);
    setError(null);
    setLoadingMessage(type === 'schedule' ? 'Starting 6-week schedule scraping...' : 'Scraping transcript data...');

    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) throw new Error('No active tab found');

      const action = type === 'transcript' ? 'scrapeTranscript' : 'scrapeSchedule';
      const response = await browser.tabs.sendMessage(tab.id, { action });

      if (response.success) {
        if (type === 'transcript') {
          setTranscriptData(response.data);
        } else {
          setScheduleData(response.data);
        }
        setLoadingMessage('');
        setLoading(false);
      } else {
        // Check if it's a progress message (page will reload)
        if (response.error?.includes('Scraping in progress')) {
          setLoadingMessage(response.error);
          // Keep loading state active - will be cleared when scraping completes
        } else {
          setError(response.error || 'Failed to scrape data');
          setLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const navigateTo = (page: 'transcript' | 'schedule') => {
    const action = page === 'transcript' ? 'navigateToTranscript' : 'navigateToSchedule';
    browser.runtime.sendMessage({ action });
    // Keep popup open so user can see the navigation happening
    setTimeout(() => {
      checkLoginStatus();
    }, 1000);
  };

  const openInTab = () => {
    browser.tabs.create({
      url: browser.runtime.getURL('/popup.html')
    });
  };

  if (isLoggedIn === null) {
    return (
      <div className="w-[600px] h-[500px] bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rpg-gold" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="w-[600px] h-[500px] bg-background p-6">
        <Card className="rpg-stone border-amber-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-rpg-gold" />
                <CardTitle className="text-rpg-gold">RogueLearn - FPT Helper</CardTitle>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={checkLoginStatus}
                title="Refresh login status"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rpg-alert p-4 rounded-md">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <h3 className="font-semibold text-warning mb-1">Not Logged In</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Please log in to FPT FAP to access your grades and schedule.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    After logging in, click the refresh button above or reopen the extension.
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={redirectToFAP} 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to FAP Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-[600px] h-[500px] bg-background">
      <div className="rpg-stone p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-semibold tracking-tight">
              RogueLearn Helper
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Active
            </Badge>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={openInTab}
              title="Open in Tab"
              className="h-8 w-8"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={checkLoginStatus}
              title="Refresh"
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="transcript" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transcript" className="space-y-3">
            <TranscriptView 
              data={transcriptData}
              loading={loading}
              error={error}
              onScrape={() => scrapeData('transcript')}
              onNavigate={() => navigateTo('transcript')}
            />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-3">
            <ScheduleView 
              data={scheduleData}
              loading={loading}
              error={error}
              onScrape={() => scrapeData('schedule')}
              onNavigate={() => navigateTo('schedule')}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Transcript View Component
function TranscriptView({ 
  data, 
  loading, 
  error, 
  onScrape, 
  onNavigate 
}: {
  data: TranscriptData | null;
  loading: boolean;
  error: string | null;
  onScrape: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button 
          onClick={onNavigate} 
          variant="outline" 
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Go to Page
        </Button>
        <Button 
          onClick={onScrape} 
          disabled={loading} 
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4 mr-2" />
          )}
          Scrape Data
        </Button>
      </div>

      {error && (
        <div className="rpg-alert p-3 rounded-md">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <Card className="rpg-paper-card">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data && !loading && (
        <>
          <Card className="rpg-stone">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-lg">
                      {data.studentName || data.studentId}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Academic Performance
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {data.subjects.length} Courses
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <ScrollArea className="h-80">
            <div className="space-y-2 pr-4">
              {data.subjects.map((subject, idx) => (
                <Card 
                  key={idx}
                  className="rpg-paper-card"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {subject.subjectCode}
                          </span>
                          <Badge 
                            variant={subject.status === 'Passed' ? 'default' : 'secondary'}
                            className={subject.status === 'Passed' ? 'bg-accent text-accent-foreground' : ''}
                          >
                            {subject.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {subject.subjectName}
                        </p>
                        <Separator />
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{subject.semester}</span>
                          <span>•</span>
                          <span>Term {subject.term}</span>
                          <span>•</span>
                          <span>{subject.credit} Credits</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-accent">
                          {subject.grade}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Grade</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

// Schedule View Component
function ScheduleView({ 
  data, 
  loading, 
  error, 
  onScrape, 
  onNavigate 
}: {
  data: ScheduleData | null;
  loading: boolean;
  error: string | null;
  onScrape: () => void;
  onNavigate: () => void;
}) {
  // Group sessions by date for better display
  const sessionsByDate = data?.sessions.reduce((acc, session) => {
    const key = session.date || 'No Date';
    if (!acc[key]) acc[key] = [];
    acc[key].push(session);
    return acc;
  }, {} as Record<string, ClassSession[]>);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button 
          onClick={onNavigate} 
          variant="outline" 
          className="flex-1"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Go to Page
        </Button>
        <Button 
          onClick={onScrape} 
          disabled={loading}
          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Calendar className="h-4 w-4 mr-2" />
          )}
          Scrape Schedule
        </Button>
      </div>

      {error && (
        <div className="rpg-alert p-3 rounded-md">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}

      {loading && (
        <Card className="rpg-paper-card">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <p className="text-sm font-medium">Scraping 6 weeks of schedule...</p>
              </div>
              <Progress value={33} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take a few moments as we navigate through each week
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data && sessionsByDate && !loading && (
        <>
          <Card className="rpg-stone">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-accent" />
                  <div>
                    <CardTitle className="text-lg">
                      {data.weekRange}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      6-Week Schedule Overview
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">
                  <BookOpen className="h-3 w-3 mr-1" />
                  {data.sessions.length} Classes
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <ScrollArea className="h-80">
            <div className="space-y-4 pr-4">
              {Object.entries(sessionsByDate)
                .sort(([dateA], [dateB]) => {
                  // Sort by date
                  const [dayA, monthA] = dateA.split('/').map(Number);
                  const [dayB, monthB] = dateB.split('/').map(Number);
                  return (monthA || 0) - (monthB || 0) || (dayA || 0) - (dayB || 0);
                })
                .map(([date, sessions]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 sticky top-0 bg-background py-2">
                      <h4 className="text-sm font-semibold text-accent">
                        {date}
                      </h4>
                      <Separator className="flex-1" />
                      <Badge variant="secondary" className="text-xs">
                        {sessions.length}
                      </Badge>
                    </div>
                    {sessions.map((session, idx) => (
                      <Card 
                        key={`${date}-${idx}`}
                        className="rpg-paper-card"
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">
                                    {session.subjectCode}
                                  </span>
                                  {session.status && (
                                    <Badge 
                                      variant={session.status === 'attended' ? 'default' : 'secondary'}
                                      className={session.status === 'attended' ? 'bg-green-600 text-white' : ''}
                                    >
                                      {session.status}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {session.subjectName}
                                </p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Slot {session.slotNumber}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {session.room}
                              </span>
                            </div>

                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

export default App;
