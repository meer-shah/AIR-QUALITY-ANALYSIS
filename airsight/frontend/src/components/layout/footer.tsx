/** Footer — data source + year + visual-system credit. Paper with a top line. */
import * as React from 'react';
import { PageContainer } from './page-container';

export const Footer: React.FC = () => (
  <footer className="mt-auto border-t border-line bg-paper">
    <PageContainer className="py-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-body-sm text-ink-700">
          Data: Red de Monitoreo de Calidad del Aire de Bogotá (RMCAB), 2021.
        </span>
        <span className="text-caption text-ink-500">
          AirSight — Bogotá's air, made legible. 19 stations, 65,664 hourly records.
        </span>
      </div>
      <span className="text-caption text-ink-500">Visual system: MarcVista</span>
    </PageContainer>
  </footer>
);
