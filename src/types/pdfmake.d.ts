declare module 'pdfmake/build/pdfmake' {
  import { TDocumentDefinitions } from 'pdfmake/interfaces';
  
  interface PdfMakeStatic {
    createPdf(documentDefinition: TDocumentDefinitions): PdfDocument;
  }
  
  interface PdfDocument {
    download(filename?: string): void;
    open(): void;
    print(): void;
    getBlob(callback: (result: Blob) => void): void;
    getBase64(callback: (result: string) => void): void;
    getDataUrl(callback: (result: string) => void): void;
  }
  
  const pdfMake: PdfMakeStatic;
  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const pdfFonts: {
    pdfMake: {
      vfs: Record<string, string>;
    };
  };
  export default pdfFonts;
}

