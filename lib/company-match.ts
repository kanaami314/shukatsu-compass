export function normalizeCompanyName(name:string){return name.normalize('NFKC').toLowerCase().replace(/株式会社|有限会社|合同会社|[（(](企業|会社|日本|法人)[）)]|\b(inc\.?|ltd\.?|co\.?|corporation)\b/g,'').replace(/[\s・.,、]/g,'')}
export function companyMatchScore(query:string,page:{title:string;extract?:string;categories?:{title:string}[];pageprops?:Record<string,unknown>}){
 if(page.pageprops&&'disambiguation' in page.pageprops)return 0;
 const lead=(page.extract||'').trim().split(/。|\n/)[0];
 const categories=(page.categories||[]).map(c=>c.title).join(' ');
 if(/曖昧さ回避|小説|楽曲|映画作品|漫画作品|生まれ|没年/.test(categories))return 0;
 const description=lead.includes('は、')?lead.slice(lead.indexOf('は、')+2):lead;
 if(!/企業|株式会社|有限会社|合同会社|メーカー|製造会社|事業会社|持株会社|会社(?:である|$)|company|corporation/i.test(description))return 0;
 if(/運営する|提供する|提供している|展開する|運営している/.test(description)&&/サービス|アプリ|ブランド|サイト|プラットフォーム/.test(description))return 0;
 const q=normalizeCompanyName(query),title=normalizeCompanyName(page.title);
 // Prefer no match over silently returning a parent, subsidiary, product or similar name.
 return q&&q===title?100:0;
}

