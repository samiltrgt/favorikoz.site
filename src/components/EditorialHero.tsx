'use client';

import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import cloudinaryLoader from '@/lib/cloudinary-loader';
import './BannerBrands.css';

export type HeroImage = {
  src: string;
  alt?: string;
  /** CSS object-position, e.g. '50% 35%'. */
  position?: string;
};
export type EditorialHeroProps = {
  leftImage?: HeroImage | null;
  rightImage?: HeroImage | null;
  /** Optional single portrait image used below 768px. */
  mobileImage?: HeroImage | null;
  title: string;
  subtitle?: string;
  cta?: { label: string; href: string };
  /** Use h2 if the page already has its main h1. */
  headingLevel?: 'h1' | 'h2';
  overlayOpacity?: number;
  /** Space reserved inside the hero for the previous overlay header. */
  headerClearance?: number;
  /** First visible banner stays eager. Later slides can defer. */
  imagePriority?: boolean;
};

const HIDDEN_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function heroSrc(src: string) {
  return cloudinaryLoader({ src, width: 1600, quality: 75 });
}

function SiteAnchor({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  if (href.startsWith('/')) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={href}>
      {children}
    </a>
  );
}

function HeroFrame({
  image,
  frameClass,
  priority,
  hideOnMobile,
  hideOnDesktop,
}: {
  image: HeroImage;
  frameClass: string;
  priority: boolean;
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
}) {
  return (
    <picture className={`fh-frame ${frameClass}`}>
      {hideOnMobile && <source media="(max-width: 767px)" srcSet={HIDDEN_PIXEL} />}
      {hideOnDesktop && <source media="(min-width: 768px)" srcSet={HIDDEN_PIXEL} />}
      <img
        className="fh-image"
        src={heroSrc(image.src)}
        alt={image.alt ?? ''}
        style={{ objectPosition: image.position ?? 'center' }}
        fetchPriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </picture>
  );
}

export default function EditorialHero({
  leftImage, rightImage, mobileImage, title, subtitle, cta,
  headingLevel = 'h1', overlayOpacity = 0.12, headerClearance = 0, imagePriority = true,
}: EditorialHeroProps) {
  const Heading = headingLevel;
  const style = {
    '--fh-overlay': Math.min(0.75, Math.max(0, overlayOpacity)),
    '--fh-header-clearance': `${Math.max(0, headerClearance)}px`,
  } as CSSProperties;
  const hasMobile = Boolean(mobileImage?.src);
  const hasSplit = Boolean(leftImage?.src || rightImage?.src || hasMobile);
  return (
    <section className="fh-hero" style={style}>
      {hasSplit && (
        <div className="fh-images" data-mobile-image={hasMobile}>
          {leftImage?.src && (
            <HeroFrame image={leftImage} frameClass="fh-left" priority={imagePriority} hideOnMobile={hasMobile} />
          )}
          {rightImage?.src && (
            <HeroFrame image={rightImage} frameClass="fh-right" priority={imagePriority} hideOnMobile={hasMobile} />
          )}
          {hasMobile && mobileImage && (
            <HeroFrame image={mobileImage} frameClass="fh-mobile" priority={imagePriority} hideOnDesktop />
          )}
        </div>
      )}
      <div className="fh-content">
        <Heading className="fh-title">{title}</Heading>
        {subtitle && <p className="fh-subtitle">{subtitle}</p>}
        {cta && <SiteAnchor className="fh-cta" href={cta.href}>{cta.label}</SiteAnchor>}
      </div>
    </section>
  );
}
