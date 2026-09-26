import type {Food,Donation} from '../types';
export const donatedQty=(food:Food,donations:Donation[])=>donations.filter(d=>d.alimentoId===food.id).reduce((s,d)=>s+d.quantidade,0);
export const foodKg=(food:Food,donations:Donation[])=>donatedQty(food,donations)*food.pesoPorUnidadeGramas/1000;
export const foodPercent=(food:Food,donations:Donation[])=>donatedQty(food,donations)/food.metaQuantidade*100;
export const foodMetaKg=(food:Food)=>food.metaQuantidade*food.pesoPorUnidadeGramas/1000;
export const fmt=(n:number,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(n);
export const isVolumeContentUnit=(unit:string)=>unit==='ml'||unit==='L';
export const packageContentToGrams=(quantity:number,unit:string,densityGramsPerMl?:number)=>{
	if(unit==='g')return quantity;
	if(unit==='kg')return quantity*1000;
	if(unit==='ml')return quantity*(densityGramsPerMl??Number.NaN);
	if(unit==='L')return quantity*1000*(densityGramsPerMl??Number.NaN);
	return Number.NaN;
};
export const foodPackagingLabel=(food:Food)=>{
	const volumeNote=isVolumeContentUnit(food.unidadeConteudo)?` · ${fmt(food.pesoPorUnidadeGramas,1)} g equivalentes`:'';
	return `${fmt(food.conteudoQuantidade,3)} ${food.unidadeConteudo}${volumeNote} por ${food.unidade.replace(/s$/,'')}`;
};
