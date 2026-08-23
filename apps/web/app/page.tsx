"use client"

import * as React from "react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"
import Link from "next/link"
import { Badge } from "@workspace/ui/components/badge"
import { CryptoTicker } from "@/components/PriceTicker"
import {
  RiTelegramLine,
  RiArrowRightLine,
  RiFlashlightFill,
  RiFireFill,
  RiCheckLine,
  RiSignalWifiLine,
  RiGraduationCapLine,
  RiBarChartLine,
} from "@remixicon/react"

gsap.registerPlugin(ScrollTrigger)

const prices = [
  { symbol: "BTC", price: "43,245", change: "+2.34%", positive: true },
  { symbol: "ETH", price: "2,342", change: "+1.87%", positive: true },
  { symbol: "SOL", price: "108.50", change: "+4.21%", positive: true },
  { symbol: "BNB", price: "312.80", change: "+0.92%", positive: true },
  { symbol: "XRP", price: "0.62", change: "+1.45%", positive: true },
  { symbol: "ADA", price: "0.58", change: "-0.34%", positive: false },
  { symbol: "DOGE", price: "0.12", change: "+3.21%", positive: true },
  { symbol: "AVAX", price: "38.90", change: "+2.11%", positive: true },
]

const plan48h = [
  { deposit: "500", return: "5,000", profit: "4,500" },
  { deposit: "800", return: "8,000", profit: "7,200" },
  { deposit: "1,000", return: "10,000", profit: "9,000" },
  { deposit: "1,500", return: "15,000", profit: "13,500" },
  { deposit: "2,000", return: "20,000", profit: "18,000" },
]

const planWeekly = [
  { deposit: "2,000", return: "20,000", profit: "18,000" },
  { deposit: "3,000", return: "30,000", profit: "27,000" },
  { deposit: "4,000", return: "40,000", profit: "36,000" },
  { deposit: "5,000", return: "50,000", profit: "45,000" },
  { deposit: "6,000", return: "60,000", profit: "54,000" },
  { deposit: "7,000", return: "70,000", profit: "63,000" },
]

const services = [
  {
    icon: <RiSignalWifiLine className="h-4 w-4" />,
    title: "Live Trading",
    price: "$1,000/session",
  },
  {
    icon: <RiGraduationCapLine className="h-4 w-4" />,
    title: "Mentorship",
    price: "$500/month",
    popular: true,
  },
  {
    icon: <RiBarChartLine className="h-4 w-4" />,
    title: "VIP Signals",
    price: "$350/month",
  },
]

const steps = [
  { number: "01", title: "Join Telegram", desc: "Connect with our team" },
  { number: "02", title: "Choose Plan", desc: "Select your cycle amount" },
  { number: "03", title: "Send Crypto", desc: "Transfer stake to wallet" },
  { number: "04", title: "Get Returns", desc: "Receive guaranteed profit" },
]

