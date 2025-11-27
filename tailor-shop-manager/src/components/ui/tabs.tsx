"use client"

import { ComponentProps, useRef, useEffect, useState, Children, isValidElement, cloneElement } from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

function Tabs({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
}

// Animated TabsList with sliding indicator
function TabsListAnimated({
  className,
  children,
  activeValue,
  tabValues,
  ...props
}: ComponentProps<typeof TabsPrimitive.List> & {
  activeValue?: string
  tabValues?: string[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0, opacity: 0 })
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const updateIndicator = () => {
      if (!containerRef.current || !activeValue || !tabValues) return

      const activeIndex = tabValues.indexOf(activeValue)
      if (activeIndex === -1) return

      const container = containerRef.current
      const tabs = container.querySelectorAll('[data-slot="tabs-trigger"]')
      const activeTab = tabs[activeIndex] as HTMLElement

      if (activeTab) {
        const containerRect = container.getBoundingClientRect()
        const tabRect = activeTab.getBoundingClientRect()

        setIndicatorStyle({
          left: tabRect.left - containerRect.left,
          width: tabRect.width,
          opacity: 1,
        })

        if (!isInitialized) {
          setIsInitialized(true)
        }
      }
    }

    // Initial update with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateIndicator, 10)

    // Update on resize
    window.addEventListener('resize', updateIndicator)

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', updateIndicator)
    }
  }, [activeValue, tabValues, isInitialized])

  return (
    <TabsPrimitive.List
      ref={containerRef}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute top-[3px] bottom-[3px] rounded-md shadow-sm z-0",
          isInitialized ? "transition-all duration-300 ease-out" : ""
        )}
        style={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
          opacity: indicatorStyle.opacity,
          backgroundColor: 'var(--background)',
        }}
      />
      {/* Render tabs with higher z-index */}
      {Children.map(children, (child) => {
        if (isValidElement(child)) {
          return cloneElement(child as React.ReactElement<{ className?: string }>, {
            className: cn(
              (child.props as { className?: string }).className,
              "relative z-10 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            ),
          })
        }
        return child
      })}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsListAnimated, TabsTrigger, TabsContent }
