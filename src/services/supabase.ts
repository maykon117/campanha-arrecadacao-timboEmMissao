import type { AppData, PackageContentUnit } from '../types';
import { supabase } from '../lib/supabase';

export async function loadData(): Promise<AppData> {
  const [{ data: campaigns, error: cErr }, { data: foods, error: fErr }, { data: donations, error: dErr }] =
    await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: true }).limit(1),
      supabase.from('foods').select('*').order('created_at', { ascending: true }),
      supabase.from('donations').select('*').order('created_at', { ascending: true }),
    ]);

  if (cErr) throw cErr;
  if (fErr) throw fErr;
  if (dErr) throw dErr;

  if (!campaigns?.length) {
    throw new Error('Nenhuma campanha encontrada. Execute o supabase/schema.sql no SQL Editor.');
  }

  const campaign = campaigns[0];
  return {
    campaign: {
      id: campaign.id,
      name: campaign.name,
      metaKg: Number(campaign.meta_kg),
      dataCriacao: campaign.created_at,
      description: campaign.description ?? '',
    },
    foods: (foods ?? []).filter((f: any) => f.campaign_id === campaign.id).map((f: any) => ({
      id: f.id,
      campanhaId: f.campaign_id,
      nome: f.name,
      unidade: f.unit,
      conteudoQuantidade: Number(f.package_content_quantity ?? f.weight_per_unit_grams),
      unidadeConteudo: (f.package_content_unit ?? 'g') as PackageContentUnit,
      densidadeGramasPorMl: f.density_g_per_ml == null ? null : Number(f.density_g_per_ml),
      pesoPorUnidadeGramas: Number(f.weight_per_unit_grams),
      metaQuantidade: Number(f.target_quantity),
    })),
    donations: (donations ?? []).filter((d: any) => (foods ?? []).some((f: any) => f.id === d.food_id && f.campaign_id === campaign.id)).map((d: any) => ({
      id: d.id,
      alimentoId: d.food_id,
      quantidade: Number(d.quantity),
      dataCriacao: d.created_at,
    })),
  };
}

/**
 * Mantém o modelo atual do frontend, mas grava no Postgres.
 * As operações são upsert/delete para que edição e exclusão continuem simples.
 */
export async function saveData(data: AppData) {
  const { error: campaignError } = await supabase.from('campaigns').upsert({
    id: data.campaign.id,
    name: data.campaign.name,
    meta_kg: data.campaign.metaKg,
    description: data.campaign.description,
  });
  if (campaignError) throw campaignError;

  const { data: existingFoods, error: existingFoodsError } =
    await supabase.from('foods').select('id').eq('campaign_id', data.campaign.id);
  if (existingFoodsError) throw existingFoodsError;

  const foodIds = new Set(data.foods.map(f => f.id));
  const foodsToDelete = (existingFoods ?? []).map(f => f.id).filter(id => !foodIds.has(id));
  if (foodsToDelete.length) {
    const { error } = await supabase.from('foods').delete().in('id', foodsToDelete);
    if (error) throw error;
  }

  if (data.foods.length) {
    const { error } = await supabase.from('foods').upsert(
      data.foods.map(f => ({
        id: f.id,
        campaign_id: f.campanhaId,
        name: f.nome,
        unit: f.unidade,
        package_content_quantity: f.conteudoQuantidade,
        package_content_unit: f.unidadeConteudo,
        density_g_per_ml: f.densidadeGramasPorMl,
        weight_per_unit_grams: f.pesoPorUnidadeGramas,
        target_quantity: f.metaQuantidade,
      }))
    );
    if (error) throw error;
  }

  const { data: existingDonations, error: existingDonationsError } =
    await supabase.from('donations').select('id');
  if (existingDonationsError) throw existingDonationsError;

  const donationIds = new Set(data.donations.map(d => d.id));
  const donationsToDelete = (existingDonations ?? []).map(d => d.id).filter(id => !donationIds.has(id));
  if (donationsToDelete.length) {
    const { error } = await supabase.from('donations').delete().in('id', donationsToDelete);
    if (error) throw error;
  }

  if (data.donations.length) {
    const { error } = await supabase.from('donations').upsert(
      data.donations.map(d => ({
        id: d.id,
        food_id: d.alimentoId,
        quantity: d.quantidade,
        created_at: d.dataCriacao,
      }))
    );
    if (error) throw error;
  }
}

export function subscribeToChanges(onChange: () => void) {
  const channel = supabase
    .channel('timbo-em-missao-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'foods' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'donations' }, onChange)
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}
