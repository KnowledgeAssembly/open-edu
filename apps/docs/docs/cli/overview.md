---
sidebar_position: 1
---

# CLI Overview

The `edu` CLI provides development tools for Open-Edu packages.

## Commands

### Dev

Start a development server for a package:

```bash
edu dev ./my-package
```

### Validate

Validate a package structure and schemas:

```bash
edu validate ./my-package
```

### Build

Build a package for distribution:

```bash
edu build ./my-package -o ./dist
```

### Package

Create a distributable archive:

```bash
edu package ./my-package
```
