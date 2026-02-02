
import React from 'react';
import { createPortal } from 'react-dom';
import { PdfIcon } from './Icons';

interface PdfPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfDataUri: string | null;
  fileName: string;
}

const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ isOpen, onClose, pdfDataUri, fileName }) => {
  if (!isOpen || !pdfDataUri) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full h-full max-w-5xl border border-white/20 flex flex-col">
        <header className="shrink-0 flex items-center justify-between p-4 border-b border-white/20">
          <h3 className="text-lg font-bold text-white">Pratinjau Dokumen</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-semibold text-white flex items-center gap-2"
            >
              <PdfIcon className="w-5 h-5"/>
              <span>Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 font-semibold"
            >
              Tutup
            </button>
          </div>
        </header>
        <main className="grow p-1 sm:p-2 bg-black/20">
          <iframe
            src={pdfDataUri}
            title="PDF Preview"
            className="w-full h-full border-0 rounded-lg"
          />
        </main>
      </div>
    </div>,
    document.body
  );
};

export default PdfPreviewModal;
