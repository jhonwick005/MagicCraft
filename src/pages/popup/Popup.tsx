import React, { useEffect, useState } from 'react'
import { createVaultFromMnemonic, importFromPrivateKey } from '../shared/wallet'
import { loadState } from '../shared/storage'
import type { Chain, Token } from '../shared/types'
import { fetchTokenMeta } from '../shared/erc20'

export default function App(){
  const [locked, setLocked] = useState(true)
  const [hasVault, setHasVault] = useState(false)
  const [password, setPassword] = useState('')
  const [vault, setVault] = useState<any>(null)
  const [state, setState] = useState<any>(null)

  useEffect(()=>{ (async()=>{
    const s = await loadState(); setState(s)
    setHasVault(!!(s.encryptedVault && s.vaultSalt && s.vaultIv))
  })() },[])

  async function createVault(password: string){
    const { vault, mnemonic } = createVaultFromMnemonic()
    await chrome.runtime.sendMessage({ type:'CREATE_VAULT', password, vault })
    setLocked(false); setVault(vault)
    alert('Write down your seed phrase:\n' + mnemonic)
  }

  async function importMnemonic(password: string, phrase: string){
    const { vault } = createVaultFromMnemonic(phrase)
    await chrome.runtime.sendMessage({ type:'IMPORT_VAULT', password, vault })
    setLocked(false); setVault(vault)
  }

  async function importPK(password: string, pk: string){
    const vault = importFromPrivateKey(pk)
    await chrome.runtime.sendMessage({ type:'IMPORT_VAULT', password, vault })
    setLocked(false); setVault(vault)
  }

  async function unlock(){
    const res = await chrome.runtime.sendMessage({ type:'UNLOCK', password })
    if(res?.ok){ setLocked(false); setVault(res.vault) } else alert(res.error||'Failed')
  }

  async function lock(){ await chrome.runtime.sendMessage({type:'LOCK'}); setLocked(true) }

  if(locked){
    return (
      <div className="container">
        <h3>MiniMask</h3>
        {hasVault ? (
          <div className="card">
            <h4>Unlock</h4>
            <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
            <button onClick={unlock}>Unlock</button>
          </div>
        ):(
          <Setup onCreate={createVault} onImportMnemonic={importMnemonic} onImportPK={importPK} />
        )}
      </div>
    )
  }

  return <Home state={state} setState={setState} vault={vault} onLock={lock} />
}

function Setup({ onCreate, onImportMnemonic, onImportPK }:{ onCreate:(p:string)=>void; onImportMnemonic:(p:string,m:string)=>void; onImportPK:(p:string,pk:string)=>void }){
  const [password,setPassword]=useState('');
  const [phrase,setPhrase]=useState('');
  const [pk,setPk]=useState('');
  return (
    <div className="card">
      <h4>Get Started</h4>
      <input type="password" placeholder="New password" value={password} onChange={e=>setPassword(e.target.value)} />
      <div className="row">
        <button onClick={()=>onCreate(password)}>Create Wallet</button>
        <button onClick={()=>onImportMnemonic(password, phrase)} disabled={!phrase}>Import Seed</button>
      </div>
      <textarea placeholder="Seed phrase (12/24 words)" value={phrase} onChange={e=>setPhrase(e.target.value)} />
      <div className="row">
        <button onClick={()=>onImportPK(password, pk)} disabled={!pk}>Import Private Key</button>
      </div>
      <input placeholder="0x... private key" value={pk} onChange={e=>setPk(e.target.value)} />
      <p className="small">Your vault is encrypted client-side with AES-GCM (PBKDF2 200k). Write down your seed.</p>
    </div>
  )
}

