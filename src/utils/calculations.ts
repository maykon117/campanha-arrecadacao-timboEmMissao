import type {Food,Donation} from '../types';
export const donatedQty=(food:Food,donations:Donation[])=>donations.filter(d=>d.alimentoId===food.id).reduce((s,d)=>s+d.quantidade,0);
export const foodKg=(food:Food,donations:Donation[])=>donatedQty(food,donations)*food.pesoPorUnidadeGramas/1000;
export const foodPercent=(food:Food,donations:Donation[])=>donatedQty(food,donations)/food.metaQuantidade*100;
export const foodMetaKg=(food:Food)=>food.metaQuantidade*food.pesoPorUnidadeGramas/1000;
export const fmt=(n:number,d=1)=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:d}).format(n);
