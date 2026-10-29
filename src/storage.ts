import { useState, useCallback } from 'react'
export function useStored<T>(key:string, initial:T) {
 const [value,setValue]=useState<T>(()=>{try {const raw=localStorage.getItem('folio.v1.'+key);return raw?JSON.parse(raw):initial}catch{return initial}})
 const [error,setError]=useState('')
 const update=useCallback((next:T|((v:T)=>T))=>setValue(current=>{
  const result=typeof next==='function'?(next as (v:T)=>T)(current):next
  try {localStorage.setItem('folio.v1.'+key,JSON.stringify(result));setError('')}catch{setError('Your browser could not save changes. Free some storage or export your library in Settings.')}
  return result
 }),[key])
 return [value,update,error] as const
}
export function safeUrl(value:string) {try {const url=new URL(value.replace(/&(?:amp|#0*38|#x0*26);/gi,'&'));return ['http:','https:'].includes(url.protocol)?url.href:''}catch{return ''}}
export function dateLabel(value:string) {return value?new Date(value).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'}):'Date not supplied'}