function Home({ state, setState, vault, onLock }:{ state:any; setState:any; vault:any; onLock:()=>void }){
  const [chains,setChains]=useState<Chain[]>(state?.chains||[])
  const [tokens,setTokens]=useState<Token[]>(state?.tokens||[])
  const [addr] = useState<string>(vault.accounts[0].address)

  useEffect(()=>{ setChains(state?.chains||[]) ; setTokens(state?.tokens||[]) },[state])

  async function saveChains(next:Chain[]){ 
    setChains(next); 
    await chrome.runtime.sendMessage({type:'SAVE_CHAINS', chains: next}); 
    const s = await loadState(); 
    setState({ ...s, chains: next }) 
  }
  async function saveTokens(next:Token[]){ 
    setTokens(next); 
    await chrome.runtime.sendMessage({type:'SAVE_TOKENS', tokens: next}); 
    const s = await loadState(); 
    setState({ ...s, tokens: next }) 
  }

  return (
    <div className="container">
      <h3>MiniMask</h3>
      <div className="card">
        <div className="small">Address</div>
        <div>{addr}</div>
        <button onClick={onLock}>Lock</button>
      </div>
      <Chains chains={chains} onSave={saveChains} />
      <Tokens chains={chains} tokens={tokens} onSave={saveTokens} />
    </div>
  )
}

function Chains({ chains, onSave }:{ chains:Chain[]; onSave:(c:Chain[])=>void }){
  const [form,setForm]=useState<Chain>({ chainId:0, name:'', rpcUrl:'', currency:{name:'Coin',symbol:'COIN',decimals:18} })
  return (
    <div className="card">
      <h4>Chains</h4>
      {chains.map(c=> (
        <div key={c.chainId} className="row" style={{alignItems:'center'}}>
          <div style={{flex:1}}>{c.name} (id {c.chainId})</div>
          <button onClick={()=>onSave(chains.filter(x=>x.chainId!==c.chainId))}>Remove</button>
        </div>
      ))}
      <h5>Add Chain</h5>
      <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
      <input placeholder="Chain ID (decimal)" value={form.chainId||''} onChange={e=>setForm({...form,chainId:Number(e.target.value)||0})} />
      <input placeholder="RPC URL" value={form.rpcUrl} onChange={e=>setForm({...form,rpcUrl:e.target.value})} />
      <input placeholder="Currency symbol" value={form.currency.symbol} onChange={e=>setForm({...form,currency:{...form.currency,symbol:e.target.value}})} />
      <button disabled={!form.name||!form.rpcUrl||!form.chainId} onClick={()=>onSave([...chains, form])}>Add Chain</button>
    </div>
  )
}

function Tokens({ chains, tokens, onSave }:{ chains:Chain[]; tokens:Token[]; onSave:(t:Token[])=>void }){
  const [chainId,setChainId]=useState<number>(chains[0]?.chainId||1)
  const [addr,setAddr]=useState('')
  const chain = chains.find(c=>c.chainId===chainId)

  async function add(){
    if(!chain) return
    const meta = await fetchTokenMeta(chain.rpcUrl, addr)
    onSave([...tokens, { address: addr, chainId, symbol: meta.symbol, decimals: meta.decimals }])
    setAddr('')
  }

  return (
    <div className="card">
      <h4>Tokens</h4>
      {tokens.map(t=> (
        <div key={t.address+':'+t.chainId} className="row" style={{alignItems:'center'}}>
          <div style={{flex:1}}>{t.symbol} — {t.address.slice(0,6)}… on {t.chainId}</div>
          <button onClick={()=>onSave(tokens.filter(x=>!(x.address===t.address && x.chainId===t.chainId)))}>Remove</button>
        </div>
      ))}
      <h5>Add Token</h5>
      <select value={chainId} onChange={e=>setChainId(Number(e.target.value))}>
        {chains.map(c=> <option key={c.chainId} value={c.chainId}>{c.name}</option>)}
      </select>
      <input placeholder="Token address 0x…" value={addr} onChange={e=>setAddr(e.target.value)} />
      <button disabled={!addr} onClick={add}>Add</button>
    </div>
  )
}