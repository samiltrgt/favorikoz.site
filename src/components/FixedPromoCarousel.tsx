'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/product-card';
import './FixedPromoCarousel.css';

export type CarouselProduct = {
  id: string;
  name: string;
  href: string;
  image: string;
  imageAlt?: string;
  brand?: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  rating?: number;
  reviewsCount?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  images?: string[];
  /** Already formatted by the site's existing pricing layer. No calculations here. */
  displayPrice?: string;
  displayComparePrice?: string;
  discountLabel?: string;
  actionLabel?: string;
  actionDisabled?: boolean;
};
export type FixedPromoCarouselProps = {
  promo: { title: string; description: string; ctaLabel: string; href: string; backgroundColor?: string };
  products: CarouselProduct[];
  /** Optional existing quick-view / variant selection handler. Default is product navigation. */
  onProductAction?: (product: CarouselProduct) => void;
};

function SiteAnchor({ href, className, children, ariaLabel }: { href: string; className: string; children: ReactNode; ariaLabel?: string }) {
  if (href.startsWith('/')) {
    return (
      <Link className={className} href={href} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <a className={className} href={href} aria-label={ariaLabel}>
      {children}
    </a>
  );
}

function Arrow({ direction }: { direction: 'left' | 'right' }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={direction === 'left' ? 'M19 12H5m6-7-7 7 7 7' : 'M5 12h14m-6-7 7 7-7 7'} /></svg>;
}

export default function FixedPromoCarousel({ promo, products }: FixedPromoCarouselProps) {
  const rail = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const railId = useId();
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setEdges({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
    update();
    element.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    return () => { element.removeEventListener('scroll', update); observer.disconnect(); };
  }, [products]);

  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const card = element.firstElementChild;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 12;
    const step = (card?.getBoundingClientRect().width ?? element.clientWidth) + gap;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollBy({ left: direction * step, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (!products.length) return null;
  return (
    <section className="pc-section" aria-labelledby={headingId} style={{ '--pc-promo': promo.backgroundColor ?? '#9a3d6a' } as CSSProperties}>
      <div className="pc-grid">
        <aside className="pc-promo">
          <h2 id={headingId}>{promo.title}</h2>
          {promo.description ? <p>{promo.description}</p> : null}
          <SiteAnchor className="pc-promo-cta" href={promo.href}>{promo.ctaLabel}</SiteAnchor>
        </aside>
        <div className="pc-carousel" role="region" aria-roledescription="carousel" aria-label={`${promo.title} ürünleri`}>
          <div ref={rail} id={railId} className="pc-rail" tabIndex={0} aria-label="Ürünleri kaydır; sol ve sağ ok tuşlarını kullanabilirsin" onKeyDown={event => {
            if (event.target !== event.currentTarget) return;
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
          }}>
            {products.map((product, index) => <article className="pc-product" key={product.id} role="group" aria-roledescription="slayt" aria-label={`${index + 1} / ${products.length}: ${product.name}`}>
              <ProductCard
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  brand: product.brand,
                  subtitle: product.brand,
                  price: product.price,
                  original_price: product.originalPrice,
                  image: product.image,
                  rating: product.rating,
                  reviews_count: product.reviewsCount,
                  in_stock: !product.actionDisabled,
                  is_new: product.isNew,
                  is_best_seller: product.isBestSeller,
                  images: product.images,
                }}
              />
            </article>)}
          </div>
          <button className="pc-arrow pc-prev" type="button" aria-label="Önceki ürünler" aria-controls={railId} disabled={edges.start} onClick={() => move(-1)}><Arrow direction="left" /></button>
          <button className="pc-arrow pc-next" type="button" aria-label="Sonraki ürünler" aria-controls={railId} disabled={edges.end} onClick={() => move(1)}><Arrow direction="right" /></button>
        </div>
      </div>
    </section>
  );
}
