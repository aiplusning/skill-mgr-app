export interface ProviderRecord {
  id: string
  name: string
  base_url: string
  api_key: string
  model: string
  enabled: number | boolean | null
  [key: string]: unknown
}

/** Serialize a Provider for client responses without exposing its secret key. */
export function toSafeProvider<T extends ProviderRecord>(provider: T): Omit<T, 'api_key'> & { api_key: string } {
  const key = provider.api_key ?? ''
  const apiKey = key ? `sk-***${key.slice(-4)}` : ''
  return { ...provider, api_key: apiKey }
}
