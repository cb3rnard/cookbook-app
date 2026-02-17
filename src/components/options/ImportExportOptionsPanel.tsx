import { Card, Flex } from '@radix-ui/themes';
import { useData } from '@src/contexts/DataContext';
import { useEffect, useState } from 'react';
import { DetailedCountBox } from '../ui/DetailedCountBox';
import { ExportOptionsPanel } from './importExport/ExportOptionPanel';
import { ImportOptionsPanel } from './importExport/ImportOptionPanel';

export function ImportExportOptionsPanel() {
  const [currentView, setCurrentView] = useState('');
  const { localCounts, fetchLocalCounts } = useData();
  useEffect(() => {
    const fetchData = async () => {
      await fetchLocalCounts();
    };
    fetchData();
  }, [fetchLocalCounts]);

  return (
    <Flex gap="3" direction="column">
      <DetailedCountBox type="local" counts={localCounts} />
      <Flex gap="2">
        {currentView !== 'import' && (
          <Card asChild>
            <ExportOptionsPanel setCurrentView={setCurrentView} />
          </Card>
        )}
        {currentView !== 'export' && (
          <Card asChild>
            <ImportOptionsPanel setCurrentView={setCurrentView} />
          </Card>
        )}
      </Flex>
    </Flex>
  );
}
