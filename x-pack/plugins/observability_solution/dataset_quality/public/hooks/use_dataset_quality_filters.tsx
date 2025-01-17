/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnRefreshChangeProps } from '@elastic/eui';
import { useSelector } from '@xstate/react';
import { useCallback, useMemo } from 'react';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { IntegrationItem } from '../components/dataset_quality/filters/integrations_selector';

export const useDatasetQualityFilters = () => {
  const { service } = useDatasetQualityContext();

  const isLoading = useSelector(service, (state) => state.matches('datasets.fetching'));
  const {
    timeRange,
    integrations: selectedIntegrations,
    query: selectedQuery,
  } = useSelector(service, (state) => state.context.filters);
  const integrations = useSelector(service, (state) => state.context.integrations);

  const onTimeChange = useCallback(
    (selectedTime: { start: string; end: string; isInvalid: boolean }) => {
      if (selectedTime.isInvalid) {
        return;
      }

      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          from: selectedTime.start,
          to: selectedTime.end,
        },
      });
    },
    [service, timeRange]
  );

  const onRefresh = useCallback(() => {
    service.send({
      type: 'REFRESH_DATA',
    });
  }, [service]);

  const onRefreshChange = useCallback(
    ({ refreshInterval, isPaused }: OnRefreshChangeProps) => {
      service.send({
        type: 'UPDATE_TIME_RANGE',
        timeRange: {
          ...timeRange,
          refresh: {
            pause: isPaused,
            value: refreshInterval,
          },
        },
      });
    },
    [service, timeRange]
  );

  const integrationItems: IntegrationItem[] = useMemo(
    () =>
      integrations.map((integration) => ({
        ...integration,
        label: integration.title,
        checked: selectedIntegrations.includes(integration.name) ? 'on' : undefined,
      })),
    [integrations, selectedIntegrations]
  );

  const onIntegrationsChange = useCallback(
    (newIntegrationItems: IntegrationItem[]) => {
      service.send({
        type: 'UPDATE_INTEGRATIONS',
        integrations: newIntegrationItems
          .filter((integration) => integration.checked === 'on')
          .map((integration) => integration.name),
      });
    },
    [service]
  );

  const onQueryChange = useCallback(
    (query: string) => {
      service.send({
        type: 'UPDATE_QUERY',
        query,
      });
    },
    [service]
  );

  return {
    timeRange,
    onTimeChange,
    onRefresh,
    onRefreshChange,
    integrations: integrationItems,
    onIntegrationsChange,
    isLoading,
    selectedQuery,
    onQueryChange,
  };
};
