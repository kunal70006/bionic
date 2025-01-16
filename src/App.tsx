import React, { useState, ChangeEvent, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';

interface PageData {
  pageNum: number;
  text: string;
}

interface TextItem {
  str: string;
  dir: string;
  transform: number[];
  width: number;
  height: number;
  fontName: string;
}

const PdfReader: React.FC = () => {
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [originalFileName, setOriginalFileName] = useState<string>('');

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.mjs`;
  }, []);

  const getBoldLength = (word: string) => {
    const length = word.length;
    if (length <= 3) return 1;
    if (length <= 6) return 2;
    if (length <= 9) return 3;
    return 4;
  };

  const bionicText = (text: string) => {
    return text.split(' ').map((word, index) => {
      const boldLength = getBoldLength(word);
      const boldPart = word.slice(0, boldLength);
      const regularPart = word.slice(boldLength);
      
      return (
        <span key={index} className="inline-block">
          <span className="font-bold">{boldPart}</span>
          {regularPart}
          {' '}
        </span>
      );
    });
  };

  const getBionicTextForPdf = (text: string) => {
    return text.split(' ').map(word => {
      const boldLength = getBoldLength(word);
      const boldPart = word.slice(0, boldLength);
      const regularPart = word.slice(boldLength);
      return { boldPart, regularPart };
    });
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let currentY = 20;
    const marginLeft = 20;
    const lineHeight = 7;
    const fontSize = 12;

    doc.setFont('helvetica');
    doc.setFontSize(fontSize);

    pages.forEach((page, pageIndex) => {
      if (pageIndex > 0) {
        doc.addPage();
        currentY = 20;
      }

      // Add page number
      doc.setFont('helvetica', 'bold');
      doc.text(`Page ${page.pageNum}`, marginLeft, currentY);
      currentY += lineHeight * 2;

      // Process text with bionic reading
      const bionicWords = getBionicTextForPdf(page.text);
      let currentLine = '';
      let currentLineWidth = 0;
      const maxWidth = doc.internal.pageSize.width - 2 * marginLeft;

      const writeCurrentLine = () => {
        if (currentLine.trim()) {
          const words = currentLine.trim().split('|');
          let xPos = marginLeft;
          
          words.forEach(word => {
            const [bold, regular] = word.split('~');
            if (bold) {
              doc.setFont('helvetica', 'bold');
              doc.text(bold, xPos, currentY);
              xPos += doc.getTextWidth(bold);
            }
            if (regular) {
              doc.setFont('helvetica', 'normal');
              doc.text(regular, xPos, currentY);
              xPos += doc.getTextWidth(regular);
            }
          });
          
          currentY += lineHeight;
          currentLine = '';
          currentLineWidth = 0;
        }
      };

      bionicWords.forEach((word) => {
        const spaceWidth = doc.getTextWidth(' ');
        doc.setFont('helvetica', 'bold');
        const boldWidth = doc.getTextWidth(word.boldPart);
        doc.setFont('helvetica', 'normal');
        const regularWidth = doc.getTextWidth(word.regularPart + ' ');
        const wordWidth = boldWidth + regularWidth;

        if (currentLineWidth + wordWidth > maxWidth) {
          writeCurrentLine();
          
          if (currentY >= pageHeight - 20) {
            doc.addPage();
            currentY = 20;
          }
        }

        currentLine += `${currentLine ? '|' : ''}${word.boldPart}~${word.regularPart} `;
        currentLineWidth += wordWidth + spaceWidth;
      });

      // Write any remaining text
      writeCurrentLine();
    });

    // Generate filename for download
    const downloadFileName = originalFileName
      ? originalFileName.replace('.pdf', '_bionic.pdf')
      : 'bionic-text.pdf';

    doc.save(downloadFileName);
  };

  const extractText = async (file: File): Promise<void> => {
    try {
      setLoading(true);
      setError('');
      
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf: PDFDocumentProxy = await loadingTask.promise;
      
      const pagesText: PageData[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page: PDFPageProxy = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map(item => (item as TextItem).str)
          .join(' ');
        pagesText.push({ pageNum: i, text: pageText });
      }
      
      setPages(pagesText);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError('Error processing PDF: ' + errorMessage);
      console.error('PDF processing error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setOriginalFileName(file.name);
      extractText(file);
    } else {
      setError('Please upload a valid PDF file');
    }
  };

  return (
    <div className='flex justify-center'>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Yaha upload kijiye 😽</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* File Upload Section */}
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-4">
                <p>Processing PDF...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="text-red-500 text-center py-2">
                {error}
              </div>
            )}

            {/* Results Section */}
            {pages.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Extracted Text</h3>
                  <Button 
                    onClick={generatePDF}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Yaha se download kijiye 😽
                  </Button>
                </div>
                {pages.map((page) => (
                  <div key={page.pageNum} className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Page {page.pageNum}</h4>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {bionicText(page.text)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PdfReader;