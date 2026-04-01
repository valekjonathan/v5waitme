/**
 * Equivalente a WaitMe CreateMapOverlay: tarjeta crear, pin, zoom.
 */
import { useEffect, useRef, useState } from 'react'
import CreateAlertCard from './CreateAlertCard.jsx'
import MapScreenPanel from './MapScreenPanel.jsx'
import MapZoomControls from './MapZoomControls.jsx'
import WaitMeCenterPin from './CenterPin.jsx'

const PIN_HEIGHT = 54
const HEADER_FALLBACK_PX = 69

export default function ParkHereOverlayImpl() {
  const [address, setAddress] = useState('')
  const cardRef = useRef(null)
  const [pinTop, setPinTop] = useState(null)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const updatePinPosition = () => {
      const headerEl = document.querySelector('[data-waitme-header]')
      const panelInner = document.querySelector('[data-map-screen-panel-inner]')
      const headerBottom = headerEl?.getBoundingClientRect()?.bottom ?? HEADER_FALLBACK_PX
      const cardRect = (panelInner ?? card)?.getBoundingClientRect?.()
      if (!cardRect) return
      const midPoint = (headerBottom + cardRect.top) / 2
      const pinTopViewport = midPoint - PIN_HEIGHT
      const pinTopInOverlay = pinTopViewport - headerBottom
      setPinTop(Math.max(0, pinTopInOverlay))
    }

    updatePinPosition()
    const ro = new ResizeObserver(updatePinPosition)
    ro.observe(card)
    window.addEventListener('resize', updatePinPosition)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', updatePinPosition)
    }
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
      aria-hidden
    >
      <div ref={cardRef} style={{ pointerEvents: 'none' }}>
        <MapScreenPanel measureLabel="create" cardShiftUp={7}>
          <CreateAlertCard
            address={address}
            onAddressChange={setAddress}
            onRecenter={() => {}}
            onCreateAlert={() => {}}
            isLoading={false}
          />
        </MapScreenPanel>
      </div>

      {pinTop != null && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            zIndex: 10,
            pointerEvents: 'none',
            top: 0,
          }}
        >
          <WaitMeCenterPin top={pinTop} />
        </div>
      )}

      <MapZoomControls measureLabel="create" />
    </div>
  )
}
