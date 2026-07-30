import { useState } from 'react'
import { motion } from 'framer-motion'
import { Card, Button, Input } from '../components/ui'
import { useToast } from '../lib/toast'
import { Code, Key, Globe, BookOpen, ArrowRight, Copy, Check } from 'lucide-react'

export function DeveloperPortal() {
  const { toast } = useToast()
  const [keyName, setKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerateKey = async () => {
    if (!keyName) { toast('Enter a name for your key', 'error'); return }
    // In production: POST to /api/v1/admin/keys with admin key
    const mockKey = `kp_${Array.from({ length: 48 }, () => 'abcdef0123456789'[Math.floor(Math.random() * 16)]).join('')}`
    setGeneratedKey(mockKey)
    toast('API key generated! Copy it now — you won\'t see it again.', 'success')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Code className="text-warm-300" size={28} />
        <div>
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-muted-100 mt-1">Build on KindlePool with our API and SDK</p>
        </div>
      </div>

      {/* Quick Start */}
      <Card className="space-y-4">
        <h2 className="text-xl font-bold">Quick Start</h2>
        <div className="bg-cream-200 rounded-xl p-4 font-mono text-sm space-y-2">
          <p className="text-muted-200"># Install the SDK</p>
          <p className="text-text-light font-medium">npm install @kindlepool/sdk</p>
          <p className="text-muted-200 mt-3"># List trending pools</p>
          <p className="text-text-light font-medium">
            {`import { KindlePoolAPI } from '@kindlepool/sdk'`}<br />
            {`const api = new KindlePoolAPI({ apiKey: 'kp_your_key' })`}<br />
            {`const pools = await api.listPools({ sort: 'most_funded' })`}
          </p>
        </div>
      </Card>

      {/* API Key Generation */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Key className="text-warm-300" size={20} />
          <h2 className="text-xl font-bold">API Keys</h2>
        </div>
        {!generatedKey ? (
          <div className="space-y-4">
            <Input label="Key Name" value={keyName} onChange={(e) => setKeyName(e.target.value)}
              placeholder="e.g., My Discord Bot" />
            <Button onClick={handleGenerateKey} disabled={!keyName}>
              <Key size={16} /> Generate API Key
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-success font-medium">Key generated successfully!</p>
            <div className="flex items-center gap-2 bg-cream-200 rounded-xl p-3">
              <code className="flex-1 text-sm font-mono break-all">{generatedKey}</code>
              <button onClick={() => { copyToClipboard(generatedKey); setCopied(true) }}
                className="p-2 rounded-lg hover:bg-cream-300 transition-colors">
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-xs text-error">Save this key — it won't be shown again.</p>
            <Button variant="ghost" onClick={() => setGeneratedKey(null)}>Generate another</Button>
          </div>
        )}
      </Card>

      {/* API Endpoints */}
      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <Globe className="text-warm-300" size={20} />
          <h2 className="text-xl font-bold">API Endpoints</h2>
        </div>
        <div className="space-y-2">
          {[
            { method: 'GET', path: '/pools', desc: 'List pools with filters and pagination' },
            { method: 'GET', path: '/pools/:id', desc: 'Get pool details' },
            { method: 'GET', path: '/pools/:id/supporters', desc: 'List supporters for a pool' },
            { method: 'GET', path: '/pools/:id/events', desc: 'Pool event history' },
            { method: 'GET', path: '/supporters/:address/pools', desc: 'Pools funded by address' },
            { method: 'GET', path: '/creators/:address/pools', desc: 'Pools created by address' },
            { method: 'GET', path: '/events', desc: 'All events (filterable by type)' },
          ].map((ep) => (
            <div key={ep.path} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-cream-200 transition-colors">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                ep.method === 'GET' ? 'bg-success/20 text-success' : 'bg-warm-300/20 text-warm-300'
              }`}>{ep.method}</span>
              <code className="text-sm flex-1">{ep.path}</code>
              <span className="text-xs text-muted-100 hidden sm:inline">{ep.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* SDK Usage */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="space-y-4">
          <h3 className="font-bold">Contract SDK</h3>
          <p className="text-sm text-muted-100">Interact directly with the Soroban contract.</p>
          <div className="bg-cream-200 rounded-xl p-3 font-mono text-xs space-y-1">
            <p className="text-muted-200">{'import { KindlePoolContract } from \'@kindlepool/sdk\''}</p>
            <p className="text-muted-200">{'const contract = new KindlePoolContract('}</p>
            <p className="text-muted-200">{'  \'CA...CONTRACT_ID...\''}</p>
            <p className="text-muted-200">{')'}</p>
            <p className="text-text-light mt-2">{'await contract.createPool(params, source, signer)'}</p>
            <p className="text-text-light">{'await contract.deposit(params, source, signer)'}</p>
            <p className="text-text-light">{'await contract.vote(params, source, signer)'}</p>
          </div>
        </Card>

        <Card className="space-y-4">
          <h3 className="font-bold">Webhook Events</h3>
          <p className="text-sm text-muted-100">Receive real-time notifications.</p>
          <div className="bg-cream-200 rounded-xl p-3 font-mono text-xs space-y-1">
            <p className="text-muted-200">{'X-KindlePool-Signature: sha256 HMAC'}</p>
            <p className="text-muted-200">{'X-KindlePool-Event: event_type'}</p>
            <p className="text-muted-200">{'Content-Type: application/json'}</p>
            <p className="text-text-light mt-2">{'{ "event_type": "p_dep",'}</p>
            <p className="text-text-light">{'  "pool_id": 1,'}</p>
            <p className="text-text-light">{'  "data": { ... } }'}</p>
          </div>
          <p className="text-xs text-muted-100">Event types: p_creat, p_dep, p_goal, p_work, p_vote, p_paid, p_ref, p_disp, p_resl</p>
        </Card>
      </div>

      {/* Docs Link */}
      <div className="text-center py-8">
        <a
          href="/openapi.json"
          target="_blank"
          className="inline-flex items-center gap-2 text-warm-300 hover:text-warm-400 transition-colors font-medium"
        >
          <BookOpen size={18} /> View Full API Documentation <ArrowRight size={16} />
        </a>
      </div>
    </motion.div>
  )
}
