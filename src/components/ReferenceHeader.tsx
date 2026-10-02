'use client'

import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'
import Link from 'next/link'
import './ReferenceHeader.css'

export type HeaderLink = {
  label: string
  href: string
  current?: boolean
  children?: HeaderLink[]
}
export type ReferenceHeaderProps = {
  /** White logo on transparent background; dark logo in the capsule state. */
  logoLight?: ReactNode
  logoDark?: ReactNode
  brandName?: string
  homeHref?: string
  links: HeaderLink[]
  menuLinks?: HeaderLink[]
  announcement?: ReactNode
  contactEmail?: string
  socialLinks?: { platform: 'instagram' | 'facebook' | 'tiktok'; href: string }[]
  /** Enable only when the header sits on a suitably dark hero. */
  overlay?: boolean
  scrollThreshold?: number
  cartCount?: number
  /** Shown under the bag icon, for example a mini cart. */
  cartPreview?: ReactNode
  onSearch: () => void
  onCart: () => void
  onAccount?: () => void
  onFavorites?: () => void
  languageLabel?: string
  onLanguageChange?: () => void
  accentColor?: string
}

type IconName =
  | 'menu'
  | 'search'
  | 'heart'
  | 'user'
  | 'bag'
  | 'close'
  | 'chevron'
  | 'instagram'
  | 'facebook'
  | 'tiktok'

function hasChildren(link: HeaderLink) {
  return !!link.children?.length
}

function alignSubmenu(item: HTMLElement) {
  const submenu = item.querySelector<HTMLElement>(':scope > .rh-submenu')
  if (!submenu) return
  submenu.style.left = '0px'
  const overflowRight = submenu.getBoundingClientRect().right - window.innerWidth + 16
  if (overflowRight > 0) submenu.style.left = `${-overflowRight}px`
}

function SubmenuList({ links, nested = false }: { links: HeaderLink[]; nested?: boolean }) {
  return (
    <ul className={nested ? 'rh-submenu-nested' : 'rh-submenu-list'}>
      {links.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Link href={link.href} aria-current={link.current ? 'page' : undefined}>
            {link.label}
          </Link>
          {hasChildren(link) ? <SubmenuList links={link.children!} nested /> : null}
        </li>
      ))}
    </ul>
  )
}

type DrawerFrame = { label: string; href: string; links: HeaderLink[] }

