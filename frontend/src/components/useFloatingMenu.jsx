import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export function useFloatingMenu(open, { width, align = 'start' } = {}) {
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const [menuStyle, setMenuStyle] = useState(null)

  useEffect(() => {
    if (!open || !triggerRef.current) return undefined

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = width || rect.width
      const left =
        align === 'end' ? rect.right - menuWidth : rect.left

      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: Math.max(8, left),
        width: menuWidth,
        zIndex: 9999,
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, width, align])

  return { triggerRef, menuRef, menuStyle }
}

export function FloatingPortal({ children, menuStyle, menuRef }) {
  if (!menuStyle) return null
  return createPortal(
    <div ref={menuRef} style={menuStyle}>
      {children}
    </div>,
    document.body
  )
}
