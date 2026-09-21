import { DocumentType, DocumentStatus } from '../models';

/** File Manager tree node. */
export interface FileNode {
  id: string;
  name: string;
  parentId: string | null;
  isFile: boolean;
  size: number;
  type: string;
  dateCreated: Date;
  dateModified: Date;
  filterPath: string;
  filterId?: string;
  hasChild: boolean;
  permission?: {
    copy: boolean;
    download: boolean;
    read: boolean;
    write: boolean;
    writeContents?: boolean;
    message: string;
  };
  data?: {
    documentId: string;
    contractId: string;
    documentType: DocumentType;
    documentTypeLabel?: string;
    status: DocumentStatus;
    version: number;
    uploadedBy: string;
    contentUrl?: string;
    description?: string;
    matterNumber?: string;
    tags: string[];
  };
}


/** PDF Viewer resource folder (trailing slash not required). */
export const PDF_VIEWER_RESOURCE_URL = 'https://cdn.syncfusion.com/ej2/34.1.33/dist/ej2-pdfviewer-lib'

/** Document Editor service used to open DOCX files. */
export const DOC_EDITOR_SERVICE_URL =
  'https://document.syncfusion.com/web-services/docx-editor/api/documenteditor/';
