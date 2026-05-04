# 🚀 Создание исполняемых файлов для Lecturer Assistant

Эта инструкция объясняет, как создать исполняемые файлы приложения для Windows и macOS.

## 📋 Требования

### Общие требования
- Node.js 18+ 
- npm или yarn

### Для Windows
- Windows 10/11
- Visual Studio Build Tools (для нативных зависимостей)
- PowerShell

### Для macOS  
- macOS 10.15+
- Xcode Command Line Tools

## 🛠️ Сборка приложения

### Шаг 1: Клонирование и установка зависимостей

```bash
# Клонировать репозиторий
git clone <repository-url>
cd lecturer-assistant

# Установить зависимости для всех сервисов
npm install
```

### Шаг 2: Сборка Electron приложения

```bash
# Перейти в папку Electron приложения
cd electron-app

# Установить зависимости
npm install

# Собрать приложение для текущей платформы
npm run make
```

## 📦 Результаты сборки

После выполнения команды `npm run make` исполняемые файлы будут находиться в:

### macOS
```
electron-app/out/make/zip/darwin/
├── electron-app-1.0.0-darwin-x64.zip
└── electron-app-1.0.0-darwin-arm64.zip
```

### Windows
```
electron-app/out/make/squirrel.windows/x64/
├── electron-app Setup 1.0.0.exe
└── ...
```

## 🔧 Кросс-платформенная сборка

### Сборка для Windows на macOS
```bash
# Установить Wine и dependencies
brew install --cask wine-stable

# Добавить maker для Windows в forge.config.js
# (уже настроено в проекте)

# Собрать для Windows
npm run make -- --platform=win32
```

### Сборка для macOS на Windows
Требуется macOS с Xcode для сборки macOS версии.

## 📝 Дополнительные команды

```bash
# Только упаковать приложение (без создания инсталлятора)
npm run package

# Собрать для конкретной архитектуры
npm run make -- --arch=x64    # Intel/AMD
npm run make -- --arch=arm64  # Apple Silicon/ARM

# Отладочная сборка
npm run make -- --verbose
```

## 🎯 Запуск готового приложения

### macOS
1. Распаковать `.zip` файл
2. Переместить `.app` в `Applications`
3. Запустить из Launchpad или Finder

### Windows
1. Запустить `electron-app Setup 1.0.0.exe`
2. Следовать инструкциям установщика
3. Приложение появится в меню Пуск

## ⚠️ Возможные проблемы

### Проблема: "Command not found: electron-forge"
**Решение:**
```bash
cd electron-app
npm install
```

### Проблема: Ошибки нативных зависимостей (Windows)
**Решение:**
```bash
# Установить Visual Studio Build Tools
# или использовать windows-build-tools
npm install --global --production windows-build-tools
```

### Проблема: Проблемы с правами доступа (macOS)
**Решение:**
```bash
# Если приложение не запускается из-за Gatekeeper
sudo spctl --master-disable
# После запуска вернуть обратно
sudo spctl --master-enable
```

## 📄 Структура проекта

```
lecturer-assistant/
├── electron-app/          # Electron приложение
│   ├── src/              # Исходный код
│   ├── assets/           # Иконки и ресурсы
│   ├── out/              # Результаты сборки
│   └── forge.config.js   # Конфигурация Electron Forge
├── react-app/            # React фронтенд
├── admin-gateway/        # Spring Boot сервис
├── analytics-service/    # Spring Boot сервис
├── content-service/     # Spring Boot сервис
├── quiz-service/        # Spring Boot сервис
└── lecture-broadcasting-service/ # Spring Boot сервис
```

## 🔄 Автоматическая сборка

Для автоматизации сборки можно использовать GitHub Actions или другие CI/CD системы. Пример конфигурации находится в `.github/workflows/` (если существует).

## 📞 Поддержка

При возникновении проблем:
1. Проверьте версию Node.js: `node --version`
2. Очистите кэш npm: `npm cache clean --force`
3. Переустановите зависимости: `rm -rf node_modules && npm install`
4. Проверьте логи сборки с флагом `--verbose`
