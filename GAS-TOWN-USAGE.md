# Gas Town: Skein rig

## Назначение

Этот файл описывает настройку Gas Town для репозитория `skein`.

Репозиторий:

```text
/Users/artemmac/dev/skein
```

Rig:

```text
skein
```

Prefix для beads:

```text
sk
```

## Создание rig

После получения доступа к записи в `~/gt` выполнить:

```bash
~/dev/gastown/scripts/bootstrap-local-rig.sh \
  --town-root ~/gt \
  --rig skein \
  --local-repo ~/dev/skein \
  --prefix sk \
  --polecat-agent codex \
  --witness-agent codex \
  --refinery-agent codex
```

## Проверка

```bash
cd ~/gt
gt rig list
gt status
```

Ожидаемый rig:

```text
skein
```

## Работа через Mayor

```bash
cd ~/gt
gt mayor attach
```

Пример задачи:

```text
Работай в rig skein.

Изучи текущую архитектуру проекта.
Разбей задачу на независимые части и используй Polecats для параллельных исследований и реализации.
После изменений проверь сборку и тесты.
```

## Агентные роли

```text
Mayor
 └── skein
     ├── Witness
     ├── Refinery
     └── Polecats
```

Все роли используют Codex.

## Текущий статус настройки

- Файл конфигурации для репозитория создан.
- Скрипт bootstrap проверен.
- Создание rig заблокировано правами записи в `~/gt` в текущей среде.