function Navbar() {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-b border-border bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <svg
            className="h-10 w-10"
            viewBox="0 0 44 45"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M18.4201 9.7905C19.2053 10.2438 19.4743 11.2477 19.021 12.0329L10.8134 26.2488C10.3601 27.034 9.35616 27.3029 8.57104 26.8497C7.78592 26.3964 7.51689 25.3924 7.9702 24.6073L16.1778 10.3913C16.6311 9.60622 17.635 9.33722 18.4201 9.7905ZM27.7561 13.3169C28.5412 13.7702 28.8102 14.7741 28.3569 15.5592L18.5078 32.6184C18.0545 33.4035 17.0506 33.6725 16.2655 33.2192C15.4803 32.7659 15.2113 31.762 15.6646 30.9769L25.5137 13.9177C25.967 13.1326 26.9709 12.8636 27.7561 13.3169ZM36.7357 20.7424C37.2646 19.8265 37.0569 18.7165 36.2717 18.2632C35.4866 17.8099 34.4214 18.185 33.8926 19.1009L24.317 35.6862C23.7882 36.6022 23.9959 37.7122 24.7811 38.1655C25.5662 38.6188 26.6314 38.2437 27.1602 37.3277L36.7357 20.7424Z"
              fill="var(--foreground)"
            />
            <path
              opacity="0.4"
              fillRule="evenodd"
              clipRule="evenodd"
              d="M26.5658 8.82095C27.0191 8.03583 26.7501 7.03188 25.965 6.57859C25.1799 6.1253 24.1759 6.39431 23.7227 7.17943L8.949 32.7682C8.49569 33.5533 8.76471 34.5572 9.54983 35.0105C10.335 35.4638 11.3389 35.1948 11.7922 34.4097L26.5658 8.82095ZM30.3507 21.9609C30.8398 21.1139 30.5998 20.0597 29.8146 19.6064C29.0295 19.1531 27.9966 19.4723 27.5075 20.3194L22.1946 29.5216C21.7056 30.3686 21.9456 31.4227 22.7308 31.876C23.5159 32.3293 24.5488 32.0102 25.0378 31.1631L30.3507 21.9609ZM36.4308 27.8462C37.216 28.2995 37.485 29.3034 37.0317 30.0885L35.3901 32.9317C34.9368 33.7169 33.9329 33.9859 33.1478 33.5326C32.3626 33.0792 32.0936 32.0753 32.547 31.2902L34.1885 28.447C34.6418 27.6619 35.6457 27.3929 36.4308 27.8462ZM11.5007 15.2144C11.9641 14.4118 11.7032 13.3937 10.9181 12.9404C10.133 12.4871 9.1209 12.7703 8.65749 13.5729L6.9794 16.4794C6.516 17.2821 6.77684 18.3002 7.56196 18.7535C8.34708 19.2068 9.35919 18.9236 9.8226 18.121L11.5007 15.2144Z"
              fill="var(--foreground)"
            />
          </svg>
          <span className="text-lg font-semibold tracking-tight text-primary">
            AlphaReserve
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <a
            href="#plans"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Plans
          </a>
          <a
            href="#services"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Services
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it Works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://t.me/+ujxfTTqxAoE4ODNh"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground hover:text-foreground sm:flex"
          >
            <RiTelegramLine className="h-4 w-4" />
            Telegram
          </a>
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}

