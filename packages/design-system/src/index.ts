export * from './tokens/index.js';
export * from './theme/types.js';
export { flattenTheme } from './theme/flatten.js';
export { cn } from './lib/utils.js';

// Primitives
export { Button, buttonVariants } from './primitives/button.js';
export type { ButtonProps } from './primitives/button.js';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './primitives/card.js';

export { Badge, badgeVariants } from './primitives/badge.js';
export type { BadgeProps } from './primitives/badge.js';

export { Input } from './primitives/input.js';
export type { InputProps } from './primitives/input.js';

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './primitives/dialog.js';

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './primitives/select.js';

export { Progress } from './primitives/progress.js';
export type { ProgressProps } from './primitives/progress.js';

export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives/tabs.js';

export { Switch } from './primitives/switch.js';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './primitives/tooltip.js';

export { Textarea } from './primitives/textarea.js';
export type { TextareaProps } from './primitives/textarea.js';

export { RadioGroup, RadioGroupItem } from './primitives/radio-group.js';

export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from './primitives/accordion.js';

export { Popover, PopoverTrigger, PopoverContent } from './primitives/popover.js';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './primitives/dropdown-menu.js';

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from './primitives/drawer.js';

export { Breadcrumb } from './primitives/breadcrumb.js';
export type { BreadcrumbItem, BreadcrumbProps } from './primitives/breadcrumb.js';

export { Tag, tagVariants } from './primitives/tag.js';
export type { TagProps } from './primitives/tag.js';

export { Skeleton } from './primitives/skeleton.js';

export { Spinner } from './primitives/spinner.js';
export type { SpinnerProps } from './primitives/spinner.js';

export { Toaster } from './primitives/notification.js';

export { GeoPrimitive } from './primitives/geo-primitive.js';
export type { GeoPrimitiveProps } from './primitives/geo-primitive.js';

export { Pipili } from './primitives/pipili.js';
export type { PipiliProps, PipiliMood } from './primitives/pipili.js';

export { AppBanner, appBannerVariants } from './primitives/app-banner.js';
export type { AppBannerProps, AppBannerVariant } from './primitives/app-banner.js';

export { OpenEduLogo } from './primitives/openedu-logo.js';
export type { OpenEduLogoProps } from './primitives/openedu-logo.js';

export { SilhouetteAssembly, SilhouetteGroup } from './primitives/silhouette-assembly.js';
export type {
  SilhouetteAssemblyProps,
  SilhouetteGroupProps,
  SilhouetteFigureProps,
  SilhouetteProportion,
  SilhouettePalette,
} from './primitives/silhouette-assembly.js';

export { AssemblyFlow } from './primitives/assembly-flow.js';
export type { AssemblyFlowProps, AssemblyFlowDensity } from './primitives/assembly-flow.js';

export { OpenModule, progressToSatellites } from './primitives/open-module.js';
export type { OpenModuleProps, OpenModuleSize, OpenModuleState } from './primitives/open-module.js';

// Contexts
export { FontSizeProvider, useFontSize } from './font-size-context.js';

// Patterns (nav components)
export { AppSidebar } from './patterns/AppSidebar.js';
export type {
  AppSidebarProps,
  AppSidebarItem,
  AppSidebarSection,
  AppSidebarStepItem,
} from './patterns/AppSidebar.js';

export { SideNav } from './patterns/SideNav.js';
export type { SideNavProps, NavTabId } from './patterns/SideNav.js';

export { TopAppBar } from './patterns/TopAppBar.js';
export type { TopAppBarProps, TopAppBarBreadcrumb } from './patterns/TopAppBar.js';

export { CourseTree } from './patterns/CourseTree.js';
export type { CourseTreeProps, CourseTreeModule } from './patterns/CourseTree.js';

export { CourseCardWithModule, getProgressSatellites } from './patterns/CourseCardWithModule.js';
export type { CourseCardWithModuleProps } from './patterns/CourseCardWithModule.js';

export { BundleCardWithModule, getBundleSatellites } from './patterns/BundleCardWithModule.js';
export type { BundleCardWithModuleProps } from './patterns/BundleCardWithModule.js';

export { StatsSummary } from './patterns/StatsSummary.js';
export type { StatsSummaryProps, StatsSummaryItem } from './patterns/StatsSummary.js';

export { EmptyState } from './patterns/EmptyState.js';
export type { EmptyStateProps } from './patterns/EmptyState.js';

