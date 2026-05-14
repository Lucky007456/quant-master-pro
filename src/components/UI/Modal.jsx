export default function Modal({ open, onClose, children, title }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {title && <h3 className="modal-title">{title}</h3>}
        {children}
      </div>
    </div>
  )
}