function DrawerLevel({
  links,
  onOpen,
  onNavigate,
}: {
  links: HeaderLink[]
  onOpen: (link: HeaderLink) => void
  onNavigate: () => void
}) {
  return (
    <div className="rh-drawer-level">
      {links.map((link) => (
        <div className="rh-drawer-item" key={`${link.href}-${link.label}`}>
          <div className="rh-drawer-row">
            <Link
              className="rh-drawer-link"
              href={link.href}
              aria-current={link.current ? 'page' : undefined}
              onClick={onNavigate}
            >
              {link.label}
            </Link>
            {hasChildren(link) && (
              <button
                className="rh-drawer-toggle rh-drawer-drill"
                type="button"
                aria-label={`${link.label} alt kategorilerini göster`}
                onClick={() => onOpen(link)}
              >
                <Icon name="chevron" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function DrawerFrameView({
  frame,
  onBack,
  onOpen,
  onNavigate,
  backRef,
}: {
  frame: DrawerFrame
  onBack: () => void
  onOpen: (link: HeaderLink) => void
  onNavigate: () => void
  backRef?: Ref<HTMLButtonElement>
}) {
  return (
    <>
      <div className="rh-drawer-back">
        <button
          ref={backRef}
          className="rh-drawer-toggle rh-drawer-back-button"
          type="button"
          aria-label={`${frame.label} listesine dön`}
          onClick={onBack}
        >
          <Icon name="chevron" />
        </button>
        <Link className="rh-drawer-back-label" href={frame.href} onClick={onNavigate}>
          {frame.label}
        </Link>
      </div>
      <DrawerLevel links={frame.links} onOpen={onOpen} onNavigate={onNavigate} />
    </>
  )
}

function DrawerNav({
  links,
  active,
  onNavigate,
}: {
  links: HeaderLink[]
  active: boolean
  onNavigate: () => void
}) {
  const [stack, setStack] = useState<DrawerFrame[]>([])
  const [leaving, setLeaving] = useState<DrawerFrame | null>(null)
  const [motion, setMotion] = useState<'idle' | 'forward' | 'back'>('idle')
  const backButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (active) return
    setStack([])
    setLeaving(null)
    setMotion('idle')
  }, [active])

  useEffect(() => {
    if (!leaving) return
    const timeout = window.setTimeout(() => setLeaving(null), 520)
    return () => window.clearTimeout(timeout)
  }, [leaving])

  useEffect(() => {
    if (stack.length === 0) return
    backButtonRef.current?.focus()
  }, [stack.length])

  const openLevel = (link: HeaderLink) => {
    if (!link.children?.length) return
    setLeaving(null)
    setMotion('forward')
    setStack((current) => [
      ...current,
      { label: link.label, href: link.href, links: link.children! },
    ])
  }

  const goBack = () => {
    const last = stack[stack.length - 1]
    if (!last) return
    setMotion('back')
    setLeaving(last)
    setStack((current) => current.slice(0, -1))
  }

  const layerClass = (stepsBack: number) => {
    if (stepsBack <= 0) return 'is-front'
    if (stepsBack === 1) return 'is-behind'
    return 'is-buried'
  }

  return (
    <div className="rh-category-stage" data-depth={stack.length > 0 ? 'open' : 'root'} data-motion={motion}>
      <div
        className={`rh-category-panel ${layerClass(stack.length)}`}
        aria-hidden={stack.length > 0}
        onClick={stack.length === 1 ? goBack : undefined}
      >
        <DrawerLevel links={links} onOpen={openLevel} onNavigate={onNavigate} />
      </div>
      {stack.map((frame, index) => {
        const stepsBack = stack.length - 1 - index
        const isFront = stepsBack === 0
        return (
          <div
            className={`rh-category-panel is-drill ${layerClass(stepsBack)}`}
            key={frame.href}
            aria-hidden={!isFront}
            onClick={stepsBack === 1 ? goBack : undefined}
          >
            <DrawerFrameView
              frame={frame}
              onBack={goBack}
              onOpen={openLevel}
              onNavigate={onNavigate}
              backRef={isFront ? backButtonRef : undefined}
            />
          </div>
        )
      })}
      {leaving && (
        <div className="rh-category-panel is-drill is-leaving" aria-hidden="true">
          <DrawerFrameView frame={leaving} onBack={() => undefined} onOpen={() => undefined} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  )
}

function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {name === 'menu' && (
        <>
          <path d="M5 8h14M5 12h14M5 16h14" />
        </>
      )}
      {name === 'search' && (
        <>
          <circle cx="10.8" cy="10.8" r="6.4" />
          <path d="m16 16 4.3 4.3" />
        </>
      )}
      {name === 'heart' && (
        <path d="M20.3 5.6a5.1 5.1 0 0 0-7.3 0L12 6.7l-1.1-1.1a5.1 5.1 0 0 0-7.2 7.2L12 21l8.3-8.2a5.1 5.1 0 0 0 0-7.2Z" />
      )}
      {name === 'user' && (
        <>
          <circle cx="12" cy="8" r="3.25" />
          <path d="M5.2 19.4a6.8 6.8 0 0 1 13.6 0" />
        </>
      )}
      {name === 'bag' && (
        <>
          <path d="m6 7-1 13h14L18 7Z" />
          <path d="M9 10V6a3 3 0 0 1 6 0v4" />
        </>
      )}
      {name === 'close' && <path d="m6 6 12 12M18 6 6 18" />}
      {name === 'instagram' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="4" />
          <circle cx="12" cy="12" r="3.5" />
          <circle cx="17.2" cy="6.8" r=".7" fill="currentColor" stroke="none" />
        </>
      )}
      {name === 'facebook' && (
        <path
          d="M14 21v-8h3l.5-4H14V7c0-1 .4-1.5 1.7-1.5H18V2.2A22 22 0 0 0 15 2c-3 0-5 1.8-5 5v2H7v4h3v8"
          fill="currentColor"
          stroke="none"
        />
      )}
      {name === 'tiktok' && (
        <path
          d="M14 3v12a4.5 4.5 0 1 1-4-4.47V14a1.5 1.5 0 1 0 1 1V3h3c.4 3 2.2 4.5 5 4.5v3A8 8 0 0 1 14 8"
          fill="currentColor"
          stroke="none"
        />
      )}
      {name === 'chevron' && <path d="m7 10 5 5 5-5" />}
    </svg>
  )
}

/** Capsule header with scroll solid-state and full-screen category drawer. */
export default function ReferenceHeader({
  logoLight,
  logoDark,
  brandName = 'Favori Kozmetik',
  homeHref = '/',
  links,
  menuLinks,
  announcement,
  overlay = true,
  scrollThreshold = 48,
  cartCount = 0,
  cartPreview,
  onSearch,
  onCart,
  onAccount,
  onFavorites,
  languageLabel,
  onLanguageChange,
  contactEmail,
  socialLinks = [],
  accentColor = '#d45a8f',
}: ReferenceHeaderProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const announcementRef = useRef<HTMLDivElement>(null)
  const [announcementHeight, setAnnouncementHeight] = useState(32)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const titleId = useId()
  const solid = !overlay || scrolled
  const hasAnnouncement =
    announcement !== undefined && announcement !== null && announcement !== false
  const safeCount = Number.isFinite(cartCount) ? Math.max(0, Math.floor(cartCount)) : 0
  const style = {
    '--rh-accent': accentColor,
    '--rh-announcement-offset': hasAnnouncement ? `${announcementHeight}px` : '0px',
  } as CSSProperties

  useEffect(() => {
    const element = announcementRef.current
    if (!element) return
    const update = () => setAnnouncementHeight(element.getBoundingClientRect().height)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [hasAnnouncement])

  useEffect(() => {
    const threshold = Math.max(0, scrollThreshold)
    const update = () => setScrolled(window.scrollY > threshold)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [scrollThreshold])

  useEffect(() => {
    if (!menuOpen) return
    const dialog = dialogRef.current
    if (!dialog) return
    const lenis = window.__lenis
    const { documentElement: root, body } = document
    const previous = {
      bodyOverflow: body.style.overflow,
      rootOverflow: root.style.overflow,
    }
    lenis?.stop()
    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
    } else {
      dialog.setAttribute('open', '')
    }
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    return () => {
      if (dialog.open) dialog.close()
      body.style.overflow = previous.bodyOverflow
      root.style.overflow = previous.rootOverflow
      lenis?.start()
      menuButtonRef.current?.focus({ preventScroll: true })
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const wordmark = (
    <span className="rh-wordmark">
      {brandName === 'Favori Kozmetik' ? (
        <>
          FAVORİ
          <br />
          KOZMETİK
        </>
      ) : (
        brandName
      )}
    </span>
  )
  const searchFromMenu = () => {
    closeMenu()
    window.requestAnimationFrame(onSearch)
  }
  const logo = (solid ? logoDark : logoLight) ?? logoDark ?? logoLight

  return (
    <div className="rh-root" style={style}>
      {hasAnnouncement && (
        <div ref={announcementRef} className="rh-announcement">
          {announcement}
        </div>
      )}
      {!overlay && <div className="rh-spacer" aria-hidden="true" />}
      <header className="rh-header" data-solid={solid} data-scrolled={scrolled}>
        <div className="rh-row">
          <Link className="rh-logo" href={homeHref} aria-label={`${brandName} — Ana sayfa`}>
            {logo ?? wordmark}
          </Link>
          <div className="rh-capsule">
            <div className="rh-leading">
              <button
                ref={menuButtonRef}
                className="rh-icon rh-menu-button"
                type="button"
                aria-label="Menüyü aç"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                data-testid="mobile-menu-button"
                onClick={() => setMenuOpen(true)}
              >
                <Icon name="menu" />
              </button>
              <button
                className="rh-icon rh-search-button"
                type="button"
                aria-label="Ürün ara"
                data-testid="header-search-button"
                onClick={onSearch}
              >
                <Icon name="search" />
              </button>
            </div>
            <nav className="rh-desktop-nav" aria-label="Ana gezinme">
              {links.map((link) => (
                <div
                  className="rh-nav-item"
                  key={`${link.href}-${link.label}`}
                  onMouseEnter={(event) => alignSubmenu(event.currentTarget)}
                  onFocusCapture={(event) => alignSubmenu(event.currentTarget)}
                >
                  <Link
                    href={link.href}
                    aria-current={link.current ? 'page' : undefined}
                    aria-haspopup={hasChildren(link) ? 'true' : undefined}
                  >
                    {link.label}
                  </Link>
                  {hasChildren(link) && (
                    <div className="rh-submenu">
                      <nav
                        className="rh-submenu-panel"
                        aria-label={`${link.label} alt kategoriler`}
                        data-lenis-prevent
                      >
                        <SubmenuList links={link.children!} />
                      </nav>
                    </div>
                  )}
                </div>
              ))}
            </nav>
            <div className="rh-utilities">
              {languageLabel &&
                (onLanguageChange ? (
                  <button
                    className="rh-language"
                    type="button"
                    onClick={onLanguageChange}
                    aria-label={`Dil seçimi: ${languageLabel}`}
                  >
                    {languageLabel}
                    <Icon name="chevron" />
                  </button>
                ) : (
                  <span className="rh-language">{languageLabel}</span>
                ))}
              {onAccount && (
                <button
                  className="rh-icon rh-account"
                  type="button"
                  aria-label="Hesabım"
                  data-testid="header-account-button"
                  onClick={onAccount}
                >
                  <Icon name="user" />
                </button>
              )}
              {onFavorites && (
                <button
                  className="rh-icon rh-favorites"
                  type="button"
                  aria-label="Favorilerim"
                  onClick={onFavorites}
                >
                  <Icon name="heart" />
                </button>
              )}
              <div className="rh-cart-anchor">
                <button
                  className="rh-icon rh-cart"
                  type="button"
                  aria-label={`Sepetim, ${safeCount} ürün`}
                  data-testid="header-cart-button"
                  onClick={onCart}
                >
                  <Icon name="bag" />
                  <span className="rh-badge" aria-hidden="true">
                    {safeCount > 99 ? '99+' : safeCount}
                  </span>
                </button>
                {cartPreview}
              </div>
            </div>
          </div>
        </div>
      </header>
      <dialog
        ref={dialogRef}
        id={menuId}
        className="rh-dialog"
        aria-labelledby={titleId}
        data-testid="mobile-menu"
        onCancel={closeMenu}
        onClose={closeMenu}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMenu()
        }}
      >
        <div className="rh-drawer" data-lenis-prevent>
          <h2 id={titleId} className="rh-visually-hidden">
            Kategoriler ve gezinme
          </h2>
          <div className="rh-drawer-top">
            <Link
              className="rh-logo"
              href={homeHref}
              aria-label={`${brandName} — Ana sayfa`}
              onClick={closeMenu}
            >
              {logoDark ?? wordmark}
            </Link>
            <button
              className="rh-icon rh-drawer-close"
              type="button"
              aria-label="Menüyü kapat"
              onClick={closeMenu}
              autoFocus
            >
              <Icon name="close" />
            </button>
            <button
              className="rh-icon rh-drawer-search"
              type="button"
              aria-label="Menüden ürün ara"
              onClick={searchFromMenu}
            >
              <Icon name="search" />
            </button>
          </div>
          <nav className="rh-category-nav" aria-label="Kategoriler">
            <DrawerNav links={menuLinks ?? links} active={menuOpen} onNavigate={closeMenu} />
          </nav>
          <footer className="rh-drawer-footer">
            {contactEmail && (
              <a className="rh-contact" href={`mailto:${contactEmail}`}>
                {contactEmail}
              </a>
            )}
            {socialLinks.length > 0 && (
              <div className="rh-socials">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    className="rh-icon rh-social-link"
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                  >
                    <Icon name={social.platform} />
                  </a>
                ))}
              </div>
            )}
          </footer>
        </div>
      </dialog>
    </div>
  )
}
