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

export { EmptyState } from './primitives/empty-state.js';
export type { EmptyStateProps } from './primitives/empty-state.js';

export { Toaster } from './primitives/notification.js';

// Patterns (nav components)
export { SideNav } from './patterns/SideNav.js';
export type { SideNavProps, NavTabId } from './patterns/SideNav.js';

export { TopAppBar } from './patterns/TopAppBar.js';
export type { TopAppBarProps, TopAppBarBreadcrumb } from './patterns/TopAppBar.js';

export { CourseTree } from './patterns/CourseTree.js';
export type { CourseTreeProps, CourseTreeModule } from './patterns/CourseTree.js';

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
