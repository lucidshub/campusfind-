import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchItemById } from '../services/api'

function ItemDetails() {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchItemById(id)
      .then(setItem)
      .catch(() => setError('Item not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="loading-text">Loading item...</p>
  if (error) return <p className="error-text">{error}</p>
  if (!item) return null

  const isLost = item.type === 'lost'

  return (
    <div className="item-details">
      <Link to="/browse" className="back-link">← Back to Browse</Link>

      <div className="detail-card">
        {item.imageUrl && (
          <img src={item.imageUrl} alt={item.itemName} className="detail-image" />
        )}
        <div className="detail-info">
          <span className={`type-badge ${isLost ? 'type-lost' : 'type-found'}`}>
            {isLost ? 'Lost' : 'Found'}
          </span>
          <h1>{item.itemName}</h1>
          <p className="detail-description">{item.description}</p>

          <div className="detail-meta">
            <div className="meta-item">
              <strong>Location:</strong> {item.location}
            </div>
            <div className="meta-item">
              <strong>Date:</strong> {new Date(item.date).toLocaleDateString()}
            </div>
            <div className="meta-item">
              <strong>Contact:</strong> {item.contact}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ItemDetails
