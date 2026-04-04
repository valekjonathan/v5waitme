import type { ForwardRefExoticComponent, RefAttributes } from 'react'

export type BottomNavProps = { interactive?: boolean; fixedToViewport?: boolean }

declare const BottomNav: ForwardRefExoticComponent<BottomNavProps & RefAttributes<HTMLElement>>
export default BottomNav
