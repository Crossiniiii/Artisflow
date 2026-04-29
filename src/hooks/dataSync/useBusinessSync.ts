import { Dispatch, SetStateAction, useEffect } from 'react';
import { supabase } from '../../supabase';
import { ExhibitionEvent, SaleRecord, UserAccount } from '../../types';
import { IS_DEMO_MODE } from '../../constants';
import { mapFromSnakeCase } from '../../utils/supabaseUtils';
import { isSupabaseBadQueryError, isSupabaseMissingRelationError } from './shared';
import { removeRealtimeRecord, updateRealtimeRecord, upsertRealtimeRecord } from './shared';

interface UseBusinessSyncParams {
  currentUser: UserAccount | null;
  shouldLoadFullBusinessData: boolean;
  setSales: Dispatch<SetStateAction<SaleRecord[]>>;
  setEvents: Dispatch<SetStateAction<ExhibitionEvent[]>>;
  setIsLoadingSales: Dispatch<SetStateAction<boolean>>;
  setIsLoadingEvents: Dispatch<SetStateAction<boolean>>;
}

export const useBusinessSync = ({
  currentUser,
  shouldLoadFullBusinessData,
  setSales,
  setEvents,
  setIsLoadingSales,
  setIsLoadingEvents
}: UseBusinessSyncParams) => {
  useEffect(() => {
    if (IS_DEMO_MODE || !currentUser?.id) return;

    const selectSalesWithFallback = async () => {
      const queries = shouldLoadFullBusinessData
        ? [
            () => supabase.from('sales').select('*'),
            () => supabase.from('sales').select('id, artwork_id, client_name, client_email, client_contact, agent_name, sale_date, delivery_date, is_delivered, is_cancelled, status, downpayment, artwork_snapshot')
          ]
        : [
            () => supabase
              .from('sales')
              .select('id, artwork_id, client_name, client_email, client_contact, agent_name, agent_id, sale_date, delivery_date, is_delivered, is_cancelled, status, sold_at_event_id, sold_at_event_name, downpayment, artwork_snapshot')
              .order('sale_date', { ascending: false })
              .limit(80),
            () => supabase
              .from('sales')
              .select('id, artwork_id, client_name, client_email, client_contact, agent_name, sale_date, delivery_date, is_delivered, is_cancelled, status, downpayment, artwork_snapshot')
              .order('sale_date', { ascending: false })
              .limit(80)
          ];

      let lastResponse: any = null;
      for (const runQuery of queries) {
        const response = await runQuery();
        if (!response.error) return response;
        lastResponse = response;
        if (!isSupabaseBadQueryError(response.error)) return response;
      }

      return lastResponse;
    };

    const syncBusinessData = async () => {
      setIsLoadingSales(true);
      setIsLoadingEvents(true);
      try {
        const eventsQuery = shouldLoadFullBusinessData
          ? supabase.from('events').select('*')
          : supabase
              .from('events')
              .select('*')
              .order('start_date', { ascending: false })
              .limit(24);

        const [salesRes, eventsRes] = await Promise.all([
          selectSalesWithFallback(),
          eventsQuery
        ]);
        if (salesRes.error && !isSupabaseMissingRelationError(salesRes.error)) {
          console.warn('[Business Sync] Sales query failed:', salesRes.error.message);
        }
        if (salesRes.data) setSales(mapFromSnakeCase(salesRes.data) as SaleRecord[]);
        if (eventsRes.data) {
          setEvents((mapFromSnakeCase(eventsRes.data) as ExhibitionEvent[]).map(e => ({
            ...e,
            artworkIds: Array.isArray(e.artworkIds) ? e.artworkIds : []
          })));
        }
      } finally {
        setIsLoadingSales(false);
        setIsLoadingEvents(false);
      }
    };

    const handleSalesRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setSales(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedSale = mapFromSnakeCase(payload.new) as SaleRecord;
      if (payload.eventType === 'INSERT') {
        setSales(prev => upsertRealtimeRecord(prev, mappedSale));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setSales(prev => updateRealtimeRecord(prev, mappedSale));
      }
    };

    const handleEventsRealtime = (payload: any) => {
      if (payload.eventType === 'DELETE') {
        setEvents(prev => removeRealtimeRecord(prev, payload.old.id));
        return;
      }

      const mappedEvent = {
        ...(mapFromSnakeCase(payload.new) as ExhibitionEvent),
        artworkIds: Array.isArray(payload.new?.artwork_ids) ? payload.new.artwork_ids : []
      };

      if (payload.eventType === 'INSERT') {
        setEvents(prev => upsertRealtimeRecord(prev, mappedEvent));
        return;
      }

      if (payload.eventType === 'UPDATE') {
        setEvents(prev => updateRealtimeRecord(prev, mappedEvent));
      }
    };

    void syncBusinessData();
    const businessChannel = supabase.channel('business-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, handleSalesRealtime)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, handleEventsRealtime)
      .subscribe();
    return () => { supabase.removeChannel(businessChannel); };
  }, [currentUser?.id, setEvents, setIsLoadingEvents, setIsLoadingSales, setSales, shouldLoadFullBusinessData]);
};
