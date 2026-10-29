import {mkdir,writeFile,stat} from 'node:fs/promises'
const path='public/editions/nasa-spinoff-2025.pdf'
try{if((await stat(path)).size>100_000){console.log('NASA Spinoff PDF already available');process.exit(0)}}catch{}
const response=await fetch('https://ntts-prod.s3.amazonaws.com/t2p/prod/spinoff/NASA.Spinoff_2025_508.pdf',{signal:AbortSignal.timeout(120000)})
if(!response.ok)throw new Error('NASA PDF: HTTP '+response.status)
const buffer=Buffer.from(await response.arrayBuffer())
if(buffer.subarray(0,5).toString()!=='%PDF-')throw new Error('Invalid NASA PDF response')
await mkdir('public/editions',{recursive:true});await writeFile(path,buffer)
console.log('NASA Spinoff 2025 original PDF saved: '+buffer.length+' bytes')
