const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function fetchItems(query = '') {
  const url = query
    ? `${API_BASE}/api/items?q=${encodeURIComponent(query)}`
    : `${API_BASE}/api/items`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error('Failed to fetch items')
  }

  return res.json()
}

export async function fetchItemById(id) {
  const res = await fetch(`${API_BASE}/api/items/${id}`)

  if (!res.ok) {
    throw new Error('Item not found')
  }

  return res.json()
}

export async function createItem(itemData) {
  const res = await fetch(`${API_BASE}/api/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemData),
  })

  if (!res.ok) {
    throw new Error('Failed to create item')
  }

  return res.json()
}
