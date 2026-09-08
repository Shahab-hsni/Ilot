// Shared settings for the local dev stack (docker-compose.yml).
// None of these are secrets — they only ever reach containers on this machine.

export const NOCODB_URL = process.env.NOCODB_URL || 'http://localhost:8080'
export const NOCODB_EMAIL = process.env.NOCODB_EMAIL || 'dev@ilot.local'
export const NOCODB_PASSWORD = process.env.NOCODB_PASSWORD || 'Ilot#Local1'
export const NOCODB_BASE = process.env.NOCODB_BASE || 'Ilot Local'

export const N8N_URL = process.env.N8N_URL || 'http://localhost:5678'
export const N8N_EMAIL = process.env.N8N_EMAIL || 'dev@ilot.local'
export const N8N_PASSWORD = process.env.N8N_PASSWORD || 'IlotLocal123'

// Hostnames as seen from inside the compose network, not from the host.
export const NOCODB_INTERNAL_URL = 'http://nocodb:8080'
export const CATCHER_INTERNAL_URL = 'http://webhook-catcher:4000'

// The WhatsApp trigger node verifies x-hub-signature-256 as
// HMAC-SHA256(rawBody, clientSecret). send-inbound.mjs signs with this, and
// patch-n8n-local.mjs stores it as the local whatsAppTriggerApi credential.
export const WHATSAPP_CLIENT_SECRET = 'ilot-local-dev-secret'

// The seven departments the production AI Agent is allowed to emit, read from its
// system prompt in n8n-workflows/ilot-inbound-whatsapp.json.
//
// This list is the whole contract between the bot and the Agents table. The lookup
// in "Get Active Agents (dept)" is an exact-equality match on a free-text column:
//
//   =(department,eq,{{ $json.department }})~and(active,eq,true)
//
// so a value that is not on this list can never match a lead, and it fails down a
// branch that looks healthy. A local seed once used "company-setup" where
// production uses "company", which is exactly that bug.
export const DEPARTMENTS = ['visa', 'company', 'legal', 'tax', 'property', 'hr', 'insurance']
