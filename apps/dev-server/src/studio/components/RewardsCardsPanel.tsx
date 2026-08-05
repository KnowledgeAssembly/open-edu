import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@open-edu/design-system';
import { Plus } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import type { CardDefinition, RewardCondition, Rewards } from '@open-edu/schemas';
import type { StudioApi } from '../studioApi.js';
import type { ActivitySummary } from '../types.js';
import {
  badgeOnQuizPass,
  badgeOnWorkflowComplete,
  mergeRewardTrigger,
  simpleKnowledgeCard,
} from '../rewards/rewardTemplates.js';

interface BadgeEntry {
  name: string;
  when: string;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'card';
}

function describeBadgeWhen(
  rewards: Rewards | null,
  activities: ActivitySummary[],
  t: (key: string, params?: Record<string, string>) => string,
): BadgeEntry[] {
  const entries: BadgeEntry[] = [];
  for (const trigger of rewards?.triggers ?? []) {
    for (const reward of trigger.rewards) {
      if (reward.action !== 'badge.award') continue;
      const condition = reward.condition;
      let when = t('studio.rewards.generic');
      if (trigger.onEvent === 'workflow_complete' && !condition) {
        when = t('studio.rewards.whenComplete');
      } else if (trigger.onEvent === 'node_complete' && condition?.type === 'score') {
        const quiz = activities.find((activity) => activity.path === condition.nodeId);
        when = quiz
          ? t('studio.rewards.whenPass', { title: quiz.title })
          : t('studio.rewards.whenQuizPass');
      }
      entries.push({ name: reward.badge, when });
    }
  }
  return entries;
}

