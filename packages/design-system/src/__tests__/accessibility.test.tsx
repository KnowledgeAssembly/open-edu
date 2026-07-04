import { describe, it } from 'vitest';
import { checkAccessibility } from '../test-utils/a11y.jsx';
import { Button } from '../primitives/button.jsx';
import { Badge } from '../primitives/badge.jsx';
import { Card, CardContent } from '../primitives/card.jsx';
import { Input } from '../primitives/input.jsx';
import { Textarea } from '../primitives/textarea.jsx';
import { Switch } from '../primitives/switch.jsx';
import { Tag } from '../primitives/tag.jsx';
import { Spinner } from '../primitives/spinner.jsx';
import { Skeleton } from '../primitives/skeleton.jsx';
import { Progress } from '../primitives/progress.jsx';
import { Breadcrumb } from '../primitives/breadcrumb.jsx';
import { GeoPrimitive } from '../primitives/geo-primitive.jsx';
import { OpenModule } from '../primitives/open-module.jsx';
import { Pipili } from '../primitives/pipili.jsx';
import { OpenEduLogo } from '../primitives/openedu-logo.jsx';
import { SilhouetteAssembly } from '../primitives/silhouette-assembly.jsx';
import { EmptyState } from '../primitives/empty-state.jsx';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '../primitives/accordion.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../primitives/tabs.jsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../primitives/dialog.jsx';

describe('accessibility audit — #336', () => {
  it('Button has no violations', async () => {
    await checkAccessibility(<Button>Click me</Button>);
  });

  it('Badge has no violations', async () => {
    await checkAccessibility(<Badge>New</Badge>);
  });

  it('Card has no violations', async () => {
    await checkAccessibility(
      <Card>
        <CardContent>Content</CardContent>
      </Card>,
    );
  });

  it('Input has no violations', async () => {
    await checkAccessibility(<Input placeholder="Enter text" aria-label="Text input" />);
  });

  it('Textarea has no violations', async () => {
    await checkAccessibility(<Textarea placeholder="Enter text" aria-label="Text area" />);
  });

  it('Switch has no violations', async () => {
    await checkAccessibility(<Switch aria-label="Toggle setting" />);
  });

  it('Tag has no violations', async () => {
    await checkAccessibility(<Tag>Tag</Tag>);
  });

  it('Spinner has no violations', async () => {
    await checkAccessibility(<Spinner />);
  });

  it('Skeleton has no violations', async () => {
    await checkAccessibility(<Skeleton className="w-20 h-4" />);
  });

  it('Progress has no violations', async () => {
    await checkAccessibility(<Progress value={50} label="Loading progress" />);
  });

  it('Breadcrumb has no violations', async () => {
    await checkAccessibility(<Breadcrumb items={[{ label: 'Home' }]} />);
  });

  it('GeoPrimitive has no violations', async () => {
    await checkAccessibility(<GeoPrimitive />);
  });

  it('OpenModule has no violations', async () => {
    await checkAccessibility(<OpenModule />);
  });

  it('Pipili has no violations', async () => {
    await checkAccessibility(<Pipili />);
  });

  it('OpenEduLogo has no violations', async () => {
    await checkAccessibility(<OpenEduLogo />);
  });

  it('SilhouetteAssembly has no violations', async () => {
    await checkAccessibility(<SilhouetteAssembly />);
  });

  it('EmptyState has no violations', async () => {
    await checkAccessibility(<EmptyState title="Empty" description="Nothing here" />);
  });

  it('Accordion has no violations', async () => {
    await checkAccessibility(
      <Accordion type="single">
        <AccordionItem value="1">
          <AccordionTrigger>Section 1</AccordionTrigger>
          <AccordionContent>Content 1</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
  });

  it('Tabs have no violations', async () => {
    await checkAccessibility(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
      </Tabs>,
    );
  });

  it('Dialog has no violations', async () => {
    await checkAccessibility(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
  });
});
