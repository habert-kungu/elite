"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { IconMoon, IconSun } from "@tabler/icons-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => setMounted(true), [])

  // Until mounted the server and client can't agree on the theme, so render
  // neutral attributes to avoid a hydration mismatch.
  const isDark = mounted && theme === "dark"

  return (
    <button
      type="button"
      onClick={() => {
        const currentlyDark = document.documentElement.classList.contains("dark")
        const nextTheme = currentlyDark ? "light" : "dark"
        document.documentElement.classList.toggle("dark", nextTheme === "dark")
        document.documentElement.style.colorScheme = nextTheme
        window.localStorage.setItem("theme", nextTheme)
        setTheme(nextTheme)
      }}
      aria-label={!mounted ? "Toggle theme" : isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={!mounted ? "Toggle theme (D)" : `${isDark ? "Light" : "Dark"} theme (D)`}
      className="flex h-9 w-9 items-center justify-center rounded-[4px] text-less transition-colors hover:bg-hover hover:text-foreground"
    >
      {!mounted ? (
        <span className="block h-5 w-5" />
      ) : isDark ? (
        <IconSun className="h-5 w-5" stroke={1.7} />
      ) : (
        <IconMoon className="h-5 w-5" stroke={1.7} />
      )}
    </button>
  )
}