function Hero() {
  const heroRef = React.useRef<HTMLDivElement>(null)
  const globeRef = React.useRef<HTMLDivElement>(null)
  const tickerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!heroRef.current) return

    const ctx = gsap.context(() => {
      if (!heroRef.current) return
      const heroTexts = heroRef.current.querySelectorAll(".hero-text")
      gsap.from(heroTexts, {
        y: 30,
        opacity: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
      })

      if (globeRef.current) {
        gsap.from(globeRef.current, {
          scale: 0.8,
          opacity: 0,
          duration: 1,
          delay: 0.3,
          ease: "power3.out",
        })
      }

      if (tickerRef.current) {
        gsap.from(tickerRef.current, {
          x: -100,
          opacity: 0,
          duration: 0.8,
          delay: 0.6,
          ease: "power2.out",
        })
      }
    }, heroRef)

    return () => ctx.revert()
  }, [])

  const duplicatedPrices = [...prices, ...prices, ...prices]

  return (
    <section
      ref={heroRef}
      className="from-surface to-canvas relative min-h-screen overflow-hidden bg-gradient-to-b"
    >
      {/* Full width hero image */}
      <div ref={globeRef} className="pointer-events-none absolute inset-0">
        <img
          src="/hero-gemini.webp"
          alt="Hero"
          className="h-full w-full object-cover opacity-90"
        />
      </div>

      {/* Content overlay */}
      <div className="relative z-10 pt-32 pb-16">
        <div className="mx-auto max-w-6xl px-6 md:px-12">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left content */}
            <div className="text-center lg:text-left">
              <h1 className="hero-text mb-6 text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
                Your Crypto <br />
                <span className="text-white">Always In Profit</span>
              </h1>

              <p className="hero-text mx-auto mb-8 max-w-lg text-lg leading-relaxed text-white/80 lg:mx-0">
                Join AlphaReserve's proven trading pool. Choose your plan and
                receive guaranteed fixed returns on your deposit.
              </p>

              <div className="hero-text mb-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
                <Link
                  href="#plans"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-all hover:scale-105 hover:opacity-90"
                >
                  View Plans
                  <RiArrowRightLine className="h-4 w-4" />
                </Link>
                <a
                  href="https://t.me/+ujxfTTqxAoE4ODNh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-foreground transition-all hover:opacity-90"
                >
                  <RiTelegramLine className="h-4 w-4" />
                  Join Telegram
                </a>
              </div>

              {/* Stats */}
              <div className="hero-text mx-auto grid max-w-md grid-cols-3 gap-6 lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-medium tabular-nums text-white">10x</div>
                  <div className="text-xs text-white/70">48H Returns</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-medium tabular-nums text-white">10x</div>
                  <div className="text-xs text-white/70">Weekly Returns</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-medium tabular-nums text-white">100%</div>
                  <div className="text-xs text-white/70">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PriceTicker() {
  const allPrices = [...prices, ...prices, ...prices, ...prices, ...prices]

  return (
    <div className="w-full overflow-hidden border-y border-white/10 bg-black/40 backdrop-blur-sm">
      <div className="animate-ticker-fast flex py-3">
        {allPrices.slice(0, 8).map((price, i) => (
          <div
            key={i}
            className="flex items-center gap-2 border-r border-white/10 px-6 whitespace-nowrap"
          >
            <span className="text-sm font-bold tracking-tight text-white">
              {price.symbol}
            </span>
            <span className="text-sm text-white/80">${price.price}</span>
            <span
              className={`text-xs font-semibold ${price.positive ? "text-[var(--color-success)]" : "text-red-400"}`}
            >
              {price.change}
            </span>
            <span
              className={`ml-1 h-1.5 w-1.5 rounded-full ${price.positive ? "bg-[var(--color-success)]" : "bg-red-400"}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

function PoolStats() {
  const stats = [
    {
      value: 284750,
      prefix: "$",
      suffix: "",
      label: "Total Pool (USDT)",
      change: "+12.4%",
      trend: "Pool growing daily",
      sparkline: [20, 35, 28, 45, 52, 48, 65, 72, 68, 85, 92, 88],
      hero: true,
    },
    {
      value: 1842,
      prefix: "",
      suffix: "",
      label: "Cycles Completed",
      change: "+28",
      trend: "100% paid on time",
      sparkline: [10, 15, 12, 20, 25, 22, 30, 35, 40, 45, 48, 52],
    },
    {
      value: 2413,
      prefix: "",
      suffix: "",
      label: "Active Stakers",
      change: "+156",
      trend: "12 stakers joined",
      sparkline: [30, 35, 40, 38, 45, 50, 55, 52, 60, 65, 70, 75],
    },
    {
      value: 97400,
      prefix: "$",
      suffix: "",
      label: "Total Paid Out",
      change: "+$18.2K",
      trend: "All USDT returns paid",
      sparkline: [50, 45, 55, 60, 58, 65, 70, 75, 80, 78, 85, 90],
    },
    {
      value: 10,
      prefix: "",
      suffix: "x",
      label: "48H Cycle Return",
      change: "+0.8",
      trend: "Paid within 48 hours",
      sparkline: [40, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68],
    },
    {
      value: 10,
      prefix: "",
      suffix: "x",
      label: "Weekly Cycle Return",
      change: "+1.2",
      trend: "Avg. across weekly",
      sparkline: [35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
    },
  ]

  const [lastUpdated, setLastUpdated] = React.useState("Just now")

  React.useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated("Just now")
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const Sparkline = ({
    data,
    positive,
  }: {
    data: number[]
    positive: boolean
  }) => {
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const width = 80
    const height = 24

    const points = data
      .map((val, i) => {
        const x = (i / (data.length - 1)) * width
        const y = height - ((val - min) / range) * height
        return `${x},${y}`
      })
      .join(" ")

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={positive ? "#84CC16" : "#EF4444"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] ?? 0 - min) / range) * height}
          r="2"
          fill={positive ? "#84CC16" : "#EF4444"}
        />
      </svg>
    )
  }

  return (
    <section className="bg-canvas relative overflow-hidden py-20">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#E5E5E5 1px, transparent 1px), linear-gradient(90deg, #E5E5E5 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.5,
        }}
      />
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-2 w-2 animate-pulse rounded-full bg-lime-500 shadow-[0_0_8px_#84CC16]" />
            <span className="font-mono text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase">
              Live Pool Statistics
            </span>
          </div>
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-primary md:text-4xl">
            REAL-TIME PERFORMANCE
          </h2>
          <p className="max-w-lg text-base text-muted-foreground">
            Our crypto trading pool runs 24/7 across BTC, ETH, SOL, BNB and top
            altcoin markets.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-secondary md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, i) => (
            <div
              key={i}
              className={`relative border border-white/10 bg-card/80 p-4 backdrop-blur-xl transition-all hover:bg-card/90 ${stat.hero ? "col-span-2 lg:col-span-2" : ""} ${i === stats.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <div className="absolute top-2 right-2 hidden md:block">
                <span className="font-mono text-[9px] text-muted-foreground uppercase">
                  Status: Nominal
                </span>
              </div>

              <div className="mb-2 font-mono text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </div>

              <div className="mb-2 flex items-baseline gap-1">
                <Counter value={stat.value} prefix={stat.prefix} />
                {stat.suffix && (
                  <span className="font-mono text-lg font-bold text-primary">
                    {stat.suffix}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[var(--bg-success)] px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--color-success)]">
                  {stat.change}
                </span>
                <Sparkline
                  data={stat.sparkline}
                  positive={stat.change.startsWith("+")}
                />
              </div>

              <div className="mt-3 font-mono text-[10px] text-muted-foreground">
                {stat.trend}
              </div>

              <div className="absolute right-1 bottom-1 hidden md:block">
                <span className="font-mono text-[8px] text-muted-foreground/50">
                  Updated: {lastUpdated}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Counter({ value, prefix }: { value: number; prefix: string }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const hasAnimated = React.useRef(false)
  const isDecimal = !Number.isInteger(value)
  const format = (v: number) => (isDecimal ? v.toFixed(1) : Math.floor(v).toLocaleString())
  const [displayValue, setDisplayValue] = React.useState(() => format(value))

  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") return // SSR / old browsers: final value stays visible

    const run = () => {
      if (hasAnimated.current) return
      hasAnimated.current = true
      const tl = gsap.timeline()
      tl.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }).to(
        {},
        {
          duration: 1.6,
          ease: "power2.out",
          onUpdate: function () {
            setDisplayValue(format(value * this.progress()))
          },
          onComplete: () => setDisplayValue(format(value)),
        },
        "<"
      )
    }

    // The element keeps its real size (no scale-0), so the observer fires
    // reliably; threshold 0 catches partially visible cards on small screens.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run()
          observer.disconnect()
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div ref={ref} className="font-mono text-3xl leading-tight font-medium tabular-nums text-primary md:text-4xl">
      {prefix}
      {displayValue}
    </div>
  )
}

function LiveTelegram() {
  const [isVisible, setIsVisible] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div
      className={`fixed right-6 bottom-6 z-50 transition-all duration-500 ${isVisible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-20 opacity-0"}`}
    >
      <a
        href="https://t.me/+ujxfTTqxAoE4ODNh"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-4 rounded-full bg-primary px-5 py-3 text-white shadow-2xl transition-all hover:scale-105 hover:shadow-xl"
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-success)]" />
          <span className="text-sm font-medium">
            2,413 traders in the live pool
          </span>
        </div>
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </a>
    </div>
  )
}

function PlanCard({
  title,
  subtitle,
  roi,
  plans,
  cta,
  popular = false,
}: {
  title: string
  subtitle: string
  roi: string
  plans: typeof plan48h
  cta: string
  popular?: boolean
}) {
  const cardRef = React.useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (!cardRef.current) return

    const card = cardRef.current

    gsap.set(card, { transformStyle: "preserve-3d" })

    const handleMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = (y - centerY) / 20
      const rotateY = (centerX - x) / 20

      gsap.to(card, {
        rotateX: rotateX,
        rotateY: rotateY,
        duration: 0.4,
        ease: "power2.out",
      })
    }

    const handleLeave = () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.5,
        ease: "power2.out",
      })
    }

    card.addEventListener("mousemove", handleMove)
    card.addEventListener("mouseleave", handleLeave)

    return () => {
      card.removeEventListener("mousemove", handleMove)
      card.removeEventListener("mouseleave", handleLeave)
    }
  })

  return (
    <div ref={cardRef} className="relative">
      <div
        className={`relative rounded-3xl bg-card p-6 transition-all duration-200 md:p-8 ${popular ? "shadow-lg ring-2 ring-primary/20" : "shadow-md hover:shadow-lg"}`}
      >
        {popular && (
          <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 md:-top-4">
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold tracking-wide text-white md:px-4">
              BEST VALUE
            </span>
          </div>
        )}

        <div className="mt-2 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center md:h-14 md:w-14">
              {popular ? (
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1.5"
                >
                  <path
                    d="M3 3v18h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 14l4-4 4 4 5-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  className="h-8 w-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000"
                  strokeWidth="1.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-primary md:text-xl">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>
          <div
            className={`self-start rounded-full px-3 py-1.5 sm:self-auto md:px-5 md:py-2.5 ${popular ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
          >
            <span className="text-base font-medium whitespace-nowrap md:text-lg">
              {roi}
            </span>
          </div>
        </div>

        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <div className="min-w-[280px] rounded-xl bg-muted p-4 md:min-w-0">
            <div className="mb-2 grid grid-cols-3 pb-2 text-xs tracking-wider text-muted-foreground uppercase">
              <span>Deposit</span>
              <span>Return</span>
              <span>Profit</span>
            </div>
            {plans.map((tier, i) => (
              <div
                key={i}
                className="grid cursor-pointer grid-cols-3 rounded-lg py-2 text-sm transition-colors hover:bg-card"
              >
                <span className="text-muted-foreground">${tier.deposit}</span>
                <span className="font-medium tabular-nums text-primary">
                  ${tier.return}
                </span>
                <span className="font-medium tabular-nums text-[var(--color-success)]">
                  +${tier.profit}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link
          href="/signup"
          className={`block w-full rounded-xl py-4 text-center text-sm font-semibold transition-all duration-300 hover:scale-[1.02] ${popular ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-foreground text-background hover:opacity-90"}`}
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

function InvestmentPlans() {
  const sectionRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!sectionRef.current) return

    const planCards = sectionRef.current.querySelectorAll(".plan-card-anim")

    gsap.fromTo(
      planCards,
      { y: 50, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.3,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      }
    )
  }, [])

  return (
    <section
      id="plans"
      ref={sectionRef}
      className="bg-canvas relative overflow-hidden py-32"
    >
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(#000 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-8">
        <div className="reveal mb-16 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[var(--bg-success)] px-4 py-2 text-sm font-semibold text-[var(--color-success)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-success)]" />
            Now active
          </div>
          <h2 className="mb-5 text-3xl font-bold text-primary md:text-5xl">
            <span aria-hidden="true">🔥 </span>Alpha Reserve Pool Trading Program is now active<span aria-hidden="true"> 💵</span>
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-muted-foreground md:text-lg">
            This program is tailored for busy individuals who may not have the time or experience to trade independently,
            as well as traders who find it challenging to consistently follow trading signals. Our pool trading system is
            professionally managed to deliver steady performance, efficiency, and dependable results.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="plan-card-anim opacity-0">
            <PlanCard
              title="48-Hour Investment Plan"
              subtitle="Profits paid within 48 hours"
              roi="10x Returns"
              plans={plan48h}
              cta="Start 48H Cycle"
            />
          </div>
          <div className="plan-card-anim opacity-0">
            <PlanCard
              title="Weekly Investment Plan"
              subtitle="Profits paid after 7 days"
              roi="10x Returns"
              plans={planWeekly}
              cta="Start Weekly Cycle"
              popular={true}
            />
          </div>
        </div>

        <div className="reveal mx-auto mt-16 max-w-3xl text-center">
          <p className="text-base text-muted-foreground md:text-lg">
            We are committed to achieving strong outcomes through expertly managed trading strategies with a win rate of{" "}
            <span className="font-semibold text-[var(--color-success)]">89%</span>.
          </p>
          <a
            href="https://t.me/khan_bashiri"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-primary px-7 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:scale-[1.03] hover:shadow-xl"
          >
            <RiTelegramLine className="h-5 w-5" />
            DM the admin now to secure your spot
          </a>
          <p className="mt-3 text-xs text-muted-foreground">Capital in USDT (TRC20) or BTC · returns shown per plan</p>
        </div>
      </div>
    </section>
  )
}

function Services() {
  const sectionRef = React.useRef<HTMLDivElement>(null)
  const cardsRef = React.useRef<(HTMLDivElement | null)[]>([])

  const services = [
    {
      badge: "High Demand",
      badgeColor: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
      title: "ONE-ON-ONE LIVE TRADING SESSION",
      desc: "Trade live alongside our senior analyst in a private session tailored to your portfolio and goals. Watch real trades unfold in real time and ask anything.",
      features: [
        "60-minute private video session",
        "Live market analysis",
        "Real-time trade walkthrough",
        "Session recording",
        "Q&A on strategy",
      ],
      price: "$1,000",
      per: "Per session - One-time",
      cta: "Book Session",
      popular: false,
    },
    {
      badge: "Most Popular",
      badgeColor: "bg-secondary text-foreground",
      title: "CRYPTO MENTORSHIP PROGRAM",
      desc: "A structured mentorship program to take you from beginner to confident crypto trader. Get a personal roadmap, weekly check-ins, and hands-on guidance.",
      features: [
        "Personalised trading roadmap",
        "Weekly 1-on-1 check-in (4/month)",
        "Private trading playbook",
        "Technical analysis fundamentals",
        "Portfolio review and coaching",
      ],
      price: "$500",
      per: "Per month - Ongoing",
      cta: "Enroll Now",
      popular: true,
    },
    {
      badge: "Monthly Sub",
      badgeColor: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
      title: "VIP CRYPTO SIGNALS MEMBERSHIP",
      desc: "Get high-probability trade signals delivered directly to your Telegram - with precise entry, take-profit, and stop-loss levels. No guesswork, just actionable calls.",
      features: [
        "5-10 premium signals per week",
        "Entry, TP1, TP2 and stop-loss",
        "Monday market briefing",
        "VIP-only Telegram group",
        "Monthly win rate tracker",
      ],
      price: "$350",
      per: "Per month - Cancel anytime",
      cta: "Get Access",
      ctaLink: "Preview on Telegram",
      popular: false,
    },
  ]

  React.useEffect(() => {
    if (!sectionRef.current) return

    const serviceCards = sectionRef.current.querySelectorAll(".service-card")

    gsap.fromTo(
      serviceCards,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      }
    )
  }, [])

  return (
    <section id="services" ref={sectionRef} className="bg-card py-32">
      <div className="mx-auto max-w-6xl px-8">
        <div className="reveal mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold text-primary md:text-5xl">
            Premium Offerings
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Go beyond the pool. Get direct access to our expert traders through
            premium one-on-one sessions, mentorship, and real-time signals.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {services.map((service, i) => (
            <div
              key={i}
              ref={(el) => {
                cardsRef.current[i] = el
              }}
              className={`service-card relative flex flex-col rounded-2xl bg-card p-6 transition-all duration-300 hover:shadow-lg md:p-8 ${service.popular ? "ring-2 ring-primary/20" : ""}`}
            >
              <div className="absolute -top-3 left-1/2 z-10 -translate-x-1/2">
                <span
                  className={`${service.badgeColor} rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap`}
                >
                  {service.badge}
                </span>
              </div>

              <h3 className="mb-3 text-lg leading-tight font-bold text-primary">
                {service.title}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {service.desc}
              </p>

              <div className="mb-6 space-y-2">
                {service.features.map((feature, j) => (
                  <div
                    key={j}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 text-[var(--color-success)]">✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <span className="text-3xl font-medium tabular-nums text-primary">
                  {service.price}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {service.per}
                </span>
              </div>

              <a
                href="https://t.me/+ujxfTTqxAoE4ODNh"
                className={`mt-auto block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all duration-300 hover:scale-[1.02] ${service.popular ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-foreground text-background hover:opacity-90"}`}
              >
                {service.cta}
              </a>

              {service.ctaLink && (
                <a
                  href="https://t.me/+ujxfTTqxAoE4ODNh"
                  className="mt-3 block text-center text-xs text-muted-foreground hover:text-primary"
                >
                  {service.ctaLink}
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const sectionRef = React.useRef<HTMLDivElement>(null)

  const steps = [
    { number: "01", title: "Join Telegram", desc: "Connect with the team" },
    { number: "02", title: "Choose Cycle", desc: "48h or weekly" },
    { number: "03", title: "Send Crypto", desc: "USDT confirmed in 1h" },
    { number: "04", title: "Receive Return", desc: "Full USDT return" },
  ]

  React.useEffect(() => {
    if (!sectionRef.current) return

    const tl = sectionRef.current.querySelector(".tl-fill") as HTMLElement
    const rows = sectionRef.current.querySelectorAll(".step-row")

    const onScroll = () => {
      if (!tl) return

      const section = sectionRef.current
      if (!section) return

      const sectionRect = section.getBoundingClientRect()
      const wh = window.innerHeight
      const sectionH = sectionRect.height

      const scrolled = wh - sectionRect.top
      const pct = Math.min(100, Math.max(0, (scrolled / sectionH) * 100))
      tl.style.height = pct + "%"

      rows.forEach((row, i) => {
        const delay = i * 150
        setTimeout(
          () => {
            if (row.classList.contains("step-row")) {
              row.classList.add("visible")
            }
          },
          Math.max(0, delay - Math.max(0, sectionRect.top - wh * 0.3))
        )
      })
    }

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="bg-canvas py-10 sm:py-14"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="reveal mb-8 text-center sm:mb-12">
          <div className="mb-3 inline-block rounded-full bg-muted px-2.5 py-1 font-mono text-[9px] tracking-widest text-primary uppercase sm:mb-4 sm:px-3 sm:py-1.5 sm:text-[10px]">
            How It Works
          </div>
          <h2 className="mb-2 text-2xl font-bold text-primary sm:text-3xl md:text-4xl">
            Get Started in Minutes
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Four simple steps to start growing your crypto.
          </p>
        </div>

        {/* Mobile: Vertical timeline on left */}
        <div className="relative pl-8 sm:pl-10 md:hidden">
          <div className="tl-line absolute top-0 bottom-0 left-3 w-0.5 overflow-hidden rounded-full bg-secondary sm:left-4">
            <div className="tl-fill absolute top-0 left-0 h-0 w-full bg-gradient-to-b from-[oklch(0.5_0_0)] to-[oklch(0.62_0.12_178)]" />
          </div>

          <div className="space-y-6 sm:space-y-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className="step-row relative flex translate-x-4 items-start gap-3 opacity-0 transition-all duration-500 sm:gap-4"
              >
                <div className="absolute -left-6 z-10 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-border bg-card sm:-left-7 sm:h-8 sm:w-8">
                  <span className="text-[9px] font-bold text-primary sm:text-[10px]">
                    {step.number}
                  </span>
                </div>
                <div className="pt-0.5">
                  <p className="mb-0.5 text-sm font-bold text-primary sm:text-base">
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Alternating left/right */}
        <div className="relative hidden md:block" id="tl">
          <div className="tl-line absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 overflow-hidden bg-secondary">
            <div
              className="tl-fill absolute top-0 left-0 h-0 w-full bg-gradient-to-b from-[oklch(0.5_0_0)] via-[oklch(0.3_0_0)] to-[oklch(0.62_0.12_178)]"
              style={{ transition: "height 0.1s linear" }}
            />
          </div>

          <div className="step-row left-content relative mb-12 flex items-center">
            <div className="flex-1 pr-8 text-right">
              <div className="content translate-x-[-28px] opacity-0 transition-all duration-500">
                <span className="mb-2 block font-mono text-[10px] tracking-widest text-muted-foreground">
                  01
                </span>
                <p className="mb-2 text-xl font-bold text-primary">
                  Join Telegram
                </p>
                <p className="text-sm text-muted-foreground">
                  Connect with the team
                </p>
              </div>
            </div>
            <div className="flex w-10 flex-shrink-0 items-center justify-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
                <div className="dot h-2 w-2 rounded-full bg-border" />
              </div>
            </div>
            <div className="flex-1 pl-8" />
          </div>

          <div className="step-row right-content relative mb-12 flex items-center">
            <div className="flex-1 pr-8" />
            <div className="flex w-10 flex-shrink-0 items-center justify-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
                <div className="dot h-2 w-2 rounded-full bg-border" />
              </div>
            </div>
            <div className="flex-1 pl-8 text-left">
              <div className="content translate-x-[28px] opacity-0 transition-all duration-500">
                <span className="mb-2 block font-mono text-[10px] tracking-widest text-muted-foreground">
                  02
                </span>
                <p className="mb-2 text-xl font-bold text-primary">
                  Choose Your Cycle
                </p>
                <p className="text-sm text-muted-foreground">
                  Pick 48h or weekly
                </p>
              </div>
            </div>
          </div>

          <div className="step-row left-content relative mb-12 flex items-center">
            <div className="flex-1 pr-8 text-right">
              <div className="content translate-x-[-28px] opacity-0 transition-all duration-500">
                <span className="mb-2 block font-mono text-[10px] tracking-widest text-muted-foreground">
                  03
                </span>
                <p className="mb-2 text-xl font-bold text-primary">
                  Send Your Crypto
                </p>
                <p className="text-sm text-muted-foreground">
                  USDT confirmed in 1 hour
                </p>
              </div>
            </div>
            <div className="flex w-10 flex-shrink-0 items-center justify-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
                <div className="dot h-2 w-2 rounded-full bg-border" />
              </div>
            </div>
            <div className="flex-1 pl-8" />
          </div>

          <div className="step-row right-content relative flex items-center">
            <div className="flex-1 pr-8" />
            <div className="flex w-10 flex-shrink-0 items-center justify-center">
              <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
                <div className="dot h-2 w-2 rounded-full bg-border" />
              </div>
            </div>
            <div className="flex-1 pl-8 text-left">
              <div className="content translate-x-[28px] opacity-0 transition-all duration-500">
                <span className="mb-2 block font-mono text-[10px] tracking-widest text-muted-foreground">
                  04
                </span>
                <p className="mb-2 text-xl font-bold text-primary">
                  Receive Return
                </p>
                <p className="text-sm text-muted-foreground">
                  Full return in USDT
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-14 sm:gap-4">
          <a
            href="https://t.me/+ujxfTTqxAoE4ODNh"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:opacity-90 sm:px-6 sm:py-3"
          >
            Join Telegram
          </a>
          <span className="text-xs text-muted-foreground sm:text-sm">
            Free to join
          </span>
        </div>
      </div>
    </section>
  )
}

function Community() {
  return (
    <section className="relative min-h-[80vh] overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/advanced-traders.webp"
          alt="Advanced Traders"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 mx-auto flex h-full max-w-4xl flex-col items-center justify-center px-6 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold text-white md:text-5xl">
          Built for Everyone
        </h2>
        <p className="mb-8 text-center text-xl text-white/70">
          Professional-grade trading infrastructure for all levels
        </p>

        <a
          href="https://t.me/+ujxfTTqxAoE4ODNh"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-card px-8 py-4 text-lg font-bold text-primary transition-colors hover:bg-card/90"
        >
          <RiTelegramLine className="h-5 w-5" />
          Join Now
        </a>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-canvas border-t border-border py-6">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-base font-semibold text-primary">
            AlphaReserve
          </span>
          <p className="text-sm text-muted">
            © 2026 AlphaReserve · All rights reserved
          </p>
        </div>
        <div className="mt-3 border-t border-border pt-3 text-center">
          <p className="text-xs text-muted">Crypto trading involves risk</p>
        </div>
      </div>
    </footer>
  )
}

export default function LandingPage() {
  React.useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"))
    if (typeof IntersectionObserver === "undefined") return // stays visible
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in")
            io.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    )
    els.forEach((e) => {
      const belowFold = e.getBoundingClientRect().top > window.innerHeight * 0.92
      if (belowFold) {
        // Only below-fold elements hide-then-reveal on scroll; above-fold stay put.
        e.classList.add("reveal-armed")
        io.observe(e)
      }
    })
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Navbar />
      <main className="bg-canvas min-h-screen">
        <Hero />
        <PriceTicker />
        <PoolStats />
        <InvestmentPlans />
        <Services />
        <HowItWorks />
        <Community />
      </main>
      <Footer />
      <LiveTelegram />
    </>
  )
}