export function RewardsCardsPanel({
  api,
  onError,
}: {
  api: StudioApi;
  onError: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [cards, setCards] = useState<CardDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [completionOpen, setCompletionOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const [badgeName, setBadgeName] = useState('');
  const [quizBadgeName, setQuizBadgeName] = useState('');
  const [quizPath, setQuizPath] = useState('');
  const [cardTitle, setCardTitle] = useState('');
  const [cardBody, setCardBody] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const outline = await api.getOutline();
        if (cancelled) return;
        setActivities(outline.activities);
        setQuizPath(outline.activities.find((activity) => activity.kind === 'quiz')?.path ?? '');

        let loadedRewards: Rewards | null = null;
        try {
          const file = await api.readFile('rewards.json');
          const parsed = JSON.parse(file.content) as Rewards;
          if (Array.isArray(parsed?.triggers)) loadedRewards = parsed;
        } catch {
          loadedRewards = null;
        }

        let loadedCards: CardDefinition[] = [];
        try {
          const file = await api.readFile('cards.json');
          const parsed = JSON.parse(file.content) as { cards?: CardDefinition[] };
          if (Array.isArray(parsed?.cards)) loadedCards = parsed.cards;
        } catch {
          loadedCards = [];
        }
        if (cancelled) return;
        setRewards(loadedRewards);
        setCards(loadedCards);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, onError]);

  const badges = useMemo(() => describeBadgeWhen(rewards, activities, t), [rewards, activities, t]);

  const quizActivities = useMemo(
    () => activities.filter((activity) => activity.kind === 'quiz'),
    [activities],
  );

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const handleAddCompletion = async () => {
    const name = badgeName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const trigger = badgeOnWorkflowComplete(name).triggers[0]!;
      const next = mergeRewardTrigger(rewards, trigger);
      await api.writeFile('rewards.json', JSON.stringify(next, null, 2));
      setRewards(next);
      setCompletionOpen(false);
      setBadgeName('');
      flashSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuizBadge = async () => {
    const name = quizBadgeName.trim();
    if (!name || !quizPath) return;
    setSaving(true);
    try {
      const trigger = badgeOnQuizPass(name, quizPath).triggers[0]!;
      const next = mergeRewardTrigger(rewards, trigger);
      await api.writeFile('rewards.json', JSON.stringify(next, null, 2));
      setRewards(next);
      setQuizOpen(false);
      setQuizBadgeName('');
      flashSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = async () => {
    const title = cardTitle.trim();
    const body = cardBody.trim();
    if (!title || !body) return;
    setSaving(true);
    try {
      const id = `${slugify(title)}-${Date.now()}`;
      const unlock: RewardCondition = {
        type: 'chain',
        completedNodeIds: [activities[0]?.path ?? 'nodes/entry.md'],
      };
      const card = simpleKnowledgeCard(id, title, body, unlock);
      const next = [...cards, card];
      await api.writeFile('cards.json', JSON.stringify({ cards: next }, null, 2));
      setCards(next);
      setCardOpen(false);
      setCardTitle('');
      setCardBody('');
      flashSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-6 text-sm">…</p>;

  return (
    <Card className="border-outline-variant">
      <CardHeader>
        <CardTitle>{t('studio.rewards.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {badges.length === 0 && cards.length === 0 ? (
          <EmptyState heading={t('studio.rewards.empty')} description="" />
        ) : (
          <>
            {badges.length > 0 ? (
              <div>
                <h3 className="text-h3 text-on-surface">{t('studio.rewards.badgesHeading')}</h3>
                <ul className="space-y-2">
                  {badges.map((badge) => (
                    <li
                      key={badge.name}
                      className="border-outline-variant bg-surface flex items-center gap-3 rounded-lg border px-4 py-3"
                    >
                      <Badge variant="outline">{badge.name}</Badge>
                      <span className="text-on-surface-variant text-sm">{badge.when}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {cards.length > 0 ? (
              <div>
                <h3 className="text-h3 text-on-surface">{t('studio.rewards.cardsHeading')}</h3>
                <ul className="space-y-2">
                  {cards.map((card) => (
                    <li
                      key={card.id}
                      className="border-outline-variant bg-surface rounded-lg border px-4 py-3"
                    >
                      <p className="text-on-surface text-sm font-medium">{card.title}</p>
                      <p className="text-on-surface-variant mt-0.5 text-sm">{card.summary}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setCompletionOpen(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.rewards.addBadge')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuizOpen(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.rewards.addQuizBadge')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCardOpen(true)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('studio.rewards.addCard')}
          </Button>
          {saved ? (
            <span className="text-on-surface-variant text-sm">{t('studio.editor.saved')}</span>
          ) : null}
        </div>

        <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('studio.rewards.addBadge')}</DialogTitle>
              <DialogDescription>{t('studio.rewards.whenComplete')}</DialogDescription>
            </DialogHeader>
            <label className="text-on-surface block text-sm font-medium">
              {t('studio.rewards.badgeName')}
              <Input
                className="mt-2"
                value={badgeName}
                onChange={(e) => setBadgeName(e.target.value)}
                aria-label={t('studio.rewards.badgeName')}
              />
            </label>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCompletionOpen(false)}>
                {t('studio.rewards.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!badgeName.trim() || saving}
                onClick={() => void handleAddCompletion()}
              >
                {t('studio.rewards.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('studio.rewards.addQuizBadge')}</DialogTitle>
            </DialogHeader>
            <label className="text-on-surface block text-sm font-medium">
              {t('studio.rewards.badgeName')}
              <Input
                className="mt-2"
                value={quizBadgeName}
                onChange={(e) => setQuizBadgeName(e.target.value)}
                aria-label={t('studio.rewards.badgeName')}
              />
            </label>
            <div>
              <span className="text-on-surface block text-sm font-medium">
                {t('studio.rewards.quizPicker')}
              </span>
              {quizActivities.length === 0 ? (
                <p className="text-on-surface-variant mt-2 text-sm">{t('studio.rewards.noQuiz')}</p>
              ) : (
                <Select value={quizPath} onValueChange={setQuizPath}>
                  <SelectTrigger
                    className="mt-2 w-full"
                    aria-label={t('studio.rewards.quizPicker')}
                  >
                    <SelectValue placeholder={t('studio.rewards.quizPicker')} />
                  </SelectTrigger>
                  <SelectContent>
                    {quizActivities.map((activity) => (
                      <SelectItem key={activity.path} value={activity.path}>
                        {activity.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setQuizOpen(false)}>
                {t('studio.rewards.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!quizBadgeName.trim() || quizActivities.length === 0 || saving}
                onClick={() => void handleAddQuizBadge()}
              >
                {t('studio.rewards.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cardOpen} onOpenChange={setCardOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('studio.rewards.addCard')}</DialogTitle>
            </DialogHeader>
            <label className="text-on-surface block text-sm font-medium">
              {t('studio.rewards.cardTitle')}
              <Input
                className="mt-2"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                aria-label={t('studio.rewards.cardTitle')}
              />
            </label>
            <label className="text-on-surface block text-sm font-medium">
              {t('studio.rewards.cardBody')}
              <Textarea
                className="mt-2"
                rows={4}
                value={cardBody}
                onChange={(e) => setCardBody(e.target.value)}
                aria-label={t('studio.rewards.cardBody')}
              />
            </label>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setCardOpen(false)}>
                {t('studio.rewards.cancel')}
              </Button>
              <Button
                variant="default"
                size="sm"
                disabled={!cardTitle.trim() || !cardBody.trim() || saving}
                onClick={() => void handleAddCard()}
              >
                {t('studio.rewards.confirm')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
