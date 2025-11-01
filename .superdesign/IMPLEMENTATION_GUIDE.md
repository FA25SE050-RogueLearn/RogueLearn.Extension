# RogueLearn UI Enhancement - Implementation Guide

## ✅ Completed Setup (Ready to Use)

### 1. **Component Library** ✅
- 20 shadcn/ui components installed
- All Radix UI dependencies installed
- GSAP 3.12.5 ready to use

### 2. **Theme System** ✅
- RPG theme CSS created: `.superdesign/design_iterations/roguelearn_theme.css`
- Imported in popup: `entrypoints/popup/style.css`
- Color system: Pink brand + RPG gold + warm browns

### 3. **Animation System** ✅
- GSAP CDN added to `entrypoints/popup/index.html`
- Animation patterns documented
- Ready for implementation

---

## 📋 Implementation Tasks

### Phase 1: Enhanced Popup (CURRENT)

#### Task 1: Add GSAP Animations to App.tsx

**File**: `entrypoints/popup/App.tsx`

**Add these imports at the top**:
```typescript
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// GSAP hook for animations
import { gsap } from 'gsap';
```

**Add animation hook after state declarations**:
```typescript
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  // Initial load animation
  if (containerRef.current) {
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.from('.popup-header', {
      y: -20,
      opacity: 0,
      duration: 0.25,
      delay: 0.1
    })
    .from('.tabs-container', {
      opacity: 0,
      duration: 0.2
    }, '-=0.1')
    .from('.student-info-card', {
      y: 20,
      opacity: 0,
      duration: 0.3
    }, '-=0.05')
    .from('.course-card', {
      y: 20,
      opacity: 0,
      duration: 0.2,
      stagger: 0.08
    }, '-=0.2');
  }
}, [transcriptData, scheduleData]);
```

**Wrap main return with ref**:
```typescript
return (
  <TooltipProvider>
    <div ref={containerRef} className="w-full h-full bg-background p-4">
      {/* existing content */}
    </div>
  </TooltipProvider>
);
```

**Add "Open Dashboard" button**:
```typescript
const openDashboard = () => {
  browser.tabs.create({ url: browser.runtime.getURL('/dashboard/index.html') });
};

// In your JSX, add button at bottom:
<Button
  onClick={openDashboard}
  className="w-full mt-4 rpg-glow-gold"
>
  <TrendingUp className="mr-2 h-4 w-4" />
  Open Full Dashboard
</Button>
```

---

#### Task 2: Add Scraping Progress with Logs

**In your scraping section, replace skeleton with**:
```typescript
{loading && (
  <Card className="rpg-paper-card">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Scraping Progress & Logs
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="text-accent">⚙️</span>
          {loadingMessage || 'Processing...'}
        </div>
        <Progress value={scrapingProgress} className="h-2" />
        <div className="text-xs text-muted-foreground">
          {scrapingProgress}% Complete
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

---

### Phase 2: Dashboard Creation

#### Task 3: Create Dashboard Entry Point

**File**: `entrypoints/dashboard/index.html` (NEW)
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>RogueLearn Dashboard</title>
    <meta name="manifest.type" content="browser_action" />
    <link href="@/assets/tailwind.css" rel="stylesheet" />
    <link href="./style.css" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <!-- GSAP Libraries -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

---

#### Task 4: Create Dashboard React Entry

**File**: `entrypoints/dashboard/main.tsx` (NEW)
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

export default defineBackground(() => {
  console.log('Dashboard entry point loaded');
});
```

---

#### Task 5: Create Dashboard Styles

**File**: `entrypoints/dashboard/style.css` (NEW)
```css
/* Import RPG Theme */
@import url('../../.superdesign/design_iterations/roguelearn_theme.css');

@layer base {
  :root {
    /* Dashboard-specific variables */
    --dashboard-max-width: 1400px;
    --dashboard-padding: 2rem;
  }

  body {
    background-color: hsl(var(--background)) !important;
    color: hsl(var(--foreground)) !important;
    overflow-y: auto;
    overflow-x: hidden;
  }

  #root {
    min-height: 100vh;
  }
}

@layer utilities {
  .dashboard-container {
    max-width: var(--dashboard-max-width);
    margin: 0 auto;
    padding: var(--dashboard-padding);
  }

  .dashboard-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: hsl(var(--background) / 0.95);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid hsl(var(--border));
    padding: 1rem 0;
  }

  .stat-card {
    @apply rpg-paper-card;
    transition: all 0.3s ease;
  }

  .stat-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 0 20px hsl(45 90% 58% / 0.4);
  }

  .chart-bar {
    transition: all 0.2s ease;
  }

  .chart-bar:hover {
    transform: scaleY(1.05);
    filter: brightness(1.2);
  }
}
```

---

#### Task 6: Create Dashboard Main Component (Minimal Version)

