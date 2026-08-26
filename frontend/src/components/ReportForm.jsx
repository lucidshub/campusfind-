import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createItem } from '../services/api'

function ReportForm() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    type: 'lost',
    itemName: '',
    description: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    contact: '',
  })
  const [imageFile, setImageFile] = useState(null)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      let imageUrl = ''

      if (imageFile) {
        const uploadData = new FormData()
        uploadData.append('image', imageFile)

        const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        const uploadRes = await fetch(`${API_BASE}/api/upload`, {
          method: 'POST',
          body: uploadData,
        })

        if (!uploadRes.ok) throw new Error('Image upload failed')
        const uploadResult = await uploadRes.json()
        imageUrl = uploadResult.imageUrl
      }

      const newItem = await createItem({ ...formData, imageUrl })
      const newItemId = newItem._id || newItem.id
      navigate(`/item/${newItemId}`)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-group">
        <label>What happened?</label>
        <div className="type-selector">
          <button
            type="button"
            className={formData.type === 'lost' ? 'type-btn active lost' : 'type-btn'}
            onClick={() => setFormData({ ...formData, type: 'lost' })}
          >
            I lost something
          </button>
          <button
            type="button"
            className={formData.type === 'found' ? 'type-btn active found' : 'type-btn'}
            onClick={() => setFormData({ ...formData, type: 'found' })}
          >
            I found something
          </button>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="itemName">Item Name *</label>
        <input
          type="text"
          id="itemName"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
          placeholder="e.g. Blue Backpack"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description *</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Describe the item — color, brand, any identifying details..."
          rows={3}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="location">Location *</label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g. Central Library, Room 204"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="date">Date *</label>
        <input
          type="date"
          id="date"
          name="date"
          value={formData.date}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="contact">Contact Information *</label>
        <input
          type="text"
          id="contact"
          name="contact"
          value={formData.contact}
          onChange={handleChange}
          placeholder="Email or phone number"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="image">Photo (optional)</label>
        <input
          type="file"
          id="image"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files[0])}
        />
      </div>

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
    </form>
  )
}

export default ReportForm
