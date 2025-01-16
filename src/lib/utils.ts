import { clsx, type ClassValue } from "clsx"
// import { PDFWorker } from 'pdfjs-dist/legacy/build/pdf.worker.entry';
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// export default PDFWorker;