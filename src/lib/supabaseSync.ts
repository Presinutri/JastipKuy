/**
 * supabaseSync.ts
 * Semua operasi CRUD ke Supabase untuk JastipKuy.
 * Import types-only dari store untuk menghindari circular dependency runtime.
 */
import { supabase } from './supabase';
import type { JastipItem, Customer, JastipSession, CustomerShipping, FeeType } from '@/store/useJastipStore';

// ── Item ────────────────────────────────────────────────────────────────────

export async function upsertItem(item: JastipItem, customerId: string): Promise<void> {
  const { error } = await supabase.from('items').upsert({
    id: item.id,
    customer_id: customerId,
    name: item.name,
    qty: item.qty,
    original_price: item.originalPrice,
    currency: item.currency,
    idr_price: item.idrPrice,
    weight: item.weight,
    fee_type: item.feeType,
    fee_percentage: item.feePercentage,
    fee_fixed: item.feeFixed,
    fee_amount: item.feeAmount,
    shipping_per_item: item.shippingPerItem,
    total_item_cost: item.totalItemCost,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
}

// ── Customer ─────────────────────────────────────────────────────────────────

export async function upsertCustomer(customer: Customer, sessionId: string): Promise<void> {
  const { error } = await supabase.from('customers').upsert({
    id: customer.id,
    session_id: sessionId,
    name: customer.name,
    is_paid: customer.isPaid ?? false,
    origin_id: customer.shipping.originId,
    origin_name: customer.shipping.originName,
    destination_id: customer.shipping.destinationId,
    destination_name: customer.shipping.destinationName,
    courier: customer.shipping.courier,
    service: customer.shipping.service,
    total_weight: customer.shipping.totalWeight,
    total_shipping_cost: customer.shipping.totalShippingCost,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

// ── Session ───────────────────────────────────────────────────────────────────

export async function upsertSession(session: JastipSession): Promise<void> {
  const { error } = await supabase.from('sessions').upsert({
    id: session.id,
    name: session.name,
    active_customer_id: session.activeCustomerId,
    created_at: session.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

// ── App State ─────────────────────────────────────────────────────────────────

export async function saveActiveSessionId(id: string): Promise<void> {
  const { error } = await supabase
    .from('app_state')
    .upsert({ key: 'active_session_id', value: id });
  if (error) throw error;
}

// ── Full Load (on app init) ───────────────────────────────────────────────────

export interface LoadedData {
  sessions: JastipSession[];
  activeSessionId: string;
}

export async function loadAllData(): Promise<LoadedData | null> {
  try {
    const [sessionsRes, customersRes, itemsRes, appStateRes] = await Promise.all([
      supabase.from('sessions').select('*').order('created_at', { ascending: true }),
      supabase.from('customers').select('*').order('created_at', { ascending: true }),
      supabase.from('items').select('*').order('created_at', { ascending: true }),
      supabase.from('app_state').select('value').eq('key', 'active_session_id').maybeSingle(),
    ]);

    // Jika ada error (misal tabel belum ada), log detail dan return null
    if (sessionsRes.error) {
      console.warn('[Supabase] Gagal fetch sessions:', sessionsRes.error.message, sessionsRes.error.code);
      return null;
    }
    if (customersRes.error) {
      console.warn('[Supabase] Gagal fetch customers:', customersRes.error.message);
      return null;
    }
    if (itemsRes.error) {
      console.warn('[Supabase] Gagal fetch items:', itemsRes.error.message);
      return null;
    }

    const sessionsData = (sessionsRes.data ?? []) as any[];
    // Supabase is empty → caller will sync localStorage data up
    if (sessionsData.length === 0) return null;

    const customersData = (customersRes.data ?? []) as any[];
    const itemsData = (itemsRes.data ?? []) as any[];

    const sessions: JastipSession[] = sessionsData.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      activeCustomerId: s.active_customer_id as string,
      createdAt: s.created_at as string,
      customers: customersData
        .filter((c) => c.session_id === s.id)
        .map((c) => ({
          id: c.id as string,
          name: c.name as string,
          isPaid: c.is_paid as boolean,
          shipping: {
            originId: (c.origin_id as string) ?? '',
            originName: (c.origin_name as string) ?? '',
            destinationId: (c.destination_id as string) ?? '',
            destinationName: (c.destination_name as string) ?? '',
            courier: (c.courier as string) ?? 'jne',
            service: (c.service as string) ?? '',
            totalWeight: (c.total_weight as number) ?? 0,
            totalShippingCost: (c.total_shipping_cost as number) ?? 0,
          } as CustomerShipping,
          items: itemsData
            .filter((i) => i.customer_id === c.id)
            .map((i) => ({
              id: i.id as string,
              name: i.name as string,
              qty: (i.qty as number) ?? 1,
              originalPrice: (i.original_price as number) ?? 0,
              currency: (i.currency as string) ?? 'MYR',
              idrPrice: (i.idr_price as number) ?? 0,
              weight: (i.weight as number) ?? 0,
              feeType: ((i.fee_type as string) ?? 'percentage') as FeeType,
              feePercentage: (i.fee_percentage as number) ?? 0,
              feeFixed: (i.fee_fixed as number) ?? 0,
              feeAmount: (i.fee_amount as number) ?? 0,
              shippingPerItem: (i.shipping_per_item as number) ?? 0,
              totalItemCost: (i.total_item_cost as number) ?? 0,
            } as JastipItem)),
        })),
    }));

    const activeSessionId =
      (appStateRes.data?.value as string | null) || sessions[0]?.id || '';

    return { sessions, activeSessionId };
  } catch (err: unknown) {
    // Network error, CORS, dll — app tetap berjalan dengan localStorage
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.warn('[Supabase] loadAllData gagal, pakai localStorage:', msg);
    return null;
  }
}

// ── Full Sync (migration dari localStorage ke Supabase) ───────────────────────

export async function syncAllToSupabase(
  sessions: JastipSession[],
  activeSessionId: string
): Promise<void> {
  for (const session of sessions) {
    await upsertSession(session);
    for (const customer of session.customers) {
      await upsertCustomer(customer, session.id);
      for (const item of customer.items) {
        await upsertItem(item, customer.id);
      }
    }
  }
  await saveActiveSessionId(activeSessionId);
}
