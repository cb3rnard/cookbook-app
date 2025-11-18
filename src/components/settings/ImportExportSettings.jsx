import { Card, Flex } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { useData } from '../../contexts';
import { DetailedCountBox } from '../ui/DetailedCountBox';
import { ExportSettings } from './importExport/ExportSettings';
import { ImportSettings } from './importExport/ImportSettings';

export function ImportExportSettings() {
  const [currentView, setCurrentView] = useState(null);
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
        {currentView !== 'import' &&
          <Card asChild flexBasis="50%" >
            <ExportSettings setCurrentView={setCurrentView} />
          </Card>
        }
        {currentView !== 'export' &&
          <Card asChild flexBasis="50%" >
            <ImportSettings setCurrentView={setCurrentView} />
          </Card>
        }
      </Flex>
    </Flex>
  );
};