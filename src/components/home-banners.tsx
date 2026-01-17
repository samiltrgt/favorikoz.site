'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function HomeBanners() {
  return (
    <section className="container py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left - Tall banner */}
         <Link href="/kategori/sac-bakimi" className="group relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-8 min-h-[260px] flex flex-col justify-between transform-gpu animate-float animation-delay-200">
           {/* Background image (subtle, AI-like texture) */}
           <Image
             src="/images/hair-gold-comb.jpg"
             alt="minimal hair care"
             fill
             className="object-cover opacity-20 -z-10"
             sizes="(max-width: 768px) 100vw, 33vw"
           />
           {/* Grid overlay - beige tint */}
           <div
             className="absolute inset-0 pointer-events-none"
             style={{
               backgroundImage:
                 'linear-gradient(rgba(234,223,206,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(234,223,206,0.18) 1px, transparent 1px)',
               backgroundSize: '24px 24px'
             }}
           />
           <div className="relative z-10">
             <h3 className="text-2xl font-light tracking-tight">Saç Bakımında Minimalizm</h3>
             <p className="opacity-70 mt-2">Günlük rutininize modern bir dokunuş</p>
           </div>
           <span className="relative z-10 text-sm mt-6 group-hover:underline inline-flex transition-transform duration-300 group-hover:scale-110">Şimdi keşfet →</span>
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.15),transparent_60%)] z-0" />
         </Link>

        {/* Middle - Split banner */}
        <div className="grid grid-rows-2 gap-6">
          <Link href="/kategori/kisisel-bakim" className="group relative overflow-hidden rounded-3xl bg-card border p-8 transform-gpu animate-float">
            {/* Background image */}
            <Image
              src="https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=1200&h=800&fit=crop"
              alt="minimal personal care"
              fill
              className="object-cover opacity-20 -z-10"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Grid overlay - beige tint */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(234,223,206,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(234,223,206,0.18) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
            <div className="relative z-10">
              <h3 className="text-xl font-light tracking-tight">Kişisel Bakım</h3>
              <p className="text-muted-foreground mt-2">En çok tercih edilenler burada</p>
              <span className="text-sm text-black mt-4 inline-block group-hover:underline transition-transform duration-300 group-hover:scale-110">İncele →</span>
            </div>
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-muted z-0" />
          </Link>
          <Link href="/kategori/tirnak" className="group relative overflow-hidden rounded-3xl bg-card border p-8 transform-gpu animate-float animation-delay-300">
            {/* Background image */}
            <Image
              src="https://images.unsplash.com/photo-1547825407-2d060104b1c5?w=1200&h=800&fit=crop"
              alt="soft pattern"
              fill
              className="object-cover opacity-20 -z-10"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            {/* Grid overlay - beige tint */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(234,223,206,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(234,223,206,0.18) 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
            <div className="relative z-10">
              <h3 className="text-xl font-light tracking-tight">Protez Tırnak</h3>
              <p className="text-muted-foreground mt-2">Sezonun taze seçimleri</p>
              <span className="text-sm text-black mt-4 inline-block group-hover:underline transition-transform duration-300 group-hover:scale-110">Keşfet →</span>
            </div>
            <div className="absolute -left-10 -top-10 w-36 h-36 rounded-full bg-muted z-0" />
          </Link>
        </div>

        {/* Right - Accent banner */}
        <Link href="/kategori/ipek-kirpik" className="group relative overflow-hidden rounded-3xl bg-accent text-accent-foreground p-8 min-h-[260px] flex flex-col justify-between transform-gpu animate-float animation-delay-400">
          {/* Background image */}
          <Image
            src="https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&h=800&fit=crop"
            alt="minimal waves"
            fill
            className="object-cover opacity-20 -z-10"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          {/* Grid overlay - beige tint */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(234,223,206,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(234,223,206,0.18) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }}
          />
          <div className="relative z-10">
            <h3 className="text-2xl font-light tracking-tight">İpek Kirpikte Zarafet</h3>
            <p className="opacity-70 mt-2">Doğal tonlar, güçlü etki</p>
          </div>
          <span className="relative z-10 text-sm mt-6 group-hover:underline inline-flex transition-transform duration-300 group-hover:scale-110">Alışverişe başla →</span>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,.25),transparent_50%)] z-0" />
        </Link>
      </div>
    </section>
  )
}


