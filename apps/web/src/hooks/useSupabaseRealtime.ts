"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSupabase, SupabaseClient } from "../lib/supabase";

type RealtimePayload<T = any> = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T | null;
  old: T | null;
  errors: string[] | null;
};

type ChannelStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

interface UseSupabaseRealtimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: "*" | "INSERT" | "UPDATE" | "DELETE";
  enabled?: boolean;
  onInsert?: (payload: RealtimePayload) => void;
  onUpdate?: (payload: RealtimePayload) => void;
  onDelete?: (payload: RealtimePayload) => void;
  onChange?: (payload: RealtimePayload) => void;
}

export function useSupabaseRealtime<T = any>({
  table,
  schema = "public",
  filter,
  event = "*",
  enabled = true,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseSupabaseRealtimeOptions) {
  const [data, setData] = useState<T[]>([]);
  const [status, setStatus] = useState<ChannelStatus>("CLOSED");
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);
  const callbacksRef = useRef({ onInsert, onUpdate, onDelete, onChange });

  callbacksRef.current = { onInsert, onUpdate, onDelete, onChange };

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase not configured");
      return;
    }

    let channel = supabase.channel(`realtime:${table}`);

    const config: any = {
      event,
      schema,
      table,
    };

    if (filter) {
      config.filter = filter;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    channel = (channel as any).on(
      "postgres_changes",
      config,
      (payload: RealtimePayload<T>) => {
        const { onInsert, onUpdate, onDelete, onChange } = callbacksRef.current;

        switch (payload.eventType) {
          case "INSERT":
            if (payload.new) {
              setData((prev) => [...prev, payload.new!]);
              onInsert?.(payload);
            }
            break;
          case "UPDATE":
            if (payload.new) {
              setData((prev) =>
                prev.map((item: any) =>
                  item.id === (payload.new as any).id ? payload.new! : item
                )
              );
              onUpdate?.(payload);
            }
            break;
          case "DELETE":
            if (payload.old) {
              setData((prev) =>
                prev.filter((item: any) => item.id !== (payload.old as any).id)
              );
              onDelete?.(payload);
            }
            break;
        }

        onChange?.(payload);
      }
    );

    channel.subscribe((status: ChannelStatus) => {
      setStatus(status);
      if (status === "CHANNEL_ERROR") {
        setError("Channel subscription failed");
      }
    });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, schema, filter, event, enabled]);

  const subscribe = useCallback(() => {
    channelRef.current?.subscribe();
  }, []);

  const unsubscribe = useCallback(() => {
    channelRef.current?.unsubscribe();
    channelRef.current = null;
  }, []);

  return {
    data,
    setData,
    status,
    error,
    subscribe,
    unsubscribe,
  };
}

interface UseRealtimePresenceOptions {
  channelName: string;
  userInfo?: Record<string, any>;
  enabled?: boolean;
}

export function useRealtimePresence({
  channelName,
  userInfo = {},
  enabled = true,
}: UseRealtimePresenceOptions) {
  const [presenceState, setPresenceState] = useState<Record<string, any>>({});
  const [myPresenceId, setMyPresenceId] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    if (!supabase) return;

    const channel = supabase.channel(channelName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setPresenceState(state);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }: any) => {
        setMyPresenceId(key);
      })
      .subscribe(async (status: ChannelStatus) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            ...userInfo,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [channelName, enabled]);

  const updatePresence = useCallback(
    async (newInfo: Record<string, any>) => {
      if (!channelRef.current) return;
      await channelRef.current.track({
        ...newInfo,
        online_at: new Date().toISOString(),
      });
    },
    []
  );

  const onlineUsers = Object.values(presenceState).flat() as any[];

  return {
    presenceState,
    onlineUsers,
    myPresenceId,
    updatePresence,
  };
}

interface UseSupabaseAuthOptions {
  enabled?: boolean;
}

export function useSupabaseAuth({ enabled = true }: UseSupabaseAuthOptions = {}) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;

    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [enabled]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase not configured");
      return supabase.auth.signInWithPassword({ email, password });
    },
    []
  );

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase not configured");
    return supabase.auth.signOut();
  }, []);

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAuthenticated: Boolean(session),
  };
}