**File**: `entrypoints/dashboard/App.tsx` (NEW)
```typescript
import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  TrendingUp,
  BookOpen,
  Award,
  Calendar,
  RefreshCw,
  Download,
  Database
} from 'lucide-react';
import type { TranscriptData, ScheduleData } from '@/lib/types';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function Dashboard() {
  const [transcriptData, setTranscriptData] = useState<TranscriptData | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load data from storage or message passing
    loadData();

    // Entrance animation
    if (containerRef.current) {
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
      }, '-=0.2');
    }
  }, []);

  const loadData = async () => {
    // Get data from browser storage or background script
    const result = await browser.storage.local.get(['transcriptData', 'scheduleData']);
    if (result.transcriptData) setTranscriptData(result.transcriptData);
    if (result.scheduleData) setScheduleData(result.scheduleData);
  };

  const exportAllData = () => {
    const data = {
      transcript: transcriptData,
      schedule: scheduleData,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`roguelearn-data-\${Date.now()}.json\`;
    a.click();
  };

  return (
    <div ref={containerRef} className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-accent" />
            <h1 className="text-3xl font-bold font-rpg">RogueLearn Data Viewer</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </Button>
            <Button onClick={exportAllData} className="rpg-glow-gold">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button variant="outline" disabled>
              <Database className="h-4 w-4 mr-2" />
              Send to DB
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Last Updated: {new Date().toLocaleString()}
        </p>
      </div>

      <Separator className="my-6" />

      {/* Hero Section */}
      <Card className="hero-section rpg-paper-card mb-6">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-accent text-accent-foreground text-xl">
              {transcriptData?.studentName?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">
              {transcriptData?.studentName || 'Student Name'}
            </h2>
            <p className="text-muted-foreground">
              Student ID: {transcriptData?.studentId || 'Loading...'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Data Source: FAP Portal | Last Scraped: {new Date().toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BookOpen className="h-4 w-4" />
              Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{transcriptData?.subjects?.length || 0}</div>
            <p className="text-xs text-muted-foreground">scraped</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4" />
              Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {transcriptData?.subjects?.reduce((sum, s) => sum + (parseInt(s.credit) || 0), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">total</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{scheduleData?.sessions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">tracked</p>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">70%</div>
            <p className="text-xs text-muted-foreground">estimated</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Transcript Table */}
        <Card className="rpg-paper-card">
          <CardHeader>
            <CardTitle>Transcript Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Semester</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transcriptData?.subjects?.slice(0, 10).map((subject, idx) => (
                  <TableRow key={idx} className="table-row">
                    <TableCell className="font-mono">{subject.subjectCode}</TableCell>
                    <TableCell>{subject.subjectName}</TableCell>
                    <TableCell>
                      <Badge variant={subject.status === 'Passed' ? 'default' : 'destructive'}>
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
            {transcriptData && transcriptData.subjects.length > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-4">
                Showing 10 of {transcriptData.subjects.length} courses
              </p>
            )}
          </CardContent>
        </Card>

        {/* Schedule Accordion */}
        <Card className="rpg-paper-card">
          <CardHeader>
            <CardTitle>Schedule Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible>
              {scheduleData?.sessions?.slice(0, 5).map((session, idx) => (
                <AccordionItem key={idx} value={\`item-\${idx}\`}>
                  <AccordionTrigger className="text-sm">
                    {session.date} - {session.subjectCode}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-sm">
                      <p><strong>Subject:</strong> {session.subjectName}</p>
                      <p><strong>Slot:</strong> {session.slotNumber}</p>
                      <p><strong>Room:</strong> {session.room}</p>
                      <p><strong>Instructor:</strong> {session.instructor}</p>
                      <Badge variant={session.status === 'attended' ? 'default' : 'secondary'}>
                        {session.status}
                      </Badge>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
```

---

## 🎯 Quick Implementation Steps

### Step 1: Test Current Setup
```bash
npm run dev
```
Load extension in Chrome and verify popup loads with GSAP.

### Step 2: Add Dashboard Files
1. Create `entrypoints/dashboard/` folder
2. Add `index.html`, `main.tsx`, `style.css`, `App.tsx`
3. Copy code from above

### Step 3: Update WXT Config
Add dashboard entry point to `wxt.config.ts` if needed.

### Step 4: Build & Test
```bash
npm run build
```

---

## 📚 Resources Created

1. ✅ **RPG Theme CSS**: `.superdesign/design_iterations/roguelearn_theme.css`
2. ✅ **20 shadcn Components**: `components/ui/*`
3. ✅ **Animation Docs**: See Step 3 notes above
4. ✅ **Layout Designs**: See Step 1 ASCII wireframes above
5. ✅ **This Guide**: `.superdesign/IMPLEMENTATION_GUIDE.md`

---

## 🐛 Troubleshooting

### Issue: GSAP not defined
**Solution**: Ensure GSAP CDN is loaded before React app in HTML

### Issue: Styles not applying
**Solution**: Check `@import` path in CSS files is correct

### Issue: Dashboard doesn't open
**Solution**: Verify `browser.tabs.create` has correct URL path

---

## 🎨 Next Enhancements

1. **Add Chart.js** for grade visualizations
2. **Add FullCalendar** for schedule views
3. **Implement data persistence** with browser.storage
4. **Add export to CSV** functionality
5. **Create database sync API** when backend is ready

---

**Status**: Ready for integration & testing!
