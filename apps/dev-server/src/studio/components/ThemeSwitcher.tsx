import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@open-edu/design-system';
import { Palette } from 'lucide-react';
import { useTranslation } from '@open-edu/i18n';
import { getTheme, themeIds } from '@open-edu/runtime';
import type { ThemeId } from '@open-edu/runtime';

export function ThemeSwitcher({
  currentThemeId,
  onChange,
}: {
  currentThemeId: ThemeId;
  onChange: (id: ThemeId) => void;
}) {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={t('studio.theme.select')}
        >
          <Palette className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={currentThemeId}
          onValueChange={(value) => onChange(value as ThemeId)}
        >
          {themeIds.map((id) => (
            <DropdownMenuRadioItem key={id} value={id}>
              {getTheme(id).name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
