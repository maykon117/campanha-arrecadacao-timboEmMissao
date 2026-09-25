import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronRight, Edit3, ExternalLink, History, Home, Package, PackagePlus, Plus, Settings, Share2, Target, Trash2, TrendingUp, Users, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Modal from './components/Modal';
import Progress from './components/Progress';
import type { AppData, Donation, Food } from './types';
import { donatedQty, foodKg, foodMetaKg, foodPercent, fmt } from './utils/calculations';
import { loadData, saveData, subscribeToChanges } from './services/supabase';

const units = ['pacotes', 'unidades', 'caixas', 'sacos', 'latas'];
type View = 'dashboard' | 'foods' | 'history' | 'publish' | 'settings';

const input = 'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none transition focus:border-slate-700 focus:ring-2 focus:ring-slate-100';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<div className="mt-1">{children}</div></label>;
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const [view, setView] = useState<View>('dashboard');

  const refreshFromSupabase = async () => {
    try {
      const next = await loadData();
      setData(next);
      setConnectionError('');
    } catch (error: any) {
      setConnectionError(error?.message || 'Não foi possível conectar ao Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshFromSupabase();
    return subscribeToChanges(() => { void refreshFromSupabase(); });
  }, []);
  const [modal, setModal] = useState<'food' | 'donation' | 'settings' | null>(null);
  const [selected, setSelected] = useState<Food | null>(null);
  const [toast, setToast] = useState('');

  const persist = (next: AppData) => {
    setData(next);
    void saveData(next).catch((error: any) => {
      setConnectionError(error?.message || 'Não foi possível salvar no Supabase.');
    });
  };
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2500); };

  const stats = useMemo(() => {
    if (!data) return { total: 0, remaining: 0, pct: 0 };
    const total = data.foods.reduce((sum, food) => sum + foodKg(food, data.donations), 0);
    return { total, remaining: Math.max(data.campaign.metaKg - total, 0), pct: total / data.campaign.metaKg * 100 };
  }, [data]);

  const chart = data?.foods.map(food => ({ name: food.nome, arrecadado: Number(foodKg(food, data.donations).toFixed(2)), meta: Number(foodMetaKg(food).toFixed(2)) })) ?? [];
  const recent = data ? [...data.donations].sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao)).slice(0, 6) : [];

  function addFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data) return; const fd = new FormData(e.currentTarget);
    const nome = String(fd.get('nome')).trim(), peso = Number(fd.get('peso')), meta = Number(fd.get('meta'));
    if (!nome || peso <= 0 || meta <= 0) return notify('Preencha os campos com valores válidos.');
    const food: Food = { id: crypto.randomUUID(), campanhaId: data.campaign.id, nome, unidade: String(fd.get('unidade')), pesoPorUnidadeGramas: peso, metaQuantidade: meta };
    persist({ ...data, foods: [...data.foods, food] }); setModal(null); notify('Alimento adicionado à missão.');
  }

  function editFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data || !selected) return; const fd = new FormData(e.currentTarget);
    const nome = String(fd.get('nome')).trim(), peso = Number(fd.get('peso')), meta = Number(fd.get('meta'));
    if (!nome || peso <= 0 || meta <= 0) return notify('Preencha os campos com valores válidos.');
    const food = { ...selected, nome, unidade: String(fd.get('unidade')), pesoPorUnidadeGramas: peso, metaQuantidade: meta };
    persist({ ...data, foods: data.foods.map(x => x.id === food.id ? food : x) }); setModal(null); setSelected(null); notify('Alimento atualizado.');
  }

  function addDonation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data) return; const fd = new FormData(e.currentTarget), alimentoId = String(fd.get('alimentoId')), quantidade = Number(fd.get('quantidade'));
    if (!alimentoId || quantidade <= 0) return notify('Informe uma quantidade válida.');
    const donation: Donation = { id: crypto.randomUUID(), alimentoId, quantidade, dataCriacao: new Date().toISOString() };
    persist({ ...data, donations: [...data.donations, donation] }); setModal(null); notify('Arrecadação registrada.');
  }

  function deleteFood(food: Food) {
    if (!data) return;
    if (!confirm(`Excluir ${food.nome}? As arrecadações desse alimento também serão removidas.`)) return;
    persist({ ...data, foods: data.foods.filter(x => x.id !== food.id), donations: data.donations.filter(d => d.alimentoId !== food.id) }); notify('Alimento excluído.');
  }
  function deleteDonation(id: string) {
    if (!data) return;
    if (!confirm('Excluir esta arrecadação?')) return;
    persist({ ...data, donations: data.donations.filter(d => d.id !== id) }); notify('Arrecadação excluída.');
  }
  function saveCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!data) return; const fd = new FormData(e.currentTarget), name = String(fd.get('name')).trim(), meta = Number(fd.get('meta')), desc = String(fd.get('description')).trim();
    if (!name || meta <= 0) return notify('Informe nome e meta válidos.');
    persist({ ...data, campaign: { ...data.campaign, name, metaKg: meta, description: desc } }); setModal(null); notify('Informações da missão atualizadas.');
  }

  const publicUrl = `${window.location.origin}${window.location.pathname}?view=public`;
  const obsUrl = `${window.location.origin}${window.location.pathname}?view=obs`;

  const params = new URLSearchParams(window.location.search);
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="rounded-2xl bg-white p-8 text-center shadow-sm"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900"/><p className="mt-4 font-semibold">Conectando à campanha...</p></div></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm"><p className="font-bold text-red-700">Não foi possível carregar a campanha</p><p className="mt-2 text-sm text-slate-600">{connectionError || 'Verifique as configurações do Supabase.'}</p><button onClick={() => {setLoading(true);void refreshFromSupabase()}} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Tentar novamente</button></div></div>;
  if (params.get('view') === 'obs') return <ObsView data={data} />;
  if (params.get('view') === 'public') return <PublicView data={data} />;

  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-[#0d1b2a] text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#0d1b2a]"><Users size={23}/></div><div><p className="font-bold">Timbó em Missão</p><p className="text-xs text-slate-300">Ação Social</p></div></div></div>
        <nav className="space-y-1 px-3 py-5">
          <Nav active={view === 'dashboard'} icon={<Home size={18}/>} label="Visão geral" onClick={() => setView('dashboard')} />
          <Nav active={view === 'foods'} icon={<Package size={18}/>} label="Alimentos" onClick={() => setView('foods')} />
          <Nav active={false} icon={<PackagePlus size={18}/>} label="Registrar arrecadação" onClick={() => setModal('donation')} disabled={!data.foods.length}/>
          <Nav active={view === 'history'} icon={<History size={18}/>} label="Histórico" onClick={() => setView('history')} />
          <Nav active={view === 'publish'} icon={<Share2 size={18}/>} label="Publicar / OBS" onClick={() => setView('publish')} />
        </nav>
        <div className="mt-auto border-t border-white/10 p-5"><button onClick={() => setModal('settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-200 hover:bg-white/10"><Settings size={18}/> Configurações</button><p className="mt-8 text-xs leading-5 text-slate-400">Cada alimento é um gesto de cuidado. Juntos, fazemos mais.</p></div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-white lg:hidden"><Users size={20}/></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Timbó em Missão</p><h1 className="text-lg font-bold sm:text-xl">{data.campaign.name}</h1></div></div><div className="flex items-center gap-2"><a href={publicUrl} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 sm:flex"><ExternalLink size={16}/> Página pública</a><button onClick={() => setModal('settings')} className="rounded-xl border border-slate-200 p-2.5 hover:bg-slate-50"><Settings size={17}/></button></div></div></header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8">
          {view === 'dashboard' && <Dashboard data={data} stats={stats} chart={chart} recent={recent} onAddFood={() => setModal('food')} onDonation={() => setModal('donation')} onFoods={() => setView('foods')} onHistory={() => setView('history')} onDeleteDonation={deleteDonation} />}
          {view === 'foods' && <FoodsPage data={data} onAdd={() => setModal('food')} onEdit={(food) => {setSelected(food);setModal('food')}} onDelete={deleteFood} onAddDonation={(food) => {setSelected(food);setModal('donation')}} />}
          {view === 'history' && <HistoryPage data={data} onDelete={deleteDonation} />}
          {view === 'publish' && <PublishPage publicUrl={publicUrl} obsUrl={obsUrl} />}
        </div>
      </main>
    </div>

    {toast && <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>}
    {modal === 'food' && <Modal title={selected ? 'Editar alimento' : 'Adicionar alimento'} onClose={() => {setModal(null);setSelected(null)}}><form onSubmit={selected ? editFood : addFood} className="space-y-4"><Field label="Nome do alimento"><input name="nome" className={input} defaultValue={selected?.nome || ''} placeholder="Ex.: Cesta básica / Café" autoFocus/></Field><div className="grid grid-cols-2 gap-3"><Field label="Unidade"><select name="unidade" className={input} defaultValue={selected?.unidade || 'pacotes'}>{units.map(u => <option key={u}>{u}</option>)}</select></Field><Field label="Peso por unidade (g)"><input name="peso" type="number" min="1" step="1" className={input} defaultValue={selected?.pesoPorUnidadeGramas || ''} placeholder="1000"/></Field></div><Field label="Meta em unidades"><input name="meta" type="number" min="1" step="1" className={input} defaultValue={selected?.metaQuantidade || ''} placeholder="300"/></Field><button className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white">{selected ? 'Salvar alterações' : 'Adicionar alimento'}</button></form></Modal>}
    {modal === 'donation' && <Modal title="Registrar arrecadação" onClose={() => {setModal(null);setSelected(null)}}><form onSubmit={addDonation} className="space-y-4"><Field label="Alimento"><select name="alimentoId" className={input} defaultValue={selected?.id || ''}>{data.foods.map(food => <option key={food.id} value={food.id}>{food.nome} — {food.unidade}</option>)}</select></Field><Field label="Quantidade recebida"><input name="quantidade" type="number" min="1" step="1" className={input} placeholder="20" autoFocus/></Field><p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">O peso será convertido automaticamente para kg. Nenhuma conta manual é necessária.</p><button className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700">Registrar arrecadação</button></form></Modal>}
    {modal === 'settings' && <Modal title="Configurações da ação" onClose={() => setModal(null)}><form onSubmit={saveCampaign} className="space-y-4"><Field label="Nome da ação"><input name="name" className={input} defaultValue={data.campaign.name}/></Field><Field label="Meta geral (kg)"><input name="meta" type="number" min="1" step="0.01" className={input} defaultValue={data.campaign.metaKg}/></Field><Field label="Descrição"><textarea name="description" rows={3} className={input} defaultValue={data.campaign.description}/></Field><button className="w-full rounded-xl bg-slate-900 py-3 font-semibold text-white">Salvar alterações</button></form></Modal>}
  </div>;
}

function Nav({active, icon, label, onClick, disabled=false}:{active:boolean;icon:React.ReactNode;label:string;onClick:()=>void;disabled?:boolean}) { return <button disabled={disabled} onClick={onClick} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${active ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'} ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}>{icon}{label}</button>; }

function Dashboard({data,stats,chart,recent,onAddFood,onDonation,onFoods,onHistory,onDeleteDonation}:{data:AppData;stats:{total:number;remaining:number;pct:number};chart:any[];recent:Donation[];onAddFood:()=>void;onDonation:()=>void;onFoods:()=>void;onHistory:()=>void;onDeleteDonation:(id:string)=>void}) {
  return <>
    <section className="mb-7"><p className="text-sm font-semibold text-slate-500">AÇÃO SOCIAL</p><div className="mt-1 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><h2 className="text-3xl font-black tracking-tight sm:text-4xl">{data.campaign.name}</h2><p className="mt-2 max-w-2xl text-slate-500">{data.campaign.description}</p></div><div className="text-sm text-slate-500">Criada em {new Date(data.campaign.dataCriacao).toLocaleDateString('pt-BR')}</div></div></section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={<Target/>} label="Meta da ação" value={`${fmt(data.campaign.metaKg)} kg`}/><Stat icon={<PackagePlus/>} label="Arrecadado" value={`${fmt(stats.total)} kg`}/><Stat icon={<TrendingUp/>} label="Ainda falta" value={stats.pct >= 100 ? 'Meta alcançada' : `${fmt(stats.remaining)} kg`}/><Stat icon={<BarChart3/>} label="Progresso" value={`${fmt(stats.pct)}%`} positive={stats.pct >= 100}/></section>
    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-end justify-between gap-3"><div><p className="text-sm font-semibold text-slate-500">Progresso da arrecadação</p><p className="mt-1 text-2xl font-black">{fmt(stats.total)} / {fmt(data.campaign.metaKg)} kg</p></div><div className="text-right"><p className={`text-2xl font-black ${stats.pct >= 100 ? 'text-emerald-600' : ''}`}>{fmt(stats.pct)}%</p><p className="text-sm text-slate-500">{stats.pct > 100 ? `Meta superada em ${fmt(stats.pct - 100)}%` : stats.pct >= 100 ? '🎯 Meta atingida!' : 'da meta geral'}</p></div></div><div className="mt-4"><Progress value={stats.pct}/></div></section>
    <section className="mt-6 flex flex-col gap-3 sm:flex-row"><button onClick={onDonation} disabled={!data.foods.length} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={18}/> Registrar arrecadação</button><button onClick={onAddFood} className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-bold hover:bg-slate-50"><Package size={18}/> Adicionar alimento</button></section>
    <section className="mt-8 grid gap-6 lg:grid-cols-5"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-bold">Arrecadação por alimento</h3><p className="text-sm text-slate-500">Peso convertido automaticamente para kg</p></div><BarChart3 size={20} className="text-slate-400"/></div>{chart.length ? <div className="h-80"><ResponsiveContainer><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis unit=" kg"/><Tooltip formatter={(v:any)=>`${v} kg`}/><Bar dataKey="arrecadado" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div> : <Empty text="Você ainda não cadastrou nenhum alimento."/>}</div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2"><h3 className="font-bold">Metas dos alimentos</h3><p className="mb-5 text-sm text-slate-500">Veja quem está mais perto da meta.</p><div className="space-y-5">{data.foods.map(food => <FoodProgress key={food.id} food={food} donations={data.donations}/>)}{!data.foods.length && <Empty text="Nenhum alimento cadastrado."/>}</div></div></section>
    <section className="mt-8 grid gap-6 xl:grid-cols-5"><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-3"><div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold">Alimentos da missão</h3><p className="text-sm text-slate-500">Acompanhe quantidade e peso arrecadados.</p></div><button onClick={onFoods} className="flex items-center gap-1 text-sm font-bold text-blue-600">Ver todos <ChevronRight size={16}/></button></div><div className="divide-y">{data.foods.slice(0,5).map(food => <FoodRow key={food.id} food={food} donations={data.donations}/>)}{!data.foods.length && <div className="p-8"><Empty text="Você ainda não cadastrou nenhum alimento."/></div>}</div></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2"><div className="flex items-center justify-between border-b p-5"><div><h3 className="font-bold">Últimas arrecadações</h3><p className="text-sm text-slate-500">Registros mais recentes.</p></div><button onClick={onHistory} className="text-sm font-bold text-blue-600">Ver histórico</button></div>{recent.length ? <div className="divide-y">{recent.map(d => { const f=data.foods.find(x=>x.id===d.alimentoId); return f ? <div key={d.id} className="flex items-center justify-between gap-3 p-4"><div><p className="font-semibold">{f.nome}</p><p className="text-xs text-slate-500">{new Date(d.dataCriacao).toLocaleDateString('pt-BR')} · +{fmt(d.quantidade,0)} {f.unidade}</p></div><div className="text-right"><p className="font-bold text-emerald-600">+{fmt(d.quantidade*f.pesoPorUnidadeGramas/1000)} kg</p><button onClick={()=>onDeleteDonation(d.id)} className="mt-1 text-xs text-slate-400 hover:text-red-600">Excluir</button></div></div> : null;})}</div> : <Empty text="Nenhuma arrecadação registrada."/>}</div></section>
  </>;
}

function FoodsPage({data,onAdd,onEdit,onDelete,onAddDonation}:{data:AppData;onAdd:()=>void;onEdit:(f:Food)=>void;onDelete:(f:Food)=>void;onAddDonation:(f:Food)=>void}) { return <section><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-slate-500">GESTÃO</p><h2 className="mt-1 text-3xl font-black">Alimentos</h2><p className="mt-1 text-slate-500">Cadastre as metas e acompanhe cada item arrecadado.</p></div><button onClick={onAdd} className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white"><Plus size={18}/> Adicionar alimento</button></div>{data.foods.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.foods.map(food=><FoodCard key={food.id} food={food} donations={data.donations} onAdd={()=>onAddDonation(food)} onEdit={()=>onEdit(food)} onDelete={()=>onDelete(food)}/>)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center"><Package size={32} className="mx-auto text-slate-300"/><p className="mt-3 font-bold">Você ainda não cadastrou nenhum alimento.</p><p className="mt-1 text-sm text-slate-500">Adicione os alimentos que farão parte da arrecadação.</p></div>}</section>; }

function HistoryPage({data,onDelete}:{data:AppData;onDelete:(id:string)=>void}) { return <section><div className="mb-6"><p className="text-sm font-semibold text-slate-500">TRANSPARÊNCIA</p><h2 className="mt-1 text-3xl font-black">Histórico de arrecadações</h2><p className="mt-1 text-slate-500">Todos os lançamentos ficam preservados para conferência.</p></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{data.donations.length ? <div className="divide-y">{[...data.donations].reverse().map(d=>{const f=data.foods.find(x=>x.id===d.alimentoId); if(!f)return null; return <div key={d.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"><div><p className="font-bold">{f.nome}</p><p className="text-sm text-slate-500">{new Date(d.dataCriacao).toLocaleString('pt-BR')}</p></div><span className="text-sm font-semibold">+{fmt(d.quantidade,0)} {f.unidade}</span><span className="font-bold text-emerald-600">+{fmt(d.quantidade*f.pesoPorUnidadeGramas/1000)} kg</span><button onClick={()=>onDelete(d.id)} className="justify-self-start rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 sm:justify-self-end"><Trash2 size={18}/></button></div>})}</div> : <div className="p-12 text-center text-sm text-slate-500">Nenhuma arrecadação registrada.</div>}</div></section>; }

function PublishPage({publicUrl,obsUrl}:{publicUrl:string;obsUrl:string}) { const copy=(url:string)=>navigator.clipboard?.writeText(url); return <section><div className="mb-6"><p className="text-sm font-semibold text-slate-500">PUBLICAÇÃO</p><h2 className="mt-1 text-3xl font-black">Publicar e usar no OBS</h2><p className="mt-1 max-w-2xl text-slate-500">Use uma página limpa para compartilhar a evolução da ação ou adicionar como Browser Source no OBS.</p></div><div className="grid gap-5 lg:grid-cols-2"><ShareCard title="Página pública" description="Para enviar o link para membros da igreja, participantes e público." url={publicUrl} icon={<Share2/>} onCopy={()=>copy(publicUrl)}/><ShareCard title="Modo OBS" description="Layout enxuto para usar como Browser Source na transmissão." url={obsUrl} icon={<BarChart3/>} onCopy={()=>copy(obsUrl)}/></div><div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Importante:</strong> os dados agora ficam no Supabase. Alterações feitas no painel administrativo são propagadas por Realtime para o link público e para o OBS, inclusive em outros dispositivos.</div></section>; }

function ShareCard({title,description,url,icon,onCopy}:{title:string;description:string;url:string;icon:React.ReactNode;onCopy:()=>void}) { return <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">{icon}</div><h3 className="mt-4 text-xl font-black">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs break-all text-slate-600">{url}</div><div className="mt-3 flex gap-2"><button onClick={onCopy} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Copiar link</button><a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold">Abrir <ExternalLink size={15}/></a></div></div>; }

function PublicView({data}:{data:AppData}) { const total=data.foods.reduce((s,f)=>s+foodKg(f,data.donations),0), pct=total/data.campaign.metaKg*100; return <div className="min-h-screen bg-slate-50 p-4 sm:p-8"><div className="mx-auto max-w-6xl"><header className="mb-6 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Timbó em Missão · Ação Social</p><h1 className="text-2xl font-black sm:text-4xl">{data.campaign.name}</h1></div><div className="rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">Acompanhamento público</div></header><div className="grid gap-4 sm:grid-cols-3"><Stat icon={<Target/>} label="Meta" value={`${fmt(data.campaign.metaKg)} kg`}/><Stat icon={<PackagePlus/>} label="Arrecadado" value={`${fmt(total)} kg`}/><Stat icon={<TrendingUp/>} label="Progresso" value={`${fmt(pct)}%`} positive={pct>=100}/></div><div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex justify-between font-bold"><span>{fmt(total)} / {fmt(data.campaign.metaKg)} kg</span><span>{fmt(pct)}%</span></div><div className="mt-3"><Progress value={pct}/></div></div><div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Alimentos</h2><div className="mt-4 divide-y">{data.foods.map(f=><FoodRow key={f.id} food={f} donations={data.donations}/>)}</div>{!data.foods.length&&<Empty text="A arrecadação ainda não começou."/>}</div></div></div>; }

function ObsView({data}:{data:AppData}) { const total=data.foods.reduce((s,f)=>s+foodKg(f,data.donations),0), pct=total/data.campaign.metaKg*100; return <div className="min-h-screen bg-transparent p-5 text-white"><div className="mx-auto max-w-4xl rounded-2xl bg-slate-950/90 p-5 shadow-2xl backdrop-blur sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">Timbó em Missão</p><h1 className="mt-1 text-2xl font-black sm:text-3xl">{data.campaign.name}</h1></div><div className="text-right"><p className="text-3xl font-black">{fmt(pct)}%</p><p className="text-xs text-slate-300">da meta</p></div></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{width:`${Math.min(pct,100)}%`}}/></div><div className="mt-3 flex justify-between text-sm font-bold"><span>{fmt(total)} kg arrecadados</span><span>Meta: {fmt(data.campaign.metaKg)} kg</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{data.foods.map(f=>{const kg=foodKg(f,data.donations), p=foodPercent(f,data.donations); return <div key={f.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex justify-between gap-3"><span className="font-bold">{f.nome}</span><span className="font-bold text-emerald-300">{fmt(p)}%</span></div><p className="mt-1 text-sm text-slate-300">{fmt(kg)} kg / {fmt(foodMetaKg(f))} kg</p><div className="mt-3 h-2 rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-500" style={{width:`${Math.min(p,100)}%`}}/></div></div>})}</div></div></div>; }

function FoodRow({food,donations}:{food:Food;donations:Donation[]}) { const q=donatedQty(food,donations), kg=foodKg(food,donations), p=foodPercent(food,donations); return <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-bold">{food.nome}</p><p className="text-xs text-slate-500">{fmt(food.pesoPorUnidadeGramas>=1000?food.pesoPorUnidadeGramas/1000:food.pesoPorUnidadeGramas)} {food.pesoPorUnidadeGramas>=1000?'kg':'g'} por {food.unidade.replace(/s$/,'')}</p></div><div className="w-full max-w-xl"><div className="mb-1 flex justify-between text-sm"><span>{fmt(q,0)} / {fmt(food.metaQuantidade,0)} {food.unidade}</span><strong>{fmt(p)}%</strong></div><Progress value={p}/><p className="mt-1 text-xs text-slate-500">{fmt(kg)} kg arrecadados</p></div></div>; }
function FoodProgress({food,donations}:{food:Food;donations:Donation[]}) { const p=foodPercent(food,donations); return <div><div className="mb-2 flex justify-between text-sm"><span className="font-semibold">{food.nome}</span><span className="font-bold">{fmt(p)}%</span></div><Progress value={p}/></div>; }
function FoodCard({food,donations,onAdd,onEdit,onDelete}:{food:Food;donations:Donation[];onAdd:()=>void;onEdit:()=>void;onDelete:()=>void}) { const q=donatedQty(food,donations),kg=foodKg(food,donations),p=foodPercent(food,donations),meta=foodMetaKg(food); return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h3 className="font-black">{food.nome}</h3><p className="mt-1 text-xs text-slate-500">{food.pesoPorUnidadeGramas>=1000?fmt(food.pesoPorUnidadeGramas/1000):fmt(food.pesoPorUnidadeGramas)} {food.pesoPorUnidadeGramas>=1000?'kg':'g'} por {food.unidade.replace(/s$/,'')}</p></div><div className="flex gap-1"><button onClick={onEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><Edit3 size={17}/></button><button onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17}/></button></div></div><div className="mt-5 flex items-end justify-between"><div><p className="text-xl font-black">{fmt(q,0)} <span className="text-sm font-medium text-slate-500">/ {fmt(food.metaQuantidade,0)} {food.unidade}</span></p><p className="mt-1 text-sm text-slate-500">{fmt(kg)} kg / {fmt(meta)} kg</p></div><span className={`font-black ${p>=100?'text-emerald-600':''}`}>{fmt(p)}%</span></div><div className="my-3"><Progress value={p}/></div><p className="text-sm text-slate-500">{p>=100?'🎯 Meta atingida!':`Faltam ${fmt(Math.max(food.metaQuantidade-q,0),0)} ${food.unidade}`}</p><button onClick={onAdd} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white"><Plus size={17}/> Registrar arrecadação</button></div>; }
function Stat({icon,label,value,positive=false}:{icon:React.ReactNode;label:string;value:string;positive?:boolean}) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="rounded-xl bg-slate-100 p-2 text-slate-700">{icon}</span></div><p className={`mt-4 text-2xl font-black ${positive?'text-emerald-600':''}`}>{value}</p></div>; }
function Empty({text}:{text:string}) { return <div className="flex min-h-40 items-center justify-center text-center text-sm text-slate-500">{text}</div>; }