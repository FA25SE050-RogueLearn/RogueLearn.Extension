import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  TrendingUp,
  BookOpen,
  Award,
  Calendar,
  RefreshCw,
  Download,
  Database,
  Sparkles,
  Clock,
  MapPin,
  User,
  Trash2,
} from 'lucide-react';
import type { TranscriptData, ScheduleData } from '@/lib/types';

// GSAP
declare const gsap: any;
declare const ScrollTrigger: any;

function Dashboard() {
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();

    // Entrance animation
    if (typeof gsap !== 'undefined' && containerRef.current) {
      gsap.registerPlugin(ScrollTrigger);

      const tl = gsap.timeline();

      tl.from('.dashboard-header', {
        y: -30,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.out'
      })
      .from('.hero-section', {
        scale: 0.95,
        opacity: 0,
        duration: 0.4,
        ease: 'back.out(1.2)'
      }, '-=0.1')
      .from('.stat-card', {
        scale: 0.9,
        opacity: 0,
        duration: 0.25,
        stagger: 0.1,
        ease: 'power2.out'
      }, '-=0.2')
      .from('.content-section', {
        y: 30,
        opacity: 0,
        duration: 0.3,
        stagger: 0.15,
        ease: 'power2.out'
      }, '-=0.3');
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get data from browser storage
      const result = await browser.storage.local.get(['transcriptData', 'scheduleData']);
      if (result.transcriptData) setTranscriptData(result.transcriptData);
      if (result.scheduleData) setScheduleData(result.scheduleData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAllData = () => {
    const data = {
      transcript: transcriptData,
      schedule: scheduleData,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roguelearn-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExportDialogOpen(false);
  };

  const clearAllData = async () => {
    await browser.storage.local.remove(['transcriptData', 'scheduleData']);
    setTranscriptData(null);
    setScheduleData(null);
  };

  const calculateStats = () => {
    const coursesCount = transcriptData?.subjects?.length || 0;
    const totalCredits = transcriptData?.subjects?.reduce((sum, s) => sum + (parseInt(s.credit) || 0), 0) || 0;
    const sessionsCount = scheduleData?.sessions?.length || 0;
    const attendedCount = scheduleData?.sessions?.filter(s => s.status === 'attended').length || 0;
    const attendanceRate = sessionsCount > 0 ? Math.round((attendedCount / sessionsCount) * 100) : 0;

    return { coursesCount, totalCredits, sessionsCount, attendanceRate };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Sparkles className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-accent rpg-glow-gold" />
            <div>
              <h1 className="text-3xl font-bold font-rpg text-foreground">RogueLearn Data Viewer</h1>
              <p className="text-sm text-muted-foreground">
                Last Updated: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
            <Button onClick={() => setExportDialogOpen(true)} className="rpg-glow-gold" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button variant="outline" size="sm" disabled title="Coming Soon">
              <Database className="h-4 w-4 mr-2" />
              Send to DB
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all scraped transcript and schedule data from local storage.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllData} className="bg-destructive">
                    Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Hero Section */}
      <Card className="hero-section mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16 border-2 border-accent">
            <AvatarFallback className="bg-accent text-accent-foreground text-xl font-bold">
              {transcriptData?.studentName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'ST'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <User className="h-5 w-5 text-accent" />
              {transcriptData?.studentName || 'No Data Loaded'}
            </h2>
            <p className="text-muted-foreground">
              Student ID: {transcriptData?.studentId || 'N/A'}
            </p>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Award className="h-3 w-3" />
              Major: Software Engineering | Batch: K18
            </p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className="mb-2">Level 3 Adventurer</Badge>
            <p className="text-xs text-muted-foreground">
              Data Source: FAP Portal
            </p>
            <p className="text-xs text-muted-foreground">
              Last Scraped: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-4 w-4 text-accent" />
              Courses Scraped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.coursesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">total courses</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Award className="h-4 w-4 text-accent" />
              Total Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalCredits}</div>
            <p className="text-xs text-muted-foreground mt-1">credits earned</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-accent" />
              Sessions Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.sessionsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">class sessions</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-accent" />
              Attendance Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">overall attendance</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-6 content-section">
        {/* Transcript Table */}
        <Card className="rpg-paper-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              All Transcript Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcriptData && transcriptData.subjects.length > 0 ? (
              <>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Course Name</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Semester</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transcriptData.subjects.map((subject, idx) => (
                        <TableRow key={idx} className="table-row">
                          <TableCell className="font-mono text-sm">{subject.subjectCode}</TableCell>
                          <TableCell className="font-medium">{subject.subjectName}</TableCell>
                          <TableCell>
                            <Badge
                              variant={subject.status === 'Passed' ? 'default' : 'destructive'}
                              className="font-bold"
                            >
                              {subject.grade}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {subject.semester}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Showing all {transcriptData.subjects.length} courses
                </p>
              </>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No transcript data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the popup to scrape data from FAP
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Schedule Accordion */}
        <Card className="rpg-paper-card content-section">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Full Schedule ({scheduleData?.weekRange || 'No data'})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleData && scheduleData.sessions.length > 0 ? (
              <ScrollArea className="h-[400px]">
                <Accordion type="single" collapsible className="w-full">
                  {scheduleData.sessions.slice(0, 15).map((session, idx) => (
                    <AccordionItem key={idx} value={`item-${idx}`}>
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                          <Clock className="h-4 w-4 text-accent" />
                          <span className="font-medium">{session.date}</span>
                          <span className="text-muted-foreground">•</span>
                          <span className="font-mono text-xs">{session.subjectCode}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 text-sm pl-6">
                          <p className="flex items-center gap-2">
                            <BookOpen className="h-3 w-3" />
                            <strong>Subject:</strong> {session.subjectName}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <strong>Slot:</strong> {session.slotNumber} ({session.day})
                          </p>
                          <p className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <strong>Room:</strong> {session.room}
                          </p>
                          <p className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <strong>Instructor:</strong> {session.instructor}
                          </p>
                          <div className="pt-2">
                            <Badge
                              variant={session.status === 'attended' ? 'default' : 'secondary'}
                              className="rpg-status-success"
                            >
                              {session.status === 'attended' ? '✅ Attended' : '❌ Absent'}
                            </Badge>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {scheduleData.sessions.length > 15 && (
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Showing 15 of {scheduleData.sessions.length} sessions
                  </p>
                )}
              </ScrollArea>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No schedule data available</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Use the popup to scrape schedule from FAP
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-accent" />
              Export All Scraped Data
            </DialogTitle>
            <DialogDescription>
              Download all your scraped data in JSON format
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">What will be exported:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Transcript data ({stats.coursesCount} courses)</li>
                <li>✓ Schedule data ({stats.sessionsCount} sessions)</li>
                <li>✓ Student information</li>
                <li>✓ Export metadata & timestamp</li>
              </ul>
            </div>
            <p className="text-xs text-muted-foreground">
              Format: JSON • Can be imported into databases or spreadsheets
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={exportAllData} className="rpg-glow-gold">
              <Download className="h-4 w-4 mr-2" />
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Dashboard;
