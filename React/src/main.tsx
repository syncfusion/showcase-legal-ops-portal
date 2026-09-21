import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './context/ThemeContext'
import { PersonaProvider } from './context/PersonaContext'
import './styles/tokens.css'
import './styles/index.css'

// Syncfusion tailwind3 theme (dependency order: base → shared → feature packs)
import '@syncfusion/ej2-base/styles/tailwind3.css'
import '@syncfusion/ej2-buttons/styles/tailwind3.css'
import '@syncfusion/ej2-splitbuttons/styles/tailwind3.css'
import '@syncfusion/ej2-inputs/styles/tailwind3.css'
import '@syncfusion/ej2-lists/styles/tailwind3.css'
import '@syncfusion/ej2-popups/styles/tailwind3.css'
import '@syncfusion/ej2-navigations/styles/tailwind3.css'
import '@syncfusion/ej2-dropdowns/styles/tailwind3.css'
import '@syncfusion/ej2-calendars/styles/tailwind3.css'
import '@syncfusion/ej2-notifications/styles/tailwind3.css'
import '@syncfusion/ej2-layouts/styles/tailwind3.css'
import '@syncfusion/ej2-grids/styles/tailwind3.css'
// HeatMap (ej2-heatmap 34.x) is SVG-rendered; no package styles folder ships with npm.
import '@syncfusion/ej2-schedule/styles/tailwind3.css'
import '@syncfusion/ej2-kanban/styles/tailwind3.css'
import '@syncfusion/ej2-filemanager/styles/tailwind3.css'
// PDF Viewer + Document Editor (full component styles for toolbars/icons)
import '@syncfusion/ej2-pdfviewer/styles/tailwind3.css'
import '@syncfusion/ej2-documenteditor/styles/tailwind3.css'
import '@syncfusion/ej2-documenteditor/styles/document-editor/tailwind3.css'
import '@syncfusion/ej2-documenteditor/styles/document-editor-container/tailwind3.css'
import '@syncfusion/ej2-ribbon/styles/tailwind3.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <PersonaProvider>
          <App />
        </PersonaProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)