export { SectionDivider } from './patterns/SectionDivider.js';
export type { SectionDividerProps } from './patterns/SectionDivider.js';

export { PageHeader } from './patterns/PageHeader.js';
export type { PageHeaderProps } from './patterns/PageHeader.js';

export { HeroSection } from './patterns/HeroSection.js';
export type { HeroSectionProps } from './patterns/HeroSection.js';

export { BundleModuleIndicator } from './patterns/BundleModuleIndicator.js';
export type {
  BundleModuleIndicatorProps,
  BundleModuleStatus,
} from './patterns/BundleModuleIndicator.js';

export { AppLayout } from './patterns/AppLayout.js';
export type { AppLayoutProps } from './patterns/AppLayout.js';

export { ThreePanelLayout } from './patterns/ThreePanelLayout.js';
export type { ThreePanelLayoutProps } from './patterns/ThreePanelLayout.js';

export { CourseViewerLayout } from './patterns/CourseViewerLayout.js';
export type { CourseViewerLayoutProps } from './patterns/CourseViewerLayout.js';

export { SettingsLayout } from './patterns/SettingsLayout.js';
export type { SettingsLayoutProps } from './patterns/SettingsLayout.js';

export { DashboardLayout } from './patterns/DashboardLayout.js';
export type { DashboardLayoutProps } from './patterns/DashboardLayout.js';

export { SplitView } from './patterns/SplitView.js';
export type { SplitViewProps } from './patterns/SplitView.js';

export {
  CommandPalette,
  CommandGroup,
  CommandItem,
  CommandEmpty,
} from './patterns/CommandPalette.js';
export type {
  CommandPaletteProps,
  CommandGroupProps,
  CommandItemProps,
  CommandEmptyProps,
} from './patterns/CommandPalette.js';

// Learning components
export { BundleOverview } from './learning/BundleOverview.js';
export type {
  BundleOverviewProps,
  BundleOverviewModule,
  ModuleStatus,
} from './learning/BundleOverview.js';

export { CourseCard } from './learning/CourseCard.js';
export type { CourseCardProps } from './learning/CourseCard.js';

export { ProgressBadge } from './learning/ProgressBadge.js';
export type { ProgressBadgeProps } from './learning/ProgressBadge.js';

export { CompletionScreen } from './learning/CompletionScreen.js';
export type { CompletionScreenProps, CompletionStats } from './learning/CompletionScreen.js';

export { Lesson } from './learning/Lesson.js';
export type { LessonProps } from './learning/Lesson.js';

export { Module } from './learning/Module.js';
export type { ModuleProps, ModuleLesson } from './learning/Module.js';

export { ConceptCard } from './learning/ConceptCard.js';
export type { ConceptCardProps } from './learning/ConceptCard.js';

export { BundleCard } from './learning/BundleCard.js';
export type { BundleCardProps } from './learning/BundleCard.js';

export { ProgressCard } from './learning/ProgressCard.js';
export type { ProgressCardProps } from './learning/ProgressCard.js';

export { DefinitionBlock } from './learning/DefinitionBlock.js';
export type { DefinitionBlockProps } from './learning/DefinitionBlock.js';

// AI Components
export { AICallout } from './ai/AICallout.js';
export type { AICalloutProps } from './ai/AICallout.js';

export { AITutorPanel } from './ai/AITutorPanel.js';
export type { AITutorPanelProps } from './ai/AITutorPanel.js';

export { TutorMessage } from './ai/TutorMessage.js';
export type { TutorMessageProps } from './ai/TutorMessage.js';

export { ThinkingIndicator } from './ai/ThinkingIndicator.js';
export type { ThinkingIndicatorProps } from './ai/ThinkingIndicator.js';

export { Citation } from './ai/Citation.js';
export type { CitationProps } from './ai/Citation.js';

export { ReferenceCard } from './ai/ReferenceCard.js';
export type { ReferenceCardProps } from './ai/ReferenceCard.js';

export { SuggestedQuestions } from './ai/SuggestedQuestions.js';
export type { SuggestedQuestionsProps } from './ai/SuggestedQuestions.js';

export { AIChat } from './ai/AIChat.js';
export type { AIChatProps, ChatMessage } from './ai/AIChat.js';

// Effects
export { ConfettiBurst, type ConfettiBurstProps } from './effects/ConfettiBurst.js';
export { GlowPulse, type GlowPulseProps } from './effects/GlowPulse.js';
export { StaggerReveal, type StaggerRevealProps } from './effects/StaggerReveal.js';
