export type Campaign={id:string;name:string;metaKg:number;dataCriacao:string;description:string};
export type PackageContentUnit='g'|'kg'|'ml'|'L';
export type Food={id:string;campanhaId:string;nome:string;unidade:string;conteudoQuantidade:number;unidadeConteudo:PackageContentUnit;densidadeGramasPorMl:number|null;pesoPorUnidadeGramas:number;metaQuantidade:number};
export type Donation={id:string;alimentoId:string;quantidade:number;dataCriacao:string};
export type AppData={campaign:Campaign;foods:Food[];donations:Donation[]};
