import { useState } from 'react';
import { X, FileText, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Citation } from '@/types/agent';

interface PDFCitationViewerProps {
  citation: Citation | null;
  isOpen: boolean;
  onClose: () => void;
}

const mockDocumentPages: Record<string, Record<number, string>> = {
  'HCL-AR-2025': {
    1: `HCLTech Annual Report FY2025

CHAIRMAN'S MESSAGE

Dear Stakeholders,

I am pleased to present HCLTech's Annual Report for FY2025. This year marks another milestone in our journey of sustainable growth and innovation.

Key Highlights:
• Revenue: ₹117,055 Crores ($13.84B)
• Revenue Growth: 4.3% YoY
• Net Income: ₹17,390 Crores
• EBITDA Margin: 24.2%
• Headcount: 223,420 employees across 60+ countries`,
    2: `STRATEGIC PILLARS

Our success is built on four strategic pillars:

1. AI FORCE
   • Generative AI solutions for enterprise transformation
   • AI-powered automation and analytics
   • Machine learning operations at scale

2. CLOUDSMART
   • Multi-cloud management and optimization
   • Cloud-native application development
   • Infrastructure modernization

3. NEW VISTAS
   • Digital engineering services
   • IoT and edge computing solutions
   • Quantum computing research`,
    3: `FINANCIAL PERFORMANCE

Revenue by Geography:
• Americas: 62%
• Europe: 27%
• Rest of World: 11%

Revenue by Vertical:
• Financial Services: 21%
• Manufacturing: 19%
• Technology & Services: 18%
• Life Sciences: 14%
• Telecom & Media: 12%
• Retail & CPG: 9%
• Others: 7%

Deal Wins: $13.4B Total Contract Value`,
    15: `HR POLICIES & BENEFITS

Leave Management:
• Annual Leave: 20 days
• Sick Leave: 12 days
• Personal Leave: 5 days
• Maternity Leave: 26 weeks
• Paternity Leave: 2 weeks

Benefits:
• Health Insurance (Employee + Family)
• Life Insurance (3x Annual CTC)
• Retirement Benefits (PF + Gratuity)
• Employee Stock Options
• Learning & Development Budget`,
  },
};

export function PDFCitationViewer({ citation, isOpen, onClose }: PDFCitationViewerProps) {
  const [currentPage, setCurrentPage] = useState(citation?.pageNum || 1);
  const [zoom, setZoom] = useState(100);

  const docPages = citation ? mockDocumentPages[citation.docId] || {} : {};
  const totalPages = Object.keys(docPages).length || 20;
  const pageContent = docPages[currentPage] || `Page ${currentPage}\n\nDocument content for this page is not available in preview.\n\nThis would display the actual PDF content when integrated with document storage.`;

  const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

  if (!citation) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg">{citation.docId}</DialogTitle>
              <p className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.max(50, z - 25))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm w-12 text-center">{zoom}%</span>
            <Button variant="ghost" size="icon" onClick={() => setZoom(z => Math.min(200, z + 25))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="gap-2 ml-2">
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* PDF Content */}
          <ScrollArea className="flex-1 p-6">
            <div 
              className="bg-white text-gray-900 p-8 rounded-lg shadow-lg min-h-full font-serif leading-relaxed"
              style={{ fontSize: `${zoom}%` }}
            >
              <pre className="whitespace-pre-wrap font-serif">{pageContent}</pre>
              
              {/* Highlight cited snippet */}
              {currentPage === citation.pageNum && (
                <div className="mt-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 rounded">
                  <p className="text-sm font-medium text-yellow-800">Cited Text:</p>
                  <p className="text-sm italic text-yellow-900 mt-1">"{citation.snippet}"</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Navigation Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <Button variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1} className="gap-2">
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Go to page:</span>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(Math.max(1, Math.min(totalPages, parseInt(e.target.value) || 1)))}
              className="w-16 px-2 py-1 text-center border rounded text-sm"
              min={1}
              max={totalPages}
            />
          </div>
          <Button variant="outline" onClick={handleNextPage} disabled={currentPage >= totalPages} className="gap-2">
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
