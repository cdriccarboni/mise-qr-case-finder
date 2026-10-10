// Legacy helpers retained for integrations using the Halloween filter.
import { THEME_PACKS, searchThemeIndex } from './theme-explorer.js'
const pack=THEME_PACKS.find(item=>item.id==='halloween')
export const HALLOWEEN_THEMES=[{id:'all',label:'Tout Halloween'},...pack.groups]
export function halloweenMatches(rows=[],{theme='all',query=''}={}){
  return searchThemeIndex(rows,{theme:'halloween',group:theme,query}).map(row=>({...row,halloweenScore:row.themeScore}))
}
