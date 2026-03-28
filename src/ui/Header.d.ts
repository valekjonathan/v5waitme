import type { ForwardRefExoticComponent, RefAttributes } from 'react'

export type HeaderProps = { interactive?: boolean }

declare const Header: ForwardRefExoticComponent<HeaderProps & RefAttributes<HTMLElement>>
export default Header
